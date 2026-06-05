import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform
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
    // Auto-insert dashes: 2026-06-14
    const digits = text.replace(/\D/g, '')
    if (digits.length <= 4) return digits
    if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
  }

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Vul een naam in voor het diner')
      return
    }

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

    if (error) {
      Alert.alert('Er ging iets mis', error.message)
      return
    }

    router.replace(`/(app)/dinner/${data.id}`)
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Terug</Text>
        </TouchableOpacity>

        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>Nieuw evenement</Text>
          <Text style={styles.title}>Diner aanmaken</Text>
          <Text style={styles.subtitle}>Vul de basisgegevens in. Je kunt alles later nog aanpassen.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>

          <View style={styles.field}>
            <Text style={styles.label}>Naam van het diner *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="bijv. Lentediner 2026"
              placeholderTextColor="#A8A29E"
              autoFocus
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Datum</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={t => setDate(formatDateInput(t))}
              placeholder="JJJJ-MM-DD"
              placeholderTextColor="#A8A29E"
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Locatie</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="bijv. Restaurant De Zwaan, Tilburg"
              placeholderTextColor="#A8A29E"
            />
          </View>

        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Na het aanmaken kun je dispuutleden toevoegen en verzoeken van buitenstaanders beheren.
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.createButton, saving && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.createButtonText}>Diner aanmaken →</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F4EF',
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  back: {
    marginBottom: 24,
  },
  backText: {
    fontSize: 14,
    color: '#57534E',
  },
  headerBlock: {
    marginBottom: 28,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#A8A29E',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#78716C',
    lineHeight: 20,
  },
  form: {
    marginBottom: 16,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#57534E',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1C1917',
  },
  infoCard: {
    backgroundColor: '#FEF9EE',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 24,
  },
  infoIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#78716C',
    lineHeight: 18,
  },
  createButton: {
    backgroundColor: '#1C1917',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
})