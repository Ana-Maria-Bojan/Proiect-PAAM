import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Harta() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="map" size={48} color="#007AFF" />
        <Text style={styles.title}>Hartă</Text>
        <Text style={styles.subtitle}>Vizualizează locațiile pe hartă</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.description}>
          Aici va fi afișată harta interactivă cu toate locațiile disponibile.
        </Text>
      </View>
    </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    textAlign: 'center',
  },
});
