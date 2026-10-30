import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { pixel } from '@/constants/pixel-theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: pixel.tangerine,
        tabBarInactiveTintColor: pixel.muted,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: pixel.panel,
          borderTopColor: pixel.ink,
          borderTopWidth: 3,
        },
        tabBarLabelStyle: {
          fontWeight: '800',
          fontSize: 11,
          letterSpacing: 0.3,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '섬',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: '상점',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="storefront" size={size} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="quest"
        options={{
          title: '퀘스트',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="flag" size={size} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: '인벤토리',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="inventory-2" size={size} color={String(color)} />,
        }}
      />
    </Tabs>
  );
}
