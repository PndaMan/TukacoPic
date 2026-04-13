import React from 'react';
import { StyleSheet, View, Pressable, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing } from '../theme';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      <View style={styles.container}>
        <BlurView intensity={80} tint="light" style={styles.blur}>
          <View style={styles.inner}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === index;
              const label = (options.tabBarLabel ?? options.title ?? route.name) as string;
              const Icon = options.tabBarIcon;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate(route.name);
                }
              };

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  style={[styles.tab, isFocused && styles.tabActive]}
                >
                  {Icon && (
                    <View style={isFocused ? styles.iconActive : undefined}>
                      {Icon({
                        focused: isFocused,
                        color: isFocused ? Colors.primary : Colors.text.secondary,
                        size: 22,
                      })}
                    </View>
                  )}
                  <Text
                    style={[
                      styles.label,
                      isFocused && styles.labelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  container: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    width: '100%',
    maxWidth: 420,
  },
  blur: {
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    gap: 2,
  },
  tabActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
  },
  iconActive: {
    transform: [{ scale: 1.1 }],
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.text.secondary,
    marginTop: 2,
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
