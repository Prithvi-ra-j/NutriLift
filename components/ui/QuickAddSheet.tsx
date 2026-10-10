import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { M3 } from "../../design-system/tokens";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

interface QuickAddSheetProps {
  visible: boolean;
  onClose: () => void;
}

type QuickAction = {
  label: string;
  description: string;
  icon: FeatherIconName;
  onSelect: () => void;
};

export function QuickAddSheet({ visible, onClose }: QuickAddSheetProps) {
  const navigate = (path: string) => {
    onClose();
    router.push(path as never);
  };

  const actions: QuickAction[] = [
    {
      label: "Describe food",
      description: "Type what you ate",
      icon: "edit-3",
      onSelect: () => navigate("/modals/log-food"),
    },
    {
      label: "Voice log",
      description: "Speak your meal",
      icon: "mic",
      onSelect: () => navigate("/modals/voice-input"),
    },
    {
      label: "Scan barcode",
      description: "Look up packaged food",
      icon: "maximize",
      onSelect: () => navigate("/modals/barcode-scanner"),
    },
    {
      label: "Workout",
      description: "Open today's session",
      icon: "activity",
      onSelect: () => navigate("/(tabs)/workout"),
    },
    {
      label: "Body weight",
      description: "Log a measurement",
      icon: "trending-up",
      onSelect: () => navigate("/(tabs)/more?section=body"),
    },
    {
      label: "Recovery",
      description: "Sleep, energy and soreness",
      icon: "moon",
      onSelect: () => navigate("/(tabs)/more?section=recovery"),
    },
    {
      label: "Supplements",
      description: "Track today's intake",
      icon: "package",
      onSelect: () => navigate("/(tabs)/more?section=supplements"),
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close quick log"
          onPress={onClose}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.62)",
          }}
        />
        <View
          style={{
            backgroundColor: M3.colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderWidth: 1,
            borderColor: M3.colors.outline,
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 28,
            gap: 18,
          }}
        >
          <View style={{ alignItems: "center", paddingBottom: 2 }}>
            <View style={{ width: 38, height: 4, borderRadius: 99, backgroundColor: M3.colors.outlineVariant }} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: M3.colors.onSurface, fontSize: 21, fontFamily: "DMSans_700Bold", letterSpacing: -0.5 }}>
                Quick log
              </Text>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                Add to your day without losing your place
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close quick log"
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: M3.colors.surfaceContainer, alignItems: "center", justifyContent: "center" }}
            >
              <Feather name="x" size={17} color={M3.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.label}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                activeOpacity={0.78}
                onPress={action.onSelect}
                style={{
                  width: "48%",
                  minHeight: 96,
                  flexGrow: 1,
                  flexBasis: "44%",
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: M3.colors.outline,
                  backgroundColor: M3.colors.surfaceVariant,
                  padding: 13,
                  gap: 10,
                }}
              >
                <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: M3.colors.primaryContainer, alignItems: "center", justifyContent: "center" }}>
                  <Feather name={action.icon} size={16} color={M3.colors.primary} />
                </View>
                <View style={{ gap: 3 }}>
                  <Text style={{ color: M3.colors.onSurface, fontSize: 13, fontFamily: "DMSans_700Bold" }}>
                    {action.label}
                  </Text>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 10, fontFamily: "DMSans_400Regular", lineHeight: 14 }}>
                    {action.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
