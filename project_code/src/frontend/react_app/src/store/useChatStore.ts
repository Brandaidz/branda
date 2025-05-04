// src/frontend/react_app/src/store/useChatStore.ts
import { create } from 'zustand';
import { Message, Session, CommerceContext } from '../types/chat';

interface ChatState {
  messages: Message[];
  session: Session;
  loading: boolean;
  error: string | null;
  activeCommerce: CommerceContext | null; // Placeholder for commerce context

  // Actions
  setSessionId: (sessionId: string) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setActiveCommerce: (context: CommerceContext | null) => void; // Placeholder
  resetChat: () => void;
}

const initialState = {
  messages: [],
  session: { sessionId: null },
  loading: false,
  error: null,
  activeCommerce: null,
};

export const useChatStore = create<ChatState>((set) => ({
  ...initialState,

  // --- Actions ---
  setSessionId: (sessionId) => set((state) => ({ session: { ...state.session, sessionId } })),

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

  setMessages: (messages) => set({ messages }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  setActiveCommerce: (context) => set({ activeCommerce: context }), // Placeholder

  resetChat: () => set(initialState),
}));

