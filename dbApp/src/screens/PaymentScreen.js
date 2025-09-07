import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db } from '../firebaseConfig';
import { ref, push, set } from 'firebase/database';
import Ionicons from 'react-native-vector-icons/Ionicons';

const PaymentScreen = ({ navigation, route }) => {
  const { username, reservationDetails } = route.params;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Display reservation details
  console.log('Reservation Details:', reservationDetails);

  // Format date and time for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timeString) => {
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handlePayment = () => {
    // Handle payment logic here
    Alert.alert('Payment', 'Payment functionality will be implemented here');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Render different information based on rate type
  const renderRateSpecificInfo = () => {
    switch (reservationDetails.rateType) {
      case 'hourly':
        return (
          <>
            <Text>Entry Date: {formatDate(reservationDetails.entryDate)}</Text>
            <Text>Entry Time: {formatTime(reservationDetails.entryTime)}</Text>
            <Text>Exit Date: {formatDate(reservationDetails.exitDate)}</Text>
            <Text>Exit Time: {formatTime(reservationDetails.exitTime)}</Text>
          </>
        );
      case 'daily':
        return (
          <>
            <Text>Entry Date: {formatDate(reservationDetails.entryDate)}</Text>
            <Text>Exit Date: {formatDate(reservationDetails.exitDate)}</Text>
          </>
        );
      case 'monthly':
        return (
          <>
            <Text>Entry Date: {formatDate(reservationDetails.entryDate)}</Text>
            <Text>Duration: {reservationDetails.durationMonths} months</Text>
          </>
        );
      default:
        return null;
    }
  };

  // Get rate label for display
  const getRateLabel = () => {
    switch (reservationDetails.rateType) {
      case 'hourly': return 'Hourly';
      case 'daily': return 'Daily';
      case 'monthly': return 'Monthly';
      default: return reservationDetails.rateType;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Payment</Text>
        </View>

        {/* Display Reservation Details */}
        <View style={styles.reservationDetails}>
          <Text style={styles.detailTitle}>Reservation Details:</Text>
          <Text style={styles.detailItem}>Booking ID: {reservationDetails.id}</Text>
          <Text style={styles.detailItem}>License Plate: {reservationDetails.licensePlate}</Text>
          <Text style={styles.detailItem}>User: {username}</Text>
          <Text style={styles.detailItem}>Rate Type: {getRateLabel()}</Text>
          
          {/* Rate-specific information */} 
          {renderRateSpecificInfo()}
          
          <Text style={styles.detailItem}>Floor: {reservationDetails.floor}</Text>
          <Text style={styles.detailItem}>Slot: {reservationDetails.slotId}</Text>
          <Text style={styles.detailItem}>Total: {reservationDetails.total} baht</Text>
        </View>

        {/* Payment form will go here */}
        <TouchableOpacity
          style={styles.payButton}
          onPress={handlePayment}
        >
          <Text style={styles.payButtonText}>Proceed to Payment</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
  },
  reservationDetails: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#2D3748',
  },
  detailItem: {
    fontSize: 16,
    marginBottom: 8,
    color: '#4A5568',
  },
  payButton: {
    backgroundColor: '#B19CD8',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default PaymentScreen;