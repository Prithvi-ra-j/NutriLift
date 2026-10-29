import { memo, useEffect, useRef } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import type { AiConversation } from "../../lib/data/types";
import { M3 } from "../../design-system/tokens";

const suggestedPrompts = [
  "How did I do this week?",
  "Should I increase weight today?",
  "Am I on track for December?",
  "What's limiting my progress most?",
  "Analyze my sleep vs performance",
  "Is my protein timing optimal?",
];

interface CoachConversationProps {
  isGenerating: boolean;
  messages: AiConversation[];
  onPrompt: (prompt: string) => void;
}

const CoachMessageRow = memo(function CoachMessageRow({
  isGenerating,
  message,
}: {
  isGenerating: boolean;
  message: AiConversation;
}) {
  const isUser = message.role === "user";
  return (
    <View
      style={{
        alignSelf: isUser ? "flex-end" : "stretch",
        maxWidth: isUser ? "88%" : "100%",
        marginBottom: 20,
      }}
    >
      {!isUser ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: M3.colors.primaryContainer, alignItems: "center", justifyContent: "center" }}>
            <Feather name="cpu" size={11} color={M3.colors.primary} />
          </View>
          <Text style={{ color: M3.colors.primary, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 0.5 }}>
            COACH
          </Text>
        </View>
      ) : null}
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
        {message.content === "..." && isGenerating ? (
          <ActivityIndicator size="small" color={M3.colors.primary} />
        ) : (
          <Text style={{ color: M3.colors.onSurface, fontSize: 14.5, fontFamily: "DMSans_400Regular", lineHeight: 22 }}>
            {message.content}
          </Text>
        )}
      </View>
    </View>
  );
});

function CoachWelcome({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  return (
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
          Direct, factual, and kind.
        </Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
        {suggestedPrompts.map((prompt) => (
          <TouchableOpacity
            key={prompt}
            accessibilityRole="button"
            onPress={() => onPrompt(prompt)}
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
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export function CoachConversation({
  isGenerating,
  messages,
  onPrompt,
}: CoachConversationProps) {
  const listRef = useRef<FlashListRef<AiConversation>>(null);

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, isGenerating]);

  return (
    <FlashList
      ref={listRef}
      contentContainerStyle={{
        padding: 20,
        paddingTop: messages.length === 0 ? 24 : 0,
        paddingBottom: 16,
        flexGrow: 1,
      }}
      data={messages}
      keyExtractor={(message) => message.id}
      ListEmptyComponent={<CoachWelcome onPrompt={onPrompt} />}
      ListFooterComponent={
        isGenerating && messages[messages.length - 1]?.role !== "assistant" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 4 }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: M3.colors.primaryContainer, alignItems: "center", justifyContent: "center" }}>
              <Feather name="cpu" size={11} color={M3.colors.primary} />
            </View>
            <ActivityIndicator size="small" color={M3.colors.primary} />
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <CoachMessageRow isGenerating={isGenerating} message={item} />
      )}
      showsVerticalScrollIndicator={false}
    />
  );
}
