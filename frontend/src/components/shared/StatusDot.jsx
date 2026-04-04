// ═══════════════════════════════════════════════════════
// CrowdShield — StatusDot Component
// Animated status indicator with optional pulse ring
// ═══════════════════════════════════════════════════════

export default function StatusDot({ status = 'safe', size = 'sm', pulse = true }) {
  const sizeMap = { sm: 'w-2 h-2', md: 'w-3 h-3', lg: 'w-4 h-4' };
  const colorMap = {
    safe: 'bg-crowd-safe',
    warning: 'bg-crowd-warning',
    danger: 'bg-crowd-danger',
    offline: 'bg-crowd-text-muted',
    active: 'bg-crowd-cyan',
  };

  const ringColorMap = {
    safe: 'bg-crowd-safe/30',
    warning: 'bg-crowd-warning/30',
    danger: 'bg-crowd-danger/30',
    offline: 'bg-crowd-text-muted/30',
    active: 'bg-crowd-cyan/30',
  };

  return (
    <span className="relative inline-flex">
      {pulse && status !== 'offline' && (
        <span
          className={`absolute inset-0 rounded-full ${ringColorMap[status]} animate-ping`}
          style={{ animationDuration: '2s' }}
        />
      )}
      <span className={`relative rounded-full ${sizeMap[size]} ${colorMap[status]}`} />
    </span>
  );
}
