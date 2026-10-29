import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import type { MonthlyReport } from "../../lib/data/types";
import { Card } from "../ui/Card";
import { M3 } from "../../design-system/tokens";

export function ReportsSection({ reports }: { reports: MonthlyReport[] }) {
  return (
    <>
      <TouchableOpacity
        onPress={() => router.push("/modals/monthly-report")}
        activeOpacity={0.75}
        style={{
          backgroundColor: M3.colors.primaryContainer,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: M3.colors.primary + "44",
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Feather name="file-text" size={20} color={M3.colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: M3.colors.primary, fontSize: 15, fontFamily: "DMSans_700Bold" }}>
            Generate Monthly Report
          </Text>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
            AI-powered analysis of your month
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={M3.colors.primary} />
      </TouchableOpacity>
      {reports.length > 0 ? (
        reports.map((report) => (
          <Card key={report.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ color: M3.colors.onSurface, fontSize: 15, fontFamily: "DMSans_700Bold" }}>
                  {report.month}
                </Text>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 2 }}>
                  Generated {new Date(report.generated_at * 1000).toLocaleDateString()}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={M3.colors.onSurfaceMuted} />
            </View>
          </Card>
        ))
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 13, fontFamily: "DMSans_400Regular" }}>
            No reports generated yet
          </Text>
        </View>
      )}
    </>
  );
}
