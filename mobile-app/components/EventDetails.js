import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, ActivityIndicator, Linking, Dimensions, Platform } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { apiFetch } from '../config';
import EventImage from './EventImage';

const { width, height } = Dimensions.get('window');

export default function EventDetails({ eventId, onBack, isFavorite, onToggleFavorite, onNavigateToMap }) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      const response = await apiFetch(`/event/${eventId}`);
      if (!response.ok) {
        throw new Error('Nu s-au putut încărca detaliile evenimentului');
      }
      const data = await response.json();
      setEvent(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching event details:', error);
      Toast.show({
        type: 'error',
        text1: '❌ Eroare',
        text2: error.message,
        position: 'top',
        visibilityTime: 3000,
        topOffset: 50,
      });
      setLoading(false);
    }
  };

  const handleFavoriteToggle = () => {
    if (onToggleFavorite) {
      onToggleFavorite();
    }
  };

  const handleContactPress = (type, value) => {
    if (type === 'email') {
      Linking.openURL(`mailto:${value}`);
    } else if (type === 'phone') {
      Linking.openURL(`tel:${value}`);
    } else if (type === 'website') {
      Linking.openURL(value);
    }
  };

  // Normalizează un URL: adaugă https:// dacă lipsește schema, returnează null pentru link-uri invalide
  const normalizeUrl = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    let url = raw.trim();
    if (url.length < 4) return null;
    // Respinge link-uri navigation-only
    if (url.startsWith('#') || url.startsWith('javascript:') || url === 'http://' || url === 'https://') return null;
    // Adaugă scheme dacă lipsește
    if (!/^https?:\/\//i.test(url)) {
      if (/^\/\//.test(url)) url = 'https:' + url;
      else if (/^www\./i.test(url)) url = 'https://' + url;
      else if (/^[\w-]+\.[\w]{2,}/.test(url)) url = 'https://' + url; // pare a fi domeniu
      else return null;
    }
    // Verifică să aibă un host valid (nu doar protocolul)
    try {
      const u = new URL(url);
      if (!u.hostname || u.hostname.length < 3) return null;
      return u.toString();
    } catch {
      return null;
    }
  };

  // Verifică dacă un URL duce doar la homepage (fără pagină specifică de eveniment)
  const isHomepageOnly = (url) => {
    try {
      const u = new URL(url);
      return u.pathname === '/' || u.pathname === '';
    } catch {
      return false;
    }
  };

  // Construiește un link de căutare Google pentru evenimentul curent.
  // Folosit ca fallback când nu avem o pagină oficială specifică salvată –
  // rezultatele Google vor afișa direct site-urile de bilete (iabilet, eventim etc.)
  const buildSearchUrl = () => {
    const parts = [event?.title, 'bilete', event?.location || 'Timișoara']
      .filter(Boolean)
      .join(' ');
    return `https://www.google.com/search?q=${encodeURIComponent(parts)}`;
  };

  const handleBuyTicket = async () => {
    let url = normalizeUrl(event?.website);
    let isFallback = false;

    // Fallback la căutare Google dacă nu există un link valid SAU dacă
    // link-ul duce doar la homepage-ul site-ului (nu la pagina evenimentului).
    if (!url || isHomepageOnly(url)) {
      url = buildSearchUrl();
      isFallback = true;
    }

    // Pe Android 11+ canOpenURL poate returna false pentru http(s) fără declarații
    // de package visibility. Apelăm direct openURL și prindem erorile.
    try {
      await Linking.openURL(url);
      if (isFallback) {
        Toast.show({
          type: 'info',
          text1: '🔍 Căutăm biletele pentru tine',
          text2: 'Te-am dus la rezultatele pentru acest eveniment',
          position: 'top',
          visibilityTime: 2500,
          topOffset: 50,
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: '❌ Nu se poate deschide',
        text2: 'Verifică conexiunea sau încearcă mai târziu',
        position: 'top',
        visibilityTime: 2500,
        topOffset: 50,
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF3366" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
        <Text style={styles.errorText}>Evenimentul nu a fost găsit</Text>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Înapoi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Evenimentele gratuite nu au bilet de cumpărat → afișăm „Intrare liberă".
  const isFreeEvent = !event.price || /gratuit|free|intrare\s*liber/i.test(event.price);
  // Are un link specific (nu doar homepage) → butonul deschide direct pagina de bilete.
  const ticketUrl = normalizeUrl(event?.website);
  const hasSpecificLink = ticketUrl && !isHomepageOnly(ticketUrl);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <EventImage event={event} style={styles.headerImage} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradient}
          />
          
          {/* Back Button */}
          <TouchableOpacity onPress={onBack} style={styles.backIconButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Favorite Button */}
          <TouchableOpacity onPress={handleFavoriteToggle} style={styles.favoriteButton}>
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={28} 
              color={isFavorite ? "#FF3366" : "#fff"} 
            />
          </TouchableOpacity>

          {/* Date Badge */}
          <View style={styles.floatingDateBadge}>
            <Text style={styles.floatingDateDay}>{event.date}</Text>
            <Text style={styles.floatingDateMonth}>{event.month}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{event.category}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{event.title}</Text>

          {/* Info Cards */}
          <View style={styles.infoCardsContainer}>
            <TouchableOpacity 
              style={styles.infoCard} 
              onPress={() => onNavigateToMap && onNavigateToMap(event)}
              activeOpacity={0.7}
            >
              <Ionicons name="location" size={24} color="#FF3366" />
              <Text style={styles.infoCardTitle}>Locație</Text>
              <Text style={styles.infoCardText}>{event.location}</Text>
              <Text style={styles.viewOnMapHint}>👆 Vezi pe hartă</Text>
            </TouchableOpacity>

            <View style={styles.infoCard}>
              <Ionicons name="time" size={24} color="#FF3366" />
              <Text style={styles.infoCardTitle}>Oră</Text>
              <Text style={styles.infoCardText}>{event.time}</Text>
            </View>

            <View style={styles.infoCard}>
              <FontAwesome5 name="money-bill-wave" size={24} color="#FF3366" />
              <Text style={styles.infoCardTitle}>Preț</Text>
              <Text style={styles.infoCardText}>{event.price}</Text>
            </View>
          </View>

          {/* Description */}
          {event.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Despre eveniment</Text>
              <Text style={styles.description}>
                {event.description || 'Vino și descoperă o experiență unică! Evenimentul promite să fie memorabil cu activități interactive, muzică live și multe surprize. Nu rata ocazia de a fi parte din această experiență extraordinară!'}
              </Text>
            </View>
          )}

          {/* Organizator */}
          {event.organizer && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Organizator</Text>
              <View style={styles.organizerCard}>
                <View style={styles.organizerIcon}>
                  <Ionicons name="person" size={24} color="#FF3366" />
                </View>
                <View style={styles.organizerInfo}>
                  <Text style={styles.organizerName}>{event.organizer}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {event.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.bottomContainer}>
        {isFreeEvent ? (
          // Eveniment gratuit — niciun bilet de cumpărat
          <View style={styles.freeBadge}>
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.buyButtonText}>Intrare liberă</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={handleBuyTicket} activeOpacity={0.8}>
            <LinearGradient
              colors={['#FF3366', '#FF6B9D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buyButton}
            >
              <Ionicons name="ticket" size={24} color="#fff" />
              {/* Link specific → cumpărare directă; altfel → căutare online */}
              <Text style={styles.buyButtonText}>
                {hasSpecificLink ? 'Cumpără bilet' : 'Caută bilete online'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#888',
    marginTop: 20,
    marginBottom: 20,
  },
  imageContainer: {
    position: 'relative',
    width: width,
    height: height * 0.4,
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  backIconButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingDateBadge: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingDateDay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3366',
  },
  floatingDateMonth: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
  },
  contentContainer: {
    padding: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF0F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  categoryBadgeText: {
    color: '#FF3366',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    lineHeight: 34,
  },
  infoCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  infoCardTitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#666',
  },
  organizerCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  organizerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF0F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  organizerInfo: {
    flex: 1,
  },
  organizerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  contactLink: {
    fontSize: 13,
    color: '#007AFF',
    marginTop: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 13,
    color: '#666',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#34C759',
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  backButton: {
    backgroundColor: '#FF3366',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  viewOnMapHint: {
    fontSize: 10,
    color: '#FF3366',
    marginTop: 4,
    fontWeight: '600',
  },
});
