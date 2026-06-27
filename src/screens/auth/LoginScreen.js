import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { EntranceView } from '../../components/SamosaUI';
import { colors, imageSource, images, shadows } from '../../theme/brand';

const webScrollStyle = Platform.OS === 'web'
  ? {
    overflow: 'auto',
    overflowY: 'auto',
    touchAction: 'pan-y',
    WebkitOverflowScrolling: 'touch',
  }
  : null;

const LoginScreen = ({ navigation, route }) => {
  const { height } = useWindowDimensions();
  const { login } = useAuth();
  const role = route.params?.role;
  const roleLabel = route.params?.roleLabel || 'User';
  const canRequestAccess = ['vendor', 'sales', 'production', 'delivery'].includes(role);
  const compactLayout = height < 760;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (isSubmitting) {
      return;
    }

    setMessage('');

    if (!email.trim() || !password) {
      setMessage('Enter your email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email.trim().toLowerCase(), password, role);
    setIsSubmitting(false);

    if (!result.success) {
      setMessage(result.message);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={[styles.scroll, webScrollStyle]}
          contentContainerStyle={[styles.screenContent, compactLayout && styles.compactScreenContent]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <EntranceView style={styles.form}>
            <View style={[styles.brandPanel, compactLayout && styles.compactBrandPanel]}>
              <Image
                source={imageSource(images.logo)}
                style={[styles.logo, compactLayout && styles.compactLogo]}
                resizeMode="contain"
              />
              <Text style={[styles.roleBadge, compactLayout && styles.compactRoleBadge]}>{roleLabel}</Text>
              <Text style={[styles.title, compactLayout && styles.compactTitle]}>Hot & Fresh Everytime</Text>
              <Text style={[styles.subtitle, compactLayout && styles.compactSubtitle]}>
                {role === 'admin'
                  ? 'Use the single admin email and password configured in server .env.'
                  : role === 'vendor'
                    ? 'Login with your vendor credential or create an OTP-verified account.'
                    : canRequestAccess
                    ? 'Sign in after admin verifies your signup request.'
                    : 'Sign in with the vendor credential created by admin.'}
              </Text>
            </View>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, compactLayout && styles.compactInput]}
              placeholderTextColor="#8A8A8A"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              style={[styles.input, compactLayout && styles.compactInput]}
              placeholderTextColor="#8A8A8A"
            />

            {!!message && <Text style={styles.message}>{message}</Text>}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                compactLayout && styles.compactPrimaryButton,
                pressed && styles.pressed,
                isSubmitting && styles.disabled,
              ]}
              onPress={handleLogin}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Login</Text>
              )}
            </Pressable>

            <View style={[styles.linkGroup, compactLayout && styles.compactLinkGroup]}>
              <Pressable
                style={({ pressed }) => [styles.linkButton, compactLayout && styles.compactLinkButton, pressed && styles.pressed]}
                onPress={() => navigation.navigate('ForgotPassword', { role })}
              >
                <Text style={[styles.linkText, compactLayout && styles.compactLinkText]}>Forgot password</Text>
              </Pressable>
              {canRequestAccess && (
                <Pressable
                  style={({ pressed }) => [styles.linkButton, compactLayout && styles.compactLinkButton, pressed && styles.pressed]}
                  onPress={() => navigation.navigate('Register', { role, roleLabel })}
                >
                  <Text style={[styles.linkText, compactLayout && styles.compactLinkText]}>Request signup</Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [styles.linkButton, compactLayout && styles.compactLinkButton, pressed && styles.pressed]}
                onPress={() => navigation.navigate('RoleSelection')}
              >
                <Text style={[styles.linkText, compactLayout && styles.compactLinkText]}>Choose another role</Text>
              </Pressable>
            </View>
          </EntranceView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.appBg,
  },
  keyboard: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  screenContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  compactScreenContent: {
    justifyContent: 'flex-start',
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  form: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    ...shadows.card,
  },
  brandPanel: {
    alignItems: 'center',
    marginBottom: 18,
  },
  compactBrandPanel: {
    marginBottom: 12,
  },
  logo: {
    height: 148,
    width: 210,
  },
  compactLogo: {
    height: 92,
    width: 132,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
    textAlign: 'center',
  },
  compactTitle: {
    fontSize: 22,
    marginTop: 0,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  compactSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  roleBadge: {
    backgroundColor: colors.greenSoft,
    borderRadius: 8,
    color: colors.red,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  compactRoleBadge: {
    fontSize: 11,
    marginTop: 2,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  input: {
    alignSelf: 'center',
    backgroundColor: colors.cream,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '100%',
  },
  compactInput: {
    fontSize: 15,
    marginBottom: 8,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  message: {
    color: colors.redDark,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.red,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 4,
    width: '100%',
    alignSelf: 'center',
    ...shadows.soft,
  },
  compactPrimaryButton: {
    minHeight: 44,
    marginTop: 2,
  },
  primaryButtonText: {
    color: colors.onBrand,
    fontSize: 16,
    fontWeight: '700',
  },
  linkGroup: {
    alignItems: 'center',
    marginTop: 8,
  },
  compactLinkGroup: {
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 10,
    width: 290,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  compactLinkButton: {
    backgroundColor: colors.greenSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  linkText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '600',
  },
  compactLinkText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.55,
  },
});

export default LoginScreen;
