import { useEffect, useReducer } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ModalHeader } from "../../components/ui/ModalHeader";
import { getProfile, saveProfile } from "../../lib/data/profile";
import type { ProfileInput } from "../../lib/data/profile";
import { M3 } from "../../design-system/tokens";
import { logger } from "../../lib/logger";
import { useToast } from "../../components/ui/Toast";

type ProfileSetupState = {
  profile: Awaited<ReturnType<typeof getProfile>>;
  displayName: string;
  sex: string;
  birthYear: string;
  heightCm: string;
  goalText: string;
  coachNotes: string;
  isLoading: boolean;
  isSaving: boolean;
};

type ProfileSetupAction = {
  [K in keyof ProfileSetupState]: {
    field: K;
    value: ProfileSetupState[K];
  };
}[keyof ProfileSetupState];

const initialState: ProfileSetupState = {
  profile: null,
  displayName: "",
  sex: "",
  birthYear: "",
  heightCm: "",
  goalText: "",
  coachNotes: "",
  isLoading: true,
  isSaving: false,
};

function profileSetupReducer(
  state: ProfileSetupState,
  action: ProfileSetupAction,
): ProfileSetupState {
  return { ...state, [action.field]: action.value };
}

export default function ProfileSetupModal() {
  const { show } = useToast();
  const { firstRun } = useLocalSearchParams<{ firstRun?: string }>();
  const [state, dispatch] = useReducer(profileSetupReducer, initialState);
  const {
    profile,
    displayName,
    sex,
    birthYear,
    heightCm,
    goalText,
    coachNotes,
    isLoading,
    isSaving,
  } = state;
  const setField = <K extends keyof ProfileSetupState>(
    field: K,
    value: ProfileSetupState[K],
  ) => dispatch({ field, value } as ProfileSetupAction);

  const skipSetup = async () => {
    setField("isSaving", true);
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
      show({ message: "Your setup choice could not be saved. Please try again.", kind: "error" });
    } finally {
      setField("isSaving", false);
    }
  };

  useEffect(() => {
    let active = true;
    getProfile()
      .then((savedProfile) => {
        if (!active) return;
        setField("profile", savedProfile);
        setField("displayName", savedProfile?.display_name ?? "");
        setField("sex", savedProfile?.sex ?? "");
        setField("birthYear", savedProfile?.birth_year?.toString() ?? "");
        setField("heightCm", savedProfile?.height_cm?.toString() ?? "");
        setField("goalText", savedProfile?.goal_text ?? "");
        setField("coachNotes", savedProfile?.coach_notes ?? "");
      })
      .catch((error: unknown) => {
        logger.error("Profile load failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        show({ message: "Your local profile could not be loaded.", kind: "error" });
      })
      .finally(() => {
        if (active) setField("isLoading", false);
      });
    return () => {
      active = false;
    };
  }, [show]);

  const save = async () => {
    const year = birthYear.trim() ? Number(birthYear) : null;
    const height = heightCm.trim() ? Number(heightCm) : null;
    const currentYear = new Date().getFullYear();
    if (year !== null && (!Number.isInteger(year) || year < 1900 || year > currentYear)) {
      show({ message: `Enter a birth year between 1900 and ${currentYear}.`, kind: "error" });
      return;
    }
    if (height !== null && (!Number.isFinite(height) || height <= 0 || height > 300)) {
      show({ message: "Enter a height from 1 to 300 cm.", kind: "error" });
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

    setField("isSaving", true);
    try {
      await saveProfile(input);
      if (firstRun === "true" || !profile) router.replace("/(tabs)");
      else router.back();
    } catch (error) {
      logger.error("Profile save failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      show({ message: "Your profile was not saved. Please try again.", kind: "error" });
    } finally {
      setField("isSaving", false);
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
            void skipSetup();
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
            onChangeText={(value) => setField("displayName", value)}
            placeholder="How should NutriLift address you?"
            maxLength={80}
            editable={!isLoading && !isSaving}
          />
        </View>
        <View>
          <Text style={labelStyle}>Sex (optional)</Text>
          <Input
            value={sex}
            onChangeText={(value) => setField("sex", value)}
            placeholder="Leave blank if you prefer"
            maxLength={40}
            editable={!isLoading && !isSaving}
          />
        </View>
        <View>
          <Text style={labelStyle}>Birth year (optional)</Text>
          <Input
            value={birthYear}
            onChangeText={(value) => setField("birthYear", value)}
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
            onChangeText={(value) => setField("heightCm", value)}
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
            onChangeText={(value) => setField("goalText", value)}
            placeholder="A goal in your own words"
            maxLength={240}
            editable={!isLoading && !isSaving}
          />
        </View>
        <View>
          <Text style={labelStyle}>Coach notes (optional)</Text>
          <Input
            value={coachNotes}
            onChangeText={(value) => setField("coachNotes", value)}
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
