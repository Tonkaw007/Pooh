import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView } from 'react-native';

const BookingTypeScreen = ({ navigation, route }) => {
  const [selectedType, setSelectedType] = useState(null);

  const username = route.params?.username || 'User'; // รับ username จาก LoginScreen

  const handleContinue = () => {
    if (selectedType === 'resident') {
      navigation.navigate('Parking', { username, bookingType: selectedType });
    } else if (selectedType === 'visitor') {
      navigation.navigate('NextScreen', { username, bookingType: selectedType });
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Select Type</Text>
      </View>

      {/* Options */}
      <TouchableOpacity
        style={[styles.optionBox, selectedType === 'resident' && styles.selectedBox]}
        onPress={() => setSelectedType('resident')}
      >
        <Text style={styles.optionTitle}>Resident</Text>
        <Text style={styles.optionSubtitle}>Book for yourself</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.optionBox, selectedType === 'visitor' && styles.selectedBox]}
        onPress={() => setSelectedType('visitor')}
      >
        <Text style={styles.optionTitle}>Visitor</Text>
        <Text style={styles.optionSubtitle}>Invite a guest</Text>
      </TouchableOpacity>

      {/* Continue Button */}
      <TouchableOpacity
        style={[styles.continueButton, !selectedType && styles.disabledButton]}
        onPress={handleContinue}
        disabled={!selectedType}
      >
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

export default BookingTypeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: "#B19CD8",
    padding: 25,
  },
  header: {
    alignItems: "center",
    marginBottom: 30, 
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  optionBox: {
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  selectedBox: {
    borderColor: '#007BFF',
    backgroundColor: '#e6f0ff',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  continueButton: {
  backgroundColor: '#fff', 
  padding: 16,
  borderRadius: 15,         
  alignItems: 'center',
  marginTop: 20,
  borderWidth: 1,
  borderColor: '#B19CD8',  
},
continueText: {
  color: '#B19CD8',       
  fontSize: 18,
  fontWeight: 'bold',
},
disabledButton: {
  backgroundColor: '#fff',

},

});
