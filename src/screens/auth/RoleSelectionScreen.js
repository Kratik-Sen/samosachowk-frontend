import React from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EntranceView } from '../../components/SamosaUI';
import { colors, imageSource, images, shadows } from '../../theme/brand';

export const roles = [
  {
    key: 'vendor',
    label: 'Vendor',
    description: 'Login or create an OTP-verified account.',
    icon: 'store',
  },
  {
    key: 'sales',
    label: 'Sales Team',
    description: 'Login or request admin-verified team access.',
    icon: 'chart-line',
  },
  {
    key: 'production',
    label: 'Production Team',
    description: 'Login or request admin-verified team access.',
    icon: 'factory',
  },
  {
    key: 'delivery',
    label: 'Delivery Team',
    description: 'Login or request admin-verified team access.',
    icon: 'moped',
  },
  {
    key: 'admin',
    label: 'Admin Login',
    description: 'Use the single server .env admin credential.',
    icon: 'shield-account',
  },
];

const webScrollStyle = Platform.OS === 'web'
  ? {
      overflow: 'auto',
      overflowY: 'auto',
      touchAction: 'pan-y',
      WebkitOverflowScrolling: 'touch',
    }
  : null;

const RoleSelectionScreen = ({ navigation }) => {
  const { height, width } = useWindowDimensions();
  const compactLayout = height < 620;
  const twoColumnLayout = compactLayout && width >= 430;

  const selectRole = (role) => {
    navigation.navigate('Login', { role: role.key, roleLabel: role.label });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        style={[styles.scroll, webScrollStyle]}
        contentContainerStyle={[styles.screenContent, compactLayout && styles.compactScreenContent]}
        showsVerticalScrollIndicator={false}
      >
        <EntranceView style={styles.contentWrap}>
          <View style={[styles.header, compactLayout && styles.compactHeader]}>
            <Image
              source={imageSource(images.logo)}
              style={[styles.logo, compactLayout && styles.compactLogo]}
              resizeMode="contain"
            />
            <Text style={[styles.title, compactLayout && styles.compactTitle]}>Who are you?</Text>
            <Text style={[styles.subtitle, compactLayout && styles.compactSubtitle]}>
              Choose your role before login.
            </Text>
          </View>

          <View style={[styles.grid, twoColumnLayout && styles.twoColumnGrid]}>
            {roles.map((role) => (
              <Pressable
                key={role.key}
                style={({ pressed }) => [
                  styles.card,
                  compactLayout && styles.compactCard,
                  twoColumnLayout && styles.twoColumnCard,
                  role.key === 'admin' && styles.adminCard,
                  pressed && styles.pressed,
                ]}
                onPress={() => selectRole(role)}
              >
                <View style={[styles.icon, compactLayout && styles.compactIcon]}>
                  <MaterialCommunityIcons
                    name={role.icon}
                    size={compactLayout ? 20 : 24}
                    color={role.key === 'admin' ? colors.yellow : colors.red}
                  />
                </View>
                <View style={styles.content}>
                  <Text
                    style={[
                      styles.roleTitle,
                      compactLayout && styles.compactRoleTitle,
                      role.key === 'admin' && styles.adminText,
                    ]}
                  >
                    {role.label}
                  </Text>
                  <Text
                    numberOfLines={compactLayout ? 1 : 2}
                    style={[
                      styles.roleDescription,
                      compactLayout && styles.compactRoleDescription,
                      role.key === 'admin' && styles.adminDescription,
                    ]}
                  >
                    {role.description}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={compactLayout ? 18 : 22}
                  color={role.key === 'admin' ? colors.onBrand : colors.softText}
                />
              </Pressable>
            ))}
          </View>
        </EntranceView>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.appBg,
  },
  scroll: {
    flex: 1,
  },
  screenContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 28,
    paddingHorizontal: 16,
    paddingTop: 28,
  },
  compactScreenContent: {
    justifyContent: 'flex-start',
    paddingBottom: 14,
    paddingTop: 10,
  },
  contentWrap: {
    alignSelf: 'center',
    maxWidth: 434,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  compactHeader: {
    marginBottom: 10,
  },
  logo: {
    height: 112,
    width: 164,
  },
  compactLogo: {
    height: 68,
    width: 104,
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'center',
  },
  compactTitle: {
    fontSize: 24,
    marginTop: 0,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'center',
  },
  compactSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  grid: {
    gap: 10,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 86,
    padding: 14,
    ...shadows.soft,
  },
  compactCard: {
    minHeight: 54,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  twoColumnCard: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  adminCard: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    marginRight: 12,
    width: 46,
  },
  compactIcon: {
    height: 38,
    marginRight: 10,
    width: 38,
  },
  content: {
    flex: 1,
  },
  roleTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  compactRoleTitle: {
    fontSize: 14,
  },
  adminText: {
    color: colors.onBrand,
  },
  roleDescription: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 3,
    paddingRight: 4,
  },
  compactRoleDescription: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 1,
  },
  adminDescription: {
    color: '#FFFFFFCC',
  },
  pressed: {
    opacity: 0.84,
  },
});

export default RoleSelectionScreen;
