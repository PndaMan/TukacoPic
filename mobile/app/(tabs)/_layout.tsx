import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { GlassTabBar } from '../../src/components';
import { useAuthStore } from '../../src/store/authStore';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    leaderboard: '🏆',
    vote: '⚔️',
    upload: '📷',
    tukacodle: '🎯',
    profile: '👤',
  };
  return (
    <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.6 }}>
      {icons[name] || '●'}
    </Text>
  );
}

export default function TabLayout() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="leaderboard" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="vote"
        options={{
          title: 'Vote',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="vote" focused={focused} />
          ),
          href: isAuthenticated ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Upload',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="upload" focused={focused} />
          ),
          href: isAuthenticated ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="tukacodle"
        options={{
          title: 'Tukacodle',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="tukacodle" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="profile" focused={focused} />
          ),
          href: isAuthenticated ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="messages"
        options={{ href: null }}
      />
    </Tabs>
  );
}
