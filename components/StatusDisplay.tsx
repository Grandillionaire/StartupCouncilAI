'use client';

import React from 'react';
import { Loader2, Brain, Search, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusDisplayProps {
  status: string;
  isDebating: boolean;
  currentRound: number;
  className?: string;
}

export default function StatusDisplay({ status, isDebating, currentRound, className }: StatusDisplayProps) {
  if (!isDebating || !status) return null;

  // Determine icon based on status content
  const getStatusIcon = () => {
    if (status.toLowerCase().includes('research') || status.toLowerCase().includes('searching')) {
      return <Search className="w-4 h-4 text-blue-500 animate-pulse" />;
    }
    if (status.toLowerCase().includes('consensus') || status.toLowerCase().includes('generating')) {
      return <Brain className="w-4 h-4 text-purple-500 animate-pulse" />;
    }
    if (status.toLowerCase().includes('complete') || status.toLowerCase().includes('done')) {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
    return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
  };

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-sm",
      className
    )}>
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {status}
        </p>
      </div>
      {currentRound > 0 && (
        <div className="flex-shrink-0">
          <span className="text-xs text-muted bg-surface px-2 py-1 rounded-full">
            Round {currentRound}
          </span>
        </div>
      )}
    </div>
  );
}
