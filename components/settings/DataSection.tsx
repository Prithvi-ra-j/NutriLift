import { Text } from "react-native";
import { Button } from "../ui/Button";
import { ListRow } from "../ui/ListRow";
import { M3 } from "../../design-system/tokens";

interface DataSectionProps {
  isExportingFixture: boolean;
  isWeb: boolean;
  onExportData: () => void;
  onExportFixture: () => void;
  onExportPdf: (period: PdfExportPeriod) => void;
  onRepair: () => void;
  onShareLogs: () => void;
}

export type PdfExportPeriod = "last30Days" | "currentMonth" | "allData";

export function DataSection({
  isExportingFixture,
  isWeb,
  onExportData,
  onExportFixture,
  onExportPdf,
  onRepair,
  onShareLogs,
}: DataSectionProps) {
  return (
    <>
      <ListRow
        icon="refresh-cw"
        title="Repair derived data"
        subtitle="Recalculate daily totals and personal records from active logs"
        onPress={onRepair}
      />
      <ListRow
        icon="database"
        title="Export all data"
        subtitle="Share a JSON backup of every local table"
        onPress={onExportData}
      />
      <ListRow
        icon="share-2"
        title="Share logs"
        subtitle="Share the latest local application log"
        onPress={onShareLogs}
      />
      <Button
        label="Export sanitized migration fixture"
        icon="shield"
        variant="secondary"
        loading={isExportingFixture}
        disabled={isExportingFixture || isWeb}
        onPress={onExportFixture}
      />
      <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 6 }}>
        Creates a generic v0 SQL fixture from populated table categories. Your live data is not changed or included.
      </Text>
      <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_700Bold", marginTop: 8 }}>
        Export progress PDF
      </Text>
      <ListRow
        icon="download"
        title="Last 30 days"
        onPress={() => onExportPdf("last30Days")}
      />
      <ListRow
        icon="download"
        title="Current month"
        onPress={() => onExportPdf("currentMonth")}
      />
      <ListRow
        icon="download"
        title="All data"
        onPress={() => onExportPdf("allData")}
      />
      <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 11, fontFamily: "DMSans_400Regular", textAlign: "center", paddingVertical: 16 }}>
        NutriLift v1.0 · Local-first fitness tracking
      </Text>
    </>
  );
}
