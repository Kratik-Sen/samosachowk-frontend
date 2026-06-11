import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/SamosaUI';
import { useAuth } from '../../context/AuthContext';
import { colors, imageSource, images } from '../../theme/brand';

const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);
      await logout();
    } finally {
      if (isMountedRef.current) {
        setIsLoggingOut(false);
      }
    }
  };

  return (
    <AppScreen>
      <View style={styles.content}>
        <Image source={imageSource(images.logo)} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>{user?.name || 'Profile'}</Text>
        <Text style={styles.meta}>{user?.email}</Text>
        <Text style={styles.badge}>{user?.role || 'vendor'}</Text>

        <View style={styles.details}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{user?.phone || 'Not available'}</Text>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{user?.status || 'pending'}</Text>
        </View>

        <Pressable
          disabled={isLoggingOut}
          style={({ pressed }) => [styles.button, pressed && styles.pressed, isLoggingOut && styles.disabled]}
          onPress={handleLogout}
        >
          {isLoggingOut && <ActivityIndicator color={colors.white} />}
          <Text style={styles.buttonText}>{isLoggingOut ? 'Loading...' : 'Logout'}</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  content: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 48,
  },
  logo: {
    height: 110,
    width: 150,
    marginBottom: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 6,
  },
  meta: {
    color: colors.muted,
    fontSize: 15,
    marginBottom: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 8,
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  details: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 24,
    padding: 16,
  },
  label: {
    color: colors.softText,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  value: {
    color: colors.ink,
    fontSize: 16,
    marginTop: 4,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.red,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.55,
  },
});

export default ProfileScreen;
