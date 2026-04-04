// ═══════════════════════════════════════════════════════
// CrowdShield — GlassCard Component
// Reusable glassmorphism card with glow + pulse options
// ═══════════════════════════════════════════════════════

export default function GlassCard({ children, className = '', glow = '', pulse = false, onClick = null }) {
  const glowStyles = {
    cyan: 'border-crowd-cyan/20 hover:border-crowd-cyan/40 hover:shadow-[0_0_20px_rgba(0,212,255,0.15)]',
    green: 'border-crowd-safe/20 hover:border-crowd-safe/40 hover:shadow-[0_0_20px_rgba(0,255,136,0.15)]',
    red: 'border-crowd-danger/20 hover:border-crowd-danger/40 hover:shadow-[0_0_20px_rgba(255,59,92,0.15)]',
    warning: 'border-crowd-warning/20 hover:border-crowd-warning/40 hover:shadow-[0_0_20px_rgba(255,184,0,0.15)]',
    purple: 'border-crowd-purple/20 hover:border-crowd-purple/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]',
  };

  return (
    <div
      className={`
        glass-card p-4
        ${glow ? glowStyles[glow] || '' : ''}
        ${pulse ? 'animate-glow-pulse' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
