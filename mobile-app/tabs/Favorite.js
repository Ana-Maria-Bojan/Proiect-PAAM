import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiFetch } from '../config';
import EventImage from '../components/EventImage';
import TabHeader from '../components/TabHeader';

export default function Favorite({ userData, favoriteEventIds = [], onEventPress, onToggleFavorite, onBack }) {
  const [favoriteEvents, setFavoriteEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const Header = ({ subtitle }) => (
    <LinearGradient
      colors={['#7E57C2', '#EC407A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.headerGradient}
    >
      <View style={styles.headerContent}>
        <View style={styles.headerIconCircle}>
          <Ionicons name="heart" size={28} color="#fff" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Favorite</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>
      </View>
    </LinearGradient>
  );

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
      const response = await apiFetch(`/favorites/${userData.id}`);
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
      <View style={styles.container}>
        <TabHeader title="Favorite" onBack={onBack} />
        <ScrollView>
          <Header subtitle="Evenimentele tale preferate" />
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
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <TabHeader title="Favorite" onBack={onBack} />
        <View style={[{ flex: 1 }, styles.centerContent]}>
          <ActivityIndicator size="large" color="#FF3366" />
        </View>
      </View>
    );
  }

  if (favoriteEvents.length === 0) {
    return (
      <View style={styles.container}>
        <TabHeader title="Favorite" onBack={onBack} />
        <ScrollView>
          <Header subtitle="Evenimentele tale preferate" />
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TabHeader title="Favorite" onBack={onBack} />
      <ScrollView>
      <Header
        subtitle={
          favoriteEvents.length === 1
            ? '1 eveniment salvat'
            : `${favoriteEvents.length} evenimente salvate`
        }
      />
      
      <View style={styles.content}>
        {favoriteEvents.map((event, index) => (
          <View key={String(event?._id ?? event?.id ?? index)} style={styles.eventCard}>
            <EventImage event={event} style={styles.eventImage} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
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
