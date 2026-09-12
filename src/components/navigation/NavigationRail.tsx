import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { NavigationRailProps } from '../../core/types/component';

export const NavigationRail = React.forwardRef<View, NavigationRailProps>(
  ({ items, activeKey, onItemPress, floating = false }, ref) => {
    const { tokens } = useTheme();
    const { colors, spacing } = tokens;

    return (
      <View
        ref={ref}
        accessibilityRole="tablist"
        style={{
          width: 80,
          backgroundColor: colors.surface,
          alignItems: 'center',
          paddingTop: spacing.xl,
          paddingBottom: spacing.xl,
          ...(floating ? {
            borderRadius: 16,
            elevation: 4,
            shadowColor: colors.shadow,
            shadowOffset: { width: 2, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            margin: spacing.md,
          } : {
            borderRightWidth: 1,
            borderRightColor: colors.outlineVariant,
          }),
        }}
      >
        <View style={{ flex: 1, width: '100%' }}>
          {items.map((item) => {
            const isActive = item.key === activeKey;
            
            return (
              <Pressable
                key={item.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                onPress={() => onItemPress(item.key)}
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: spacing.md,
                  width: '100%',
                }}
              >
                <View
                  style={{
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.xs,
                    borderRadius: 16,
                    backgroundColor: isActive ? colors.secondaryContainer : 'transparent',
                    marginBottom: 4,
                  }}
                >
                  <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                    {item.icon}
                    
                    {item.badge !== undefined && (
                      <View
                        style={{
                          position: 'absolute',
                          top: -4,
                          right: -10,
                          backgroundColor: colors.error,
                          borderRadius: 8,
                          minWidth: 16,
                          height: 16,
                          justifyContent: 'center',
                          alignItems: 'center',
                          paddingHorizontal: 4,
                        }}
                      >
                        <Text style={{ color: colors.onError, fontSize: 10, fontWeight: 'bold' }}>
                          {item.badge}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    color: isActive ? colors.onSurface : colors.onSurfaceVariant,
                    fontWeight: isActive ? '600' : '400',
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
);

NavigationRail.displayName = 'NavigationRail';
export default NavigationRail;
