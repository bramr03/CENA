import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase, Dinner } from '../../lib/supabase'

export default function Home() {
  const [myDinners, setMyDinners] = useState<Dinner[]>([])
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

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

  function createDinner() {
    router.push('/(app)/create')
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />

  return (
    <View style={styles.container}>
      <Text style={styles.header}>DateDiner</Text>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mijn diners</Text>
          <TouchableOpacity style={styles.addButton} onPress={createDinner}>
            <Text style={styles.addButtonText}>+ Nieuw</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={myDinners}
          scrollEnabled={false}
          keyExtractor={d => d.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/dinner/${item.id}`)}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSub}>{item.date ?? 'Datum nog niet ingesteld'}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nog geen diners aangemaakt</Text>}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mijn verzoeken</Text>
        <FlatList
          data={myRequests}
          scrollEnabled={false}
          keyExtractor={r => r.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.dinners?.name}</Text>
              <View style={[styles.statusBadge,
                item.status === 'accepted' && styles.statusGreen,
                item.status === 'rejected' && styles.statusRed,
              ]}>
                <Text style={styles.statusText}>{item.status}</Text>
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
  container: { flex: 1, backgroundColor: '#F7F4EF', padding: 16, paddingTop: 60 },
  header: { fontSize: 28, fontWeight: '600', marginBottom: 24 },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1C1917', marginBottom: 10 },
  addButton: { backgroundColor: '#1C1917', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E7E5E4' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1C1917' },
  cardSub: { fontSize: 12, color: '#57534E', marginTop: 2 },
  statusBadge: { marginTop: 6, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, alignSelf: 'flex-start' },
  statusGreen: { backgroundColor: '#CCFBF1' },
  statusRed: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 11, color: '#57534E', fontWeight: '600' },
  empty: { color: '#A8A29E', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
})