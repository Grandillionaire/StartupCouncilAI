/**
 * Council Debate Service
 * Clean abstraction for AI council API calls
 * No React dependencies - pure business logic
 */

import type { StreamEvent } from '@/lib/agents/types';
import type { DebateMode, ClaudeModel } from '@/lib/stores/debate-store';
import { loadApiKeys } from '@/lib/utils/api-keys';

export interface DebateConfig {
  question: string;
  conversationHistory: string;
  mode: DebateMode;
  advisors: string[];
  model: ClaudeModel;
  enableResearch: boolean;
  continueDebate?: boolean;
  regenerate?: boolean;
}

export type EventHandler = (event: StreamEvent) => void;

export class CouncilService {
  private abortController: AbortController | null = null;

  /**
   * Start a new council debate
   */
  async startDebate(config: DebateConfig, onEvent: EventHandler): Promise<void> {
    // Create new abort controller for this debate
    this.abortController = new AbortController();

    try {
      // Load API keys from localStorage (if user has configured them)
      const apiKeys = loadApiKeys();

      const response = await fetch('/api/council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          // Pass API keys from localStorage (if available)
          anthropicKey: apiKeys.anthropic,
          tavilyKey: apiKeys.tavily,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Parse Server-Sent Events stream
      await this.parseStream(response.body!, onEvent);

    } catch (error: any) {
      // Don't throw on abort - that's intentional
      if (error.name === 'AbortError') {
        return;
      }

      // Handle other errors
      console.error('Debate error:', error);

      onEvent({
        type: 'error',
        content: error.message || 'Unknown error occurred',
        timestamp: Date.now(),
      });

      throw error;
    }
  }

  /**
   * Stop current debate
   */
  stopDebate(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Parse SSE stream and emit events
   */
  private async parseStream(stream: ReadableStream, onEvent: EventHandler): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: StreamEvent = JSON.parse(line.slice(6));
              onEvent(event);
            } catch (e) {
              console.error('Failed to parse event:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Validate API keys
   */
  async validateApiKeys(): Promise<{ valid: boolean; message?: string }> {
    try {
      const response = await fetch('/api/validate-keys');

      if (!response.ok) {
        return {
          valid: false,
          message: 'Failed to validate API keys',
        };
      }

      const data = await response.json();
      return {
        valid: data.valid,
        message: data.message,
      };
    } catch (error) {
      return {
        valid: false,
        message: 'Network error while validating keys',
      };
    }
  }
}

// Singleton instance
export const councilService = new CouncilService();
