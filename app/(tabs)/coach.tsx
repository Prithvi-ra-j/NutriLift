import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Input } from "../../components/ui/Input";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAIStore } from "../../lib/stores/ai.store";
import { useTodayStore } from "../../lib/stores/today.store";
import { generateCoachResponse, isGroqConfigured, type CoachMessage } from "../../lib/groq";
import { buildCoachContext } from "../../lib/ai/context-builder";
import { getConversationHistory, insertConversationMessage, clearConversationHistory } from "../../lib/db/queries/reports";
import { Card } from "../../components/ui/Card";
import { CardSkeleton } from "../../components/ui/SkeletonLoader";
import type { AiConversation } from "../../lib/db/schema";
import uuid from "react-native-uuid";
import { M3 } from "../../design-system/tokens";
import { PressableScale } from "../../components/ui/PressableScale";

// Suggested prompts for coach
const COACH_SUGGESTED_PROMPTS = [
  "How did I do this week?",
  "Should I increase weight today?",
  "Am I on track for December?",
  "What's limiting my progress most?",
  "Analyze my sleep vs performance",
  "Is my protein timing optimal?",
];

export default function CoachScreen() {
  const { messages, isGenerating, error, setMessages, addMessage, setGenerating, setError } = useAIStore();
  const { nutrition, session } = useTodayStore();

  const [input, setInput] = useState("");
  const [groqConfigured, setGroqConfigured] = useState<boolean | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const checkConfiguration = useCallback(() => {
    const configured = isGroqConfigured();
    setGroqConfigured(configured);
  }, []);

  const loadHistory = useCallback(async () => {
    const history = await getConversationHistory(50);
    setMessages(history);
  }, []);

  useEffect(() => {
    checkConfiguration();
    loadHistory();
  }, [checkConfiguration, loadHistory]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isGenerating) return;
    setInput("");
    setError(null);

    // Build user message
    const userMsg: AiConversation = {
      id: uuid.v4() as string,
      role: "user",
      content: text.trim(),
      context_snapshot: null,
      created_at: Math.floor(Date.now() / 1000),
    };

    addMessage(userMsg);
    await insertConversationMessage(userMsg);
    setGenerating(true);

    try {
      // Build context
      const context = await buildCoachContext(nutrition, session);

      // Build message history for Groq (limit to last 5 messages to stay under token limit)
      const conversationMessages: CoachMessage[] = messages.slice(-5).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      conversationMessages.push({ role: "user", content: text.trim() });

      let responseContent = "";
      const assistantMsgId = uuid.v4() as string;

      // Add placeholder message for streaming
      const placeholderMsg: AiConversation = {
        id: assistantMsgId,
        role: "assistant",
        content: "...",
        context_snapshot: null,
        created_at: Math.floor(Date.now() / 1000),
      };
      addMessage(placeholderMsg);

      // Generate response with Groq
      responseContent = await generateCoachResponse(
        context,
        conversationMessages
      );

      // Increment request count
      setRequestCount(prev => prev + 1);

      // Update the placeholder with real content
      const finalMsg: AiConversation = {
        ...placeholderMsg,
        content: responseContent,
        context_snapshot: JSON.stringify({ context_keys: Object.keys(context) }),
      };

      await insertConversationMessage(finalMsg);

      // Reload messages to get the final state
      const history = await getConversationHistory(50);
      setMessages(history);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);

      const errMsg: AiConversation = {
        id: uuid.v4() as string,
        role: "assistant",
        content: `Error: ${errorMsg}. Please check your Groq API configuration.`,
        context_snapshot: null,
        created_at: Math.floor(Date.now() / 1000),
      };
      addMessage(errMsg);
    } finally {
      setGenerating(false);
    }
  };

  const handleClear = async () => {
    await clearConversationHistory();
    setMessages([]);
  };

  if (groqConfigured === null) {
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
            {groqConfigured === true && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: M3.colors.success }} />
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                  Ready{requestCount > 0 ? ` · ${requestCount} sent` : ""}
                </Text>
              </View>
            )}
          </View>
          <PressableScale
            onPress={handleClear}
           
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
          </PressableScale>
        </View>

        {/* ── Groq API warning ── */}
        {groqConfigured === false && (
          <View style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: M3.colors.errorContainer, borderRadius: 8, padding: 12, flexDirection: "row", gap: 8 }}>
            <Feather name="alert-circle" size={14} color={M3.colors.error} />
            <Text style={{ color: M3.colors.error, fontSize: 12, fontFamily: "DMSans_400Regular", flex: 1 }}>
              Groq API key is not configured. Please add GROQ_API_KEY to your .env file or Settings.
            </Text>
          </View>
        )}

        {/* ── Messages ── */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingTop: messages.length === 0 ? 24 : 0, gap: 20, paddingBottom: 16, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={{ flex: 1, justifyContent: "center", gap: 28 }}>
              <View style={{ alignItems: "center", gap: 14 }}>
                <View style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: M3.colors.primaryContainer,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Feather name="cpu" size={26} color={M3.colors.primary} />
                </View>
                <Text style={{ color: M3.colors.onSurface, fontSize: 19, fontFamily: "DMSans_700Bold", textAlign: "center" }}>
                  How can I help your training today?
                </Text>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", textAlign: "center", lineHeight: 20 }}>
                  Brutally honest. Scientifically rigorous.
                </Text>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
                {COACH_SUGGESTED_PROMPTS.map((prompt) => (
                  <PressableScale
                    key={prompt}
                    onPress={() => sendMessage(prompt)}
                   
                    style={{
                      width: "48%",
                      backgroundColor: M3.colors.surface,
                      borderRadius: M3.shape.large,
                      borderWidth: 1,
                      borderColor: M3.colors.outline,
                      padding: 14,
                      gap: 10,
                      minHeight: 88,
                      justifyContent: "space-between",
                    }}
                  >
                    <Feather name="message-circle" size={15} color={M3.colors.primary} />
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12.5, fontFamily: "DMSans_500Medium", lineHeight: 17 }}>
                      {prompt}
                    </Text>
                  </PressableScale>
                ))}
              </View>
            </View>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <View
                key={msg.id}
                style={{
                  alignSelf: isUser ? "flex-end" : "stretch",
                  maxWidth: isUser ? "88%" : "100%",
                }}
              >
                {!isUser && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: M3.colors.primaryContainer, alignItems: "center", justifyContent: "center" }}>
                      <Feather name="cpu" size={11} color={M3.colors.primary} />
                    </View>
                    <Text style={{ color: M3.colors.primary, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 0.5 }}>
                      COACH
                    </Text>
                  </View>
                )}
                <View
                  style={
                    isUser
                      ? {
                          backgroundColor: M3.colors.primaryContainer,
                          borderRadius: 18,
                          borderBottomRightRadius: 4,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                        }
                      : { paddingLeft: 28 }
                  }
                >
                  <Text style={{ color: M3.colors.onSurface, fontSize: 14.5, fontFamily: "DMSans_400Regular", lineHeight: 22 }}>
                    {msg.content === "..." && isGenerating ? (
                      <ActivityIndicator size="small" color={M3.colors.primary} />
                    ) : (
                      msg.content
                    )}
                  </Text>
                </View>
              </View>
            );
          })}

          {isGenerating && messages[messages.length - 1]?.role !== "assistant" && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 4 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: M3.colors.primaryContainer, alignItems: "center", justifyContent: "center" }}>
                <Feather name="cpu" size={11} color={M3.colors.primary} />
              </View>
              <ActivityIndicator size="small" color={M3.colors.primary} />
            </View>
          )}
        </ScrollView>

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
            <PressableScale
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || isGenerating}
             
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
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
