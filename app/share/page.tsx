'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { decodeConversation } from '@/lib/utils/share-utils';
import { PERSONAS } from '@/lib/agents/personas';
import { formatTimestamp, cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy, CheckCheck, Download, ExternalLink, AlertCircle,
  MessageSquare, Clock, Cpu, Users, Brain
} from 'lucide-react';

function SharePageContent() {
  const searchParams = useSearchParams();
  const [conversation, setConversation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const data = searchParams.get('data');

    if (!data) {
      setError('No conversation data found in URL');
      return;
    }

    try {
      const decoded = decodeConversation(data);
      setConversation(decoded);
    } catch (err) {
      console.error('Failed to decode conversation:', err);
      setError('Invalid or corrupted share link');
    }
  }, [searchParams]);

  const copyToClipboard = async (text: string, messageId?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (messageId) setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadMarkdown = () => {
    if (!conversation) return;

    const markdown = generateMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conversation.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateMarkdown = () => {
    if (!conversation) return '';

    const { title, question, messages, model, mode, advisors, timestamp } = conversation;
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

    messages.forEach((msg: any) => {
      if (msg.type === 'user') {
        markdown += `### You\n\n${msg.content}\n\n`;
      } else if (msg.type === 'agent' && msg.agent) {
        markdown += `### ${msg.agent}\n\n${msg.content}\n\n`;
      } else if (msg.type === 'moderator') {
        markdown += `### Moderator\n\n${msg.content}\n\n`;
      } else if (msg.type === 'final') {
        markdown += `## Final Answer\n\n${msg.content}\n\n`;
      }
    });

    return markdown;
  };

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

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Error Loading Conversation</h1>
          <p className="text-muted mb-6">{error}</p>
          <a
            href="/"
            className="btn-primary inline-flex items-center gap-2"
          >
            Go to SelfStarterSuite
          </a>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted">Loading conversation...</p>
        </div>
      </div>
    );
  }

  const { title, question, messages, model, mode, advisors, timestamp } = conversation;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-muted sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                <span className="text-primary">■</span>
                <span>Shared Debate</span>
              </h1>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={downloadMarkdown}
                className="p-2 text-muted hover:text-foreground hover:bg-background rounded-lg transition-colors"
                title="Download as Markdown"
              >
                <Download className="w-4 h-4" />
              </button>
              <a
                href="/"
                className="btn-primary px-4 py-2 text-sm"
              >
                Try It Yourself
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Conversation Header */}
        <div className="card p-6 mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">{title}</h2>

          <div className="flex flex-wrap gap-4 text-sm text-muted">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {new Date(timestamp).toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              {model.includes('opus') ? 'Opus 4.5' : model.includes('sonnet') ? 'Sonnet 4.5' : 'Haiku 4'}
            </div>
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {advisors.length} Advisors
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-6">
          {messages.map((message: any, index: number) => (
            <div
              key={message.id || `msg-${index}`}
              className={cn({
                'flex justify-end': message.type === 'user',
              })}
            >
              {message.type === 'user' ? (
                <div className="max-w-2xl w-full sm:w-auto">
                  <div className="rounded-2xl px-6 py-4 bg-primary text-white">
                    <div className="message-content prose prose-sm max-w-none prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(message.content, message.id)}
                    className="mt-2 text-xs text-muted hover:text-foreground flex items-center gap-1"
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
                </div>
              ) : message.type === 'agent' ? (
                <div className="flex gap-3 max-w-3xl">
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${getAgentColor(message.agent)}15` }}
                  >
                    {getAgentAvatar(message.agent)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="font-semibold text-sm"
                        style={{ color: getAgentColor(message.agent) }}
                      >
                        {getAgentName(message.agent)}
                      </span>
                      <span className="text-xs text-muted">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    <div className="bg-surface rounded-2xl px-6 py-4 shadow-sm border border-muted">
                      <div className="message-content text-foreground prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>

                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-muted/50">
                          <div className="text-xs font-semibold text-muted uppercase mb-2">Sources:</div>
                          <div className="space-y-1">
                            {message.sources.map((source: any, idx: number) => (
                              <a
                                key={idx}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-2 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                              >
                                <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span className="truncate">{source.title}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : message.type === 'moderator' ? (
                <div className="flex gap-3 max-w-3xl">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-muted/20 flex items-center justify-center">
                    ⚖️
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm text-foreground">
                        Moderator
                      </span>
                      <span className="text-xs text-muted">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    <div className="bg-surface rounded-2xl px-6 py-4 border border-muted">
                      <div className="message-content text-foreground text-sm prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ) : message.type === 'final' ? (
                <div className="card p-8 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <CheckCheck className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">
                      Council Consensus
                    </h3>
                  </div>
                  <div className="message-content text-foreground prose prose-sm max-w-none mb-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>

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
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center py-8 border-t border-muted">
          <p className="text-sm text-muted mb-4">
            Want to have your own AI council debates?
          </p>
          <a
            href="/"
            className="btn-primary inline-flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Try SelfStarterSuite
          </a>
        </div>
      </main>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted">Loading conversation...</p>
        </div>
      </div>
    }>
      <SharePageContent />
    </Suspense>
  );
}
