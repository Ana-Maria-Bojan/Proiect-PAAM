import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Publica() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="add-circle" size={48} color="#007AFF" />
        <Text style={styles.title}>Publică</Text>
        <Text style={styles.subtitle}>Adaugă o nouă locație sau eveniment</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>Titlu</Text>
          <TextInput 
            style={styles.input}
            placeholder="Introdu titlul..."
            placeholderTextColor="#C7C7CC"
          />
          
          <Text style={styles.label}>Descriere</Text>
          <TextInput 
            style={[styles.input, styles.textArea]}
            placeholder="Adaugă o descriere..."
            placeholderTextColor="#C7C7CC"
            multiline
            numberOfLines={4}
          />
          
          <TouchableOpacity style={styles.button}>
            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Publică</Text>
          </TouchableOpacity>
        </View>
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
    padding: 20,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
