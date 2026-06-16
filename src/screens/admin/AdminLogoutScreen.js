import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { AppScreen, BrandHero, PrimaryButton } from '../../components/SamosaUI';
import { useAuth } from '../../context/AuthContext';
import { colors, images, shadows } from '../../theme/brand';

const AdminLogoutScreen = () => {
  const { user, logout } = useAuth();

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Admin session"
        title="Logout"
        subtitle="End this admin session after managing users, reports, outlets, orders, and payments."
        image={images.heroSamosa}
        compact
      />

      <View style={styles.panel}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{user?.email || 'Admin'}</Text>
        <Text style={styles.meta}>Role: {user?.role || 'admin'}</Text>
      </View>

      <PrimaryButton label="Logout Admin" icon="logout" onPress={logout} />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
    ...shadows.card,
  },
  label: {
    color: colors.softText,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  value: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 6,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6,
  },
});

export default AdminLogoutScreen;
