import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { MenuProps, MenuItem } from '../../core/types/component';

/**
 * Material Design 3 Menu Component
 * 
 * @example
 * <Menu
 *   visible={visible}
 *   onDismiss={() => setVisible(false)}
 *   anchor={<Button onPress={() => setVisible(true)}>Show Menu</Button>}
 *   items={[
 *     { key: '1', label: 'Item 1', onPress: () => console.log('Item 1') },
 *     { key: '2', label: 'Item 2', onPress: () => console.log('Item 2') },
 *   ]}
 * />
 */
export const Menu: React.FC<MenuProps> = React.memo(({
  visible,
  onDismiss,
  items,
  anchor,
}) => {
  const { tokens } = useTheme();
  const colors = tokens.colors;
  const spacing = tokens.spacing;
  const typography = tokens.typography;

  const anchorRef = useRef<View>(null);
  const [anchorLayout, setAnchorLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [menuHeight, setMenuHeight] = useState(0);
  const [menuWidth, setMenuWidth] = useState(0);

  // Animation values
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  // Measure anchor on mount and visibility change
  const updateLayout = useCallback(() => {
    if (anchorRef.current && visible) {
      anchorRef.current.measureInWindow((x, y, width, height) => {
        setAnchorLayout({ x, y, width, height });
      });
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      updateLayout();
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, scale, updateLayout]);

  const window = Dimensions.get('window');

  // Calculate menu position to avoid screen edges
  const getMenuPosition = () => {
    let top = anchorLayout.y + anchorLayout.height;
    let left = anchorLayout.x;

    // Adjust if menu goes off screen vertically
    if (top + menuHeight > window.height - 24) {
      top = anchorLayout.y - menuHeight;
    }

    // Adjust if menu goes off screen horizontally
    if (left + menuWidth > window.width - 24) {
      left = anchorLayout.x + anchorLayout.width - menuWidth;
    }

    // Ensure it doesn't go off top/left edges
    top = Math.max(spacing.md, top);
    left = Math.max(spacing.md, left);

    return { top, left };
  };

  const handleItemPress = (item: MenuItem) => {
    onDismiss();
    // Allow dismissal animation to start before executing action
    setTimeout(() => {
      item.onPress();
    }, 100);
  };

  const styles = useMemo(() => {
    const overlayStyle: ViewStyle = {
      flex: 1,
    };

    const menuContainerStyle: ViewStyle = {
      position: 'absolute',
      backgroundColor: colors.surface,
      borderRadius: 4,
      paddingVertical: spacing.sm,
      minWidth: 112,
      maxWidth: 280,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    };

    const itemStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      minHeight: 48,
    };

    const textStyle: TextStyle = {
      ...typography.label.large,
      color: colors.onSurface,
      flex: 1,
    };

    const iconContainerStyle: ViewStyle = {
      marginRight: spacing.md,
      width: 24,
      alignItems: 'center',
      justifyContent: 'center',
    };

    return {
      overlay: overlayStyle,
      menuContainer: menuContainerStyle,
      item: itemStyle,
      text: textStyle,
      iconContainer: iconContainerStyle,
    };
  }, [colors, spacing, typography]);

  return (
    <>
      <View
        ref={anchorRef}
        onLayout={updateLayout}
        collapsable={false}
      >
        {anchor}
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onDismiss}
      >
        <Pressable
          style={styles.overlay}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
        >
          <Animated.View
            style={[
              styles.menuContainer,
              getMenuPosition(),
              {
                opacity,
                transform: [{ scale }],
              },
            ]}
            onLayout={(e) => {
              setMenuHeight(e.nativeEvent.layout.height);
              setMenuWidth(e.nativeEvent.layout.width);
            }}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
            accessibilityRole="menu"
            accessible
          >
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {items.map((item, index) => (
                <Pressable
                  key={item.key}
                  style={({ pressed }) => [
                    styles.item,
                    {
                      backgroundColor:
                        pressed
                          ? colors.onSurface + '1A' // 10% opacity
                          : 'transparent',
                    },
                  ]}
                  onPress={() => handleItemPress(item)}
                  accessibilityRole="menuitem"
                >
                  {item.icon && (
                    <View style={styles.iconContainer}>{item.icon}</View>
                  )}
                  <Text style={styles.text} numberOfLines={1}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
});

Menu.displayName = 'Menu';

export default Menu;
