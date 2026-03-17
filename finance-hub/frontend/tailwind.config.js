/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        surface: {
          900: '#080c10',
          800: '#0d1117',
          700: '#131b26',
          600: '#1a2435',
          500: '#1e2d42',
          400: '#243550',
        },
        accent: {
          cyan: '#00d4ff',
          green: '#00e676',
          red: '#ff1744',
          amber: '#ffc107',
          purple: '#e040fb',
        },
        text: {
          primary: '#e8f0f7',
          secondary: '#8899aa',
          muted: '#4a5568',
        },
      },
      animation: {
        'flash-up': 'flashUp 0.8s ease-out forwards',
        'flash-down': 'flashDown 0.8s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-up': 'fadeUp 0.4s ease-out',
      },
      keyframes: {
        flashUp: {
          '0%': { backgroundColor: 'rgba(0, 230, 118, 0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        flashDown: {
          '0%': { backgroundColor: 'rgba(255, 23, 68, 0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
