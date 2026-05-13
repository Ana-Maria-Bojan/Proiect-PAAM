import React, { useState, useEffect } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getEventImage, getCategoryFallback } from '../utils/eventImage';

// Wrapper peste <Image> care:
// 1. Încearcă URL-ul imaginii din event
// 2. La eroare (404, blocat, malformat), trece la fallback-ul de categorie
// 3. La eroare și pe fallback, afișează un placeholder colorat cu icon
export default function EventImage({ event, style }) {
  const primaryUri = getEventImage(event);
  const categoryUri = getCategoryFallback(event?.category);

  const [src, setSrc] = useState(primaryUri);
  const [stage, setStage] = useState('primary'); // primary → fallback → placeholder

  // Resetează sursa dacă evenimentul se schimbă
  useEffect(() => {
    setSrc(primaryUri);
    setStage('primary');
  }, [primaryUri]);

  const handleError = () => {
    if (stage === 'primary' && primaryUri !== categoryUri) {
      setSrc(categoryUri);
      setStage('fallback');
    } else {
      setStage('placeholder');
    }
  };

  if (stage === 'placeholder') {
    return (
      <View style={[style, styles.placeholder]}>
        <Ionicons name="calendar" size={48} color="#C7C7CC" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: src }}
      style={style}
      onError={handleError}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
