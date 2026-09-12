import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ListRenderItemInfo,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface ListItemData {
  id: string;
  title: string;
  description?: string;
  tertiaryText?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
}

export interface ListProps {
  data: ListItemData[];
  lines?: 1 | 2 | 3;
  showDividers?: boolean;
  contentContainerStyle?: ViewStyle;
}

/**
 * Material Design 3 List Component
 * 
 * Lists are continuous, vertical indexes of text or images.
 */
export const List: React.FC<ListProps> = ({
  data,
  lines = 1,
  showDividers = false,
  contentContainerStyle,
}) => {
  const { tokens } = useTheme();
  const colors = tokens.colors;
  const spacing = tokens.spacing;
  const typography = tokens.typography;

  const styles = useMemo(() => {
    return {
      container: {
        backgroundColor: colors.surface,
      } as ViewStyle,
      itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: lines === 1 ? spacing.sm : spacing.md,
        minHeight: lines === 1 ? 56 : lines === 2 ? 72 : 88,
      } as ViewStyle,
      contentContainer: {
        flex: 1,
        justifyContent: 'center',
      } as ViewStyle,
      leadingContainer: {
        marginRight: spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
      } as ViewStyle,
      trailingContainer: {
        marginLeft: spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
      } as ViewStyle,
      title: {
        ...typography.body.large,
        color: colors.onSurface,
      } as TextStyle,
      description: {
        ...typography.body.medium,
        color: colors.onSurfaceVariant,
        marginTop: 2,
      } as TextStyle,
      tertiaryText: {
        ...typography.body.small,
        color: colors.onSurfaceVariant,
        marginTop: 2,
      } as TextStyle,
      divider: {
        height: 1,
        backgroundColor: colors.outlineVariant,
        marginLeft: spacing.md,
      } as ViewStyle,
    };
  }, [colors, spacing, typography, lines]);

  const renderItem = ({ item, index }: ListRenderItemInfo<ListItemData>) => {
    const isLast = index === data.length - 1;
    
    const content = (
      <>
        <View
          style={[
            styles.itemContainer,
            { backgroundColor: 'transparent' }
          ]}
        >
          {item.leading && (
            <View style={styles.leadingContainer}>{item.leading}</View>
          )}
          
          <View style={styles.contentContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            
            {lines >= 2 && item.description && (
              <Text style={styles.description} numberOfLines={1}>
                {item.description}
              </Text>
            )}
            
            {lines >= 3 && item.tertiaryText && (
              <Text style={styles.tertiaryText} numberOfLines={1}>
                {item.tertiaryText}
              </Text>
            )}
          </View>
          
          {item.trailing && (
            <View style={styles.trailingContainer}>{item.trailing}</View>
          )}
        </View>
        {showDividers && !isLast && <View style={styles.divider} />}
      </>
    );

    if (item.onPress) {
      return (
        <Pressable
          onPress={item.onPress}
          style={({ pressed }) => [
            {
              backgroundColor: pressed 
                ? colors.onSurface + '1A' 
                : 'transparent'
            }
          ]}
          accessibilityRole="button"
        >
          {content}
        </Pressable>
      );
    }

    return <View>{content}</View>;
  };

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      style={styles.container}
      contentContainerStyle={contentContainerStyle}
      accessibilityRole="list"
    />
  );
};

List.displayName = 'List';

export default List;
