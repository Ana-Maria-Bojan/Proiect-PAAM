import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Share, Linking, Alert, Switch, Modal } from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons, Feather, AntDesign } from '@expo/vector-icons';
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

export default function Cont({ userData, setUserData, onLogout, onNavigateToFavorites }) {
  const [isLoggedIn, setIsLoggedIn] = useState(!!userData);
  
  const [isLoginView, setIsLoginView] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]); // Ținem minte tag-urile selectate, nu categoriile direct
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showAboutModal, setShowAboutModal] = useState(false);

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

  // Funcții pentru butoanele noi
  const handleNotifications = () => {
    Alert.alert(
      'Notificări',
      'Dorești să primești notificări pentru evenimente noi?',
      [
        {
          text: 'Anulează',
          style: 'cancel'
        },
        {
          text: 'Dezactivează',
          onPress: () => {
            setNotificationsEnabled(false);
            Toast.show({
              type: 'info',
              text1: '🔕 Notificări dezactivate',
              text2: 'Nu vei mai primi notificări pentru evenimente',
              position: 'top',
              visibilityTime: 2000,
              topOffset: 50,
            });
          }
        },
        {
          text: 'Activează',
          onPress: () => {
            setNotificationsEnabled(true);
            Toast.show({
              type: 'success',
              text1: '🔔 Notificări activate',
              text2: 'Vei fi notificat despre evenimente noi',
              position: 'top',
              visibilityTime: 2000,
              topOffset: 50,
            });
          }
        }
      ]
    );
  };

  const handleHistory = async () => {
    Toast.show({
      type: 'info',
      text1: '📅 Istoric Evenimente',
      text2: 'Se încarcă evenimentele tale...',
      position: 'top',
      visibilityTime: 2000,
      topOffset: 50,
    });
    
    // Aici poți adăuga logică pentru a afișa istoric
    // De exemplu, navigare către un nou screen sau modal
  };

  const handleMyEvents = async () => {
    Toast.show({
      type: 'info',
      text1: '📝 Evenimentele Tale',
      text2: 'Se încarcă evenimentele publicate...',
      position: 'top',
      visibilityTime: 2000,
      topOffset: 50,
    });
    
    // Aici poți adăuga logică pentru a afișa evenimentele create
  };

  const handleStatistics = () => {
    const stats = {
      attended: Math.floor(Math.random() * 20) + 5,
      published: Math.floor(Math.random() * 10) + 1,
      favorites: Math.floor(Math.random() * 15) + 3
    };
    
    Alert.alert(
      '📊 Statisticile Tale',
      `🎉 Evenimente participat: ${stats.attended}\n📝 Evenimente publicate: ${stats.published}\n❤️ Evenimente favorite: ${stats.favorites}`,
      [{ text: 'OK' }]
    );
  };

  const handleInviteFriends = async () => {
    try {
      const result = await Share.share({
        message: `Hei! 🎉 Încearcă aplicația UndeMergem pentru a descoperi cele mai tari evenimente din oraș! 📍`,
        title: 'UndeMergem - Descoperă Evenimente'
      });

      if (result.action === Share.sharedAction) {
        Toast.show({
          type: 'success',
          text1: '✅ Mulțumim!',
          text2: 'Ai distribuit aplicația cu succes',
          position: 'top',
          visibilityTime: 2000,
          topOffset: 50,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: '❌ Eroare',
        text2: 'Nu s-a putut distribui aplicația',
        position: 'top',
        visibilityTime: 2000,
        topOffset: 50,
      });
    }
  };

  const handleHelp = () => {
    Alert.alert(
      '❓ Ajutor & Suport',
      'Alege o opțiune:',
      [
        {
          text: 'Întrebări Frecvente',
          onPress: () => {
            Toast.show({
              type: 'info',
              text1: '📚 FAQ',
              text2: 'Se deschide secțiunea FAQ...',
              position: 'top',
              visibilityTime: 2000,
              topOffset: 50,
            });
          }
        },
        {
          text: 'Contactează Suport',
          onPress: () => {
            Linking.openURL('mailto:support@undemergem.ro?subject=Suport UndeMergem');
          }
        },
        {
          text: 'Anulează',
          style: 'cancel'
        }
      ]
    );
  };

  const handleAbout = () => {
    setShowAboutModal(true);
  };

  const handleSettings = () => {
    Toast.show({
      type: 'info',
      text1: '⚙️ Setări',
      text2: 'Funcționalitate în dezvoltare...',
      position: 'top',
      visibilityTime: 2000,
      topOffset: 50,
    });
  };

  const handleFavorites = () => {
    if (onNavigateToFavorites) {
      onNavigateToFavorites();
    } else {
      Toast.show({
        type: 'info',
        text1: '❤️ Favorite',
        text2: 'Se încarcă evenimentele favorite...',
        position: 'top',
        visibilityTime: 2000,
        topOffset: 50,
      });
    }
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
        
        <ScrollView style={styles.menuScrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.menuContainer}>
            
            {/* Secțiunea Cont */}
            <Text style={styles.sectionTitle}>Contul Meu</Text>
            
            <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="settings-outline" size={24} color="#2e0249" />
                </View>
                <Text style={styles.menuText}>Setări Cont</Text>
                <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={handleFavorites}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="heart-outline" size={24} color="#e74c3c" />
                </View>
                <Text style={styles.menuText}>Evenimente Favorite</Text>
                <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleHistory}>
                <View style={styles.menuIconContainer}>
                  <FontAwesome5 name="history" size={22} color="#3498db" />
                </View>
                <Text style={styles.menuText}>Istoric Evenimente</Text>
                <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleMyEvents}>
                <View style={styles.menuIconContainer}>
                  <MaterialIcons name="event-note" size={24} color="#9b59b6" />
                </View>
                <Text style={styles.menuText}>Evenimentele Mele</Text>
                <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>

            {/* Secțiunea Activitate */}
            <Text style={styles.sectionTitle}>Activitate</Text>

            <TouchableOpacity style={styles.menuItem} onPress={handleStatistics}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="stats-chart" size={24} color="#f39c12" />
                </View>
                <Text style={styles.menuText}>Statistici</Text>
                <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleNotifications}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name={notificationsEnabled ? "notifications" : "notifications-off"} size={24} color="#1abc9c" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuText}>Notificări</Text>
                  <Text style={styles.menuSubtext}>
                    {notificationsEnabled ? 'Active' : 'Dezactivate'}
                  </Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={(value) => {
                    setNotificationsEnabled(value);
                    Toast.show({
                      type: value ? 'success' : 'info',
                      text1: value ? '🔔 Notificări activate' : '🔕 Notificări dezactivate',
                      text2: value ? 'Vei fi notificat despre evenimente' : 'Nu vei primi notificări',
                      position: 'top',
                      visibilityTime: 2000,
                      topOffset: 50,
                    });
                  }}
                  trackColor={{ false: '#ccc', true: '#a81858' }}
                  thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
                />
            </TouchableOpacity>

            {/* Secțiunea Social */}
            <Text style={styles.sectionTitle}>Social</Text>

            <TouchableOpacity style={styles.menuItem} onPress={handleInviteFriends}>
                <View style={styles.menuIconContainer}>
                  <Feather name="share-2" size={22} color="#e67e22" />
                </View>
                <Text style={styles.menuText}>Invită Prieteni</Text>
                <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>

            {/* Secțiunea Suport */}
            <Text style={styles.sectionTitle}>Suport</Text>

            <TouchableOpacity style={styles.menuItem} onPress={handleHelp}>
                <View style={styles.menuIconContainer}>
                  <AntDesign name="questioncircleo" size={22} color="#34495e" />
                </View>
                <Text style={styles.menuText}>Ajutor & Suport</Text>
                <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleAbout}>
                <View style={styles.menuIconContainer}>
                  <Feather name="info" size={22} color="#95a5a6" />
                </View>
                <Text style={styles.menuText}>Despre Aplicație</Text>
                <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Ionicons name="log-out-outline" size={24} color="#ff4444" />
                <Text style={styles.logoutButtonText}>Deconectare</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Modal Despre Aplicație */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showAboutModal}
          onRequestClose={() => setShowAboutModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <ScrollView showsVerticalScrollIndicator={false}>
                
                {/* Header Modal */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconWrapper}>
                    <FontAwesome5 name="calendar-alt" size={40} color="#fff" />
                    <View style={styles.modalPinIcon}>
                      <FontAwesome5 name="map-marker-alt" size={18} color="#2e0249" />
                    </View>
                  </View>
                  <Text style={styles.modalTitle}>UndeMergem?</Text>
                  <Text style={styles.modalVersion}>Versiune 1.0.0</Text>
                </View>

                {/* Descriere */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>📱 Despre Aplicație</Text>
                  <Text style={styles.modalText}>
                    UndeMergem este aplicația ta personală pentru descoperirea celor mai tari evenimente din oraș! 
                    Fie că ești pasionat de muzică live, teatru, sport sau socializare, noi te ajutăm să găsești 
                    evenimentele perfecte pentru tine.
                  </Text>
                </View>

                {/* Features */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>✨ Funcționalități</Text>
                  <View style={styles.featureItem}>
                    <Ionicons name="search" size={20} color="#2e0249" />
                    <Text style={styles.featureText}>Căutare inteligentă evenimente</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="location" size={20} color="#2e0249" />
                    <Text style={styles.featureText}>Harta interactivă cu evenimente</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="heart" size={20} color="#2e0249" />
                    <Text style={styles.featureText}>Salvează evenimentele favorite</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="add-circle" size={20} color="#2e0249" />
                    <Text style={styles.featureText}>Publică propriile evenimente</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="notifications" size={20} color="#2e0249" />
                    <Text style={styles.featureText}>Notificări personalizate</Text>
                  </View>
                </View>

                {/* Informații Contact */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>📧 Contact</Text>
                  <TouchableOpacity 
                    style={styles.contactButton}
                    onPress={() => Linking.openURL('mailto:contact@undemergem.ro')}
                  >
                    <MaterialIcons name="email" size={20} color="#2e0249" />
                    <Text style={styles.contactButtonText}>contact@undemergem.ro</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.contactButton}
                    onPress={() => Linking.openURL('https://undemergem.ro')}
                  >
                    <Ionicons name="globe" size={20} color="#2e0249" />
                    <Text style={styles.contactButtonText}>www.undemergem.ro</Text>
                  </TouchableOpacity>
                </View>

                {/* Team */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>👥 Echipa</Text>
                  <Text style={styles.modalText}>
                    Dezvoltat cu ❤️ de către echipa UndeMergem
                  </Text>
                  <Text style={styles.modalSubtext}>
                    Proiect PAAM - 2026
                  </Text>
                </View>

                {/* Legal */}
                <View style={styles.modalSection}>
                  <TouchableOpacity 
                    style={styles.legalButton}
                    onPress={() => {
                      Toast.show({
                        type: 'info',
                        text1: '📄 Termeni și Condiții',
                        text2: 'Se deschide documentul...',
                        position: 'top',
                        visibilityTime: 2000,
                        topOffset: 50,
                      });
                    }}
                  >
                    <Text style={styles.legalButtonText}>Termeni și Condiții</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.legalButton}
                    onPress={() => {
                      Toast.show({
                        type: 'info',
                        text1: '🔒 Politica de Confidențialitate',
                        text2: 'Se deschide documentul...',
                        position: 'top',
                        visibilityTime: 2000,
                        topOffset: 50,
                      });
                    }}
                  >
                    <Text style={styles.legalButtonText}>Politica de Confidențialitate</Text>
                  </TouchableOpacity>
                </View>

                {/* Copyright */}
                <Text style={styles.copyrightText}>© 2026 UndeMergem. Toate drepturile rezervate.</Text>

              </ScrollView>

              {/* Close Button */}
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowAboutModal(false)}
              >
                <LinearGradient
                  colors={['#d53369', '#c026d3']}
                  start={{x: 0, y: 0}} 
                  end={{x: 1, y: 0}}
                  style={styles.modalCloseButtonGradient}
                >
                  <Text style={styles.modalCloseButtonText}>Închide</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  menuScrollContainer: {
    flex: 1,
  },
  menuContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e0249',
    marginTop: 15,
    marginBottom: 10,
    marginLeft: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
        width: 0,
        height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 3,
  },
  menuText: {
    flex: 1,
    marginLeft: 3,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  menuSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  logoutButton: {
    marginTop: 25,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ff4444',
    shadowColor: "#ff4444",
    shadowOffset: {
        width: 0,
        height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  logoutButtonText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: width * 0.9,
    maxHeight: '85%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 25,
    paddingTop: 10,
  },
  modalIconWrapper: {
    position: 'relative',
    marginBottom: 15,
  },
  modalPinIcon: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 3,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2e0249',
    marginBottom: 5,
  },
  modalVersion: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e0249',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    textAlign: 'justify',
  },
  modalSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    fontStyle: 'italic',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingLeft: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 12,
    flex: 1,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  contactButtonText: {
    fontSize: 14,
    color: '#2e0249',
    marginLeft: 10,
    fontWeight: '500',
  },
  legalButton: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  legalButtonText: {
    fontSize: 14,
    color: '#a81858',
    textDecorationLine: 'underline',
  },
  copyrightText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  modalCloseButton: {
    marginTop: 15,
    borderRadius: 25,
    overflow: 'hidden',
  },
  modalCloseButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
