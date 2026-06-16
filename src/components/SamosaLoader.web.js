import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/brand';

const SamosaLoader = ({ label = 'Loading fresh data...', compact = false, fullscreen = false }) => (
  <View style={[styles.loaderBox, compact && styles.loaderCompact, fullscreen && styles.loaderFullscreen]}>
    <View style={[styles.spinnerShell, compact && styles.spinnerShellCompact]}>
      <ActivityIndicator color={colors.amber} size={compact ? 'small' : 'large'} />
    </View>
    {!!label && <Text style={[styles.loaderText, compact && styles.loaderTextCompact]}>{label}</Text>}
  </View>
);

const styles = StyleSheet.create({
  loaderBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  loaderCompact: {
    paddingHorizontal: 0,
  },
  loaderFullscreen: {
    backgroundColor: colors.appBg,
    flex: 1,
    minHeight: 360,
    padding: 28,
  },
  spinnerShell: {
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  spinnerShellCompact: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    height: 30,
    width: 30,
  },
  loaderText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 8,
    textAlign: 'center',
  },
  loaderTextCompact: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
});

export default SamosaLoader;
