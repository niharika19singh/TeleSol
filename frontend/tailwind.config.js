/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // SENPAY Reference Design Tokens (Porcelain Light vs. Obsidian Dark)
        senpay: {
          bg: 'var(--senpay-bg)',
          sidebar: 'var(--senpay-sidebar)',
          card: 'var(--senpay-card)',
          panel: 'var(--senpay-panel)',
          elevated: 'var(--senpay-elevated)',
          border: 'var(--senpay-border)',
          'border-light': 'var(--senpay-border-light)',
          cyan: 'var(--senpay-cyan)',
          accent: 'var(--senpay-accent)',
          teal: 'var(--senpay-cyan)',
          violet: 'var(--senpay-violet)',
          amber: 'var(--senpay-amber)',
          red: 'var(--senpay-red)',
          rose: 'var(--senpay-red)',
          green: 'var(--senpay-green)',
          'text-primary': 'var(--senpay-text-primary)',
          'text-secondary': 'var(--senpay-text-secondary)',
          'text-muted': 'var(--senpay-text-muted)',
        },
        // Backwards compatibility for existing components
        crowd: {
          bg: '#0B1118',
          surface: '#101821',
          card: '#151F2A',
          border: '#1E2D3D',
          'border-light': '#2A3F55',
          safe: '#00FF88',
          warning: '#FFB800',
          danger: '#FF3B5C',
          cyan: '#00E5FF',
          purple: '#A855F7',
          'text-primary': '#F1F5F9',
          'text-secondary': '#94A3B8',
          'text-muted': '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-ring': 'pulseRing 2s ease-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-down': 'slideInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'drawer-enter': 'drawerEnter 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'panel-expand': 'panelExpand 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'beacon-ping': 'beaconPing 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'shimmer': 'shimmer 2s infinite linear',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'scanner': 'scanner 3s linear infinite',
        'signal-flow': 'signalFlow 2s linear infinite',
      },
      keyframes: {
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        drawerEnter: {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        panelExpand: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        beaconPing: {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 6px rgba(32,199,217,0.2)' },
          '50%': { boxShadow: '0 0 16px rgba(32,199,217,0.45)' },
        },
        scanner: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        signalFlow: {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
