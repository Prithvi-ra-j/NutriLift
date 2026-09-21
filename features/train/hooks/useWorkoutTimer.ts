import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "nutrilift/rest-timer/v1";
type PersistedState = { endAt: number | null; pausedSeconds: number; running: boolean };

export function useWorkoutTimer(defaultSeconds = 90) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!active) return;
      try {
        if (raw) {
          const saved = JSON.parse(raw) as PersistedState;
          if (saved.running && saved.endAt) {
            const remaining = Math.max(0, Math.ceil((saved.endAt - Date.now()) / 1000));
            setSeconds(remaining);
            setRunning(remaining > 0);
          } else {
            setSeconds(Math.max(0, saved.pausedSeconds || 0));
          }
        }
      } catch {
        // Ignore malformed persisted state.
      }
      setHydrated(true);
    }).catch(() => setHydrated(true));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const state: PersistedState = {
      endAt: running ? Date.now() + seconds * 1000 : null,
      pausedSeconds: seconds,
      running,
    };
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [seconds, running, hydrated]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  const start = useCallback((duration = defaultSeconds) => {
    setSeconds((current) => Math.max(1, current || duration));
    setRunning(true);
  }, [defaultSeconds]);
  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => { setSeconds(0); setRunning(false); }, []);
  return { seconds, running, start, pause, reset };
}
