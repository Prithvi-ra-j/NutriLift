import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { router } from "expo-router";
import { M3 } from "../../design-system/tokens";

type IconName = React.ComponentProps<typeof Feather>["name"];

const ITEMS: Array<{ route: string; label: string; icon: IconName }> = [
  { route: "index", label: "Today", icon: "home" },
  { route: "workout", label: "Train", icon: "activity" },
  { route: "progress", label: "Progress", icon: "trending-up" },
  { route: "coach", label: "Coach", icon: "message-circle" },
  { route: "more", label: "More", icon: "more-horizontal" },
];

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, Platform.OS === "android" ? 10 : 8) + 8;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <View style={styles.bar}>
        {ITEMS.map((item) => (
          <TabItem key={item.route} item={item} state={state} navigation={navigation} />
        ))}
      </View>
    </View>
  );
}

function TabItem({
  item,
  state,
  navigation,
}: {
  item: (typeof ITEMS)[number];
  state: BottomTabBarProps["state"];
  navigation: BottomTabBarProps["navigation"];
}) {
  const index = state.routes.findIndex((route) => route.name === item.route);
  const focused = state.index === index;

  const onPress = () => {
    const event = navigation.emit({
      type: "tabPress",
      target: state.routes[index]?.key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(item.route);
    }
  };

  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={item.label}
      activeOpacity={0.75}
      onPress={onPress}
      style={styles.item}
    >
      <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
        <Feather
          name={item.icon}
          size={20}
          color={focused ? M3.colors.primary : M3.colors.onSurfaceVariant}
        />
      </View>
      <Text style={[styles.label, focused && styles.labelActive]}>{item.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 14,
    right: 14,
    alignItems: "center",
  },
  bar: {
    width: "100%",
    maxWidth: 430,
    minHeight: 70,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: M3.colors.outline,
    backgroundColor: M3.colors.surfaceContainer,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  item: {
    flex: 1,
    minWidth: 52,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  iconBox: {
    width: 38,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxActive: {
    backgroundColor: M3.colors.primaryContainer,
  },
  label: {
    color: M3.colors.onSurfaceVariant,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: "DMSans_500Medium",
  },
  labelActive: {
    color: M3.colors.primary,
    fontFamily: "DMSans_700Bold",
  },
});
