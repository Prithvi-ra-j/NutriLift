import React, { useRef, useEffect } from 'react';
import { View, Pressable, Text, ScrollView, Animated } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { TabsProps } from '../../core/types/component';

export const Tabs = React.forwardRef<View, TabsProps>(
  ({ tabs, activeKey, onTabPress, variant = 'primary', scrollable = false }, ref) => {
    const { tokens } = useTheme();
    const { colors, spacing } = tokens;

    // Simple implementation without complex layout measurement for indicator
    // A robust version would measure tab widths and animate a shared indicator
    
    const content = tabs.map((tab) => {
      const isActive = tab.key === activeKey;
      
      return (
        <Pressable
          key={tab.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: isActive }}
          onPress={() => onTabPress(tab.key)}
          style={{
            flex: scrollable ? undefined : 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing.lg,
            height: 48,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {tab.icon && <View style={{ marginRight: spacing.sm }}>{tab.icon}</View>}
            <Text
              style={{
                color: isActive ? colors.primary : colors.onSurfaceVariant,
                fontWeight: isActive ? '600' : '500',
                fontSize: 14,
              }}
            >
              {tab.label}
            </Text>
          </View>
          
          {/* Indicator */}
          {isActive && (
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: variant === 'primary' ? spacing.md : 0,
                right: variant === 'primary' ? spacing.md : 0,
                height: variant === 'primary' ? 3 : 2,
                backgroundColor: colors.primary,
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3,
              }}
            />
          )}
        </Pressable>
      );
    });

    return (
      <View
        ref={ref}
        accessibilityRole="tablist"
        style={{
          borderBottomWidth: 1,
          borderBottomColor: colors.surfaceVariant,
          backgroundColor: colors.surface,
        }}
      >
        {scrollable ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ alignItems: 'center' }}
          >
            {content}
          </ScrollView>
        ) : (
          <View style={{ flexDirection: 'row', width: '100%' }}>
            {content}
          </View>
        )}
      </View>
    );
  }
);

Tabs.displayName = 'Tabs';
export default Tabs;
