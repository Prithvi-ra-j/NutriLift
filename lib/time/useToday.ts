import { useEffect, useState } from "react";
import { localDateString } from "./localDate";
import { onForeground } from "../lifecycle/foreground";

export function useToday(): string {
  const [today, setToday] = useState(() => localDateString());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let active = true;

    const refresh = () => {
      if (active) setToday(localDateString());
    };
    const scheduleNextMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );
      const delay = Math.max(1, nextMidnight.getTime() - now.getTime() + 1);
      timer = setTimeout(() => {
        refresh();
        scheduleNextMidnight();
      }, delay);
    };

    scheduleNextMidnight();
    const unsubscribe = onForeground(() => {
      clearTimeout(timer);
      refresh();
      scheduleNextMidnight();
    });

    return () => {
      active = false;
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return today;
}
