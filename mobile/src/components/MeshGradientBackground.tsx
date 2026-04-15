import React from 'react';
import { StyleSheet, View } from 'react-native';

interface MeshGradientBackgroundProps {
  children: React.ReactNode;
  variant?: 'default' | 'warm' | 'cool';
}

export function MeshGradientBackground({
  children,
  variant = 'default',
}: MeshGradientBackgroundProps) {
  return (
    <View style={styles.container}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
