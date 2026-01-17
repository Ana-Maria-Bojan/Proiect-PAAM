import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TextInput, TouchableOpacity, FlatList, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

const CATEGORIES = ['Fluxul meu', 'Festival', 'Concerte', 'Teatru', 'Sport', 'Social', 'Altele'];
// API_URL este acum importat din config.js si se seteaza automat
const EVENTS_URL = `${API_URL}/events`;

const SUGGESTIONS = [ 
  {
    id: 'sug1',
    title: 'Tur ghidat Cetate',
    date: 'Sâmbătă',
    time: '10:00',
    image: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
  },
  { 
    id: 'sug2',
    title: 'Expoziție Brâncuși',
    date: 'Duminică',
    time: '11:00',
    image: 'https://images.unsplash.com/photo-1518998053901-5348d3969105?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
  }
]; 

export default function Exploreaza({ userData, onNavigateToAccount, onEventPress, favoriteEventIds = [], onToggleFavorite }) {
  const [activeCategory, setActiveCategory] = useState('Fluxul meu');
  const [eventsData, setEventsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, [userData]); // Refetch when user logs in/out

  const fetchEvents = async () => {
    try {
      const response = await fetch(EVENTS_URL);
      const data = await response.json();
      
      // Group events by category
      const groupedEvents = {};
      CATEGORIES.forEach(cat => groupedEvents[cat] = []);

      const seenByCategory = {};
      CATEGORIES.forEach(cat => (seenByCategory[cat] = new Set()));

      const getEventKey = (event) => {
        const raw = event?._id ?? event?.id;
        if (raw == null) return null;
        return String(raw);
      };

      const addUnique = (category, event) => {
        if (!groupedEvents[category]) return;
        const key = getEventKey(event);
        if (!key) {
          groupedEvents[category].push(event);
          return;
        }
        if (seenByCategory[category].has(key)) return;
        seenByCategory[category].add(key);
        groupedEvents[category].push(event);
      };
      
      // Dacă avem user logat cu preferințe, populăm 'Fluxul meu'
      const userPreferences = userData?.preferences || [];
      
      data.forEach(event => {
        // Adăugăm în categoria specifică
        if (groupedEvents[event.category]) {
          addUnique(event.category, event);
        }

        // Logică pentru Fluxul meu
        if (userPreferences.length > 0) {
            // Dacă userul are preferințe, punem doar ce se potrivește
            if (userPreferences.includes(event.category)) {
            addUnique('Fluxul meu', event);
            }
        } else {
            // Dacă nu are preferințe (sau nu e logat), 'Fluxul meu' poate conține tot sau selecție random.
            // Momentan lăsăm totul sau primele X evenimente. Deocamdată punem tot.
          addUnique('Fluxul meu', event);
        }
      });
      
      // Dacă userul are preferințe dar nu s-a găsit nimic, poți pune fallback
      // Optional: Shuffle 'Fluxul meu'
      if (groupedEvents['Fluxul meu'].length === 0 && userPreferences.length > 0) {
          // Fallback: arată tot dacă nu găsește nimic specific
         data.forEach(event => addUnique('Fluxul meu', event));
      }

      setEventsData(groupedEvents);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Nu s-au putut încărca evenimentele');
      setLoading(false);
    }
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity 
      style={[styles.categoryChip, item === activeCategory && styles.activeCategoryChip]}
      onPress={() => setActiveCategory(item)}
    >
      <Text style={[styles.categoryText, item === activeCategory && styles.activeCategoryText]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderEventCard = ({ item }) => {
    const isFavorite = favoriteEventIds.includes(item._id || item.id);
    
    return (
      <View style={styles.card}>
        <Image 
          source={{ uri: item.image }} 
          style={styles.cardImage}
        />
        <View style={styles.dateBadge}>
          <Text style={styles.dateDay}>{item.date}</Text>
          <Text style={styles.dateMonth}>{item.month}</Text>
        </View>
        
        {/* Favorite Button */}
        <TouchableOpacity 
          style={styles.favoriteIconButton}
          onPress={() => onToggleFavorite && onToggleFavorite(item._id || item.id)}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={24} 
            color={isFavorite ? "#FF3366" : "#fff"} 
          />
        </TouchableOpacity>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={14} color="#888" />
            <Text style={styles.cardLocation}>{item.location}</Text>
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.cardRow}>
              <Ionicons name="time-outline" size={14} color="#888" />
              <Text style={styles.cardTime}>{item.time}</Text>
            </View>
            <View style={styles.priceTag}>
               <Text style={styles.priceLabel}>Bilet</Text>
               <Text style={styles.priceValue}>{item.price}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.detailsButton}
            onPress={() => onEventPress && onEventPress(item._id || item.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.detailsButtonText}>Vezi detalii</Text>
            <Ionicons name="arrow-forward" size={16} color="#FF3366" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF3366" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="menu-outline" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Unde mergem?</Text>
        <TouchableOpacity onPress={onNavigateToAccount}>
          <Ionicons name="person-circle-outline" size={40} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Hai să ne distrăm</Text>
        <Text style={styles.locationText}>Timișoara, RO</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
        <TextInput 
          placeholder="Caută eveniment" 
          style={styles.searchInput}
          placeholderTextColor="#999"
        />
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={CATEGORIES}
          renderItem={renderCategory}
          keyExtractor={item => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Featured Events */}
      <FlatList
        data={eventsData[activeCategory] || []}
        renderItem={renderEventCard}
        keyExtractor={(item, index) => String(item?._id ?? item?.id ?? index)}
        horizontal
        showsHorizontalScrollIndicator={Platform.OS === 'web'}
        contentContainerStyle={styles.eventsList}
        snapToInterval={Platform.OS === 'web' ? null : Dimensions.get('window').width * 0.7 + 20}
        decelerationRate="fast"
        snapToAlignment="start"
        pagingEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nu există evenimente în această categorie</Text>
          </View>
        }
      />

      {/* Suggestions */}
      <View style={styles.suggestionsSection}>
        <Text style={styles.sectionTitle}>Sugestii pentru tine</Text>
        {SUGGESTIONS.map(item => (
          <View key={item.id} style={styles.suggestionCard}>
            <Image source={{ uri: item.image }} style={styles.suggestionImage} />
            <View style={styles.suggestionInfo}>
              <Text style={styles.suggestionTitle}>{item.title}</Text>
              <View style={styles.cardRow}>
                <Ionicons name="calendar-outline" size={14} color="#888" />
                <Text style={styles.suggestionDate}>{item.date}</Text>
                <Ionicons name="time-outline" size={14} color="#888" style={{marginLeft: 10}} />
                <Text style={styles.suggestionDate}>{item.time}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
      
      <View style={{height: 80}} /> 
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50, // Adjust for status bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  welcomeSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 25,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  categoriesContainer: {
    marginBottom: 25,
  },
  categoriesList: {
    paddingHorizontal: 20,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  activeCategoryChip: {
    backgroundColor: '#FF7F50', // Coral orange
    borderColor: '#FF7F50',
  },
  categoryText: {
    color: '#888',
    fontWeight: '500',
  },
  activeCategoryText: {
    color: '#fff',
  },
  eventsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    width: Dimensions.get('window').width * 0.7,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
    backgroundColor: '#eee', // Placeholder color
  },
  dateBadge: {
    position: 'absolute',
    top: 15,
    left: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    minWidth: 50,
  },
  favoriteIconButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dateMonth: {
    fontSize: 12,
    color: '#666',
  },
  cardContent: {
    padding: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLocation: {
    fontSize: 14,
    color: '#888',
    marginLeft: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
  },
  cardTime: {
    fontSize: 14,
    color: '#888',
    marginLeft: 4,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#888',
    marginRight: 4,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF7F50',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFF0F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF3366',
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3366',
    marginRight: 6,
  },
  suggestionsSection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  suggestionCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  suggestionImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  suggestionInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  suggestionDate: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    width: Dimensions.get('window').width - 40,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
});
