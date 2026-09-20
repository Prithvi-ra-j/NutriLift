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
import type { AiConversation } from "../../lib/db/schema";
import uuid from "react-native-uuid";
import { M3 } from "../../design-system/tokens";

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* ── Header ── */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: M3.colors.onSurface, fontSize: 28, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
              NUTRILIFT COACH
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: groqConfigured === true ? M3.colors.success : groqConfigured === false ? M3.colors.error : M3.colors.warning,
              }} />
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                {groqConfigured === true ? "Groq API ready" : groqConfigured === false ? "API key missing" : "Checking..."}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: M3.colors.primary, fontSize: 16, fontFamily: "BebasNeue_400Regular" }}>
                {requestCount}
              </Text>
              <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 9, fontFamily: "DMSans_400Regular" }}>
                requests
              </Text>
            </View>
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
              <Feather name="trash-2" size={18} color={M3.colors.onSurfaceMuted} />
            </TouchableOpacity>
          </View>
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
          contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 12, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={{ alignItems: "center", paddingVertical: 32, gap: 12 }}>
              <View style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: M3.colors.primaryContainer,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Feather name="cpu" size={28} color={M3.colors.primary} />
              </View>
              <Text style={{ color: M3.colors.onSurface, fontSize: 17, fontFamily: "DMSans_700Bold", textAlign: "center" }}>
                NutriLift Coach
              </Text>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", textAlign: "center", lineHeight: 20 }}>
                Brutally honest. Scientifically rigorous.{"\n"}Ask me anything about your training.
              </Text>
            </View>
          )}

          {messages.map((msg) => (
            <View
              key={msg.id}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
              }}
            >
              {msg.role === "assistant" && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: M3.colors.primaryContainer, alignItems: "center", justifyContent: "center" }}>
                    <Feather name="cpu" size={10} color={M3.colors.primary} />
                  </View>
                  <Text style={{ color: M3.colors.primary, fontSize: 10, fontFamily: "DMSans_700Bold", letterSpacing: 0.5 }}>
                    NUTRILIFT COACH
                  </Text>
                </View>
              )}
              <View
                style={{
                  backgroundColor: msg.role === "user" ? M3.colors.primaryContainer : M3.colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: msg.role === "user" ? "#00D4AA44" : M3.colors.surfaceContainer,
                  padding: 12,
                }}
              >
                <Text style={{ color: M3.colors.onSurface, fontSize: 14, fontFamily: "DMSans_400Regular", lineHeight: 21 }}>
                  {msg.content === "..." && isGenerating ? (
                    <ActivityIndicator size="small" color={M3.colors.primary} />
                  ) : (
                    msg.content
                  )}
                </Text>
              </View>
            </View>
          ))}

          {isGenerating && messages[messages.length - 1]?.role !== "assistant" && (
            <View style={{ alignSelf: "flex-start" }}>
              <View style={{ backgroundColor: M3.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: M3.colors.surfaceContainer, padding: 12 }}>
                <ActivityIndicator size="small" color={M3.colors.primary} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── Suggested Prompts ── */}
        {messages.length === 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ maxHeight: 44 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          >
            {COACH_SUGGESTED_PROMPTS.map((prompt) => (
              <TouchableOpacity
                key={prompt}
                onPress={() => sendMessage(prompt)}
                style={{
                  backgroundColor: M3.colors.surface,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: M3.colors.surfaceContainer,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                  {prompt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Input ── */}
        <View style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 10,
          padding: 20,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: M3.colors.surfaceContainer,
        }}>
          <Input
            value={input}
            onChangeText={setInput}
            placeholder="Ask your coach..."
            multiline
            maxLength={500}
            style={{
              flex: 1,
              backgroundColor: M3.colors.surface,
              maxHeight: 100,
            }}
          />
          <TouchableOpacity
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || isGenerating}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: input.trim() && !isGenerating ? M3.colors.primary : M3.colors.surfaceVariant,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color={M3.colors.primary} />
            ) : (
              <Feather name="send" size={18} color={input.trim() ? M3.colors.background : M3.colors.onSurfaceMuted} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
