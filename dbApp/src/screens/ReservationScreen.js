import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { db } from '../firebaseConfig';
import { ref, onValue, update } from 'firebase/database';

const ReservationScreen = ({ navigation, route }) => {
  const { username, bookingData } = route.params;
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slots, setSlots] = useState({});
  const [selectedFloor, setSelectedFloor] = useState('1st Floor');
  const [showFloorDropdown, setShowFloorDropdown] = useState(false);

  // Floor options
  const floors = ['1st Floor', '2nd Floor', '3rd Floor', '4th Floor'];

  // Parking slots data structure for each floor
  const floorSlots = {
    '1st Floor': {
      'A-12': { status: 'available' },
      'A-13': { status: 'available' },
      'A-14': { status: 'unavailable' },
      'A-15': { status: 'available' },
      'B-12': { status: 'unavailable' },
      'B-13': { status: 'available' },
      'B-14': { status: 'available' },
      'B-15': { status: 'unavailable' },
      'C-12': { status: 'available' },
      'C-13': { status: 'unavailable' },
      'C-14': { status: 'available' },
      'C-15': { status: 'available' },
    },
    '2nd Floor': {
      'D-01': { status: 'available' },
      'D-02': { status: 'available' },
      'D-03': { status: 'unavailable' },
      'D-04': { status: 'available' },
      'E-01': { status: 'unavailable' },
      'E-02': { status: 'available' },
      'E-03': { status: 'available' },
      'E-04': { status: 'unavailable' },
      'F-01': { status: 'available' },
      'F-02': { status: 'unavailable' },
      'F-03': { status: 'available' },
      'F-04': { status: 'available' },
    },
    '3rd Floor': {
      'G-05': { status: 'available' },
      'G-06': { status: 'available' },
      'G-07': { status: 'unavailable' },
      'G-08': { status: 'available' },
      'H-05': { status: 'unavailable' },
      'H-06': { status: 'available' },
      'H-07': { status: 'available' },
      'H-08': { status: 'unavailable' },
      'I-05': { status: 'available' },
      'I-06': { status: 'unavailable' },
      'I-07': { status: 'available' },
      'I-08': { status: 'available' },
    },
    '4th Floor': {
      'J-09': { status: 'available' },
      'J-10': { status: 'available' },
      'J-11': { status: 'unavailable' },
      'J-12': { status: 'available' },
      'K-09': { status: 'unavailable' },
      'K-10': { status: 'available' },
      'K-11': { status: 'available' },
      'K-12': { status: 'unavailable' },
      'L-09': { status: 'available' },
      'L-10': { status: 'unavailable' },
      'L-11': { status: 'available' },
      'L-12': { status: 'available' },
    }
  };

  useEffect(() => {
    // Load real-time slot data from Firebase
    const slotsRef = ref(db, 'parkingSlots');
    const unsubscribe = onValue(slotsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSlots(data);
      } else {
        // If no data in Firebase, use initial data
        setSlots(floorSlots[selectedFloor]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSlotSelection = (slotId) => {
    if (slots[slotId]?.status === 'available') {
      setSelectedSlot(slotId);
    }
  };

  const handleFloorSelection = (floor) => {
    setSelectedFloor(floor);
    setShowFloorDropdown(false);
    setSlots(floorSlots[floor] || {});
    setSelectedSlot(null);
  };

  const confirmReservation = async () => {
    if (!selectedSlot) {
      Alert.alert('Error', 'Please select an available parking slot');
      return;
    }

    try {
      const updates = {};
      updates[`parkingSlots/${selectedFloor}/${selectedSlot}/status`] = 'unavailable';
      updates[`bookings/${bookingData.id}/slotId`] = selectedSlot;
      updates[`bookings/${bookingData.id}/floor`] = selectedFloor;
      updates[`bookings/${bookingData.id}/status`] = 'confirmed';

      await update(ref(db), updates);

      Alert.alert('Success', `Parking slot ${selectedSlot} on ${selectedFloor} reserved successfully!`, [
        { 
          text: 'OK', 
          onPress: () => navigation.navigate('Home', { username }) 
        }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to reserve parking slot. Please try again.');
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>reservation</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Slot</Text>
          
          {/* Floor Selection Dropdown */}
          <View style={styles.floorSelector}>
            <Text style={styles.floorLabel}>Select Floor:</Text>
            <TouchableOpacity
              style={styles.floorDropdown}
              onPress={() => setShowFloorDropdown(!showFloorDropdown)}
            >
              <Text style={styles.floorDropdownText}>{selectedFloor}</Text>
              <Ionicons 
                name={showFloorDropdown ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="white" 
              />
            </TouchableOpacity>
          </View>

          {showFloorDropdown && (
  <View style={styles.dropdownContainer}>
    {floors.map((floor) => (
      <TouchableOpacity
        key={floor}
        style={styles.floorItem}
        onPress={() => handleFloorSelection(floor)}
      >
        <Text style={styles.floorItemText}>{floor}</Text>
      </TouchableOpacity>
    ))}
  </View>
)}

          <Text style={styles.floorTitle}>{selectedFloor}</Text>
          
          {/* Parking slots layout */}
          <View style={styles.slotsContainer}>
            {/* Row A */}
            <View style={styles.slotRow}>
              {Object.keys(slots).slice(0, 4).map(slotId => (
                <TouchableOpacity
                  key={slotId}
                  style={[
                    styles.slot,
                    slots[slotId]?.status === 'available' ? styles.availableSlot : styles.unavailableSlot,
                    selectedSlot === slotId && styles.selectedSlot
                  ]}
                  onPress={() => handleSlotSelection(slotId)}
                  disabled={slots[slotId]?.status !== 'available'}
                >
                  <Text style={styles.slotText}>{slotId}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Entrance/Exit indicators */}
            <View style={styles.entranceExitRow}>
              <Text style={styles.entranceExitText}>ENTRANCE &gt;&gt;&gt;</Text>
            </View>

            {/* Row B */}
            <View style={styles.slotRow}>
              {Object.keys(slots).slice(4, 8).map(slotId => (
                <TouchableOpacity
                  key={slotId}
                  style={[
                    styles.slot,
                    slots[slotId]?.status === 'available' ? styles.availableSlot : styles.unavailableSlot,
                    selectedSlot === slotId && styles.selectedSlot
                  ]}
                  onPress={() => handleSlotSelection(slotId)}
                  disabled={slots[slotId]?.status !== 'available'}
                >
                  <Text style={styles.slotText}>{slotId}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Exit indicator */}
            <View style={styles.entranceExitRow}>
              <Text style={styles.entranceExitText}>&lt;&lt;&lt; EXIT</Text>
            </View>

            {/* Row C */}
            <View style={styles.slotRow}>
              {Object.keys(slots).slice(8, 12).map(slotId => (
                <TouchableOpacity
                  key={slotId}
                  style={[
                    styles.slot,
                    slots[slotId]?.status === 'available' ? styles.availableSlot : styles.unavailableSlot,
                    selectedSlot === slotId && styles.selectedSlot
                  ]}
                  onPress={() => handleSlotSelection(slotId)}
                  disabled={slots[slotId]?.status !== 'available'}
                >
                  <Text style={styles.slotText}>{slotId}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.availableLegend]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.unavailableLegend]} />
            <Text style={styles.legendText}>Unavailable</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.selectedLegend]} />
            <Text style={styles.legendText}>Selected</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.confirmButton, !selectedSlot && styles.disabledButton]}
          onPress={confirmReservation}
          disabled={!selectedSlot}
        >
          <Text style={styles.confirmText}>Confirm Reservation</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#B19CD8' 
  },
  scrollContainer: { 
    padding: 25, 
    paddingTop: 60,
    alignItems: 'center'
  },
  backButton: { 
    position: 'absolute', 
    top: 40, 
    left: 20, 
    zIndex: 1, 
    padding: 8 
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 30, 
    marginTop: 20 
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: 'white', 
    textAlign: 'center',
    textTransform: 'uppercase'
  },
  section: { 
    marginBottom: 20, 
    width: '100%',
    alignItems: 'center'
  },
  sectionTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: 'white', 
    marginBottom: 10,
    textAlign: 'center'
  },
  floorSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  floorLabel: {
    fontSize: 16,
    color: 'white',
    marginRight: 10,
    fontWeight: 'bold',
  },
  floorDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'space-between',
  },
  floorDropdownText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 5,
    width: 150,
    zIndex: 10,
  },
  floorItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  floorItemText: {
    fontSize: 16,
    color: '#333',
  },
  floorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center'
  },
  slotsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 20
  },
  slot: {
    width: 70,
    height: 70,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  availableSlot: {
    backgroundColor: '#4CAF50',
  },
  unavailableSlot: {
    backgroundColor: '#F44336',
  },
  selectedSlot: {
    borderColor: '#FFD700',
    borderWidth: 3,
    transform: [{ scale: 1.1 }]
  },
  slotText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  entranceExitRow: {
    width: '80%',
    alignItems: 'center',
    marginVertical: 10
  },
  entranceExitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 30
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 5
  },
  availableLegend: {
    backgroundColor: '#4CAF50'
  },
  unavailableLegend: {
    backgroundColor: '#F44336'
  },
  selectedLegend: {
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFD700'
  },
  legendText: {
    color: 'white',
    fontSize: 14
  },
  confirmButton: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    width: '80%',
    borderWidth: 1,
    borderColor: '#B19CD8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  confirmText: { 
    color: '#B19CD8', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  disabledButton: { 
    opacity: 0.5 
  }
});

export default ReservationScreen;
