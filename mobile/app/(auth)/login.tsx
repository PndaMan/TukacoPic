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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    const result = await login(username.trim(), password);
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setError(result.error || 'Login failed');
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
          <Text style={styles.logo}>TukacoPic</Text>
          <Text style={styles.title}>Welcome Back</Text>

          <GlassCard style={styles.card}>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <GlassInput
              label="Username"
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={{ height: Spacing.md }} />

            <GlassInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <View style={{ height: Spacing.xl }} />

            <GlassButton
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
              size="large"
            />
          </GlassCard>

          <Pressable
            onPress={() => router.replace('/(auth)/register')}
            style={styles.switchLink}
          >
            <Text style={styles.switchText}>
              Don't have an account?{' '}
              <Text style={styles.switchHighlight}>Sign Up</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </MeshGradientBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    flexGrow: 1,
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
