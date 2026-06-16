import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkPalette, lightPalette } from '../theme/brand';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'samosa-theme-mode';

const cssName = (key) => key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const applyWebTheme = (mode) => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  const palette = mode === 'light' ? lightPalette : darkPalette;
  Object.entries(palette).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--sc-${cssName(key)}`, value);
  });
  document.documentElement.style.colorScheme = mode;

  if (document.body) {
    document.body.style.backgroundColor = palette.appBg;
  }
};

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState('dark');
  const [hasLoadedStoredMode, setHasLoadedStoredMode] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((storedMode) => {
        if (isMounted && (storedMode === 'light' || storedMode === 'dark')) {
          setMode(storedMode);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) {
          setHasLoadedStoredMode(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    applyWebTheme(mode);

    if (hasLoadedStoredMode) {
      AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
    }
  }, [hasLoadedStoredMode, mode]);

  const value = useMemo(() => ({
    isDark: mode === 'dark',
    mode,
    palette: mode === 'light' ? lightPalette : darkPalette,
    setMode,
    toggleTheme: () => setMode((current) => (current === 'dark' ? 'light' : 'dark')),
  }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeMode = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    return {
      isDark: true,
      mode: 'dark',
      palette: darkPalette,
      setMode: () => {},
      toggleTheme: () => {},
    };
  }

  return context;
};
