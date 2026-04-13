import React from 'react';
import { StyleSheet, View, Text, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Colors, Typography, BorderRadius, Spacing } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = Spacing.sm;
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - CARD_GAP) / 2;

interface PhotoCardProps {
  photo: {
    id: number;
    image: string;
    uploader?: { username: string; profile_picture?: string };
    elo_score?: number;
    created_at?: string;
  };
  rank?: number;
  onPress?: () => void;
  size?: 'half' | 'full';
  showReactions?: boolean;
}

function getRankColor(rank: number) {
  if (rank === 1) return Colors.rank.gold;
  if (rank === 2) return Colors.rank.silver;
  if (rank === 3) return Colors.rank.bronze;
  return Colors.rank.regular;
}

function getImageUrl(image: string) {
  if (image.startsWith('http')) return image;
  return `https://apitukacopic.aether-lab.xyz${image}`;
}

export function PhotoCard({
  photo,
  rank,
  onPress,
  size = 'half',
}: PhotoCardProps) {
  const cardWidth = size === 'full' ? SCREEN_WIDTH - Spacing.lg * 2 : CARD_WIDTH;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { width: cardWidth },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: getImageUrl(photo.image) }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          recyclingKey={`photo-${photo.id}`}
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        />

        {rank !== undefined && (
          <View
            style={[
              styles.rankBadge,
              { backgroundColor: getRankColor(rank) },
            ]}
          >
            <Text style={styles.rankText}>{rank}</Text>
          </View>
        )}

        <View style={styles.overlay}>
          <BlurView intensity={50} tint="dark" style={styles.overlayBlur}>
            <View style={styles.overlayInner}>
              {photo.uploader && (
                <Text style={styles.username} numberOfLines={1}>
                  {photo.uploader.username}
                </Text>
              )}
              {photo.elo_score !== undefined && (
                <Text style={styles.elo}>
                  {Math.round(photo.elo_score)}
                </Text>
              )}
            </View>
          </BlurView>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  imageWrapper: {
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.background.tertiary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  rankBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  rankText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
  },
  overlayBlur: {
    overflow: 'hidden',
  },
  overlayInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  username: {
    ...Typography.caption1,
    color: '#FFF',
    fontWeight: '600',
    flex: 1,
  },
  elo: {
    ...Typography.subheadline,
    color: '#FFF',
    fontWeight: '700',
  },
});

export { getImageUrl };
