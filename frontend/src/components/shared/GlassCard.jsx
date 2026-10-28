// ═══════════════════════════════════════════════════════
// SENPAY — Elevated Card Component
// Consistent reference styling with dark obsidian panel,
// subtle blue-gray borders, and luminous accent glows.
// ═══════════════════════════════════════════════════════

export default function GlassCard({ children, className = '', glow = '', pulse = false, onClick = null }) {
  const glowStyles = {
    cyan: 'border-senpay-cyan/30 hover:border-senpay-cyan/60 hover:shadow-[0_0_18px_rgba(0,229,255,0.2)]',
    green: 'border-senpay-green/30 hover:border-senpay-green/60 hover:shadow-[0_0_18px_rgba(0,255,136,0.2)]',
    red: 'border-senpay-red/30 hover:border-senpay-red/60 hover:shadow-[0_0_18px_rgba(255,59,92,0.2)]',
    warning: 'border-senpay-amber/30 hover:border-senpay-amber/60 hover:shadow-[0_0_18px_rgba(255,184,0,0.2)]',
    purple: 'border-senpay-violet/30 hover:border-senpay-violet/60 hover:shadow-[0_0_18px_rgba(168,85,247,0.2)]',
  };

  return (
    <div
      className={`
        bg-senpay-card border border-senpay-border rounded-xl p-4 shadow-sm transition-colors duration-150
        ${glow ? glowStyles[glow] || '' : ''}
        ${pulse ? 'animate-glow-pulse' : ''}
        ${onClick ? 'cursor-pointer hover:bg-senpay-panel transition-colors' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
