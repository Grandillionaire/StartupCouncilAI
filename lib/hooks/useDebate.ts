/**
 * useDebate Hook
 * Connects council service to debate store
 * Clean separation: Service (business logic) → Hook (React bridge) → Store (state)
 */

import { useCallback } from 'react';
import { useDebateStore } from '@/lib/stores/debate-store';
import { councilService } from '@/lib/services/council-service';
import { saveLastSettings } from '@/lib/utils/memory-system';

export function useDebate() {
  const store = useDebateStore();

  /**
   * Start a new debate
   */
  const startDebate = useCallback(async (
    continueMode: boolean = false,
    regenerate: boolean = false
  ) => {
    const { input, messages, settings, isDebating, isOnline } = useDebateStore.getState();

    // Validation
    if (!input.trim() && !continueMode && !regenerate) return;
    if (isDebating && !continueMode && !regenerate) return;
    if (!isOnline) {
      store.showToast("You're offline. Check your connection.", 'error');
      return;
    }

    const questionToAsk = continueMode || regenerate
      ? messages.filter(m => m.type === 'user').pop()?.content || input
      : input;

    if (!questionToAsk.trim()) return;

    // Detect research keyword in the question (case-insensitive)
    // Only enable research if user explicitly includes "research" keyword
    const hasResearchKeyword = /\bresearch\b/i.test(questionToAsk);

    // Add user message (unless continuing or regenerating)
    if (!continueMode && !regenerate) {
      store.addMessage({
        id: `user-${Date.now()}`,
        type: 'user',
        content: questionToAsk,
        timestamp: Date.now(),
      });

      // Set title if not set
      if (!store.conversationTitle) {
        store.setConversationTitle(generateTitle(questionToAsk));
      }
    }

    // Build conversation history
    const conversationHistory = messages
      .filter((m) => m.type === 'user' || m.type === 'moderator' || m.type === 'final' || m.type === 'interruption')
      .map((m) => {
        if (m.type === 'user') return `User: ${m.content}`;
        if (m.type === 'moderator') return `Moderator: ${m.content}`;
        if (m.type === 'final') return `Previous Answer: ${m.content}`;
        if (m.type === 'interruption') return `User Interruption: ${m.content}`;
        return '';
      })
      .join('\n\n');

    // Reset state
    store.setInput('');
    store.setIsDebating(true);
    store.setCurrentRound(0);
    store.setError(null);
    store.setProgress(0);
    store.setDebateStartTimestamp(Date.now());

    // Save settings to memory (don't save keyword-based research preference)
    saveLastSettings({
      model: settings.model,
      mode: settings.mode,
      advisors: settings.selectedAdvisors,
      research: false, // Never default to research
    });

    try {
      // Start debate via service
      // Override enableResearch based on keyword detection
      await councilService.startDebate(
        {
          question: questionToAsk,
          conversationHistory,
          mode: settings.mode,
          advisors: settings.selectedAdvisors,
          model: settings.model,
          enableResearch: hasResearchKeyword, // Only enable if keyword present
          continueDebate: continueMode,
          regenerate,
        },
        // Event handler - send events to store
        (event) => {
          store.handleStreamEvent(event);
        }
      );

      store.setProgress(100);
    } catch (error: any) {
      // Error already handled by service and store
      console.error('Debate failed:', error);
    } finally {
      store.setIsDebating(false);
    }
  }, [store]);

  /**
   * Stop current debate
   */
  const stopDebate = useCallback(() => {
    councilService.stopDebate();
    store.setIsDebating(false);
    store.showToast('Debate stopped', 'info');
  }, [store]);

  /**
   * Clear conversation
   */
  const clearConversation = useCallback(() => {
    if (store.isDebating) {
      store.showToast('Cannot clear while debating', 'error');
      return;
    }

    store.clearMessages();
    store.showToast('Conversation cleared', 'info');
  }, [store]);

  return {
    // State
    ...store,

    // Actions
    startDebate,
    stopDebate,
    clearConversation,
  };
}

/**
 * Generate conversation title from question
 */
function generateTitle(question: string): string {
  const title = question.slice(0, 60);
  return title.length < question.length ? `${title}...` : title;
}
