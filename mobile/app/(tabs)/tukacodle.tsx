import React, { useState, useCallback, useRef } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PHOTO_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;
const PHOTO_HEIGHT = (SCREEN_HEIGHT - 340) / 2;

const TAB_BAR_HEIGHT = 80;

type GameState = 'loading' | 'playing' | 'game_over' | 'leaderboard';

export default function TukacodleScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuthStore();
  const [gameState, setGameState] = useState<GameState>('loading');
  const [photos, setPhotos] = useState<any>(null);
  const [streak, setStreakState] = useState(0);
  const streakRef = useRef(0);
  const setStreak = (val: number) => {
    streakRef.current = val;
    setStreakState(val);
  };
  const [attempts, setAttempts] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [chosen, setChosen] = useState<number | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userScore, setUserScore] = useState<any>(null);
  const [finalScore, setFinalScore] = useState(0);
  // Track the actual gameState in a ref so useFocusEffect can read current value
  const gameStateRef = useRef<GameState>('loading');
  const setGameStateTracked = (state: GameState) => {
    gameStateRef.current = state;
    setGameState(state);
  };

  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);

  // Fetch user's attempt count from server, returns the data
  const fetchUserAttempts = async () => {
    if (!isAuthenticated) return null;
    try {
      const res = await api.get('/tukacodle/user-score/');
      if (res.data) {
        setAttempts(res.data.attempts_used || 0);
        setMaxAttempts(res.data.max_attempts || 3);
        return res.data;
      }
    } catch {
      // User may not have played today yet
    }
    return null;
  };

  const startGame = async () => {
    setGameStateTracked('loading');
    setStreak(0);
    try {
      const res = await api.post('/tukacodle/start/');
      const data = res.data;
      const normalized = data.photos
        ? { photo1: data.photos[0], photo2: data.photos[1] }
        : data;
      setPhotos(normalized);
      setChosen(null);
      setCorrect(null);
      scale1.value = 1;
      scale2.value = 1;
      setGameStateTracked('playing');
      Image.prefetch(getImageUrl(normalized.photo1.image));
      Image.prefetch(getImageUrl(normalized.photo2.image));
    } catch (e: any) {
      // If start fails for any reason, go to leaderboard
      await fetchUserAttempts();
      await fetchLeaderboard();
      setGameStateTracked('leaderboard');
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const [lbRes, scoreRes] = await Promise.all([
        api.get('/tukacodle/leaderboard/'),
        isAuthenticated
          ? api.get('/tukacodle/user-score/')
          : Promise.resolve({ data: null }),
      ]);
      // API returns { date, scores: [...] }
      const lbData = lbRes.data?.scores || lbRes.data?.results || lbRes.data;
      setLeaderboard(Array.isArray(lbData) ? lbData : []);
      if (scoreRes.data) {
        setUserScore(scoreRes.data);
        setAttempts(scoreRes.data.attempts_used || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const goToLeaderboard = async () => {
    setGameStateTracked('loading');
    await fetchLeaderboard();
    setGameStateTracked('leaderboard');
  };

  // On tab focus: if first load start game, if all attempts used go to leaderboard
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const currentState = gameStateRef.current;

        // If already playing or on game_over, don't interrupt
        if (currentState === 'playing' || currentState === 'game_over') {
          return;
        }

        const data = await fetchUserAttempts();
        const used = data?.attempts_used || 0;
        const max = data?.max_attempts || 3;

        if (isAuthenticated && used >= max) {
          // All attempts used — show leaderboard
          await fetchLeaderboard();
          setGameStateTracked('leaderboard');
        } else {
          // Has attempts left or first load — start a game
          startGame();
        }
      };
      init();
    }, [isAuthenticated])
  );

  const handleGuess = async (photoId: number, isFirst: boolean) => {
    if (chosen !== null || !photos) return;
    setChosen(photoId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const otherId = isFirst ? photos.photo2.id : photos.photo1.id;

    try {
      const res = await api.post('/tukacodle/guess/', {
        chosen_id: photoId,
        other_id: otherId,
        current_streak: streakRef.current,
      });
      const isCorrect = res.data.correct;
      setCorrect(isCorrect);

      if (isFirst) {
        scale1.value = withSpring(1.03);
        scale2.value = withTiming(0.92);
      } else {
        scale2.value = withSpring(1.03);
        scale1.value = withTiming(0.92);
      }

      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const newStreak = res.data.current_streak ?? streakRef.current + 1;
        setStreak(newStreak);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const score = res.data.final_score ?? streakRef.current;
        setFinalScore(score);
      }

      setTimeout(async () => {
        if (isCorrect) {
          scale1.value = 1;
          scale2.value = 1;
          if (res.data.game_over) {
            // All photos exhausted — show game over with the winning score
            const score = res.data.final_score ?? (res.data.current_streak ?? streakRef.current + 1);
            setFinalScore(score);
            await fetchUserAttempts();
            setGameStateTracked('game_over');
          } else if (res.data.next_photo) {
            const nextPhotos = { photo1: photos[isFirst ? 'photo1' : 'photo2'], photo2: res.data.next_photo };
            setPhotos(nextPhotos);
            Image.prefetch(getImageUrl(res.data.next_photo.image));
            setChosen(null);
            setCorrect(null);
          } else {
            // Fallback: no next_photo and no game_over flag — restart
            startGame();
          }
        } else {
          await fetchUserAttempts();
          setGameStateTracked('game_over');
        }
      }, 800);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I scored ${finalScore} on Tukacodle! Can you beat me?`,
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

  // ─── LOADING ───
  if (gameState === 'loading') {
    return (
      <MeshGradientBackground>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </MeshGradientBackground>
    );
  }

  // ─── GAME OVER ───
  if (gameState === 'game_over') {
    return (
      <MeshGradientBackground>
        <ScrollView
          contentContainerStyle={[
            styles.center,
            { paddingTop: insets.top + Spacing.huge, paddingBottom: insets.bottom + TAB_BAR_HEIGHT + Spacing.lg },
          ]}
        >
          <Text style={styles.gameOverTitle}>Game Over</Text>
          <GlassCard style={styles.scoreCard}>
            <Text style={styles.scoreValue}>{finalScore}</Text>
            <Text style={styles.scoreLabel}>Your Score</Text>
          </GlassCard>

          <View style={styles.gameOverActions}>
            <GlassButton
              title={
                isAuthenticated && attempts >= maxAttempts
                  ? 'Play Again (unranked)'
                  : isAuthenticated
                  ? `Play Again (${maxAttempts - attempts} left)`
                  : 'Play Again'
              }
              onPress={() => startGame()}
            />
            <GlassButton
              title="Leaderboard"
              onPress={goToLeaderboard}
              variant="glass"
            />
            <GlassButton title="Share Score" onPress={handleShare} variant="glass" />
          </View>
        </ScrollView>
      </MeshGradientBackground>
    );
  }

  // ─── LEADERBOARD ───
  if (gameState === 'leaderboard') {
    return (
      <MeshGradientBackground>
        <ScrollView
          contentContainerStyle={[
            styles.leaderboardContent,
            { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + TAB_BAR_HEIGHT + Spacing.lg },
          ]}
        >
          <Text style={styles.title}>Tukacodle</Text>
          <Text style={styles.subtitle}>Today's Leaderboard</Text>

          {userScore && (
            <GlassCard style={styles.userScoreCard}>
              <Text style={styles.userScoreLabel}>Your Best Today</Text>
              <Text style={styles.userScoreValue}>{userScore.highest_score ?? 0}</Text>
              {userScore.all_scores && userScore.all_scores.length > 1 && (
                <Text style={styles.allScores}>
                  All attempts: {userScore.all_scores.join(', ')}
                </Text>
              )}
              <Text style={styles.userAttempts}>
                Attempts: {userScore.attempts_used || 0}/{userScore.max_attempts || 3}
              </Text>
            </GlassCard>
          )}

          {leaderboard.length > 0 ? (
            leaderboard.map((entry: any, i: number) => (
              <GlassCard key={entry?.id || i} style={styles.lbEntry}>
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
                    {entry?.user?.username || entry?.username || 'Unknown'}
                  </Text>
                  <Text style={styles.lbScore}>{entry?.score || 0}</Text>
                </View>
              </GlassCard>
            ))
          ) : (
            <GlassCard>
              <Text style={styles.emptyText}>No scores yet today</Text>
            </GlassCard>
          )}

          <View style={styles.lbActions}>
            <GlassButton
              title={
                isAuthenticated && attempts >= maxAttempts
                  ? 'Play Again (unranked)'
                  : isAuthenticated
                  ? `Play Again (${maxAttempts - attempts} left)`
                  : 'Play Again'
              }
              onPress={() => startGame()}
            />
            <GlassButton title="Refresh" onPress={goToLeaderboard} variant="glass" />
          </View>
        </ScrollView>
      </MeshGradientBackground>
    );
  }

  // ─── PLAYING ───
  return (
    <MeshGradientBackground>
      <View style={[styles.container, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + TAB_BAR_HEIGHT }]}>
        {/* Header with leaderboard nav */}
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Tukacodle</Text>
            <Text style={styles.subtitle}>Which photo has a higher ELO?</Text>
          </View>
          <Pressable onPress={goToLeaderboard} style={styles.lbButton}>
            <Text style={styles.lbButtonText}>🏆</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statPillText}>Streak: {streak}</Text>
          </View>
          {isAuthenticated && (
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>
                Attempts: {attempts}/{maxAttempts}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.photosColumn}>
          {photos && (
            <>
              <Animated.View style={animStyle1} entering={FadeIn.duration(300)}>
                <Pressable
                  onPress={() => handleGuess(photos.photo1.id, true)}
                  disabled={chosen !== null}
                  style={({ pressed }) => [pressed && chosen === null && styles.pressed]}
                >
                  <View
                    style={[
                      styles.photoCard,
                      chosen === photos.photo1.id && correct !== null && {
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
                      transition={200}
                      cachePolicy="memory-disk"
                      recyclingKey={`tuk-1-${photos.photo1.id}`}
                      placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                    />
                    <View style={styles.photoLabel}>
                      <View style={styles.photoLabelInner}>
                        <Text style={styles.photoUser}>
                          {photos.photo1.uploader?.username}
                        </Text>
                      </View>
                    </View>
                    {chosen === photos.photo1.id && correct !== null && (
                      <View style={[
                        styles.feedbackOverlay,
                        { backgroundColor: correct ? 'rgba(52, 199, 89, 0.25)' : 'rgba(255, 59, 48, 0.25)' },
                      ]}>
                        <Text style={styles.feedbackIcon}>
                          {correct ? '✓' : '✗'}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              </Animated.View>

              <Animated.View style={animStyle2} entering={FadeIn.duration(300).delay(100)}>
                <Pressable
                  onPress={() => handleGuess(photos.photo2.id, false)}
                  disabled={chosen !== null}
                  style={({ pressed }) => [pressed && chosen === null && styles.pressed]}
                >
                  <View
                    style={[
                      styles.photoCard,
                      chosen === photos.photo2.id && correct !== null && {
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
                      transition={200}
                      cachePolicy="memory-disk"
                      recyclingKey={`tuk-2-${photos.photo2.id}`}
                      placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                    />
                    <View style={styles.photoLabel}>
                      <View style={styles.photoLabelInner}>
                        <Text style={styles.photoUser}>
                          {photos.photo2.uploader?.username}
                        </Text>
                      </View>
                    </View>
                    {chosen === photos.photo2.id && correct !== null && (
                      <View style={[
                        styles.feedbackOverlay,
                        { backgroundColor: correct ? 'rgba(52, 199, 89, 0.25)' : 'rgba(255, 59, 48, 0.25)' },
                      ]}>
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
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  lbButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  lbButtonText: {
    fontSize: 20,
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
    marginBottom: Spacing.sm,
  },
  statPill: {
    borderRadius: BorderRadius.pill,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  statPillText: {
    ...Typography.subheadline,
    fontWeight: '600',
    color: Colors.text.primary,
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
  photoLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    borderBottomLeftRadius: BorderRadius.xxl,
    borderBottomRightRadius: BorderRadius.xxl,
  },
  photoLabelInner: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  photoUser: {
    ...Typography.subheadline,
    color: '#FFF',
    fontWeight: '600',
  },
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.xxl,
  },
  feedbackIcon: {
    fontSize: 64,
    color: '#FFF',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
  },
  gameOverTitle: {
    ...Typography.largeTitle,
    color: Colors.text.primary,
    marginBottom: Spacing.xl,
  },
  scoreCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.huge,
    marginBottom: Spacing.xl,
  },
  scoreValue: {
    fontSize: 72,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'center',
  },
  scoreLabel: {
    ...Typography.headline,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  gameOverActions: {
    gap: Spacing.md,
    alignItems: 'center',
    width: '100%',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
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
    textAlign: 'center',
  },
  allScores: {
    ...Typography.caption1,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
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
