import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/theme';
import {
  MeshGradientBackground,
  GlassCard,
  GlassButton,
  PhotoCard,
  PhotoModal,
  getImageUrl,
} from '../../src/components';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const REACTION_MAP: { emoji: string; type: string }[] = [
  { emoji: '❤️', type: 'heart' },
  { emoji: '🔥', type: 'fire' },
];

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get(`/users/${userId}/`);
      setProfile(res.data);
    } catch (e) {
      console.error(e);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  const handleAddFriend = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await api.post('/friends/request/send/', {
        to_user_id: Number(userId),
      });
      fetchProfile();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReaction = async (photoId: number, reactionType: string) => {
    if (!isAuthenticated) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await api.post(`/photos/${photoId}/react/`, { reaction_type: reactionType });
      fetchProfile();
    } catch (e) {
      console.error(e);
    }
  };

  if (!profile) {
    return (
      <MeshGradientBackground>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </MeshGradientBackground>
    );
  }

  const friendshipStatus = profile.friendship_status;
  const stats = profile.stats || {};
  const photos = profile.photos || [];
  const achievements = profile.achievements || [];

  return (
    <MeshGradientBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { top: insets.top + Spacing.sm }]}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        {/* Banner */}
        <View style={[styles.banner, { paddingTop: insets.top }]}>
          {profile.banner_image ? (
            <Image
              source={{ uri: getImageUrl(profile.banner_image) }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
          ) : (
            <View
              style={[StyleSheet.absoluteFillObject, styles.bannerPlaceholder]}
            />
          )}
        </View>

        {/* Profile info */}
        <View style={styles.profileSection}>
          <Image
            source={{
              uri: profile.profile_picture
                ? getImageUrl(profile.profile_picture)
                : undefined,
            }}
            style={styles.avatar}
            contentFit="cover"
          />
          <Text style={styles.username}>{profile.username}</Text>
          {profile.badge && (
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>🏆 {profile.badge}</Text>
            </View>
          )}
          {profile.current_voting_streak > 0 && (
            <Text style={styles.streak}>
              🔥 {profile.current_voting_streak} day streak
            </Text>
          )}

          {/* Actions */}
          {isAuthenticated && Number(userId) !== user?.id && (
            <View style={styles.actions}>
              {friendshipStatus === 'friends' ? (
                <GlassButton title="Friends" onPress={() => {}} variant="glass" disabled />
              ) : friendshipStatus === 'pending_sent' ? (
                <GlassButton title="Request Sent" onPress={() => {}} variant="glass" disabled />
              ) : friendshipStatus === 'pending_received' ? (
                <GlassButton
                  title="Accept Request"
                  onPress={() => router.push({ pathname: '/(tabs)/profile', params: { tab: 'friends' } })}
                />
              ) : (
                <GlassButton title="Add Friend" onPress={handleAddFriend} />
              )}
              <GlassButton
                title="Message"
                onPress={() => router.push({ pathname: '/(tabs)/profile', params: { tab: 'messages' } })}
                variant="glass"
              />
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Bio */}
          {profile.bio && (
            <GlassCard style={styles.bioCard}>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </GlassCard>
          )}

          {/* Stats */}
          <View style={styles.statsGrid}>
            {[
              { label: 'Photos', value: stats.photos_count || photos.length },
              { label: 'Votes Cast', value: stats.votes_cast || 0 },
              { label: 'Total ELO', value: Math.round(stats.total_elo || 0) },
              { label: 'Avg ELO', value: Math.round(stats.average_elo || 0) },
            ].map((stat) => (
              <GlassCard key={stat.label} style={styles.statCard} padding={false}>
                <View style={styles.statInner}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              </GlassCard>
            ))}
          </View>

          {/* Achievements - grid layout */}
          {achievements.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <View style={styles.achievementsGrid}>
                {achievements.map((a: any, i: number) => (
                  <GlassCard key={i} style={styles.achievementCard}>
                    <Text style={styles.achievementIcon}>
                      {a.achievement?.icon || '🏅'}
                    </Text>
                    <Text style={styles.achievementName} numberOfLines={2}>
                      {a.achievement?.name}
                    </Text>
                  </GlassCard>
                ))}
              </View>
            </>
          )}

          {/* Photos */}
          {photos.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Best Photos</Text>
              <View style={styles.photosGrid}>
                {photos.map((photo: any) => (
                  <View key={photo.id}>
                    <PhotoCard
                      photo={photo}
                      onPress={() => setSelectedPhotoId(photo.id)}
                    />
                    {/* Quick reactions under photo */}
                    {isAuthenticated && (
                      <View style={styles.quickReactions}>
                        {REACTION_MAP.map(({ emoji, type }) => (
                          <Pressable
                            key={type}
                            onPress={() => handleReaction(photo.id, type)}
                            style={styles.quickReactionBtn}
                          >
                            <Text style={{ fontSize: 16 }}>{emoji}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <PhotoModal
        photoId={selectedPhotoId}
        visible={selectedPhotoId !== null}
        onClose={() => setSelectedPhotoId(null)}
      />
    </MeshGradientBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  backBtn: {
    position: 'absolute',
    left: Spacing.lg,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#FFF',
    marginTop: -2,
  },
  banner: {
    height: 200,
    backgroundColor: Colors.background.tertiary,
  },
  bannerPlaceholder: {
    backgroundColor: Colors.primary,
    opacity: 0.3,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: -50,
    paddingHorizontal: Spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFF',
    backgroundColor: Colors.background.tertiary,
  },
  username: {
    ...Typography.title2,
    color: Colors.text.primary,
    marginTop: Spacing.md,
  },
  badgePill: {
    backgroundColor: 'rgba(1, 152, 99, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
    marginTop: Spacing.sm,
  },
  badgeText: {
    ...Typography.caption1,
    fontWeight: '600',
    color: Colors.primary,
  },
  streak: {
    ...Typography.subheadline,
    color: Colors.systemOrange,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  bioCard: {
    marginBottom: Spacing.xl,
  },
  bioText: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  sectionTitle: {
    ...Typography.title3,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm) / 2 - 1,
  },
  statInner: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.title2,
    color: Colors.primary,
    fontWeight: '800',
  },
  statLabel: {
    ...Typography.caption1,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  achievementCard: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm * 2) / 3,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  achievementIcon: {
    fontSize: 28,
    marginBottom: Spacing.xs,
  },
  achievementName: {
    ...Typography.caption2,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickReactions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  quickReactionBtn: {
    padding: Spacing.xs,
  },
});
