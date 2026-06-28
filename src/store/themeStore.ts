import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { lightColors, darkColors } from '../constants/theme';
import type { ThemeColors } from '../constants/theme';

interface ThemeState {
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (isDark: boolean) => void;
  toggleTheme: () => void;
}

/** Apply the `.dark` class to <html> and animate the swap smoothly. */
const applyThemeClass = (isDark: boolean, animate = true) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 500);
  }
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: false,
      colors: lightColors,
      setTheme: (isDark: boolean) => {
        applyThemeClass(isDark);
        set({ isDark, colors: isDark ? darkColors : lightColors });
      },
      toggleTheme: () => get().setTheme(!get().isDark),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ isDark: state.isDark }),
      onRehydrateStorage: () => (state) => {
        // Sync the DOM class with the persisted/restored preference (no animation on load).
        const isDark = state?.isDark ?? false;
        applyThemeClass(isDark, false);
      },
    }
  )
);
