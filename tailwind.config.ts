import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#C15F3C',
        background: '#F4F3EE',
        surface: '#FFFFFF',
        muted: '#B1ADA1',
        foreground: '#000000',
        naval: '#2E7D32',
        elon: '#E53935',
        larry: '#1565C0',
        alex: '#F57C00',
        pavel: '#5E35B1',
        moderator: '#424242',
      },
      fontFamily: {
        mono: ['Fira Code', 'Fira Mono', 'monospace'],
        sans: ['Fira Code', 'Fira Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
export default config
