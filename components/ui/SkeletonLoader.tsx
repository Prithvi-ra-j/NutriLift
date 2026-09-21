import { useEffect, useRef } from "react";
import { View, Animated, type ViewStyle } from "react-native";
import { M3 } from "../../design-system/tokens";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = M3.shape.small, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: M3.colors.surfaceContainer,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function CardSkeleton() {
  return (
    <View
      style={{
        backgroundColor: M3.colors.surface,
        borderRadius: M3.shape.medium,
        borderWidth: 1,
        borderColor: M3.colors.surfaceContainer,
        padding: M3.spacing.lg,
        gap: 12, // Updated to 4pt grid
      }}
    >
      <Skeleton height={20} width="60%" />
      <Skeleton height={14} width="90%" />
      <Skeleton height={14} width="75%" />
    </View>
  );
}
