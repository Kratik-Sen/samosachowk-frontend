import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_URL } from '../../context/AuthContext';
import { EntranceView } from '../../components/SamosaUI';
import { colors, shadows } from '../../theme/brand';

const ForgotPasswordScreen = ({ navigation, route }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const role = route.params?.role;

  const requestReset = async () => {
    if (isSubmitting) {
      return;
    }

    if (!email.trim()) {
      setMessage('Enter your account email.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await axios.post(`${API_URL}/auth/forgot-password`, {
        email: email.trim().toLowerCase(),
        role,
      });
      setMessage(response.data.message);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to request reset');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.screenContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <EntranceView style={styles.content}>
          <Text style={styles.title}>Password Reset</Text>
          <Text style={styles.body}>Submit your email. Admin can reset your credential from access management.</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            placeholderTextColor="#8A8A8A"
          />
          {!!message && <Text style={styles.message}>{message}</Text>}
          <Pressable
            disabled={isSubmitting}
            style={({ pressed }) => [styles.button, pressed && styles.pressed, isSubmitting && styles.disabled]}
            onPress={requestReset}
          >
            {isSubmitting ? (
              <>
                <ActivityIndicator color={colors.onBrand} />
                <Text style={styles.buttonText}>Loading...</Text>
              </>
            ) : (
              <Text style={styles.buttonText}>Request Reset</Text>
            )}
          </Pressable>
          <Pressable style={styles.linkButton} onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Back to login</Text>
          </Pressable>
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
    padding: 24,
  },
  content: {
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
    ...shadows.card,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 12,
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  input: {
    backgroundColor: colors.cream,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  message: {
    color: colors.redDark,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.red,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    justifyContent: 'center',
    ...shadows.soft,
  },
  buttonText: {
    color: colors.onBrand,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.55,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  linkText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
});

export default ForgotPasswordScreen;
