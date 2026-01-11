import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, Dimensions, Modal, FlatList, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Categories excluding 'Fluxul meu'
const CATEGORIES = ['Festival', 'Concerte', 'Teatru', 'Sport', 'Social', 'Altele'];

export default function Publica() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  
  // Date & Time Logic
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Category Logic
  const [category, setCategory] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Image Logic
  const [image, setImage] = useState(null);
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  // Date Picker Components (Custom since packages are missing)
  const [tempDay, setTempDay] = useState('');
  const [tempMonth, setTempMonth] = useState('');
  const [tempYear, setTempYear] = useState('');
  
  // Time Picker Components
  const [tempHour, setTempHour] = useState('');
  const [tempMinute, setTempMinute] = useState('');

  const handleSaveDate = () => {
    if (tempDay && tempMonth && tempYear) {
      setDate(`${tempDay}/${tempMonth}/${tempYear}`);
      setShowDatePicker(false);
    }
  };

  const handleSaveTime = () => {
    if (tempHour && tempMinute) {
      setTime(`${tempHour}:${tempMinute}`);
      setShowTimePicker(false);
    }
  };

  const handleSaveImage = () => {
    if (imageUrl) {
      setImage(imageUrl);
      setShowImageInput(false);
    }
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.modalItem}
      onPress={() => {
        setCategory(item);
        setShowCategoryPicker(false);
      }}
    >
      <Text style={[styles.modalItemText, category === item && styles.selectedModalItemText]}>
        {item}
      </Text>
      {category === item && <Ionicons name="checkmark" size={20} color="#5E35B1" />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#7E57C2', '#EC407A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Publică Eveniment</Text>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          
          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Titlul Evenimentului</Text>
            <TextInput
              style={styles.input}
              placeholder="Introdu titlul evenimentului"
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descriere</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Scrie o descriere pentru evenimentul tău..."
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Locație</Text>
            <View style={styles.inputWithIconContainer}>
              <Ionicons name="location" size={20} color="#7E57C2" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Introdu locația evenimentului"
                placeholderTextColor="#9CA3AF"
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>

          {/* Date & Time */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Data & Ora</Text>
            <View style={styles.row}>
              <TouchableOpacity 
                style={styles.dateInputContainer}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#7E57C2" style={styles.inputIcon} />
                <Text style={[styles.dateText, !date && styles.placeholderText]}>
                  {date || 'Selectează data'}
                </Text>
              </TouchableOpacity>
              
              <Text style={styles.separator}>:</Text>

              <TouchableOpacity 
                style={styles.dateInputContainer}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color="#7E57C2" style={styles.inputIcon} />
                <Text style={[styles.dateText, !time && styles.placeholderText]}>
                  {time || 'Selectează ora'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Category */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Categorie</Text>
            <TouchableOpacity 
              style={styles.dropdownInput}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Text style={[styles.dropdownText, !category && styles.placeholderText]}>
                {category || 'Alege categoria'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Image Upload */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Imagine Eveniment</Text>
            <TouchableOpacity 
              style={styles.uploadContainer}
              onPress={() => setShowImageInput(true)}
            >
              {image ? (
                <Image source={{ uri: image }} style={styles.uploadedImage} />
              ) : (
                <>
                  <View style={styles.cameraIconContainer}>
                    <Ionicons name="camera" size={30} color="#fff" />
                  </View>
                  <View style={styles.uploadButton}>
                    <Text style={styles.uploadButtonText}>Adaugă Fotografii</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Publică Eveniment</Text>
          </TouchableOpacity>

        </View>
        <View style={{height: 100}} />
      </ScrollView>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alege Categoria</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CATEGORIES}
              renderItem={renderCategoryItem}
              keyExtractor={item => item}
            />
          </View>
        </View>
      </Modal>

      {/* Custom Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.modalTitle}>Selectează Data</Text>
            <View style={styles.dateTimeRow}>
              <TextInput 
                style={styles.dateInput} 
                placeholder="ZZ" 
                keyboardType="numeric"
                maxLength={2}
                onChangeText={setTempDay}
              />
              <Text>/</Text>
              <TextInput 
                style={styles.dateInput} 
                placeholder="LL" 
                keyboardType="numeric"
                maxLength={2}
                onChangeText={setTempMonth}
              />
              <Text>/</Text>
              <TextInput 
                style={[styles.dateInput, {width: 60}]} 
                placeholder="AAAA" 
                keyboardType="numeric"
                maxLength={4}
                onChangeText={setTempYear}
              />
            </View>
            <TouchableOpacity style={styles.modalButton} onPress={handleSaveDate}>
              <Text style={styles.modalButtonText}>Salvează</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.modalTitle}>Selectează Ora</Text>
            <View style={styles.dateTimeRow}>
              <TextInput 
                style={styles.dateInput} 
                placeholder="HH" 
                keyboardType="numeric"
                maxLength={2}
                onChangeText={setTempHour}
              />
              <Text>:</Text>
              <TextInput 
                style={styles.dateInput} 
                placeholder="MM" 
                keyboardType="numeric"
                maxLength={2}
                onChangeText={setTempMinute}
              />
            </View>
            <TouchableOpacity style={styles.modalButton} onPress={handleSaveTime}>
              <Text style={styles.modalButtonText}>Salvează</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Image Input Modal (Fallback) */}
      <Modal
        visible={showImageInput}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageInput(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.modalTitle}>Link Imagine</Text>
            <TextInput 
              style={[styles.input, {width: '100%', marginBottom: 15}]} 
              placeholder="https://..." 
              value={imageUrl}
              onChangeText={setImageUrl}
            />
            <TouchableOpacity style={styles.modalButton} onPress={handleSaveImage}>
              <Text style={styles.modalButtonText}>Adaugă</Text>
            </TouchableOpacity>
            <Text style={styles.hintText}>*Funcția de încărcare din galerie nu este disponibilă momentan.</Text>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingTop: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputWithIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
    marginLeft: 8,
  },
  inputIcon: {
    marginRight: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  dateText: {
    fontSize: 14,
    color: '#1F2937',
    marginLeft: 8,
  },
  separator: {
    marginRight: 10,
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  dropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dropdownText: {
    fontSize: 14,
    color: '#1F2937',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  uploadContainer: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 16,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cameraIconContainer: {
    width: 60,
    height: 45,
    backgroundColor: '#5E35B1',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: '#7E57C2',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#5E35B1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#5E35B1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%',
  },
  pickerModalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    // Centered modal for Date/Time/Image
    alignSelf: 'center',
    width: '80%',
    position: 'absolute',
    top: '30%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedModalItemText: {
    color: '#5E35B1',
    fontWeight: 'bold',
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    width: 50,
    textAlign: 'center',
    fontSize: 18,
  },
  modalButton: {
    backgroundColor: '#5E35B1',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  hintText: {
    fontSize: 12,
    color: '#888',
    marginTop: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  }
});
