import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_URL } from '../config';

export default function Cont() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState('welcome'); // 'welcome', 'login', 'register'
  const [userData, setUserData] = useState(null);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Eroare', 'Te rog completează toate câmpurile');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Eroare la autentificare');
      }

      setUserData(data.user);
      setIsLoggedIn(true);
    } catch (error) {
      Alert.alert('Eroare', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Eroare', 'Te rog completează toate câmpurile');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Eroare la înregistrare');
      }

      setUserData(data.user);
      setIsLoggedIn(true);
    } catch (error) {
      Alert.alert('Eroare', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserData(null);
    setView('welcome');
    setEmail('');
    setPassword('');
    setName('');
  };

  if (!isLoggedIn) {
    if (view === 'welcome') {
      return (
        <LinearGradient
          colors={['#c471ed', '#12c2e9']}
          style={styles.gradientContainer}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.welcomeCard}>
              <View style={styles.guestIconContainer}>
                 <Ionicons name="person-circle-outline" size={100} color="#c471ed" />
              </View>
              <Text style={styles.guestTitle}>Bine ai venit!</Text>
              <Text style={styles.guestSubtitle}>
                Conectează-te pentru a-ți salva evenimentele favorite și a primi notificări personalizate.
              </Text>
              
              <TouchableOpacity style={styles.welcomeButton} onPress={() => setView('login')}>
                <Text style={styles.welcomeButtonText}>Autentificare</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.welcomeButtonOutline} onPress={() => setView('register')}>
                <Text style={styles.welcomeButtonOutlineText}>Creează cont nou</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      );
    }

    return (
      <LinearGradient
        colors={['#c471ed', '#12c2e9']}
        style={styles.gradientContainer}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.cardContainer}>
            <TouchableOpacity onPress={() => setView('welcome')} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#999" />
            </TouchableOpacity>

            <Text style={styles.cardTitle}>{view === 'login' ? 'LOGIN' : 'REGISTER'}</Text>

            {view === 'register' && (
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nume complet"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  placeholderTextColor="#999"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#999"
              />
            </View>

            {view === 'login' && (
              <TouchableOpacity 
                style={styles.checkboxContainer} 
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Remember me</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={view === 'login' ? handleLogin : handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>
                  {view === 'login' ? 'LOGIN' : 'REGISTER'}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.orText}>Or login with</Text>

            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity style={styles.socialButton}>
                <FontAwesome name="facebook" size={20} color="#3b5998" />
                <Text style={[styles.socialButtonText, { color: '#3b5998' }]}>Facebook</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <FontAwesome name="google" size={20} color="#DB4437" />
                <Text style={[styles.socialButtonText, { color: '#DB4437' }]}>Google</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>
                {view === 'login' ? "Not a member? " : "Already a member? "}
              </Text>
              <TouchableOpacity onPress={() => setView(view === 'login' ? 'register' : 'login')}>
                <Text style={styles.footerLink}>
                  {view === 'login' ? "Sign up now" : "Login now"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={48} color="#007AFF" />
        </View>
        <Text style={styles.title}>{userData?.name || 'Utilizator'}</Text>
        <Text style={styles.subtitle}>{userData?.email || 'email@example.com'}</Text>
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

        <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
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
  gradientContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Welcome Card Styles
  welcomeCard: {
    backgroundColor: '#fff',
    width: '85%',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  guestIconContainer: {
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  guestSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  welcomeButton: {
    backgroundColor: '#c471ed',
    width: '100%',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 15,
  },
  welcomeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  welcomeButtonOutline: {
    borderWidth: 2,
    borderColor: '#c471ed',
    width: '100%',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
  },
  welcomeButtonOutlineText: {
    color: '#c471ed',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  // Login/Register Card Styles
  cardContainer: {
    backgroundColor: '#fff',
    width: '85%',
    borderRadius: 10,
    padding: 30,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#333',
    marginBottom: 30,
    letterSpacing: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 50,
    width: '100%',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#333',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: '#e91e63',
    borderRadius: 3,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#e91e63',
  },
  checkboxLabel: {
    color: '#666',
    fontSize: 14,
  },
  actionButton: {
    backgroundColor: '#e91e63', // Pink color from image
    width: '100%',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: "#e91e63",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  orText: {
    color: '#999',
    marginBottom: 20,
    fontSize: 12,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 5,
    padding: 10,
    width: '48%',
  },
  socialButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  footerContainer: {
    flexDirection: 'row',
  },
  footerText: {
    color: '#999',
    fontSize: 12,
  },
  footerLink: {
    color: '#999',
    fontSize: 12,
    textDecorationLine: 'underline',
  },

  // Logged In Styles
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
