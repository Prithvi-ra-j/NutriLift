import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/ui/Button";
import { ModalHeader } from "../../components/ui/ModalHeader";
import { M3 } from "../../design-system/tokens";
import { getAiPreference, setAiPreference } from "../../lib/data/aiPreferences";
import { logger } from "../../lib/logger";
import { useToast } from "../../components/ui/Toast";

export default function AiConsentModal() {
  const { show } = useToast();
  const [consent, setConsent] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getAiPreference("ai_consent_v1")
      .then(setConsent)
      .catch((error: unknown) => {
        logger.error("AI consent status lookup failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        show({ message: "Could not check consent. Please try again.", kind: "error" });
      });
  }, [show]);

  const saveConsent = async (value: "accepted" | "revoked") => {
    setIsSaving(true);
    try {
      await setAiPreference("ai_consent_v1", value);
      setConsent(value);
      router.back();
    } catch (error) {
      logger.error("AI consent preference could not be saved", {
        error: error instanceof Error ? error.message : String(error),
      });
      show({
        message: error instanceof Error ? error.message : "Consent could not be saved.",
        kind: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <ModalHeader title="AI DATA USE" subtitle="Review before enabling AI features" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
        <View style={{ backgroundColor: M3.colors.surface, borderRadius: M3.shape.large, padding: 16, gap: 12 }}>
          <Text style={{ color: M3.colors.onSurface, fontSize: 15, fontFamily: "DMSans_700Bold" }}>
            What is sent
          </Text>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 20 }}>
            When you use an AI feature, NutriLift sends the typed text or recorded audio needed for that request. The coach receives aggregated nutrition and training summaries for the last 7 and 28 days. Body measurements and saved coach notes are excluded unless you enable their individual settings.
          </Text>
          <Text style={{ color: M3.colors.onSurface, fontSize: 15, fontFamily: "DMSans_700Bold", marginTop: 4 }}>
            Who receives it
          </Text>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 20 }}>
            Requests pass through your configured Supabase project and are processed by Groq. Do not send information you do not want these providers to process.
          </Text>
          <Text style={{ color: M3.colors.onSurface, fontSize: 15, fontFamily: "DMSans_700Bold", marginTop: 4 }}>
            What NutriLift stores
          </Text>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 20 }}>
            The cloud stores AI usage counters and request metadata such as model and token counts. It does not store prompts, transcripts, or audio. Coach conversation history is stored locally on this device.
          </Text>
          <Text style={{ color: M3.colors.onSurface, fontSize: 15, fontFamily: "DMSans_700Bold", marginTop: 4 }}>
            How to turn AI off
          </Text>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 20 }}>
            Withdraw consent here or from More → Settings → Review AI consent. AI requests stop immediately; your local conversation history remains until you clear it.
          </Text>
        </View>

        <Button
          label={isSaving ? "Saving..." : "Accept and enable AI"}
          icon="check"
          loading={isSaving}
          onPress={() => void saveConsent("accepted")}
        />
        {consent === "accepted" && (
          <Button
            label={isSaving ? "Saving..." : "Withdraw AI consent"}
            icon="slash"
            variant="secondary"
            loading={isSaving}
            onPress={() => void saveConsent("revoked")}
          />
        )}
        <Button
          label="Close"
          variant="secondary"
          onPress={() => router.back()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
