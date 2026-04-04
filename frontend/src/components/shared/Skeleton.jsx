// ═══════════════════════════════════════════════════════
// CrowdShield — Skeleton Loading Component
// Shimmer placeholder for async loading states
// ═══════════════════════════════════════════════════════

export function SkeletonBlock({ className = '', width = '100%', height = '20px' }) {
  return (
    <div
      className={`skeleton rounded-md ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card p-4 space-y-3">
      <SkeletonBlock height="14px" width="40%" />
      <SkeletonBlock height="32px" width="60%" />
      <SkeletonBlock height="12px" width="80%" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="glass-card p-4">
      <SkeletonBlock height="14px" width="30%" className="mb-4" />
      <div className="flex items-end gap-2 h-40">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonBlock
            key={i}
            width="100%"
            height={`${20 + Math.random() * 80}%`}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonMap() {
  return (
    <div className="glass-card p-4 relative overflow-hidden" style={{ height: 400 }}>
      <SkeletonBlock height="100%" width="100%" className="absolute inset-0" />
      <div className="relative z-10 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-crowd-cyan border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-crowd-text-muted text-sm">Loading map...</p>
        </div>
      </div>
    </div>
  );
}
