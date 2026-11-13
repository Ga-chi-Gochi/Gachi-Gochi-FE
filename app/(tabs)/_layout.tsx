import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}>
      <Tabs.Screen name="index" options={{ title: '섬' }} />
      <Tabs.Screen name="shop" options={{ title: '상점' }} />
      <Tabs.Screen name="quest" options={{ title: '퀘스트' }} />
      <Tabs.Screen name="inventory" options={{ title: '인벤토리' }} />
    </Tabs>
  );
}
