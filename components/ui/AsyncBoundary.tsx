import type { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { UseQueryResult } from "@tanstack/react-query";
import { M3 } from "../../design-system/tokens";
import { CardSkeleton } from "./SkeletonLoader";
import { EmptyState } from "./EmptyState";

const styles = StyleSheet.create({
  errorContainer: { gap: 12 },
  retryButton: {
    minHeight: 48,
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    borderRadius: M3.shape.medium,
    backgroundColor: M3.colors.primary,
  },
  retryText: { color: M3.colors.onPrimary, fontFamily: "DMSans_700Bold" },
});

interface AsyncBoundaryProps<T> {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  loadingFallback?: ReactNode;
  errorMessage?: string;
}

export function AsyncBoundary<T>({
  query,
  children,
  isEmpty,
  emptyTitle = "Nothing here yet",
  emptyMessage = "Your saved information will appear here.",
  emptyActionLabel,
  onEmptyAction,
  loadingFallback,
  errorMessage = "Could not load this information.",
}: AsyncBoundaryProps<T>) {
  if (query.isPending) {
    return loadingFallback ?? <CardSkeleton />;
  }

  if (query.isError && query.data === undefined) {
    return (
      <View accessibilityRole="alert" style={styles.errorContainer}>
        <Text style={{ color: M3.colors.onErrorContainer }}>{errorMessage}</Text>
        <TouchableOpacity
          accessibilityLabel="Retry loading"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => { void query.refetch(); }}
          style={styles.retryButton}
          testID="async.retry"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (query.data === undefined) {
    return null;
  }

  if (isEmpty?.(query.data)) {
    return (
      <EmptyState
        actionLabel={emptyActionLabel}
        icon="inbox"
        onAction={onEmptyAction}
        subtitle={emptyMessage}
        title={emptyTitle}
      />
    );
  }

  return <>{children(query.data)}</>;
}
