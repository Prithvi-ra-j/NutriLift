import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Input } from "../../components/ui/Input";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { CoachConversation } from "../../components/coach/CoachConversation";
import { router } from "expo-router";
import { useAIStore } from "../../lib/stores/ai.store";
import { buildCoachContext } from "../../lib/ai/context-builder";
import { AiError } from "../../lib/ai/gateway";
import { coachPrompt } from "../../lib/ai/prompts/coach";
import { generateCoachReply } from "../../lib/ai/coach";
import { getMinimumCalorieFloor } from "../../lib/ai/preferences";
import { AI_SAFETY_RESPONSE, containsEatingSafetyRisk } from "../../lib/ai/riskPhrases";
import { getAiPreference } from "../../lib/data/aiPreferences";
import { getConversationHistory, insertConversationMessage, clearConversationHistory } from "../../lib/data";
import { CardSkeleton } from "../../components/ui/SkeletonLoader";
import type { AiConversation } from "../../lib/data/types";
import uuid from "react-native-uuid";
import { M3 } from "../../design-system/tokens";
import { logger } from "../../lib/logger";
import { fireAndLog } from "../../lib/async";
import { isSupabaseConfigured } from "../../lib/supabase/client";
import { nowUnix } from "../../lib/time/clock";

export default function CoachScreen() {
  const { messages, isGenerating, setMessages, addMessage, setGenerating, setError } = useAIStore();
  const [input, setInput] = useState("");
  const [isReady, setIsReady] = useState<boolean | null>(null);

  const loadHistory = useCallback(async () => {
    const history = await getConversationHistory(50);
    setMessages(history);
  }, []);

  useEffect(() => {
    setIsReady(isSupabaseConfigured);
    fireAndLog(loadHistory(), "Coach conversation history load failed");
  }, [loadHistory]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isGenerating) return;
    setError(null);
    const userText = text.trim();

    if (containsEatingSafetyRisk(userText)) {
      addMessage({
        id: uuid.v4() as string,
        role: "assistant",
        content: AI_SAFETY_RESPONSE,
        context_snapshot: null,
        prompt_version: `${coachPrompt.id}@${coachPrompt.version}`,
        created_at: nowUnix(),
      });
      setInput("");
      return;
    }

    let consent: string | null;
    try {
      consent = await getAiPreference("ai_consent_v1");
    } catch (error) {
      logger.error("AI consent lookup failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      setError("Could not verify AI consent. Please try again.");
      return;
    }
    if (consent !== "accepted") {
      router.push("/modals/ai-consent");
      return;
    }
    setInput("");
    setGenerating(true);

    try {
      const context = await buildCoachContext();

      const conversationMessages = messages
        .filter((message) =>
          message.role !== "user" || !containsEatingSafetyRisk(message.content)
        )
        .slice(-5)
        .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      conversationMessages.push({ role: "user" as const, content: userText });

      const userMsg: AiConversation = {
        id: uuid.v4() as string,
        role: "user",
        content: userText,
        context_snapshot: null,
        prompt_version: `${coachPrompt.id}@${coachPrompt.version}`,
        created_at: nowUnix(),
      };
      addMessage(userMsg);
      await insertConversationMessage(userMsg);

      const minimumCalories = await getMinimumCalorieFloor();
      const responseContent = await generateCoachReply(
        coachPrompt.build({ data: context, minimumCalories }),
        conversationMessages,
        context.targets,
        minimumCalories,
      );

      const finalMsg: AiConversation = {
        id: uuid.v4() as string,
        role: "assistant",
        content: responseContent,
        context_snapshot: JSON.stringify({ context_keys: Object.keys(context) }),
        prompt_version: `${coachPrompt.id}@${coachPrompt.version}`,
        created_at: nowUnix(),
      };

      await insertConversationMessage(finalMsg);

      const history = await getConversationHistory(50);
      setMessages(history);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);

      const errMsg: AiConversation = {
        id: uuid.v4() as string,
        role: "assistant",
        content: err instanceof AiError ? err.message : "The coach could not respond. Please try again.",
        context_snapshot: null,
        prompt_version: `${coachPrompt.id}@${coachPrompt.version}`,
        created_at: nowUnix(),
      };
      addMessage(errMsg);
      if (!(err instanceof AiError)) {
        logger.error("Coach request failed", { error: errorMsg });
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleClear = async () => {
    await clearConversationHistory();
    setMessages([]);
  };

  if (isReady === null) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
        <View style={{ padding: 20, gap: 16 }}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* ── Header ── */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: M3.colors.onSurface, fontSize: 17, fontFamily: "DMSans_700Bold" }}>
              NutriLift Coach
            </Text>
            {isReady === true && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: M3.colors.success }} />
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                  Ready
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={handleClear}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: M3.colors.surface,
              borderWidth: 1,
              borderColor: M3.colors.outline,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="edit" size={15} color={M3.colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* ── AI configuration warning ── */}
        {isReady === false && (
          <View style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: M3.colors.errorContainer, borderRadius: 8, padding: 12, flexDirection: "row", gap: 8 }}>
            <Feather name="alert-circle" size={14} color={M3.colors.error} />
            <Text style={{ color: M3.colors.error, fontSize: 12, fontFamily: "DMSans_400Regular", flex: 1 }}>
              Supabase is not configured. AI coaching is unavailable.
            </Text>
          </View>
        )}

        <CoachConversation
          isGenerating={isGenerating}
          messages={messages}
          onPrompt={(prompt) => void sendMessage(prompt)}
        />

        {/* ── Composer ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Platform.OS === "ios" ? 8 : 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              backgroundColor: M3.colors.surface,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: M3.colors.outline,
              paddingLeft: 16,
              paddingRight: 6,
              paddingVertical: 6,
              gap: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            <Input
              value={input}
              onChangeText={setInput}
              placeholder="Ask your coach anything..."
              multiline
              maxLength={500}
              style={{
                flex: 1,
                backgroundColor: "transparent",
                borderWidth: 0,
                padding: 0,
                paddingVertical: 10,
                maxHeight: 110,
                fontSize: 14.5,
              }}
            />
            <TouchableOpacity
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || isGenerating}
              activeOpacity={0.75}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                marginBottom: 2,
                backgroundColor: input.trim() && !isGenerating ? M3.colors.primary : M3.colors.surfaceVariant,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color={M3.colors.primary} />
              ) : (
                <Feather name="arrow-up" size={18} color={input.trim() ? M3.colors.onPrimary : M3.colors.onSurfaceMuted} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
