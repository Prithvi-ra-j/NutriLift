import { useRef, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type PressableScaleProps = Omit<PressableProps, "children" | "style"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale applied while the control is pressed. Defaults to 0.98. */
  pressedScale?: number;
  /** Animation duration in milliseconds. Defaults to 90ms. */
  duration?: number;
};

/**
 * Accessible pressable primitive with a restrained native scale response.
 *
 * This stays presentation-only: callers own actions and domain mutations.
 * The animated value remains stable across presses to avoid animation state
 * being recreated on every render.
 */
export function PressableScale({
  children,
  style,
  pressedScale = 0.98,
  duration = 90,
  disabled = false,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.timing(scale, {
      toValue: value,
      duration,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        {...props}
        disabled={disabled}
        onPressIn={(event) => {
          animateTo(pressedScale);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animateTo(1);
          onPressOut?.(event);
        }}
        style={({ pressed }) => ({
          opacity: disabled ? 0.45 : pressed ? 0.94 : 1,
        })}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
