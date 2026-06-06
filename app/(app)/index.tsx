import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase, Dinner } from '../../lib/supabase'

export default function Home() {
  const [myDinners, setMyDinners] = useState<Dinner[]>([])
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: dinners }, { data: requests }] = await Promise.all([
      supabase.from('dinners').select('*').eq('org_id', user.id),
      supabase.from('requests').select('*, dinners(name, date)').eq('requester_id', user.id),
    ])

    setMyDinners(dinners ?? [])
    setMyRequests(requests ?? [])
    setLoading(false)
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#FFB6C1" />

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>Welkom terug</Text>
          <Text style={styles.header}>DateDiner 🌸</Text>
        </View>
      </View>

      {/* My dinners */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Jouw diners</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/(app)/create')}>
            <Text style={styles.addButtonText}>+ Nieuw</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={myDinners}
          scrollEnabled={false}
          keyExtractor={d => d.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.dinnerCard} onPress={() => router.push(`/(app)/dinner/${item.id}`)}>
              <View style={styles.dinnerCardAccent} />
              <View style={styles.dinnerCardBody}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSub}>{item.date ? new Date(item.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Datum nog niet ingesteld'}</Text>
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <TouchableOpacity style={styles.emptyCard} onPress={() => router.push('/(app)/create')}>
              <Text style={styles.emptyCardIcon}>🍽️</Text>
              <Text style={styles.emptyCardText}>Maak je eerste diner aan</Text>
            </TouchableOpacity>
          }
        />
      </View>

      {/* My requests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mijn verzoeken</Text>
        <FlatList
          data={myRequests}
          scrollEnabled={false}
          keyExtractor={r => r.id}
          renderItem={({ item }) => (
            <View style={styles.requestCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.dinners?.name}</Text>
                {item.dinners?.date && <Text style={styles.cardSub}>{new Date(item.dinners.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}</Text>}
              </View>
              <View style={[
                styles.statusBadge,
                item.status === 'accepted' && styles.statusGreen,
                item.status === 'rejected' && styles.statusRed,
              ]}>
                <Text style={styles.statusText}>
                  {item.status === 'accepted' ? 'Geaccepteerd' : item.status === 'rejected' ? 'Afgewezen' : 'In behandeling'}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nog geen verzoeken ingediend</Text>}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF0F5', padding: 20, paddingTop: 60 },

  headerRow: { marginBottom: 28 },
  eyebrow: { fontSize: 12, color: '#c47a8a', fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  header: { fontSize: 28, fontWeight: '700', color: '#2d1f24', letterSpacing: -0.5 },

  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2d1f24', marginBottom: 10 },

  addButton: { backgroundColor: '#FFB6C1', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  dinnerCard: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: '#FFE4E1', flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  dinnerCardAccent: { width: 4, backgroundColor: '#FFB6C1', alignSelf: 'stretch' },
  dinnerCardBody: { flex: 1, padding: 14 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#2d1f24' },
  cardSub: { fontSize: 12, color: '#9e6b78', marginTop: 2 },
  cardArrow: { fontSize: 20, color: '#FFC0CB', paddingRight: 14 },

  emptyCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#FFD1DC', borderStyle: 'dashed', padding: 20, alignItems: 'center', gap: 6 },
  emptyCardIcon: { fontSize: 28 },
  emptyCardText: { fontSize: 13, color: '#c47a8a', fontWeight: '600' },

  requestCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#FFE4E1', flexDirection: 'row', alignItems: 'center', gap: 12 },

  statusBadge: { backgroundColor: '#FFE4E1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusGreen: { backgroundColor: '#d1fae5' },
  statusRed: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 11, color: '#9e6b78', fontWeight: '700' },

  empty: { color: '#c47a8a', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
})