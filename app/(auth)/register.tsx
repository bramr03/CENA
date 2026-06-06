import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRegister() {
    if (!name.trim()) { Alert.alert('Vul je naam in'); return }
    if (!email.trim()) { Alert.alert('Vul je e-mailadres in'); return }
    if (!email.includes('@')) { Alert.alert('Vul een geldig e-mailadres in'); return }
    if (password.length < 6) { Alert.alert('Wachtwoord moet minimaal 6 tekens zijn'); return }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })

    if (error) {
      Alert.alert('Error', error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        name: name.trim(),
        role: 'outsider',
      })
      if (profileError) {
        console.log('Profile error:', profileError.message)
        // Don't block registration if profile insert fails
      }
    }

    setLoading(false)
    Alert.alert('Gelukt! 🎉', 'Check je e-mail om je account te bevestigen.', [
      { text: 'OK', onPress: () => router.replace('/(auth)/login') }
    ])
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🌸</Text>
          </View>
          <Text style={styles.title}>DateDiner</Text>
          <Text style={styles.subtitle}>Maak een account aan</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.fieldLabel}>Naam</Text>
          <TextInput
            style={styles.input}
            placeholder="Jouw naam"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#FFC0CB"
          />

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

          <TouchableOpacity style={[styles.button, loading && { opacity: 0.6 }]} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Account aanmaken →</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Al een account? <Text style={styles.linkBold}>Inloggen</Text></Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF0F5' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 28, paddingBottom: 40 },
  logoArea: { alignItems: 'center', marginBottom: 36 },
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