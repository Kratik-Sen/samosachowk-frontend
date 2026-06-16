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

const selfSignupRoles = ['sales', 'production', 'delivery'];

const webScrollStyle = Platform.OS === 'web'
  ? {
      overflow: 'auto',
      overflowY: 'auto',
      touchAction: 'pan-y',
      WebkitOverflowScrolling: 'touch',
    }
  : null;

const RegisterScreen = ({ navigation, route }) => {
  const { height } = useWindowDimensions();
  const { register } = useAuth();
  const role = route.params?.role;
  const roleLabel = route.params?.roleLabel || 'Team';
  const compactLayout = height < 820;
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleRegister = async () => {
    if (isSubmitting) {
      return;
    }

    setMessage('');

    if (!selfSignupRoles.includes(role)) {
      setMessage('Only sales, production, and delivery teams can request signup.');
      return;
    }

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setMessage('Name, email, and password are required.');
      return;
    }

    if (form.password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await register({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      password: form.password,
      role,
    });
    setIsSubmitting(false);

    if (result.success) {
      setForm({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
      setMessage(result.message || 'Signup request sent to admin for verification.');
      return;
    }

    setMessage(result.message);
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
          <View style={[styles.header, compactLayout && styles.compactHeader]}>
            <Image
              source={imageSource(images.logo)}
              style={[styles.logo, compactLayout && styles.compactLogo]}
              resizeMode="contain"
            />
            <View style={[styles.headerCopy, compactLayout && styles.compactHeaderCopy]}>
              <Text style={[styles.roleBadge, compactLayout && styles.compactRoleBadge]}>{roleLabel}</Text>
              <Text style={[styles.title, compactLayout && styles.compactTitle]}>Request Access</Text>
              <Text style={[styles.subtitle, compactLayout && styles.compactSubtitle]}>
                Admin must verify your email and password before login works.
              </Text>
            </View>
          </View>

          <TextInput
            value={form.name}
            onChangeText={(value) => updateField('name', value)}
            placeholder="Full name"
            style={[styles.input, compactLayout && styles.compactInput]}
            placeholderTextColor="#8A8A8A"
          />
          <TextInput
            value={form.email}
            onChangeText={(value) => updateField('email', value)}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            style={[styles.input, compactLayout && styles.compactInput]}
            placeholderTextColor="#8A8A8A"
          />
          <TextInput
            value={form.phone}
            onChangeText={(value) => updateField('phone', value)}
            placeholder="Phone"
            keyboardType="phone-pad"
            style={[styles.input, compactLayout && styles.compactInput]}
            placeholderTextColor="#8A8A8A"
          />
          <TextInput
            value={form.password}
            onChangeText={(value) => updateField('password', value)}
            placeholder="Password"
            secureTextEntry
            style={[styles.input, compactLayout && styles.compactInput]}
            placeholderTextColor="#8A8A8A"
          />
          <TextInput
            value={form.confirmPassword}
            onChangeText={(value) => updateField('confirmPassword', value)}
            placeholder="Confirm password"
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
            onPress={handleRegister}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Send Request</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.linkButton, compactLayout && styles.compactLinkButton, pressed && styles.pressed]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.linkText, compactLayout && styles.compactLinkText]}>Back to login</Text>
          </Pressable>
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
    paddingTop: 10,
  },
  form: {
    alignSelf: 'center',
    maxWidth: 340,
    width: '100%',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    ...shadows.card,
  },
  header: {
    marginBottom: 22,
  },
  compactHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  headerCopy: {
    width: '100%',
  },
  compactHeaderCopy: {
    flex: 1,
    width: 'auto',
  },
  logo: {
    height: 118,
    width: 164,
    marginBottom: 8,
  },
  compactLogo: {
    height: 72,
    marginBottom: 0,
    width: 100,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.greenSoft,
    borderRadius: 8,
    color: colors.red,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  compactRoleBadge: {
    fontSize: 11,
    marginBottom: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 8,
  },
  compactTitle: {
    fontSize: 24,
    marginBottom: 4,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginBottom: 22,
  },
  compactSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 0,
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
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.red,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    width: '100%',
    ...shadows.soft,
  },
  compactPrimaryButton: {
    minHeight: 44,
    marginTop: 2,
  },
  primaryButtonText: {
    color: colors.onBrand,
    fontSize: 16,
    fontWeight: '800',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  compactLinkButton: {
    alignSelf: 'center',
    backgroundColor: colors.greenSoft,
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  linkText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
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

export default RegisterScreen;
