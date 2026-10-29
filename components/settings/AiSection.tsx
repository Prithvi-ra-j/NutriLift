import { Switch, Text, TextInput, View } from "react-native";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { M3 } from "../../design-system/tokens";
import { router } from "expo-router";

interface AiSectionProps {
  aiConsent: boolean;
  includeBodyMeasurements: boolean;
  includeInjuriesAndNotes: boolean;
  minimumCalorieFloor: string;
  onBodyMeasurementsChange: (enabled: boolean) => Promise<void>;
  onInjuriesAndNotesChange: (enabled: boolean) => Promise<void>;
  onMinimumCalorieFloorChange: (value: string) => void;
  onSaveMinimumCalorieFloor: () => Promise<void>;
}

export function AiSection({
  aiConsent,
  includeBodyMeasurements,
  includeInjuriesAndNotes,
  minimumCalorieFloor,
  onBodyMeasurementsChange,
  onInjuriesAndNotesChange,
  onMinimumCalorieFloorChange,
  onSaveMinimumCalorieFloor,
}: AiSectionProps) {
  return (
    <>
      <Card>
        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 8, letterSpacing: 0.5 }}>
          AI PRIVACY AND SAFETY
        </Text>
        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", lineHeight: 18, marginBottom: 12 }}>
          {aiConsent
            ? "AI features are enabled. You can withdraw consent at any time."
            : "AI features are disabled until you review and accept the data-use notice."}
        </Text>
        <Button
          label="Review AI consent"
          icon="shield"
          onPress={() => router.push("/modals/ai-consent")}
        />
        <View style={{ height: 12 }} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_500Medium" }}>
              Include body measurements in coach context
            </Text>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 3 }}>
              Off by default; shares only latest weight and body-fat readings.
            </Text>
          </View>
          <Switch
            value={includeBodyMeasurements}
            onValueChange={(enabled) => {
              void onBodyMeasurementsChange(enabled);
            }}
          />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_500Medium" }}>
              Include injuries and coach notes
            </Text>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 3 }}>
              Off by default; sends only your saved coach notes.
            </Text>
          </View>
          <Switch
            value={includeInjuriesAndNotes}
            onValueChange={(enabled) => {
              void onInjuriesAndNotesChange(enabled);
            }}
          />
        </View>
        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 8, marginBottom: 6 }}>
          Minimum calorie floor (kcal/day; only raise from 1500)
        </Text>
        <TextInput
          value={minimumCalorieFloor}
          onChangeText={onMinimumCalorieFloorChange}
          keyboardType="number-pad"
          onEndEditing={() => {
            void onSaveMinimumCalorieFloor();
          }}
          style={{
            backgroundColor: M3.colors.surface,
            borderRadius: M3.shape.medium,
            borderWidth: 1,
            borderColor: M3.colors.outline,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: M3.colors.onSurface,
            fontSize: 14,
            fontFamily: "DMSans_500Medium",
          }}
        />
      </Card>

      <Card>
        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 8, letterSpacing: 0.5 }}>
          SUPPLEMENTS AND MEDICAL
        </Text>
        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", lineHeight: 18 }}>
          NutriLift is not medical advice. The supplement log is a plain tracker. Talk to a qualified clinician about pain, medication, or supplements.
        </Text>
      </Card>
    </>
  );
}
