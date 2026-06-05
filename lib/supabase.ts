import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? localStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export type Dinner = {
  id: string
  name: string
  date: string
  location: string
  org_id: string
}

export type Member = {
  id: string
  dinner_id: string
  name: string
  study: string
  tags: string[]
  matched_to: string | null
}

export type Request = {
  id: string
  dinner_id: string
  member_id: string | null
  requester_id: string
  status: 'pending' | 'accepted' | 'rejected'
}