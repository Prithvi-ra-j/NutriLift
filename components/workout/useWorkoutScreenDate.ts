import { useState } from "react";
import { useToday } from "../../lib/time/useToday";

export function useWorkoutScreenDate() {
  const today = useToday();
  const [pickedDate, setPickedDate] = useState<string | null>(null);

  return {
    today,
    selectedDate: pickedDate ?? today,
    setSelectedDate: (date: string) => setPickedDate(date === today ? null : date),
  };
}
