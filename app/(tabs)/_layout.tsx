import { Tabs } from "expo-router";
import { View, Text, Platform } from "react-native";
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
        paddingTop: 8,
        gap: 4,
        width: 64,
      }}
    >
      {/* M3 active indicator pill */}
      <View
        style={{
          width: 64,
          height: 32,
          borderRadius: M3.shape.full,
          backgroundColor: focused ? M3.colors.primaryContainer : "transparent",
          alignItems: "center",
          justifyContent: "center",
          // Smooth layout without animation lib
          overflow: "hidden",
        }}
      >
        <Feather
          name={name}
          size={20}
          color={focused ? M3.colors.primary : M3.colors.onSurfaceVariant}
        />
      </View>

      {/* Label — always visible per M3 nav bar spec */}
      <Text
        style={{
          fontSize: 10,
          color: focused ? M3.colors.primary : M3.colors.onSurfaceVariant,
          fontFamily: focused ? "DMSans_700Bold" : "DMSans_500Medium",
          textAlign: "center",
          letterSpacing: 0.4,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: M3.colors.surfaceContainer,
          borderTopColor: M3.colors.outline,
          borderTopWidth: 1,
          // M3 nav bar: 80px on Android, taller on iOS to account for home indicator
          height: Platform.OS === "ios" ? 88 : 80,
          paddingBottom: Platform.OS === "ios" ? 24 : 8,
          paddingTop: 8,
          // Subtle elevation via shadow
          shadowColor: M3.colors.primary,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
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
