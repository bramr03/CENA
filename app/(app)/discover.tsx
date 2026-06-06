import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Alert
} from 'react-native'
import { supabase } from '../../lib/supabase'

type Dinner = {
  id: string
  name: string
  date: string | null
  location: string | null
  description: string | null
  org_id: string
}

type Member = {
  id: string
  name: string
  study: string | null
  tags: string[]
  matched_to: string | null
}

type MyRequest = {
  id: string
  dinner_id: string
  member_id: string | null
  status: 'pending' | 'accepted' | 'rejected'
}

type View_ = 'list' | 'detail'

export default function Discover() {
  const [dinners, setDinners] = useState<Dinner[]>([])
  const [myRequests, setMyRequests] = useState<MyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const [view, setView] = useState<View_>('list')
  const [selectedDinner, setSelectedDinner] = useState<Dinner | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [submitting, setSubmitting] = useState<string | null>(null) // member_id being submitted

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const [{ data: dinnersData }, { data: requestsData }] = await Promise.all([
      supabase.from('dinners').select('*').neq('org_id', user.id),
      supabase.from('requests').select('id, dinner_id, member_id, status').eq('requester_id', user.id),
    ])

    setDinners(dinnersData ?? [])
    setMyRequests(requestsData ?? [])
    setLoading(false)
  }

  async function openDinner(dinner: Dinner) {
    setSelectedDinner(dinner)
    setView('detail')
    setLoadingMembers(true)
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('dinner_id', dinner.id)
    setMembers(data ?? [])
    setLoadingMembers(false)
  }

  async function submitRequest(member: Member) {
    if (!selectedDinner || !userId) return
    setSubmitting(member.id)

    const { error } = await supabase.from('requests').insert({
      dinner_id: selectedDinner.id,
      member_id: member.id,
      requester_id: userId,
      status: 'pending',
    })

    if (error) {
      Alert.alert('Er ging iets mis', error.message)
    } else {
      setMyRequests(prev => [...prev, {
        id: Math.random().toString(),
        dinner_id: selectedDinner.id,
        member_id: member.id,
        status: 'pending',
      }])
    }
    setSubmitting(null)
  }

  async function cancelRequest(member: Member) {
    if (!selectedDinner) return
    const req = myRequests.find(r => r.dinner_id === selectedDinner.id && r.member_id === member.id)
    if (!req) return

    setSubmitting(member.id)
    await supabase.from('requests').delete().eq('id', req.id)
    setMyRequests(prev => prev.filter(r => r.id !== req.id))
    setSubmitting(null)
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  function getInitials(name: string) {
    return (name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  function getRequestForMember(memberId: string) {
    if (!selectedDinner) return null
    return myRequests.find(r => r.dinner_id === selectedDinner.id && r.member_id === memberId) ?? null
  }

  function getMyRequestForDinner(dinnerId: string) {
    return myRequests.find(r => r.dinner_id === dinnerId) ?? null
  }

  function availableCount(dinnerId: string) {
    // We don't have members for all dinners loaded, so just show request count
    return null
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#FFB6C1" />

  // ── DETAIL VIEW ──
  if (view === 'detail' && selectedDinner) {
    const availableMembers = members.filter(m => !m.matched_to)
    const matchedMembers = members.filter(m => m.matched_to)
    const myRequestForThisDinner = myRequests.find(r => r.dinner_id === selectedDinner.id)

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setView('list'); setSelectedDinner(null); setMembers([]) }}>
            <Text style={styles.backText}>← Terug</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroAccent} />
            <Text style={styles.heroTitle}>{selectedDinner.name}</Text>
            {selectedDinner.description && <Text style={styles.heroDesc}>{selectedDinner.description}</Text>}
          </View>

          {/* Info pills */}
          <View style={styles.infoRow}>
            {selectedDinner.date && (
              <View style={styles.infoPill}>
                <Text style={styles.infoPillIcon}>📅</Text>
                <Text style={styles.infoPillText}>{formatDate(selectedDinner.date)}</Text>
              </View>
            )}
            {selectedDinner.location && (
              <View style={styles.infoPill}>
                <Text style={styles.infoPillIcon}>📍</Text>
                <Text style={styles.infoPillText}>{selectedDinner.location}</Text>
              </View>
            )}
          </View>

          {/* Status banner als je al een verzoek hebt */}
          {myRequestForThisDinner && (
            <View style={[
              styles.statusBanner,
              myRequestForThisDinner.status === 'accepted' && styles.statusBannerGreen,
              myRequestForThisDinner.status === 'rejected' && styles.statusBannerRed,
            ]}>
              <Text style={styles.statusBannerText}>
                {myRequestForThisDinner.status === 'accepted'
                  ? '🎉 Je verzoek is geaccepteerd!'
                  : myRequestForThisDinner.status === 'rejected'
                  ? '😔 Je verzoek is afgewezen.'
                  : '⏳ Je hebt al een verzoek ingediend voor dit diner.'}
              </Text>
            </View>
          )}

          {loadingMembers ? (
            <ActivityIndicator color="#FFB6C1" style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Beschikbare leden */}
              <Text style={styles.sectionTitle}>
                Beschikbare leden ({availableMembers.length})
              </Text>

              {availableMembers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>💑</Text>
                  <Text style={styles.emptyTitle}>Alle leden zijn al gekoppeld</Text>
                  <Text style={styles.emptyText}>Er zijn geen beschikbare leden meer voor dit diner.</Text>
                </View>
              ) : (
                availableMembers.map(member => {
                  const req = getRequestForMember(member.id)
                  const isSubmitting = submitting === member.id

                  return (
                    <View key={member.id} style={styles.memberCard}>
                      <View style={styles.memberRow}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{getInitials(member.name)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.memberName}>{member.name}</Text>
                          {member.study && <Text style={styles.memberStudy}>{member.study}</Text>}
                          {member.tags?.length > 0 && (
                            <View style={styles.tagRow}>
                              {member.tags.map((tag: string) => (
                                <View key={tag} style={styles.tag}>
                                  <Text style={styles.tagText}>{tag}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Request button */}
                      {!req ? (
                        <TouchableOpacity
                          style={[styles.applyBtn, (isSubmitting || !!myRequestForThisDinner) && { opacity: 0.5 }]}
                          onPress={() => submitRequest(member)}
                          disabled={isSubmitting || !!myRequestForThisDinner}
                        >
                          {isSubmitting
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={styles.applyBtnText}>
                                {myRequestForThisDinner ? 'Al aangemeld' : '💌 Aanmelden'}
                              </Text>
                          }
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.requestedRow}>
                          <View style={[
                            styles.reqBadge,
                            req.status === 'accepted' && styles.reqBadgeGreen,
                            req.status === 'rejected' && styles.reqBadgeRed,
                          ]}>
                            <Text style={styles.reqBadgeText}>
                              {req.status === 'accepted' ? '✓ Geaccepteerd' : req.status === 'rejected' ? '✕ Afgewezen' : '⏳ In behandeling'}
                            </Text>
                          </View>
                          {req.status === 'pending' && (
                            <TouchableOpacity onPress={() => cancelRequest(member)} disabled={isSubmitting}>
                              <Text style={styles.cancelText}>Annuleer</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  )
                })
              )}

              {/* Al gekoppelde leden (grijs) */}
              {matchedMembers.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                    Al gekoppeld ({matchedMembers.length})
                  </Text>
                  {matchedMembers.map(member => (
                    <View key={member.id} style={[styles.memberCard, styles.memberCardGrey]}>
                      <View style={styles.memberRow}>
                        <View style={[styles.avatar, styles.avatarGrey]}>
                          <Text style={[styles.avatarText, { color: '#aaa' }]}>{getInitials(member.name)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.memberName, { color: '#aaa' }]}>{member.name}</Text>
                          {member.study && <Text style={[styles.memberStudy, { color: '#bbb' }]}>{member.study}</Text>}
                        </View>
                        <View style={styles.matchedBadge}>
                          <Text style={styles.matchedBadgeText}>💑 Gekoppeld</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
    )
  }

  // ── LIST VIEW ──
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Diners ontdekken</Text>
        <Text style={styles.pageTitle}>Vind jouw date 🌸</Text>
      </View>

      <FlatList
        contentContainerStyle={styles.content}
        data={dinners}
        keyExtractor={d => d.id}
        renderItem={({ item }) => {
          const myReq = getMyRequestForDinner(item.id)
          return (
            <TouchableOpacity style={styles.dinnerCard} onPress={() => openDinner(item)} activeOpacity={0.8}>
              <View style={styles.dinnerCardAccent} />
              <View style={styles.dinnerCardBody}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.date && <Text style={styles.cardSub}>📅 {formatDate(item.date)}</Text>}
                {item.location && <Text style={styles.cardSub}>📍 {item.location}</Text>}
                {myReq && (
                  <View style={[
                    styles.reqBadge,
                    myReq.status === 'accepted' && styles.reqBadgeGreen,
                    myReq.status === 'rejected' && styles.reqBadgeRed,
                    { marginTop: 8, alignSelf: 'flex-start' }
                  ]}>
                    <Text style={styles.reqBadgeText}>
                      {myReq.status === 'accepted' ? '✓ Geaccepteerd' : myReq.status === 'rejected' ? '✕ Afgewezen' : '⏳ Verzoek ingediend'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyTitle}>Geen diners gevonden</Text>
            <Text style={styles.emptyText}>Er zijn momenteel geen diners beschikbaar om je voor aan te melden.</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF0F5' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: '#FFF0F5' },
  content: { padding: 20, paddingBottom: 40 },

  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: '#FFC0CB', textTransform: 'uppercase', marginBottom: 4 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: '#2d1f24', letterSpacing: -0.5 },
  backText: { fontSize: 14, color: '#c47a8a', marginBottom: 8 },

  dinnerCard: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#FFE4E1', flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  dinnerCardAccent: { width: 4, backgroundColor: '#FFB6C1', alignSelf: 'stretch' },
  dinnerCardBody: { flex: 1, padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#2d1f24', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#9e6b78', marginTop: 2 },
  cardArrow: { fontSize: 20, color: '#FFC0CB', paddingRight: 14 },

  heroCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1.5, borderColor: '#FFD1DC', overflow: 'hidden' },
  heroAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#FFB6C1' },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#2d1f24', letterSpacing: -0.4, marginTop: 4, marginBottom: 4 },
  heroDesc: { fontSize: 13, color: '#9e6b78', lineHeight: 19 },

  infoRow: { gap: 6, marginBottom: 16 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#FFD1DC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  infoPillIcon: { fontSize: 14 },
  infoPillText: { fontSize: 13, color: '#2d1f24', fontWeight: '500', flex: 1 },

  statusBanner: { backgroundColor: '#FFF0F5', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FFD1DC' },
  statusBannerGreen: { backgroundColor: '#d1fae5', borderColor: '#a7f3d0' },
  statusBannerRed: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  statusBannerText: { fontSize: 13, color: '#2d1f24', fontWeight: '600' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2d1f24', marginBottom: 12 },

  memberCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#FFE4E1' },
  memberCardGrey: { backgroundColor: '#fafafa', borderColor: '#eee' },
  memberRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFD1DC', alignItems: 'center', justifyContent: 'center' },
  avatarGrey: { backgroundColor: '#eee' },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#c47a8a' },
  memberName: { fontSize: 14, fontWeight: '600', color: '#2d1f24' },
  memberStudy: { fontSize: 12, color: '#9e6b78', marginTop: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: { backgroundColor: '#FFF0F5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#FFD1DC' },
  tagText: { fontSize: 11, color: '#c47a8a' },

  applyBtn: { backgroundColor: '#FFB6C1', borderRadius: 10, padding: 12, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  requestedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reqBadge: { backgroundColor: '#FFE4E1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  reqBadgeGreen: { backgroundColor: '#d1fae5' },
  reqBadgeRed: { backgroundColor: '#fee2e2' },
  reqBadgeText: { fontSize: 11, fontWeight: '700', color: '#9e6b78' },
  cancelText: { fontSize: 12, color: '#c47a8a', fontWeight: '600', textDecorationLine: 'underline' },

  matchedBadge: { backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  matchedBadgeText: { fontSize: 10, fontWeight: '600', color: '#aaa' },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#2d1f24', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#c47a8a', textAlign: 'center', lineHeight: 18, paddingHorizontal: 20 },
})