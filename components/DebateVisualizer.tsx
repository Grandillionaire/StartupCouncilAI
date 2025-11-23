'use client';

import React from 'react';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PERSONAS, type AdvisorName } from '@/lib/agents/personas';
import type { Message } from '@/lib/stores/debate-store';
import AdvisorAvatar from './AdvisorAvatar';

interface DebateVisualizerProps {
  messages: Message[];
  currentRound: number;
  maxRounds: number;
  selectedAdvisors: string[];
  isDebating: boolean;
}

export default function DebateVisualizer({
  messages,
  currentRound,
  maxRounds,
  selectedAdvisors,
  isDebating,
}: DebateVisualizerProps) {
  // Track which advisors have responded in current round
  const getAdvisorStatus = (advisor: string) => {
    const advisorMessages = messages.filter(
      m => m.type === 'agent' && m.agent === advisor
    );

    if (advisorMessages.length >= currentRound) {
      return 'completed';
    } else if (isDebating && advisorMessages.length === currentRound - 1) {
      return 'in-progress';
    }
    return 'pending';
  };

  const getAgentColor = (agent: string) => {
    const persona = PERSONAS[agent as keyof typeof PERSONAS];
    return persona?.color || '#B1ADA1';
  };

  const getAgentAvatar = (agent: string) => {
    const persona = PERSONAS[agent as keyof typeof PERSONAS];
    return persona?.avatar || '🤖';
  };

  const getAgentName = (agent: string) => {
    const persona = PERSONAS[agent as keyof typeof PERSONAS];
    return persona?.name || agent;
  };

  if (!isDebating && messages.length === 0) return null;

  return (
    <div className="bg-surface border border-muted rounded-lg p-4 mb-4 animate-fade-in">
      {/* Round Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-foreground">
            Debate Progress
          </span>
          <span className="text-xs text-muted">
            Round {currentRound} of {maxRounds}
          </span>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: maxRounds }, (_, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 h-2 rounded-full transition-all",
                i < currentRound
                  ? "bg-primary"
                  : i === currentRound && isDebating
                  ? "bg-primary/50 animate-pulse"
                  : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Advisor Status */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-muted uppercase tracking-wide">
          Advisors
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {selectedAdvisors.map((advisor) => {
            const status = getAdvisorStatus(advisor);
            return (
              <div
                key={advisor}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border transition-all",
                  status === 'completed' && "border-primary/30 bg-primary/5",
                  status === 'in-progress' && "border-primary bg-primary/10 animate-pulse",
                  status === 'pending' && "border-muted bg-surface"
                )}
              >
                <div className="flex-shrink-0">
                  {status === 'completed' && (
                    <CheckCircle className="w-4 h-4 text-primary" />
                  )}
                  {status === 'in-progress' && (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  )}
                  {status === 'pending' && (
                    <Circle className="w-4 h-4 text-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate" style={{ color: getAgentColor(advisor) }}>
                    {getAgentName(advisor).split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-muted">
                    {status === 'completed' && 'Done'}
                    {status === 'in-progress' && 'Speaking...'}
                    {status === 'pending' && 'Waiting'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Consensus Indicator */}
      {messages.some(m => m.type === 'final') && (
        <div className="mt-4 pt-4 border-t border-muted">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="font-semibold text-green-700">Consensus Reached</span>
          </div>
        </div>
      )}
    </div>
  );
}
