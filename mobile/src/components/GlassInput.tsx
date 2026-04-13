import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  Text,
  TextInputProps,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, Typography, BorderRadius, Spacing } from '../theme';

interface GlassInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function GlassInput({
  label,
  error,
  icon,
  style,
  ...props
}: GlassInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.container,
          focused && styles.focused,
          error ? styles.error : null,
        ]}
      >
        <BlurView intensity={30} tint="light" style={styles.blur}>
          <View style={styles.inner}>
            {icon && <View style={styles.icon}>{icon}</View>}
            <TextInput
              style={[styles.input, style]}
              placeholderTextColor={Colors.text.tertiary}
              onFocus={(e) => {
                setFocused(true);
                props.onFocus?.(e);
              }}
              onBlur={(e) => {
                setFocused(false);
                props.onBlur?.(e);
              }}
              {...props}
            />
          </View>
        </BlurView>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.subheadline,
    fontWeight: '500',
    color: Colors.text.secondary,
    marginLeft: Spacing.xs,
  },
  container: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  focused: {
    borderColor: Colors.primary,
  },
  error: {
    borderColor: Colors.systemRed,
  },
  blur: {
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.lg,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
    paddingVertical: 14,
  },
  errorText: {
    ...Typography.caption1,
    color: Colors.systemRed,
    marginLeft: Spacing.xs,
  },
});
