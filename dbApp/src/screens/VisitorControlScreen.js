
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';

const VisitorControlScreen = ({ route, navigation }) => {
  const { sessionId } = route.params || {};

  const handleControl = (action) => {
    // ตอนนี้ยังไม่เชื่อม Firebase
    Alert.alert(`Action: ${action}`, `Session ID: ${sessionId}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Visitor Control</Text>
      <Text style={styles.sessionText}>Session: {sessionId || 'N/A'}</Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#4CAF50' }]}
        onPress={() => handleControl('Open Barrier')}
      >
        <Text style={styles.buttonText}>Open Barrier</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#F44336' }]}
        onPress={() => handleControl('Close Barrier')}
      >
        <Text style={styles.buttonText}>Close Barrier</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#B19CD8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  sessionText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 40,
  },
  button: {
    width: '80%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default VisitorControlScreen;
