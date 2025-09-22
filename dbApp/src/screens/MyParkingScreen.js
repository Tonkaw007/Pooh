import React, { useEffect, useState } from "react"; 
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from '../firebaseConfig';
import { ref, get, child, push, serverTimestamp, update } from 'firebase/database';

const MyParkingScreen = ({ route, navigation }) => {
  const { username, userType } = route.params;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // ----------------------
  // Notification state
  // ----------------------
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [currentReminder, setCurrentReminder] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // ----------------------
  // Demo popup state
  // ----------------------
  const [showDemoPopup, setShowDemoPopup] = useState(false);

  const handleDemoPopup = () => {
    setCurrentReminder({
      slotId: "A01",
      endTime: "17:30"
    });
    setShowReminderModal(true);
  };

  // ----------------------
  // Fetch bookings
  // ----------------------
  const fetchBookings = async () => {
    try {
      const snapshot = await get(child(ref(db), "bookings"));
      const data = snapshot.val() || {};

      const activeBookings = Object.values(data).filter(
        (b) => b.username === username && b.slotId && b.status !== "cancelled"
      );

      setBookings(activeBookings);
      setLoading(false);

      // Check for reminders
      checkBookingReminders(activeBookings);

      // Fetch unread notifications count
      const notifSnapshot = await get(child(ref(db), `notifications/${username}`));
      const notifData = notifSnapshot.val() || {};
      const unread = Object.values(notifData).filter(n => !n.read).length;
      setUnreadCount(unread);

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Unable to fetch bookings.");
      setLoading(false);
    }
  };

  // ----------------------
  // Check reminders (10 mins before hourly booking ends)
  // ----------------------
  const checkBookingReminders = (activeBookings) => {
    const now = new Date();

    activeBookings.forEach(async (booking) => {
      if (booking.rateType === 'hourly' && !booking.notifiedHour) {
        const [endHour, endMinute] = booking.exitTime.split(':').map(Number);
        const endDate = new Date(`${booking.entryDate}T${booking.exitTime}:00`);
        const diffMinutes = (endDate - now) / 60000;

        if (diffMinutes <= 10 && diffMinutes > 0) {
          // Show modal
          setCurrentReminder({
            slotId: booking.slotId,
            endTime: booking.exitTime
          });
          setShowReminderModal(true);

          // Save notification in Firebase
          const notifRef = ref(db, `notifications/${username}`);
          await push(notifRef, {
            message: `Your parking for Slot ${booking.slotId} ends at ${booking.exitTime}`,
            timestamp: serverTimestamp(),
            read: false
          });

          // Mark booking as notified
          const bookingRef = ref(db, `bookings/${booking.id}`);
          await update(bookingRef, { notifiedHour: true });

          // Update badge count
          setUnreadCount(prev => prev + 1);
        }
      }
    });
  };

  useEffect(() => {
    fetchBookings();

    const unsubscribe = navigation.addListener("focus", () => {
      fetchBookings();
    });

    return unsubscribe;
  }, [navigation, username]);

  const handleBack = () => navigation.navigate("BookingType", { username });
  const handleCardPress = (bookingData) => {
    navigation.navigate("MyParkingInfo", { username, bookingData, userType });
  };
  const handleNotificationPress = () => {
    setShowReminderModal(false); // Close modal if open
    navigation.navigate("Notifications", { username });
  };

  const formatBookingType = (type) => {
    if (type === "hourly") return "Hourly";
    if (type === "daily") return "Daily";
    if (type === "monthly") return "Monthly";
    return type;
  };

  const getBookingTypeColor = (type) => {
    switch (type) {
      case "hourly": return "#bb489cff";
      case "daily": return "#4e67cdff";
      case "monthly": return "#45B7D1";
      default: return "#B19CD8";
    }
  };

  const getUserTypeColor = (type) => {
    switch (type) {
      case "resident": return "#4CAF50";
      case "visitor": return "#FF9800";
      default: return "#B19CD8";
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.userInfo}>
            <View style={styles.userIcon}>
              <Ionicons name="person" size={24} color="#B19CD8" />
            </View>
            <View style={styles.userTextContainer}>
              <Text style={styles.userName}>{username}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.notificationButton} onPress={handleNotificationPress}>
            <Ionicons name="notifications" size={24} color="white" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>My Parking</Text>
          {bookings.length > 0 && (
            <Text style={styles.subtitle}>Tap on a reservation to view details</Text>
          )}
        </View>

        {bookings.length > 0 ? (
          bookings.map((bookingData, index) => (
            <TouchableOpacity
              key={index}
              style={styles.parkingCard}
              onPress={() => handleCardPress(bookingData)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.slotText}>Slot {bookingData.slotId}</Text>
                  <Text style={styles.floorText}>Floor {bookingData.floor}</Text>

                  {bookingData.visitorInfo && (
                    <View style={styles.visitorInfo}>
                      <Text style={styles.visitorText}>
                        For: {bookingData.visitorInfo.visitorUsername}
                      </Text>
                      <Text style={styles.visitorText}>
                        licensePlate: {bookingData.visitorInfo.licensePlate}
                      </Text>
                    </View>
                  )}

                  {bookingData.bookingType && (
                    <View style={[styles.userTypeBadge, { backgroundColor: getUserTypeColor(bookingData.bookingType) }]}>
                      <Text style={styles.userTypeText}>
                        {bookingData.bookingType === "resident" ? "Resident" : "Visitor"}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.headerRight}>
                  <View style={[styles.bookingTypeBadge, { backgroundColor: getBookingTypeColor(bookingData.rateType) }]}>
                    <Text style={styles.bookingTypeText}>{formatBookingType(bookingData.rateType)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#B19CD8" />
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noBookingText}>No reservations yet</Text>
        )}

        <TouchableOpacity style={styles.bookAgainButton} onPress={() => navigation.navigate("BookingType", { username })}>
          <Text style={styles.bookAgainText}>Book Again</Text>
        </TouchableOpacity>

        {/* Demo popup button */}
        <TouchableOpacity
          style={[styles.bookAgainButton, { backgroundColor: '#FF9800', marginTop: 10 }]}
          onPress={handleDemoPopup}
        >
          <Text style={styles.bookAgainText}>Show Demo Reminder</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ----------------------
          Modal แจ้งเตือน
      ---------------------- */}
      <Modal
  visible={showReminderModal}
  transparent
  animationType="fade"
  onRequestClose={() => setShowReminderModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      {currentReminder && (
        <>
          <Text style={styles.modalTitle}>⚠️ Parking Time Alert</Text>
          <Text style={styles.modalMessage}>
            10 minutes left, please move your car immediately.
          </Text>
          <Text style={styles.modalMessage}>
            Slot {currentReminder.slotId}, Floor {currentReminder.floor || '2'}, License: {currentReminder.licensePlate || 'KK11'}
          </Text>
        </>
      )}
      <TouchableOpacity
        style={[styles.modalButton, { backgroundColor: '#B19CD8' }]} // ปุ่มสีม่วง
        onPress={() => setShowReminderModal(false)}
      >
        <Text style={styles.modalButtonText}>OK</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

    </View>
  );
};

// ----------------------
// Styles (เหมือนเดิมทั้งหมด)
// ----------------------
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#B19CD8' 
  },
  scrollContainer: { 
    padding: 20, 
    paddingTop: 20,
    alignItems: 'center'
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 25,
    paddingHorizontal: 10,
    marginTop: 40,
  },
  backButton: { 
    padding: 8 
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  userIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userTextContainer: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  userStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  notificationButton: {
    padding: 8,
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 25,
    width: '100%',
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: 'white', 
    textAlign: 'center' 
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
    textAlign: 'center',
  },
  parkingCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slotText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  floorText: {
    fontSize: 16,
    color: '#718096',
    marginTop: 2,
    marginBottom: 8,
  },
  userTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 5,
  },
  userTypeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 11,
  },
  bookingTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  bookingTypeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  noBookingText: {
    fontSize: 18,
    color: 'white',
    marginTop: 30,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bookAgainButton: {
    backgroundColor: '#575affff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  bookAgainText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  visitorInfo: {
    marginTop: 5,
  },
  visitorText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 10,
    width: 100,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default MyParkingScreen;
