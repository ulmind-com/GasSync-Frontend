/** @type {import('tailwindcss').Config} */
const withAlpha = (v) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: withAlpha('--color-background'),
        backgroundAlt: withAlpha('--color-background-alt'),
        surface: withAlpha('--color-surface'),
        surfaceMuted: withAlpha('--color-surface-muted'),
        surfaceSecondary: withAlpha('--color-surface'),
        textPrimary: withAlpha('--color-text-primary'),
        textSecondary: withAlpha('--color-text-secondary'),
        textMuted: withAlpha('--color-text-muted'),
        primary: {
          DEFAULT: withAlpha('--color-primary'),
          strong: withAlpha('--color-primary-strong'),
        },
        primaryGradientStart: withAlpha('--color-primary'),
        primaryGradientEnd: withAlpha('--color-primary-strong'),
        onPrimary: withAlpha('--color-on-primary'),
        border: {
          DEFAULT: 'rgb(var(--color-border) / 0.08)',
          strong: 'rgb(var(--color-border-strong) / 0.16)',
        },
        borderSecondary: 'rgb(var(--color-border) / 0.06)',
        icon: withAlpha('--color-icon'),
        iconMuted: withAlpha('--color-icon-muted'),
        avatarBg: withAlpha('--color-avatar-bg'),
        error: withAlpha('--color-error'),
        warning: withAlpha('--color-warning'),
        info: withAlpha('--color-info'),
        glass: withAlpha('--color-glass'),
      },
      fontFamily: {
        sans: ['"Manrope"', 'system-ui', 'sans-serif'],
        heading: ['"Space Grotesk"', '"Manrope"', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      backdropBlur: {
        xs: '2px',
        '3xl': '40px',
      },
      boxShadow: {
        'premium-sm': '0 1px 2px 0 rgb(var(--shadow-rgb) / calc(0.04 * var(--shadow-strength))), 0 6px 16px -10px rgb(var(--shadow-rgb) / calc(0.10 * var(--shadow-strength)))',
        'premium': '0 1px 2px 0 rgb(var(--shadow-rgb) / calc(0.04 * var(--shadow-strength))), 0 12px 32px -14px rgb(var(--shadow-rgb) / calc(0.14 * var(--shadow-strength)))',
        'premium-lg': '0 2px 4px 0 rgb(var(--shadow-rgb) / calc(0.05 * var(--shadow-strength))), 0 24px 56px -20px rgb(var(--shadow-rgb) / calc(0.22 * var(--shadow-strength)))',
        'glow-primary': '0 8px 24px -8px rgb(var(--color-primary) / 0.5)',
        'glass-sm': '0 2px 8px -2px rgb(var(--shadow-rgb) / calc(0.06 * var(--shadow-strength)))',
        'glass': '0 8px 32px -8px rgb(var(--shadow-rgb) / calc(0.12 * var(--shadow-strength)))',
        'glass-lg': '0 16px 48px -12px rgb(var(--shadow-rgb) / calc(0.18 * var(--shadow-strength)))',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px -4px rgb(var(--color-primary) / 0.15)' },
          '50%': { boxShadow: '0 0 28px -2px rgb(var(--color-primary) / 0.25)' },
        },
        'glass-shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'subtle-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        'reveal-up': {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'reveal-scale': {
          '0%': { opacity: '0', transform: 'scale(0.92) translateY(20px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) both',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.22,1,0.36,1) both',
        shimmer: 'shimmer 1.6s infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'glass-shimmer': 'glass-shimmer 3s ease-in-out infinite',
        'subtle-bounce': 'subtle-bounce 2s ease-in-out infinite',
        'reveal-up': 'reveal-up 0.8s cubic-bezier(0.22,1,0.36,1) both',
        'reveal-scale': 'reveal-scale 0.7s cubic-bezier(0.22,1,0.36,1) both',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
