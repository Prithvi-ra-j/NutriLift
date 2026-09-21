import { useCallback, useEffect, useState } from "react";

export function useRestTimer(defaultSeconds = 90) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || seconds <= 0) return;
    const timer = setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running, seconds]);

  const start = useCallback((duration = defaultSeconds) => {
    setSeconds(Math.max(1, duration));
    setRunning(true);
  }, [defaultSeconds]);

  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => { setSeconds(0); setRunning(false); }, []);

  return { seconds, running, start, pause, reset };
}
