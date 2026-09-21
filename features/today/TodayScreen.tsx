
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useUIStore } from "../../../lib/stores/ui.store";
import { useTodayData } from "./hooks/useTodayData";
import { parseDateKey, formatDateKey } from "../../../lib/dates";
import { formatCalories, formatGrams } from "../../../lib/format";
import { Card } from "../../../components/ui/Card";
import { MacroBar } from "../../../components/ui/MacroBar";
import { MacroRing } from "../../../components/ui/MacroRing";
import { CardSkeleton } from "../../../components/ui/SkeletonLoader";
import { ErrorState } from "../../../components/ui/ErrorState";
import { PressableScale } from "../../../components/ui/PressableScale";
import type { FoodLog } from "../../../lib/db/schema";
import { M3 } from "../../../design-system/tokens";

const MEALS = ["breakfast", "lunch", "snack", "dinner"] as const;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function dayTypeForToday() {
  const d = new Date().getDay();
  return ["Cardio", "Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"][d];
}

function MealRow({ meal, logs, onAdd }: { meal: string; logs: FoodLog[]; onAdd: () => void }) {
  const kcal = logs.reduce((s, x) => s + x.calories, 0);
  const protein = logs.reduce((s, x) => s + x.protein_g, 0);
  return (
    <View style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: M3.colors.outline }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: M3.colors.onSurface, fontFamily: "DMSans_700Bold", fontSize: 16, textTransform: "capitalize" }}>{meal}</Text>
          {logs.length > 0 ? (
            <Text style={{ color: M3.colors.onSurfaceVariant, fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 3 }}>
              {logs.slice(0, 2).map(x => x.name).join(" · ")}{logs.length > 2 ? ` +${logs.length - 2}` : ""}
            </Text>
          ) : (
            <Text style={{ color: M3.colors.onSurfaceMuted, fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 3 }}>Nothing logged yet</Text>
          )}
        </View>
        {logs.length > 0 ? (
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: M3.colors.onSurface, fontFamily: "DMSans_700Bold", fontSize: 15 }}>{formatCalories(kcal)} kcal</Text>
            <Text style={{ color: M3.colors.secondary, fontFamily: "DMSans_500Medium", fontSize: 12, marginTop: 2 }}>{formatGrams(protein)} protein</Text>
          </View>
        ) : null}
        <PressableScale onPress={onAdd} haptic accessibilityRole="button" accessibilityLabel={`Add food to ${meal}`} style={{ marginLeft: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: M3.colors.surfaceVariant, alignItems: "center", justifyContent: "center" }}>
          <Feather name="plus" size={20} color={M3.colors.primary} />
        </PressableScale>
      </View>
    </View>
  );
}

export default function TodayScreen() {
  const { coachInsight } = useUIStore();
  const {
    today, nutrition, session, sessionSummary, recovery, recoveryScore, week, groups, targets,
    displayName, loading, refreshing, error: loadError, refresh, retry,
  } = useTodayData();
  const calories = nutrition?.total_calories ?? 0;
  const protein = nutrition?.total_protein_g ?? 0;
  const carbs = nutrition?.total_carbs_g ?? 0;
  const fat = nutrition?.total_fat_g ?? 0;
  const nextMeal = ["breakfast", "lunch", "snack", "dinner"].find((meal) => groups[meal].length === 0) ?? null;

  if (loadError && !loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <ErrorState onRetry={retry} />
    </SafeAreaView>
  );

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <View style={{ padding: M3.spacing.xl, gap: M3.spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1, gap: 8 }}><CardSkeleton /></View>
          <CardSkeleton />
        </View>
        <View style={{ height: 150, borderRadius: M3.shape.large, backgroundColor: M3.colors.surface, borderWidth: 1, borderColor: M3.colors.outline }} />
        <View style={{ gap: 8 }}>
          <View style={{ height: 20, width: 110, borderRadius: M3.shape.small, backgroundColor: M3.colors.surfaceContainer }} />
          <CardSkeleton />
        </View>
        <CardSkeleton />
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 170, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={M3.colors.primary} />}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontFamily: "DMSans_400Regular", fontSize: 13 }}>{formatDateKey(today)}</Text>
            <Text style={{ color: M3.colors.onSurface, fontFamily: "DMSans_700Bold", fontSize: 25, marginTop: 3 }}>{greeting()}, {displayName}</Text>
          </View>
          <PressableScale onPress={() => router.push("/profile")} accessibilityRole="button" accessibilityLabel="Open profile" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: M3.colors.primaryContainer, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: M3.colors.primary, fontFamily: "DMSans_700Bold", fontSize: 17 }}>{displayName.charAt(0)}</Text>
          </PressableScale>
        </View>

        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <MacroRing protein={protein} carbs={carbs} fat={fat} proteinTarget={targets.protein_g} carbsTarget={targets.carbs_g} fatTarget={targets.fat_g} calories={calories} caloriesTarget={targets.calories} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_500Medium" }}>Today's nutrition</Text>
              <Text style={{ color: M3.colors.onSurface, fontSize: 23, fontFamily: "BebasNeue_400Regular", marginTop: 2 }}>{formatGrams(protein)} protein</Text>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", marginBottom: 10 }}>of {targets.protein_g}g target</Text>
              <MacroBar label="Protein" current={protein} target={targets.protein_g} color={M3.macroColors.protein} />
              <MacroBar label="Carbs" current={carbs} target={targets.carbs_g} color={M3.macroColors.carbs} />
              <MacroBar label="Fat" current={fat} target={targets.fat_g} color={M3.macroColors.fat} />
            </View>
          </View>
        </Card>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ flex: 1, color: M3.colors.onSurface, fontFamily: "DMSans_700Bold", fontSize: 19 }}>Meals</Text>
          <PressableScale onPress={() => router.push("/modals/log-food")} haptic style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 20, backgroundColor: M3.colors.primaryContainer, flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Feather name="plus" size={16} color={M3.colors.primary} /><Text style={{ color: M3.colors.primary, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Log food</Text>
          </PressableScale>
        </View>

        <Card noPadding>
          <View style={{ paddingHorizontal: 16 }}>
            {MEALS.map(m => <MealRow key={m} meal={m} logs={groups[m]} onAdd={() => router.push({ pathname: "/modals/log-food", params: { meal: m } })} />)}
          </View>
        </Card>

        {nextMeal && (
          <Card variant="elevated">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: M3.colors.primaryContainer, alignItems: "center", justifyContent: "center" }}>
                <Feather name="arrow-right-circle" size={18} color={M3.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: M3.colors.onSurface, fontFamily: "DMSans_500Medium", fontSize: 14 }}>Next up</Text>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 2, textTransform: "capitalize" }}>{nextMeal} isn’t logged yet</Text>
              </View>
              <PressableScale onPress={() => router.push({ pathname: "/modals/log-food", params: { meal: nextMeal } })} haptic style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 20, backgroundColor: M3.colors.primaryContainer, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: M3.colors.primary, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Log</Text>
              </PressableScale>
            </View>
          </Card>
        )}

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ flex: 1, color: M3.colors.onSurface, fontFamily: "DMSans_700Bold", fontSize: 19 }}>Training</Text>
          <PressableScale onPress={() => router.push("/(tabs)/workout")} accessibilityRole="button" accessibilityLabel="Open training" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: M3.colors.surfaceVariant, alignItems: "center", justifyContent: "center" }}>
            <Feather name="chevron-right" size={20} color={M3.colors.onSurfaceVariant} />
          </PressableScale>
        </View>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: M3.colors.primaryContainer, alignItems: "center", justifyContent: "center" }}>
              <Feather name="activity" size={21} color={M3.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: M3.colors.onSurface, fontFamily: "DMSans_700Bold", fontSize: 16 }}>{session ? `${session.day_type} · ${session.ended_at ? "Completed" : "In progress"}` : dayTypeForToday()}</Text>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 3 }}>{session ? `${sessionSummary.exerciseCount} exercises · ${sessionSummary.workingSetCount} working sets` : "Ready when you are"}</Text>
            </View>
            <Feather name={session ? "check-circle" : "play-circle"} size={22} color={session ? M3.colors.success : M3.colors.primary} />
          </View>
        </Card>

        <PressableScale onPress={() => router.push({ pathname: "/(tabs)/more", params: { section: "recovery" } })} accessibilityRole="button" accessibilityLabel="Open recovery details">
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: M3.colors.successContainer, alignItems: "center", justifyContent: "center" }}>
                <Feather name="heart" size={18} color={M3.colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: M3.colors.onSurface, fontFamily: "DMSans_700Bold", fontSize: 16 }}>Recovery</Text>
                {recovery ? (
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 2 }}>
                    {`${recoveryScore ?? 0}/100 · Sleep ${recovery.sleep_duration_hr != null ? `${recovery.sleep_duration_hr.toFixed(1)}h` : "—"} · Energy ${recovery.energy_level ?? "—"}/5 · Soreness ${recovery.muscle_soreness ?? "—"}/5`}
                  </Text>
                ) : (
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 2 }}>No recovery check-in yet · Tap to add one</Text>
                )}
              </View>
              <Feather name="chevron-right" size={18} color={M3.colors.onSurfaceMuted} />
            </View>
          </Card>
        </PressableScale>

        <View>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ flex: 1, color: M3.colors.onSurface, fontFamily: "DMSans_700Bold", fontSize: 19 }}>This week</Text>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontFamily: "DMSans_500Medium", fontSize: 13 }}>{week.filter(x => x.hit).length}/7 protein days</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {week.map(x => (
              <View key={x.date} style={{ alignItems: "center", gap: 5 }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: x.hit ? M3.colors.successContainer : M3.colors.surfaceVariant, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: x.hit ? M3.colors.success : M3.colors.outline }}>
                  {x.hit && <Feather name="check" size={14} color={M3.colors.success} />}
                </View>
                <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 12, fontFamily: "DMSans_400Regular" }}>{parseDateKey(x.date).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1)}</Text>
              </View>
            ))}
          </View>
        </View>

        {coachInsight ? (
          <Card variant="elevated">
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: M3.colors.primaryContainer, alignItems: "center", justifyContent: "center" }}>
                <Feather name="cpu" size={18} color={M3.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: M3.colors.primary, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Coach</Text>
                <Text style={{ color: M3.colors.onSurface, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 20, marginTop: 4 }}>{coachInsight}</Text>
              </View>
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
