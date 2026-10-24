import { AppState, type AppStateStatus } from "react-native";
import { logger } from "../logger";

type Listener = () => void;
type StateListener = (state: AppStateStatus) => void;
type Subscription = { remove: () => void };

export function createForegroundBus(
  subscribeToAppState: (listener: StateListener) => Subscription,
) {
  const foregroundListeners = new Set<Listener>();
  const backgroundListeners = new Set<Listener>();

  const subscription = subscribeToAppState((state) => {
    const listeners = state === "active" ? foregroundListeners : backgroundListeners;
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch (error) {
        logger.error("Lifecycle listener failed", {
          state,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });

  return {
    onForeground(listener: Listener): () => void {
      foregroundListeners.add(listener);
      return () => foregroundListeners.delete(listener);
    },
    onBackground(listener: Listener): () => void {
      backgroundListeners.add(listener);
      return () => backgroundListeners.delete(listener);
    },
    dispose(): void {
      subscription.remove();
      foregroundListeners.clear();
      backgroundListeners.clear();
    },
  };
}

const lifecycleBus = createForegroundBus((listener) =>
  AppState.addEventListener("change", listener),
);

export const onForeground = lifecycleBus.onForeground;
export const onBackground = lifecycleBus.onBackground;
