import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

// Import tabs
import Exploreaza from './tabs/Exploreaza';
import Harta from './tabs/Harta';
import Publica from './tabs/Publica';
import Favorite from './tabs/Favorite';
import Cont from './tabs/Cont';

export default function App() {
  const [activeTab, setActiveTab] = useState('exploreaza');

  const renderContent = () => {
    switch(activeTab) {
      case 'exploreaza':
        return <Exploreaza />;
      case 'harta':
        return <Harta />;
      case 'publica':
        return <Publica />;
      case 'favorite':
        return <Favorite />;
      case 'cont':
        return <Cont />;
      default:
        return <Exploreaza />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {renderContent()}
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.footerButton}
          onPress={() => setActiveTab('exploreaza')}
        >
          <Ionicons 
            name="compass-outline" 
            size={28} 
            color={activeTab === 'exploreaza' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[
            styles.footerButtonText,
            activeTab === 'exploreaza' && styles.activeText
          ]}>
            Explorează
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.footerButton}
          onPress={() => setActiveTab('harta')}
        >
          <Ionicons 
            name="map-outline" 
            size={28} 
            color={activeTab === 'harta' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[
            styles.footerButtonText,
            activeTab === 'harta' && styles.activeText
          ]}>
            Hartă
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.footerButton}
          onPress={() => setActiveTab('publica')}
        >
          <Ionicons 
            name="add-circle-outline" 
            size={28} 
            color={activeTab === 'publica' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[
            styles.footerButtonText,
            activeTab === 'publica' && styles.activeText
          ]}>
            Publică
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.footerButton}
          onPress={() => setActiveTab('favorite')}
        >
          <Ionicons 
            name="heart-outline" 
            size={28} 
            color={activeTab === 'favorite' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[
            styles.footerButtonText,
            activeTab === 'favorite' && styles.activeText
          ]}>
            Favorite
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.footerButton}
          onPress={() => setActiveTab('cont')}
        >
          <Ionicons 
            name="person-outline" 
            size={28} 
            color={activeTab === 'cont' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[
            styles.footerButtonText,
            activeTab === 'cont' && styles.activeText
          ]}>
            Cont
          </Text>
        </TouchableOpacity>
      </View>
      
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingBottom: 20,
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  footerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  footerButtonText: {
    fontSize: 11,
    marginTop: 4,
    color: '#8E8E93',
  },
  activeText: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
