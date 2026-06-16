import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { useThemeMode } from '../context/ThemeContext';
import { imageSource, images } from '../theme/brand';

const AppOpeningLoader = ({ label = 'Opening Samosa Chowk...' }) => {
  const { palette } = useThemeMode();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 680,
          easing: Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 680,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const logoScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });
  const logoOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  return (
    <View style={[styles.screen, { backgroundColor: palette.appBg }]}>
      <Animated.Image
        source={imageSource(images.logo)}
        resizeMode="contain"
        style={[
          styles.logo,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
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
  logo: {
    height: 156,
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
