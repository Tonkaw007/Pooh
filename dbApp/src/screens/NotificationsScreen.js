import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const NotificationsScreen = ({ route, navigation }) => {
  const { username } = route.params;
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false); // demo

  useEffect(() => {
    const demoNotifications = [
      {
        id: "1",
        title: "⚠️ Parking Time Alert",
        message: "10 minutes left, please move your car immediately.",
        slot: "A01",
        floor: "2",
        licensePlate: "KK11",
        timestamp: Date.now(),
      },
      {
        id: "2",
        title: "⚠️ Parking Time Alert",
        message: "10 minutes left, please move your car immediately.",
        slot: "B12",
        floor: "3",
        licensePlate: "AA22",
        timestamp: Date.now() - 600000,
      },
    ];
    setNotifications(demoNotifications);
  }, []);

  const handleBack = () => {
    navigation.goBack();
  };

  const renderItem = ({ item }) => (
    <View style={styles.notificationCard}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.message}>{item.message}</Text>
      <Text style={styles.details}>
        Slot {item.slot}, Floor {item.floor}, License: {item.licensePlate}
      </Text>
      <Text style={styles.time}>
        {new Date(item.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {notifications.length === 0 ? (
        <Text style={styles.noNotificationText}>No notifications yet</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: 40,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
    color: '#000',
  },
  listContainer: {
    padding: 20,
  },
  notificationCard: {
    backgroundColor: '#e1e1e1ff', // สีเทา
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  message: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  details: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 8,
  },
  time: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  noNotificationText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    marginTop: 50,
  },
});

export default NotificationsScreen;
