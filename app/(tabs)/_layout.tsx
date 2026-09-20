import { Tabs } from "expo-router";
import { View, Text, Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../design-system/tokens";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

interface TabIconProps {
  name: FeatherIconName;
  focused: boolean;
  label: string;
}

/**
 * M3 Navigation Bar item.
 *
 * Active state:  pill indicator behind icon (primaryContainer bg) + primary tint
 * Inactive state: icon + label in onSurfaceVariant
 */
function TabIcon({ name, focused, label }: TabIconProps) {
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        height: "100%",
        gap: 3,
      }}
    >
      {/* M3 active indicator pill */}
      <View
        style={{
          width: 44,
          height: 28,
          borderRadius: M3.shape.full,
          backgroundColor: focused ? M3.colors.primaryContainer : "transparent",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Feather
          name={name}
          size={19}
          color={focused ? M3.colors.primary : M3.colors.onSurfaceVariant}
        />
      </View>

      {/* Label — always visible per M3 nav bar spec */}
      <Text
        style={{
          fontSize: 9,
          color: focused ? M3.colors.primary : M3.colors.onSurfaceVariant,
          fontFamily: focused ? "DMSans_700Bold" : "DMSans_500Medium",
          textAlign: "center",
          letterSpacing: 0.2,
        }}
        numberOfLines={1}
        minimumFontScale={0.8}
        adjustsFontSizeToFit
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Cap the bar width on tablets/web so it doesn't stretch edge-to-edge, and keep it centered.
  const isWide = width >= 480;
  const barWidth = isWide ? 420 : undefined;
  const horizontalInset = isWide ? (width - (barWidth as number)) / 2 : 16;
  // Respect the device's own safe area (notch / gesture bar / home indicator) instead of
  // hardcoded platform guesses, so the floating bar sits correctly on every device.
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 12 : 8) + 8;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          left: horizontalInset,
          right: horizontalInset,
          bottom: bottomInset,
          backgroundColor: M3.colors.surfaceContainer,
          borderTopWidth: 0,
          borderRadius: M3.shape.extraLarge,
          borderWidth: 1,
          borderColor: M3.colors.outline,
          // Floating pill nav bar
          height: 68,
          paddingBottom: 0,
          paddingTop: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
          elevation: 12,
        },
        tabBarItemStyle: {
          height: 68,
          paddingVertical: 6,
        },
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" focused={focused} label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="pie-chart" focused={focused} label="Nutrition" />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="zap" focused={focused} label="Workout" />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="message-circle" focused={focused} label="Coach" />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="trending-up" focused={focused} label="Progress" />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="grid" focused={focused} label="More" />
          ),
        }}
      />
    </Tabs>
  );
}
