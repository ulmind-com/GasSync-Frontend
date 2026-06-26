/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        surfaceSecondary: 'var(--color-surface-secondary)',
        textPrimary: 'var(--color-text-primary)',
        textSecondary: 'var(--color-text-secondary)',
        primary: 'var(--color-primary)',
        primaryGradientStart: 'var(--color-primary-gradient-start)',
        primaryGradientEnd: 'var(--color-primary-gradient-end)',
        border: 'var(--color-border)',
        borderSecondary: 'var(--color-border-secondary)',
        icon: 'var(--color-icon)',
        iconMuted: 'var(--color-icon-muted)',
        avatarBg: 'var(--color-avatar-bg)',
        shadow: 'var(--color-shadow)',
        error: 'var(--color-error)',
      },
      fontFamily: {
        sans: ['"General Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
