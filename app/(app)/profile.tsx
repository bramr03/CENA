import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { supabase } from '../../lib/supabase'
export default function Profile() {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.buttonText}>Uitloggen</Text>
      </TouchableOpacity>
    </View>
  )
}
const styles = StyleSheet.create({
  container: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#F7F4EF' },
  button: { backgroundColor:'#1C1917', padding:14, borderRadius:10 },
  buttonText: { color:'#fff', fontWeight:'600' },
})