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
  FadeIn,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/theme';
import { MeshGradientBackground, GlassButton, getImageUrl } from '../../src/components';
import api from '../../src/services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PHOTO_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;
const PHOTO_HEIGHT = (SCREEN_HEIGHT - 280) / 2;

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

  const prefetchImages = (pair: any) => {
    if (!pair) return;
    Image.prefetch(getImageUrl(pair.photo1.image));
    Image.prefetch(getImageUrl(pair.photo2.image));
  };

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    const pair = await fetchPair();
    if (pair) {
      setPhotos(pair);
      fetchPair().then((next) => {
        setNextPhotos(next);
        prefetchImages(next);
      });
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

    if (isFirst) {
      scale1.value = withSpring(1.03);
      scale2.value = withTiming(0.95);
      opacity2.value = withTiming(0.4);
    } else {
      scale2.value = withSpring(1.03);
      scale1.value = withTiming(0.95);
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
        fetchPair().then((next) => {
          setNextPhotos(next);
          prefetchImages(next);
        });
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
      fetchPair().then((next) => {
        setNextPhotos(next);
        prefetchImages(next);
      });
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
      <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Vote</Text>
          <Text style={styles.subtitle}>Tap the better photo</Text>
        </View>

        <View style={styles.photosColumn}>
          <Animated.View style={animStyle1} entering={FadeIn.duration(300)}>
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
                  cachePolicy="memory-disk"
                  recyclingKey={`vote-1-${photos.photo1.id}`}
                  placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                />
                <View style={styles.photoOverlay}>
                  <BlurView intensity={40} tint="dark" style={styles.photoBlur}>
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

          <Animated.View style={animStyle2} entering={FadeIn.duration(300).delay(100)}>
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
                  cachePolicy="memory-disk"
                  recyclingKey={`vote-2-${photos.photo2.id}`}
                  placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                />
                <View style={styles.photoOverlay}>
                  <BlurView intensity={40} tint="dark" style={styles.photoBlur}>
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

        <Pressable onPress={handleSkip} style={styles.skipBtn}>
          <BlurView intensity={30} tint="light" style={styles.skipBlur}>
            <Text style={styles.skipText}>Skip</Text>
          </BlurView>
        </Pressable>
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
  header: {
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.largeTitle,
    color: Colors.text.primary,
  },
  subtitle: {
    ...Typography.subheadline,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  photosColumn: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.md,
  },
  photoCard: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    backgroundColor: Colors.background.tertiary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
    borderBottomLeftRadius: BorderRadius.xxl,
    borderBottomRightRadius: BorderRadius.xxl,
  },
  photoBlur: {
    overflow: 'hidden',
  },
  photoInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  photoUser: {
    ...Typography.subheadline,
    color: '#FFF',
    fontWeight: '600',
  },
  photoElo: {
    ...Typography.headline,
    color: '#FFF',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
  },
  skipBtn: {
    alignSelf: 'center',
    marginBottom: 100,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.pill,
    overflow: 'hidden',
  },
  skipBlur: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.sm + 2,
    overflow: 'hidden',
  },
  skipText: {
    ...Typography.subheadline,
    color: Colors.text.secondary,
    fontWeight: '600',
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
