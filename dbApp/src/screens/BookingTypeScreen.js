import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, TouchableOpacity } from "react-native";
import { db } from '../firebaseConfig';
import { ref, get, child } from 'firebase/database';

const BookingTypeScreen = ({ navigation, route }) => {
  const [selectedType, setSelectedType] = useState(null);
  const username = route.params?.username || 'User';

  // ตรวจสอบจำนวน visitor
  const checkVisitorLimit = async () => {
    try {
      const snapshot = await get(child(ref(db), 'visitors'));
      let visitorCount = 0;
      if (snapshot.exists()) {
        const data = snapshot.val();
        visitorCount = Object.values(data).filter(
          (item) => item.createdBy === username
        ).length;
      }

      if (visitorCount >= 3) {
        Alert.alert('Limit Reached', 'You cannot register more than 3 visitors.');
        return false;
      }
      return true;
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Unable to check visitor limit.');
      return false;
    }
  };

  // ตรวจสอบจำนวน booking วันนี้
  const handleContinue = async () => {
    try {
      const snapshot = await get(child(ref(db), 'bookings'));
      let allBookings = [];
      if (snapshot.exists()) {
        allBookings = Object.values(snapshot.val()).filter(
          b => b.status !== 'cancelled' // เอาเฉพาะ booking ที่ยัง active
        );
      }

      const todayStr = new Date().toISOString().split('T')[0];

      const todaysBookings = allBookings.filter(b => {
        try {
          if (!b.bookingDate) return false;
          const bookingDateStr = b.bookingDate.substring(0, 10); // YYYY-MM-DD
          return bookingDateStr === todayStr;
        } catch {
          return false;
        }
      });

      if (todaysBookings.length >= 5) {
        Alert.alert('Booking Limit Reached', 'You cannot make more than 5 active bookings today.');
        return;
      }

      if (selectedType === 'resident') {
        navigation.navigate('BookParking', { username, bookingType: selectedType });
      } else if (selectedType === 'visitor') {
        const canBookVisitor = await checkVisitorLimit();
        if (canBookVisitor) {
          navigation.navigate('VisitorRegister', { username, bookingType: selectedType });
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Unable to check bookings.');
    }
  };

  const handleGoMyParking = () => {
    navigation.navigate('MyParking', { username });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <View style={styles.header}>
        <Text style={styles.title}>Select Type</Text>
      </View>

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

      <TouchableOpacity
        style={[styles.continueButton, !selectedType && styles.disabledButton]}
        onPress={handleContinue}
        disabled={!selectedType}
      >
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleGoMyParking}>
        <Text style={styles.myParkingText}>MyParking</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#B19CD8',
    padding: 25,
  },
  header: {
    alignItems: 'center',
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  optionSubtitle: {
    fontSize: 16,
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
  myParkingText: {
    marginTop: 15,
    fontSize: 16,
    color: 'white',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});

export default BookingTypeScreen;
