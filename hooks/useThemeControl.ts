import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { notifyThemeChange } from './use-color-scheme';

const THEME_STORAGE_KEY = '@lifeflow_theme';

type ColorScheme = 'light' | 'dark' | null;

export function useThemeControl() {
  const systemColorScheme = useSystemColorScheme();
  const [theme, setThemeState] = useState<ColorScheme>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load saved theme preference
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((savedTheme) => {
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme);
      }
      setIsLoading(false);
    });
  }, []);

  const setTheme = async (newTheme: ColorScheme) => {
    setThemeState(newTheme);
    if (newTheme) {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } else {
      await AsyncStorage.removeItem(THEME_STORAGE_KEY);
    }
    // Notify all listeners about the theme change
    notifyThemeChange(newTheme);
  };

  const currentTheme = theme ?? systemColorScheme ?? 'light';
  const isSystemTheme = theme === null;

  return {
    theme: currentTheme,
    setTheme,
    isSystemTheme,
    isLoading,
  };
}
