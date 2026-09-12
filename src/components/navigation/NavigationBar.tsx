import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { NavigationBarProps } from '../../core/types/component';

export const NavigationBar = React.forwardRef<View, NavigationBarProps>(
  ({ items, activeKey, onItemPress }, ref) => {
    const { tokens } = useTheme();
    const { colors, spacing } = tokens;

    return (
      <View
        ref={ref}
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          backgroundColor: colors.surface,
          height: 80,
          elevation: 8,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          paddingBottom: spacing.sm, // Assuming safe area logic handles bottom notch separately or via a wrapper
        }}
      >
        {items.slice(0, 5).map((item) => {
          const isActive = item.key === activeKey;
          
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => onItemPress(item.key)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: spacing.sm,
              }}
            >
              <View
                style={{
                  paddingHorizontal: spacing.xl,
                  paddingVertical: spacing.xs,
                  borderRadius: 16,
                  backgroundColor: isActive ? colors.secondaryContainer : 'transparent',
                  marginBottom: 4,
                }}
              >
                {/* Icon wrapper */}
                <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                  
                  {/* Badge */}
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
    );
  }
);

NavigationBar.displayName = 'NavigationBar';
export default NavigationBar;
