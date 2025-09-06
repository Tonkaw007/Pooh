import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
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
      'A01': { status: 'available' },
      'A02': { status: 'available' },
      'A03': { status: 'available' },
      'A04': { status: 'available' },
      'B01': { status: 'available' },
      'B02': { status: 'available' },
      'B03': { status: 'available' },
      'B04': { status: 'available' },
      'C01': { status: 'available' },
      'C02': { status: 'available' },
      'C03': { status: 'available' },
      'C04': { status: 'available' },
    },
    '2nd Floor': {
      'D01': { status: 'available' },
      'D02': { status: 'available' },
      'D03': { status: 'available' },
      'D04': { status: 'available' },
      'E01': { status: 'available' },
      'E02': { status: 'available' },
      'E03': { status: 'available' },
      'E04': { status: 'available' },
      'F01': { status: 'available' },
      'F02': { status: 'available' },
      'F03': { status: 'available' },
      'F04': { status: 'available' },
    },
    '3rd Floor': {
      'G01': { status: 'available' },
      'G02': { status: 'available' },
      'G03': { status: 'available' },
      'G08': { status: 'available' },
      'H01': { status: 'available' },
      'H02': { status: 'available' },
      'H03': { status: 'available' },
      'H04': { status: 'available' },
      'I01': { status: 'available' },
      'I02': { status: 'available' },
      'I03': { status: 'available' },
      'I04': { status: 'available' },
    },
    '4th Floor': {
      'J01': { status: 'available' },
      'J02': { status: 'available' },
      'J03': { status: 'available' },
      'J04': { status: 'available' },
      'K01': { status: 'available' },
      'K02': { status: 'available' },
      'K03': { status: 'available' },
      'K04': { status: 'available' },
      'L01': { status: 'available' },
      'L02': { status: 'available' },
      'L03': { status: 'available' },
      'L04': { status: 'available' },
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
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Choose Slot</Text>
        </View>

        <View style={styles.section}>
          
          
          {/* Improved Floor Selection */}
          <View style={styles.floorSelectorContainer}>
            
            <TouchableOpacity
              style={styles.floorDropdown}
              onPress={() => setShowFloorDropdown(true)}
            >
              <Text style={styles.floorDropdownText}>{selectedFloor}</Text>
              <Ionicons 
                name="chevron-down" 
                size={20} 
                color="white" 
              />
            </TouchableOpacity>
          </View>

          <Modal
            visible={showFloorDropdown}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowFloorDropdown(false)}
          >
            <TouchableOpacity 
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowFloorDropdown(false)}
            >
              <View style={styles.modalContent}>
                <View style={styles.dropdownContainer}>
                  {floors.map((floor) => (
                    <TouchableOpacity
                      key={floor}
                      style={[
                        styles.floorItem,
                        selectedFloor === floor && styles.selectedFloorItem
                      ]}
                      onPress={() => handleFloorSelection(floor)}
                    >
                      <Text style={[
                        styles.floorItemText,
                        selectedFloor === floor && styles.selectedFloorItemText
                      ]}>{floor}</Text>
                      {selectedFloor === floor && (
                        <Ionicons name="checkmark" size={18} color="#B19CD8" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          </Modal>

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
        padding: 24,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
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
    color: '#333', 
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  section: { 
    marginBottom: 20, 
    width: '100%',
    alignItems: 'center'
  },
  floorSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'center',
    width: '100%',
  },
  floorLabel: {
    fontSize: 18,
    color: 'white',
    marginRight: 15,
    fontWeight: 'bold',
  },
  floorDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B19CD8',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    minWidth: 140,
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#B19CD8',
  },
  floorDropdownText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownContainer: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  floorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedFloorItem: {
    backgroundColor: '#f0e6ff',
  },
  floorItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedFloorItemText: {
    color: '#B19CD8',
    fontWeight: 'bold',
  },
  floorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 25,
    textAlign: 'center',
    marginTop: 10,
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
    height: 50,
    borderRadius: 8,
    marginHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availableSlot: {
    backgroundColor: '#93DA97',
  },
  unavailableSlot: {
    backgroundColor: '#F7CAC9',
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
    color: 'black',
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
    backgroundColor: '#93DA97'
  },
  unavailableLegend: {
    backgroundColor: '#F7CAC9'
  },
  selectedLegend: {
    backgroundColor: '#93DA97',
    borderWidth: 2,
    borderColor: '#FFD700'
  },
  legendText: {
    color: 'black',
    fontSize: 14
  },
  confirmButton: {
    backgroundColor: '#B19CD8',
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
    color: 'white', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  disabledButton: { 
    opacity: 0.5 
  }
});

export default ReservationScreen;