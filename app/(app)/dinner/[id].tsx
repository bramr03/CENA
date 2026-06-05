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

type RequestWithMember = {
  id: string
  dinner_id: string
  member_id: string | null
  requester_id: string
  status: 'pending' | 'accepted' | 'rejected'
  profiles: { name: string } | null
  members: { name: string; study: string | null } | null
}

type Couple = {
  member: Member
  request: RequestWithMember
}

type Tab = 'leden' | 'verzoeken' | 'koppels'

export default function DinnerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const [dinner, setDinner] = useState<Dinner | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [requests, setRequests] = useState<RequestWithMember[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('leden')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
    const [{ data: dinnerData }, { data: membersData }, { data: requestsData }] = await Promise.all([
      supabase.from('dinners').select('*').eq('id', id).single(),
      supabase.from('members').select('*').eq('dinner_id', id),
      supabase.from('requests')
        .select('*, profiles(name), members(name, study)')
        .eq('dinner_id', id),
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
    setRequests(requestsData ?? [])
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
    // Check if this member has an accepted request (= is already matched)
    const matched = requests.find(r => r.member_id === memberId && r.status === 'accepted')
    if (matched) {
      Alert.alert('Niet mogelijk', 'Dit lid is al gekoppeld. Verwijder eerst de koppeling via het Verzoeken-tabblad.')
      return
    }
    Alert.alert('Verwijderen?', 'Weet je het zeker?', [
      { text: 'Annuleer', style: 'cancel' },
      {
        text: 'Verwijder', style: 'destructive', onPress: async () => {
          await supabase.from('members').delete().eq('id', memberId)
          setMembers(prev => prev.filter(m => m.id !== memberId))
        }
      }
    ])
  }

  async function acceptRequest(req: RequestWithMember) {
    // Reject all other pending requests for the same member
    const others = requests.filter(r => r.member_id === req.member_id && r.id !== req.id && r.status === 'pending')
    await Promise.all(others.map(r =>
      supabase.from('requests').update({ status: 'rejected' }).eq('id', r.id)
    ))

    // Accept this one + set matched_to on member
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('requests').update({ status: 'accepted' }).eq('id', req.id),
      supabase.from('members').update({ matched_to: req.requester_id }).eq('id', req.member_id!),
    ])

    if (e1 || e2) { Alert.alert('Er ging iets mis'); return }

    setRequests(prev => prev.map(r => {
      if (r.id === req.id) return { ...r, status: 'accepted' }
      if (r.member_id === req.member_id && r.status === 'pending') return { ...r, status: 'rejected' }
      return r
    }))
    setMembers(prev => prev.map(m =>
      m.id === req.member_id ? { ...m, matched_to: req.requester_id } : m
    ))
  }

  async function rejectRequest(req: RequestWithMember) {
    const { error } = await supabase.from('requests').update({ status: 'rejected' }).eq('id', req.id)
    if (error) { Alert.alert('Er ging iets mis'); return }
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r))
  }

  async function unmatch(req: RequestWithMember) {
    Alert.alert('Koppeling verwijderen?', 'De koppeling wordt ongedaan gemaakt.', [
      { text: 'Annuleer', style: 'cancel' },
      {
        text: 'Verwijder', style: 'destructive', onPress: async () => {
          await Promise.all([
            supabase.from('requests').update({ status: 'pending' }).eq('id', req.id),
            supabase.from('members').update({ matched_to: null }).eq('id', req.member_id!),
          ])
          setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'pending' } : r))
          setMembers(prev => prev.map(m =>
            m.id === req.member_id ? { ...m, matched_to: null } : m
          ))
        }
      }
    ])
  }


  async function deleteDinner() {
    setDeleting(true)
    const { data, error } = await supabase.from('dinners').delete().eq('id', id).select()
    setDeleting(false)
    if (error) { setConfirmDelete(false); Alert.alert('Fout', error.message); return }
    router.replace('/(app)')
  }
  function formatDate(dateStr: string | null) {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  function getInitials(name: string) {
    return (name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  // Derived data
  const couples: Couple[] = requests
    .filter(r => r.status === 'accepted' && r.member_id)
    .map(r => ({
      member: members.find(m => m.id === r.member_id)!,
      request: r,
    }))
    .filter(c => c.member)

  const matchedMemberIds = new Set(requests.filter(r => r.status === 'accepted').map(r => r.member_id))

  // Group requests by member_id for the verzoeken tab
  const requestsByMember = members.map(member => ({
    member,
    requests: requests.filter(r => r.member_id === member.id),
  })).filter(g => g.requests.length > 0)

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
          <TextInput style={[styles.input, styles.textArea]} value={editDescription} onChangeText={setEditDescription} placeholder="Een korte beschrijving..." placeholderTextColor="#FFC0CB" multiline numberOfLines={4} />
          <TouchableOpacity style={[styles.primaryBtn, saving && { opacity: 0.6 }]} onPress={saveDinner} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Opslaan</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerBtn} onPress={deleteDinner}>
            <Text style={styles.dangerBtnText}>🗑️ Diner verwijderen</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  // ── VIEW MODE ──
  return (
    <View style={styles.container}>
      {/* Fixed header */}
      <View style={styles.header}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Terug</Text>
          </TouchableOpacity>
          {isOwner && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                <Text style={styles.editBtnText}>✏️ Bewerken</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn2} onPress={() => setConfirmDelete(true)}>
                <Text style={styles.deleteBtnText2}>🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Confirm delete banner */}
        {confirmDelete && (
          <View style={styles.confirmDeleteCard}>
            <Text style={styles.confirmDeleteText}>Weet je zeker dat je dit diner wilt verwijderen?</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setConfirmDelete(false)}>
                <Text style={styles.confirmCancelText}>Annuleer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteBtn} onPress={deleteDinner} disabled={deleting}>
                {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmDeleteBtnText}>Ja, verwijder</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Hero */}
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
          <View style={styles.infoRow2}>
            <View style={styles.infoPillSmall}>
              <Text style={styles.infoPillSmallText}>👥 {members.length} leden</Text>
            </View>
            <View style={styles.infoPillSmall}>
              <Text style={styles.infoPillSmallText}>💌 {requests.filter(r => r.status === 'pending').length} open</Text>
            </View>
            <View style={styles.infoPillSmall}>
              <Text style={styles.infoPillSmallText}>💑 {couples.length} koppels</Text>
            </View>
          </View>
        </View>

        {/* Tabs — only show to owner */}
        {isOwner && (
          <View style={styles.tabBar}>
            {(['leden', 'verzoeken', 'koppels'] as Tab[]).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'leden' ? `Leden (${members.length})` : tab === 'verzoeken' ? `Verzoeken (${requests.filter(r => r.status === 'pending').length})` : `Koppels (${couples.length})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ── TAB: LEDEN ── */}
      {activeTab === 'leden' && (
        <FlatList
          contentContainerStyle={styles.tabContent}
          data={members}
          keyExtractor={m => m.id}
          ListHeaderComponent={
            isOwner ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Dispuutleden</Text>
                <TouchableOpacity style={styles.addMemberBtn} onPress={() => setShowAddMember(!showAddMember)}>
                  <Text style={styles.addMemberBtnText}>{showAddMember ? '✕ Sluiten' : '+ Toevoegen'}</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListFooterComponent={
            showAddMember ? (
              <View style={styles.addCard}>
                <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Naam *" placeholderTextColor="#FFC0CB" autoFocus />
                <TextInput style={styles.input} value={newStudy} onChangeText={setNewStudy} placeholder="Studie (optioneel)" placeholderTextColor="#FFC0CB" />
                <TextInput style={styles.input} value={newTags} onChangeText={setNewTags} placeholder="Interesses, komma-gescheiden" placeholderTextColor="#FFC0CB" />
                <TouchableOpacity style={[styles.primaryBtn, addingMember && { opacity: 0.6 }]} onPress={addMember} disabled={addingMember}>
                  {addingMember ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>+ Lid toevoegen</Text>}
                </TouchableOpacity>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const isMatched = matchedMemberIds.has(item.id)
            return (
              <View style={[styles.memberCard, isMatched && styles.memberCardMatched]}>
                <View style={styles.memberRow}>
                  <View style={[styles.avatar, isMatched && styles.avatarMatched]}>
                    <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.memberName}>{item.name}</Text>
                      {isMatched && (
                        <View style={styles.matchedBadge}>
                          <Text style={styles.matchedBadgeText}>💑 Gekoppeld</Text>
                        </View>
                      )}
                    </View>
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
                    <TouchableOpacity onPress={() => deleteMember(item.id)}>
                      <Text style={styles.deleteBtn}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )
          }}
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
      )}

      {/* ── TAB: VERZOEKEN ── */}
      {activeTab === 'verzoeken' && isOwner && (
        <FlatList
          contentContainerStyle={styles.tabContent}
          data={requestsByMember}
          keyExtractor={g => g.member.id}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💌</Text>
              <Text style={styles.emptyTitle}>Nog geen verzoeken</Text>
              <Text style={styles.emptyText}>Buitenstaanders kunnen zich aanmelden via de ontdekpagina.</Text>
            </View>
          }
          renderItem={({ item: group }) => {
            const isMatched = matchedMemberIds.has(group.member.id)
            return (
              <View style={styles.groupCard}>
                {/* Member header */}
                <View style={styles.groupMemberRow}>
                  <View style={[styles.avatar, isMatched && styles.avatarMatched]}>
                    <Text style={styles.avatarText}>{getInitials(group.member.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{group.member.name}</Text>
                    {group.member.study && <Text style={styles.memberStudy}>{group.member.study}</Text>}
                  </View>
                  {isMatched && (
                    <View style={styles.matchedBadge}>
                      <Text style={styles.matchedBadgeText}>✓ Gekoppeld</Text>
                    </View>
                  )}
                </View>

                {/* Requests for this member */}
                {group.requests.map(req => (
                  <View key={req.id} style={styles.reqRow}>
                    <View style={styles.reqAvatar}>
                      <Text style={styles.reqAvatarText}>{getInitials(req.profiles?.name ?? '?')}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reqName}>{req.profiles?.name ?? 'Onbekend'}</Text>
                      <View style={[
                        styles.statusBadge,
                        req.status === 'accepted' && styles.statusGreen,
                        req.status === 'rejected' && styles.statusRed,
                      ]}>
                        <Text style={styles.statusText}>
                          {req.status === 'accepted' ? '✓ Geaccepteerd' : req.status === 'rejected' ? '✕ Afgewezen' : '⏳ In behandeling'}
                        </Text>
                      </View>
                    </View>
                    {req.status === 'pending' && (
                      <View style={styles.actionBtns}>
                        <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptRequest(req)}>
                          <Text style={styles.acceptBtnText}>✓</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectRequest(req)}>
                          <Text style={styles.rejectBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {req.status === 'accepted' && (
                      <TouchableOpacity style={styles.unmatchBtn} onPress={() => unmatch(req)}>
                        <Text style={styles.unmatchBtnText}>Ontkoppel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )
          }}
        />
      )}

      {/* ── TAB: KOPPELS ── */}
      {activeTab === 'koppels' && isOwner && (
        <FlatList
          contentContainerStyle={styles.tabContent}
          data={couples}
          keyExtractor={c => c.request.id}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💑</Text>
              <Text style={styles.emptyTitle}>Nog geen koppels</Text>
              <Text style={styles.emptyText}>Accepteer verzoeken in het tabblad "Verzoeken" om koppels aan te maken.</Text>
            </View>
          }
          ListHeaderComponent={
            couples.length > 0 ? (
              <View style={styles.couplesHeader}>
                <Text style={styles.couplesHeaderText}>
                  {couples.length} van de {members.length} leden zijn gekoppeld
                </Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.round((couples.length / members.length) * 100)}%` as any }]} />
                </View>
              </View>
            ) : null
          }
          renderItem={({ item: couple, index }) => (
            <View style={styles.coupleCard}>
              <Text style={styles.coupleNumber}>#{index + 1}</Text>
              <View style={styles.coupleSide}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(couple.member.name)}</Text>
                </View>
                <Text style={styles.coupleName}>{couple.member.name}</Text>
                {couple.member.study && <Text style={styles.coupleStudy}>{couple.member.study}</Text>}
              </View>
              <Text style={styles.coupleHeart}>💑</Text>
              <View style={styles.coupleSide}>
                <View style={[styles.avatar, { backgroundColor: '#d1fae5' }]}>
                  <Text style={[styles.avatarText, { color: '#059669' }]}>{getInitials(couple.request.profiles?.name ?? '?')}</Text>
                </View>
                <Text style={styles.coupleName}>{couple.request.profiles?.name ?? 'Onbekend'}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF0F5' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },

  header: { backgroundColor: '#FFF0F5', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 0 },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backText: { fontSize: 14, color: '#c47a8a' },
  editBtn: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#FFB6C1', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#c47a8a' },

  heroCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1.5, borderColor: '#FFD1DC', overflow: 'hidden' },
  heroAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#FFB6C1' },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#2d1f24', letterSpacing: -0.4, marginTop: 4, marginBottom: 4 },
  heroDesc: { fontSize: 13, color: '#9e6b78', lineHeight: 19 },

  infoRow: { gap: 6, marginBottom: 12 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#FFD1DC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  infoPillIcon: { fontSize: 14 },
  infoPillText: { fontSize: 13, color: '#2d1f24', fontWeight: '500', flex: 1 },
  infoRow2: { flexDirection: 'row', gap: 8 },
  infoPillSmall: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#FFD1DC', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  infoPillSmallText: { fontSize: 12, color: '#9e6b78', fontWeight: '600' },

  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#FFD1DC', marginTop: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#FFB6C1' },
  tabText: { fontSize: 13, color: '#c47a8a', fontWeight: '500' },
  tabTextActive: { fontWeight: '700', color: '#2d1f24' },

  tabContent: { padding: 20, paddingBottom: 40 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#2d1f24' },
  addMemberBtn: { backgroundColor: '#FFB6C1', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  addMemberBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  addCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 8, borderWidth: 1, borderColor: '#FFD1DC', gap: 10 },

  memberCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#FFE4E1' },
  memberCardMatched: { borderColor: '#a7f3d0', backgroundColor: '#f0fdf4' },
  memberRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFD1DC', alignItems: 'center', justifyContent: 'center' },
  avatarMatched: { backgroundColor: '#a7f3d0' },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#c47a8a' },
  memberName: { fontSize: 14, fontWeight: '600', color: '#2d1f24' },
  memberStudy: { fontSize: 12, color: '#9e6b78', marginTop: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: { backgroundColor: '#FFF0F5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#FFD1DC' },
  tagText: { fontSize: 11, color: '#c47a8a' },
  deleteBtn: { fontSize: 16, color: '#FFC0CB', padding: 4 },
  matchedBadge: { backgroundColor: '#d1fae5', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  matchedBadgeText: { fontSize: 10, fontWeight: '700', color: '#059669' },

  // Verzoeken tab
  groupCard: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#FFE4E1', overflow: 'hidden' },
  groupMemberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#FFF8FA', borderBottomWidth: 1, borderBottomColor: '#FFE4E1' },

  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: '#FFF0F5' },
  reqAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
  reqAvatarText: { fontSize: 11, fontWeight: '700', color: '#4f46e5' },
  reqName: { fontSize: 13, fontWeight: '600', color: '#2d1f24', marginBottom: 3 },

  statusBadge: { alignSelf: 'flex-start', backgroundColor: '#FFE4E1', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusGreen: { backgroundColor: '#d1fae5' },
  statusRed: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 10, fontWeight: '700', color: '#9e6b78' },

  actionBtns: { flexDirection: 'row', gap: 6 },
  acceptBtn: { backgroundColor: '#d1fae5', borderRadius: 20, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  acceptBtnText: { fontSize: 14, color: '#059669', fontWeight: '700' },
  rejectBtn: { backgroundColor: '#fee2e2', borderRadius: 20, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  rejectBtnText: { fontSize: 14, color: '#ef4444', fontWeight: '700' },
  unmatchBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#fca5a5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  unmatchBtnText: { fontSize: 11, color: '#ef4444', fontWeight: '600' },

  // Koppels tab
  couplesHeader: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FFD1DC' },
  couplesHeaderText: { fontSize: 13, color: '#9e6b78', marginBottom: 10, textAlign: 'center' },
  progressBar: { height: 6, backgroundColor: '#FFE4E1', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#FFB6C1', borderRadius: 3 },

  coupleCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#FFE4E1', flexDirection: 'row', alignItems: 'center', gap: 8 },
  coupleNumber: { fontSize: 11, fontWeight: '700', color: '#FFC0CB', width: 24, textAlign: 'center' },
  coupleSide: { flex: 1, alignItems: 'center', gap: 6 },
  coupleHeart: { fontSize: 22 },
  coupleName: { fontSize: 13, fontWeight: '600', color: '#2d1f24', textAlign: 'center' },
  coupleStudy: { fontSize: 11, color: '#9e6b78', textAlign: 'center' },

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
  dangerBtn: { borderWidth: 1.5, borderColor: '#fca5a5', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  deleteBtn2: { backgroundColor: '#fee2e2', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, justifyContent: 'center' },
  confirmDeleteCard: { backgroundColor: '#fee2e2', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#fca5a5' },
  confirmDeleteText: { fontSize: 13, color: '#991b1b', fontWeight: '600' },
  confirmCancelBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5' },
  confirmCancelText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  confirmDeleteBtn: { flex: 1, backgroundColor: '#ef4444', borderRadius: 8, padding: 10, alignItems: 'center' },
  confirmDeleteBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  deleteBtnText2: { fontSize: 15 },
  dangerBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },
})