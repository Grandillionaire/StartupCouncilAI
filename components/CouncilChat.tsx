'use client';

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useDebate } from '@/lib/hooks/useDebate';
import type { Message, Toast, DebateSettings, DebateMode, ClaudeModel } from '@/lib/stores/debate-store';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PERSONAS, ADVISOR_NAMES, type AdvisorName } from '@/lib/agents/personas';
import { cn, formatTimestamp } from '@/lib/utils';
import {
  Send, Loader2, AlertCircle, RotateCcw, Copy, CheckCheck,
  StopCircle, Info, ThumbsUp, ThumbsDown, Repeat, PlayCircle,
  MessageSquare, Zap, Brain, Settings2, X, Check, ChevronDown,
  Clock, Sparkles, TrendingUp, WifiOff, Wifi, Search, ExternalLink,
  Cpu, Gauge, History, Share2, Download, BarChart3, Key, Mic, MicOff,
  Lightbulb, MoreVertical, FileText
} from 'lucide-react';
import ConversationHistory from './ConversationHistory';
import AnalyticsDashboard from './AnalyticsDashboard';
import ApiKeySetup from './ApiKeySetup';
import TemplateSelector from './TemplateSelector';
import DebateVisualizer from './DebateVisualizer';
import AdvisorAvatar from './AdvisorAvatar';
import StatusDisplay from './StatusDisplay';
import Logo, { LogoCompact } from './Logo';
import { hasApiKeys, loadApiKeys, saveApiKeys } from '@/lib/utils/api-keys';
import type { PromptTemplate } from '@/lib/utils/prompt-templates';
import {
  saveConversationToHistory,
  type ConversationHistoryItem,
} from '@/lib/utils/conversation-storage';
import {
  copyShareUrl,
  downloadMarkdown,
  isConversationTooLarge,
  truncateConversation,
} from '@/lib/utils/share-utils';
import {
  saveDebateAnalytics,
  type DebateAnalytics,
} from '@/lib/utils/analytics';
import {
  getSmartDefaults,
  saveLastSettings,
  updateAdvisorPerformance,
} from '@/lib/utils/memory-system';

interface SavedConversation {
  messages: Message[];
  title: string;
  settings: DebateSettings;
  timestamp: number;
}

const STORAGE_KEY = 'council_conversation';

const MODEL_CONFIG = {
  'claude-opus-4-5': { label: 'Opus 4.5', desc: 'Most capable', icon: Sparkles, color: 'text-purple-500' },
  'claude-sonnet-4-5': { label: 'Sonnet 4.5', desc: 'Balanced', icon: Brain, color: 'text-blue-500' },
  'claude-haiku-4': { label: 'Haiku 4', desc: 'Fastest', icon: Zap, color: 'text-green-500' },
};

/**
 * Helper function to highlight "research" keyword in user messages
 */
function highlightResearchKeyword(text: string): React.ReactNode {
  const regex = /\b(research)\b/gi;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.toLowerCase() === 'research') {
      return (
        <span
          key={index}
          className="bg-blue-400 bg-opacity-30 px-1.5 py-0.5 rounded font-semibold border border-blue-300"
          title="Research mode activated"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

export default function CouncilChat() {
  // Use new architecture - single hook replaces 20+ useState calls
  const {
    // State
    messages,
    input,
    isDebating,
    currentRound,
    toasts,
    error,
    progress,
    copiedId,
    conversationTitle,
    editingTitle,
    followUpSuggestions,
    timeEstimate,
    isResearching,
    researchQuery,
    currentStatus,
    showHistory,
    showAnalytics,
    apiKeysValid,
    rateLimitInfo,
    debateStartTimestamp,
    settings,
    retryCount,

    // Actions
    setInput,
    setMessages,
    setConversationTitle,
    setEditingTitle,
    setCopiedId,
    setFollowUpSuggestions,
    setShowHistory,
    setShowAnalytics,
    setSettings,
    setApiKeysValid,
    setRateLimitInfo,
    setTimeEstimate,
    startDebate,
    stopDebate,
    clearConversation,
    showToast,
  } = useDebate();

  // Local component state (not in store)
  const [localElapsedTime, setLocalElapsedTime] = React.useState<number>(0);
  const [localIsOnline, setLocalIsOnline] = React.useState(true);
  const [showApiKeySetup, setShowApiKeySetup] = React.useState(false);
  const [currentApiKeys, setCurrentApiKeys] = React.useState(() => loadApiKeys());
  const [isVoiceListening, setIsVoiceListening] = React.useState(false);
  const [isVoiceSpeaking, setIsVoiceSpeaking] = React.useState(false);
  const [voiceEnabled, setVoiceEnabled] = React.useState(false);
  const [showTemplates, setShowTemplates] = React.useState(false);
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);

  // Refs for UI interactions
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const voiceRecognitionRef = useRef<any>(null);
  const voiceSynthesisRef = useRef<any>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = React.useState(true);

  // Smart scroll: only auto-scroll if user is near bottom
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // User is near bottom (within 100px) -> enable auto-scroll
    // User scrolled up -> disable auto-scroll, let them read at their own pace
    setShouldAutoScroll(distanceFromBottom < 100);
  }, []);

  const scrollToBottom = () => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, shouldAutoScroll]);

  // Attach scroll listener to detect manual scrolling
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: SavedConversation = JSON.parse(saved);
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        if (data.timestamp > sevenDaysAgo) {
          setMessages(data.messages);
          setConversationTitle(data.title);
          if (data.settings) {
            setSettings(prev => ({ ...prev, ...data.settings, showSettings: false }));
          }
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const data: SavedConversation = {
          messages,
          title: conversationTitle,
          settings: {
            mode: settings.mode,
            selectedAdvisors: settings.selectedAdvisors,
            showSettings: false,
            model: settings.model,
            enableResearch: settings.enableResearch,
          },
          timestamp: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (err) {
        console.error('Failed to save conversation:', err);
      }
    }
  }, [messages, conversationTitle, settings.mode, settings.selectedAdvisors, settings.model, settings.enableResearch]);

  // Save settings to memory whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        saveLastSettings({
          model: settings.model,
          mode: settings.mode,
          advisors: settings.selectedAdvisors,
          research: settings.enableResearch,
        });
      } catch (error) {
        console.error('Failed to save settings to memory:', error);
      }
    }
  }, [settings.model, settings.mode, settings.selectedAdvisors, settings.enableResearch]);

  // API Key Validation
  useEffect(() => {
    const validateKeys = async () => {
      try {
        const response = await fetch('/api/validate-keys');
        const data = await response.json();

        setApiKeysValid(data.valid);

        if (!data.valid) {
          showToast('API keys not configured correctly', 'error');
        }
      } catch (error) {
        console.error('Failed to validate API keys:', error);
      }
    };

    validateKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for API keys on mount
  useEffect(() => {
    if (!hasApiKeys()) {
      setShowApiKeySetup(true);
    }
  }, []);

  // Online/Offline Detection
  useEffect(() => {
    const handleOnline = () => {
      setLocalIsOnline(true);
      showToast('Back online', 'success');
    };

    const handleOffline = () => {
      setLocalIsOnline(false);
      showToast("You're offline. Check your connection.", 'error');
    };

    setLocalIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + Enter: Submit or Interrupt
      if (modifier && e.key === 'Enter' && input.trim()) {
        e.preventDefault();
        if (isDebating) {
          // User wants to interrupt - stop current debate and start new one
          stopDebate();
          setTimeout(() => startDebate(), 100); // Small delay to ensure clean state
        } else {
          startDebate();
        }
      }

      // Cmd/Ctrl + K: Focus input
      if (modifier && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }

      // Cmd/Ctrl + V: Toggle voice input
      if (modifier && e.key === 'v') {
        e.preventDefault();
        toggleVoiceInput();
      }

      // Cmd/Ctrl + R: Regenerate last answer
      if (modifier && e.key === 'r' && !isDebating && messages.some(m => m.type === 'final')) {
        e.preventDefault();
        startDebate(false, true);
        showToast('Regenerating answer...', 'info');
      }

      // Cmd/Ctrl + D: Download as Markdown (Shift for PDF)
      if (modifier && e.key === 'd' && messages.length > 0) {
        e.preventDefault();
        if (e.shiftKey) {
          downloadConversationPDF();
        } else {
          downloadConversationMarkdown();
        }
      }

      // Cmd/Ctrl + S: Share conversation
      if (modifier && e.key === 's' && messages.length > 0) {
        e.preventDefault();
        shareConversation();
      }

      // Cmd/Ctrl + T: Open templates
      if (modifier && e.key === 't') {
        e.preventDefault();
        setShowTemplates(true);
      }

      // Cmd/Ctrl + H: Toggle history
      if (modifier && e.key === 'h') {
        e.preventDefault();
        setShowHistory(!showHistory);
      }

      // Cmd/Ctrl + A: Toggle analytics
      if (modifier && e.key === 'a' && !e.shiftKey) {
        e.preventDefault();
        setShowAnalytics(!showAnalytics);
      }

      // Escape: Close settings/history/analytics
      if (e.key === 'Escape') {
        if (settings.showSettings) {
          setSettings(prev => ({ ...prev, showSettings: false }));
        }
        if (editingTitle) {
          setEditingTitle(false);
        }
        if (showHistory) {
          setShowHistory(false);
        }
        if (showAnalytics) {
          setShowAnalytics(false);
        }
        if (showTemplates) {
          setShowTemplates(false);
        }
        if (showApiKeySetup) {
          setShowApiKeySetup(false);
        }
      }

      // Cmd/Ctrl + /: Show shortcuts
      if (modifier && e.key === '/') {
        e.preventDefault();
        showToast('⌘+Enter: Submit | ⌘+K: Focus | ⌘+V: Voice | ⌘+R: Regenerate | ⌘+D: Download | ⌘+T: Templates | ⌘+H: History | ⌘+A: Analytics', 'info');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDebating, input, settings.showSettings, editingTitle, showHistory, showAnalytics, showTemplates, showApiKeySetup, messages.length, messages]);

  // Timer
  useEffect(() => {
    if (isDebating) {
      timerInterval.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - debateStartTimestamp) / 1000);
        setLocalElapsedTime(elapsed);
      }, 1000);
    } else {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
      setLocalElapsedTime(0);
    }

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [isDebating]);

  const calculateTimeEstimate = useCallback((mode: DebateMode, advisorCount: number) => {
    const baseTimePerAdvisor = 15;
    const rounds = mode === 'quick' ? 1 : mode === 'standard' ? 2 : 3;
    return Math.ceil(advisorCount * rounds * baseTimePerAdvisor);
  }, []);

  useEffect(() => {
    const estimate = calculateTimeEstimate(settings.mode, settings.selectedAdvisors.length);
    setTimeEstimate(estimate);
  }, [settings.mode, settings.selectedAdvisors, calculateTimeEstimate]);

  const generateTitle = useCallback((question: string) => {
    const words = question.trim().split(' ').slice(0, 8);
    const title = words.join(' ') + (question.split(' ').length > 8 ? '...' : '');
    return title;
  }, []);

  const generateFollowUpSuggestions = useCallback((finalAnswer: string, originalQuestion: string) => {
    const suggestions = [
      "What are the biggest risks with this approach?",
      "How do I get started with this today?",
      "What would success look like in 6 months?",
      "What am I missing or overlooking?"
    ];
    setFollowUpSuggestions(suggestions.slice(0, 3));
  }, [setFollowUpSuggestions]);

  const copyToClipboard = useCallback(async (text: string, messageId?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (messageId) setCopiedId(messageId);
      showToast('Copied to clipboard', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      showToast('Failed to copy', 'error');
    }
  }, [showToast, setCopiedId]);

  const exportConversation = useCallback(() => {
    const text = messages
      .filter(m => m.type !== 'system' && m.type !== 'error')
      .map(m => {
        if (m.type === 'user') return `You: ${m.content}\n`;
        if (m.type === 'agent') return `${PERSONAS[m.agent as keyof typeof PERSONAS]?.name || m.agent}: ${m.content}\n`;
        if (m.type === 'final') return `\nFinal Answer:\n${m.content}\n`;
        if (m.type === 'interruption') return `\n[You interrupted]: ${m.content}\n`;
        return '';
      })
      .join('\n');

    copyToClipboard(text);
  }, [messages, copyToClipboard]);

  const rateMessage = useCallback((messageId: string, rating: number) => {
    setMessages(prev => {
      const updated = prev.map(m =>
        m.id === messageId ? { ...m, rating } : m
      );

      // Track advisor performance in memory system
      const ratedMessage = updated.find(m => m.id === messageId);
      if (ratedMessage && ratedMessage.type === 'agent' && ratedMessage.agent) {
        try {
          updateAdvisorPerformance(ratedMessage.agent, rating);
        } catch (error) {
          console.error('Failed to update advisor performance:', error);
        }
      }

      return updated;
    });
    showToast(rating === 1 ? 'Feedback recorded' : 'Thanks for your feedback', 'success');
  }, [showToast]);

  const toggleAdvisor = useCallback((advisor: string) => {
    setSettings(prev => {
      const selected = prev.selectedAdvisors.includes(advisor)
        ? prev.selectedAdvisors.filter(a => a !== advisor)
        : [...prev.selectedAdvisors, advisor];

      if (selected.length < 2) {
        showToast('Select at least 2 advisors', 'error');
        return prev;
      }

      return { ...prev, selectedAdvisors: selected };
    });
  }, [showToast]);

  const saveToHistory = useCallback(() => {
    if (messages.length === 0) return;

    const userMessages = messages.filter(m => m.type === 'user');
    const finalAnswer = messages.filter(m => m.type === 'final').pop();

    if (!userMessages.length || !finalAnswer) return;

    const firstQuestion = userMessages[0].content;
    const preview = finalAnswer.content.slice(0, 150) + (finalAnswer.content.length > 150 ? '...' : '');

    // Check if any advisor response included research sources
    const hasResearch = messages.some(m => m.type === 'agent' && m.sources && m.sources.length > 0);

    const historyItem: ConversationHistoryItem = {
      id: `conv-${Date.now()}`,
      title: conversationTitle || generateTitle(firstQuestion),
      question: firstQuestion,
      timestamp: Date.now(),
      messageCount: messages.length,
      model: settings.model,
      mode: settings.mode,
      preview,
      messages,
      advisors: settings.selectedAdvisors,
      hasResearch,
    };

    saveConversationToHistory(historyItem);
  }, [messages, conversationTitle, settings.model, settings.mode, settings.selectedAdvisors, generateTitle]);

  const saveToAnalytics = useCallback(() => {
    if (messages.length === 0 || debateStartTimestamp === 0) return;

    const finalAnswer = messages.filter(m => m.type === 'final').pop();
    if (!finalAnswer) return;

    const duration = Math.floor((Date.now() - debateStartTimestamp) / 1000);
    const hadErrors = messages.some(m => m.type === 'error');
    const wasInterrupted = messages.some(m => m.type === 'interruption');
    const moderatorMessages = messages.filter(m => m.type === 'moderator');
    const roundCount = moderatorMessages.filter(m => m.content.includes('Round')).length || 1;
    const userMessages = messages.filter(m => m.type === 'user');
    const questionLength = userMessages[0]?.content.length || 0;
    const answerLength = finalAnswer.content.length;
    const hasResearch = messages.some(m => m.type === 'agent' && m.sources && m.sources.length > 0);

    // Get rating from final answer if exists
    const rating = finalAnswer.rating || 0;

    const analyticsData: DebateAnalytics = {
      id: `analytics-${Date.now()}`,
      timestamp: debateStartTimestamp,
      duration,
      model: settings.model,
      mode: settings.mode,
      advisors: settings.selectedAdvisors,
      advisorCount: settings.selectedAdvisors.length,
      researchUsed: hasResearch,
      rating,
      messageCount: messages.length,
      roundCount,
      hadErrors,
      wasInterrupted,
      questionLength,
      answerLength,
    };

    saveDebateAnalytics(analyticsData);
  }, [messages, debateStartTimestamp, settings.model, settings.mode, settings.selectedAdvisors]);

  const loadConversationFromHistory = useCallback((conv: ConversationHistoryItem) => {
    // Load the conversation into the current state
    setMessages(conv.messages);
    setConversationTitle(conv.title);
    setSettings(prev => ({
      ...prev,
      model: conv.model as any,
      mode: conv.mode as any,
      selectedAdvisors: conv.advisors,
    }));
    showToast('Conversation loaded', 'success');
  }, [showToast]);

  const shareConversation = useCallback(async () => {
    if (messages.length === 0) {
      showToast('No conversation to share', 'error');
      return;
    }

    const userMessages = messages.filter(m => m.type === 'user');
    const finalAnswer = messages.filter(m => m.type === 'final').pop();

    if (!userMessages.length || !finalAnswer) {
      showToast('Complete a debate before sharing', 'error');
      return;
    }

    const firstQuestion = userMessages[0].content;

    const shareableConv = {
      title: conversationTitle || generateTitle(firstQuestion),
      question: firstQuestion,
      messages,
      timestamp: Date.now(),
      model: settings.model as string,
      mode: settings.mode as string,
      advisors: settings.selectedAdvisors,
    };

    // Check if too large and truncate if needed
    const finalConv = isConversationTooLarge(shareableConv)
      ? truncateConversation(shareableConv)
      : shareableConv;

    if (isConversationTooLarge(shareableConv)) {
      showToast('Conversation truncated to fit in URL', 'info');
    }

    try {
      const url = await copyShareUrl(finalConv);
      showToast('Share link copied to clipboard!', 'success');
    } catch (error) {
      console.error('Failed to share:', error);
      showToast('Failed to create share link', 'error');
    }
  }, [messages, conversationTitle, settings.model, settings.mode, settings.selectedAdvisors, generateTitle, showToast]);

  const downloadConversationMarkdown = useCallback(() => {
    if (messages.length === 0) {
      showToast('No conversation to download', 'error');
      return;
    }

    const userMessages = messages.filter(m => m.type === 'user');
    const finalAnswer = messages.filter(m => m.type === 'final').pop();

    if (!userMessages.length || !finalAnswer) {
      showToast('Complete a debate before downloading', 'error');
      return;
    }

    const firstQuestion = userMessages[0].content;

    const shareableConv = {
      title: conversationTitle || generateTitle(firstQuestion),
      question: firstQuestion,
      messages,
      timestamp: Date.now(),
      model: settings.model,
      mode: settings.mode,
      advisors: settings.selectedAdvisors,
    };

    downloadMarkdown(shareableConv);
    showToast('Downloading as Markdown...', 'success');
  }, [messages, conversationTitle, settings.model, settings.mode, settings.selectedAdvisors, generateTitle, showToast]);

  const downloadConversationPDF = useCallback(async () => {
    if (messages.length === 0) {
      showToast('No conversation to download', 'error');
      return;
    }

    const userMessages = messages.filter(m => m.type === 'user');
    const finalAnswer = messages.filter(m => m.type === 'final').pop();

    if (!userMessages.length || !finalAnswer) {
      showToast('Complete a debate before downloading', 'error');
      return;
    }

    const firstQuestion = userMessages[0].content;

    try {
      const { exportToPDF } = await import('@/lib/utils/pdf-export');
      exportToPDF({
        title: conversationTitle || generateTitle(firstQuestion),
        question: firstQuestion,
        messages,
        timestamp: Date.now(),
        model: settings.model,
        mode: settings.mode,
        advisors: settings.selectedAdvisors,
      });
      showToast('Opening PDF print dialog...', 'success');
    } catch (error) {
      console.error('PDF export error:', error);
      showToast('Failed to export PDF', 'error');
    }
  }, [messages, conversationTitle, settings.model, settings.mode, settings.selectedAdvisors, generateTitle, showToast]);

  const handleSaveApiKeys = (keys: { anthropic: string; tavily?: string }) => {
    saveApiKeys(keys);
    setCurrentApiKeys(keys);
    showToast('API keys saved successfully!', 'success');
  };

  // Voice Input Handler
  const toggleVoiceInput = useCallback(async () => {
    if (!voiceRecognitionRef.current) {
      // Lazy load voice utilities
      const { VoiceRecognition } = await import('@/lib/utils/voice');

      if (!VoiceRecognition.isSupported()) {
        showToast('Voice input not supported in this browser', 'error');
        return;
      }

      voiceRecognitionRef.current = new VoiceRecognition();
    }

    if (isVoiceListening) {
      voiceRecognitionRef.current.stop();
      setIsVoiceListening(false);
    } else {
      voiceRecognitionRef.current.start(
        (transcript: string, isFinal: boolean) => {
          setInput(transcript);
          if (isFinal) {
            setIsVoiceListening(false);
          }
        },
        (error: any) => {
          showToast(`Voice input error: ${error}`, 'error');
          setIsVoiceListening(false);
        }
      );
      setIsVoiceListening(true);
      showToast('Listening...', 'info');
    }
  }, [isVoiceListening, showToast, setInput]);


  // Template Selection Handler
  const handleSelectTemplate = useCallback((template: PromptTemplate) => {
    setInput(template.template);

    // Apply template settings if specified
    if (template.mode) {
      setSettings(prev => ({ ...prev, mode: template.mode! }));
    }
    if (template.advisors && template.advisors.length > 0) {
      setSettings(prev => ({ ...prev, selectedAdvisors: template.advisors as AdvisorName[] }));
    }

    showToast(`Template "${template.title}" loaded`, 'success');
    inputRef.current?.focus();
  }, [setInput, setSettings, showToast]);

  const getAgentColor = (agent?: string) => {
    if (!agent) return '#B1ADA1';
    const persona = PERSONAS[agent as keyof typeof PERSONAS];
    return persona?.color || '#B1ADA1';
  };

  const getAgentAvatar = (agent?: string) => {
    if (!agent) return '🤖';
    const persona = PERSONAS[agent as keyof typeof PERSONAS];
    return persona?.avatar || '🤖';
  };

  const getAgentName = (agent?: string) => {
    if (!agent) return 'System';
    const persona = PERSONAS[agent as keyof typeof PERSONAS];
    return persona?.name || agent;
  };

  const getModeConfig = (mode: DebateMode) => {
    switch (mode) {
      case 'quick':
        return { icon: Zap, label: 'Quick', desc: '1 round, ~90s', color: 'text-yellow-500' };
      case 'standard':
        return { icon: Brain, label: 'Standard', desc: '2 rounds, ~3min', color: 'text-blue-500' };
      case 'deep':
        return { icon: Sparkles, label: 'Deep', desc: '3 rounds, ~5min', color: 'text-purple-500' };
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const lastFinalAnswer = useMemo(() =>
    messages.filter(m => m.type === 'final').pop(),
    [messages]
  );

  // Read final answer aloud when voice is enabled
  useEffect(() => {
    if (!voiceEnabled || !lastFinalAnswer || !voiceSynthesisRef.current) return;

    const synthesis = voiceSynthesisRef.current;
    setIsVoiceSpeaking(true);

    synthesis.speak(lastFinalAnswer.content, {
      onEnd: () => setIsVoiceSpeaking(false),
      onStart: () => showToast('Reading answer aloud', 'info')
    });

    return () => {
      synthesis.stop();
    };
  }, [lastFinalAnswer, voiceEnabled, showToast]);

  return (
    <div className="flex flex-col h-screen bg-background font-mono">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={cn(
              "px-4 py-3 rounded-lg shadow-lg animate-slide-in flex items-center gap-2 min-w-[200px]",
              toast.type === 'success' && "bg-primary text-white",
              toast.type === 'error' && "bg-red-500 text-white",
              toast.type === 'info' && "bg-foreground text-surface",
              toast.type === 'warning' && "bg-yellow-500 text-white"
            )}
          >
            {toast.type === 'success' && <CheckCheck className="w-4 h-4" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4" />}
            {toast.type === 'info' && <Info className="w-4 h-4" />}
            {toast.type === 'warning' && <Clock className="w-4 h-4" />}
            <span className="text-sm flex-1">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Offline Indicator */}
      {!localIsOnline && (
        <div className="fixed top-16 right-4 z-50 px-4 py-2 rounded-lg shadow-lg bg-red-500 text-white flex items-center gap-2 text-sm">
          <WifiOff className="w-4 h-4" />
          <span>Offline</span>
        </div>
      )}

      {/* Research Indicator */}
      {isResearching && (
        <div className="fixed top-16 right-4 z-50 px-4 py-2 rounded-lg shadow-lg bg-blue-500 text-white flex items-center gap-2 text-sm animate-pulse">
          <Search className="w-4 h-4 animate-spin" />
          <span>{researchQuery}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-surface border-b border-muted px-4 sm:px-6 py-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex-shrink-0">
                {/* Professional Logo */}
                <div className="hidden lg:block">
                  <Logo size="md" />
                </div>
                <div className="lg:hidden">
                  <LogoCompact />
                </div>
                {conversationTitle ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    {editingTitle ? (
                      <input
                        type="text"
                        value={conversationTitle}
                        onChange={(e) => setConversationTitle(e.target.value)}
                        onBlur={() => setEditingTitle(false)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                        className="text-[10px] sm:text-xs text-muted bg-transparent border-b border-primary outline-none max-w-[200px]"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => setEditingTitle(true)}
                        className="text-[10px] sm:text-xs text-muted hover:text-foreground truncate max-w-[200px]"
                      >
                        {conversationTitle}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] sm:text-xs text-muted mt-0.5">AI Council</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Desktop: Show all buttons (only on large screens >= 1024px) */}
              <div className="hidden lg:flex items-center gap-2">
                {/* Model indicator */}
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted/20 text-[10px] text-muted" title={`Using ${MODEL_CONFIG[settings.model].label}`}>
                  <Cpu className="w-3 h-3" />
                  <span>{MODEL_CONFIG[settings.model].label}</span>
                </div>

                {localIsOnline && messages.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted" title="Online">
                    <Wifi className="w-3 h-3 text-green-500" />
                  </div>
                )}

                {isDebating && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">
                        {formatTime(localElapsedTime)} / {formatTime(timeEstimate)}
                      </span>
                    </div>
                    <button
                      onClick={stopDebate}
                      className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Stop debate (Esc)"
                    >
                      <StopCircle className="w-4 h-4" />
                    </button>
                  </>
                )}

                {messages.length > 0 && !isDebating && (
                  <>
                    <button
                      onClick={shareConversation}
                      className="p-2 text-muted hover:text-foreground hover:bg-surface rounded-lg transition-colors"
                      title="Share conversation"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={downloadConversationMarkdown}
                      className="p-2 text-muted hover:text-foreground hover:bg-surface rounded-lg transition-colors"
                      title="Download as Markdown (⌘+D)"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={downloadConversationPDF}
                      className="p-2 text-muted hover:text-foreground hover:bg-surface rounded-lg transition-colors"
                      title="Export as PDF"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={exportConversation}
                      className="p-2 text-muted hover:text-foreground hover:bg-surface rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={clearConversation}
                      className="p-2 text-muted hover:text-foreground hover:bg-surface rounded-lg transition-colors"
                      title="New conversation"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </>
                )}

                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    showHistory
                      ? "bg-primary text-white"
                      : "text-muted hover:text-foreground hover:bg-surface"
                  )}
                  title="Conversation history"
                >
                  <History className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    showAnalytics
                      ? "bg-primary text-white"
                      : "text-muted hover:text-foreground hover:bg-surface"
                  )}
                  title="Analytics dashboard"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowTemplates(true)}
                  className="p-2 hover:bg-surface rounded-lg transition-colors"
                  title="Prompt Templates"
                >
                  <Lightbulb className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setShowApiKeySetup(true)}
                  className="p-2 hover:bg-surface rounded-lg transition-colors"
                  title="API Key Settings"
                >
                  <Key className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setSettings(prev => ({ ...prev, showSettings: !prev.showSettings }))}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    settings.showSettings
                      ? "bg-primary text-white"
                      : "text-muted hover:text-foreground hover:bg-surface"
                  )}
                  title="Debate settings"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile/Tablet: Stop button (when debating) or Primary action + Overflow menu (< 1024px) */}
              <div className="flex lg:hidden items-center gap-2">
                {isDebating ? (
                  <button
                    onClick={stopDebate}
                    className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Stop debate"
                  >
                    <StopCircle className="w-5 h-5" />
                  </button>
                ) : (
                  <>
                    {messages.length > 0 && (
                      <button
                        onClick={clearConversation}
                        className="p-2 text-muted hover:text-foreground hover:bg-surface rounded-lg transition-colors"
                        title="New conversation"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    )}

                    {/* Overflow menu button */}
                    <div className="relative">
                      <button
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        className="p-2 text-muted hover:text-foreground hover:bg-surface rounded-lg transition-colors"
                        title="More options"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {/* Dropdown menu */}
                      {showMobileMenu && (
                        <>
                          {/* Backdrop */}
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowMobileMenu(false)}
                          />

                          {/* Menu */}
                          <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-muted rounded-lg shadow-xl z-50 py-1">
                            {messages.length > 0 && (
                              <>
                                <div className="px-3 py-1.5 text-[10px] font-semibold text-muted uppercase tracking-wide">
                                  Export
                                </div>
                                <button
                                  onClick={() => { shareConversation(); setShowMobileMenu(false); }}
                                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-background transition-colors flex items-center gap-3"
                                >
                                  <Share2 className="w-4 h-4 text-muted" />
                                  Share Conversation
                                </button>
                                <button
                                  onClick={() => { downloadConversationMarkdown(); setShowMobileMenu(false); }}
                                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-background transition-colors flex items-center gap-3"
                                >
                                  <Download className="w-4 h-4 text-muted" />
                                  Download Markdown
                                </button>
                                <button
                                  onClick={() => { downloadConversationPDF(); setShowMobileMenu(false); }}
                                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-background transition-colors flex items-center gap-3"
                                >
                                  <FileText className="w-4 h-4 text-muted" />
                                  Export PDF
                                </button>
                                <button
                                  onClick={() => { exportConversation(); setShowMobileMenu(false); }}
                                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-background transition-colors flex items-center gap-3"
                                >
                                  <Copy className="w-4 h-4 text-muted" />
                                  Copy to Clipboard
                                </button>
                                <div className="border-t border-muted my-1" />
                              </>
                            )}

                            <div className="px-3 py-1.5 text-[10px] font-semibold text-muted uppercase tracking-wide">
                              View
                            </div>
                            <button
                              onClick={() => { setShowHistory(true); setShowMobileMenu(false); }}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-background transition-colors flex items-center gap-3"
                            >
                              <History className="w-4 h-4 text-muted" />
                              Conversation History
                            </button>
                            <button
                              onClick={() => { setShowAnalytics(true); setShowMobileMenu(false); }}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-background transition-colors flex items-center gap-3"
                            >
                              <BarChart3 className="w-4 h-4 text-muted" />
                              Analytics Dashboard
                            </button>

                            <div className="border-t border-muted my-1" />

                            <div className="px-3 py-1.5 text-[10px] font-semibold text-muted uppercase tracking-wide">
                              Configure
                            </div>
                            <button
                              onClick={() => { setShowTemplates(true); setShowMobileMenu(false); }}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-background transition-colors flex items-center gap-3"
                            >
                              <Lightbulb className="w-4 h-4 text-muted" />
                              Question Templates
                            </button>
                            <button
                              onClick={() => { setShowApiKeySetup(true); setShowMobileMenu(false); }}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-background transition-colors flex items-center gap-3"
                            >
                              <Key className="w-4 h-4 text-muted" />
                              API Key Settings
                            </button>
                            <button
                              onClick={() => { setSettings(prev => ({ ...prev, showSettings: true })); setShowMobileMenu(false); }}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-background transition-colors flex items-center gap-3"
                            >
                              <Settings2 className="w-4 h-4 text-muted" />
                              Debate Settings
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {isDebating && progress > 0 && (
            <div className="mt-3 w-full bg-muted/20 rounded-full h-1 overflow-hidden">
              <div
                className="progress-bar h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Settings Panel */}
          {settings.showSettings && !isDebating && (
            <div className="mt-4 p-4 bg-background rounded-lg border border-muted animate-slide-in space-y-4">
              {/* Model Selection */}
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 block">
                  Claude Model
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(MODEL_CONFIG) as ClaudeModel[]).map((model) => {
                    const config = MODEL_CONFIG[model];
                    const Icon = config.icon;
                    return (
                      <button
                        key={model}
                        onClick={() => setSettings(prev => ({ ...prev, model }))}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all text-left",
                          settings.model === model
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={cn("w-4 h-4", config.color)} />
                          <span className="font-semibold text-sm">{config.label}</span>
                        </div>
                        <p className="text-[10px] text-muted">{config.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Debate Mode */}
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 block">
                  Debate Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['quick', 'standard', 'deep'] as const).map((mode) => {
                    const config = getModeConfig(mode);
                    const Icon = config.icon;
                    return (
                      <button
                        key={mode}
                        onClick={() => setSettings(prev => ({ ...prev, mode }))}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all text-left",
                          settings.mode === mode
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={cn("w-4 h-4", config.color)} />
                          <span className="font-semibold text-sm">{config.label}</span>
                        </div>
                        <p className="text-[10px] text-muted">{config.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Research Toggle */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableResearch}
                    onChange={(e) => setSettings(prev => ({ ...prev, enableResearch: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Enable Research
                    </div>
                    <p className="text-[10px] text-muted">Advisors can search the web for real-time data</p>
                  </div>
                </label>
              </div>

              {/* Advisor Selector */}
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 block">
                  Select Advisors ({settings.selectedAdvisors.length}/5)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {ADVISOR_NAMES.map((name) => {
                    const isSelected = settings.selectedAdvisors.includes(name);
                    return (
                      <button
                        key={name}
                        onClick={() => toggleAdvisor(name)}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all text-center relative",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/50 opacity-50"
                        )}
                      >
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center z-10">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="flex flex-col items-center gap-2">
                          <AdvisorAvatar agent={name} size="lg" showBorder={isSelected} />
                          <div className="text-[10px] font-medium truncate">
                            {getAgentName(name).split(' ')[0]}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => setSettings(prev => ({ ...prev, showSettings: false }))}
                className="w-full btn-secondary py-2 text-sm"
              >
                Done (Esc)
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Debate Progress Visualizer */}
          {(isDebating || messages.length > 0) && (
            <DebateVisualizer
              messages={messages}
              currentRound={currentRound}
              maxRounds={settings.mode === 'quick' ? 1 : settings.mode === 'deep' ? 3 : 2}
              selectedAdvisors={settings.selectedAdvisors}
              isDebating={isDebating}
            />
          )}

          {/* Live Status Updates */}
          <StatusDisplay
            status={currentStatus}
            isDebating={isDebating}
            currentRound={currentRound}
          />

          {messages.length === 0 && (
            <div className="text-center py-12 sm:py-16 animate-fade-in">
              {/* Professional icon instead of emoji */}
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4 sm:mb-6">
                <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-primary" strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2 sm:mb-3">
                Welcome to the AI Council
              </h1>
              <p className="text-muted max-w-lg mx-auto mb-6 sm:mb-8 text-sm sm:text-base px-4 leading-relaxed">
                Five specialized AI advisors analyze your questions from different angles to deliver comprehensive, balanced insights.
              </p>

              <div className="grid grid-cols-5 gap-3 sm:gap-4 max-w-xl mx-auto mb-6 sm:mb-8 px-4">
                {ADVISOR_NAMES.map((name) => (
                  <div key={name} className="text-center group cursor-default">
                    <div className="relative mb-1.5 transition-transform duration-200 group-hover:scale-105">
                      <AdvisorAvatar agent={name} size="md" />
                    </div>
                    <div className="text-[10px] sm:text-xs font-medium text-muted/80 truncate">
                      {getAgentName(name).split(' ')[0]}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-left max-w-lg mx-auto px-4">
                <p className="text-xs font-medium text-muted uppercase tracking-wider mb-3">
                  Sample Questions
                </p>
                {[
                  "How should I validate my startup idea before investing significant resources?",
                  "What are the key metrics I should track for my SaaS business?",
                  "Should I raise venture capital or bootstrap my startup?"
                ].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    className="w-full text-left px-4 py-3 rounded-lg bg-surface/50 border border-muted/50 hover:border-primary/30 hover:bg-surface text-xs sm:text-sm text-foreground/90 transition-all duration-200 hover:shadow-sm"
                  >
                    <span className="line-clamp-1">{q}</span>
                  </button>
                ))}
              </div>

              <div className="mt-8 text-[11px] text-muted/60 flex items-center justify-center gap-3 font-mono">
                <span className="hidden sm:inline">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted/10 border border-muted/20">⌘</kbd>
                  <span className="mx-1">+</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted/10 border border-muted/20">Enter</kbd>
                  <span className="ml-1.5">Submit</span>
                </span>
                <span className="hidden sm:inline text-muted/30">|</span>
                <span className="hidden sm:inline">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted/10 border border-muted/20">⌘</kbd>
                  <span className="mx-1">+</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted/10 border border-muted/20">K</kbd>
                  <span className="ml-1.5">Focus</span>
                </span>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn('animate-slide-in group', {
                'flex justify-end': message.type === 'user' || message.type === 'interruption',
              })}
            >
              {message.type === 'user' || message.type === 'interruption' ? (
                <div className="relative max-w-2xl w-full sm:w-auto">
                  <div className={cn(
                    "rounded-2xl px-4 sm:px-6 py-3 sm:py-4",
                    message.type === 'interruption'
                      ? "bg-yellow-500 text-white border-2 border-yellow-600"
                      : "bg-primary text-white"
                  )}>
                    {message.type === 'interruption' && (
                      <div className="text-[10px] uppercase font-bold mb-1 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        Interrupted
                      </div>
                    )}
                    <div className="message-content text-sm sm:text-base">
                      {highlightResearchKeyword(message.content)}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(message.content, message.id)}
                    className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-surface rounded-lg hidden sm:block"
                  >
                    {copiedId === message.id ? (
                      <CheckCheck className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted" />
                    )}
                  </button>
                </div>
              ) : message.type === 'agent' ? (
                <div className="flex gap-2 sm:gap-3 max-w-3xl group">
                  <AdvisorAvatar
                    agent={message.agent || ''}
                    size="md"
                    isStreaming={message.isStreaming}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="font-semibold text-xs sm:text-sm truncate"
                        style={{ color: getAgentColor(message.agent) }}
                      >
                        {getAgentName(message.agent)}
                      </span>
                      <span className="text-[10px] sm:text-xs text-muted flex-shrink-0">
                        {formatTimestamp(message.timestamp)}
                      </span>
                      {message.isStreaming && (
                        <Loader2 className="w-3 h-3 animate-spin text-muted" />
                      )}
                    </div>
                    <div className="bg-surface rounded-2xl px-4 sm:px-6 py-3 sm:py-4 shadow-sm border border-muted relative">
                      <div className="message-content text-foreground text-sm sm:text-base prose prose-sm max-w-none">
                        {message.content ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        ) : message.isStreaming ? (
                          'Thinking...'
                        ) : (
                          ''
                        )}
                        {message.isStreaming && (
                          <span className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                          </span>
                        )}
                      </div>

                      {/* Sources */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-muted/50">
                          <div className="text-[10px] font-semibold text-muted uppercase mb-2">Sources:</div>
                          <div className="space-y-1">
                            {message.sources.map((source, idx) => (
                              <a
                                key={idx}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-2 text-[11px] text-blue-600 hover:text-blue-700 hover:underline"
                              >
                                <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span className="truncate">{source.title}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Message Actions */}
                      {!message.isStreaming && (
                        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-muted/50">
                          <button
                            onClick={() => rateMessage(message.id, message.rating === 1 ? 0 : 1)}
                            className={cn(
                              "p-1.5 rounded transition-colors",
                              message.rating === 1
                                ? "bg-green-100 text-green-600"
                                : "hover:bg-surface text-muted"
                            )}
                            title="Helpful"
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => rateMessage(message.id, message.rating === -1 ? 0 : -1)}
                            className={cn(
                              "p-1.5 rounded transition-colors",
                              message.rating === -1
                                ? "bg-red-100 text-red-600"
                                : "hover:bg-surface text-muted"
                            )}
                            title="Not helpful"
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                          <div className="flex-1" />
                          <button
                            onClick={() => copyToClipboard(message.content, message.id)}
                            className="p-1.5 rounded hover:bg-surface text-muted transition-colors"
                            title="Copy"
                          >
                            {copiedId === message.id ? (
                              <CheckCheck className="w-3 h-3 text-primary" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : message.type === 'moderator' ? (
                <div className="flex gap-2 sm:gap-3 max-w-3xl">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-muted/20 flex items-center justify-center text-base sm:text-lg">
                    ⚖️
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-xs sm:text-sm text-foreground">
                        Moderator
                      </span>
                      <span className="text-[10px] sm:text-xs text-muted">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    <div className="bg-surface rounded-2xl px-4 sm:px-6 py-3 sm:py-4 border border-muted">
                      <div className="message-content text-foreground text-xs sm:text-sm prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ) : message.type === 'system' && message.sources && message.sources.length > 0 ? (
                <div className="card p-4 sm:p-6 border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-transparent">
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-sm sm:text-base text-blue-900">
                      {message.content}
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {message.sources.map((source, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-blue-200">
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-sm text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1"
                            >
                              {source.title}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{source.snippet}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : message.type === 'final' ? (
                <div className="card p-6 sm:p-8 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent relative group">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <CheckCheck className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">
                      Council Consensus
                    </h3>
                  </div>
                  <div className="message-content text-foreground prose prose-sm max-w-none text-sm sm:text-base mb-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4 border-t border-muted/30">
                    <button
                      onClick={() => copyToClipboard(message.content, message.id)}
                      className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
                    >
                      {copiedId === message.id ? (
                        <>
                          <CheckCheck className="w-3 h-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => startDebate(false, true)}
                      disabled={isDebating}
                      className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Repeat className="w-3 h-3" />
                      Regenerate
                    </button>
                    <button
                      onClick={() => startDebate(true, false)}
                      disabled={isDebating}
                      className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <PlayCircle className="w-3 h-3" />
                      Continue Debate
                    </button>
                  </div>
                </div>
              ) : message.type === 'error' ? (
                <div className="card p-4 border-red-300 bg-red-50">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium">{message.content}</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="bg-muted/30 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs text-muted">
                    {message.content}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Follow-up Suggestions */}
          {followUpSuggestions.length > 0 && lastFinalAnswer && !isDebating && (
            <div className="animate-fade-in">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" />
                Suggested Follow-ups
              </p>
              <div className="grid gap-2">
                {followUpSuggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="text-left px-4 py-3 rounded-lg bg-surface border border-muted hover:border-primary text-sm text-foreground transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-surface border-t border-muted px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isDebating) {
                // User wants to interrupt - stop current debate and start new one
                stopDebate();
                setTimeout(() => startDebate(), 100); // Small delay to ensure clean state
              } else {
                startDebate();
              }
            }}
            className="space-y-2"
          >
            {/* Input field - no overlapping elements */}
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isDebating ? "Interrupt debate..." : "Ask the council a question..."}
                disabled={!localIsOnline}
                className={cn(
                  "input text-sm sm:text-base w-full pr-16",
                  isDebating && "border-yellow-500 bg-yellow-50"
                )}
              />
              {/* Character count - positioned safely in the padding area */}
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs text-muted pointer-events-none">
                {input.length}
              </span>
            </div>

            {/* Action bar - below input, no overlap */}
            <div className="flex items-center gap-2">
              {/* Voice input button */}
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={cn(
                  "p-2 sm:p-2.5 rounded-lg transition-all flex items-center gap-1.5 text-xs sm:text-sm",
                  isVoiceListening
                    ? "bg-red-500 text-white animate-pulse shadow-lg"
                    : "bg-surface border border-muted hover:border-primary hover:bg-primary/5 text-muted hover:text-foreground"
                )}
                title={isVoiceListening ? "Stop listening (Cmd+V)" : "Voice input (Cmd+V)"}
                disabled={isDebating || !localIsOnline}
              >
                {isVoiceListening ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span className="hidden sm:inline">Listening...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span className="hidden sm:inline">Voice</span>
                  </>
                )}
              </button>

              {/* Templates button - helpful for mobile users */}
              <button
                type="button"
                onClick={() => setShowTemplates(true)}
                className="p-2 sm:p-2.5 rounded-lg bg-surface border border-muted hover:border-primary hover:bg-primary/5 transition-all"
                title="Question templates"
                disabled={isDebating}
              >
                <Lightbulb className="w-4 h-4 text-muted hover:text-foreground" />
              </button>

              <div className="flex-1" />

              {/* Submit button */}
              <button
                type="submit"
                disabled={!input.trim() || !localIsOnline}
                className={cn(
                  "px-4 sm:px-6 py-2 sm:py-2.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium text-sm transition-all",
                  isDebating
                    ? "bg-yellow-500 hover:bg-yellow-600 text-white shadow-md"
                    : "btn-primary shadow-md hover:shadow-lg"
                )}
                title={!localIsOnline ? "You're offline" : isDebating ? "Interrupt and ask new question" : "Submit question (Enter)"}
              >
                {isDebating ? (
                  <>
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm">Interrupt</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm">Ask Council</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Mode indicator */}
          {!isDebating && messages.length === 0 && (
            <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-muted flex-wrap">
              <span className="flex items-center gap-1">
                {React.createElement(getModeConfig(settings.mode).icon, { className: "w-3 h-3" })}
                {getModeConfig(settings.mode).label} mode
              </span>
              <span>•</span>
              <span>{settings.selectedAdvisors.length} advisors</span>
              <span>•</span>
              <span>~{formatTime(timeEstimate)}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {React.createElement(MODEL_CONFIG[settings.model].icon, { className: "w-3 h-3" })}
                {MODEL_CONFIG[settings.model].label}
              </span>
              {settings.enableResearch && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Search className="w-3 h-3" />
                    Research enabled
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Conversation History Sidebar */}
      <ConversationHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onLoadConversation={loadConversationFromHistory}
      />

      {/* Analytics Dashboard */}
      <AnalyticsDashboard
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
      />

      {/* API Key Setup Modal */}
      <ApiKeySetup
        isOpen={showApiKeySetup}
        onClose={() => setShowApiKeySetup(false)}
        onSave={handleSaveApiKeys}
        initialKeys={currentApiKeys}
      />

      {/* Template Selector */}
      <TemplateSelector
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectTemplate={handleSelectTemplate}
      />
    </div>
  );
}
