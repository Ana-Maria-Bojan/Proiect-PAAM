import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Favorite() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="heart" size={48} color="#FF3B30" />
        <Text style={styles.title}>Favorite</Text>
        <Text style={styles.subtitle}>Locurile tale preferate</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptyText}>
            Nu ai adăugat încă niciun favorit
          </Text>
          <Text style={styles.emptySubtext}>
            Explorează și salvează locurile tale preferate
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#fff',
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
});
