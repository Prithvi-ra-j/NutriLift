import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Checkbox } from '../basic/Checkbox';

export interface DataColumn<T> {
  id: string;
  label: string;
  numeric?: boolean;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  selectable?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  onSort?: (columnId: string, ascending: boolean) => void;
}

export const DataTable = <T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  selectable = false,
  onSelectionChange,
  onSort,
}: DataTableProps<T>) => {
  const { tokens } = useTheme();
  const colors = tokens.colors;
  const spacing = tokens.spacing;
  const typography = tokens.typography;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ id: string; asc: boolean } | null>(null);

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
    onSelectionChange?.(Array.from(next));
  };

  const toggleAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    } else {
      const allIds = new Set(data.map(keyExtractor));
      setSelectedIds(allIds);
      onSelectionChange?.(Array.from(allIds));
    }
  };

  const handleSort = (columnId: string) => {
    let asc = true;
    if (sortConfig?.id === columnId) {
      asc = !sortConfig.asc;
    }
    setSortConfig({ id: columnId, asc });
    onSort?.(columnId, asc);
  };

  const styles = useMemo(() => {
    return {
      container: {
        backgroundColor: colors.surface,
        borderRadius: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.outlineVariant,
      } as ViewStyle,
      row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
        minHeight: 52,
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
      } as ViewStyle,
      headerRow: {
        backgroundColor: colors.surface,
        minHeight: 56,
      } as ViewStyle,
      cell: {
        flex: 1,
        minWidth: 100,
        paddingHorizontal: spacing.sm,
        justifyContent: 'center',
      } as ViewStyle,
      cellNumeric: {
        alignItems: 'flex-end',
      } as ViewStyle,
      headerText: {
        ...typography.label.large,
        color: colors.onSurface,
        fontWeight: '500',
      } as TextStyle,
      cellText: {
        ...typography.body.medium,
        color: colors.onSurface,
      } as TextStyle,
      checkboxCell: {
        width: 48,
        justifyContent: 'center',
        alignItems: 'center',
      } as ViewStyle,
      sortIcon: {
        ...typography.label.medium,
        color: colors.primary,
        marginLeft: 4,
      } as TextStyle,
    };
  }, [colors, spacing, typography]);

  const renderHeader = () => {
    const isAllSelected = data.length > 0 && selectedIds.size === data.length;
    const isIndeterminate = selectedIds.size > 0 && selectedIds.size < data.length;

    return (
      <View style={[styles.row, styles.headerRow]}>
        {selectable && (
          <View style={styles.checkboxCell}>
            <Checkbox
              checked={isAllSelected}
              indeterminate={isIndeterminate}
              onChange={toggleAll}
            />
          </View>
        )}
        {columns.map((col) => (
          <Pressable
            key={col.id}
            style={[styles.cell, col.numeric && styles.cellNumeric]}
            onPress={() => col.sortable && handleSort(col.id)}
            disabled={!col.sortable}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.headerText}>{col.label}</Text>
              {sortConfig?.id === col.id && (
                <Text style={styles.sortIcon}>
                  {sortConfig.asc ? '↑' : '↓'}
                </Text>
              )}
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  const renderItem = ({ item }: { item: T }) => {
    const id = keyExtractor(item);
    const isSelected = selectedIds.has(id);

    return (
      <View
        style={[
          styles.row,
          isSelected && { backgroundColor: colors.primaryContainer + '20' },
        ]}
      >
        {selectable && (
          <View style={styles.checkboxCell}>
            <Checkbox
              checked={isSelected}
              onChange={() => toggleSelection(id)}
            />
          </View>
        )}
        {columns.map((col) => (
          <View key={col.id} style={[styles.cell, col.numeric && styles.cellNumeric]}>
            {col.render ? (
              col.render(item)
            ) : (
              <Text style={styles.cellText} numberOfLines={1}>
                {String(item[col.id as keyof T] ?? '')}
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal bounces={false}>
        <View>
          {renderHeader()}
          <FlatList
            data={data}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            bounces={false}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default DataTable;
