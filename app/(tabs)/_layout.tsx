import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

interface TabIconProps {
  name: FeatherIconName;
  focused: boolean;
  label: string;
}

function TabIcon({ name, focused, label }: TabIconProps) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 6, gap: 3, width: 60 }}>
      <Feather
        name={name}
        size={20}
        color={focused ? "#00D4AA" : "#8080A0"}
      />
      <Text
        style={{
          fontSize: 9,
          color: focused ? "#00D4AA" : "#8080A0",
          fontFamily: "DMSans_500Medium",
          textAlign: "center",
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
          backgroundColor: "#12121A",
          borderTopColor: "#252535",
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 6,
          paddingTop: 2,
        },
        tabBarShowLabel: false,
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
