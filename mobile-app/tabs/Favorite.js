import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

export default function Favorite({ userData, favoriteEventIds = [], onEventPress, onToggleFavorite }) {
  const [favoriteEvents, setFavoriteEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData && userData.id) {
      loadFavorites();
    } else {
      setLoading(false);
    }
  }, [userData, favoriteEventIds]);

  const loadFavorites = async () => {
    if (!userData || !userData.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/favorites/${userData.id}`);
      const data = await response.json();
      setFavoriteEvents(data);
    } catch (error) {
      console.error('Eroare la încărcarea favoritelor:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!userData) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="heart" size={48} color="#FF3366" />
          <Text style={styles.title}>Favorite</Text>
          <Text style={styles.subtitle}>Evenimentele tale preferate</Text>
        </View>
        
        <View style={styles.content}>
          <View style={styles.emptyState}>
            <Ionicons name="person-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>
              Conectează-te pentru a salva favorite
            </Text>
            <Text style={styles.emptySubtext}>
              Autentifică-te în cont pentru a putea salva evenimente
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF3366" />
      </View>
    );
  }

  if (favoriteEvents.length === 0) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="heart" size={48} color="#FF3366" />
          <Text style={styles.title}>Favorite</Text>
          <Text style={styles.subtitle}>Evenimentele tale preferate</Text>
        </View>
        
        <View style={styles.content}>
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>
              Nu ai adăugat încă niciun favorit
            </Text>
            <Text style={styles.emptySubtext}>
              Explorează și salvează evenimentele tale preferate
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="heart" size={48} color="#FF3366" />
        <Text style={styles.title}>Favorite</Text>
        <Text style={styles.subtitle}>{favoriteEvents.length} {favoriteEvents.length === 1 ? 'eveniment' : 'evenimente'} salvate</Text>
      </View>
      
      <View style={styles.content}>
        {favoriteEvents.map((event, index) => (
          <View key={String(event?._id ?? event?.id ?? index)} style={styles.eventCard}>
            <Image 
              source={{ uri: event.image }} 
              style={styles.eventImage}
            />
            <View style={styles.eventInfo}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                <TouchableOpacity 
                  onPress={() => onToggleFavorite && onToggleFavorite(event._id)}
                  style={styles.favoriteButton}
                >
                  <Ionicons name="heart" size={24} color="#FF3366" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.eventDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.detailText}>{event.date} {event.month}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.detailText}>{event.time}</Text>
                </View>
              </View>

              <View style={styles.eventDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={16} color="#666" />
                  <Text style={styles.detailText} numberOfLines={1}>{event.location}</Text>
                </View>
              </View>

              <View style={styles.eventFooter}>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>Preț:</Text>
                  <Text style={styles.priceValue}>{event.price}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.viewButton}
                  onPress={() => onEventPress && onEventPress(event._id)}
                >
                  <Text style={styles.viewButtonText}>Vezi detalii</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FF3366" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
        
        <View style={{ height: 100 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 30,
    paddingTop: 50,
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
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
    backgroundColor: '#eee',
  },
  eventInfo: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 8,
  },
  favoriteButton: {
    padding: 4,
  },
  eventDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#888',
    marginRight: 6,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3366',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3366',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3366',
    marginRight: 6,
  },
});
