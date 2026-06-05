import { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native'
import { supabase } from '../../lib/supabase'

export default function Profile() {
  const [profile, setProfile] = useState<any>(null)
  const [myDinners, setMyDinners] = useState<any[]>([])
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editInterests, setEditInterests] = useState('')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: profileData }, { data: dinners }, { data: requests }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('dinners').select('id, name, date, location').eq('org_id', user.id),
      supabase.from('requests').select('id, status, dinners(name, date)').eq('requester_id', user.id),
    ])

    if (profileData) {
      setProfile(profileData)
      setEditName(profileData.name ?? '')
      setEditBio(profileData.bio ?? '')
      setEditInterests(profileData.interests ?? '')
    }

    setMyDinners(dinners ?? [])
    setMyRequests(requests ?? [])
    setLoading(false)
  }

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    const { data, error } = await supabase.from('profiles').update({
      name: editName.trim(),
      bio: editBio.trim() || null,
      interests: editInterests.trim() || null,
    }).eq('id', profile.id).select().single()

    if (error) Alert.alert('Error', error.message)
    else { setProfile(data); setEditing(false) }
    setSaving(false)
  }

  async function handleSignOut() {
    Alert.alert('Uitloggen', 'Weet je zeker dat je wilt uitloggen?', [
      { text: 'Annuleer', style: 'cancel' },
      { text: 'Uitloggen', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  async function handleDeleteAccount() {
    Alert.alert('Account verwijderen', 'Dit kan niet ongedaan worden gemaakt.', [
      { text: 'Annuleer', style: 'cancel' },
      { text: 'Verwijderen', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'Datum onbekend'
    return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  function getInitials(name: string) {
    return (name ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  }

  function statusLabel(status: string) {
    if (status === 'accepted') return 'Geaccepteerd'
    if (status === 'rejected') return 'Afgewezen'
    return 'In behandeling'
  }

  function getDinnerFromRequest(req: any) {
    if (!req.dinners) return null
    return Array.isArray(req.dinners) ? req.dinners[0] : req.dinners
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#FFB6C1" />

  // ── EDIT MODE ──
  if (editing) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => setEditing(false)} style={styles.topBar}>
            <Text style={styles.backText}>✕ Annuleer</Text>
          </TouchableOpacity>

          <Text style={styles.pageTitle}>Profiel bewerken</Text>

          <Text style={styles.fieldLabel}>Naam</Text>
          <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Jouw naam" placeholderTextColor="#FFC0CB" />

          <Text style={styles.fieldLabel}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={editBio}
            onChangeText={setEditBio}
            placeholder="Vertel iets over jezelf..."
            placeholderTextColor="#FFC0CB"
            multiline
            numberOfLines={4}
          />

          <Text style={styles.fieldLabel}>Interesses</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={editInterests}
            onChangeText={setEditInterests}
            placeholder="bijv. hardlopen, koken, jazz, reizen..."
            placeholderTextColor="#FFC0CB"
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity style={[styles.primaryBtn, saving && { opacity: 0.6 }]} onPress={saveProfile} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Opslaan</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  // ── VIEW MODE ──
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(profile?.name ?? '')}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{profile?.name ?? 'Onbekend'}</Text>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
          <Text style={styles.editBtnText}>✏️ Bewerken</Text>
        </TouchableOpacity>
      </View>

      {profile?.bio ? (
        <View style={styles.bioCard}>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.emptyBioCard} onPress={() => setEditing(true)}>
          <Text style={styles.emptyBioText}>+ Voeg een bio toe</Text>
        </TouchableOpacity>
      )}

      {!!profile?.interests && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interesses</Text>
          <View style={styles.tagRow}>
            {profile.interests.split(',').map((i: string) => i.trim()).filter(Boolean).map((interest: string) => (
              <View key={interest} style={styles.tag}>
                <Text style={styles.tagText}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mijn diners</Text>
        {myDinners.length === 0
          ? <Text style={styles.emptyText}>Je hebt nog geen diners georganiseerd.</Text>
          : myDinners.map(dinner => (
            <View key={dinner.id} style={styles.dinnerCard}>
              <View style={styles.dinnerCardAccent} />
              <View style={styles.dinnerCardBody}>
                <Text style={styles.cardTitle}>{dinner.name}</Text>
                <Text style={styles.cardSub}>{formatDate(dinner.date)}{dinner.location ? ` · ${dinner.location}` : ''}</Text>
              </View>
            </View>
          ))
        }
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mijn verzoeken</Text>
        {myRequests.length === 0
          ? <Text style={styles.emptyText}>Je hebt je nog niet aangemeld voor een diner.</Text>
          : myRequests.map(req => {
            const dinner = getDinnerFromRequest(req)
            return (
              <View key={req.id} style={styles.requestCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{dinner?.name ?? 'Onbekend diner'}</Text>
                  <Text style={styles.cardSub}>{formatDate(dinner?.date ?? null)}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  req.status === 'accepted' && styles.statusGreen,
                  req.status === 'rejected' && styles.statusRed,
                ]}>
                  <Text style={styles.statusText}>{statusLabel(req.status)}</Text>
                </View>
              </View>
            )
          })
        }
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.outlineBtn} onPress={handleSignOut}>
          <Text style={styles.outlineBtnText}>Uitloggen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteAccount}>
          <Text style={styles.dangerBtnText}>Account verwijderen</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF0F5' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },

  topBar: { marginBottom: 20 },
  backText: { fontSize: 14, color: '#c47a8a' },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#2d1f24', marginBottom: 20, letterSpacing: -0.3 },

  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFD1DC', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#c47a8a' },
  profileName: { fontSize: 20, fontWeight: '700', color: '#2d1f24', letterSpacing: -0.3 },

  editBtn: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#FFB6C1', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#c47a8a' },

  bioCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#FFE4E1', marginBottom: 16 },
  bioText: { fontSize: 14, color: '#2d1f24', lineHeight: 22 },
  emptyBioCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: '#FFD1DC', borderStyle: 'dashed', marginBottom: 16, alignItems: 'center' },
  emptyBioText: { fontSize: 13, color: '#c47a8a', fontWeight: '600' },

  section: { marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2d1f24', marginBottom: 12 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  tag: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#FFD1DC' },
  tagText: { fontSize: 13, color: '#c47a8a', fontWeight: '500' },

  divider: { height: 1, backgroundColor: '#FFE4E1', marginVertical: 20 },

  dinnerCard: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: '#FFE4E1', flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  dinnerCardAccent: { width: 4, backgroundColor: '#FFB6C1', alignSelf: 'stretch' },
  dinnerCardBody: { flex: 1, padding: 14 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#2d1f24' },
  cardSub: { fontSize: 12, color: '#9e6b78', marginTop: 2 },

  requestCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#FFE4E1', flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusBadge: { backgroundColor: '#FFE4E1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusGreen: { backgroundColor: '#d1fae5' },
  statusRed: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 11, color: '#9e6b78', fontWeight: '700' },

  emptyText: { fontSize: 13, color: '#c47a8a', fontStyle: 'italic' },

  outlineBtn: { borderWidth: 1.5, borderColor: '#FFB6C1', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  outlineBtnText: { color: '#c47a8a', fontSize: 14, fontWeight: '700' },
  dangerBtn: { borderWidth: 1.5, borderColor: '#fca5a5', borderRadius: 12, padding: 14, alignItems: 'center' },
  dangerBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#9e6b78', marginBottom: 6, marginTop: 14, letterSpacing: 0.3 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#FFD1DC', borderRadius: 12, padding: 14, fontSize: 14, color: '#2d1f24' },
  textArea: { height: 100, textAlignVertical: 'top' },
  primaryBtn: { backgroundColor: '#FFB6C1', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 20 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})