'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { PERSONAS } from '@/lib/agents/personas';
import { cn } from '@/lib/utils';

interface AdvisorAvatarProps {
  agent: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
  isStreaming?: boolean;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-sm',
  md: 'w-8 h-8 sm:w-9 sm:h-9 text-base sm:text-lg',
  lg: 'w-12 h-12 text-2xl',
  xl: 'w-16 h-16 text-3xl',
};

export default function AdvisorAvatar({
  agent,
  size = 'md',
  className,
  showBorder = false,
  isStreaming = false,
}: AdvisorAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const persona = PERSONAS[agent as keyof typeof PERSONAS];

  if (!persona) {
    return (
      <div className={cn(
        "flex-shrink-0 rounded-xl flex items-center justify-center bg-muted/20",
        sizeClasses[size],
        className
      )}>
        🤖
      </div>
    );
  }

  const backgroundColor = `${persona.color}15`;

  // Use image if available and not errored
  if (persona.image && !imageError) {
    return (
      <div className={cn(
        "flex-shrink-0 rounded-xl relative overflow-hidden",
        sizeClasses[size],
        showBorder && "ring-2 ring-primary",
        isStreaming && "animate-pulse ring-2 ring-primary",
        className
      )}>
        <Image
          src={persona.image}
          alt={persona.name}
          fill
          className="object-cover pixelated"
          onError={() => setImageError(true)}
          unoptimized // For pixelated images
        />
      </div>
    );
  }

  // Fallback to emoji
  return (
    <div
      className={cn(
        "flex-shrink-0 rounded-xl flex items-center justify-center",
        sizeClasses[size],
        showBorder && "ring-2 ring-primary",
        isStreaming && "animate-pulse ring-2 ring-primary",
        className
      )}
      style={{ backgroundColor }}
    >
      {persona.avatar}
    </div>
  );
}
