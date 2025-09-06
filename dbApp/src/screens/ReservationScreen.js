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
      'G04': { status: 'available' },
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
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Choose Parking Slot</Text>
        </View>

        <View style={styles.section}>
          {/* Floor Selection */}
          <View style={styles.floorSelectorContainer}>
            <TouchableOpacity
              style={styles.floorDropdown}
              onPress={() => setShowFloorDropdown(true)}
            >
              <Text style={styles.floorDropdownText}>{selectedFloor}</Text>
              <Ionicons 
                name="chevron-down" 
                size={20} 
                color="#fff" 
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

          {/* Simple Parking Layout */}
          <View style={styles.parkingLayout}>
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

            {/* Simple Entrance Indicator */}
            <View style={styles.entranceExitRow}>
              <Text style={styles.entranceExitText}> ENTRANCE &gt;&gt;&gt; </Text>
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

            {/* Simple Exit Indicator */}
            <View style={styles.entranceExitRow}>
              <Text style={styles.entranceExitText}>&lt;&lt;&lt; EXIT </Text>
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

        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.availableLegend]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.unavailableLegend]} />
            <Text style={styles.legendText}>Occupied</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.selectedLegend]} />
            <Text style={styles.legendText}>Selected</Text>
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmButton, !selectedSlot && styles.disabledButton]}
          onPress={confirmReservation}
          disabled={!selectedSlot}
        >
          <Text style={styles.confirmText}>
            {selectedSlot ? `Reserve ${selectedSlot}` : 'Select a parking slot'}
          </Text>
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
  section: {
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  floorSelectorContainer: {
    marginBottom: 25,
    justifyContent: 'center',
    width: '100%',
    alignItems: 'center',
  },
  floorDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B19CD8',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 140,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  floorDropdownText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 10,
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
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  dropdownContainer: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  floorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  selectedFloorItem: {
    backgroundColor: '#F0E6FF',
  },
  floorItemText: {
    fontSize: 16,
    color: '#4A5568',
  },
  selectedFloorItemText: {
    color: '#B19CD8',
    fontWeight: '600',
  },
  parkingLayout: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
    width: '100%',
  },
  slot: {
    width: 70,
    height: 100,
    borderRadius: 8,
    margin: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  slotText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  availableSlot: {
    backgroundColor: '#48BB78',
  },
  unavailableSlot: {
    backgroundColor: '#F56565',
    opacity: 0.7,
  },
  selectedSlot: {
    borderColor: '#F6E05E',
    borderWidth: 3,
    transform: [{ scale: 1.05 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  entranceExitRow: {
    width: '100%',
    paddingVertical: 8,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entranceExitText: {
    color: '#C9CDCF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 30,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  availableLegend: {
    backgroundColor: '#48BB78',
  },
  unavailableLegend: {
    backgroundColor: '#F56565',
  },
  selectedLegend: {
    backgroundColor: '#48BB78',
    borderWidth: 2,
    borderColor: '#F6E05E',
  },
  legendText: {
    color: '#4A5568',
    fontSize: 14,
    fontWeight: '500',
  },
  confirmButton: {
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
  confirmText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default ReservationScreen;