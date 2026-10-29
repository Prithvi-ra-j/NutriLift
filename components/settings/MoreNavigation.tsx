import { Feather } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { ListRow } from "../ui/ListRow";
import { ScreenHeader } from "../ui/ScreenHeader";
import { M3 } from "../../design-system/tokens";
import type { MoreSection, MoreSectionIcon } from "./moreUiReducer";

interface MoreNavigationProps {
  activeSection: MoreSection;
  sections: { key: MoreSection; label: string; icon: MoreSectionIcon }[];
  onNavigate: (section: MoreSection) => void;
}

export function MoreNavigation({
  activeSection,
  sections,
  onNavigate,
}: MoreNavigationProps) {
  return (
    <>
      {activeSection === "menu" ? (
        <ScreenHeader title="MORE" subtitle="Settings, reports, and more" />
      ) : (
        <View style={{ marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => onNavigate("menu")}
            style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
          >
            <Feather name="chevron-left" size={20} color={M3.colors.primary} />
            <Text
              style={{
                color: M3.colors.primary,
                fontSize: 15,
                fontFamily: "DMSans_700Bold",
                marginLeft: 4,
              }}
            >
              Menu
            </Text>
          </TouchableOpacity>
          <ScreenHeader
            title={sections.find((section) => section.key === activeSection)?.label.toUpperCase() ?? "MORE"}
            subtitle=""
          />
        </View>
      )}
      {activeSection === "menu" ? (
        <View style={{ gap: 8 }}>
          {sections.map((section) => (
            <ListRow
              key={section.key}
              icon={section.icon}
              title={section.label}
              onPress={() => onNavigate(section.key)}
            />
          ))}
        </View>
      ) : null}
    </>
  );
}
