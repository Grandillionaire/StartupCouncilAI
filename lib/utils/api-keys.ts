/**
 * API Key Management Utilities
 * Handles storing and retrieving API keys from localStorage
 */

const STORAGE_KEY = 'selfstarter_api_keys';

export interface ApiKeys {
  anthropic?: string;
  tavily?: string;
}

/**
 * Save API keys to localStorage
 */
export function saveApiKeys(keys: ApiKeys): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch (error) {
    console.error('[APIKeys] Failed to save API keys:', error);
  }
}

/**
 * Load API keys from localStorage
 */
export function loadApiKeys(): ApiKeys {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load API keys:', error);
    return {};
  }
}

/**
 * Check if API keys are configured
 */
export function hasApiKeys(): boolean {
  const keys = loadApiKeys();
  return !!keys.anthropic;
}

/**
 * Clear all API keys
 */
export function clearApiKeys(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear API keys:', error);
  }
}

/**
 * Get Anthropic API key (from localStorage or environment)
 */
export function getAnthropicKey(): string | undefined {
  // First try localStorage (user-provided)
  const keys = loadApiKeys();
  if (keys.anthropic) return keys.anthropic;
  
  // Fallback to environment variable (for developers)
  return process.env.ANTHROPIC_API_KEY;
}

/**
 * Get Tavily API key (from localStorage or environment)
 */
export function getTavilyKey(): string | undefined {
  // First try localStorage (user-provided)
  const keys = loadApiKeys();
  if (keys.tavily) return keys.tavily;
  
  // Fallback to environment variable (for developers)
  return process.env.TAVILY_API_KEY;
}
