import { Tabs } from 'expo-router/tabs';
import { useDemo } from '@platto/demo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { C, F } from '@/lib/theme';

export default function DinerTabs() {
  const s = useDemo();
  const insets = useSafeAreaInsets();
  const unread = s.notifications.filter((n) => n.to === 'diner' && !n.read).length;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.brandHi,
        tabBarInactiveTintColor: C.text3,
        tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.line, height: 70 + insets.bottom, paddingTop: 6, paddingBottom: insets.bottom + 6 },
        tabBarLabelStyle: { fontFamily: F.medium, fontSize: 11, lineHeight: 18 },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ color }) => <Icon name="home" color={color} /> }} />
      <Tabs.Screen name="explorar" options={{ title: 'Explorar', tabBarIcon: ({ color }) => <Icon name="search" color={color} /> }} />
      <Tabs.Screen
        name="reservas"
        options={{ title: 'Reservas', tabBarIcon: ({ color }) => <Icon name="calendar" color={color} />, tabBarBadge: unread || undefined, tabBarBadgeStyle: { backgroundColor: C.brand, fontFamily: F.semibold, fontSize: 10 } }}
      />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: ({ color }) => <Icon name="user" color={color} /> }} />
    </Tabs>
  );
}
