import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeMode } from '../context/ThemeContext';
import { shadows } from '../theme/brand';

const ThemeToggle = () => {
  const { isDark, palette, toggleTheme } = useThemeMode();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.toggle,
        {
          backgroundColor: palette.white,
          borderColor: palette.contrastBorder,
        },
        pressed && styles.pressed,
      ]}
      onPress={toggleTheme}
    >
      <View
        style={[
          styles.knob,
          {
            backgroundColor: isDark ? palette.activeTint : palette.red,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={isDark ? 'weather-night' : 'white-balance-sunny'}
          size={16}
          color={isDark ? palette.black : palette.onBrand}
        />
      </View>
      <Text style={[styles.label, { color: palette.ink }]}>{isDark ? 'Dark' : 'Light'}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  toggle: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 40,
    paddingLeft: 5,
    paddingRight: 12,
    ...shadows.soft,
  },
  knob: {
    alignItems: 'center',
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.84,
  },
});

export default ThemeToggle;
