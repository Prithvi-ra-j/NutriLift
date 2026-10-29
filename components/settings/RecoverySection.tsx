import { Feather } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { M3 } from "../../design-system/tokens";

interface RecoverySectionProps {
  energyLevel: number;
  notes: string;
  onEnergyChange: (value: number) => void;
  onNotesChange: (value: string) => void;
  onSave: () => void;
  onSleepChange: (value: string) => void;
  onSleepQualityChange: (value: number) => void;
  onSorenessChange: (value: number) => void;
  onStressChange: (value: number) => void;
  saved: boolean;
  sleepDuration: string;
  sleepQuality: number;
  soreness: number;
  stressLevel: number;
}

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>{label}</Text>
        <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_700Bold" }}>{value} / 5</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <TouchableOpacity
            key={rating}
            onPress={() => onChange(rating)}
            activeOpacity={0.7}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 6,
              backgroundColor: value >= rating ? M3.colors.primary + "22" : M3.colors.surfaceVariant,
              borderWidth: 1,
              borderColor: value >= rating ? M3.colors.primary : M3.colors.outline,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: value >= rating ? M3.colors.primary : M3.colors.onSurfaceMuted, fontSize: 13, fontFamily: "DMSans_700Bold" }}>
              {rating}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export function RecoverySection({
  energyLevel,
  notes,
  onEnergyChange,
  onNotesChange,
  onSave,
  onSleepChange,
  onSleepQualityChange,
  onSorenessChange,
  onStressChange,
  saved,
  sleepDuration,
  sleepQuality,
  soreness,
  stressLevel,
}: RecoverySectionProps) {
  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 }}>
          RECOVERY LOG
        </Text>
        {saved && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Feather name="check-circle" size={12} color={M3.colors.success} />
            <Text style={{ color: M3.colors.success, fontSize: 11, fontFamily: "DMSans_400Regular" }}>Saved</Text>
          </View>
        )}
      </View>
      <View style={{ marginBottom: 14 }}>
        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
          Sleep Duration (hours)
        </Text>
        <Input
          value={sleepDuration}
          onChangeText={onSleepChange}
          keyboardType="decimal-pad"
          placeholder="7.5"
          style={{ backgroundColor: M3.colors.surfaceVariant, fontSize: 16, fontFamily: "BebasNeue_400Regular" }}
        />
      </View>
      <RatingRow label="Sleep Quality" value={sleepQuality} onChange={onSleepQualityChange} />
      <RatingRow label="Energy Level" value={energyLevel} onChange={onEnergyChange} />
      <RatingRow label="Muscle Soreness" value={soreness} onChange={onSorenessChange} />
      <RatingRow label="Stress Level" value={stressLevel} onChange={onStressChange} />
      <View style={{ marginBottom: 14 }}>
        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
          Notes (optional)
        </Text>
        <Input
          value={notes}
          onChangeText={onNotesChange}
          placeholder="How are you feeling?"
          multiline
          numberOfLines={3}
          style={{ backgroundColor: M3.colors.surfaceVariant, textAlignVertical: "top", minHeight: 80 }}
        />
      </View>
      <Button label="Save Recovery Log" onPress={onSave} />
    </Card>
  );
}
