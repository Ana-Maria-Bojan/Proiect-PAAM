import React, { useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import PropTypes from 'prop-types';

// Componenta care actualizează centrul hărții când se schimbă locația
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

MapUpdater.propTypes = {
  center: PropTypes.arrayOf(PropTypes.number).isRequired,
};

// Fix for default marker icon in Leaflet with React
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function Map({ location }) {
  useEffect(() => {
    // Inject Leaflet CSS only if not present
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  if (!location) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const position = [location.coords.latitude, location.coords.longitude];

  return (
    <View style={styles.container}>
      {/* @ts-ignore - MapContainer types might conflict with View but it works in web */}
      <div style={{ height: '100%', width: '100%' }}>
        <MapContainer 
          center={position} 
          zoom={15} 
          style={{ height: '100%', width: '100%' }}
        >
          <MapUpdater center={position} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position} icon={icon}>
            <Popup>
              Te afli aici.
            </Popup>
          </Marker>
        </MapContainer>
      </div>
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
