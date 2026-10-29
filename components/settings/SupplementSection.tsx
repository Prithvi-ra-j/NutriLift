import { Feather } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import type { SupplementLog } from "../../lib/data/types";
import { Card } from "../ui/Card";
import { M3 } from "../../design-system/tokens";

interface SupplementSectionProps {
  logs: SupplementLog[];
  onToggle: (name: string, taken: boolean) => void;
}

export function SupplementSection({ logs, onToggle }: SupplementSectionProps) {
  const names = [...new Set(logs.map((log) => log.supplement_name))];
  return (
    <Card>
      <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_500Medium", marginBottom: 12, letterSpacing: 0.5 }}>
        TODAY'S SUPPLEMENTS
      </Text>
      {names.length === 0 ? (
        <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 13, fontFamily: "DMSans_400Regular" }}>
          No supplements have been logged today.
        </Text>
      ) : names.map((name) => {
        const taken = logs.find((log) => log.supplement_name === name)?.taken === 1;
        return (
          <View key={name} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: M3.colors.outline, gap: 12 }}>
            <TouchableOpacity
              onPress={() => onToggle(name, taken)}
              activeOpacity={0.75}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: taken ? M3.colors.successContainer : M3.colors.surfaceVariant,
                borderWidth: 2,
                borderColor: taken ? M3.colors.success : M3.colors.outline,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {taken && <Feather name="check" size={20} color={M3.colors.success} />}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: taken ? M3.colors.onSurface : M3.colors.onSurfaceVariant, fontSize: 14, fontFamily: "DMSans_500Medium" }}>
                {name}
              </Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}
