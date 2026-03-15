/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['IBM Plex Mono', 'Cascadia Code', 'ui-monospace', 'monospace'],
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Dark bg scale
        bg: {
          base: '#080b0f',
          surface: '#0d1117',
          elevated: '#111820',
          card: '#131c26',
          hover: '#1a2535',
        },
        // Brand
        cyan: {
          DEFAULT: '#00d4ff',
          dim: 'rgba(0,212,255,0.12)',
          glow: 'rgba(0,212,255,0.25)',
        },
        green: {
          trade: '#00e676',
        },
        red: {
          trade: '#ff4757',
        },
      },
      animation: {
        ticker: 'ticker 35s linear infinite',
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'live-pulse': 'livePulse 1.4s ease-in-out infinite',
        'spin-slow': 'spin 1.2s linear infinite',
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        fadeIn: {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        livePulse: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.5, transform: 'scale(0.85)' },
        },
      },
    },
  },
  plugins: [],
};
