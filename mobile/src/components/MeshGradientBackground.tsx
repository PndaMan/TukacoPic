import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme';

interface MeshGradientBackgroundProps {
  children: React.ReactNode;
  variant?: 'default' | 'warm' | 'cool';
}

export function MeshGradientBackground({
  children,
  variant = 'default',
}: MeshGradientBackgroundProps) {
  const gradientColors = {
    default: ['#E8DFFF', '#D4E7FF', '#F2F2F7'] as const,
    warm: ['#FFE4F0', '#FFECD2', '#F2F2F7'] as const,
    cool: ['#D4E7FF', '#E0F4FF', '#F2F2F7'] as const,
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...gradientColors[variant]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
});
