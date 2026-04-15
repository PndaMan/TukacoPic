import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { BorderRadius, Spacing } from '../theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  padding?: boolean;
}

export function GlassCard({
  children,
  style,
  padding = true,
}: GlassCardProps) {
  return (
    <View style={[styles.container, padding && styles.padded, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.glass,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: '#F8F8FA',
  },
  padded: {
    padding: Spacing.lg,
  },
});
