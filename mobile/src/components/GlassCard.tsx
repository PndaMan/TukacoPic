import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { BorderRadius, Spacing } from '../theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  padding?: boolean;
}

export function GlassCard({
  children,
  style,
  intensity = 60,
  tint = 'light',
  padding = true,
}: GlassCardProps) {
  return (
    <View style={[styles.container, style]}>
      <BlurView intensity={intensity} tint={tint} style={styles.blur}>
        <View style={[styles.inner, padding && styles.padded]}>
          {children}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.glass,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  blur: {
    overflow: 'hidden',
  },
  inner: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  padded: {
    padding: Spacing.lg,
  },
});
