import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type ModalType =
  | "log-food"
  | "log-exercise"
  | "inbody-paste"
  | "monthly-report"
  | "voice-input"
  | null;

interface UIState {
  activeModal: ModalType;
  activeTab: string;
  logFoodMeal: string | null; // pre-selected meal when opening log-food
  logFoodMode: "type" | "voice" | "paste";
  isSessionActive: boolean;
  activeSessionId: string | null;
  coachInsight: string | null;
  coachInsightDate: string | null;

  // Actions
  openModal: (modal: ModalType, options?: { meal?: string; mode?: "type" | "voice" | "paste" }) => void;
  closeModal: () => void;
  setActiveTab: (tab: string) => void;
  setSessionActive: (active: boolean, sessionId?: string) => void;
  setCoachInsight: (insight: string, date: string) => void;
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    activeModal: null,
    activeTab: "index",
    logFoodMeal: null,
    logFoodMode: "type",
    isSessionActive: false,
    activeSessionId: null,
    coachInsight: null,
    coachInsightDate: null,

    openModal: (modal, options) =>
      set((state) => {
        state.activeModal = modal;
        if (options?.meal) state.logFoodMeal = options.meal;
        if (options?.mode) state.logFoodMode = options.mode;
      }),

    closeModal: () =>
      set((state) => {
        state.activeModal = null;
        state.logFoodMeal = null;
      }),

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
