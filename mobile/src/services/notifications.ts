import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const STREAK_CHANNEL_ID = 'streak-reminder';
const TUKACODLE_CHANNEL_ID = 'tukacodle-reminder';

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function setupNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(STREAK_CHANNEL_ID, {
      name: 'Streak Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
    await Notifications.setNotificationChannelAsync(TUKACODLE_CHANNEL_ID, {
      name: 'Tukacodle Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/**
 * Schedule daily streak reminder at 8pm local time.
 * Reminds user to vote so they don't lose their streak.
 */
export async function scheduleStreakReminder() {
  // Cancel existing streak reminders first
  await cancelStreakReminder();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your streak is about to end! 🔥',
      body: "Don't forget to vote today to keep your streak alive!",
      ...(Platform.OS === 'android' && { channelId: STREAK_CHANNEL_ID }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
    identifier: 'streak-daily',
  });
}

/**
 * Schedule daily tukacodle reminder at 10am local time.
 */
export async function scheduleTukacodleReminder() {
  await cancelTukacodleReminder();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New Tukacodle available! 🎯',
      body: "Today's ELO guessing challenge is ready. Can you beat your high score?",
      ...(Platform.OS === 'android' && { channelId: TUKACODLE_CHANNEL_ID }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 10,
      minute: 0,
    },
    identifier: 'tukacodle-daily',
  });
}

export async function cancelStreakReminder() {
  await Notifications.cancelScheduledNotificationAsync('streak-daily').catch(() => {});
}

export async function cancelTukacodleReminder() {
  await Notifications.cancelScheduledNotificationAsync('tukacodle-daily').catch(() => {});
}

/**
 * Set up all daily reminders. Call after user logs in.
 */
export async function initializeNotifications() {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await setupNotificationChannels();
  await scheduleStreakReminder();
  await scheduleTukacodleReminder();
}

/**
 * Cancel all reminders. Call on logout.
 */
export async function cancelAllReminders() {
  await cancelStreakReminder();
  await cancelTukacodleReminder();
}
