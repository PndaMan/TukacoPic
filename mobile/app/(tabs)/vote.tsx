import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/theme';
import { MeshGradientBackground, GlassButton, getImageUrl } from '../../src/components';
import api from '../../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2;

export default function VoteScreen() {
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<any>(null);
  const [nextPhotos, setNextPhotos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState(false);
  const [message, setMessage] = useState('');

  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const opacity1 = useSharedValue(1);
  const opacity2 = useSharedValue(1);

  const fetchPair = useCallback(async () => {
    try {
      const res = await api.get('/photos/pair/');
      const data = res.data;
      // API returns { photos: [p1, p2] } — normalize to { photo1, photo2 }
      if (data.photos && Array.isArray(data.photos)) {
        return { photo1: data.photos[0], photo2: data.photos[1] };
      }
      return data;
    } catch (e: any) {
      if (e.response?.status === 404) {
        setMessage("You've voted on all available pairs!");
      }
      return null;
    }
  }, []);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    const pair = await fetchPair();
    if (pair) {
      setPhotos(pair);
      // Preload next pair
      fetchPair().then(setNextPhotos);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPhotos();
  }, []);

  const resetAnimations = () => {
    scale1.value = 1;
    scale2.value = 1;
    opacity1.value = 1;
    opacity2.value = 1;
  };

  const handleVote = async (winnerId: number, isFirst: boolean) => {
    if (voted) return;
    setVoted(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Animate the chosen photo
    if (isFirst) {
      scale1.value = withSpring(1.05);
      scale2.value = withTiming(0.9);
      opacity2.value = withTiming(0.4);
    } else {
      scale2.value = withSpring(1.05);
      scale1.value = withTiming(0.9);
      opacity1.value = withTiming(0.4);
    }

    try {
      const loserId = isFirst ? photos.photo2.id : photos.photo1.id;
      await api.post('/vote/', {
        winner_id: winnerId,
        loser_id: loserId,
      });
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => {
      resetAnimations();
      if (nextPhotos) {
        setPhotos(nextPhotos);
        setNextPhotos(null);
        fetchPair().then(setNextPhotos);
      } else {
        loadPhotos();
      }
      setVoted(false);
    }, 600);
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetAnimations();
    if (nextPhotos) {
      setPhotos(nextPhotos);
      setNextPhotos(null);
      fetchPair().then(setNextPhotos);
    } else {
      loadPhotos();
    }
  };

  const animStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
    opacity: opacity1.value,
  }));

  const animStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
    opacity: opacity2.value,
  }));

  if (loading) {
    return (
      <MeshGradientBackground variant="warm">
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </MeshGradientBackground>
    );
  }

  if (message || !photos) {
    return (
      <MeshGradientBackground variant="warm">
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <Text style={styles.emptyIcon}>✨</Text>
          <Text style={styles.emptyText}>
            {message || "No more photos to vote on!"}
          </Text>
          <GlassButton
            title="Try Again"
            onPress={loadPhotos}
            variant="glass"
            style={{ marginTop: Spacing.xl }}
          />
        </View>
      </MeshGradientBackground>
    );
  }

  return (
    <MeshGradientBackground variant="warm">
      <View style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
        <Text style={styles.title}>Vote</Text>
        <Text style={styles.subtitle}>Which photo is better?</Text>

        <View style={styles.photosRow}>
          <Animated.View style={animStyle1}>
            <Pressable
              onPress={() => handleVote(photos.photo1.id, true)}
              disabled={voted}
              style={({ pressed }) => [pressed && !voted && styles.pressed]}
            >
              <View style={styles.photoCard}>
                <Image
                  source={{ uri: getImageUrl(photos.photo1.image) }}
                  style={styles.photo}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.photoOverlay}>
                  <BlurView intensity={50} tint="dark" style={styles.photoBlur}>
                    <View style={styles.photoInfo}>
                      <Text style={styles.photoUser} numberOfLines={1}>
                        {photos.photo1.uploader?.username}
                      </Text>
                      <Text style={styles.photoElo}>
                        {Math.round(photos.photo1.elo_score)}
                      </Text>
                    </View>
                  </BlurView>
                </View>
              </View>
            </Pressable>
          </Animated.View>

          <Text style={styles.vs}>VS</Text>

          <Animated.View style={animStyle2}>
            <Pressable
              onPress={() => handleVote(photos.photo2.id, false)}
              disabled={voted}
              style={({ pressed }) => [pressed && !voted && styles.pressed]}
            >
              <View style={styles.photoCard}>
                <Image
                  source={{ uri: getImageUrl(photos.photo2.image) }}
                  style={styles.photo}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.photoOverlay}>
                  <BlurView intensity={50} tint="dark" style={styles.photoBlur}>
                    <View style={styles.photoInfo}>
                      <Text style={styles.photoUser} numberOfLines={1}>
                        {photos.photo2.uploader?.username}
                      </Text>
                      <Text style={styles.photoElo}>
                        {Math.round(photos.photo2.elo_score)}
                      </Text>
                    </View>
                  </BlurView>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        </View>

        <GlassButton
          title="Skip"
          onPress={handleSkip}
          variant="glass"
          style={styles.skipBtn}
        />
      </View>
    </MeshGradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...Typography.largeTitle,
    color: Colors.text.primary,
  },
  subtitle: {
    ...Typography.subheadline,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  photosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  vs: {
    ...Typography.title2,
    color: Colors.text.secondary,
    fontWeight: '800',
  },
  photoCard: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE * 1.2,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.background.tertiary,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  photoBlur: {
    overflow: 'hidden',
  },
  photoInfo: {
    padding: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  photoUser: {
    ...Typography.caption1,
    color: '#FFF',
    fontWeight: '600',
  },
  photoElo: {
    ...Typography.headline,
    color: '#FFF',
    fontWeight: '700',
    marginTop: 2,
  },
  pressed: {
    opacity: 0.9,
  },
  skipBtn: {
    alignSelf: 'center',
    marginBottom: 120,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...Typography.headline,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
