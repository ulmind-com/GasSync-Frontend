import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { lightColors, darkColors } from '../constants/theme';
import type { ThemeColors } from '../constants/theme';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: false,
      colors: lightColors,
      toggleTheme: () => {
        const nextIsDark = !get().isDark;
        set({
          isDark: nextIsDark,
          colors: nextIsDark ? darkColors : lightColors,
        });
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);
