import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import PropTypes from 'prop-types';

export default function Map({ location }) {
  if (!location) return null;

  const mapRef = useRef(null);

  const region = useMemo(
    () => ({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }),
    [location.coords.latitude, location.coords.longitude]
  );

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(region, 350);
    }
  }, [region]);

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      provider={PROVIDER_GOOGLE}
      initialRegion={region}
      showsUserLocation={true}
      showsMyLocationButton={true}
    >
      {/* Am scos marker-ul manual pentru a lăsa punctul albastru nativ (mai precis) */}
    </MapView>
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
  map: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
});
