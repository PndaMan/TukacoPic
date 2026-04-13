import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, BorderRadius, Spacing } from '../theme';
import { GlassButton } from './GlassButton';
import { GlassCard } from './GlassCard';
import { getImageUrl } from './PhotoCard';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const REACTION_TYPES = ['❤️', '🔥', '😂', '😍', '👍', '😮'];

interface PhotoModalProps {
  photoId: number | null;
  visible: boolean;
  onClose: () => void;
}

export function PhotoModal({ photoId, visible, onClose }: PhotoModalProps) {
  const [photo, setPhoto] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (photoId && visible) {
      fetchPhoto();
    }
  }, [photoId, visible]);

  const fetchPhoto = async () => {
    if (!photoId) return;
    setLoading(true);
    try {
      const res = await api.get(`/photos/${photoId}/`);
      setPhoto(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (type: string) => {
    if (!isAuthenticated || !photoId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const isCurrentReaction = photo?.user_reaction === type;
      if (isCurrentReaction) {
        await api.post(`/photos/${photoId}/unreact/`);
      } else {
        await api.post(`/photos/${photoId}/react/`, { reaction_type: type });
      }
      fetchPhoto();
    } catch (e) {
      console.error(e);
    }
  };

  const handleComment = async () => {
    if (!comment.trim() || !photoId) return;
    setSubmitting(true);
    try {
      await api.post(`/photos/${photoId}/comments/`, { text: comment.trim() });
      setComment('');
      fetchPhoto();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await api.delete(`/comments/${commentId}/`);
      fetchPhoto();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={40} tint="dark" style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <Pressable style={styles.dismissArea} onPress={onClose} />
          <View style={styles.sheet}>
            <BlurView intensity={80} tint="light" style={styles.sheetBlur}>
              <View style={styles.sheetInner}>
                {/* Handle */}
                <View style={styles.handle} />

                {loading ? (
                  <ActivityIndicator
                    size="large"
                    color={Colors.primary}
                    style={{ padding: 40 }}
                  />
                ) : photo ? (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                  >
                    {/* Photo */}
                    <Image
                      source={{ uri: getImageUrl(photo.image) }}
                      style={styles.photo}
                      contentFit="cover"
                      transition={200}
                    />

                    {/* Uploader info */}
                    <View style={styles.uploaderRow}>
                      <View style={styles.uploaderInfo}>
                        <Text style={styles.uploaderName}>
                          {photo.uploader?.username}
                        </Text>
                        <Text style={styles.date}>
                          {new Date(photo.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={styles.eloScore}>
                        {Math.round(photo.elo_score)} ELO
                      </Text>
                    </View>

                    {/* Reactions */}
                    <View style={styles.reactions}>
                      {REACTION_TYPES.map((type) => {
                        const count =
                          photo.reactions?.find(
                            (r: any) => r.reaction_type === type
                          )?.count || 0;
                        const isActive = photo.user_reaction === type;
                        return (
                          <Pressable
                            key={type}
                            onPress={() => handleReaction(type)}
                            style={[
                              styles.reactionBtn,
                              isActive && styles.reactionActive,
                            ]}
                            disabled={!isAuthenticated}
                          >
                            <Text style={styles.reactionEmoji}>{type}</Text>
                            {count > 0 && (
                              <Text
                                style={[
                                  styles.reactionCount,
                                  isActive && styles.reactionCountActive,
                                ]}
                              >
                                {count}
                              </Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Comments */}
                    <View style={styles.commentsSection}>
                      <Text style={styles.commentsTitle}>
                        Comments{' '}
                        {photo.comments?.length > 0 &&
                          `(${photo.comments.length})`}
                      </Text>
                      {photo.comments?.map((c: any) => (
                        <View key={c.id} style={styles.commentItem}>
                          <View style={styles.commentHeader}>
                            <Text style={styles.commentUser}>
                              {c.user?.username}
                            </Text>
                            <Text style={styles.commentDate}>
                              {new Date(c.created_at).toLocaleDateString()}
                            </Text>
                          </View>
                          <Text style={styles.commentText}>{c.text}</Text>
                          {user?.id === c.user?.id && (
                            <Pressable
                              onPress={() => handleDeleteComment(c.id)}
                            >
                              <Text style={styles.deleteComment}>Delete</Text>
                            </Pressable>
                          )}
                        </View>
                      ))}

                      {isAuthenticated && (
                        <View style={styles.commentInput}>
                          <TextInput
                            style={styles.commentTextInput}
                            placeholder="Add a comment..."
                            placeholderTextColor={Colors.text.tertiary}
                            value={comment}
                            onChangeText={setComment}
                            maxLength={500}
                            multiline
                          />
                          <GlassButton
                            title="Post"
                            onPress={handleComment}
                            size="small"
                            disabled={!comment.trim()}
                            loading={submitting}
                          />
                        </View>
                      )}
                    </View>
                  </ScrollView>
                ) : null}
              </View>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    maxHeight: SCREEN_HEIGHT * 0.9,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  sheetBlur: {
    overflow: 'hidden',
  },
  sheetInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  photo: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  uploaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  uploaderInfo: {
    flex: 1,
  },
  uploaderName: {
    ...Typography.headline,
    color: Colors.text.primary,
  },
  date: {
    ...Typography.caption1,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  eloScore: {
    ...Typography.title3,
    color: Colors.primary,
    fontWeight: '700',
  },
  reactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    gap: 4,
  },
  reactionActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  reactionEmoji: {
    fontSize: 18,
  },
  reactionCount: {
    ...Typography.caption1,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  reactionCountActive: {
    color: Colors.primary,
  },
  commentsSection: {
    paddingHorizontal: Spacing.lg,
  },
  commentsTitle: {
    ...Typography.headline,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  commentItem: {
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separator,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  commentUser: {
    ...Typography.subheadline,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  commentDate: {
    ...Typography.caption1,
    color: Colors.text.secondary,
  },
  commentText: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  deleteComment: {
    ...Typography.caption1,
    color: Colors.systemRed,
    marginTop: Spacing.xs,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separator,
  },
  commentTextInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxHeight: 100,
  },
});
