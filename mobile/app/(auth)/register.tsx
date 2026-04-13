import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../../src/theme';
import {
  MeshGradientBackground,
  GlassCard,
  GlassButton,
  GlassInput,
} from '../../src/components';
import { useAuthStore } from '../../src/store/authStore';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleRegister = async () => {
    const newErrors: Record<string, string> = {};
    if (!username.trim()) newErrors.username = 'Username is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    if (password !== confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const result = await register({
      username: username.trim(),
      email: email.trim(),
      password,
    });

    if (result.success) {
      router.replace('/(tabs)');
    } else {
      if (typeof result.error === 'object') {
        const serverErrors: Record<string, string> = {};
        for (const [key, val] of Object.entries(result.error)) {
          serverErrors[key] = Array.isArray(val) ? val[0] : String(val);
        }
        setErrors(serverErrors);
      } else {
        setErrors({ general: result.error || 'Registration failed' });
      }
    }
  };

  return (
    <MeshGradientBackground variant="cool">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.back()}
            style={[styles.closeBtn, { top: insets.top + Spacing.md }]}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <Text style={styles.logo}>TukacoPic</Text>
          <Text style={styles.title}>Create Account</Text>

          <GlassCard style={styles.card}>
            {errors.general && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}

            <GlassInput
              label="Username"
              placeholder="Choose a username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.username}
            />

            <View style={{ height: Spacing.md }} />

            <GlassInput
              label="Email"
              placeholder="Your email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              error={errors.email}
            />

            <View style={{ height: Spacing.md }} />

            <GlassInput
              label="Password"
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={errors.password}
            />

            <View style={{ height: Spacing.md }} />

            <GlassInput
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              error={errors.confirmPassword}
            />

            <View style={{ height: Spacing.xl }} />

            <GlassButton
              title="Create Account"
              onPress={handleRegister}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
              size="large"
            />
          </GlassCard>

          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            style={styles.switchLink}
          >
            <Text style={styles.switchText}>
              Already have an account?{' '}
              <Text style={styles.switchHighlight}>Sign In</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </MeshGradientBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    paddingHorizontal: Spacing.xl,
    flexGrow: 1,
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: Spacing.xl,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  logo: {
    ...Typography.largeTitle,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.title2,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },
  card: {
    marginBottom: Spacing.xl,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    ...Typography.subheadline,
    color: Colors.systemRed,
    textAlign: 'center',
  },
  switchLink: {
    alignSelf: 'center',
  },
  switchText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  switchHighlight: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
