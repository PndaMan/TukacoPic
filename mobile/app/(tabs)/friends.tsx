import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/theme';
import {
  MeshGradientBackground,
  GlassCard,
  GlassButton,
  getImageUrl,
} from '../../src/components';
import api from '../../src/services/api';

type Tab = 'friends' | 'requests' | 'find';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any>({ received: [], sent: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFriends = useCallback(async () => {
    try {
      const res = await api.get('/friends/');
      setFriends(res.data.results || res.data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get('/friends/requests/');
      setRequests(res.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, []);

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
    await Promise.all([fetchFriends(), fetchRequests()]);
    setRefreshing(false);
  };

  const handleAccept = async (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await api.post(`/friends/request/${id}/accept/`);
      fetchRequests();
      fetchFriends();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (id: number) => {
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

  const receivedCount = requests.received?.length || 0;

  const renderUserCard = (
    user: any,
    actions?: React.ReactNode
  ) => (
    <GlassCard key={user.id} style={styles.userCard}>
      <Pressable
        style={styles.userRow}
        onPress={() => router.push(`/user/${user.id}`)}
      >
        <Image
          source={{
            uri: user.profile_picture
              ? getImageUrl(user.profile_picture)
              : undefined,
          }}
          style={styles.userAvatar}
          contentFit="cover"
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {user.username}
          </Text>
          {user.badge && (
            <Text style={styles.userBadge}>🏆 {user.badge}</Text>
          )}
          {user.bio && (
            <Text style={styles.userBio} numberOfLines={1}>
              {user.bio}
            </Text>
          )}
        </View>
      </Pressable>
      {actions && <View style={styles.userActions}>{actions}</View>}
    </GlassCard>
  );

  return (
    <MeshGradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <Text style={styles.title}>Friends</Text>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['friends', 'requests', 'find'] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, tab === t && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'friends' ? 'Friends' : t === 'requests' ? 'Requests' : 'Find'}
              </Text>
              {t === 'requests' && receivedCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{receivedCount}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {tab === 'friends' && (
          <>
            {friends.length > 0 ? (
              friends.map((f) =>
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
                <Text style={styles.emptyText}>
                  No friends yet. Search and add some!
                </Text>
              </GlassCard>
            )}
          </>
        )}

        {tab === 'requests' && (
          <>
            {requests.received?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Received</Text>
                {requests.received.map((r: any) =>
                  renderUserCard(r.from_user || r, (
                    <View style={styles.requestActions}>
                      <GlassButton
                        title="Accept"
                        onPress={() => handleAccept(r.id)}
                        size="small"
                      />
                      <GlassButton
                        title="Decline"
                        onPress={() => handleReject(r.id)}
                        size="small"
                        variant="secondary"
                      />
                    </View>
                  ))
                )}
              </>
            )}
            {requests.sent?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Sent</Text>
                {requests.sent.map((r: any) =>
                  renderUserCard(r.to_user || r, (
                    <Text style={styles.pendingText}>Pending...</Text>
                  ))
                )}
              </>
            )}
            {!requests.received?.length && !requests.sent?.length && (
              <GlassCard>
                <Text style={styles.emptyText}>No pending requests</Text>
              </GlassCard>
            )}
          </>
        )}

        {tab === 'find' && (
          <>
            <View style={styles.searchWrapper}>
              <GlassCard padding={false}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search users..."
                  placeholderTextColor={Colors.text.tertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                />
              </GlassCard>
            </View>
            {searchQuery.length < 2 ? (
              <Text style={styles.searchHint}>
                Type at least 2 characters to search
              </Text>
            ) : searching ? (
              <Text style={styles.searchHint}>Searching...</Text>
            ) : searchResults.length > 0 ? (
              searchResults.map((u) =>
                renderUserCard(u, (
                  <GlassButton
                    title="Add"
                    onPress={() => handleAddFriend(u.id)}
                    size="small"
                    variant="glass"
                  />
                ))
              )
            ) : (
              <Text style={styles.searchHint}>No users found</Text>
            )}
          </>
        )}
      </ScrollView>
    </MeshGradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  title: {
    ...Typography.largeTitle,
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    gap: Spacing.xs,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    ...Typography.subheadline,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  tabTextActive: {
    color: '#FFF',
  },
  badge: {
    backgroundColor: Colors.systemRed,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  sectionTitle: {
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
  userInfo: {
    flex: 1,
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
  emptyText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  searchWrapper: {
    marginBottom: Spacing.lg,
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
});
