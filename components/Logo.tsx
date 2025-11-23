/**
 * Professional Logo Component for SelfStarterSuite
 * Features a council formation icon with 5 nodes representing the 5 advisors
 */

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const dimensions = {
    sm: { icon: 24, text: 'text-sm' },
    md: { icon: 32, text: 'text-xl' },
    lg: { icon: 40, text: 'text-2xl' },
  };

  const { icon, text } = dimensions[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Council Icon - 5 nodes in pentagon formation */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Pentagon connection lines */}
        <g opacity="0.3">
          <line x1="20" y1="8" x2="33" y2="15" stroke="url(#gradient)" strokeWidth="1.5" />
          <line x1="33" y1="15" x2="29" y2="30" stroke="url(#gradient)" strokeWidth="1.5" />
          <line x1="29" y1="30" x2="11" y2="30" stroke="url(#gradient)" strokeWidth="1.5" />
          <line x1="11" y1="30" x2="7" y2="15" stroke="url(#gradient)" strokeWidth="1.5" />
          <line x1="7" y1="15" x2="20" y2="8" stroke="url(#gradient)" strokeWidth="1.5" />
        </g>

        {/* Center connection hub */}
        <circle cx="20" cy="20" r="2" fill="url(#gradient)" opacity="0.4" />
        <line x1="20" y1="8" x2="20" y2="18" stroke="url(#gradient)" strokeWidth="1.2" opacity="0.3" />
        <line x1="33" y1="15" x2="22" y2="19" stroke="url(#gradient)" strokeWidth="1.2" opacity="0.3" />
        <line x1="29" y1="30" x2="21" y2="22" stroke="url(#gradient)" strokeWidth="1.2" opacity="0.3" />
        <line x1="11" y1="30" x2="19" y2="22" stroke="url(#gradient)" strokeWidth="1.2" opacity="0.3" />
        <line x1="7" y1="15" x2="18" y2="19" stroke="url(#gradient)" strokeWidth="1.2" opacity="0.3" />

        {/* 5 Advisor nodes - Pentagon formation */}
        {/* Top */}
        <circle cx="20" cy="8" r="3.5" fill="url(#gradient)" />
        <circle cx="20" cy="8" r="2.2" fill="white" opacity="0.3" />

        {/* Top Right */}
        <circle cx="33" cy="15" r="3.5" fill="url(#gradient)" />
        <circle cx="33" cy="15" r="2.2" fill="white" opacity="0.3" />

        {/* Bottom Right */}
        <circle cx="29" cy="30" r="3.5" fill="url(#gradient)" />
        <circle cx="29" cy="30" r="2.2" fill="white" opacity="0.3" />

        {/* Bottom Left */}
        <circle cx="11" cy="30" r="3.5" fill="url(#gradient)" />
        <circle cx="11" cy="30" r="2.2" fill="white" opacity="0.3" />

        {/* Top Left */}
        <circle cx="7" cy="15" r="3.5" fill="url(#gradient)" />
        <circle cx="7" cy="15" r="2.2" fill="white" opacity="0.3" />

        {/* Gradient Definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C15F3C" />
            <stop offset="100%" stopColor="#8B4513" />
          </linearGradient>
        </defs>
      </svg>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-bold text-primary ${text}`}>
            SelfStarter
          </span>
          <span className={`font-semibold text-muted text-[0.6em] tracking-wider uppercase`}>
            Suite
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Logo for mobile/small spaces
 */
export function LogoCompact({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <svg
        width={24}
        height={24}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Simplified version for small screens */}
        <g opacity="0.3">
          <line x1="20" y1="8" x2="33" y2="15" stroke="url(#gradient-compact)" strokeWidth="1.5" />
          <line x1="33" y1="15" x2="29" y2="30" stroke="url(#gradient-compact)" strokeWidth="1.5" />
          <line x1="29" y1="30" x2="11" y2="30" stroke="url(#gradient-compact)" strokeWidth="1.5" />
          <line x1="11" y1="30" x2="7" y2="15" stroke="url(#gradient-compact)" strokeWidth="1.5" />
          <line x1="7" y1="15" x2="20" y2="8" stroke="url(#gradient-compact)" strokeWidth="1.5" />
        </g>

        <circle cx="20" cy="8" r="3.5" fill="url(#gradient-compact)" />
        <circle cx="33" cy="15" r="3.5" fill="url(#gradient-compact)" />
        <circle cx="29" cy="30" r="3.5" fill="url(#gradient-compact)" />
        <circle cx="11" cy="30" r="3.5" fill="url(#gradient-compact)" />
        <circle cx="7" cy="15" r="3.5" fill="url(#gradient-compact)" />

        <defs>
          <linearGradient id="gradient-compact" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C15F3C" />
            <stop offset="100%" stopColor="#8B4513" />
          </linearGradient>
        </defs>
      </svg>

      <span className="font-bold text-primary text-sm flex items-baseline">
        S<sup className="text-[0.65em] font-bold">3</sup>
      </span>
    </div>
  );
}
