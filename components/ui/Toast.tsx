import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { M3 } from "../../design-system/tokens";

type ToastKind = "info" | "success" | "error";

type ToastAction = {
  label: string;
  onPress: () => void;
};

type ToastInput = {
  message: string;
  kind: ToastKind;
  action?: ToastAction;
  durationMs?: number;
};

type ToastItem = ToastInput & { id: number };
type ToastContextValue = { show: (toast: ToastInput) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 64,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  toast: {
    minHeight: 56,
    borderRadius: M3.shape.medium,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    elevation: 8,
  },
  info: { backgroundColor: M3.colors.inverseSurface },
  success: { backgroundColor: M3.colors.primaryContainer },
  error: { backgroundColor: M3.colors.errorContainer },
  message: {
    flex: 1,
    color: M3.colors.onPrimary,
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
  },
  successMessage: { color: M3.colors.onPrimaryContainer },
  errorMessage: { color: M3.colors.onErrorContainer },
  action: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  actionText: {
    color: M3.colors.primary,
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
  },
  dismissText: {
    color: M3.colors.onPrimary,
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
});

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider.");
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const active = items[0];

  const show = useCallback((toast: ToastInput) => {
    if (!toast.message.trim()) throw new Error("Toast messages cannot be empty.");
    if (
      toast.durationMs !== undefined &&
      (!Number.isFinite(toast.durationMs) || toast.durationMs < 0)
    ) {
      throw new Error("Toast duration must be a non-negative finite number.");
    }
    setItems((current) => [
      ...current,
      { ...toast, durationMs: toast.durationMs ?? 4_000, id: ++nextId.current },
    ]);
  }, []);

  const dismiss = useCallback(() => {
    setItems((current) => current.slice(1));
  }, []);

  useEffect(() => {
    if (!active) return;
    const timeout = setTimeout(dismiss, active.durationMs);
    return () => clearTimeout(timeout);
  }, [active, dismiss]);

  const contextValue = useMemo(() => ({ show }), [show]);
  const messageStyle =
    active?.kind === "success"
      ? styles.successMessage
      : active?.kind === "error"
        ? styles.errorMessage
        : undefined;

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {active ? (
        <View pointerEvents="box-none" style={styles.host}>
          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.toast,
              active.kind === "success"
                ? styles.success
                : active.kind === "error"
                  ? styles.error
                  : styles.info,
            ]}
            testID={`toast.${active.kind}`}
          >
            <Text maxFontSizeMultiplier={1.3} style={[styles.message, messageStyle]}>
              {active.message}
            </Text>
            {active.action ? (
              <Pressable
                accessibilityLabel={active.action.label}
                accessibilityRole="button"
                onPress={() => {
                  active.action?.onPress();
                  dismiss();
                }}
                style={styles.action}
              >
                <Text style={styles.actionText}>{active.action.label}</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel="Dismiss notification"
              accessibilityRole="button"
              onPress={dismiss}
              style={styles.action}
            >
              <Text style={styles.dismissText}>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}
