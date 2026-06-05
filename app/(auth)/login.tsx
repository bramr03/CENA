import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) Alert.alert('Error', error.message)
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>

        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🌸</Text>
          </View>
          <Text style={styles.title}>DateDiner</Text>
          <Text style={styles.subtitle}>Inloggen om door te gaan</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.fieldLabel}>E-mailadres</Text>
          <TextInput
            style={styles.input}
            placeholder="jouw@email.nl"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#FFC0CB"
          />

          <Text style={styles.fieldLabel}>Wachtwoord</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#FFC0CB"
          />

          <TouchableOpacity style={[styles.button, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Inloggen →</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.link}>Nog geen account? <Text style={styles.linkBold}>Registreer hier</Text></Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: '#FFF0F5' },
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFD1DC', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoEmoji: { fontSize: 32 },
  title: { fontSize: 32, fontWeight: '700', color: '#2d1f24', letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#9e6b78' },
  form: { marginBottom: 24 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#9e6b78', marginBottom: 6, marginTop: 14, letterSpacing: 0.3 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#FFD1DC', borderRadius: 12, padding: 14, fontSize: 15, color: '#2d1f24' },
  button: { backgroundColor: '#FFB6C1', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  link: { textAlign: 'center', color: '#9e6b78', fontSize: 14 },
  linkBold: { color: '#c47a8a', fontWeight: '700' },
})