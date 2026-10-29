import React from 'react';

/**
 * SENPAY Logo Component
 * Renders the geometric cyan isometric cube/hexagon symbol and wordmark
 * precisely matching the reference images.
 */
export default function SenPayLogo({ size = 'default', showSubtitle = false, className = '' }) {
  const isLarge = size === 'large';
  const isSmall = size === 'small';

  const iconSize = isLarge ? 38 : isSmall ? 22 : 30;

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* ── Geometric Cyan Hexagonal Cube Symbol ── */}
      <div className="relative flex-shrink-0 flex items-center justify-center">
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_0_10px_rgba(0,229,255,0.6)]"
        >
          {/* Outer Hexagon */}
          <polygon
            points="20,2 36,11 36,29 20,38 4,29 4,11"
            fill="#0F2433"
            stroke="#00E5FF"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />

          {/* Top Isometric Diamond Facet */}
          <polygon
            points="20,2 36,11 20,20 4,11"
            fill="#00E5FF"
            fillOpacity="0.22"
            stroke="#00E5FF"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          {/* Left Isometric Diamond Facet */}
          <polygon
            points="4,11 20,20 20,38 4,29"
            fill="#00B4D8"
            fillOpacity="0.12"
            stroke="#00E5FF"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          {/* Right Isometric Diamond Facet */}
          <polygon
            points="20,20 36,11 36,29 20,38"
            fill="#00E5FF"
            fillOpacity="0.32"
            stroke="#00E5FF"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          {/* Inner Glowing Core Node */}
          <circle cx="20" cy="20" r="3.2" fill="#00E5FF" />
          <circle cx="20" cy="20" r="1.4" fill="#FFFFFF" />
        </svg>
      </div>

      {/* ── Wordmark ── */}
      <div className="flex flex-col">
        <div className="flex items-center tracking-wider font-display font-black text-senpay-text-primary leading-none">
          <span className={isLarge ? 'text-2xl' : isSmall ? 'text-base' : 'text-xl'}>
            SEN
          </span>
          <span className={`text-senpay-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.7)] ${
            isLarge ? 'text-2xl' : isSmall ? 'text-base' : 'text-xl'
          }`}>
            PAY
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[9px] font-mono tracking-[0.22em] text-senpay-text-muted font-bold uppercase mt-0.5">
            SENTINEL + PAYPILOT
          </span>
        )}
      </div>
    </div>
  );
}
