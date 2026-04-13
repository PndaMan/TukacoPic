import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/theme';
import { MeshGradientBackground, GlassCard, getImageUrl } from '../../src/components';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const fetchFriends = useCallback(async () => {
    try {
      const res = await api.get('/friends/');
      setFriends(res.data.results || res.data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchMessages = useCallback(async (friendId: number) => {
    try {
      const res = await api.get(`/conversations/${friendId}/`);
      setMessages(res.data.results || res.data || []);
      // Mark as read
      try {
        await api.post(`/conversations/${friendId}/read/`);
      } catch {}
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
  }, []);

  useEffect(() => {
    if (selectedFriend) {
      fetchMessages(selectedFriend.id);
      const interval = setInterval(() => fetchMessages(selectedFriend.id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedFriend]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() || !selectedFriend || sending) return;
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await api.post(`/conversations/${selectedFriend.id}/`, {
        content: text.trim(),
      });
      setText('');
      fetchMessages(selectedFriend.id);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  // Friends list view
  if (!selectedFriend) {
    return (
      <MeshGradientBackground>
        <View style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
          <Text style={styles.title}>Messages</Text>

          {friends.length > 0 ? (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setSelectedFriend(item)}
                  style={({ pressed }) => [pressed && { opacity: 0.8 }]}
                >
                  <GlassCard style={styles.friendCard}>
                    <View style={styles.friendRow}>
                      <Image
                        source={{
                          uri: item.profile_picture
                            ? getImageUrl(item.profile_picture)
                            : undefined,
                        }}
                        style={styles.friendAvatar}
                        contentFit="cover"
                      />
                      <View style={styles.friendInfo}>
                        <Text style={styles.friendName}>{item.username}</Text>
                        {item.badge && (
                          <Text style={styles.friendBadge}>🏆 {item.badge}</Text>
                        )}
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </View>
                  </GlassCard>
                </Pressable>
              )}
            />
          ) : (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No friends yet. Add some friends to start chatting!
              </Text>
            </GlassCard>
          )}
        </View>
      </MeshGradientBackground>
    );
  }

  // Chat view
  return (
    <MeshGradientBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatContainer}
        keyboardVerticalOffset={0}
      >
        {/* Chat header */}
        <View style={[styles.chatHeader, { paddingTop: insets.top }]}>
          <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFillObject} />
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

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.messagesList,
            { paddingTop: insets.top + 60, paddingBottom: Spacing.md },
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isOwn = item.sender?.id === user?.id;
            return (
              <View
                style={[
                  styles.messageBubbleWrapper,
                  isOwn ? styles.ownMessage : styles.otherMessage,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isOwn ? styles.ownBubble : styles.otherBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isOwn && styles.ownMessageText,
                    ]}
                  >
                    {item.content}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.messageTime,
                    isOwn && styles.ownMessageTime,
                  ]}
                >
                  {formatTime(item.created_at)}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyMessagesText}>
                No messages yet. Say hello! 👋
              </Text>
            </View>
          }
        />

        {/* Input */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
          <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFillObject} />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Message..."
              placeholderTextColor={Colors.text.tertiary}
              value={text}
              onChangeText={setText}
              maxLength={1000}
              multiline
            />
            <Pressable
              onPress={handleSend}
              disabled={!text.trim() || sending}
              style={[
                styles.sendButton,
                (!text.trim() || sending) && styles.sendDisabled,
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  title: {
    ...Typography.largeTitle,
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  friendCard: {
    marginBottom: Spacing.sm,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background.tertiary,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    ...Typography.headline,
    color: Colors.text.primary,
  },
  friendBadge: {
    ...Typography.caption1,
    color: Colors.primary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: Colors.text.tertiary,
    fontWeight: '300',
  },
  emptyCard: {
    marginTop: Spacing.xl,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  chatContainer: {
    flex: 1,
  },
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
  messagesList: {
    paddingHorizontal: Spacing.lg,
  },
  messageBubbleWrapper: {
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
  messageBubble: {
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
  messageText: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  ownMessageText: {
    color: '#FFF',
  },
  messageTime: {
    ...Typography.caption2,
    color: Colors.text.tertiary,
    marginTop: 2,
    marginHorizontal: Spacing.xs,
  },
  ownMessageTime: {
    textAlign: 'right',
  },
  emptyMessages: {
    alignItems: 'center',
    paddingTop: SCREEN_HEIGHT * 0.3,
  },
  emptyMessagesText: {
    ...Typography.body,
    color: Colors.text.secondary,
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
  textInput: {
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
