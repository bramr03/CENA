import { Tabs } from 'expo-router'

export default function AppLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="discover" options={{ title: 'Ontdekken' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profiel' }} />
      <Tabs.Screen name="create" options={{ href: null }} />
      <Tabs.Screen name="dinner/[id]" options={{ href: null }} />
    </Tabs>
  )
}