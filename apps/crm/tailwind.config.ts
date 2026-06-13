import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          navy: '#F0ECE3', // Soft airy background for sidebar instead of dark navy
          dark: '#EBE8E3', 
          border: 'rgba(0, 0, 0, 0.06)',
        },
        brand: {
          blue: '#1A73E8',
          'blue-hover': '#1558B0',
          green: '#00B386',
          coral: '#FF6B4A',
          'coral-light': '#FFF1EE',
          'coral-border': '#FECACA',
          'coral-text': '#C2410C',
          amber: '#F59E0B',
        },
        surface: {
          canvas: 'transparent',
          card: 'rgba(255, 255, 255, 0.35)',
          panel: 'rgba(255, 255, 255, 0.18)',
        },
        border: {
          DEFAULT: 'rgba(0,0,0,0.06)', // Very soft borders
        },
        text: {
          primary: '#0F1B2D',
          secondary: '#64748B',
          muted: '#94A3B8',
        },
        status: {
          success: '#15803D',
          'success-bg': '#ECFDF5',
          warning: '#92400E',
          'warning-bg': '#FFFBEB',
          danger: '#DC2626',
          'danger-bg': '#FEF2F2',
          opened: '#1D4ED8',
          'opened-bg': '#EFF6FF',
          clicked: '#6D28D9',
          'clicked-bg': '#F5F3FF',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['Courier New', 'monospace'],
      },
      fontSize: {
        display: ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        h1: ['24px', { lineHeight: '1.3', fontWeight: '700' }],
        h2: ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['14px', { lineHeight: '1.6', fontWeight: '400' }],
        small: ['12px', { lineHeight: '1.5', fontWeight: '400' }],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
        'sidebar': '240px',
        'sidebar-collapsed': '64px',
        'topbar': '56px',
        'drawer': '480px',
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08)',
        drawer: '-4px 0 24px rgba(0,0,0,0.12)',
        modal: '0 20px 60px rgba(0,0,0,0.15)',
      },
      keyframes: {
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-out-right': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(100%)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'ping-dot': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.15)', opacity: '0.7' },
        },
      },
      animation: {
        'slide-in': 'slide-in-right 250ms cubic-bezier(0.4,0,0.2,1)',
        'slide-out': 'slide-out-right 250ms cubic-bezier(0.4,0,0.2,1)',
        'fade-in': 'fade-in 150ms cubic-bezier(0.4,0,0.2,1)',
        shimmer: 'shimmer 1.5s linear infinite',
        'ping-dot': 'ping-dot 600ms ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
