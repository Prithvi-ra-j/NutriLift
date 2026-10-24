import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ModalHeader } from "../../components/ui/ModalHeader";
import { getProfile, saveProfile } from "../../lib/data/profile";
import type { ProfileInput } from "../../lib/data/profile";
import { M3 } from "../../design-system/tokens";
import { logger } from "../../lib/logger";

export default function ProfileSetupModal() {
  const { firstRun } = useLocalSearchParams<{ firstRun?: string }>();
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getProfile>>>(null);
  const [displayName, setDisplayName] = useState("");
  const [sex, setSex] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [goalText, setGoalText] = useState("");
  const [coachNotes, setCoachNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const skipSetup = async () => {
    setIsSaving(true);
    try {
      await saveProfile({
        display_name: null,
        sex: null,
        birth_year: null,
        height_cm: null,
        goal_text: null,
        coach_notes: null,
      });
      router.replace("/(tabs)");
    } catch (error) {
      logger.error("Could not save profile setup choice", {
        error: error instanceof Error ? error.message : String(error),
      });
      Alert.alert("Could not continue", "Your setup choice could not be saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    let active = true;
    getProfile()
      .then((savedProfile) => {
        if (!active) return;
        setProfile(savedProfile);
        setDisplayName(savedProfile?.display_name ?? "");
        setSex(savedProfile?.sex ?? "");
        setBirthYear(savedProfile?.birth_year?.toString() ?? "");
        setHeightCm(savedProfile?.height_cm?.toString() ?? "");
        setGoalText(savedProfile?.goal_text ?? "");
        setCoachNotes(savedProfile?.coach_notes ?? "");
      })
      .catch((error: unknown) => {
        logger.error("Profile load failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        Alert.alert("Profile unavailable", "Your local profile could not be loaded.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    const year = birthYear.trim() ? Number(birthYear) : null;
    const height = heightCm.trim() ? Number(heightCm) : null;
    const currentYear = new Date().getFullYear();
    if (year !== null && (!Number.isInteger(year) || year < 1900 || year > currentYear)) {
      Alert.alert("Check birth year", `Enter a year between 1900 and ${currentYear}.`);
      return;
    }
    if (height !== null && (!Number.isFinite(height) || height <= 0 || height > 300)) {
      Alert.alert("Check height", "Enter a height from 1 to 300 cm.");
      return;
    }

    const input: ProfileInput = {
      display_name: displayName.trim() || null,
      sex: sex.trim() || null,
      birth_year: year,
      height_cm: height,
      goal_text: goalText.trim() || null,
      coach_notes: coachNotes.trim() || null,
    };

    setIsSaving(true);
    try {
      await saveProfile(input);
      if (firstRun === "true" || !profile) router.replace("/(tabs)");
      else router.back();
    } catch (error) {
      logger.error("Profile save failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      Alert.alert("Save failed", "Your profile was not saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const labelStyle = {
    color: M3.colors.onSurfaceVariant,
    fontSize: 13,
    fontFamily: "DMSans_500Medium" as const,
    marginBottom: 6,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <ModalHeader
        title={profile ? "EDIT PROFILE" : "PROFILE SETUP"}
        subtitle="Optional details stay on this device."
        onClose={() => {
          if (firstRun === "true") {
            Alert.alert("Profile setup", "You can finish profile setup later from Settings.", [
              { text: "Continue setup", style: "cancel" },
              { text: "Not now", onPress: () => void skipSetup() },
            ]);
          } else {
            router.back();
          }
        }}
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={labelStyle}>Display name</Text>
          <Input
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="How should NutriLift address you?"
            maxLength={80}
            editable={!isLoading && !isSaving}
          />
        </View>
        <View>
          <Text style={labelStyle}>Sex (optional)</Text>
          <Input
            value={sex}
            onChangeText={setSex}
            placeholder="Leave blank if you prefer"
            maxLength={40}
            editable={!isLoading && !isSaving}
          />
        </View>
        <View>
          <Text style={labelStyle}>Birth year (optional)</Text>
          <Input
            value={birthYear}
            onChangeText={setBirthYear}
            keyboardType="number-pad"
            placeholder="YYYY"
            maxLength={4}
            editable={!isLoading && !isSaving}
          />
        </View>
        <View>
          <Text style={labelStyle}>Height in cm (optional)</Text>
          <Input
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType="decimal-pad"
            placeholder="e.g. 170"
            maxLength={6}
            editable={!isLoading && !isSaving}
          />
        </View>
        <View>
          <Text style={labelStyle}>Goal (optional)</Text>
          <Input
            value={goalText}
            onChangeText={setGoalText}
            placeholder="A goal in your own words"
            maxLength={240}
            editable={!isLoading && !isSaving}
          />
        </View>
        <View>
          <Text style={labelStyle}>Coach notes (optional)</Text>
          <Input
            value={coachNotes}
            onChangeText={setCoachNotes}
            placeholder="Context you want to provide"
            multiline
            maxLength={1000}
            style={{ minHeight: 96, textAlignVertical: "top" }}
            editable={!isLoading && !isSaving}
          />
        </View>
        <Button
          label="Save profile"
          onPress={() => void save()}
          loading={isSaving || isLoading}
          disabled={isLoading}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
