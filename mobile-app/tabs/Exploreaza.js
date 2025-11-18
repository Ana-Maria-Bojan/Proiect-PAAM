import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Exploreaza() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="compass" size={48} color="#007AFF" />
        <Text style={styles.title}>Explorează</Text>
        <Text style={styles.subtitle}>Descoperă locuri noi și interesante</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.description}>
          Aici vei putea explora diferite locuri, evenimente și activități din zona ta.
        </Text>
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
    padding: 20,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    textAlign: 'center',
  },
});
