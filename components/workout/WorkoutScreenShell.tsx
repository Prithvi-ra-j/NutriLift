import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { M3 } from "../../design-system/tokens";
import { CardSkeleton } from "../ui/SkeletonLoader";

interface WorkoutScreenShellProps {
  children: ReactNode;
}

export function WorkoutScreenShell({ children }: WorkoutScreenShellProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function WorkoutLoadingShell() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <View style={{ padding: 20, gap: 16 }}>
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </View>
    </SafeAreaView>
  );
}
