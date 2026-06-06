import { Tabs } from 'expo-router'
import { Text } from 'react-native'

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFB6C1',
        tabBarInactiveTintColor: '#c47a8a',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#FFE4E1',
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>🍽️</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Ontdekken',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>🔍</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profiel',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>👤</Text>
          ),
        }}
      />
      <Tabs.Screen name="create" options={{ href: null }} />
      <Tabs.Screen name="dinner/[id]" options={{ href: null }} />
    </Tabs>
  )
}