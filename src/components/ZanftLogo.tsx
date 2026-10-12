import React from 'react';

interface ZanftLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'responsive';
  showSubtext?: boolean;
  showText?: boolean;
  subtext?: string;
  className?: string;
}

export const ZanftLogo: React.FC<ZanftLogoProps> = ({
  size = 'responsive',
  showSubtext = true,
  showText = true,
  subtext = 'Fan Dub Streaming Website',
  className = ''
}) => {
  // Mobile-first responsive sizing
  const iconSizeClasses =
    size === 'sm'
      ? 'w-7 h-7'
      : size === 'md'
      ? 'w-8 h-8 sm:w-9 sm:h-9'
      : size === 'lg'
      ? 'w-10 h-10 sm:w-12 sm:h-12'
      : 'w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9';

  const textSizeClasses =
    size === 'sm'
      ? 'text-lg tracking-wider'
      : size === 'md'
      ? 'text-xl sm:text-2xl tracking-wider'
      : size === 'lg'
      ? 'text-3xl sm:text-4xl tracking-wider'
      : 'text-lg sm:text-xl md:text-2xl tracking-wider';

  return (
    <div className={`flex items-center space-x-2 sm:space-x-2.5 select-none ${className}`}>
      {/* Brand New Redesigned Katana Diamond Blade Emblem */}
      <div className={`relative ${iconSizeClasses} flex-shrink-0 group`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full filter drop-shadow-[0_0_14px_rgba(229,9,20,0.7)] transition-transform duration-300 group-hover:scale-105"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Ultra-Vibrant Crimson Gradient */}
            <linearGradient id="zanftCrimsonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF385C" />
              <stop offset="45%" stopColor="#E50914" />
              <stop offset="100%" stopColor="#8A000A" />
            </linearGradient>

            {/* Silver Blade Edge Sheen */}
            <linearGradient id="bladeSheen" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#FFA6B5" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#E50914" stopOpacity="0.2" />
            </linearGradient>

            {/* Dark Obsidian Glass Background */}
            <radialGradient id="obsidianGlass" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
              <stop offset="0%" stopColor="#1E2235" />
              <stop offset="70%" stopColor="#0E1019" />
              <stop offset="100%" stopColor="#05060A" />
            </radialGradient>

            {/* Outer Glow Filter */}
            <filter id="crimsonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#E50914" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Outer Rounded Diamond Badge */}
          <path
            d="M50 4 C53 4 56 6 58 8 L92 42 C96 46 96 54 92 58 L58 92 C56 94 53 96 50 96 C47 96 44 94 42 92 L8 58 C4 54 4 46 8 42 L42 8 C44 6 47 4 50 4 Z"
            fill="url(#obsidianGlass)"
            stroke="url(#zanftCrimsonGrad)"
            strokeWidth="3.5"
          />

          {/* Inner Accent Ring */}
          <circle
            cx="50"
            cy="50"
            r="38"
            stroke="url(#zanftCrimsonGrad)"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.4"
          />

          {/* Dynamic Katana 'Z' Slash Path */}
          {/* Top Katana Crossbar */}
          <path
            d="M26 26 L74 26 C76 26 77 28 76 30 L64 42 L34 42 L42 34 L28 34 C25 34 24 26 26 26 Z"
            fill="url(#zanftCrimsonGrad)"
          />

          {/* Central Razor Diagonal Blade (extends dynamically) */}
          <path
            d="M74 30 L28 74 C26 76 24 74 25 72 L31 66 L68 28 C70 26 75 28 74 30 Z"
            fill="url(#zanftCrimsonGrad)"
          />

          {/* Bottom Katana Crossbar */}
          <path
            d="M74 74 L26 74 C24 74 23 72 24 70 L36 58 L66 58 L58 66 L72 66 C75 66 76 74 74 74 Z"
            fill="url(#zanftCrimsonGrad)"
          />

          {/* Sharp Katana Glint Ray */}
          <line
            x1="76"
            y1="24"
            x2="24"
            y2="76"
            stroke="url(#bladeSheen)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Center Monogram Crest "Z" */}
          <text
            x="50"
            y="54"
            fill="#FFFFFF"
            fontSize="19"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            textAnchor="middle"
            dominantBaseline="middle"
            opacity="0.95"
            style={{ textShadow: '0 0 8px rgba(0,0,0,0.95), 0 0 12px rgba(229,9,20,0.8)' }}
          >
            Z
          </text>
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-center space-x-1.5">
            <span className={`font-syne font-black text-white tracking-wider ${textSizeClasses}`}>
              ZANFT
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] shadow-[0_0_10px_#E50914] animate-pulse" />
          </div>
          {showSubtext && (
            <span className="flex items-center text-[7.5px] xs:text-[8px] sm:text-[9.5px] font-extrabold uppercase tracking-[0.10em] sm:tracking-[0.16em] text-[#E50914] mt-0.5 whitespace-nowrap">
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
