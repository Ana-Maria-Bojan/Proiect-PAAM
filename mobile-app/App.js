import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { toastConfig } from './components/toastConfig';
import { API_URL } from './config';

// Import tabs
import Exploreaza from './tabs/Exploreaza';
import Harta from './tabs/Harta';
import Publica from './tabs/Publica';
import Favorite from './tabs/Favorite';
import Cont from './tabs/Cont';
import EventDetails from './components/EventDetails';

export default function App() {
  const [activeTab, setActiveTab] = useState('exploreaza');
  // Global user state
  const [userData, setUserData] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [favoriteEventIds, setFavoriteEventIds] = useState([]);

  // Încarcă datele utilizatorului salvate la pornirea aplicației
  useEffect(() => {
    loadUserData();
  }, []);

  // Salvează datele utilizatorului când se modifică
  useEffect(() => {
    if (userData) {
      saveUserData(userData);
      loadFavorites();
    }
  }, [userData]);

  const loadUserData = async () => {
    try {
      const savedUserData = await AsyncStorage.getItem('userData');
      if (savedUserData) {
        setUserData(JSON.parse(savedUserData));
      }
    } catch (error) {
      console.error('Eroare la încărcarea datelor:', error);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const loadFavorites = async () => {
    if (!userData || !userData.id) return;
    
    try {
      const response = await fetch(`${API_URL}/favorites/${userData.id}`);
      const favorites = await response.json();
      setFavoriteEventIds(favorites.map(event => event._id));
    } catch (error) {
      console.error('Eroare la încărcarea favoritelor:', error);
    }
  };

  const saveUserData = async (data) => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(data));
    } catch (error) {
      console.error('Eroare la salvarea datelor:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userData');
      setUserData(null);
    } catch (error) {
      console.error('Eroare la deconectare:', error);
    }
  };

  const handleEventPress = (eventId) => {
    setSelectedEventId(eventId);
  };

  const handleBackFromEvent = () => {
    setSelectedEventId(null);
  };

  const navigateToTab = (tab) => {
    setSelectedEventId(null);
    setActiveTab(tab);
  };

  const toggleFavorite = async (eventId) => {
    if (!userData || !userData.id) {
      Toast.show({
        type: 'error',
        text1: '⚠️ Autentificare necesară',
        text2: 'Conectează-te pentru a salva favorite',
        position: 'top',
        visibilityTime: 2500,
        topOffset: 50,
      });
      return;
    }

    const isFavorite = favoriteEventIds.includes(eventId);
    const endpoint = `${API_URL}/favorites/${userData.id}/${eventId}`;
    
    try {
      if (isFavorite) {
        // Remove from favorites
        await fetch(endpoint, { method: 'DELETE' });
        setFavoriteEventIds(favoriteEventIds.filter(id => id !== eventId));
        Toast.show({
          type: 'info',
          text1: '💔 Șters din favorite',
          text2: 'Eveniment eliminat din lista ta',
          position: 'top',
          visibilityTime: 2000,
          topOffset: 50,
        });
      } else {
        // Add to favorites
        await fetch(endpoint, { method: 'POST' });
        setFavoriteEventIds([...favoriteEventIds, eventId]);
        Toast.show({
          type: 'success',
          text1: '❤️ Adăugat la favorite',
          text2: 'Eveniment salvat în lista ta',
          position: 'top',
          visibilityTime: 2000,
          topOffset: 50,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: '❌ Eroare',
        text2: 'Nu s-a putut actualiza lista de favorite',
        position: 'top',
        visibilityTime: 2500,
        topOffset: 50,
      });
    }
  };

  // Afișează un loading screen în timp ce verifică autentificarea
  if (isLoadingAuth) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const renderContent = () => {
    // Dacă avem un eveniment selectat, afișăm EventDetails
    if (selectedEventId) {
      return (
        <EventDetails 
          eventId={selectedEventId} 
          onBack={handleBackFromEvent}
          isFavorite={favoriteEventIds.includes(selectedEventId)}
          onToggleFavorite={() => toggleFavorite(selectedEventId)}
        />
      );
    }

    switch(activeTab) {
      case 'exploreaza':
        return (
          <Exploreaza 
            userData={userData} 
            onNavigateToAccount={() => navigateToTab('cont')} 
            onEventPress={handleEventPress}
            favoriteEventIds={favoriteEventIds}
            onToggleFavorite={toggleFavorite}
          />
        );
      case 'harta':
        return <Harta />;
      case 'publica':
        return <Publica />;
      case 'favorite':
        return (
          <Favorite 
            userData={userData}
            favoriteEventIds={favoriteEventIds}
            onEventPress={handleEventPress}
            onToggleFavorite={toggleFavorite}
          />
        );
      case 'cont':
        return (
          <Cont 
            userData={userData} 
            setUserData={setUserData} 
            onLogout={handleLogout}
            onNavigateToFavorites={() => navigateToTab('favorite')}
          />
        );
      default:
        return <Exploreaza userData={userData} onEventPress={handleEventPress} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {renderContent()}
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.footerButton}
          onPress={() => navigateToTab('exploreaza')}
        >
          <Ionicons 
            name="compass-outline" 
            size={28} 
            color={activeTab === 'exploreaza' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[
            styles.footerButtonText,
            activeTab === 'exploreaza' && styles.activeText
          ]}>
            Explorează
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.footerButton}
          onPress={() => navigateToTab('harta')}
        >
          <Ionicons 
            name="map-outline" 
            size={28} 
            color={activeTab === 'harta' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[
            styles.footerButtonText,
            activeTab === 'harta' && styles.activeText
          ]}>
            Hartă
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.footerButton}
          onPress={() => navigateToTab('publica')}
        >
          <Ionicons 
            name="add-circle-outline" 
            size={28} 
            color={activeTab === 'publica' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[
            styles.footerButtonText,
            activeTab === 'publica' && styles.activeText
          ]}>
            Publică
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.footerButton}
          onPress={() => navigateToTab('favorite')}
        >
          <Ionicons 
            name="heart-outline" 
            size={28} 
            color={activeTab === 'favorite' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[
            styles.footerButtonText,
            activeTab === 'favorite' && styles.activeText
          ]}>
            Favorite
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.footerButton}
          onPress={() => navigateToTab('cont')}
        >
          <Ionicons 
            name="person-outline" 
            size={28} 
            color={activeTab === 'cont' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[
            styles.footerButtonText,
            activeTab === 'cont' && styles.activeText
          ]}>
            Cont
          </Text>
        </TouchableOpacity>
      </View>
      
      <Toast config={toastConfig} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingBottom: 20,
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  footerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  footerButtonText: {
    fontSize: 11,
    marginTop: 4,
    color: '#8E8E93',
  },
  activeText: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
