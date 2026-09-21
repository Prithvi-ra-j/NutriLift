import { Pressable, View, type PressableProps, type ViewStyle, type StyleProp } from "react-native";
import { useEffect } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { impactLight } from "../../lib/haptics";
import { M3 } from "../../design-system/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  scale?: number;
}

export function PressableScale({ children, style, haptic = false, scale = 0.96, onPressIn, onPressOut, disabled, ...props }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(progress.value ? scale : 1, { damping: 18, stiffness: 280 }) }],
  }));

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        progress.value = 1;
        if (haptic) impactLight();
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        progress.value = 0;
        onPressOut?.(event);
      }}
      style={[animatedStyle, { minHeight: 40, minWidth: 40 }, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
