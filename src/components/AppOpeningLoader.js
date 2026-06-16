import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { useThemeMode } from '../context/ThemeContext';
import samosaLoader from '../../assets/samosa-loader-lottie.json';

const AppOpeningLoader = ({ label = '' }) => {
  const { isDark, palette } = useThemeMode();
  const backgroundColor = isDark ? palette.appBg : '#FFF6DB';

  return (
    <View style={[styles.screen, { backgroundColor }]}>
      <LottieView
        autoPlay
        loop={false}
        resizeMode="contain"
        source={samosaLoader}
        speed={1.6}
        style={styles.loader}
        webStyle={Platform.OS === 'web' ? styles.loader : undefined}
      />
      {!!label && <Text style={[styles.label, { color: palette.muted }]}>{label}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 420,
    paddingHorizontal: 28,
  },
  loader: {
    height: 220,
    width: 220,
  },
  label: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 22,
    textAlign: 'center',
  },
});

export default AppOpeningLoader;
