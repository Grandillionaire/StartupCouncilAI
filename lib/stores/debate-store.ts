/**
 * Centralized debate state management
 * Replaces 20+ useState calls with clean Zustand store
 */

import { create } from 'zustand';
import type { StreamEvent } from '@/lib/agents/types';
import { getSmartDefaults } from '@/lib/utils/memory-system';

export interface Message {
  id: string;
  type: 'user' | 'agent' | 'moderator' | 'system' | 'final' | 'error' | 'interruption';
  agent?: string;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  rating?: number;
  sources?: Source[];
}

export interface Source {
  title: string;
  url: string;
  snippet: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export type DebateMode = 'quick' | 'standard' | 'deep';
export type ClaudeModel = 'claude-opus-4-5' | 'claude-sonnet-4-5' | 'claude-haiku-4';

export interface DebateSettings {
  mode: DebateMode;
  selectedAdvisors: string[];
  showSettings: boolean;
  model: ClaudeModel;
  enableResearch: boolean;
}

interface DebateState {
  // Core debate state
  messages: Message[];
  input: string;
  isDebating: boolean;
  currentRound: number;

  // UI state
  toasts: Toast[];
  error: string | null;
  progress: number;
  copiedId: string | null;
  conversationTitle: string;
  editingTitle: boolean;
  followUpSuggestions: string[];

  // Timing
  timeEstimate: number;
  elapsedTime: number;
  debateStartTimestamp: number;

  // Research state
  isResearching: boolean;
  researchQuery: string;

  // Status updates
  currentStatus: string;
  statusHistory: string[];

  // Modal state
  showHistory: boolean;
  showAnalytics: boolean;

  // API state
  apiKeysValid: boolean;
  rateLimitInfo: { isLimited: boolean; resetTime?: number } | null;
  isOnline: boolean;
  retryCount: number;

  // Settings
  settings: DebateSettings;

  // Actions - State Setters
  setInput: (input: string) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  addMessage: (message: Message) => void;
  updateLastMessage: (update: Partial<Message>) => void;
  setIsDebating: (isDebating: boolean) => void;
  setCurrentRound: (round: number) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  setConversationTitle: (title: string) => void;
  setFollowUpSuggestions: (suggestions: string[]) => void;
  setIsResearching: (isResearching: boolean) => void;
  setResearchQuery: (query: string) => void;
  setCurrentStatus: (status: string) => void;
  setShowHistory: (show: boolean) => void;
  setShowAnalytics: (show: boolean) => void;
  setSettings: (settings: DebateSettings | ((prev: DebateSettings) => DebateSettings)) => void;
  setDebateStartTimestamp: (timestamp: number) => void;
  setCopiedId: (id: string | null) => void;
  setEditingTitle: (editing: boolean) => void;
  setTimeEstimate: (estimate: number) => void;
  setRateLimitInfo: (info: { isLimited: boolean; resetTime?: number } | null) => void;
  setApiKeysValid: (valid: boolean) => void;

  // Actions - Business Logic
  showToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
  clearMessages: () => void;
  reset: () => void;

  // Stream event handler
  handleStreamEvent: (event: StreamEvent) => void;
}

// Initial state with smart defaults
const getInitialState = (): Pick<DebateState, 'messages' | 'input' | 'isDebating' | 'currentRound' | 'toasts' | 'error' | 'progress' | 'copiedId' | 'conversationTitle' | 'editingTitle' | 'followUpSuggestions' | 'timeEstimate' | 'elapsedTime' | 'debateStartTimestamp' | 'isResearching' | 'researchQuery' | 'currentStatus' | 'statusHistory' | 'showHistory' | 'showAnalytics' | 'apiKeysValid' | 'rateLimitInfo' | 'isOnline' | 'retryCount' | 'settings'> => {
  const smartDefaults = typeof window !== 'undefined' ? getSmartDefaults() : null;

  return {
    messages: [],
    input: '',
    isDebating: false,
    currentRound: 0,
    toasts: [],
    error: null,
    progress: 0,
    copiedId: null,
    conversationTitle: '',
    editingTitle: false,
    followUpSuggestions: [],
    timeEstimate: 0,
    elapsedTime: 0,
    debateStartTimestamp: 0,
    isResearching: false,
    researchQuery: '',
    currentStatus: '',
    statusHistory: [],
    showHistory: false,
    showAnalytics: false,
    apiKeysValid: true,
    rateLimitInfo: null,
    isOnline: true,
    retryCount: 0,
    settings: {
      mode: (smartDefaults?.mode as DebateMode) || 'standard',
      selectedAdvisors: smartDefaults?.advisors || ['naval', 'elon', 'larry', 'alex', 'pavel'],
      showSettings: false,
      model: (smartDefaults?.model as ClaudeModel) || 'claude-sonnet-4-5',
      enableResearch: false, // Never default to true - research only activates via keyword
    },
  };
};

export const useDebateStore = create<DebateState>((set, get) => ({
  ...getInitialState(),

  // Simple setters
  setInput: (input) => set({ input }),
  setIsDebating: (isDebating) => set({ isDebating }),
  setCurrentRound: (currentRound) => set({ currentRound }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error }),
  setConversationTitle: (conversationTitle) => set({ conversationTitle }),
  setFollowUpSuggestions: (followUpSuggestions) => set({ followUpSuggestions }),
  setIsResearching: (isResearching) => set({ isResearching }),
  setResearchQuery: (researchQuery) => set({ researchQuery }),
  setCurrentStatus: (currentStatus) => set((state) => ({
    currentStatus,
    statusHistory: [...state.statusHistory, currentStatus]
  })),
  setShowHistory: (showHistory) => set({ showHistory }),
  setShowAnalytics: (showAnalytics) => set({ showAnalytics }),
  setDebateStartTimestamp: (debateStartTimestamp) => set({ debateStartTimestamp }),
  setCopiedId: (copiedId) => set({ copiedId }),
  setEditingTitle: (editingTitle) => set({ editingTitle }),
  setTimeEstimate: (timeEstimate) => set({ timeEstimate }),
  setRateLimitInfo: (rateLimitInfo) => set({ rateLimitInfo }),
  setApiKeysValid: (apiKeysValid) => set({ apiKeysValid }),

  // Complex setters (functional updates)
  setMessages: (messages) => set((state) => ({
    messages: typeof messages === 'function' ? messages(state.messages) : messages
  })),

  setSettings: (settings) => set((state) => ({
    settings: typeof settings === 'function' ? settings(state.settings) : settings
  })),

  // Helper actions
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),

  updateLastMessage: (update) => set((state) => {
    const messages = [...state.messages];
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      messages[messages.length - 1] = { ...lastMessage, ...update };
    }
    return { messages };
  }),

  showToast: (message, type) => {
    const id = `toast-${Date.now()}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));

    // Auto-remove after 3 seconds
    setTimeout(() => {
      get().removeToast(id);
    }, 3000);
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),

  clearMessages: () => set({
    messages: [],
    conversationTitle: '',
    followUpSuggestions: [],
    error: null,
  }),

  reset: () => set(getInitialState()),

  // Stream event handler
  handleStreamEvent: (event) => {
    const state = get();

    switch (event.type) {
      case 'research_start':
        set({ isResearching: true, researchQuery: event.content || 'Searching...' });
        break;

      case 'research_complete':
        set({ isResearching: false, researchQuery: '' });
        break;

      case 'research_results':
        if (event.data?.sources && event.data.sources.length > 0) {
          state.addMessage({
            id: `research-${event.timestamp}`,
            type: 'system',
            content: event.content || 'Research complete',
            timestamp: event.timestamp,
            sources: event.data.sources,
          });
        }
        break;

      case 'agent_start':
        if (event.agent) {
          state.addMessage({
            id: `${event.agent}-${event.timestamp}`,
            type: 'agent',
            agent: event.agent,
            content: '',
            timestamp: event.timestamp,
            isStreaming: true,
            rating: 0,
          });
        }
        break;

      case 'agent_response':
        if (event.agent && event.content) {
          set((state) => {
            const messages = [...state.messages];
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.agent === event.agent && lastMessage.isStreaming) {
              lastMessage.content += event.content;
            }
            return { messages };
          });
        }
        break;

      case 'agent_complete':
        set((state) => {
          const messages = [...state.messages];
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.isStreaming) {
            lastMessage.isStreaming = false;
          }
          return { messages };
        });
        break;

      case 'moderator_analysis':
        if (event.content) {
          if (event.content.includes('Round')) {
            const roundMatch = event.content.match(/Round (\d+)/);
            if (roundMatch) {
              set({ currentRound: parseInt(roundMatch[1]) });
            }
          }
          state.addMessage({
            id: `moderator-${event.timestamp}`,
            type: 'moderator',
            content: event.content,
            timestamp: event.timestamp,
          });
        }
        break;

      case 'clarification_needed':
        if (event.content) {
          state.addMessage({
            id: `moderator-${event.timestamp}`,
            type: 'moderator',
            content: event.content,
            timestamp: event.timestamp,
          });
        }
        break;

      case 'system':
        if (event.content) {
          state.addMessage({
            id: `system-${event.timestamp}`,
            type: 'system',
            content: event.content,
            timestamp: event.timestamp,
          });
          // Also show as toast for important system messages
          if (event.content.includes('TAVILY_API_KEY') || event.content.includes('not configured')) {
            state.showToast(event.content, 'warning');
          }
        }
        break;

      case 'final_answer':
        if (event.content) {
          state.addMessage({
            id: `final-${event.timestamp}`,
            type: 'final',
            content: event.content,
            timestamp: event.timestamp,
          });
        }
        break;

      case 'status':
        if (event.content) {
          state.setCurrentStatus(event.content);
        }
        break;

      case 'error':
        if (event.content) {
          state.addMessage({
            id: `error-${event.timestamp}`,
            type: 'error',
            content: event.content,
            timestamp: event.timestamp,
          });
        }
        break;
    }
  },
}));
