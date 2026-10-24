import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface UIState {
  activeTab: string;
  isSessionActive: boolean;
  activeSessionId: string | null;
  coachInsight: string | null;
  coachInsightDate: string | null;

  // Actions
  setActiveTab: (tab: string) => void;
  setSessionActive: (active: boolean, sessionId?: string) => void;
  setCoachInsight: (insight: string, date: string) => void;
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    activeTab: "index",
    isSessionActive: false,
    activeSessionId: null,
    coachInsight: null,
    coachInsightDate: null,

    setActiveTab: (tab) =>
      set((state) => {
        state.activeTab = tab;
      }),

    setSessionActive: (active, sessionId) =>
      set((state) => {
        state.isSessionActive = active;
        state.activeSessionId = sessionId ?? null;
      }),

    setCoachInsight: (insight, date) =>
      set((state) => {
        state.coachInsight = insight;
        state.coachInsightDate = date;
      }),
  }))
);
