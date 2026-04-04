// ═══════════════════════════════════════════════════════
// CrowdShield — Risk Badge Component
// Circular SVG ring with color-coded risk score
// ═══════════════════════════════════════════════════════

import { getRiskLevel } from '../../data/mockData';

export default function RiskBadge({ score, size = 64, showLabel = true }) {
  const risk = getRiskLevel(score);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const isPulsing = score > 70;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative ${isPulsing ? 'animate-pulse-slow' : ''}`} style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(30, 45, 74, 0.5)"
            strokeWidth="4"
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={risk.color}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-mono font-bold"
            style={{ color: risk.color, fontSize: size * 0.28 }}
          >
            {score}
          </span>
        </div>
      </div>
      {showLabel && (
        <span
          className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ color: risk.color, backgroundColor: risk.bg }}
        >
          {risk.label}
        </span>
      )}
    </div>
  );
}
