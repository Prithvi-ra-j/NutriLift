import React, { useEffect, useRef } from 'react';
import { View, Pressable, Animated, Dimensions, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { DrawerProps } from '../../core/types/component';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 360);

export const Drawer = React.forwardRef<View, DrawerProps>(
  ({ visible, onClose, modal = true, header, children }, ref) => {
    const { tokens } = useTheme();
    const { colors, spacing } = tokens;

    const slideAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;

    useEffect(() => {
      Animated.timing(slideAnim, {
        toValue: visible ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }, [visible, slideAnim]);

    const translateX = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-DRAWER_WIDTH, 0],
    });

    const backdropOpacity = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.4],
    });

    if (!visible && !modal) return null;

    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          { zIndex: 100 },
          !visible && { width: 0, height: 0, overflow: 'hidden' }, // Hide when closed to prevent interaction
        ]}
      >
        {/* Scrim/Backdrop */}
        {modal && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: '#000', opacity: backdropOpacity },
            ]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>
        )}

        {/* Drawer content */}
        <Animated.View
          ref={ref as any}
          accessibilityRole="menu"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: DRAWER_WIDTH,
            backgroundColor: colors.surface,
            borderTopRightRadius: 16,
            borderBottomRightRadius: 16,
            transform: [{ translateX }],
            elevation: 16,
            shadowColor: colors.shadow,
            shadowOffset: { width: 4, height: 0 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            padding: spacing.md,
          }}
        >
          {header && <View style={{ marginBottom: spacing.md }}>{header}</View>}
          <View style={{ flex: 1 }}>{children}</View>
        </Animated.View>
      </View>
    );
  }
);

Drawer.displayName = 'Drawer';
export default Drawer;
