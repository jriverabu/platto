import { Tabs } from 'expo-router/tabs';
import { effectiveStatus } from '@platto/core';
import { now, useDemo } from '@platto/demo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { C, F } from '@/lib/theme';

export default function RestaurantTabs() {
  const s = useDemo();
  const insets = useSafeAreaInsets();
  const t = new Date(now());
  const pending = s.reservations.filter(
    (r) => r.restaurantId === s.ownerRestaurantId && effectiveStatus({ status: r.status, expiresAt: new Date(r.expiresAt) }, t) === 'pending',
  ).length;
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
      <Tabs.Screen
        name="index"
        options={{ title: 'Reservas', tabBarIcon: ({ color }) => <Icon name="calendar" color={color} />, tabBarBadge: pending || undefined, tabBarBadgeStyle: { backgroundColor: C.brand, fontFamily: F.semibold, fontSize: 10 } }}
      />
      <Tabs.Screen name="menu" options={{ title: 'Menú', tabBarIcon: ({ color }) => <Icon name="play" color={color} /> }} />
      <Tabs.Screen name="resenas" options={{ title: 'Reseñas', tabBarIcon: ({ color }) => <Icon name="star" color={color} /> }} />
      <Tabs.Screen name="cuenta" options={{ title: 'Cuenta', tabBarIcon: ({ color }) => <Icon name="account" color={color} /> }} />
    </Tabs>
  );
}
