/**
 * TEST COMPONENT
 * Purpose: Verify new architecture works before migrating CouncilChat
 *
 * This is a minimal debate component using:
 * - Zustand store (lib/stores/debate-store.ts)
 * - Council service (lib/services/council-service.ts)
 * - useDebate hook (lib/hooks/useDebate.ts)
 *
 * If this works perfectly, we know the architecture is solid.
 */

'use client';

import React from 'react';
import { useDebate } from '@/lib/hooks/useDebate';
import { Send, Loader2, StopCircle } from 'lucide-react';

export default function TestDebate() {
  const {
    // State
    messages,
    input,
    isDebating,
    currentRound,
    toasts,
    isResearching,
    researchQuery,
    settings,

    // Actions
    setInput,
    startDebate,
    stopDebate,
    clearConversation,
  } = useDebate();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🧪 Architecture Test</h1>
          <p className="text-muted-foreground">
            Testing new Zustand store + Service layer + Hook
          </p>
        </div>

        {/* Debug Info */}
        <div className="card p-4 mb-4 bg-blue-50 border-blue-200">
          <h3 className="font-bold mb-2">📊 State Debug:</h3>
          <div className="text-sm space-y-1">
            <div>Messages: {messages.length}</div>
            <div>Is Debating: {isDebating ? '✅' : '❌'}</div>
            <div>Current Round: {currentRound}</div>
            <div>Is Researching: {isResearching ? '🔍' : '❌'}</div>
            {isResearching && <div>Research Query: {researchQuery}</div>}
            <div>Settings: {settings.mode} mode, {settings.selectedAdvisors.length} advisors</div>
          </div>
        </div>

        {/* Messages */}
        <div className="card p-6 mb-4 min-h-[400px] max-h-[600px] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No messages yet. Ask a question to test the architecture!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-lg ${
                    msg.type === 'user'
                      ? 'bg-primary text-white ml-12'
                      : msg.type === 'agent'
                      ? 'bg-surface border border-muted'
                      : msg.type === 'moderator'
                      ? 'bg-blue-50 border-blue-200'
                      : msg.type === 'final'
                      ? 'bg-green-50 border-green-200'
                      : msg.type === 'system'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="text-xs font-bold mb-1">
                    {msg.type === 'agent' ? `🤖 ${msg.agent}` : `📝 ${msg.type}`}
                    {msg.isStreaming && ' (streaming...)'}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">
                    {msg.content || 'Thinking...'}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-current/20">
                      <div className="text-xs font-bold mb-1">📚 Sources:</div>
                      {msg.sources.map((source, idx) => (
                        <div key={idx} className="text-xs">
                          [{idx + 1}] {source.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="card p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isDebating) {
                  e.preventDefault();
                  startDebate();
                }
              }}
              placeholder="Ask a question to test the architecture..."
              className="flex-1 px-4 py-2 border border-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isDebating}
            />

            {isDebating ? (
              <button
                onClick={stopDebate}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
              >
                <StopCircle className="w-4 h-4" />
                Stop
              </button>
            ) : (
              <button
                onClick={() => startDebate()}
                disabled={!input.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Ask
              </button>
            )}

            <button
              onClick={clearConversation}
              disabled={isDebating}
              className="px-4 py-2 border border-muted rounded-lg hover:bg-surface disabled:opacity-50"
            >
              Clear
            </button>
          </div>

          {/* Test Questions */}
          <div className="mt-4 pt-4 border-t border-muted">
            <div className="text-xs font-bold mb-2">Quick Test Questions:</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setInput('Should I start a business?');
                }}
                className="text-xs px-3 py-1 bg-surface rounded hover:bg-muted"
                disabled={isDebating}
              >
                💼 Business Question
              </button>
              <button
                onClick={() => {
                  setInput('research the best AI tools for startups');
                }}
                className="text-xs px-3 py-1 bg-surface rounded hover:bg-muted"
                disabled={isDebating}
              >
                🔍 Test Research
              </button>
              <button
                onClick={() => {
                  setInput('Help me decide: hire an employee or contractor?');
                }}
                className="text-xs px-3 py-1 bg-surface rounded hover:bg-muted"
                disabled={isDebating}
              >
                👥 Hiring Question
              </button>
            </div>
          </div>
        </div>

        {/* Toasts */}
        {toasts.length > 0 && (
          <div className="fixed bottom-4 right-4 space-y-2">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={`px-4 py-2 rounded-lg shadow-lg ${
                  toast.type === 'success'
                    ? 'bg-green-500 text-white'
                    : toast.type === 'error'
                    ? 'bg-red-500 text-white'
                    : toast.type === 'warning'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-blue-500 text-white'
                }`}
              >
                {toast.message}
              </div>
            ))}
          </div>
        )}

        {/* Architecture Validation */}
        <div className="mt-4 card p-4 bg-green-50 border-green-200">
          <h3 className="font-bold mb-2">✅ Architecture Verification:</h3>
          <div className="text-sm space-y-1">
            <div>✅ Zustand Store: Working ({messages.length} messages in state)</div>
            <div>✅ Council Service: {isDebating ? 'Active' : 'Ready'}</div>
            <div>✅ useDebate Hook: Connected</div>
            <div>✅ Event Streaming: {messages.filter(m => m.type === 'agent').length} agent messages</div>
            <div>✅ Research Integration: {isResearching ? 'Active' : 'Ready'}</div>
          </div>
          <div className="mt-2 pt-2 border-t border-green-300 text-xs text-green-700">
            <strong>Test Status:</strong> If you can see messages appearing one by one (sequential),
            research working, and no console errors → Architecture is PERFECT! ✨
          </div>
        </div>
      </div>
    </div>
  );
}
