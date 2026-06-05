import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Alert
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function CreateDinner() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)

  function formatDateInput(text: string) {
    const digits = text.replace(/\D/g, '')
    if (digits.length <= 4) return digits
    if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
  }

  async function handleCreate() {
    if (!name.trim()) { Alert.alert('Vul een naam in voor het diner'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data, error } = await supabase.from('dinners').insert({
      name: name.trim(),
      date: date || null,
      location: location.trim() || null,
      org_id: user.id,
    }).select().single()

    setSaving(false)
    if (error) { Alert.alert('Er ging iets mis', error.message); return }
    router.replace(`/(app)/dinner/${data.id}`)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Text style={styles.backText}>← Terug</Text>
        </TouchableOpacity>

        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>Nieuw evenement</Text>
          <Text style={styles.title}>Diner aanmaken 🌸</Text>
          <Text style={styles.subtitle}>Vul de basisgegevens in. Je kunt alles later nog aanpassen.</Text>
        </View>

        <Text style={styles.fieldLabel}>Naam van het diner *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="bijv. Lentediner 2026"
          placeholderTextColor="#FFC0CB"
          autoFocus
        />

        <Text style={styles.fieldLabel}>Datum</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={t => setDate(formatDateInput(t))}
          placeholder="JJJJ-MM-DD"
          placeholderTextColor="#FFC0CB"
          keyboardType="numeric"
          maxLength={10}
        />

        <Text style={styles.fieldLabel}>Locatie</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="bijv. Restaurant De Zwaan, Tilburg"
          placeholderTextColor="#FFC0CB"
        />

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Na het aanmaken kun je dispuutleden toevoegen en verzoeken van buitenstaanders beheren.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.createButton, saving && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.createButtonText}>Diner aanmaken →</Text>}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF0F5' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },

  backRow: { marginBottom: 24 },
  backText: { fontSize: 14, color: '#c47a8a' },

  headerBlock: { marginBottom: 28 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: '#FFC0CB', textTransform: 'uppercase', marginBottom: 6 },
  title: { fontSize: 28, fontWeight: '700', color: '#2d1f24', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#9e6b78', lineHeight: 20 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#9e6b78', marginBottom: 6, marginTop: 12, letterSpacing: 0.3 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#FFD1DC', borderRadius: 12, padding: 14, fontSize: 15, color: '#2d1f24' },

  infoCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#FFD1DC', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 24, marginBottom: 24 },
  infoIcon: { fontSize: 16, marginTop: 1 },
  infoText: { flex: 1, fontSize: 13, color: '#9e6b78', lineHeight: 18 },

  createButton: { backgroundColor: '#FFB6C1', borderRadius: 14, padding: 16, alignItems: 'center' },
  createButtonText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
})