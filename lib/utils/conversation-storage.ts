/**
 * Conversation History Storage Utility
 * Manages localStorage-based conversation history with search and CRUD operations
 */

export interface ConversationHistoryItem {
  id: string;
  title: string;
  question: string;
  timestamp: number;
  messageCount: number;
  model: string;
  mode: string;
  preview: string;
  messages: any[]; // Full conversation data
  advisors: string[];
  hasResearch: boolean;
}

const HISTORY_STORAGE_KEY = 'council_history';
const MAX_HISTORY_ITEMS = 50;
const STORAGE_WARNING_THRESHOLD = 4 * 1024 * 1024; // 4MB - warn before hitting 5MB limit
const STORAGE_CRITICAL_THRESHOLD = 4.5 * 1024 * 1024; // 4.5MB - force cleanup

/**
 * Check if we're in a browser environment
 */
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

/**
 * Get current localStorage usage in bytes
 * SECURITY: Monitor storage to prevent DoS via quota exhaustion
 */
function getLocalStorageSize(): number {
  if (!isBrowser) return 0;

  let total = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total * 2; // UTF-16 characters are 2 bytes each
}

/**
 * Check storage quota and warn/cleanup if needed
 * SECURITY: Prevent client-side DoS via storage exhaustion
 */
function checkStorageQuota(): { warning: boolean; critical: boolean; size: number } {
  if (!isBrowser) return { warning: false, critical: false, size: 0 };

  const size = getLocalStorageSize();
  const warning = size > STORAGE_WARNING_THRESHOLD;
  const critical = size > STORAGE_CRITICAL_THRESHOLD;

  if (critical) {
    console.warn(
      `[Security] localStorage usage critical: ${Math.round(size / 1024)}KB. Auto-cleanup triggered.`
    );
    // Auto-cleanup: remove oldest conversations
    try {
      const history = getConversationHistory();
      const reducedHistory = history.slice(0, 10); // Keep only 10 most recent
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(reducedHistory));
    } catch (err) {
      console.error('[Security] Failed to cleanup storage:', err);
    }
  } else if (warning) {
    console.warn(
      `[Security] localStorage usage high: ${Math.round(size / 1024)}KB. Consider clearing old data.`
    );
  }

  return { warning, critical, size };
}

/**
 * Save a conversation to history
 * Automatically truncates to keep last 50 conversations
 */
export function saveConversationToHistory(
  conversation: ConversationHistoryItem
): void {
  if (!isBrowser) return;

  // SECURITY: Check storage quota before saving
  const quota = checkStorageQuota();

  try {
    const history = getConversationHistory();

    // Check if this conversation already exists (update instead of duplicate)
    const existingIndex = history.findIndex(c => c.id === conversation.id);

    if (existingIndex >= 0) {
      // Update existing conversation
      history[existingIndex] = conversation;
    } else {
      // Add new conversation to beginning
      history.unshift(conversation);
    }

    // Keep only last MAX_HISTORY_ITEMS conversations
    const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmedHistory));
  } catch (err) {
    console.error('Failed to save conversation to history:', err);
    // If localStorage is full, try to clear old items
    try {
      const history = getConversationHistory();
      const reducedHistory = history.slice(0, 25); // Keep only 25 most recent
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(reducedHistory));
      // Try saving again
      saveConversationToHistory(conversation);
    } catch (retryErr) {
      console.error('Failed to save even after cleanup:', retryErr);
    }
  }
}

/**
 * Get all conversations from history
 * Returns empty array if no history or on error
 */
export function getConversationHistory(): ConversationHistoryItem[] {
  if (!isBrowser) return [];

  try {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!saved) {
      return [];
    }

    const history = JSON.parse(saved);

    // Validate and filter out corrupted items
    if (!Array.isArray(history)) {
      console.warn('[ConversationStorage] Invalid history format, resetting');
      return [];
    }

    const validHistory = history.filter(item =>
      item &&
      typeof item === 'object' &&
      item.id &&
      item.title &&
      item.timestamp
    );

    return validHistory;
  } catch (err) {
    console.error('[ConversationStorage] Failed to load conversation history:', err);
    return [];
  }
}

/**
 * Get a single conversation by ID
 */
export function getConversationById(id: string): ConversationHistoryItem | null {
  const history = getConversationHistory();
  return history.find(c => c.id === id) || null;
}

/**
 * Delete a conversation from history
 */
export function deleteConversation(id: string): boolean {
  if (!isBrowser) return false;

  try {
    const history = getConversationHistory();
    const filtered = history.filter(c => c.id !== id);

    if (filtered.length === history.length) {
      // No conversation was deleted
      return false;
    }

    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('[ConversationStorage] Failed to delete conversation:', err);
    return false;
  }
}

/**
 * Delete all conversations from history
 */
export function clearAllHistory(): boolean {
  if (!isBrowser) return false;

  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    return true;
  } catch (err) {
    console.error('Failed to clear history:', err);
    return false;
  }
}

/**
 * Search conversations by query (searches title, question, and preview)
 */
export function searchConversations(query: string): ConversationHistoryItem[] {
  if (!query || !query.trim()) {
    return getConversationHistory();
  }

  const history = getConversationHistory();
  const lowerQuery = query.toLowerCase();

  return history.filter(c =>
    c.title.toLowerCase().includes(lowerQuery) ||
    c.question.toLowerCase().includes(lowerQuery) ||
    c.preview.toLowerCase().includes(lowerQuery) ||
    c.advisors.some(a => a.toLowerCase().includes(lowerQuery)) ||
    c.model.toLowerCase().includes(lowerQuery) ||
    c.mode.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get conversations grouped by date
 */
export function getConversationsByDate(): {
  today: ConversationHistoryItem[];
  yesterday: ConversationHistoryItem[];
  thisWeek: ConversationHistoryItem[];
  thisMonth: ConversationHistoryItem[];
  older: ConversationHistoryItem[];
} {
  if (!isBrowser) {
    return {
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      older: [],
    };
  }

  const history = getConversationHistory();
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;
  const oneMonth = 30 * oneDay;

  const groups = {
    today: [] as ConversationHistoryItem[],
    yesterday: [] as ConversationHistoryItem[],
    thisWeek: [] as ConversationHistoryItem[],
    thisMonth: [] as ConversationHistoryItem[],
    older: [] as ConversationHistoryItem[],
  };

  history.forEach(conv => {
    const age = now - conv.timestamp;

    if (age < oneDay) {
      groups.today.push(conv);
    } else if (age < 2 * oneDay) {
      groups.yesterday.push(conv);
    } else if (age < oneWeek) {
      groups.thisWeek.push(conv);
    } else if (age < oneMonth) {
      groups.thisMonth.push(conv);
    } else {
      groups.older.push(conv);
    }
  });

  return groups;
}

/**
 * Export a conversation as markdown
 */
export function exportConversationAsMarkdown(conversation: ConversationHistoryItem): string {
  const { title, question, timestamp, messages, model, mode, advisors } = conversation;
  const date = new Date(timestamp).toLocaleString();

  let markdown = `# ${title}\n\n`;
  markdown += `**Date:** ${date}\n`;
  markdown += `**Model:** ${model}\n`;
  markdown += `**Mode:** ${mode}\n`;
  markdown += `**Advisors:** ${advisors.join(', ')}\n\n`;
  markdown += `---\n\n`;
  markdown += `## Question\n\n${question}\n\n`;
  markdown += `---\n\n`;
  markdown += `## Conversation\n\n`;

  messages.forEach(msg => {
    if (msg.type === 'user') {
      markdown += `### You\n\n${msg.content}\n\n`;
    } else if (msg.type === 'agent' && msg.agent) {
      markdown += `### ${msg.agent}\n\n${msg.content}\n\n`;
    } else if (msg.type === 'moderator') {
      markdown += `### Moderator\n\n${msg.content}\n\n`;
    } else if (msg.type === 'final') {
      markdown += `### Final Answer\n\n${msg.content}\n\n`;
    }
  });

  return markdown;
}

/**
 * Get storage statistics with security monitoring
 * SECURITY: Track storage usage to prevent quota exhaustion
 */
export function getStorageStats(): {
  totalConversations: number;
  totalMessages: number;
  oldestConversation: number | null;
  newestConversation: number | null;
  estimatedSizeKB: number;
  totalStorageKB: number;
  quotaWarning: boolean;
  quotaCritical: boolean;
} {
  if (!isBrowser) {
    return {
      totalConversations: 0,
      totalMessages: 0,
      oldestConversation: null,
      newestConversation: null,
      estimatedSizeKB: 0,
      totalStorageKB: 0,
      quotaWarning: false,
      quotaCritical: false,
    };
  }

  const history = getConversationHistory();

  const totalMessages = history.reduce((sum, c) => sum + c.messageCount, 0);
  const timestamps = history.map(c => c.timestamp).filter(Boolean);

  const storageData = localStorage.getItem(HISTORY_STORAGE_KEY) || '';
  const estimatedSizeKB = Math.round(new Blob([storageData]).size / 1024);

  const quota = checkStorageQuota();

  return {
    totalConversations: history.length,
    totalMessages,
    oldestConversation: timestamps.length > 0 ? Math.min(...timestamps) : null,
    newestConversation: timestamps.length > 0 ? Math.max(...timestamps) : null,
    estimatedSizeKB,
    totalStorageKB: Math.round(quota.size / 1024),
    quotaWarning: quota.warning,
    quotaCritical: quota.critical,
  };
}
