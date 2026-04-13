import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Share,
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
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/theme';
import {
  MeshGradientBackground,
  GlassCard,
  GlassButton,
  getImageUrl,
} from '../../src/components';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2;

type GameState = 'loading' | 'playing' | 'game_over' | 'leaderboard';

export default function TukacodleScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuthStore();
  const [gameState, setGameState] = useState<GameState>('loading');
  const [photos, setPhotos] = useState<any>(null);
  const [streak, setStreak] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [chosen, setChosen] = useState<number | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userScore, setUserScore] = useState<any>(null);
  const [finalScore, setFinalScore] = useState(0);

  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);

  const startGame = useCallback(async () => {
    setGameState('loading');
    try {
      const res = await api.post('/tukacodle/start/');
      const data = res.data;
      // API returns { photos: [p1, p2] } — normalize
      const normalized = data.photos
        ? { photo1: data.photos[0], photo2: data.photos[1] }
        : data;
      setPhotos(normalized);
      setChosen(null);
      setCorrect(null);
      scale1.value = 1;
      scale2.value = 1;
      setGameState('playing');
    } catch (e: any) {
      if (e.response?.status === 400) {
        setFinalScore(e.response.data.score || streak);
        fetchLeaderboard();
        setGameState('game_over');
      }
    }
  }, [streak]);

  const fetchLeaderboard = async () => {
    try {
      const [lbRes, scoreRes] = await Promise.all([
        api.get('/tukacodle/leaderboard/'),
        isAuthenticated
          ? api.get('/tukacodle/user-score/')
          : Promise.resolve({ data: null }),
      ]);
      setLeaderboard(lbRes.data.results || lbRes.data || []);
      setUserScore(scoreRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    startGame();
  }, []);

  const handleGuess = async (photoId: number, isFirst: boolean) => {
    if (chosen !== null || !photos) return;
    setChosen(photoId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const otherId = isFirst ? photos.photo2.id : photos.photo1.id;

    try {
      const res = await api.post('/tukacodle/guess/', {
        chosen_id: photoId,
        other_id: otherId,
        current_streak: streak,
      });
      const isCorrect = res.data.correct;
      setCorrect(isCorrect);

      if (isFirst) {
        scale1.value = withSpring(1.08);
        scale2.value = withTiming(0.85);
      } else {
        scale2.value = withSpring(1.08);
        scale1.value = withTiming(0.85);
      }

      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStreak(res.data.current_streak || streak + 1);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setFinalScore(res.data.final_score || streak);
      }

      setTimeout(() => {
        if (isCorrect) {
          scale1.value = 1;
          scale2.value = 1;
          // If API returned a next_photo, use it with the winner
          if (res.data.next_photo) {
            setPhotos({ photo1: photos[isFirst ? 'photo1' : 'photo2'], photo2: res.data.next_photo });
            setChosen(null);
            setCorrect(null);
          } else {
            startGame();
          }
        } else {
          setGameState('game_over');
        }
      }, 800);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I scored ${finalScore} on Tukacodle! Can you beat me? 🎯`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const animStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
  }));
  const animStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
  }));

  if (gameState === 'loading') {
    return (
      <MeshGradientBackground variant="warm">
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </MeshGradientBackground>
    );
  }

  if (gameState === 'game_over') {
    return (
      <MeshGradientBackground variant="warm">
        <ScrollView
          contentContainerStyle={[
            styles.center,
            { paddingTop: insets.top + Spacing.huge, paddingBottom: insets.bottom + 100 },
          ]}
        >
          <Text style={styles.gameOverTitle}>Game Over!</Text>
          <GlassCard style={styles.scoreCard}>
            <Text style={styles.scoreValue}>{finalScore}</Text>
            <Text style={styles.scoreLabel}>Your Score</Text>
          </GlassCard>

          <View style={styles.gameOverActions}>
            <GlassButton title="Share Score" onPress={handleShare} variant="glass" />
            <GlassButton
              title="View Leaderboard"
              onPress={() => {
                fetchLeaderboard();
                setGameState('leaderboard');
              }}
            />
            {isAuthenticated && attempts < maxAttempts && (
              <GlassButton
                title={`Play Again (${maxAttempts - attempts} left)`}
                onPress={startGame}
                variant="secondary"
              />
            )}
          </View>
        </ScrollView>
      </MeshGradientBackground>
    );
  }

  if (gameState === 'leaderboard') {
    return (
      <MeshGradientBackground variant="warm">
        <ScrollView
          contentContainerStyle={[
            styles.leaderboardContent,
            { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + 100 },
          ]}
        >
          <Text style={styles.title}>Tukacodle</Text>
          <Text style={styles.subtitle}>Today's Leaderboard</Text>

          {userScore && (
            <GlassCard style={styles.userScoreCard}>
              <Text style={styles.userScoreLabel}>Your Best Today</Text>
              <Text style={styles.userScoreValue}>{userScore.best_score || 0}</Text>
              <Text style={styles.userAttempts}>
                Attempts: {userScore.attempts_used}/{userScore.max_attempts || 3}
              </Text>
            </GlassCard>
          )}

          {leaderboard.map((entry: any, i: number) => (
            <GlassCard key={i} style={styles.lbEntry}>
              <View style={styles.lbRow}>
                <Text
                  style={[
                    styles.lbRank,
                    i < 3 && {
                      color: [Colors.rank.gold, Colors.rank.silver, Colors.rank.bronze][i],
                    },
                  ]}
                >
                  #{i + 1}
                </Text>
                <Text style={styles.lbName} numberOfLines={1}>
                  {entry.user?.username || entry.username}
                </Text>
                <Text style={styles.lbScore}>{entry.score}</Text>
              </View>
            </GlassCard>
          ))}

          <View style={styles.lbActions}>
            {attempts < maxAttempts && (
              <GlassButton
                title={`Play Again (${maxAttempts - attempts} left)`}
                onPress={startGame}
              />
            )}
            <GlassButton title="Refresh" onPress={fetchLeaderboard} variant="glass" />
          </View>
        </ScrollView>
      </MeshGradientBackground>
    );
  }

  // Playing state
  return (
    <MeshGradientBackground variant="warm">
      <View style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
        <Text style={styles.title}>🎯 Tukacodle</Text>
        <Text style={styles.subtitle}>Which photo has a higher ELO?</Text>

        <View style={styles.statsRow}>
          <GlassCard padding={false} style={styles.statPill}>
            <View style={styles.statPillInner}>
              <Text style={styles.statPillText}>🔥 Streak: {streak}</Text>
            </View>
          </GlassCard>
          {isAuthenticated && (
            <GlassCard padding={false} style={styles.statPill}>
              <View style={styles.statPillInner}>
                <Text style={styles.statPillText}>
                  Attempts: {attempts}/{maxAttempts}
                </Text>
              </View>
            </GlassCard>
          )}
        </View>

        <View style={styles.photosRow}>
          {photos && (
            <>
              <Animated.View style={animStyle1}>
                <Pressable
                  onPress={() => handleGuess(photos.photo1.id, true)}
                  disabled={chosen !== null}
                >
                  <View
                    style={[
                      styles.photoCard,
                      chosen === photos.photo1.id && {
                        borderWidth: 3,
                        borderColor: correct
                          ? Colors.systemGreen
                          : Colors.systemRed,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: getImageUrl(photos.photo1.image) }}
                      style={styles.photo}
                      contentFit="cover"
                    />
                    <View style={styles.photoLabel}>
                      <BlurView intensity={50} tint="dark" style={{ overflow: 'hidden' }}>
                        <View style={styles.photoLabelInner}>
                          <Text style={styles.photoUser}>
                            {photos.photo1.uploader?.username}
                          </Text>
                        </View>
                      </BlurView>
                    </View>
                    {chosen === photos.photo1.id && (
                      <View style={styles.feedbackOverlay}>
                        <Text style={styles.feedbackIcon}>
                          {correct ? '✓' : '✗'}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              </Animated.View>

              <Animated.View style={animStyle2}>
                <Pressable
                  onPress={() => handleGuess(photos.photo2.id, false)}
                  disabled={chosen !== null}
                >
                  <View
                    style={[
                      styles.photoCard,
                      chosen === photos.photo2.id && {
                        borderWidth: 3,
                        borderColor: correct
                          ? Colors.systemGreen
                          : Colors.systemRed,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: getImageUrl(photos.photo2.image) }}
                      style={styles.photo}
                      contentFit="cover"
                    />
                    <View style={styles.photoLabel}>
                      <BlurView intensity={50} tint="dark" style={{ overflow: 'hidden' }}>
                        <View style={styles.photoLabelInner}>
                          <Text style={styles.photoUser}>
                            {photos.photo2.uploader?.username}
                          </Text>
                        </View>
                      </BlurView>
                    </View>
                    {chosen === photos.photo2.id && (
                      <View style={styles.feedbackOverlay}>
                        <Text style={styles.feedbackIcon}>
                          {correct ? '✓' : '✗'}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              </Animated.View>
            </>
          )}
        </View>
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
    paddingHorizontal: Spacing.lg,
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
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  statPill: {
    borderRadius: BorderRadius.pill,
  },
  statPillInner: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  statPillText: {
    ...Typography.subheadline,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  photosRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'center',
    flex: 1,
    alignItems: 'center',
  },
  photoCard: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE * 1.3,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.background.tertiary,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  photoLabelInner: {
    padding: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  photoUser: {
    ...Typography.caption1,
    color: '#FFF',
    fontWeight: '600',
  },
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  feedbackIcon: {
    fontSize: 64,
    color: '#FFF',
    fontWeight: '700',
  },
  gameOverTitle: {
    ...Typography.largeTitle,
    color: Colors.text.primary,
    marginBottom: Spacing.xl,
  },
  scoreCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.huge,
    marginBottom: Spacing.xl,
  },
  scoreValue: {
    fontSize: 72,
    fontWeight: '800',
    color: Colors.primary,
  },
  scoreLabel: {
    ...Typography.headline,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
  },
  gameOverActions: {
    gap: Spacing.md,
    alignItems: 'center',
  },
  leaderboardContent: {
    paddingHorizontal: Spacing.lg,
  },
  userScoreCard: {
    alignItems: 'center',
    marginVertical: Spacing.lg,
    backgroundColor: 'rgba(1, 152, 99, 0.1)',
  },
  userScoreLabel: {
    ...Typography.subheadline,
    color: Colors.text.secondary,
  },
  userScoreValue: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.primary,
    marginVertical: Spacing.sm,
  },
  userAttempts: {
    ...Typography.caption1,
    color: Colors.text.secondary,
  },
  lbEntry: {
    marginBottom: Spacing.sm,
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lbRank: {
    ...Typography.headline,
    fontWeight: '700',
    width: 40,
    color: Colors.text.primary,
  },
  lbName: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
  },
  lbScore: {
    ...Typography.title3,
    fontWeight: '700',
    color: Colors.primary,
  },
  lbActions: {
    gap: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
});
