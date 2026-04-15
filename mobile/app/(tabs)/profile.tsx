import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  RefreshControl,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ProfileTab = 'profile' | 'friends' | 'messages';
type FriendsSubTab = 'friends' | 'requests' | 'find';

function formatTime(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { user, isAuthenticated, logout, setUser } = useAuthStore();

  // Main tab
  const [activeTab, setActiveTab] = useState<ProfileTab>(
    (params.tab as ProfileTab) || 'profile'
  );

  // Profile state
  const [profile, setProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState('');

  // Friends state
  const [friendsSubTab, setFriendsSubTab] = useState<FriendsSubTab>('friends');
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any>({ received: [], sent: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Messages state
  const [messageFriends, setMessageFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Update tab from params
  useEffect(() => {
    if (params.tab && ['profile', 'friends', 'messages'].includes(params.tab)) {
      setActiveTab(params.tab as ProfileTab);
    }
  }, [params.tab]);

  // Profile data fetching
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

  // Friends data fetching
  const fetchFriends = useCallback(async () => {
    try {
      const res = await api.get('/friends/');
      const data = res.data.friends || res.data.results || (Array.isArray(res.data) ? res.data : []);
      setFriendsList(data);
      setMessageFriends(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get('/friends/requests/');
      setFriendRequests(res.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Messages data fetching
  const fetchMessages = useCallback(async (friendId: number) => {
    try {
      const res = await api.get(`/conversations/${friendId}/`);
      setMessages(res.data.results || res.data || []);
      try {
        await api.post(`/conversations/${friendId}/read/`);
      } catch {}
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
      fetchPhotos();
      fetchFriends();
      fetchRequests();
    }
  }, [isAuthenticated]);

  // Message polling
  useEffect(() => {
    if (selectedFriend) {
      fetchMessages(selectedFriend.id);
      const interval = setInterval(() => fetchMessages(selectedFriend.id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedFriend]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // User search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/users/search/?q=${searchQuery}`);
        setSearchResults(res.data.results || res.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), fetchPhotos(), fetchFriends(), fetchRequests()]);
    setRefreshing(false);
  };

  // Profile actions
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
        headers: {},
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
        headers: {},
      });
      fetchProfile();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  // Friends actions
  const handleAcceptRequest = async (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await api.post(`/friends/request/${id}/accept/`);
      fetchRequests();
      fetchFriends();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectRequest = async (id: number) => {
    try {
      await api.post(`/friends/request/${id}/reject/`);
      fetchRequests();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddFriend = async (userId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await api.post('/friends/request/send/', { to_user_id: userId });
      fetchRequests();
    } catch (e) {
      console.error(e);
    }
  };

  // Messages actions
  const handleSendMessage = async () => {
    if (!msgText.trim() || !selectedFriend || sending) return;
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await api.post(`/conversations/${selectedFriend.id}/`, {
        content: msgText.trim(),
      });
      setMsgText('');
      fetchMessages(selectedFriend.id);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const switchTab = (tab: ProfileTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    if (tab !== 'messages') setSelectedFriend(null);
  };

  // Not authenticated
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

  // Chat view (messages with selected friend)
  if (activeTab === 'messages' && selectedFriend) {
    return (
      <MeshGradientBackground>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          {/* Chat header */}
          <View style={[styles.chatHeader, { paddingTop: insets.top }]}>
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#FFFFFF' }]} />
            <View style={styles.chatHeaderInner}>
              <Pressable
                onPress={() => setSelectedFriend(null)}
                style={styles.backButton}
              >
                <Text style={styles.backText}>‹</Text>
              </Pressable>
              <Image
                source={{
                  uri: selectedFriend.profile_picture
                    ? getImageUrl(selectedFriend.profile_picture)
                    : undefined,
                }}
                style={styles.chatAvatar}
                contentFit="cover"
              />
              <Text style={styles.chatName}>{selectedFriend.username}</Text>
            </View>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{
              paddingHorizontal: Spacing.lg,
              paddingTop: insets.top + 60,
              paddingBottom: Spacing.md,
            }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isOwn = item.sender?.id === user?.id;
              return (
                <View
                  style={[
                    styles.msgBubbleWrapper,
                    isOwn ? styles.ownMessage : styles.otherMessage,
                  ]}
                >
                  <View
                    style={[
                      styles.msgBubble,
                      isOwn ? styles.ownBubble : styles.otherBubble,
                    ]}
                  >
                    <Text style={[styles.msgText, isOwn && styles.ownMsgText]}>
                      {item.content}
                    </Text>
                  </View>
                  <Text style={[styles.msgTime, isOwn && styles.ownMsgTime]}>
                    {formatTime(item.created_at)}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: SCREEN_HEIGHT * 0.3 }}>
                <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
              </View>
            }
          />

          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 80 + Spacing.sm }]}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.msgInput}
                placeholder="Message..."
                placeholderTextColor={Colors.text.tertiary}
                value={msgText}
                onChangeText={setMsgText}
                maxLength={1000}
                multiline
              />
              <Pressable
                onPress={handleSendMessage}
                disabled={!msgText.trim() || sending}
                style={[
                  styles.sendButton,
                  (!msgText.trim() || sending) && styles.sendDisabled,
                ]}
              >
                <Text style={styles.sendText}>↑</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </MeshGradientBackground>
    );
  }

  const stats = profile?.stats || {};
  const achievements = profile?.achievements || [];
  const receivedCount = friendRequests.received?.length || 0;

  const renderUserCard = (u: any, actions?: React.ReactNode) => (
    <GlassCard key={u.id} style={styles.userCard}>
      <Pressable
        style={styles.userRow}
        onPress={() => router.push(`/user/${u.id}`)}
      >
        <Image
          source={{
            uri: u.profile_picture ? getImageUrl(u.profile_picture) : undefined,
          }}
          style={styles.userAvatar}
          contentFit="cover"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.userName} numberOfLines={1}>{u.username}</Text>
          {u.badge && <Text style={styles.userBadge}>🏆 {u.badge}</Text>}
          {u.bio && (
            <Text style={styles.userBio} numberOfLines={1}>{u.bio}</Text>
          )}
        </View>
      </Pressable>
      {actions && <View style={styles.userActions}>{actions}</View>}
    </GlassCard>
  );

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
              <Text style={styles.badgeLabel}>🏆 {profile.badge}</Text>
            </View>
          )}
          {profile?.current_voting_streak > 0 && (
            <Text style={styles.streak}>
              🔥 {profile.current_voting_streak} day streak
            </Text>
          )}
        </View>

        {/* Tab selector */}
        <View style={styles.tabBar}>
          {(['profile', 'friends', 'messages'] as ProfileTab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => switchTab(t)}
              style={[styles.tab, activeTab === t && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                {t === 'profile' ? 'Profile' : t === 'friends' ? 'Friends' : 'Messages'}
              </Text>
              {t === 'friends' && receivedCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{receivedCount}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <View style={styles.content}>
          {/* ===== PROFILE TAB ===== */}
          {activeTab === 'profile' && (
            <>
              {/* Logout */}
              <View style={styles.logoutRow}>
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
                        <Text style={styles.achievementIcon}>{a.achievement?.icon || '🏅'}</Text>
                        <Text style={styles.achievementName} numberOfLines={1}>{a.achievement?.name}</Text>
                        <Text style={styles.achievementPoints}>{a.achievement?.points} pts</Text>
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
                  <Text style={styles.emptyPhotosText}>No photos uploaded yet. Start sharing!</Text>
                </GlassCard>
              )}
            </>
          )}

          {/* ===== FRIENDS TAB ===== */}
          {activeTab === 'friends' && (
            <>
              {/* Friends sub-tabs */}
              <View style={styles.subTabs}>
                {(['friends', 'requests', 'find'] as FriendsSubTab[]).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setFriendsSubTab(t)}
                    style={[styles.subTab, friendsSubTab === t && styles.subTabActive]}
                  >
                    <Text style={[styles.subTabText, friendsSubTab === t && styles.subTabTextActive]}>
                      {t === 'friends' ? 'Friends' : t === 'requests' ? 'Requests' : 'Find'}
                    </Text>
                    {t === 'requests' && receivedCount > 0 && (
                      <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText}>{receivedCount}</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>

              {friendsSubTab === 'friends' && (
                <>
                  {friendsList.length > 0 ? (
                    friendsList.map((f) =>
                      renderUserCard(f, (
                        <GlassButton
                          title="View"
                          onPress={() => router.push(`/user/${f.id}`)}
                          size="small"
                          variant="glass"
                        />
                      ))
                    )
                  ) : (
                    <GlassCard>
                      <Text style={styles.emptyText}>No friends yet. Search and add some!</Text>
                    </GlassCard>
                  )}
                </>
              )}

              {friendsSubTab === 'requests' && (
                <>
                  {friendRequests.received?.length > 0 && (
                    <>
                      <Text style={styles.subSectionTitle}>Received</Text>
                      {friendRequests.received.map((r: any) =>
                        renderUserCard(r.from_user || r, (
                          <View style={styles.requestActions}>
                            <GlassButton title="Accept" onPress={() => handleAcceptRequest(r.id)} size="small" />
                            <GlassButton title="Decline" onPress={() => handleRejectRequest(r.id)} size="small" variant="secondary" />
                          </View>
                        ))
                      )}
                    </>
                  )}
                  {friendRequests.sent?.length > 0 && (
                    <>
                      <Text style={styles.subSectionTitle}>Sent</Text>
                      {friendRequests.sent.map((r: any) =>
                        renderUserCard(r.to_user || r, (
                          <Text style={styles.pendingText}>Pending...</Text>
                        ))
                      )}
                    </>
                  )}
                  {!friendRequests.received?.length && !friendRequests.sent?.length && (
                    <GlassCard>
                      <Text style={styles.emptyText}>No pending requests</Text>
                    </GlassCard>
                  )}
                </>
              )}

              {friendsSubTab === 'find' && (
                <>
                  <GlassCard padding={false} style={{ marginBottom: Spacing.lg }}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search users..."
                      placeholderTextColor={Colors.text.tertiary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoCapitalize="none"
                    />
                  </GlassCard>
                  {searchQuery.length < 2 ? (
                    <Text style={styles.searchHint}>Type at least 2 characters to search</Text>
                  ) : searching ? (
                    <Text style={styles.searchHint}>Searching...</Text>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((u) =>
                      renderUserCard(u, (
                        <GlassButton title="Add" onPress={() => handleAddFriend(u.id)} size="small" variant="glass" />
                      ))
                    )
                  ) : (
                    <Text style={styles.searchHint}>No users found</Text>
                  )}
                </>
              )}
            </>
          )}

          {/* ===== MESSAGES TAB ===== */}
          {activeTab === 'messages' && (
            <>
              {messageFriends.length > 0 ? (
                messageFriends.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setSelectedFriend(item)}
                    style={({ pressed }) => [pressed && { opacity: 0.8 }]}
                  >
                    <GlassCard style={styles.userCard}>
                      <View style={styles.userRow}>
                        <Image
                          source={{
                            uri: item.profile_picture
                              ? getImageUrl(item.profile_picture)
                              : undefined,
                          }}
                          style={styles.userAvatar}
                          contentFit="cover"
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.userName}>{item.username}</Text>
                          {item.badge && <Text style={styles.userBadge}>🏆 {item.badge}</Text>}
                        </View>
                        <Text style={styles.chevron}>›</Text>
                      </View>
                    </GlassCard>
                  </Pressable>
                ))
              ) : (
                <GlassCard>
                  <Text style={styles.emptyText}>
                    No friends yet. Add some friends to start chatting!
                  </Text>
                </GlassCard>
              )}
            </>
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
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
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
    backgroundColor: 'rgba(1, 152, 99, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
    marginTop: Spacing.sm,
  },
  badgeLabel: {
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

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: BorderRadius.pill,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    gap: 4,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  tabText: {
    ...Typography.subheadline,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  tabTextActive: {
    color: '#FFF',
  },
  tabBadge: {
    backgroundColor: Colors.systemRed,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },

  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },

  // Profile tab
  logoutRow: {
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
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
  emptyPhotosText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
  },

  // Friends tab
  subTabs: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  subTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    gap: Spacing.xs,
  },
  subTabActive: {
    backgroundColor: Colors.primary,
  },
  subTabText: {
    ...Typography.subheadline,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  subTabTextActive: {
    color: '#FFF',
  },
  subSectionTitle: {
    ...Typography.headline,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  userCard: {
    marginBottom: Spacing.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background.tertiary,
  },
  userName: {
    ...Typography.headline,
    color: Colors.text.primary,
  },
  userBadge: {
    ...Typography.caption1,
    color: Colors.primary,
    marginTop: 2,
  },
  userBio: {
    ...Typography.caption1,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  userActions: {
    marginTop: Spacing.md,
    alignItems: 'flex-end',
  },
  requestActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pendingText: {
    ...Typography.caption1,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  searchInput: {
    ...Typography.body,
    color: Colors.text.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  },
  searchHint: {
    ...Typography.subheadline,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  chevron: {
    fontSize: 24,
    color: Colors.text.tertiary,
    fontWeight: '300',
  },

  // Messages chat view
  chatHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  chatHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.primary,
    marginTop: -2,
  },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background.tertiary,
  },
  chatName: {
    ...Typography.headline,
    color: Colors.text.primary,
  },
  msgBubbleWrapper: {
    marginBottom: Spacing.sm,
    maxWidth: '78%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  msgBubble: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  ownBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderBottomLeftRadius: 6,
  },
  msgText: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  ownMsgText: {
    color: '#FFF',
  },
  msgTime: {
    ...Typography.caption2,
    color: Colors.text.tertiary,
    marginTop: 2,
    marginHorizontal: Spacing.xs,
  },
  ownMsgTime: {
    textAlign: 'right',
  },
  inputBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  msgInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
