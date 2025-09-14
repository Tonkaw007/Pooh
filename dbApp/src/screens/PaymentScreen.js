import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Image } from 'react-native';
import { db } from '../firebaseConfig';
import { ref, update, get, push, child } from 'firebase/database';
import Ionicons from 'react-native-vector-icons/Ionicons';

const PaymentScreen = ({ navigation, route }) => {
  const { username, bookingData, selectedSlot, selectedFloor } = route.params;
  const [userBookings, setUserBookings] = useState([]);

  // โหลด booking ของผู้ใช้จาก Firebase
  const fetchUserBookings = async () => {
    try {
      const snapshot = await get(child(ref(db), 'bookings'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const bookingsArray = Object.values(data).filter(
          (b) => b.username === username
        );
        setUserBookings(bookingsArray);
      } else {
        setUserBookings([]);
      }
    } catch (error) {
      console.error(error);
      setUserBookings([]);
    }
  };

  useEffect(() => {
    fetchUserBookings();
  }, []);

  const handlePaymentSuccess = async () => {
    try {
      const updates = {};

      // แปลงวันที่เป็น YYYY-MM-DD
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const formattedDate = `${yyyy}-${mm}-${dd}`;

      // อัพเดตสถานะ slot
      updates[`parkingSlots/${selectedFloor}/${selectedSlot}/status`] = 'unavailable';

      // สร้าง booking ใหม่ ด้วย push() เพื่อให้ id ไม่ซ้ำ
      const newBookingRef = push(ref(db, 'bookings'));
      const newBookingId = newBookingRef.key;
      const newBooking = {
        ...bookingData,
        id: newBookingId,
        username,
        status: 'confirmed',
        slotId: selectedSlot,
        floor: selectedFloor,
        bookingDate: formattedDate,
        paymentStatus: 'paid',
        paymentDate: formattedDate
      };

      updates[`bookings/${newBookingId}`] = newBooking;

      await update(ref(db), updates);

      // โหลด booking ใหม่ทั้งหมดของผู้ใช้
      await fetchUserBookings();

      Alert.alert('Success', 'Payment successful and slot reserved!', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('MyParking', { 
            username,
          }),
        },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Payment failed. Please try again.');
    }
  };

  const handleBack = () => navigation.goBack();

  const renderBookingDetail = (label, value) => (
    <View style={styles.detailRow}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );

  const formatBookingType = (type) => {
    if (type === 'hourly') return 'Hourly';
    if (type === 'daily') return 'Daily';
    if (type === 'monthly') return 'Monthly';
    return type;
  };

  const formatPrice = () => {
    switch (bookingData.rateType) {
      case 'hourly':
        return `${bookingData.price || 'calculated hourly'} baht`;
      case 'daily':
        return `${bookingData.price || 'calculated daily'} baht`;
      case 'monthly':
        return `${bookingData.durationMonths * 3000} baht`;
      default:
        return '-';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Payment</Text>
        </View>

        <View style={styles.paymentCard}>
          <Text style={styles.cardTitle}>Booking Details</Text>

          {renderBookingDetail('Booking Type', formatBookingType(bookingData.rateType))}
          {renderBookingDetail('Booked By', username)}
          {renderBookingDetail('Slot', selectedSlot)}
          {renderBookingDetail('Floor', selectedFloor)}
          {bookingData.entryDate && renderBookingDetail('Entry Date', bookingData.entryDate)}
          {bookingData.entryTime && renderBookingDetail('Entry Time', bookingData.entryTime)}
          {bookingData.exitDate && renderBookingDetail('Exit Date', bookingData.exitDate)}
          {bookingData.exitTime && renderBookingDetail('Exit Time', bookingData.exitTime)}
          {bookingData.durationMonths && renderBookingDetail('Duration (Months)', bookingData.durationMonths)}

          <View style={styles.qrContainer}>
            <Image
              source={require('../../assets/images/demo-qr.png')}
              style={styles.qrImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalAmount}>{formatPrice()}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.payButton} onPress={handlePaymentSuccess}>
          <Text style={styles.payButtonText}>Pay & Confirm</Text>
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
    shadowColor: '#000',
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
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  label: {
    fontWeight: '600',
    color: '#4A5568',
    fontSize: 14,
  },
  value: {
    fontWeight: '700',
    color: '#2D3748',
    fontSize: 14,
    textAlign: 'right',
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  qrImage: {
    width: 170,
    height: 170,
  },
  totalContainer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#E2E8F0',
    alignItems: 'center'
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 5,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#B19CD8',
  },
  payButton: {
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
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default PaymentScreen;