import { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { getUserProfile, upsertUserProfile } from "../lib/db/queries/profile";
import { recomputeDailyNutrition } from "../lib/db/queries/nutrition";
import { getTodayKey } from "../lib/dates";
import { USER_PROFILE } from "../lib/constants/user-profile";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { M3 } from "../design-system/tokens";
import { PressableScale } from "../components/ui/PressableScale";

export default function ProfileScreen() {
  const [name, setName] = useState<string>(USER_PROFILE.name);
  const [calories, setCalories] = useState(String(USER_PROFILE.targets.calories));
  const [protein, setProtein] = useState(String(USER_PROFILE.targets.protein_g));
  const [carbs, setCarbs] = useState(String(USER_PROFILE.targets.carbs_g));
  const [fat, setFat] = useState(String(USER_PROFILE.targets.fat_g));
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getUserProfile().then(profile => {
      if (profile) {
        setName(profile.display_name);
        if (profile.calories_target != null) setCalories(String(profile.calories_target));
        if (profile.protein_target_g != null) setProtein(String(profile.protein_target_g));
        if (profile.carbs_target_g != null) setCarbs(String(profile.carbs_target_g));
        if (profile.fat_target_g != null) setFat(String(profile.fat_target_g));
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await upsertUserProfile({
        display_name: name.trim() || USER_PROFILE.name,
        age: USER_PROFILE.age,
        sex: USER_PROFILE.sex,
        height_cm: USER_PROFILE.height_cm,
        calories_target: Number(calories) || USER_PROFILE.targets.calories,
        protein_target_g: Number(protein) || USER_PROFILE.targets.protein_g,
        carbs_target_g: Number(carbs) || USER_PROFILE.targets.carbs_g,
        fat_target_g: Number(fat) || USER_PROFILE.targets.fat_g,
        units: "metric",
        target_source: "user",
      });
      await recomputeDailyNutrition(getTodayKey());
      router.back();
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }} />;

  const fields = [
    ["Calories", calories, setCalories, "kcal"],
    ["Protein", protein, setProtein, "g"],
    ["Carbs", carbs, setCarbs, "g"],
    ["Fat", fat, setFat, "g"],
  ] as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <PressableScale onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: M3.colors.surfaceVariant, alignItems: "center", justifyContent: "center" }}>
            <Feather name="arrow-left" size={20} color={M3.colors.onSurface} />
          </PressableScale>
          <View>
            <Text style={{ color: M3.colors.onSurface, fontFamily: "DMSans_700Bold", fontSize: 23 }}>Profile</Text>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 2 }}>Your personal targets</Text>
          </View>
        </View>

        <Card>
          <Text style={{ color: M3.colors.onSurface, fontFamily: "DMSans_700Bold", fontSize: 17, marginBottom: 12 }}>Basics</Text>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontFamily: "DMSans_500Medium", fontSize: 13, marginBottom: 6 }}>Name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={M3.colors.onSurfaceMuted}
            style={{ backgroundColor: M3.colors.surfaceVariant, borderRadius: 10, paddingHorizontal: 14, height: 48, color: M3.colors.onSurface, fontFamily: "DMSans_500Medium", fontSize: 15 }} />
        </Card>

        <Card>
          <Text style={{ color: M3.colors.onSurface, fontFamily: "DMSans_700Bold", fontSize: 17, marginBottom: 4 }}>Daily targets</Text>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontFamily: "DMSans_400Regular", fontSize: 13, marginBottom: 14 }}>These values drive Today and nutrition calculations.</Text>
          <View style={{ gap: 12 }}>
            {fields.map(([label, value, setter, unit]) => (
              <View key={label} style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ flex: 1, color: M3.colors.onSurface, fontFamily: "DMSans_500Medium", fontSize: 15 }}>{label}</Text>
                <TextInput value={value} onChangeText={setter} keyboardType="decimal-pad" accessibilityLabel={label}
                  style={{ width: 110, height: 44, backgroundColor: M3.colors.surfaceVariant, borderRadius: 10, paddingHorizontal: 12, color: M3.colors.onSurface, fontFamily: "DMSans_700Bold", fontSize: 16, textAlign: "right" }} />
                <Text style={{ width: 42, color: M3.colors.onSurfaceVariant, fontFamily: "DMSans_400Regular", fontSize: 13, marginLeft: 8 }}>{unit}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Button label={saving ? "Saving..." : "Save changes"} loading={saving} onPress={save} icon="check" />
      </ScrollView>
    </SafeAreaView>
  );
}
