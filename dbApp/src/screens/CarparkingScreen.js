import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, StatusBar, TouchableOpacity, Dimensions 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ParkingSlot from '../component/ParkingSlot';
import CustomButton from '../component/CustomButton';

const { width } = Dimensions.get('window');

const CarparkingScreen = ({ route, navigation }) => {
  const [currentFloor, setCurrentFloor] = useState(0);
  const { username } = route.params || {};
  
  const floors = [
    {
      name: "Floor 1",
      slots: [
        { id: 'A1', occupied: false },
        { id: 'A2', occupied: true, resident: "John D." },
        { id: 'A3', occupied: false },
        { id: 'B1', occupied: true, resident: "Sarah M." },
        { id: 'B2', occupied: false },
        { id: 'B3', occupied: true, resident: "Mike T." },
      ]
    },
    {
      name: "Floor 2",
      slots: [
        { id: 'C1', occupied: false },
        { id: 'C2', occupied: false },
        { id: 'C3', occupied: true, resident: "Lisa P." },
        { id: 'D1', occupied: false },
        { id: 'D2', occupied: true, resident: "David K." },
        { id: 'D3', occupied: false },
      ]
    },
    {
      name: "Floor 3",
      slots: [
        { id: 'E1', occupied: false },
        { id: 'E2', occupied: true, resident: "John D." },
        { id: 'E3', occupied: false },
        { id: 'F1', occupied: true, resident: "Sarah M." },
        { id: 'F2', occupied: false },
        { id: 'F3', occupied: true, resident: "Mike T." },
      ]
    },
    {
      name: "Floor 4",
      slots: [
        { id: 'G1', occupied: false },
        { id: 'G2', occupied: true, resident: "John D." },
        { id: 'G3', occupied: false },
        { id: 'H1', occupied: true, resident: "Sarah M." },
        { id: 'H2', occupied: false },
        { id: 'H3', occupied: true, resident: "Mike T." },
      ]
    },
  ];

  const handleSlotPress = (slot) => {
    if (slot.occupied) {
      Alert.alert(
        `Slot ${slot.id}`,
        `Occupied by resident: ${slot.resident}`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Reserve Parking',
        `Reserve slot ${slot.id}?`,
        [
          { text: 'Cancel' },
          { text: 'Reserve', onPress: () => {
            navigation.navigate("Reservation", { 
              slotId: slot.id,
              username: username 
            });
          }}
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#B19CD8" barStyle="light-content" />
      
      {/* Resident Header */}
      <View style={styles.header}>
        <MaterialIcons name="account-circle" size={30} color="white" />
        <Text style={styles.welcomeText}>Resident: {username}</Text>
      </View>

      <Text style={styles.title}>Resident Car Parking</Text>

      {/* Floor Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.floorSelector}
      >
        {floors.map((floor, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.floorButton,
              currentFloor === index && styles.selectedFloor
            ]}
            onPress={() => setCurrentFloor(index)}
          >
            <Text style={[
              styles.floorText,
              currentFloor === index && styles.selectedFloorText
            ]}>
              {floor.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>


      {/* Parking Grid */}
      <ScrollView contentContainerStyle={styles.slotGrid}>
        {floors[currentFloor].slots.map((slot) => (
          <ParkingSlot
            key={slot.id}
            slotNumber={slot.id}
            isOccupied={slot.occupied}
            onPress={() => handleSlotPress(slot)}
          />
        ))}
      </ScrollView>
      {/* My Parking Button*/}
      <View style={styles.buttonContainer}>
        <CustomButton 
          title="My Parking" 
          onPress={() => navigation.navigate('Myparking')}
          backgroundColor="#B19CD8"
          textColor="white"
          width={width * 0.9}
          height={50}
          borderRadius={8}
          fontSize={16}
          fontWeight="600"
          marginTop={10}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B19CD8',
    padding: 15,
    paddingTop: 40,
  },
  welcomeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    padding: 15,
    paddingBottom: 5,
  },
  floorSelector: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  floorButton: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  selectedFloor: {
    backgroundColor: '#B19CD8',
  },
  floorText: {
    color: '#555',
    fontWeight: '500',
  },
  selectedFloorText: {
    color: 'white',
    fontWeight: 'bold',
  },
  buttonContainer: {
    alignItems: 'center',
    marginVertical: 5,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 10,
    paddingBottom: 20,
  },
});

export default CarparkingScreen;