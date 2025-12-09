import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

const THEME_STORAGE_KEY = '@lifeflow_theme';

type ColorScheme = 'light' | 'dark' | null;

// Global listeners for theme changes
const listeners = new Set<(theme: ColorScheme) => void>();

export function notifyThemeChange(theme: ColorScheme) {
  listeners.forEach(listener => listener(theme));
}

export function useColorScheme(): 'light' | 'dark' {
  const systemColorScheme = useSystemColorScheme();
  const [theme, setTheme] = useState<ColorScheme>(null);

  useEffect(() => {
    // Load saved theme preference
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((savedTheme) => {
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      }
    });

    // Listen for theme changes
    const listener = (newTheme: ColorScheme) => {
      setTheme(newTheme);
    };
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Return saved theme or fall back to system theme
  return theme ?? systemColorScheme ?? 'light';
}
