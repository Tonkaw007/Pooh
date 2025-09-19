import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { db } from '../firebaseConfig';
import { ref, onValue, update } from 'firebase/database';

const ReservationScreen = ({ navigation, route }) => {
  const { username, bookingData, bookingType } = route.params;
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slots, setSlots] = useState({});
  const [allSlots, setAllSlots] = useState({});
  const [selectedFloor, setSelectedFloor] = useState('1st Floor');
  const [showFloorDropdown, setShowFloorDropdown] = useState(false);

  const [selectedEntryDate, setSelectedEntryDate] = useState(
  bookingData.entryDate.slice(0, 10)
);
const [selectedExitDate, setSelectedExitDate] = useState(
  bookingData.rateType === 'hourly' ? bookingData.entryDate.slice(0, 10) : bookingData.exitDate.slice(0, 10)
);

  const floors = ['1st Floor', '2nd Floor', '3rd Floor', '4th Floor'];

  const createSlotsForFloor = (prefixes) => {
    const floorData = {};
    prefixes.forEach((prefix) => {
      for (let i = 1; i <= 6; i++) {
        floorData[`${prefix}${i < 10 ? '0' + i : i}`] = { status: 'available' };
      }
    });
    return floorData;
  };

  const floorSlots = {
    '1st Floor': createSlotsForFloor(['A', 'B', 'C']),
    '2nd Floor': createSlotsForFloor(['D', 'E', 'F']),
    '3rd Floor': createSlotsForFloor(['G', 'H', 'I']),
    '4th Floor': createSlotsForFloor(['J', 'K', 'L']),
  };

  // สำหรับ hourly booking ให้ exitDate = entryDate
  useEffect(() => {
    if (bookingData.rateType === 'hourly') {
      setSelectedExitDate(selectedEntryDate);
    }
  }, [selectedEntryDate, bookingData.rateType]);

  // โหลดข้อมูล slots และเช็คซ้อนทับ
  useEffect(() => {
    const slotsRef = ref(db, 'parkingSlots');
    const bookingsRef = ref(db, 'bookings');

    const unsubscribeSlots = onValue(slotsRef, async (snapshot) => {
      let slotData = snapshot.val();
      if (!slotData) {
        await update(ref(db), { parkingSlots: floorSlots });
        slotData = floorSlots;
      }

      const bookingSnapshot = await new Promise((resolve) => {
        onValue(bookingsRef, resolve, { onlyOnce: true });
      });
      const allBookings = bookingSnapshot.val() || {};

      const updatedSlots = { ...slotData };

      Object.keys(updatedSlots).forEach((floor) => {
        Object.keys(updatedSlots[floor]).forEach((slotId) => {
          updatedSlots[floor][slotId].status = 'available';
          Object.values(allBookings).forEach((booking) => {
            if (booking.slotId === slotId) {
              const newEntry = selectedEntryDate;
const newExit = selectedExitDate;
const existEntry = booking.entryDate.slice(0, 10);
const existExit = booking.exitDate.slice(0, 10);

if (newEntry <= existExit && newExit >= existEntry) {
  updatedSlots[floor][slotId].status = 'unavailable';
}

            }
          });
        });
      });

      setAllSlots(updatedSlots);
      setSlots(updatedSlots[selectedFloor] || {});
    });

    return () => unsubscribeSlots();
  }, [selectedEntryDate, selectedExitDate, selectedFloor]);

  const handleSlotSelection = (slotId) => {
    if (slots[slotId]?.status === 'available') {
      setSelectedSlot(slotId);
    }
  };

  const handleFloorSelection = (floor) => {
    setSelectedFloor(floor);
    setShowFloorDropdown(false);
    setSlots(allSlots[floor] || {});
    setSelectedSlot(null);
  };

  const confirmReservation = async () => {
    if (!selectedSlot) {
      Alert.alert('Error', 'Please select an available parking slot');
      return;
    }

    const bookingsRef = ref(db, 'bookings');
    onValue(bookingsRef, (snapshot) => {
      const allBookings = snapshot.val() || {};
      let todayHourlyCount = 0;
      const today = selectedEntryDate;

      Object.values(allBookings).forEach((booking) => {
        if (
          booking.username === username &&
          booking.rateType === 'hourly' &&
          booking.entryDate === today
        ) {
          todayHourlyCount++;
        }
      });

      if (todayHourlyCount >= 5) {
        Alert.alert('Error', 'You have made more than 5 hourly reservations today.');
        return;
      } else {
        navigation.navigate('Payment', {
  username,
  bookingData: {
    ...bookingData,
    entryDate: selectedEntryDate,   // YYYY-MM-DD
    exitDate: selectedExitDate,     // YYYY-MM-DD
    licensePlate: bookingData.licensePlate,
    visitorInfo: bookingData.visitorInfo,
  },
  selectedSlot,
  selectedFloor,
  bookingType,
});

      }
    }, { onlyOnce: true });
  };

  const handleBack = () => navigation.goBack();

  const renderSlotRow = (slotIds) => (
    <View style={styles.slotRow}>
      {slotIds.map((slotId) => (
        <TouchableOpacity
          key={slotId}
          style={[
            styles.slot,
            slots[slotId]?.status === 'available'
              ? styles.availableSlot
              : styles.unavailableSlot,
            selectedSlot === slotId && styles.selectedSlot,
          ]}
          onPress={() => handleSlotSelection(slotId)}
          disabled={slots[slotId]?.status !== 'available'}
        >
          <Text style={styles.slotText}>{slotId}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderParkingLayout = () => {
    const slotKeys = Object.keys(slots);
    const rows = [];
    for (let i = 0; i < slotKeys.length; i += 3) {
      rows.push(slotKeys.slice(i, i + 3));
    }
    return (
      <View style={styles.parkingLayout}>
        {rows.map((rowSlots, rowIndex) => (
          <React.Fragment key={rowIndex}>
            {renderSlotRow(rowSlots)}
            {rowIndex === 1 && (
              <View style={styles.entranceExitRow}>
                <Text style={styles.entranceExitText}> ENTRANCE &gt;&gt;&gt; </Text>
              </View>
            )}
            {rowIndex === 3 && (
              <View style={styles.entranceExitRow}>
                <Text style={styles.entranceExitText}>&lt;&lt;&lt; EXIT </Text>
              </View>
            )}
          </React.Fragment>
        ))}
      </View>
    );
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
          <View style={styles.floorSelectorContainer}>
            <TouchableOpacity
              style={styles.floorDropdown}
              onPress={() => setShowFloorDropdown(true)}
            >
              <Text style={styles.floorDropdownText}>{selectedFloor}</Text>
              <Ionicons name="chevron-down" size={20} color="#fff" />
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
                        selectedFloor === floor && styles.selectedFloorItem,
                      ]}
                      onPress={() => handleFloorSelection(floor)}
                    >
                      <Text
                        style={[
                          styles.floorItemText,
                          selectedFloor === floor && styles.selectedFloorItemText,
                        ]}
                      >
                        {floor}
                      </Text>
                      {selectedFloor === floor && (
                        <Ionicons name="checkmark" size={18} color="#B19CD8" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          </Modal>

          {renderParkingLayout()}
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
          <Text style={styles.confirmText}>
            {selectedSlot ? `Reserve ${selectedSlot}` : 'Select a parking slot'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};


const styles = StyleSheet.create({
  container: 
  { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  scrollContainer: { 
    padding: 20, 
    paddingTop: 60, 
    alignItems: 'center' 
  },
  backButton: { 
    position: 'absolute', 
    top: 40, 
    left: 20, 
    zIndex: 1, 
    padding: 8, 
    backgroundColor: '#fff', 
    borderRadius: 20
  },
  header: { 
    alignItems: 'center',
    marginBottom: 25, 
    marginTop: 10 
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#2D3748', 
    textAlign: 'center' 
  },
  section: { 
    marginBottom: 20, 
    width: '100%', 
    alignItems: 'center' 
  },
  floorSelectorContainer: { 
    marginBottom: 25, 
    justifyContent: 'center', 
    width: '100%', 
    alignItems: 'center' 
  },
  floorDropdown: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#B19CD8', 
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    borderRadius: 10, 
    minWidth: 140, 
    justifyContent: 'space-between' 
  },
  floorDropdownText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600', 
    paddingHorizontal: 10 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContent: { 
    width: '80%', 
    backgroundColor: 'white', 
    borderRadius: 15, 
    padding: 20 
  },
  dropdownContainer: { 
    borderRadius: 10, 
    overflow: 'hidden' 
  },
  floorItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 14, 
    paddingHorizontal: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#EDF2F7'
   },
  selectedFloorItem: { 
    backgroundColor: '#F0E6FF' 
  },
  floorItemText: { 
    fontSize: 16, 
    color: '#4A5568' 
  },
  selectedFloorItemText: { 
    color: '#B19CD8', 
    fontWeight: '600' 
  },
  parkingLayout: { 
    width: '100%', 
    alignItems: 'center', 
    marginBottom: 30 
  },
  slotRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    flexWrap: 'wrap', 
    marginBottom: 10 
  },
  slot: { 
    width: 70, 
    height: 100, 
    borderRadius: 8, 
    margin: 8, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: 'transparent' 
  },
  slotText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700' 
  },
  availableSlot: { 
    backgroundColor: '#48BB78' 
  },
  unavailableSlot: { 
    backgroundColor: '#F56565', 
    opacity: 0.7 
  },
  selectedSlot: {
    borderColor: '#F6E05E', 
    borderWidth: 3, 
    transform: [{ scale: 1.05 }] 
  },
  entranceExitRow: { 
    width: '100%', 
    paddingVertical: 8, 
    marginBottom: 10, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  entranceExitText: { 
    color: '#C9CDCF', 
    fontSize: 16, 
    fontWeight: '700', 
    textAlign: 'center' 
  },
  legendContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    width: '100%', 
    marginBottom: 30,
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 12 
  },
  legendItem: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  legendColor: { 
    width: 16, 
    height: 16, 
    borderRadius: 4, 
    marginRight: 8 
  },
  availableLegend: { 
    backgroundColor: '#48BB78' 
  },
  unavailableLegend: { 
    backgroundColor: '#F56565' 
  },
  selectedLegend: { 
    backgroundColor: '#48BB78', 
    borderWidth: 2, 
    borderColor: '#F6E05E' 
  },
  legendText: { 
    color: '#4A5568', 
    fontSize: 14, 
    fontWeight: '500'
  },
  confirmButton: { 
    backgroundColor: '#B19CD8', 
    padding: 18, 
    borderRadius: 12, 
    alignItems: 'center', 
    width: '100%', 
    maxWidth: 350 
  },
  confirmText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '700' 
  },
  disabledButton: { 
    opacity: 0.5 
  },
});

export default ReservationScreen;