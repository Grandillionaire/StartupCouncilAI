/**
 * Memory & Learning System
 * Learns from user interactions and provides smart defaults
 */

export interface UserMemory {
  preferences: {
    favoriteModel?: string;
    favoriteMode?: string;
    preferredAdvisors: string[];
    researchDefault: boolean;
  };
  advisorPerformance: Record<string, {
    timesUsed: number;
    averageRating: number;
    lastUsed: number;
  }>;
  topics: Array<{
    keywords: string[];
    relatedQuestions: string[];
    lastAsked: number;
  }>;
  lastDebateSettings: {
    model: string;
    mode: string;
    advisors: string[];
    research: boolean;
  } | null;
}

const MEMORY_STORAGE_KEY = 'council_memory';
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export function getUserMemory(): UserMemory {
  if (!isBrowser) {
    return {
      preferences: { preferredAdvisors: [], researchDefault: true },
      advisorPerformance: {},
      topics: [],
      lastDebateSettings: null,
    };
  }

  try {
    const saved = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (!saved) {
      return {
        preferences: { preferredAdvisors: [], researchDefault: true },
        advisorPerformance: {},
        topics: [],
        lastDebateSettings: null,
      };
    }
    return JSON.parse(saved);
  } catch {
    return {
      preferences: { preferredAdvisors: [], researchDefault: true },
      advisorPerformance: {},
      topics: [],
      lastDebateSettings: null,
    };
  }
}

export function saveUserMemory(memory: UserMemory): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memory));
  } catch (error) {
    console.error('Failed to save memory:', error);
  }
}

export function updateAdvisorPerformance(advisor: string, rating: number): void {
  const memory = getUserMemory();

  if (!memory.advisorPerformance[advisor]) {
    memory.advisorPerformance[advisor] = {
      timesUsed: 0,
      averageRating: 0,
      lastUsed: Date.now(),
    };
  }

  const perf = memory.advisorPerformance[advisor];
  perf.timesUsed += 1;
  perf.averageRating = ((perf.averageRating * (perf.timesUsed - 1)) + rating) / perf.timesUsed;
  perf.lastUsed = Date.now();

  saveUserMemory(memory);
}

export function getSmartDefaults(): {
  model: string;
  mode: string;
  advisors: string[];
  research: boolean;
} {
  const memory = getUserMemory();

  // Use last settings if available
  if (memory.lastDebateSettings) {
    return memory.lastDebateSettings;
  }

  // Fall back to preferences
  return {
    model: memory.preferences.favoriteModel || 'claude-sonnet-4-5',
    mode: memory.preferences.favoriteMode || 'standard',
    advisors: memory.preferences.preferredAdvisors.length > 0
      ? memory.preferences.preferredAdvisors
      : ['naval', 'elon', 'larry', 'alex', 'pavel'],
    research: memory.preferences.researchDefault,
  };
}

export function saveLastSettings(settings: {
  model: string;
  mode: string;
  advisors: string[];
  research: boolean;
}): void {
  const memory = getUserMemory();
  memory.lastDebateSettings = settings;
  saveUserMemory(memory);
}
