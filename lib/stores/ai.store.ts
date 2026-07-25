import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { AiConversation } from "../db/schema";

interface AIState {
  messages: AiConversation[];
  isGenerating: boolean;
  error: string | null;

  // Actions
  setMessages: (messages: AiConversation[]) => void;
  addMessage: (message: AiConversation) => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
}

export const useAIStore = create<AIState>()(
  immer((set) => ({
    messages: [],
    isGenerating: false,
    error: null,

    setMessages: (messages) =>
      set((state) => {
        state.messages = messages;
      }),

    addMessage: (message) =>
      set((state) => {
        state.messages.push(message);
      }),

    setGenerating: (generating) =>
      set((state) => {
        state.isGenerating = generating;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    clearMessages: () =>
      set((state) => {
        state.messages = [];
      }),
  }))
);
