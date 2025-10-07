import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Image } from 'react-native';
import { db } from '../firebaseConfig';
import { ref, update, get, push, child, onValue } from 'firebase/database';
import Ionicons from 'react-native-vector-icons/Ionicons';

const PaymentScreen = ({ navigation, route }) => {
  const { username, bookingData, selectedSlot, selectedFloor, bookingType } = route.params;
  const [residentLicense, setResidentLicense] = useState('');
  const [prompayStatus, setPrompayStatus] = useState('pending');

  // ดึง license plate ของ resident
  const fetchUserBookings = async () => {
    try {
      const snapshot = await get(child(ref(db), 'users'));
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const currentUser = Object.values(usersData).find(u => u.username === username);
        if (currentUser) {
          setResidentLicense(currentUser.licensePlate || '-');
        }
      }
    } catch (error) {
      console.error(error);
      setResidentLicense('-');
    }
  };

  // เช็คสถานะ Prompay auto
  useEffect(() => {
    fetchUserBookings();

    const bookingId = bookingData.id;
    if (!bookingId) return;

    const promRef = ref(db, `prompayPayments/${bookingId}`);
    const unsubscribe = onValue(promRef, (snapshot) => {
      if (snapshot.exists()) {
        setPrompayStatus(snapshot.val().status || 'pending');
      }
    });

    return () => unsubscribe();
  }, []);

  // handle Payment button เดิม
  const handlePaymentSuccess = async () => {
    try {
      const updates = {};
      const now = new Date();
      const bookingDate = now.toISOString().slice(0, 10);

      // กำหนด entry/exit ตามเงื่อนไข
      let entryDate = bookingData.entryDate;
      let exitDate = bookingData.exitDate;

      if (bookingData.rateType === 'hourly') {
        exitDate = entryDate; // รายชั่วโมง exitDate = entryDate
      } else if (bookingData.rateType === 'monthly') {
        const entry = new Date(entryDate);
        entry.setMonth(entry.getMonth() + (bookingData.durationMonths || 1));
        exitDate = entry.toISOString().slice(0, 10); // รายเดือน
      }

      // กำหนด date และ timeRange สำหรับ slot
      let slotDate;
      let slotTimeRange = '00:00-23:59'; // default สำหรับ daily/monthly

      if (bookingData.rateType === 'hourly') {
        slotDate = entryDate;
        const startTime = bookingData.entryTime || '00:00';
        const endTime = bookingData.exitTime || '23:59';
        slotTimeRange = `${startTime}-${endTime}`;
      } else {
        slotDate = `${entryDate} - ${exitDate}`;
      }

      const newSlotBooking = {
        date: slotDate,
        timeRange: slotTimeRange,
        available: false,
      };

      const slotRef = ref(db, `parkingSlots/${selectedFloor}/${selectedSlot}`);
      const slotSnap = await get(slotRef);

      let updatedSlotData = [];
      if (!slotSnap.exists() || slotSnap.val().status === 'available') {
        updatedSlotData = [newSlotBooking];
      } else if (Array.isArray(slotSnap.val())) {
        const existingBookings = slotSnap.val();
        const isDuplicate = existingBookings.some(
          (b) => b.date === newSlotBooking.date && b.timeRange === newSlotBooking.timeRange
        );
        updatedSlotData = isDuplicate ? existingBookings : [...existingBookings, newSlotBooking];
      } else {
        updatedSlotData = [newSlotBooking];
      }

      updates[`parkingSlots/${selectedFloor}/${selectedSlot}`] = updatedSlotData;

      // สร้าง booking ใหม่
      const newBookingRef = push(ref(db, 'bookings'));
      const newBookingId = newBookingRef.key;

      const licensePlateToSave =
        bookingType === 'resident'
          ? residentLicense || '-'
          : bookingData.visitorInfo?.licensePlate || '-';

      const newBooking = {
        ...bookingData,
        id: newBookingId,
        username,
        bookingType,
        status: 'confirmed',
        slotId: selectedSlot,
        floor: selectedFloor,
        entryDate,
        exitDate,
        bookingDate,
        paymentStatus: 'paid',
        paymentDate: bookingDate,
        visitorInfo: bookingData.visitorInfo || null,
        licensePlate: licensePlateToSave,
      };

      updates[`bookings/${newBookingId}`] = newBooking;

      await update(ref(db), updates);

      Alert.alert('Success', 'Payment successful and slot reserved!', [
        {
          text: 'OK',
          onPress: () =>
            navigation.navigate('MyParking', {
              username,
              userType: bookingType,
            }),
        },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Payment failed. Please try again.');
    }
  };

  // handle Prompay auto update
  const handlePrompayPayment = async (payerPhone, amount) => {
    try {
      const bookingId = bookingData.id;
      if (!bookingId) return;

      const bookingSnap = await get(ref(db, `bookings/${bookingId}`));
      if (!bookingSnap.exists()) return;

      const bookingInfo = bookingSnap.val();

      // อัปเดต booking
      await update(ref(db, `bookings/${bookingId}`), {
        paymentStatus: 'paid',
        paymentDate: new Date().toISOString(),
        paymentMethod: 'Prompay',
      });

      // อัปเดต Prompay payment
      await update(ref(db, `prompayPayments/${bookingId}`), {
        status: 'paid',
        timestamp: new Date().toISOString(),
        amount,
        payerPhone,
        payerUsername: bookingInfo.bookingType === 'resident' ? bookingInfo.username : '',
        visitorUsername: bookingInfo.bookingType === 'visitor' ? bookingInfo.visitorInfo?.visitorUsername : ''
      });

      console.log('Prompay payment recorded successfully');
    } catch (err) {
      console.error('Error handling Prompay payment:', err);
    }
  };

  const handleBack = () => navigation.goBack();

  const renderBookingDetail = (label, value) => (
    <View style={styles.detailRow}>
      <Text style={styles.label}>{label}:</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={styles.value}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );

  const formatBookingType = type => {
    if (type === 'hourly') return 'Hourly';
    if (type === 'daily') return 'Daily';
    if (type === 'monthly') return 'Monthly';
    return String(type);
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

  const renderBookedBy = () => {
    if (bookingType === 'resident') {
      return <Text style={styles.value}>{username}</Text>;
    } else if (bookingType === 'visitor' && bookingData.visitorInfo) {
      return (
        <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
          <Text style={styles.value}>{username}</Text>
          <Text style={[styles.value, { fontSize: 13, color: '#718096' }]}>
            (for {bookingData.visitorInfo.visitorUsername})
          </Text>
        </View>
      );
    }
    return <Text style={styles.value}>{username}</Text>;
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

          {renderBookingDetail('User Type', bookingType === 'resident' ? 'Resident' : 'Visitor')}
          {renderBookingDetail('Booking Type', formatBookingType(bookingData.rateType))}
          {renderBookingDetail('Booked By', renderBookedBy())}
          {renderBookingDetail('Slot', selectedSlot)}
          {renderBookingDetail('Floor', selectedFloor)}
          {bookingData.entryDate && renderBookingDetail('Entry Date', bookingData.entryDate)}
          {bookingData.entryTime && renderBookingDetail('Entry Time', bookingData.entryTime)}
          {bookingData.exitDate && renderBookingDetail('Exit Date', bookingData.exitDate)}
          {bookingData.exitTime && renderBookingDetail('Exit Time', bookingData.exitTime)}
          {renderBookingDetail('License Plate', residentLicense)}
          {bookingData.durationMonths &&
            renderBookingDetail('Duration (Months)', bookingData.durationMonths)}

          {bookingType === 'visitor' && bookingData.visitorInfo && (
            <View style={styles.visitorSection}>
              <Text style={styles.sectionTitle}>Visitor Information</Text>
              {renderBookingDetail('Visitor Name', bookingData.visitorInfo.visitorUsername)}
              {renderBookingDetail('Phone', bookingData.visitorInfo.phoneNumber)}
              {renderBookingDetail('Email', bookingData.visitorInfo.email)}
              {renderBookingDetail('License Plate', bookingData.visitorInfo.licensePlate)}
            </View>
          )}

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

          {/* ===== Prompay Section ===== */}
          <View style={styles.prompaySection}>
            <Text style={styles.sectionTitle}>Pay Prompay</Text>
            <Text>Scan the QR code to pay</Text>

            <View style={styles.prompayStatusRow}>
              <Text>Status:</Text>
              <Text style={{ fontWeight: '700', color:  prompayStatus === 'paid'? 'green' : prompayStatus === 'pending'? 'orange': 'red', }}>
                {prompayStatus === 'pending' ? 'Waiting for payment' : prompayStatus === 'paid' ? 'Paid' : 'Failed'}
              </Text>
            </View>

            {prompayStatus === 'pending' && (
              <Text style={{ fontSize: 12, color: '#718096', marginTop: 5 }}>
                Payment will be recorded automatically once transfer is detected.
              </Text>
            )}
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
  visitorSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 15,
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
    alignItems: 'center',
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
  prompaySection: {
    marginTop: 20,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  prompayStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
});

export default PaymentScreen;
