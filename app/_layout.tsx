import { useEffect, useState } from 'react'
import { Slot, useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { View, ActivityIndicator } from 'react-native'

export default function RootLayout() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/(auth)/login')
      } else {
        router.replace('/(app)')
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') router.replace('/(auth)/login')
      if (event === 'SIGNED_IN') router.replace('/(app)')
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <>
      <Slot />
      {loading && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          justifyContent: 'center', alignItems: 'center',
          backgroundColor: '#FFF0F5',
        }}>
          <ActivityIndicator color="#FFB6C1" size="large" />
        </View>
      )}
    </>
  )
}