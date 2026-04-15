import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing } from '../theme';

interface GlassHeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  large?: boolean;
}

export function GlassHeader({
  title,
  showBack = false,
  rightAction,
  large = false,
}: GlassHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <View style={[styles.inner, large && styles.innerLarge]}>
        <View style={styles.row}>
          {showBack ? (
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>{'‹'}</Text>
            </Pressable>
          ) : (
            <View style={styles.spacer} />
          )}
          {!large && (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}
          <View style={styles.rightSlot}>{rightAction}</View>
        </View>
        {large && (
          <Text style={styles.largeTitle}>{title}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: '#FFFFFF',
  },
  inner: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  innerLarge: {
    paddingBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -Spacing.sm,
  },
  backText: {
    fontSize: 32,
    fontWeight: '300',
    color: Colors.primary,
    marginTop: -4,
  },
  spacer: {
    width: 40,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    ...Typography.headline,
    color: Colors.text.primary,
  },
  largeTitle: {
    ...Typography.largeTitle,
    color: Colors.text.primary,
    marginTop: Spacing.xs,
  },
  rightSlot: {
    width: 40,
    alignItems: 'flex-end',
  },
});
