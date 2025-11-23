'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Trash2,
  Download,
  Clock,
  MessageSquare,
  ChevronRight,
  Calendar,
  Cpu,
  Users,
  AlertCircle,
  BarChart3,
  FileText,
} from 'lucide-react';
import { cn, formatTimestamp } from '@/lib/utils';
import {
  getConversationHistory,
  deleteConversation,
  clearAllHistory,
  searchConversations,
  getConversationsByDate,
  exportConversationAsMarkdown,
  getStorageStats,
  type ConversationHistoryItem,
} from '@/lib/utils/conversation-storage';

interface ConversationHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadConversation: (conversation: ConversationHistoryItem) => void;
}

export default function ConversationHistory({
  isOpen,
  onClose,
  onLoadConversation,
}: ConversationHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<ConversationHistoryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped');

  // Load conversations on mount and when sidebar opens
  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  const loadConversations = () => {
    const history = getConversationHistory();
    setConversations(history);
  };

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }
    return searchConversations(searchQuery);
  }, [searchQuery, conversations]);

  // Group conversations by date
  const groupedConversations = useMemo(() => {
    return getConversationsByDate();
  }, [conversations]);

  // Get storage statistics
  const storageStats = useMemo(() => {
    return getStorageStats();
  }, [conversations]);

  const handleLoadConversation = (conv: ConversationHistoryItem) => {
    setSelectedId(conv.id);
    onLoadConversation(conv);
    onClose();
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (confirm('Delete this conversation?')) {
      const success = deleteConversation(id);
      if (success) {
        loadConversations();
      }
    }
  };

  const handleClearAll = () => {
    if (confirm('Delete all conversation history? This cannot be undone.')) {
      const success = clearAllHistory();
      if (success) {
        loadConversations();
      }
    }
  };

  const handleExport = (conv: ConversationHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();

    const markdown = exportConversationAsMarkdown(conv);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conv.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const ConversationCard = ({ conv }: { conv: ConversationHistoryItem }) => (
    <button
      onClick={() => handleLoadConversation(conv)}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all group hover:border-primary hover:bg-primary/5',
        selectedId === conv.id ? 'border-primary bg-primary/5' : 'border-muted bg-surface'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-semibold text-sm text-foreground line-clamp-2 flex-1">
          {conv.title}
        </h4>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => handleExport(conv, e)}
            className="p-1 rounded hover:bg-muted/20 text-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            title="Export as Markdown"
          >
            <Download className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => handleDeleteConversation(conv.id, e)}
            className="p-1 rounded hover:bg-red-100 text-muted hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete conversation"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <p className="text-xs text-muted line-clamp-2 mb-2">{conv.preview}</p>

      <div className="flex items-center gap-3 text-[10px] text-muted">
        <span className="flex items-center gap-1" title="Date">
          <Clock className="w-3 h-3" />
          {formatDate(conv.timestamp)}
        </span>
        <span className="flex items-center gap-1" title="Messages">
          <MessageSquare className="w-3 h-3" />
          {conv.messageCount}
        </span>
        <span className="flex items-center gap-1" title="Model">
          <Cpu className="w-3 h-3" />
          {conv.model.includes('opus') ? 'Opus' : conv.model.includes('sonnet') ? 'Sonnet' : 'Haiku'}
        </span>
        {conv.hasResearch && (
          <span className="flex items-center gap-1 text-blue-600" title="Used research">
            <Search className="w-3 h-3" />
          </span>
        )}
      </div>
    </button>
  );

  const GroupedView = () => {
    const groups = [
      { key: 'today', label: 'Today', items: groupedConversations.today },
      { key: 'yesterday', label: 'Yesterday', items: groupedConversations.yesterday },
      { key: 'thisWeek', label: 'This Week', items: groupedConversations.thisWeek },
      { key: 'thisMonth', label: 'This Month', items: groupedConversations.thisMonth },
      { key: 'older', label: 'Older', items: groupedConversations.older },
    ];

    return (
      <div className="space-y-4">
        {groups.map(
          (group) =>
            group.items.length > 0 && (
              <div key={group.key}>
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-2 flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  {group.label}
                </h3>
                <div className="space-y-2">
                  {group.items.map((conv) => (
                    <ConversationCard key={conv.id} conv={conv} />
                  ))}
                </div>
              </div>
            )
        )}
      </div>
    );
  };

  const ListView = () => (
    <div className="space-y-2">
      {filteredConversations.map((conv) => (
        <ConversationCard key={conv.id} conv={conv} />
      ))}
    </div>
  );

  const StatsView = () => (
    <div className="space-y-4 p-4 bg-surface rounded-lg border border-muted">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <BarChart3 className="w-4 h-4" />
        Storage Statistics
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-background rounded-lg">
          <div className="text-2xl font-bold text-foreground">{storageStats.totalConversations}</div>
          <div className="text-[10px] text-muted uppercase">Conversations</div>
        </div>
        <div className="p-3 bg-background rounded-lg">
          <div className="text-2xl font-bold text-foreground">{storageStats.totalMessages}</div>
          <div className="text-[10px] text-muted uppercase">Messages</div>
        </div>
        <div className="p-3 bg-background rounded-lg">
          <div className="text-2xl font-bold text-foreground">{storageStats.estimatedSizeKB}</div>
          <div className="text-[10px] text-muted uppercase">KB Used</div>
        </div>
        <div className="p-3 bg-background rounded-lg">
          <div className="text-2xl font-bold text-foreground">
            {storageStats.oldestConversation
              ? Math.ceil(
                  (Date.now() - storageStats.oldestConversation) / (24 * 60 * 60 * 1000)
                )
              : 0}
          </div>
          <div className="text-[10px] text-muted uppercase">Days Old</div>
        </div>
      </div>

      <div className="pt-3 border-t border-muted">
        <p className="text-xs text-muted">
          History keeps your last 50 conversations. Older conversations are automatically removed.
        </p>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-background border-l border-muted shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="p-4 border-b border-muted flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              History
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface text-muted hover:text-foreground transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-muted bg-surface text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setViewMode('grouped')}
              className={cn(
                'flex-1 px-3 py-1.5 text-xs rounded-lg transition-colors',
                viewMode === 'grouped'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-muted hover:text-foreground border border-muted'
              )}
            >
              Grouped
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex-1 px-3 py-1.5 text-xs rounded-lg transition-colors',
                viewMode === 'list'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-muted hover:text-foreground border border-muted'
              )}
            >
              List
            </button>
            <button
              onClick={() => setShowStats(!showStats)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-lg transition-colors',
                showStats
                  ? 'bg-primary text-white'
                  : 'bg-surface text-muted hover:text-foreground border border-muted'
              )}
              title="Show statistics"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {showStats ? (
            <StatsView />
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/10 mb-4">
                {searchQuery ? (
                  <Search className="w-8 h-8 text-muted" />
                ) : (
                  <MessageSquare className="w-8 h-8 text-muted" />
                )}
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-2">
                {searchQuery ? 'No results found' : 'No conversations yet'}
              </h3>
              <p className="text-xs text-muted max-w-xs mx-auto">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Start a conversation and it will appear here'}
              </p>
            </div>
          ) : searchQuery ? (
            <ListView />
          ) : viewMode === 'grouped' ? (
            <GroupedView />
          ) : (
            <ListView />
          )}
        </div>

        {/* Footer */}
        {conversations.length > 0 && (
          <div className="p-4 border-t border-muted flex-shrink-0">
            <button
              onClick={handleClearAll}
              className="w-full btn-secondary py-2 text-sm flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="w-4 h-4" />
              Clear All History
            </button>
          </div>
        )}
      </div>
    </>
  );
}
