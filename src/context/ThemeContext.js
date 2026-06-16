import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkPalette, lightPalette } from '../theme/brand';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'samosa-theme-mode';
const THEME_TRANSITION_MS = 260;
const WEB_THEME_TRANSITION_STYLE_ID = 'samosa-theme-transition-style';

const cssName = (key) => key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ensureWebThemeTransition = () => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  if (document.getElementById(WEB_THEME_TRANSITION_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = WEB_THEME_TRANSITION_STYLE_ID;
  style.textContent = `
@media (prefers-reduced-motion: no-preference) {
  html,
  body,
  #root {
    transition: background-color ${THEME_TRANSITION_MS}ms ease, color ${THEME_TRANSITION_MS}ms ease;
  }

  body *,
  body *::before,
  body *::after {
    transition-property: background-color, border-color, color, box-shadow, fill, stroke;
    transition-duration: ${THEME_TRANSITION_MS}ms;
    transition-timing-function: ease;
  }
}
`;
  document.head.appendChild(style);
};

const configureNativeThemeTransition = () => {
  if (Platform.OS === 'web') {
    return;
  }

  LayoutAnimation.configureNext({
    duration: THEME_TRANSITION_MS,
    create: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
    update: {
      type: LayoutAnimation.Types.easeInEaseOut,
    },
    delete: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
  });
};

const applyWebTheme = (mode) => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  ensureWebThemeTransition();

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

  const updateMode = useCallback((nextModeOrUpdater) => {
    configureNativeThemeTransition();
    setMode((currentMode) => {
      const nextMode =
        typeof nextModeOrUpdater === 'function' ? nextModeOrUpdater(currentMode) : nextModeOrUpdater;

      return nextMode === 'light' || nextMode === 'dark' ? nextMode : currentMode;
    });
  }, []);

  const value = useMemo(() => ({
    isDark: mode === 'dark',
    mode,
    palette: mode === 'light' ? lightPalette : darkPalette,
    setMode: updateMode,
    toggleTheme: () => updateMode((current) => (current === 'dark' ? 'light' : 'dark')),
  }), [mode, updateMode]);

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
