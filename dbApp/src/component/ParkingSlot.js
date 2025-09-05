import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const ParkingSlot = ({ slotNumber, isOccupied, onPress }) => {
  return (
    <TouchableOpacity 
      style={[
        styles.slot,
        isOccupied && styles.occupied
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.slotContent}>
        <Text style={styles.slotNumber}>{slotNumber}</Text>
        <MaterialIcons 
          name={isOccupied ? "directions-car" : "local-parking"} 
          size={32} 
          color={isOccupied ? "#555" : "#4CAF50"} 
        />
        {isOccupied && (
          <MaterialIcons 
            name="verified-user" 
            size={16} 
            color="#B19CD8" 
            style={styles.residentBadge}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  slot: {
    width: 100,
    height: 100,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    margin: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  occupied: {
    borderColor: "#f44336",
    backgroundColor: "#ffebee",
  },
  slotContent: {
    alignItems: "center",
    position: 'relative',
  },
  slotNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  residentBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
  }
});

export default ParkingSlot;