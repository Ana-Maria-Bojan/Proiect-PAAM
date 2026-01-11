import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import Map from '../components/Map';

export default function Harta() {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('Se localizează...');
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  const updateAddress = async (loc) => {
    try {
      // Dacă durează prea mult, afișăm coordonatele
      let timeout = setTimeout(() => {
        setAddress(`Lat: ${loc.coords.latitude.toFixed(4)}, Long: ${loc.coords.longitude.toFixed(4)}`);
      }, 5000);

      let ret = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      
      clearTimeout(timeout);

      if (ret.length > 0) {
        let addr = ret[0];
        let street = addr.street || '';
        let number = addr.streetNumber || '';
        let city = addr.city || '';
        // Dacă nu avem stradă, afișăm zona/cartierul
        if (!street) street = addr.district || addr.region || 'Locație necunoscută';
        
        setAddress(`${street} ${number}, ${city}`.trim());
      } else {
        setAddress(`Lat: ${loc.coords.latitude.toFixed(4)}, Long: ${loc.coords.longitude.toFixed(4)}`);
      }
    } catch (e) {
      console.log('Eroare la geocodare:', e);
      setAddress(`Lat: ${loc.coords.latitude.toFixed(4)}, Long: ${loc.coords.longitude.toFixed(4)}`);
    }
  };

  useEffect(() => {
    let subscription;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Nu am primit permisiunea pentru locație.');
        setLoading(false);
        return;
      }

      let enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setErrorMsg('Te rog activează GPS-ul.');
        setLoading(false);
        return;
      }

      // 1. Obținem poziția inițială cu precizie MAXIMĂ (poate dura 1-2 secunde mai mult)
      try {
        let initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest, 
        });
        setLocation(initialLocation);
        updateAddress(initialLocation);
        setLoading(false);
      } catch (err) {
        console.log("Eroare la initial location:", err);
      }

      // 2. Urmărim poziția în timp real
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 2000,
          distanceInterval: 2, 
        },
        (newLocation) => {
          setLocation(newLocation);
          updateAddress(newLocation);
        }
      );
    })();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hartă</Text>
        {location && (
          <Text style={styles.subtitle}>📍 {address}</Text>
        )}
      </View>
      
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : location ? (
          <Map location={location} />
        ) : (
           <Text>Se încarcă harta...</Text>
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
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    zIndex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    padding: 20,
    textAlign: 'center',
  },
});
