import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  Dimensions,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Pressable,
  Platform,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { TooltipProps } from '../../core/types/component';

/**
 * Material Design 3 Tooltip Component
 * 
 * Tooltips display informative text when users hover over, focus on, or long press an element.
 * 
 * @example
 * <Tooltip text="Save document" position="top">
 *   <IconButton icon="save" />
 * </Tooltip>
 */
export const Tooltip: React.FC<TooltipProps> = ({
  children,
  text,
  position = 'bottom',
}) => {
  const { tokens } = useTheme();
  const colors = tokens.colors;
  const spacing = tokens.spacing;
  const typography = tokens.typography;

  const [visible, setVisible] = useState(false);
  const anchorRef = useRef<View>(null);
  const [anchorLayout, setAnchorLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });

  const opacity = useRef(new Animated.Value(0)).current;

  const showTooltip = () => {
    if (anchorRef.current) {
      anchorRef.current.measureInWindow((x, y, width, height) => {
        setAnchorLayout({ x, y, width, height });
        setVisible(true);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const hideTooltip = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  };

  const getPosition = () => {
    const window = Dimensions.get('window');
    const { x, y, width: anchorWidth, height: anchorHeight } = anchorLayout;
    const { width: ttWidth, height: ttHeight } = tooltipSize;
    const gap = 4; // Distance between anchor and tooltip

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = y - ttHeight - gap;
        left = x + anchorWidth / 2 - ttWidth / 2;
        break;
      case 'bottom':
        top = y + anchorHeight + gap;
        left = x + anchorWidth / 2 - ttWidth / 2;
        break;
      case 'left':
        top = y + anchorHeight / 2 - ttHeight / 2;
        left = x - ttWidth - gap;
        break;
      case 'right':
        top = y + anchorHeight / 2 - ttHeight / 2;
        left = x + anchorWidth + gap;
        break;
    }

    // Adjust for screen boundaries
    if (top < spacing.md) top = spacing.md;
    if (left < spacing.md) left = spacing.md;
    if (top + ttHeight > window.height - spacing.md) top = window.height - ttHeight - spacing.md;
    if (left + ttWidth > window.width - spacing.md) left = window.width - ttWidth - spacing.md;

    return { top, left };
  };

  const styles = useMemo(() => {
    const tooltipContainer: ViewStyle = {
      position: 'absolute',
      backgroundColor: colors.onSurface,
      borderRadius: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      maxWidth: 200,
    };

    const tooltipText: TextStyle = {
      ...typography.label.small,
      color: colors.surface,
      textAlign: 'center',
    };

    return {
      tooltipContainer,
      tooltipText,
    };
  }, [colors, spacing, typography]);

  return (
    <>
      <Pressable
        ref={anchorRef}
        onHoverIn={Platform.OS === 'web' ? showTooltip : undefined}
        onHoverOut={Platform.OS === 'web' ? hideTooltip : undefined}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onLongPress={showTooltip}
        onPressOut={hideTooltip}
        delayLongPress={500}
        accessibilityRole="button"
        accessibilityHint={text}
      >
        {children}
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={hideTooltip}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={hideTooltip}
          accessible={false}
        >
          <Animated.View
            style={[
              styles.tooltipContainer,
              getPosition(),
              { opacity },
            ]}
            onLayout={(e) => {
              setTooltipSize({
                width: e.nativeEvent.layout.width,
                height: e.nativeEvent.layout.height,
              });
            }}
            pointerEvents="none"
          >
            <Text style={styles.tooltipText}>{text}</Text>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
};

Tooltip.displayName = 'Tooltip';

export default Tooltip;
