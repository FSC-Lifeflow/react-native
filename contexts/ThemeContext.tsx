import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

const THEME_STORAGE_KEY = '@lifeflow_theme';

type ColorScheme = 'light' | 'dark';

interface ThemeContextType {
  theme: ColorScheme;
  setTheme: (theme: ColorScheme | null) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [theme, setThemeState] = useState<ColorScheme | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load saved theme preference on mount
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((savedTheme) => {
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme);
      }
      setIsLoading(false);
    });
  }, []);

  const setTheme = async (newTheme: ColorScheme | null) => {
    setThemeState(newTheme);
    if (newTheme) {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } else {
      await AsyncStorage.removeItem(THEME_STORAGE_KEY);
    }
  };

  const currentTheme = theme ?? systemColorScheme ?? 'light';

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default { ThemeProvider, useTheme };
