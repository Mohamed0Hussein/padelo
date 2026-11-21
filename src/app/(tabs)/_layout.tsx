import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/ui';
import { font, useTheme } from '@/theme';

const tabs = [
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'matches', title: 'Matches', icon: 'sports-tennis' },
  { name: 'tournaments', title: 'Tournaments', icon: 'emoji-events' },
  { name: 'players', title: 'Players', icon: 'group' },
] as const;

export default function TabsLayout() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.onSurfaceMuted,
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 12 },
        tabBarStyle: {
          backgroundColor: c.background,
          borderTopColor: c.glassStroke,
          height: 62 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 4,
        },
        tabBarItemStyle: { minHeight: 48 },
      }}
    >
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarAccessibilityLabel: t.title,
            tabBarIcon: ({ color }) => <Icon name={t.icon} color={color as string} />,
          }}
        />
      ))}
    </Tabs>
  );
}
