import React from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  View,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, BorderRadius, Spacing } from '../theme';

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'glass';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function GlassButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
  fullWidth = false,
}: GlassButtonProps) {
  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  if (variant === 'glass') {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.glassOuter,
          fullWidth && styles.fullWidth,
          pressed && styles.pressed,
          disabled && styles.disabled,
          style,
        ]}
      >
        <BlurView intensity={40} tint="light" style={styles.glassBlur}>
          <View style={[styles.glassInner, sizeStyles[size]]}>
            {loading ? (
              <ActivityIndicator color={Colors.text.primary} size="small" />
            ) : (
              <View style={styles.content}>
                {icon}
                <Text style={[styles.glassText, sizeTextStyles[size]]}>
                  {title}
                </Text>
              </View>
            )}
          </View>
        </BlurView>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' ? Colors.primary : '#FFF'}
          size="small"
        />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text
            style={[
              styles.text,
              variantTextStyles[variant],
              sizeTextStyles[size],
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  text: {
    fontWeight: '600',
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.4,
  },
  glassOuter: {
    borderRadius: BorderRadius.pill,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  glassBlur: {
    overflow: 'hidden',
  },
  glassInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassText: {
    color: Colors.text.primary,
    fontWeight: '600',
  },
});

const variantStyles: Record<string, ViewStyle> = {
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  danger: {
    backgroundColor: Colors.systemRed,
  },
};

const variantTextStyles: Record<string, any> = {
  primary: { color: '#FFFFFF' },
  secondary: { color: Colors.primary },
  danger: { color: '#FFFFFF' },
};

const sizeStyles: Record<string, ViewStyle> = {
  small: { paddingHorizontal: 16, paddingVertical: 8 },
  medium: { paddingHorizontal: 24, paddingVertical: 12 },
  large: { paddingHorizontal: 32, paddingVertical: 16 },
};

const sizeTextStyles: Record<string, any> = {
  small: { fontSize: 14 },
  medium: { fontSize: 16 },
  large: { fontSize: 18 },
};
