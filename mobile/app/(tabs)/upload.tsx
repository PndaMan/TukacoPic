import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/theme';
import {
  MeshGradientBackground,
  GlassButton,
  GlassCard,
} from '../../src/components';
import api from '../../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_SIZE = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md * 2) / 3;

export default function UploadScreen() {
  const insets = useSafeAreaInsets();
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 70,
    });

    if (!result.canceled) {
      setImages(result.assets);
      setMessage(null);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets]);
      setMessage(null);
    }
  };

  const handleUpload = async () => {
    if (images.length === 0) return;
    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      images.forEach((img, i) => {
        const uri = img.uri;
        const name = uri.split('/').pop() || `photo_${i}.jpg`;
        const type = img.mimeType || 'image/jpeg';
        formData.append('photos', {
          uri,
          name,
          type,
        } as any);
      });

      await api.post('/photos/upload/bulk/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMessage({ type: 'success', text: `${images.length} photo(s) uploaded!` });
      setImages([]);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMessage({
        type: 'error',
        text: e.response?.data?.error || 'Upload failed. Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <MeshGradientBackground variant="warm">
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Upload</Text>
        <Text style={styles.subtitle}>Share your best photos</Text>

        {message && (
          <GlassCard
            style={[
              styles.messageCard,
              message.type === 'error' && styles.errorCard,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                { color: message.type === 'error' ? Colors.systemRed : Colors.systemGreen },
              ]}
            >
              {message.text}
            </Text>
          </GlassCard>
        )}

        <View style={styles.buttons}>
          <GlassButton
            title="Choose from Library"
            onPress={pickImages}
            variant="glass"
            fullWidth
            icon={<Text style={{ fontSize: 18 }}>🖼️</Text>}
          />
          <GlassButton
            title="Take a Photo"
            onPress={takePhoto}
            variant="glass"
            fullWidth
            icon={<Text style={{ fontSize: 18 }}>📸</Text>}
          />
        </View>

        {images.length > 0 && (
          <>
            <Text style={styles.previewTitle}>
              {images.length} photo{images.length > 1 ? 's' : ''} selected
            </Text>
            <View style={styles.previewGrid}>
              {images.map((img, i) => (
                <View key={i} style={styles.previewItem}>
                  <Image
                    source={{ uri: img.uri }}
                    style={styles.previewImage}
                    contentFit="cover"
                  />
                </View>
              ))}
            </View>

            <View style={styles.uploadActions}>
              <GlassButton
                title="Clear"
                onPress={() => setImages([])}
                variant="secondary"
              />
              <GlassButton
                title={`Upload ${images.length} Photo${images.length > 1 ? 's' : ''}`}
                onPress={handleUpload}
                loading={uploading}
                disabled={uploading}
              />
            </View>
          </>
        )}

        <GlassCard style={styles.tips}>
          <Text style={styles.tipsTitle}>Tips</Text>
          <Text style={styles.tipText}>{'•'} Upload high-quality photos for better rankings</Text>
          <Text style={styles.tipText}>{'•'} JPEG and PNG are supported</Text>
          <Text style={styles.tipText}>{'•'} Max 100MB per file, 150MB total</Text>
          <Text style={styles.tipText}>{'•'} Up to 70 photos at once</Text>
        </GlassCard>
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
  },
  subtitle: {
    ...Typography.subheadline,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  buttons: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  messageCard: {
    marginBottom: Spacing.lg,
  },
  errorCard: {
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  messageText: {
    ...Typography.subheadline,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewTitle: {
    ...Typography.headline,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  previewItem: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  uploadActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  tips: {
    marginTop: Spacing.md,
  },
  tipsTitle: {
    ...Typography.headline,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  tipText: {
    ...Typography.subheadline,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
});
