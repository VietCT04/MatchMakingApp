import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: 'center',
        tabBarActiveTintColor: '#1f4ad3',
        tabBarInactiveTintColor: '#66748e',
        tabBarStyle: {
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
          borderTopColor: '#d7e0ec',
          backgroundColor: '#ffffff',
        },
      }}
    >
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="create-match" options={{ title: 'Create' }} />
      <Tabs.Screen name="ratings" options={{ title: 'Ratings' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
