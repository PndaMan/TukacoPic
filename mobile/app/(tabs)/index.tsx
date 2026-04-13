import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/theme';
import { PhotoCard, PhotoModal, MeshGradientBackground } from '../../src/components';
import api from '../../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = Spacing.sm;

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await api.get('/leaderboard/');
      setPhotos(res.data.results || res.data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
  };

  const renderPhoto = ({ item, index }: { item: any; index: number }) => (
    <PhotoCard
      photo={item}
      rank={index + 1}
      onPress={() => setSelectedPhotoId(item.id)}
    />
  );

  return (
    <MeshGradientBackground variant="cool">
      <FlatList
        data={photos}
        renderItem={renderPhoto}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Leaderboard</Text>
            <Text style={styles.subtitle}>
              Top-rated photos by community votes
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyText}>No photos yet</Text>
          </View>
        }
      />

      <PhotoModal
        photoId={selectedPhotoId}
        visible={selectedPhotoId !== null}
        onClose={() => setSelectedPhotoId(null)}
      />
    </MeshGradientBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
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
  list: {
    paddingHorizontal: Spacing.lg,
  },
  row: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...Typography.headline,
    color: Colors.text.secondary,
  },
});
