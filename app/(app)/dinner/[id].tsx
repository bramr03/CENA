import { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase, Member } from '../../../lib/supabase'

type Dinner = {
  id: string
  name: string
  date: string | null
  location: string | null
  description: string | null
  org_id: string
}

export default function DinnerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const [dinner, setDinner] = useState<Dinner | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // edit form state
  const [editName, setEditName] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editDescription, setEditDescription] = useState('')

  // add member form
  const [showAddMember, setShowAddMember] = useState(false)
  const [newName, setNewName] = useState('')
  const [newStudy, setNewStudy] = useState('')
  const [newTags, setNewTags] = useState('')
  const [addingMember, setAddingMember] = useState(false)

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()

    const [{ data: dinnerData }, { data: membersData }] = await Promise.all([
      supabase.from('dinners').select('*').eq('id', id).single(),
      supabase.from('members').select('*').eq('dinner_id', id),
    ])

    if (dinnerData) {
      setDinner(dinnerData)
      setIsOwner(user?.id === dinnerData.org_id)
      setEditName(dinnerData.name)
      setEditDate(dinnerData.date ?? '')
      setEditLocation(dinnerData.location ?? '')
      setEditDescription(dinnerData.description ?? '')
    }

    setMembers(membersData ?? [])
    setLoading(false)
  }

  function startEditing() {
    if (!dinner) return
    setEditName(dinner.name)
    setEditDate(dinner.date ?? '')
    setEditLocation(dinner.location ?? '')
    setEditDescription(dinner.description ?? '')
    setEditing(true)
  }

  async function saveDinner() {
    setSaving(true)
    const { data, error } = await supabase.from('dinners').update({
      name: editName.trim(),
      date: editDate || null,
      location: editLocation.trim() || null,
      description: editDescription.trim() || null,
    }).eq('id', id).select().single()

    if (error) {
      Alert.alert('Error', error.message)
    } else {
      setDinner(data)
      setEditing(false)
    }
    setSaving(false)
  }

  async function addMember() {
    if (!newName.trim()) { Alert.alert('Vul een naam in'); return }
    setAddingMember(true)
    const { data, error } = await supabase.from('members').insert({
      dinner_id: id,
      name: newName.trim(),
      study: newStudy.trim() || null,
      tags: newTags ? newTags.split(',').map(t => t.trim()).filter(Boolean) : [],
    }).select().single()
    setAddingMember(false)
    if (error) { Alert.alert('Error', error.message); return }
    setMembers(prev => [...prev, data])
    setNewName('')
    setNewStudy('')
    setNewTags('')
    setShowAddMember(false)
  }

  async function deleteMember(memberId: string) {
    await supabase.from('members').delete().eq('id', memberId)
    setMembers(prev => prev.filter(m => m.id !== memberId))
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return null
    const d = new Date(dateStr)
    return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />
  if (!dinner) return <Text style={{ flex: 1, textAlign: 'center', marginTop: 100 }}>Diner niet gevonden</Text>

  // ── EDIT MODE ──
  if (editing) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => setEditing(false)} style={styles.back}>
            <Text style={styles.backText}>✕ Annuleer</Text>
          </TouchableOpacity>

          <Text style={styles.pageTitle}>Diner bewerken</Text>

          <View style={styles.editSection}>
            <Text style={styles.fieldLabel}>Naam *</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Naam van het diner" placeholderTextColor="#A8A29E" />

            <Text style={styles.fieldLabel}>Datum</Text>
            <TextInput style={styles.input} value={editDate} onChangeText={setEditDate} placeholder="JJJJ-MM-DD" placeholderTextColor="#A8A29E" keyboardType="numeric" maxLength={10} />

            <Text style={styles.fieldLabel}>Locatie</Text>
            <TextInput style={styles.input} value={editLocation} onChangeText={setEditLocation} placeholder="bijv. Restaurant De Zwaan" placeholderTextColor="#A8A29E" />

            <Text style={styles.fieldLabel}>Beschrijving</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Een korte beschrijving van het diner..."
              placeholderTextColor="#A8A29E"
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity style={[styles.primaryBtn, saving && { opacity: 0.6 }]} onPress={saveDinner} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Opslaan</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  // ── VIEW MODE ──
  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={members}
      keyExtractor={m => m.id}
      ListHeaderComponent={
        <>
          {/* Back + Edit */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backText}>← Terug</Text>
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity style={styles.editBtn} onPress={startEditing}>
                <Text style={styles.editBtnText}>✏️ Bewerken</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{dinner.name}</Text>
            {dinner.description && (
              <Text style={styles.heroDesc}>{dinner.description}</Text>
            )}
          </View>

          {/* Info pills */}
          <View style={styles.infoRow}>
            {dinner.date && (
              <View style={styles.infoPill}>
                <Text style={styles.infoPillIcon}>📅</Text>
                <Text style={styles.infoPillText}>{formatDate(dinner.date)}</Text>
              </View>
            )}
            {dinner.location && (
              <View style={styles.infoPill}>
                <Text style={styles.infoPillIcon}>📍</Text>
                <Text style={styles.infoPillText}>{dinner.location}</Text>
              </View>
            )}
            <View style={styles.infoPill}>
              <Text style={styles.infoPillIcon}>👥</Text>
              <Text style={styles.infoPillText}>{members.length} dispuutleden</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Members header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dispuutleden</Text>
            {isOwner && (
              <TouchableOpacity style={styles.addMemberBtn} onPress={() => setShowAddMember(!showAddMember)}>
                <Text style={styles.addMemberBtnText}>{showAddMember ? '✕' : '+ Toevoegen'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Add member form */}
          {showAddMember && (
            <View style={styles.addCard}>
              <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Naam *" placeholderTextColor="#A8A29E" />
              <TextInput style={styles.input} value={newStudy} onChangeText={setNewStudy} placeholder="Studie (optioneel)" placeholderTextColor="#A8A29E" />
              <TextInput style={styles.input} value={newTags} onChangeText={setNewTags} placeholder="Interesses, komma-gescheiden" placeholderTextColor="#A8A29E" />
              <TouchableOpacity style={[styles.primaryBtn, addingMember && { opacity: 0.6 }]} onPress={addMember} disabled={addingMember}>
                {addingMember ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>+ Lid toevoegen</Text>}
              </TouchableOpacity>
            </View>
          )}
        </>
      }
      renderItem={({ item }) => (
        <View style={styles.memberCard}>
          <View style={styles.memberRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{item.name}</Text>
              {item.study && <Text style={styles.memberStudy}>{item.study}</Text>}
              {item.tags?.length > 0 && (
                <View style={styles.tagRow}>
                  {item.tags.map((tag: string) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            {isOwner && (
              <TouchableOpacity onPress={() => Alert.alert('Verwijderen?', item.name, [
                { text: 'Annuleer', style: 'cancel' },
                { text: 'Verwijder', style: 'destructive', onPress: () => deleteMember(item.id) }
              ])}>
                <Text style={styles.deleteBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🍽️</Text>
          <Text style={styles.emptyTitle}>Nog geen leden</Text>
          <Text style={styles.emptyText}>
            {isOwner ? 'Voeg dispuutleden toe via de knop hierboven.' : 'De organisator heeft nog geen leden toegevoegd.'}
          </Text>
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F4EF' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  back: { marginBottom: 24 },
  backText: { fontSize: 14, color: '#57534E' },
  editBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E7E5E4', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#1C1917' },

  hero: { marginBottom: 20 },
  heroTitle: { fontSize: 26, fontWeight: '700', color: '#1C1917', letterSpacing: -0.5, marginBottom: 8 },
  heroDesc: { fontSize: 14, color: '#78716C', lineHeight: 20 },

  infoRow: { gap: 8, marginBottom: 24 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E7E5E4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  infoPillIcon: { fontSize: 15 },
  infoPillText: { fontSize: 13, color: '#1C1917', fontWeight: '500', flex: 1 },

  divider: { height: 1, backgroundColor: '#E7E5E4', marginBottom: 20 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1C1917' },
  addMemberBtn: { backgroundColor: '#1C1917', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  addMemberBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  addCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E7E5E4', gap: 10 },

  memberCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E7E5E4' },
  memberRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEEDFE', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#3C3489' },
  memberName: { fontSize: 14, fontWeight: '600', color: '#1C1917' },
  memberStudy: { fontSize: 12, color: '#78716C', marginTop: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: { backgroundColor: '#F1EFE8', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, color: '#57534E' },
  deleteBtn: { fontSize: 16, color: '#D1CEC9', padding: 4 },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#1C1917', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#A8A29E', textAlign: 'center', lineHeight: 18 },

  // Edit mode
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#1C1917', marginBottom: 24, letterSpacing: -0.3 },
  editSection: { gap: 4, marginBottom: 24 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#57534E', marginBottom: 6, marginTop: 10, letterSpacing: 0.3 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E7E5E4', borderRadius: 12, padding: 14, fontSize: 14, color: '#1C1917' },
  textArea: { height: 100, textAlignVertical: 'top' },
  primaryBtn: { backgroundColor: '#1C1917', borderRadius: 12, padding: 15, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})