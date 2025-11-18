import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Cont() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={48} color="#007AFF" />
        </View>
        <Text style={styles.title}>Contul Meu</Text>
        <Text style={styles.subtitle}>user@example.com</Text>
      </View>
      
      <View style={styles.content}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="person-outline" size={24} color="#007AFF" />
          <Text style={styles.menuText}>Profil</Text>
          <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="settings-outline" size={24} color="#007AFF" />
          <Text style={styles.menuText}>Setări</Text>
          <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="notifications-outline" size={24} color="#007AFF" />
          <Text style={styles.menuText}>Notificări</Text>
          <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="help-circle-outline" size={24} color="#007AFF" />
          <Text style={styles.menuText}>Ajutor</Text>
          <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, styles.logoutItem]}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          <Text style={[styles.menuText, styles.logoutText]}>Deconectare</Text>
          <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
        </TouchableOpacity>
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
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5F2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 4,
  },
  content: {
    padding: 20,
  },
  menuItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 16,
  },
  logoutItem: {
    marginTop: 20,
  },
  logoutText: {
    color: '#FF3B30',
  },
});
