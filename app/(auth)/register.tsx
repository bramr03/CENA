import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRegister() {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      Alert.alert('Error', error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        name,
        role: 'outsider',
      })
    }

    Alert.alert('Gelukt!', 'Check je e-mail om je account te bevestigen.')
    router.replace('/(auth)/login')
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DateDiner</Text>
      <Text style={styles.subtitle}>Account aanmaken</Text>

      <TextInput
        style={styles.input}
        placeholder="Naam"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="E-mailadres"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Wachtwoord"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Laden...' : 'Registreer'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.link}>Al een account? Inloggen</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F7F4EF' },
  title: { fontSize: 32, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#57534E', textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E7E5E4', borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 12 },
  button: { backgroundColor: '#1C1917', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  link: { textAlign: 'center', marginTop: 20, color: '#57534E', fontSize: 14 },
})