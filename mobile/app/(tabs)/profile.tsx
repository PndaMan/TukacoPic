import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/theme';
import {
  MeshGradientBackground,
  GlassCard,
  GlassButton,
  PhotoCard,
  getImageUrl,
} from '../../src/components';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated, logout, setUser } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/profile/me/');
      setProfile(res.data);
      setBio(res.data.bio || '');
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await api.get('/photos/my/');
      setPhotos(res.data.results || res.data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
      fetchPhotos();
    }
  }, [isAuthenticated]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), fetchPhotos()]);
    setRefreshing(false);
  };

  const handleSaveBio = async () => {
    try {
      await api.patch('/profile/me/', { bio });
      setEditingBio(false);
      fetchProfile();
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangeProfilePic = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    const formData = new FormData();
    formData.append('profile_picture', {
      uri: result.assets[0].uri,
      name: 'profile.jpg',
      type: 'image/jpeg',
    } as any);

    try {
      const res = await api.patch('/profile/me/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser({ ...user!, profile_picture: res.data.profile_picture });
      fetchProfile();
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangeBanner = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (result.canceled) return;

    const formData = new FormData();
    formData.append('banner_image', {
      uri: result.assets[0].uri,
      name: 'banner.jpg',
      type: 'image/jpeg',
    } as any);

    try {
      await api.patch('/profile/me/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchProfile();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <MeshGradientBackground>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <Text style={styles.emptyIcon}>👤</Text>
          <Text style={styles.emptyText}>Sign in to view your profile</Text>
          <GlassButton
            title="Sign In"
            onPress={() => router.push('/(auth)/login')}
            style={{ marginTop: Spacing.xl }}
          />
        </View>
      </MeshGradientBackground>
    );
  }

  const stats = profile?.stats || {};
  const achievements = profile?.achievements || [];

  return (
    <MeshGradientBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Banner */}
        <Pressable onPress={handleChangeBanner}>
          <View style={[styles.banner, { paddingTop: insets.top }]}>
            {profile?.banner_image ? (
              <Image
                source={{ uri: getImageUrl(profile.banner_image) }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
              />
            ) : (
              <View style={[StyleSheet.absoluteFillObject, styles.bannerPlaceholder]} />
            )}
            <BlurView intensity={20} tint="dark" style={styles.bannerOverlay}>
              <Text style={styles.bannerText}>Change Banner</Text>
            </BlurView>
          </View>
        </Pressable>

        {/* Profile pic & info */}
        <View style={styles.profileSection}>
          <Pressable onPress={handleChangeProfilePic} style={styles.avatarWrapper}>
            <Image
              source={{
                uri: profile?.profile_picture
                  ? getImageUrl(profile.profile_picture)
                  : undefined,
              }}
              style={styles.avatar}
              contentFit="cover"
            />
            <View style={styles.avatarBadge}>
              <Text style={{ fontSize: 14 }}>📷</Text>
            </View>
          </Pressable>

          <Text style={styles.username}>{user?.username}</Text>
          {profile?.badge && (
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>🏆 {profile.badge}</Text>
            </View>
          )}
          {profile?.current_voting_streak > 0 && (
            <Text style={styles.streak}>
              🔥 {profile.current_voting_streak} day streak
            </Text>
          )}
        </View>

        <View style={styles.content}>
          {/* Quick actions */}
          <View style={styles.quickActions}>
            <GlassButton
              title="Friends"
              onPress={() => router.push('/(tabs)/friends')}
              variant="glass"
              icon={<Text style={{ fontSize: 16 }}>👥</Text>}
            />
            <GlassButton
              title="Messages"
              onPress={() => router.push('/(tabs)/messages')}
              variant="glass"
              icon={<Text style={{ fontSize: 16 }}>💬</Text>}
            />
            <GlassButton
              title="Logout"
              onPress={handleLogout}
              variant="secondary"
              size="small"
            />
          </View>

          {/* Bio */}
          <GlassCard style={styles.bioCard}>
            <View style={styles.bioHeader}>
              <Text style={styles.sectionTitle}>Bio</Text>
              {editingBio ? (
                <View style={styles.bioActions}>
                  <Pressable onPress={() => setEditingBio(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                  <GlassButton title="Save" onPress={handleSaveBio} size="small" />
                </View>
              ) : (
                <Pressable onPress={() => setEditingBio(true)}>
                  <Text style={styles.editText}>Edit</Text>
                </Pressable>
              )}
            </View>
            {editingBio ? (
              <TextInput
                style={styles.bioInput}
                value={bio}
                onChangeText={setBio}
                multiline
                maxLength={500}
                placeholder="Tell us about yourself..."
                placeholderTextColor={Colors.text.tertiary}
              />
            ) : (
              <Text style={styles.bioText}>
                {profile?.bio || 'No bio yet. Tap Edit to add one!'}
              </Text>
            )}
          </GlassCard>

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

          {/* Achievements */}
          {achievements.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsScroll}>
                {achievements.map((a: any, i: number) => (
                  <GlassCard key={i} style={styles.achievementCard}>
                    <Text style={styles.achievementIcon}>
                      {a.achievement?.icon || '🏅'}
                    </Text>
                    <Text style={styles.achievementName} numberOfLines={1}>
                      {a.achievement?.name}
                    </Text>
                    <Text style={styles.achievementPoints}>
                      {a.achievement?.points} pts
                    </Text>
                  </GlassCard>
                ))}
              </ScrollView>
            </>
          )}

          {/* My Photos */}
          <Text style={styles.sectionTitle}>Your Photos</Text>
          {photos.length > 0 ? (
            <View style={styles.photosGrid}>
              {photos.map((photo) => (
                <PhotoCard key={photo.id} photo={photo} />
              ))}
            </View>
          ) : (
            <GlassCard>
              <Text style={styles.emptyPhotos}>
                No photos uploaded yet. Start sharing!
              </Text>
            </GlassCard>
          )}
        </View>
      </ScrollView>
    </MeshGradientBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...Typography.headline,
    color: Colors.text.secondary,
  },
  banner: {
    height: 200,
    justifyContent: 'flex-end',
  },
  bannerPlaceholder: {
    backgroundColor: Colors.primary,
    opacity: 0.3,
  },
  bannerOverlay: {
    alignSelf: 'flex-end',
    margin: Spacing.md,
    borderRadius: BorderRadius.pill,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bannerText: {
    ...Typography.caption1,
    color: '#FFF',
    fontWeight: '600',
  },
  profileSection: {
    alignItems: 'center',
    marginTop: -50,
    paddingHorizontal: Spacing.lg,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFF',
    backgroundColor: Colors.background.tertiary,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  username: {
    ...Typography.title2,
    color: Colors.text.primary,
    marginTop: Spacing.md,
  },
  badgePill: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
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
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  bioCard: {
    marginBottom: Spacing.xl,
  },
  bioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  bioActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  editText: {
    ...Typography.subheadline,
    color: Colors.primary,
    fontWeight: '600',
  },
  cancelText: {
    ...Typography.subheadline,
    color: Colors.systemRed,
  },
  bioInput: {
    ...Typography.body,
    color: Colors.text.primary,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bioText: {
    ...Typography.body,
    color: Colors.text.secondary,
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
  achievementsScroll: {
    marginBottom: Spacing.xl,
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  achievementCard: {
    width: 110,
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  achievementName: {
    ...Typography.caption1,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  achievementPoints: {
    ...Typography.caption2,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  emptyPhotos: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
