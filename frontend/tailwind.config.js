/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // SENPAY Reference Design Tokens (Restrained Telecom Operations Palette)
        senpay: {
          bg: '#0B1117',
          sidebar: '#0E1620',
          card: '#111A23',
          panel: '#15212C',
          elevated: '#1A2937',
          border: '#293746',
          'border-light': '#364B5F',
          cyan: '#35C7D9',
          teal: '#20B2AA',
          violet: '#8B5CF6',
          amber: '#E8AD43',
          red: '#E45B64',
          green: '#39B980',
          'text-primary': '#E6EDF3',
          'text-secondary': '#9AAABA',
          'text-muted': '#718297',
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
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
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
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0,229,255,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(0,229,255,0.6)' },
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
