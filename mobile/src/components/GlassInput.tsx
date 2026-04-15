import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  Text,
  TextInputProps,
} from 'react-native';
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
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  focused: {
    borderColor: Colors.primary,
  },
  error: {
    borderColor: Colors.systemRed,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
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
