import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

export default function Map({ location }) {
  if (!location) return null;
  
  return (
    <MapView
      style={styles.map}
      provider={PROVIDER_GOOGLE}
      initialRegion={{
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }}
      showsUserLocation={true}
    >
      <Marker
        coordinate={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }}
        title={"Locația ta"}
        description={"Te afli aici"}
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
});
