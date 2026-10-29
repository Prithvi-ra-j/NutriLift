import { Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { DAY_TYPES, type DayType } from "../../lib/constants/exercises";
import { Card } from "../ui/Card";
import { M3 } from "../../design-system/tokens";

interface DayTypeTabsProps {
  completedDayTypes: Set<string>;
  hasSession: boolean;
  isSunday: boolean;
  onOpenTemplate: () => void;
  onSelectDayType: (dayType: DayType) => void;
  selectedDayType: DayType;
  templateExerciseCount: number;
}

export function DayTypeTabs({
  completedDayTypes,
  hasSession,
  isSunday,
  onOpenTemplate,
  onSelectDayType,
  selectedDayType,
  templateExerciseCount,
}: DayTypeTabsProps) {
  return (
    <>
      {isSunday && (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }}>
            <Feather name="activity" size={20} color={M3.colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: M3.colors.error, fontSize: 16, fontFamily: "DMSans_700Bold" }}>
                MARATHON DAY
              </Text>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 2 }}>
                Focus on cardio, stretching, stability, and mobility exercises
              </Text>
            </View>
          </View>
        </Card>
      )}

      {!hasSession && isSunday && (
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 }}>
              RECOVERY & CARDIO
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onSelectDayType("Cardio")}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: selectedDayType === "Cardio" ? M3.colors.errorContainer : M3.colors.surfaceVariant,
              borderWidth: 1,
              borderColor: selectedDayType === "Cardio" ? M3.colors.error : M3.colors.surfaceContainer,
              alignItems: "center",
            }}
          >
            <Text style={{ color: selectedDayType === "Cardio" ? M3.colors.error : M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_500Medium" }}>
              Cardio & Recovery
            </Text>
          </TouchableOpacity>
        </Card>
      )}

      {!hasSession && !isSunday && (
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 }}>
              SELECT DAY TYPE
            </Text>
            <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 10, fontFamily: "DMSans_400Regular" }}>
              Completed this week are hidden
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {DAY_TYPES.filter((dayType) => !completedDayTypes.has(dayType)).map((dayType) => (
              <TouchableOpacity
                key={dayType}
                onPress={() => onSelectDayType(dayType)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: selectedDayType === dayType ? M3.colors.primaryContainer : M3.colors.surfaceVariant,
                  borderWidth: 1,
                  borderColor: selectedDayType === dayType ? M3.colors.primary : M3.colors.surfaceContainer,
                }}
              >
                <Text style={{ color: selectedDayType === dayType ? M3.colors.primary : M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_500Medium" }}>
                  {dayType}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {templateExerciseCount > 0 && (
            <TouchableOpacity
              onPress={onOpenTemplate}
              style={{
                marginTop: 12,
                backgroundColor: M3.colors.secondaryContainer,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: M3.colors.secondary,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Feather name="list" size={16} color={M3.colors.secondary} />
              <Text style={{ color: M3.colors.secondary, fontSize: 13, fontFamily: "DMSans_700Bold" }}>
                Use {selectedDayType} Template ({templateExerciseCount} exercises)
              </Text>
            </TouchableOpacity>
          )}
        </Card>
      )}
    </>
  );
}
