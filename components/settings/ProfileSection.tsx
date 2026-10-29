import { Text, View } from "react-native";
import { router } from "expo-router";
import { Card } from "../ui/Card";
import { ListRow } from "../ui/ListRow";
import { M3 } from "../../design-system/tokens";
import { DEFAULT_TARGETS } from "../../lib/constants/defaults";
import { getProfile, getTargetsForDate } from "../../lib/data/profile";

interface ProfileSectionProps {
  profile: Awaited<ReturnType<typeof getProfile>>;
  targets: Awaited<ReturnType<typeof getTargetsForDate>> | null;
}

export function ProfileSection({ profile, targets }: ProfileSectionProps) {
  return (
    <>
      <Card>
        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
          PROFILE
        </Text>
        {[
          { label: "Name", value: profile?.display_name || "Not set" },
          { label: "Sex", value: profile?.sex || "Not set" },
          { label: "Birth year", value: profile?.birth_year ? String(profile.birth_year) : "Not set" },
          { label: "Height", value: profile?.height_cm ? `${profile.height_cm} cm` : "Not set" },
          { label: "Goal", value: profile?.goal_text || "Not set" },
        ].map((item) => (
          <View key={item.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: M3.colors.outline }}>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>{item.label}</Text>
            <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_500Medium" }}>{item.value}</Text>
          </View>
        ))}
      </Card>
      <Card>
        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
          TARGETS
        </Text>
        {[
          { label: "Calories", value: `${targets?.calories ?? DEFAULT_TARGETS.calories} kcal` },
          { label: "Protein", value: `${targets?.protein_g ?? DEFAULT_TARGETS.protein_g}g` },
          { label: "Carbs", value: `${targets?.carbs_g ?? DEFAULT_TARGETS.carbs_g}g` },
          { label: "Fat", value: `${targets?.fat_g ?? DEFAULT_TARGETS.fat_g}g` },
        ].map((item) => (
          <View key={item.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: M3.colors.outline }}>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>{item.label}</Text>
            <Text style={{ color: M3.colors.primary, fontSize: 13, fontFamily: "DMSans_700Bold" }}>{item.value}</Text>
          </View>
        ))}
      </Card>
    </>
  );
}

export function ProfileSetupRow({
  profile,
}: Pick<ProfileSectionProps, "profile">) {
  return (
    <ListRow
      icon="user"
      title={profile ? "Edit profile" : "Set up profile"}
      subtitle="Personalize your local profile"
      onPress={() => router.push("/modals/profile-setup")}
    />
  );
}
