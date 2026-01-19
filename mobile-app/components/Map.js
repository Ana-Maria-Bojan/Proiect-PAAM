import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Dimensions, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';
import PropTypes from 'prop-types';
import * as Location from 'expo-location';

// Funcție pentru calcularea distanței între două puncte (formula Haversine)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Raza Pământului în km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
};

export default function Map({ location, targetEvent, onClearTarget }) {
  if (!location) return null;

  const mapRef = useRef(null);
  const [eventCoords, setEventCoords] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  
  // Geocodează adresa evenimentului când se schimbă targetEvent
  useEffect(() => {
    if (!targetEvent) {
      setEventCoords(null);
      return;
    }

    const geocodeAddress = async () => {
      try {
        setGeocoding(true);
        console.log('Geocoding adresa:', targetEvent.location);
        
        const results = await Location.geocodeAsync(targetEvent.location);
        
        if (results && results.length > 0) {
          const coords = {
            latitude: results[0].latitude,
            longitude: results[0].longitude,
          };
          console.log('Coordonate găsite:', coords);
          setEventCoords(coords);
        } else {
          console.log('Nu s-au găsit coordonate pentru:', targetEvent.location);
          // Fallback la centrul Timișoarei
          setEventCoords({ latitude: 45.7489, longitude: 21.2272 });
        }
      } catch (error) {
        console.error('Eroare la geocoding:', error);
        // Fallback la centrul Timișoarei
        setEventCoords({ latitude: 45.7489, longitude: 21.2272 });
      } finally {
        setGeocoding(false);
      }
    };

    geocodeAddress();
  }, [targetEvent]);

  const distance = useMemo(() => {
    if (!eventCoords) return null;
    return calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      eventCoords.latitude,
      eventCoords.longitude
    );
  }, [location, eventCoords]);

  const region = useMemo(() => {
    if (!eventCoords) {
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    
    // Calculează bounds pentru a include ambele puncte
    const minLat = Math.min(location.coords.latitude, eventCoords.latitude);
    const maxLat = Math.max(location.coords.latitude, eventCoords.latitude);
    const minLon = Math.min(location.coords.longitude, eventCoords.longitude);
    const maxLon = Math.max(location.coords.longitude, eventCoords.longitude);
    
    const latDelta = (maxLat - minLat) * 1.8;
    const lonDelta = (maxLon - minLon) * 1.8;
    
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(latDelta, 0.02),
      longitudeDelta: Math.max(lonDelta, 0.02),
    };
  }, [location, eventCoords]);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(region, 500);
    }
  }, [region]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Marker pentru eveniment */}
        {eventCoords && (
          <>
            <Marker
              coordinate={eventCoords}
              pinColor="#FF3366"
              title={targetEvent?.title}
              description={targetEvent?.location}
            />
            {/* Linie între locația ta și eveniment */}
            <Polyline
              coordinates={[
                { latitude: location.coords.latitude, longitude: location.coords.longitude },
                eventCoords,
              ]}
              strokeColor="#FF3366"
              strokeWidth={3}
              lineDashPattern={[5, 5]}
            />
          </>
        )}
      </MapView>
      
      {/* Info panel pentru evenimentul țintă */}
      {targetEvent && (
        <View style={styles.infoPanel}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClearTarget}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          
          {geocoding ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FF3366" />
              <Text style={styles.loadingText}>Căutare locație...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.infoPanelTitle}>{targetEvent.title}</Text>
              {distance && (
                <Text style={styles.infoPanelDistance}>📍 {distance.toFixed(2)} km distanță</Text>
              )}
              <Text style={styles.infoPanelLocation}>{targetEvent.location}</Text>
              <Text style={styles.infoPanelTime}>🕐 {targetEvent.time}</Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

Map.propTypes = {
  location: PropTypes.shape({
    coords: PropTypes.shape({
      latitude: PropTypes.number.isRequired,
      longitude: PropTypes.number.isRequired,
    }).isRequired,
  }),
  targetEvent: PropTypes.object,
  onClearTarget: PropTypes.func,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
  infoPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  infoPanelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  infoPanelDistance: {
    fontSize: 16,
    color: '#FF3366',
    fontWeight: '600',
    marginBottom: 4,
  },
  infoPanelLocation: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  infoPanelTime: {
    fontSize: 13,
    color: '#666',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
});
