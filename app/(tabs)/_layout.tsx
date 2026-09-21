import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { M3 } from "../../design-system/tokens";
import { PressableScale } from "../../components/ui/PressableScale";

type IconName = React.ComponentProps<typeof Feather>["name"];

function Item({ name, label, focused }: { name: IconName; label: string; focused: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <View style={{
        minWidth: 42, height: 30, paddingHorizontal: 9, borderRadius: M3.shape.full,
        alignItems: "center", justifyContent: "center",
        backgroundColor: focused ? M3.colors.primaryContainer : "transparent",
      }}>
        <Feather name={name} size={22} color={focused ? M3.colors.primary : M3.colors.onSurfaceVariant} />
      </View>
      <Text style={{
        marginTop: 2, fontSize: 12, lineHeight: 15, textAlign: "center",
        fontFamily: focused ? "DMSans_700Bold" : "DMSans_500Medium",
        color: focused ? M3.colors.primary : M3.colors.onSurfaceVariant,
      }}>{label}</Text>
    </View>
  );
}

function LogAction() {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Log food"
      onPress={() => router.push("/modals/log-food")}
      haptic
      style={{
        width: 48, height: 48, borderRadius: 24, marginTop: -18,
        backgroundColor: M3.colors.primary, alignItems: "center", justifyContent: "center",
        borderWidth: 4, borderColor: M3.colors.background,
      }}
    >
      <Feather name="plus" size={26} color={M3.colors.onPrimary} />
    </PressableScale>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8) + 8;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute", left: 12, right: 12, bottom,
          height: 72, paddingTop: 5, paddingBottom: 4,
          backgroundColor: M3.colors.surfaceContainer,
          borderTopWidth: 0, borderWidth: 1, borderColor: M3.colors.outline,
          borderRadius: M3.shape.extraLarge,
          shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 }, elevation: 10,
        },
        tabBarItemStyle: { height: 62, paddingVertical: 2 },
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <Item name="home" label="Today" focused={focused} /> }} />
      <Tabs.Screen name="workout" options={{ tabBarIcon: ({ focused }) => <Item name="activity" label="Train" focused={focused} /> }} />
      <Tabs.Screen name="nutrition" options={{ tabBarButton: () => <LogAction /> }} />
      <Tabs.Screen name="progress" options={{ tabBarIcon: ({ focused }) => <Item name="trending-up" label="Progress" focused={focused} /> }} />
      <Tabs.Screen name="coach" options={{ tabBarIcon: ({ focused }) => <Item name="message-circle" label="Coach" focused={focused} /> }} />
      <Tabs.Screen name="more" options={{ href: null }} />
    </Tabs>
  );
}
