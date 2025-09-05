import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db } from '../firebaseConfig';
import { ref, push, set } from 'firebase/database';
import Ionicons from 'react-native-vector-icons/Ionicons';

const BookParkingScreen = ({ navigation, route }) => {
  const { username, bookingType } = route.params;
  const [selectedRate, setSelectedRate] = useState(null);

  // Common states
  const [entryDate, setEntryDate] = useState(new Date());
  const [entryTime, setEntryTime] = useState(new Date());
  const [exitDate, setExitDate] = useState(new Date());
  const [exitTime, setExitTime] = useState(new Date());
  const [durationMonths, setDurationMonths] = useState(1);

  const [pickerMode, setPickerMode] = useState(null); // "entryDate", "entryTime", "exitDate", "exitTime"
  const [showPicker, setShowPicker] = useState(false);

  const rates = [
    { id: 'hourly', label: 'Hourly', price: '40 baht/hour' },
    { id: 'daily', label: 'Daily', price: '250 baht/day' },
    { id: 'monthly', label: 'Monthly', price: '3,000 baht/month' }
  ];

  const onChangeDateTime = (event, selectedValue) => {
    setShowPicker(false);
    if (!selectedValue) return;
    switch (pickerMode) {
      case 'entryDate':
        setEntryDate(selectedValue);
        break;
      case 'entryTime':
        setEntryTime(selectedValue);
        break;
      case 'exitDate':
        setExitDate(selectedValue);
        break;
      case 'exitTime':
        setExitTime(selectedValue);
        break;
    }
  };

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatTime = (time) =>
    time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const handleSearch = async () => {
    if (!selectedRate) {
      Alert.alert('Error', 'Please select a parking rate');
      return;
    }

    try {
      const bookingRef = push(ref(db, 'bookings'));
      let bookingData = {
        username,
        bookingType,
        rateType: selectedRate,
        createdAt: new Date().toISOString(),
      };

      if (selectedRate === 'hourly') {
        bookingData.entryDate = entryDate.toISOString();
        bookingData.entryTime = entryTime.toISOString();
        bookingData.exitDate = exitDate.toISOString();
        bookingData.exitTime = exitTime.toISOString();
      } else if (selectedRate === 'daily') {
        bookingData.entryDate = entryDate.toISOString();
        bookingData.exitDate = exitDate.toISOString();
      } else if (selectedRate === 'monthly') {
        bookingData.entryDate = entryDate.toISOString();
        bookingData.durationMonths = durationMonths;
      }

      await set(bookingRef, bookingData);

      Alert.alert('Success', 'Parking booked successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Home', { username }) }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to book parking. Please try again.');
    }
  };

  const handleBack = () => {
    navigation.navigate('BookingType', { username });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Book Parking</Text>
        </View>

        {/* Rate Selection */}
        <View style={styles.section}>
          
          <View style={styles.ratesContainer}>
            {rates.map((rate) => (
              <TouchableOpacity
                key={rate.id}
                style={[
                  styles.rateButton,
                  selectedRate === rate.id && styles.selectedRateButton
                ]}
                onPress={() => setSelectedRate(rate.id)}
              >
                <Text
                  style={[
                    styles.rateLabel,
                    selectedRate === rate.id && styles.selectedRateLabel
                  ]}
                >
                  {rate.label}
                </Text>
                <Text
                  style={[
                    styles.ratePrice,
                    selectedRate === rate.id && styles.selectedRatePrice
                  ]}
                >
                  {rate.price}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dynamic Inputs */}
        {selectedRate === 'hourly' && (
          <View style={styles.inputGroup}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Entry Date</Text>
              <TouchableOpacity
               style={styles.dateTimeBox}
               onPress={() => {
               setPickerMode('entryDate');
               setShowPicker(true);
             }}
            >
       <Text style={styles.dateTimeValue}>{formatDate(entryDate)}</Text>
       <Ionicons name="calendar" size={22} color="#B19CD8" style={{ marginLeft: 10 }} />
</TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Entry Time</Text>
              <TouchableOpacity
                style={styles.dateTimeBox}
                onPress={() => {
                  setPickerMode('entryTime');
                  setShowPicker(true);
                }}
              >
                <Text style={styles.dateTimeValue}>{formatTime(entryTime)}</Text>
                <Ionicons name="time" size={22} color="#B19CD8" style={{ marginLeft: 10 }} />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Exit Date</Text>
              <TouchableOpacity
                style={styles.dateTimeBox}
                onPress={() => {
                  setPickerMode('exitDate');
                  setShowPicker(true);
                }}
              >
                <Text style={styles.dateTimeValue}>{formatDate(exitDate)}</Text>
                <Ionicons name="calendar" size={22} color="#B19CD8" style={{ marginLeft: 10 }} />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Exit Time</Text>
              <TouchableOpacity
                style={styles.dateTimeBox}
                onPress={() => {
                  setPickerMode('exitTime');
                  setShowPicker(true);
                }}
              >
                <Text style={styles.dateTimeValue}>{formatTime(exitTime)}</Text>
                <Ionicons name="time" size={22} color="#B19CD8" style={{ marginLeft: 10 }} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {selectedRate === 'daily' && (
          <View style={styles.inputGroup}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Entry Date</Text>
              <TouchableOpacity
                style={styles.dateTimeBox}
                onPress={() => {
                  setPickerMode('entryDate');
                  setShowPicker(true);
                }}
              >
                <Text style={styles.dateTimeValue}>{formatDate(entryDate)}</Text>
                <Ionicons name="calendar" size={22} color="#B19CD8" style={{ marginLeft: 10 }} />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Exit Date</Text>
              <TouchableOpacity
                style={styles.dateTimeBox}
                onPress={() => {
                  setPickerMode('exitDate');
                  setShowPicker(true);
                }}
              >
                <Text style={styles.dateTimeValue}>{formatDate(exitDate)}</Text>
                <Ionicons name="calendar" size={22} color="#B19CD8" style={{ marginLeft: 10 }} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {selectedRate === 'monthly' && (
          <View style={styles.inputGroup}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Entry Date</Text>
              <TouchableOpacity
                style={styles.dateTimeBox}
                onPress={() => {
                  setPickerMode('entryDate');
                  setShowPicker(true);
                }}
              >
                <Text style={styles.dateTimeValue}>{formatDate(entryDate)}</Text>
                <Ionicons name="calendar" size={22} color="#B19CD8" style={{ marginLeft: 10 }} />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Duration (months)</Text>
              <View style={styles.durationContainer}>
                {[1, 2, 3].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.durationButton,
                      durationMonths === m && styles.selectedDuration
                    ]}
                    onPress={() => setDurationMonths(m)}
                  >
                    <Text
                      style={[
                        styles.durationText,
                        durationMonths === m && styles.selectedDurationText
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.searchButton, !selectedRate && styles.disabledButton]}
          onPress={handleSearch}
          disabled={!selectedRate}
        >
          <Text style={styles.searchText}>Search</Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={
              pickerMode?.includes('Date')
                ? entryDate
                : pickerMode?.includes('Time')
                ? entryTime
                : new Date()
            }
            mode={pickerMode?.includes('Date') ? 'date' : 'time'}
            is24Hour={false}
            display="default"
            onChange={onChangeDateTime}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#B19CD8' },
  scrollContainer: { padding: 25, paddingTop: 60 },
  backButton: { position: 'absolute', top: 40, left: 20, zIndex: 1, padding: 8 },
  header: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: 'white', textAlign: 'center' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8},
  ratesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 10 },
  rateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 20,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedRateButton: { backgroundColor: 'white', borderColor: '#007BFF' },
  rateLabel: { fontSize: 16, fontWeight: 'bold', color: 'white' },
  selectedRateLabel: { color: '#B19CD8' },
  ratePrice: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', marginTop: 4 },
  selectedRatePrice: { color: '#666' },
  inputGroup: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  dateTimeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#aaa',   
  },
  dateTimeValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  durationContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  durationButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 5,
  },
  selectedDuration: { backgroundColor: '#B19CD8' },
  durationText: { fontSize: 16, color: '#333', fontWeight: 'bold' },
  selectedDurationText: { color: 'white' },
  searchButton: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 30,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#B19CD8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchText: { color: '#B19CD8', fontSize: 20, fontWeight: 'bold' },
  disabledButton: { opacity: 0.5 },
});

export default BookParkingScreen;