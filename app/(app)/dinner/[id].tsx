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

  const [editName, setEditName] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const [showAddMember, setShowAddMember] = useState(false)
  const [newName, setNewName] = useState('')
  const [newStudy, setNewStudy] = useState('')
  const [newTags, setNewTags] = useState('')
  const [addingMember, setAddingMember] = useState(false)

  useEffect(() => { fetchData() }, [id])

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

  async function saveDinner() {
    setSaving(true)
    const { data, error } = await supabase.from('dinners').update({
      name: editName.trim(),
      date: editDate || null,
      location: editLocation.trim() || null,
      description: editDescription.trim() || null,
    }).eq('id', id).select().single()
    if (error) Alert.alert('Error', error.message)
    else { setDinner(data); setEditing(false) }
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
    setNewName(''); setNewStudy(''); setNewTags('')
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

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#FFB6C1" />
  if (!dinner) return <Text style={{ flex: 1, textAlign: 'center', marginTop: 100 }}>Diner niet gevonden</Text>

  // ── EDIT MODE ──
  if (editing) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => setEditing(false)} style={styles.topBar}>
            <Text style={styles.backText}>✕ Annuleer</Text>
          </TouchableOpacity>

          <Text style={styles.pageTitle}>Diner bewerken</Text>

          <Text style={styles.fieldLabel}>Naam *</Text>
          <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Naam van het diner" placeholderTextColor="#FFC0CB" />

          <Text style={styles.fieldLabel}>Datum</Text>
          <TextInput style={styles.input} value={editDate} onChangeText={setEditDate} placeholder="JJJJ-MM-DD" placeholderTextColor="#FFC0CB" keyboardType="numeric" maxLength={10} />

          <Text style={styles.fieldLabel}>Locatie</Text>
          <TextInput style={styles.input} value={editLocation} onChangeText={setEditLocation} placeholder="bijv. Restaurant De Zwaan" placeholderTextColor="#FFC0CB" />

          <Text style={styles.fieldLabel}>Beschrijving</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={editDescription}
            onChangeText={setEditDescription}
            placeholder="Een korte beschrijving..."
            placeholderTextColor="#FFC0CB"
            multiline
            numberOfLines={4}
          />

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
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backText}>← Terug</Text>
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                <Text style={styles.editBtnText}>✏️ Bewerken</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Hero card */}
          <View style={styles.heroCard}>
            <View style={styles.heroAccent} />
            <Text style={styles.heroTitle}>{dinner.name}</Text>
            {dinner.description && <Text style={styles.heroDesc}>{dinner.description}</Text>}
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

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dispuutleden</Text>
            {isOwner && (
              <TouchableOpacity style={styles.addMemberBtn} onPress={() => setShowAddMember(!showAddMember)}>
                <Text style={styles.addMemberBtnText}>{showAddMember ? '✕' : '+ Toevoegen'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {showAddMember && (
            <View style={styles.addCard}>
              <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Naam *" placeholderTextColor="#FFC0CB" />
              <TextInput style={styles.input} value={newStudy} onChangeText={setNewStudy} placeholder="Studie (optioneel)" placeholderTextColor="#FFC0CB" />
              <TextInput style={styles.input} value={newTags} onChangeText={setNewTags} placeholder="Interesses, komma-gescheiden" placeholderTextColor="#FFC0CB" />
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
  container: { flex: 1, backgroundColor: '#FFF0F5' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backText: { fontSize: 14, color: '#c47a8a' },

  editBtn: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#FFB6C1', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#c47a8a' },

  heroCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1.5, borderColor: '#FFD1DC', overflow: 'hidden' },
  heroAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#FFB6C1' },
  heroTitle: { fontSize: 24, fontWeight: '700', color: '#2d1f24', letterSpacing: -0.4, marginBottom: 8, marginTop: 4 },
  heroDesc: { fontSize: 14, color: '#9e6b78', lineHeight: 20 },

  infoRow: { gap: 8, marginBottom: 24 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#FFD1DC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  infoPillIcon: { fontSize: 15 },
  infoPillText: { fontSize: 13, color: '#2d1f24', fontWeight: '500', flex: 1 },

  divider: { height: 1, backgroundColor: '#FFD1DC', marginBottom: 20 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#2d1f24' },
  addMemberBtn: { backgroundColor: '#FFB6C1', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  addMemberBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  addCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FFD1DC', gap: 10 },

  memberCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#FFE4E1' },
  memberRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFD1DC', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#c47a8a' },
  memberName: { fontSize: 14, fontWeight: '600', color: '#2d1f24' },
  memberStudy: { fontSize: 12, color: '#9e6b78', marginTop: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: { backgroundColor: '#FFF0F5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#FFD1DC' },
  tagText: { fontSize: 11, color: '#c47a8a' },
  deleteBtn: { fontSize: 16, color: '#FFC0CB', padding: 4 },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#2d1f24', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#c47a8a', textAlign: 'center', lineHeight: 18 },

  pageTitle: { fontSize: 24, fontWeight: '700', color: '#2d1f24', marginBottom: 20, letterSpacing: -0.3 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#9e6b78', marginBottom: 6, marginTop: 12, letterSpacing: 0.3 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#FFD1DC', borderRadius: 12, padding: 14, fontSize: 14, color: '#2d1f24' },
  textArea: { height: 100, textAlignVertical: 'top' },
  primaryBtn: { backgroundColor: '#FFB6C1', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})