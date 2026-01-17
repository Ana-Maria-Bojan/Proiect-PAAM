import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { API_URL } from '../config';

const { width } = Dimensions.get('window');

// Etichete sugestive separate și amestecate
const INTEREST_TAGS = [
  { id: 'tag1', label: 'Muzică Live', category: 'Concerte' },
  { id: 'tag2', label: 'Aer liber', category: 'Festival' },
  { id: 'tag3', label: 'Board Games', category: 'Social' },
  { id: 'tag4', label: 'Teatru', category: 'Teatru' },
  { id: 'tag5', label: 'Competiție', category: 'Sport' },
  { id: 'tag6', label: 'Party', category: 'Concerte' },
  { id: 'tag7', label: 'Festivaluri', category: 'Festival' },
  { id: 'tag8', label: 'Artă', category: 'Teatru' },
  { id: 'tag9', label: 'Socializare', category: 'Social' },
  { id: 'tag10', label: 'Energie', category: 'Sport' },
  { id: 'tag11', label: 'Stand-up', category: 'Teatru' },
  { id: 'tag12', label: 'Vibe', category: 'Festival' }
];

export default function Cont({ userData, setUserData, onLogout }) {
  const [isLoggedIn, setIsLoggedIn] = useState(!!userData);
  
  const [isLoginView, setIsLoginView] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]); // Ținem minte tag-urile selectate, nu categoriile direct

  // Actualizează isLoggedIn când userData se schimbă (ex: din App.js)
  React.useEffect(() => {
    setIsLoggedIn(!!userData);
  }, [userData]);

  const toggleTag = (tagId) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(t => t !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: '⚠️ Câmpuri incomplete',
        text2: 'Te rog completează toate câmpurile',
        position: 'top',
        visibilityTime: 2500,
        topOffset: 50,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Eroare la autentificare');
      }

      setUserData(data.user);
      
      // Afișează toast de succes
      Toast.show({
        type: 'success',
        text1: '🎉 Bine ai revenit!',
        text2: `Salut, ${data.user.name}! Te-ai conectat cu succes.`,
        position: 'top',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 50,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: '❌ Eroare la conectare',
        text2: error.message,
        position: 'top',
        visibilityTime: 3000,
        topOffset: 50,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Toast.show({
        type: 'error',
        text1: '⚠️ Câmpuri incomplete',
        text2: 'Te rog completează toate câmpurile',
        position: 'top',
        visibilityTime: 2500,
        topOffset: 50,
      });
      return;
    }

    setLoading(true);
    try {
      // Convertim tag-urile selectate în categorii unice
      const uniqueCategories = [...new Set(
        selectedTags.map(tagId => INTEREST_TAGS.find(t => t.id === tagId)?.category).filter(Boolean)
      )];

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, preferences: uniqueCategories }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Eroare la înregistrare');
      }

      setUserData(data.user);
      
      // Afișează toast de succes
      Toast.show({
        type: 'success',
        text1: '✅ Cont creat cu succes!',
        text2: `Bine ai venit, ${data.user.name}! Contul tău a fost creat.`,
        position: 'top',
        visibilityTime: 3500,
        autoHide: true,
        topOffset: 50,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: '❌ Eroare la înregistrare',
        text2: error.message,
        position: 'top',
        visibilityTime: 3000,
        topOffset: 50,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    const userName = userData?.name || 'utilizator';
    
    if (onLogout) {
      onLogout();
    }
    setUserData(null);
    setEmail('');
    setPassword('');
    setName('');
    setSelectedTags([]);
    setIsLoginView(true);
    
    // Afișează toast de deconectare
    Toast.show({
      type: 'info',
      text1: '👋 La revedere!',
      text2: `${userName}, te-ai deconectat cu succes.`,
      position: 'top',
      visibilityTime: 2500,
      autoHide: true,
      topOffset: 50,
    });
  };

  if (isLoggedIn) {
    return (
      <View style={styles.loggedInContainer}>
        <LinearGradient
          colors={['#2e0249', '#a81858']}
          style={styles.headerGradient}
        >
            <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>{userData?.name?.charAt(0) || 'U'}</Text>
                </View>
                <Text style={styles.welcomeText}>Salut, {userData?.name}!</Text>
                <Text style={styles.emailText}>{userData?.email}</Text>
                {userData?.preferences && userData.preferences.length > 0 && (
                   <View style={styles.preferencesContainer}>
                      <Text style={styles.preferencesTitle}>Interesele tale:</Text>
                      <View style={styles.preferencesTags}>
                        {userData.preferences.map((pref, idx) => (
                           <View key={idx} style={styles.preferenceTagDisplay}>
                             <Text style={styles.preferenceTagText}>{pref}</Text>
                           </View>
                        ))}
                      </View>
                   </View>
                )}
            </View>
        </LinearGradient>
        
        <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="settings-outline" size={24} color="#333" />
                <Text style={styles.menuText}>Setări Cont</Text>
                <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="heart-outline" size={24} color="#333" />
                <Text style={styles.menuText}>Evenimente Favorite</Text>
                <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Text style={styles.logoutButtonText}>Deconectare</Text>
            </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#2e0249', '#5e1059', '#a81858', '#f16a43']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* Logo Section */}
            <View style={styles.logoContainer}>
                <View style={styles.iconWrapper}>
                    <FontAwesome5 name="calendar-alt" size={60} color="#fff" />
                    <View style={styles.pinIcon}>
                        <FontAwesome5 name="map-marker-alt" size={24} color="#2e0249" />
                    </View>
                </View>
                <Text style={styles.title}>UndeMergem?</Text>
                <Text style={styles.subtitle}>Descoperă Evenimentele Tale!</Text>
            </View>

            {/* Form Section */}
            <View style={styles.formContainer}>
                
                {/* Name Input (Register only) */}
                {!isLoginView && (
                    <View style={styles.inputWrapper}>
                        <Ionicons name="person" size={20} color="#5e1059" style={{marginRight: 10}} />
                        <TextInput
                            style={styles.input}
                            placeholder="Nume complet"
                            placeholderTextColor="#999"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    </View>
                )}

                {/* Email Input */}
                <View style={styles.inputWrapper}>
                    <MaterialIcons name="email" size={20} color="#5e1059" style={{marginRight: 10}} />
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#999"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                {/* Password Input */}
                <View style={styles.inputWrapper}>
                    <FontAwesome5 name="lock" size={18} color="#5e1059" style={{marginRight: 10}} />
                    <TextInput
                        style={styles.input}
                        placeholder="Parolă"
                        placeholderTextColor="#999"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity 
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeButton}
                    >
                        <Ionicons 
                            name={showPassword ? "eye-off" : "eye"} 
                            size={22} 
                            color="#5e1059" 
                        />
                    </TouchableOpacity>
                </View>

                {/* Preference Selection (Register only) */}
                {!isLoginView && (
                    <View style={styles.preferencesSection}>
                        <Text style={styles.sectionLabel}>Ce te definește?</Text>
                        <View style={styles.chipsContainer}>
                            {INTEREST_TAGS.map((tag) => (
                                <TouchableOpacity
                                    key={tag.id}
                                    style={[
                                        styles.chip,
                                        selectedTags.includes(tag.id) && styles.activeChip
                                    ]}
                                    onPress={() => toggleTag(tag.id)}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        selectedTags.includes(tag.id) && styles.activeChipText
                                    ]}>
                                        {tag.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {isLoginView && (
                    <TouchableOpacity style={styles.forgotPassword}>
                        <Text style={styles.forgotPasswordText}>Ai uitat parola?</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity 
                    onPress={isLoginView ? handleLogin : handleRegister} 
                    disabled={loading} 
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#d53369', '#c026d3']}
                        start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                        style={styles.loginButton}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginButtonText}>
                                {isLoginView ? 'Conectează-te' : 'Înregistrează-te'}
                            </Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.toggleContainer}>
                    <Text style={styles.toggleText}>
                        {isLoginView ? "Nu ai cont? " : "Ai deja cont? "}
                    </Text>
                    <TouchableOpacity onPress={() => setIsLoginView(!isLoginView)}>
                        <Text style={styles.toggleLink}>
                            {isLoginView ? "Înregistrează-te" : "Conectează-te"}
                        </Text>
                    </TouchableOpacity>
                </View>

            </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 50,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
    marginTop: 50,
  },
  iconWrapper: {
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinIcon: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    height: 55,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: {
        width: 0,
        height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    borderWidth: 0,
    outlineStyle: 'none',
  },
  eyeButton: {
    padding: 5,
    marginLeft: 5,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  loginButton: {
    height: 55,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
        width: 0,
        height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  toggleText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  toggleLink: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  // Logged In Styles
  loggedInContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  profileHeader: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2e0249',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  emailText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  preferencesContainer: {
    marginTop: 15,
    width: '100%',
    alignItems: 'center',
  },
  preferencesTitle: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.9,
  },
  preferencesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  preferenceTagDisplay: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    margin: 3,
  },
  preferenceTagText: {
    color: '#fff',
    fontSize: 12,
  },
  // Register Preferences UI
  preferencesSection: {
    width: '100%',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    marginLeft: 5,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeChip: {
    backgroundColor: '#e6ccf2', // Light purple
    borderColor: '#a81858',
  },
  chipText: {
    fontSize: 13,
    color: '#666',
  },
  activeChipText: {
    color: '#5e1059',
    fontWeight: '600',
  },
  menuContainer: {
    padding: 20,
    marginTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
        width: 0,
        height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    marginTop: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  logoutButtonText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
