import React from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { RealtimeProvider } from './src/context/RealtimeContext';
import { ThemeProvider, useThemeMode } from './src/context/ThemeContext';
import ThemeToggle from './src/components/ThemeToggle';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme/brand';

class AppErrorBoundary extends React.Component {
  state = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Something went wrong.',
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App render error', error, errorInfo?.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      const palette = this.props.palette || {
        appBg: colors.appBg,
        ink: colors.ink,
        muted: colors.muted,
        red: colors.red,
        onBrand: colors.onBrand,
      };

      return (
        <View style={[styles.errorScreen, { backgroundColor: palette.appBg }]}>
          <Text style={[styles.errorTitle, { color: palette.ink }]}>Unable to load this panel</Text>
          <Text style={[styles.errorText, { color: palette.muted }]}>{this.state.message}</Text>
          <Pressable style={[styles.errorButton, { backgroundColor: palette.red }]} onPress={this.reset}>
            <Text style={[styles.errorButtonText, { color: palette.onBrand }]}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const AppShell = () => {
  const { user, isLoading } = useAuth();
  const { isDark, palette } = useThemeMode();
  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: palette.appBg,
      border: palette.contrastBorder,
      card: palette.white,
      primary: palette.red,
      text: palette.ink,
    },
  };

  return (
    <SafeAreaView style={[styles.safeRoot, { backgroundColor: palette.appBg }]} edges={['bottom', 'left', 'right']}>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={palette.appBg} />
        <AppErrorBoundary palette={palette}>
          <RootNavigator />
        </AppErrorBoundary>
        {!user && !isLoading && (
          <View style={styles.authThemeToggle}>
            <ThemeToggle />
          </View>
        )}
      </NavigationContainer>
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <RealtimeProvider>
            <AppShell />
          </RealtimeProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeRoot: {
    flex: 1,
    backgroundColor: colors.appBg,
  },
  authThemeToggle: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  errorScreen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 18,
    textAlign: 'center',
  },
  errorButton: {
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  errorButtonText: {
    fontSize: 14,
    fontWeight: '900',
  },
});
