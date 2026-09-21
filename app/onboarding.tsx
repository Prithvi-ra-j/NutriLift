import { useState } from "react";
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { upsertUserProfile } from "../lib/db/queries/profile";
import { recomputeDailyNutrition } from "../lib/db/queries/nutrition";
import { getTodayKey } from "../lib/dates";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { M3 } from "../design-system/tokens";
import { PressableScale } from "../components/ui/PressableScale";

const goals = ["Build muscle", "Lose fat", "Maintain", "Improve performance"] as const;

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<string | null>(null);
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [saving, setSaving] = useState(false);

  const canContinue =
    step === 0 ? name.trim().length >= 2 :
    step === 1 ? !!goal :
    step === 2 ? Number(age) > 0 && Number(height) > 0 :
    Number(calories) > 0 && Number(protein) > 0 && Number(carbs) > 0 && Number(fat) > 0;

  const finish = async () => {
    if (!canContinue || saving) return;
    setSaving(true);
    try {
      await upsertUserProfile({
        display_name: name.trim(),
        age: Number(age),
        sex: null,
        height_cm: Number(height),
        calories_target: Number(calories),
        protein_target_g: Number(protein),
        carbs_target_g: Number(carbs),
        fat_target_g: Number(fat),
        units: "metric",
        target_source: "user",
      });
      await recomputeDailyNutrition(getTodayKey());
      router.replace("/(tabs)");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: M3.spacing.xl, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ flex: 1, justifyContent: "center", gap: 20, maxWidth: 560, width: "100%", alignSelf: "center" }}>
            <View style={{ gap: 8 }}>
              <Text style={{ ...M3.typescale.displaySmall, color: M3.colors.primary }}>NUTRILIFT</Text>
              <Text style={{ ...M3.typescale.headlineLarge, color: M3.colors.onSurface }}>
                {step === 0 ? "Let's set up your profile." : step === 1 ? "What's your main goal?" : step === 2 ? "A few basics." : "Set your daily targets."}
              </Text>
              <Text style={{ ...M3.typescale.bodyMedium, color: M3.colors.onSurfaceVariant }}>
                {step === 3 ? "These are your targets. You can change them anytime." : "Only the essentials for your first run."}
              </Text>
            </View>

            {step === 0 && (
              <Card>
                <Text style={{ ...M3.typescale.titleMedium, color: M3.colors.onSurface, marginBottom: 8 }}>Name</Text>
                <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={M3.colors.onSurfaceMuted} autoFocus style={{ height: 50, backgroundColor: M3.colors.surfaceVariant, borderRadius: M3.shape.small, paddingHorizontal: 14, color: M3.colors.onSurface, fontSize: 16 }} />
              </Card>
            )}

            {step === 1 && (
              <View style={{ gap: 10 }}>
                {goals.map((item) => (
                  <PressableScale key={item} onPress={() => setGoal(item)} accessibilityRole="radio" accessibilityState={{ selected: goal === item }} style={{ minHeight: 52, padding: 16, borderRadius: M3.shape.medium, backgroundColor: goal === item ? M3.colors.primaryContainer : M3.colors.surface, borderWidth: 1, borderColor: goal === item ? M3.colors.primary : M3.colors.outline }}>
                    <Text style={{ ...M3.typescale.titleMedium, color: goal === item ? M3.colors.primary : M3.colors.onSurface }}>{item}</Text>
                  </PressableScale>
                ))}
              </View>
            )}

            {step === 2 && (
              <Card>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput value={age} onChangeText={setAge} placeholder="Age" keyboardType="number-pad" placeholderTextColor={M3.colors.onSurfaceMuted} style={{ flex: 1, height: 50, backgroundColor: M3.colors.surfaceVariant, borderRadius: M3.shape.small, paddingHorizontal: 14, color: M3.colors.onSurface }} />
                  <TextInput value={height} onChangeText={setHeight} placeholder="Height (cm)" keyboardType="decimal-pad" placeholderTextColor={M3.colors.onSurfaceMuted} style={{ flex: 1, height: 50, backgroundColor: M3.colors.surfaceVariant, borderRadius: M3.shape.small, paddingHorizontal: 14, color: M3.colors.onSurface }} />
                </View>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <View style={{ gap: 12 }}>
                  {[["Calories", calories, setCalories, "kcal"], ["Protein", protein, setProtein, "g"], ["Carbs", carbs, setCarbs, "g"], ["Fat", fat, setFat, "g"]].map(([label, value, setter, unit]) => (
                    <View key={label as string} style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ flex: 1, ...M3.typescale.titleMedium, color: M3.colors.onSurface }}>{label as string}</Text>
                      <TextInput value={value as string} onChangeText={setter as (v: string) => void} keyboardType="decimal-pad" placeholder={unit as string} placeholderTextColor={M3.colors.onSurfaceMuted} style={{ width: 120, height: 46, backgroundColor: M3.colors.surfaceVariant, borderRadius: M3.shape.small, paddingHorizontal: 12, color: M3.colors.onSurface, textAlign: "right" }} />
                    </View>
                  ))}
                </View>
              </Card>
            )}

            <View style={{ flexDirection: "row", gap: 10 }}>
              {step > 0 && <Button label="Back" variant="secondary" onPress={() => setStep(step - 1)} />}
              <Button label={step === 3 ? "Finish setup" : "Continue"} loading={saving} disabled={!canContinue} onPress={() => step === 3 ? void finish() : setStep(step + 1)} style={{ flex: 1 }} />
            </View>

            <View style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>
              {[0,1,2,3].map((item) => <View key={item} style={{ width: item === step ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: item === step ? M3.colors.primary : M3.colors.outline }} />)}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
