import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from '../firebaseConfig';
import { ref, get, child, push, update } from 'firebase/database';

const MyParkingScreen = ({ route, navigation }) => {
  const { username, userType } = route.params;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [currentReminder, setCurrentReminder] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [couponCount, setCouponCount] = useState(0);
  const bookingsRef = useRef([]);
  const activeReminderBookings = useRef(new Set());

  // ฟังก์ชัน push notification โดยตรง (ไม่มีการเช็คซ้ำ)
  const sendNotification = async (newNotif) => {
    try {
      const notifRef = ref(db, "notifications");

      let formattedNotif = {
        ...newNotif,
        timestamp: Date.now(),
      };

      if (newNotif.bookingType === "resident") {
        formattedNotif = {
          ...formattedNotif,
          username: newNotif.username || null,
        };
        delete formattedNotif.visitorUsername;
      } else if (newNotif.bookingType === "visitor") {
        formattedNotif = {
          ...formattedNotif,
          username: newNotif.username || null,
          visitorUsername: newNotif.visitorUsername || null,
        };
      }

      await push(notifRef, formattedNotif);
      console.log("✅ Sent notification:", formattedNotif);
      return true;
    } catch (err) {
      console.error("Error sending notification:", err);
      return false;
    }
  };

  // ฟังก์ชันป้องกัน push แจ้งเตือนซ้ำ (สำหรับ auto reminder เท่านั้น)
  const sendNotificationOnce = async (newNotif) => {
    try {
      const notifRef = ref(db, "notifications");
      const snapshot = await get(notifRef);
      const now = Date.now();
      let duplicate = false;

      if (snapshot.exists()) {
        snapshot.forEach(child => {
          const item = child.val();
          if (
            item.message === newNotif.message &&
            item.slotId === newNotif.slotId &&
            item.username === newNotif.username &&
            Math.abs(now - (item.timestamp || 0)) < 10 * 60 * 1000
          ) {
            duplicate = true;
          }
        });
      }

      if (!duplicate) {
        const formattedNotif = { ...newNotif, timestamp: now };
        if (newNotif.bookingType === "resident") delete formattedNotif.visitorUsername;
        else if (newNotif.bookingType === "visitor") {
          formattedNotif.username = newNotif.username || null;
          formattedNotif.visitorUsername = newNotif.visitorUsername || null;
        }

        await push(notifRef, formattedNotif);
        console.log("✅ Sent new notification:", formattedNotif);
        return true;
      } else {
        console.log("⚠️ Skipped duplicate notification:", newNotif.message);
        return false;
      }
    } catch (err) {
      console.error("Error sending notification:", err);
      return false;
    }
  };

  // Demo popup สำหรับ Parking Slot Unavailable
  const [showParkingProblemModal, setShowParkingProblemModal] = useState(false);

  const showParkingProblemDemo = async () => {
    const now = new Date();
    const newNotif = {
      username: username,
      bookingType: userType || "resident",
      slotId: "A02",
      floor: "1",
      licensePlate: "bt77",
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0,5),
      read: false,
      type: "Parking Slot Unavailable",
      message: `Your booked parking slot A02 is currently unavailable. Please choose relocation or receive compensation.`
    };

    const sent = await sendNotification(newNotif);
    if (sent) setUnreadCount(prev => prev + 1);

    setShowParkingProblemModal(true);
  };

   // ฟังก์ชัน relocate สำหรับผู้ใช้เลือกเอง
  const handleAcceptRelocation = async () => {
  try {
    const bookingsSnapshot = await get(child(ref(db), "bookings"));
    const data = bookingsSnapshot.val() || {};

    // หา booking เดิม slot A02 ของ user
    const oldBookingEntry = Object.entries(data).find(
      ([id, b]) => b.username === username && b.slotId === "A02" && b.status !== "cancelled"
    );

    if (!oldBookingEntry) {
      Alert.alert("Error", "No booking found for relocation.");
      return;
    }

    const [oldBookingId, oldBooking] = oldBookingEntry;

    // ยกเลิก booking เดิม
    await update(ref(db, `bookings/${oldBookingId}`), { status: "cancelled" });

    // สร้าง booking ใหม่ โดย copy ข้อมูลเดิม แต่เปลี่ยน slotId เป็น A04
    const newBookingData = {
      ...oldBooking,         // copy ทุก field
      slotId: "A04",         // เปลี่ยน slot
      status: "confirmed",   // ตั้งสถานะ
    };

    // ลบ field ที่จะถูก generate ใหม่
    delete newBookingData.id;
    delete newBookingData.sessionKey;
    delete newBookingData.notifiedHour;      // ถ้ามี
    delete newBookingData.notifiedDaily;     // ถ้ามี
    delete newBookingData.notifiedMonthly;   // ถ้ามี

    // push booking ใหม่ (Firebase จะสร้าง id ใหม่ให้อัตโนมัติ)
    const newBookingRef = await push(ref(db, "bookings"), newBookingData);
    const newBookingId = newBookingRef.key;

    // อัพเดต id และ sessionKey ของ booking ใหม่
    await update(ref(db, `bookings/${newBookingId}`), {
      id: newBookingId,
      sessionKey: newBookingId,
    });

    Alert.alert("Parking Relocated Successfully", "Your booking has been moved to Slot A04");
    fetchBookings();
  } catch (error) {
    console.error("Error relocating booking:", error);
    Alert.alert("Error", "Failed to relocate booking: " + error.message);
  }
};





 // ฟังก์ชันสำหรับ auto relocate Jinbts
  const autoRelocateJinbts = async () => {
  try {
    const snapshot = await get(child(ref(db), "bookings"));
    const data = snapshot.val() || {};

    const khemikaBooking = Object.values(data).find(
      b => b.username === "Khemika Meepin" && b.slotId === "A02" && b.status !== "cancelled"
    );

    const jinbtsBookingEntry = Object.entries(data).find(
      ([id, b]) => b.username === "jinbts" && b.slotId === "A02" && b.status !== "cancelled"
    );

    if (!khemikaBooking || !jinbtsBookingEntry) return;

    const [jinbtsBookingId, jinbtsBooking] = jinbtsBookingEntry;

    // เงื่อนไขเวลา
    const now = new Date();
    const bookingDate = new Date(khemikaBooking.entryDate);

    if (bookingDate.getFullYear() === 2025 &&
        bookingDate.getMonth() === 9 &&
        bookingDate.getDate() === 16 &&
        now.getHours() >= 19) {

      // ยกเลิก booking เดิม
      await update(ref(db, `bookings/${jinbtsBookingId}`), { status: "cancelled" });

      // สร้าง booking ใหม่
      const { id, sessionKey, notifiedHour, notifiedDaily, notifiedMonthly, ...bookingData } = jinbtsBooking;

      const newBookingRef = await push(ref(db, "bookings"), {
        ...bookingData,
        slotId: "A04",
        status: "confirmed"
      });

      const newBookingId = newBookingRef.key;

      // อัพเดต id และ sessionKey
      await update(ref(db, `bookings/${newBookingId}`), {
        id: newBookingId,
        sessionKey: newBookingId
      });

      setShowParkingProblemModal(false);
      Alert.alert("Parking Relocated", "Your booking has been moved to Slot A04 (Floor 1)");
      fetchBookings();
    }
  } catch (error) {
    console.error("Error relocating Jinbts:", error);
    Alert.alert("Error", "Failed to relocate booking.");
  }
};




  const handleDeclineRelocation = () => {
    Alert.alert(
      "Compensation Coupon Received", 
      "You have received a 10% discount coupon for your next booking. The refund will be processed to your account within 3-5 business days.",
      [{ text: "OK", onPress: () => setShowParkingProblemModal(false) }]
    );
  };

  


  // Demo popup สำหรับ Resident/Visitor
  const handleDemoPopup = async (type = "resident") => {
    try {
      const snapshot = await get(child(ref(db), "bookings"));
      const data = snapshot.val() || {};

      let demoBooking;
      if (type === "resident") {
        demoBooking = Object.values(data).find(
          (b) => b.username === username && b.bookingType === "resident" && b.slotId === "B01"
        );
      } else if (type === "visitor") {
        demoBooking = Object.values(data).find(
          (b) => b.bookingType === "visitor" && b.slotId === "B06"
        );
      }

      if (!demoBooking) {
        Alert.alert("No booking found", `No ${type} booking found for demo slot.`);
        return;
      }

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0,5);

      const notifType =
        demoBooking.rateType === 'hourly'
          ? "Hourly reminder (10 minutes before end)"
          : demoBooking.rateType === 'daily'
          ? "Daily reminder (10 minutes before end)"
          : demoBooking.rateType === 'monthly'
          ? "Monthly reminder (10 minutes before end)"
          : "General reminder";

      let newNotif;
      if (type === "resident") {
        newNotif = {
          bookingType: "resident",
          username: demoBooking.username,
          slotId: demoBooking.slotId,
          floor: demoBooking.floor || "2",
          licensePlate: demoBooking.licensePlate || "N/A",
          date: dateStr,
          time: timeStr,
          read: false,
          type: notifType,
          message: `10 minutes left, please move your car immediately.`
        };
      } else if (type === "visitor") {
        newNotif = {
          bookingType: "visitor",
          username: demoBooking.username,
          visitorUsername: demoBooking.visitorInfo?.visitorUsername || "N/A",
          slotId: demoBooking.slotId,
          floor: demoBooking.floor || "2",
          licensePlate: demoBooking.visitorInfo?.licensePlate || "N/A",
          date: dateStr,
          time: timeStr,
          read: false,
          type: notifType,
          message: `10 minutes left, please move your car immediately.`
        };
      }

      const sent = await sendNotification(newNotif);
      if (sent) setUnreadCount(prev => prev + 1);

      setCurrentReminder({
        username: type === "visitor" ? demoBooking.visitorInfo?.visitorUsername || "N/A" : demoBooking.username || "N/A",
        slotId: demoBooking.slotId,
        floor: demoBooking.floor || "N/A",
        licensePlate: demoBooking.visitorInfo?.licensePlate || demoBooking.licensePlate || "N/A",
        endTime: demoBooking.exitTime || "N/A",
      });

      setShowReminderModal(true);
      activeReminderBookings.current.add(demoBooking.id);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Unable to fetch booking.");
    }
  };

  // Demo สำหรับ Visitor J01
  const handleDemoVisitorJ01 = async () => {
    try {
      const snapshot = await get(child(ref(db), "bookings"));
      const data = snapshot.val() || {};

      const demoBooking = Object.values(data).find(
        (b) => b.bookingType === "visitor" && b.slotId === "J01"
      );

      if (!demoBooking) {
        Alert.alert("No booking found", "No visitor booking found for J01.");
        return;
      }

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0,5);

      const notifType =
        demoBooking.rateType === 'hourly'
          ? "Hourly reminder (10 minutes before end)"
          : demoBooking.rateType === 'daily'
          ? "Daily reminder (10 minutes before end)"
          : demoBooking.rateType === 'monthly'
          ? "Monthly reminder (10 minutes before end)"
          : "General reminder";

      const newNotif = {
        bookingType: "visitor",
        username: demoBooking.username,
        visitorUsername: demoBooking.visitorInfo?.visitorUsername || "N/A",
        slotId: demoBooking.slotId,
        floor: demoBooking.floor || "2",
        licensePlate: demoBooking.visitorInfo?.licensePlate || "N/A",
        date: dateStr,
        time: timeStr,
        read: false,
        type: notifType,
        message: `10 minutes left, please move your car immediately.`
      };

      const sent = await sendNotification(newNotif);
      if (sent) setUnreadCount(prev => prev + 1);

      setCurrentReminder({
        username: demoBooking.visitorInfo?.visitorUsername || "N/A",
        slotId: demoBooking.slotId,
        floor: demoBooking.floor || "N/A",
        licensePlate: demoBooking.visitorInfo?.licensePlate || "N/A",
        endTime: demoBooking.exitTime || "N/A",
      });
      setShowReminderModal(true);
      activeReminderBookings.current.add(demoBooking.id);

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Unable to fetch visitor booking J01.");
    }
  };

  const fetchCoupons = async () => {
    try {
      const demoCoupons = [
        { id: '1', createdDate: new Date().toISOString(), expiryDate: new Date(Date.now() + 30*24*60*60*1000).toISOString(), reason: "The previous vehicle exceeded parking time", discountType: 'hourly', used: false },
        { id: '2', createdDate: new Date(Date.now() - 5*24*60*60*1000).toISOString(), expiryDate: new Date(Date.now() + 25*24*60*60*1000).toISOString(), reason: "Compensation for maintenance delay", discountType: 'daily', used: false },
        { id: '3', createdDate: new Date(Date.now() - 2*24*60*60*1000).toISOString(), expiryDate: new Date(Date.now() + 28*24*60*60*1000).toISOString(), reason: "Apology for system error", discountType: 'monthly', used: false }
      ];

      const activeCoupons = demoCoupons.filter(coupon => {
        const expiryDate = new Date(coupon.expiryDate);
        return expiryDate > new Date() && !coupon.used;
      });

      setCouponCount(activeCoupons.length);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      setCouponCount(0);
    }
  };

  const fetchBookings = async () => {
    try {
      const snapshot = await get(child(ref(db), "bookings"));
      const data = snapshot.val() || {};

      const activeBookings = Object.values(data).filter(
        (b) => (b.username === username || (userType === "visitor" && b.visitorInfo?.visitorUsername === username)) && b.slotId && b.status !== "cancelled"
      );

      activeBookings.forEach(b => b.showingModal = false);

      setBookings(activeBookings);
      bookingsRef.current = activeBookings;
      setLoading(false);
      checkBookingReminders();

      const notifSnapshot = await get(child(ref(db), `notifications`));
      const notifData = notifSnapshot.val() || {};
      
      const userNotifications = Object.values(notifData).filter(n => {
        return n.username === username || n.visitorUsername === username;
      });
      
      const unread = userNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);

      await fetchCoupons();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Unable to fetch bookings.");
      setLoading(false);
    }
  };

  const showBookingReminder = async (booking) => {
    if (activeReminderBookings.current.has(booking.id)) return;
    activeReminderBookings.current.add(booking.id);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0,5);

    const notifType =
      booking.rateType === 'hourly'
        ? "Hourly reminder (10 minutes before end)"
        : booking.rateType === 'daily'
        ? "Daily reminder (10 minutes before end)"
        : booking.rateType === 'monthly'
        ? "Monthly reminder (10 minutes before end)"
        : "General reminder";

    const newNotif = {
      bookingType: booking.bookingType,
      username: booking.bookingType === "visitor" 
        ? booking.username  // username ของ resident ที่เป็นเจ้าของ slot
        : booking.username, // resident ใช้ username เหมือนเดิม
      slotId: booking.slotId,
      floor: booking.floor,
      licensePlate: booking.visitorInfo?.licensePlate || booking.licensePlate,
      date: dateStr,
      time: timeStr,
      read: false,
      type: notifType,
      message: `10 minutes left, please move your car immediately.`,
      ...(booking.bookingType === "visitor" && booking.visitorInfo?.visitorUsername
      ? { visitorUsername: booking.visitorInfo.visitorUsername }
      : {})
};

    const sent = await sendNotificationOnce(newNotif);
    if (sent) setUnreadCount(prev => prev + 1);

    setCurrentReminder({
      username: booking.bookingType === "visitor" ? booking.visitorInfo?.visitorUsername || "N/A" : booking.username || "N/A",
      slotId: booking.slotId || 'N/A',
      floor: booking.floor || 'N/A',
      licensePlate: booking.visitorInfo?.licensePlate || booking.licensePlate || 'N/A',
      endTime: booking.exitTime,
    });

    setShowReminderModal(true);
  };

  const checkBookingReminders = async () => {
    const now = new Date();
    const activeBookings = bookingsRef.current;

    for (const booking of activeBookings) {
      if (!booking.rateType) continue;

      if (booking.rateType === 'hourly' && booking.entryDate && booking.exitTime) {
        const [exitHour, exitMinute] = booking.exitTime.split(':').map(Number);
        const [year, month, day] = booking.entryDate.split('-').map(Number);
        const endDate = new Date(year, month - 1, day, exitHour, exitMinute, 0);
        const reminderTime = new Date(endDate.getTime() - 10 * 60 * 1000);

        if (now >= reminderTime && now < endDate && !booking.notifiedHour) {
          const bookingRef = ref(db, `bookings/${booking.id}`);
          await update(bookingRef, { notifiedHour: true });
          booking.notifiedHour = true;
          await showBookingReminder(booking);
        }
      } else if ((booking.rateType === 'daily' || booking.rateType === 'monthly') && booking.exitDate) {
        const [year, month, day] = booking.exitDate.split('-').map(Number);
        const reminderTime = new Date(year, month - 1, day, 23, 50, 0);
        const notifiedKey = booking.rateType === 'daily' ? 'notifiedDaily' : 'notifiedMonthly';

        if (now >= reminderTime && !booking[notifiedKey]) {
          const bookingRef = ref(db, `bookings/${booking.id}`);
          await update(bookingRef, { [notifiedKey]: true });
          booking[notifiedKey] = true;
          await showBookingReminder(booking);
        }
      }
    }
  };

  // LOGIC เพิ่ม: ตรวจสอบและ relocate Jinbts อัตโนมัติ
  const checkAutomaticRelocationForJinbts = async () => {
    await autoRelocateJinbts();
  };

  // useEffect
  useEffect(() => {
    fetchBookings();
    const unsubscribeFocus = navigation.addListener("focus", () => fetchBookings());
    const reminderInterval = setInterval(() => {
      checkBookingReminders();
      checkAutomaticRelocationForJinbts();
    }, 30000);

    return () => {
      unsubscribeFocus();
      clearInterval(reminderInterval);
    };
  }, [navigation, username]);

  const handleBack = () => navigation.navigate("BookingType", { username });
  const handleCardPress = (bookingData) => navigation.navigate("MyParkingInfo", { username, bookingData, userType });
  const handleNotificationPress = () => {
    setShowReminderModal(false);
    navigation.navigate("Notifications", { username, userType });
  };
  const handleCouponPress = () => navigation.navigate("MyCoupon", { username });

  const formatBookingType = (type) => type === "hourly" ? "Hourly" : type === "daily" ? "Daily" : type === "monthly" ? "Monthly" : type;
  const getBookingTypeColor = (type) => type === "hourly" ? "#bb489cff" : type === "daily" ? "#4e67cdff" : type === "monthly" ? "#45B7D1" : "#B19CD8";
  const getUserTypeColor = (type) => type === "resident" ? "#4CAF50" : type === "visitor" ? "#FF9800" : "#B19CD8";

  if (loading) return <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}><ActivityIndicator size="large" color="#fff" /></View>;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
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

          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.couponButton} onPress={handleCouponPress}>
              <Ionicons name="ticket" size={24} color="white" />
              {couponCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{couponCount}</Text></View>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.notificationButton} onPress={handleNotificationPress}>
              <Ionicons name="notifications" size={24} color="white" />
              {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>My Parking</Text>
          {bookings.length > 0 && (
            <View style={styles.subtitleContainer}>
              <Text style={styles.subtitle}>Tap on a reservation to view details</Text>
              <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("BookingType", { username })}>
                <Ionicons name="add" size={26} color="#B19CD8" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {bookings.length > 0 ? bookings.map((bookingData, index) => (
          <TouchableOpacity key={index} style={styles.parkingCard} onPress={() => handleCardPress(bookingData)} activeOpacity={0.7}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.slotText}>Slot {bookingData.slotId}</Text>
                <Text style={styles.floorText}>Floor : {bookingData.floor}</Text>
                {bookingData.bookingType === 'visitor' && bookingData.visitorInfo && (
                  <View style={styles.visitorInfo}>
                    <Text style={styles.visitorText}>For: {bookingData.visitorInfo.visitorUsername || "N/A"}</Text>
                    <Text style={styles.visitorText}>License Plate: {bookingData.visitorInfo.licensePlate || "N/A"}</Text>
                  </View>
                )}
                {bookingData.bookingType && <View style={[styles.userTypeBadge, { backgroundColor: getUserTypeColor(bookingData.bookingType) }]}><Text style={styles.userTypeText}>{bookingData.bookingType === "resident" ? "Resident" : "Visitor"}</Text></View>}
              </View>

              <View style={styles.headerRight}>
                <View style={[styles.bookingTypeBadge, { backgroundColor: getBookingTypeColor(bookingData.rateType) }]}><Text style={styles.bookingTypeText}>{formatBookingType(bookingData.rateType)}</Text></View>
                <Ionicons name="chevron-forward" size={24} color="#B19CD8" />
              </View>
            </View>
          </TouchableOpacity>
        )) : <Text style={styles.noBookingText}>No reservations yet</Text>}

        <TouchableOpacity style={[styles.bookAgainButton, { backgroundColor: '#FF9800', marginTop: 10 }]} onPress={() => handleDemoPopup("resident")}><Text style={styles.bookAgainText}>Demo Resident Slot B01</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.bookAgainButton, { backgroundColor: '#FF9800', marginTop: 10 }]} onPress={() => handleDemoPopup("visitor")}><Text style={styles.bookAgainText}>Demo Visitor Slot B06</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.bookAgainButton, { backgroundColor: '#FF9800', marginTop: 10 }]} onPress={handleDemoVisitorJ01}><Text style={styles.bookAgainText}>Demo Visitor Slot J01</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.bookAgainButton, { backgroundColor: '#FF5252', marginTop: 10 }]} onPress={showParkingProblemDemo}><Text style={styles.bookAgainText}>Demo: Parking Slot Unavailable</Text></TouchableOpacity>

      </ScrollView>

      <Modal visible={showReminderModal} transparent animationType="fade" onRequestClose={() => setShowReminderModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {currentReminder && <>
              <Text style={styles.modalTitle}>⚠️ Parking Time Alert</Text>
              <Text style={styles.modalMessage}>10 minutes left, please move your car immediately.</Text>
              <Text style={styles.modalMessage}>Username: {currentReminder.username}{"\n"}Slot {currentReminder.slotId}, Floor: {currentReminder.floor || '2'}, License: {currentReminder.licensePlate || 'KK11'}</Text>
            </>}
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#B19CD8' }]} onPress={() => setShowReminderModal(false)}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showParkingProblemModal} transparent animationType="fade" onRequestClose={() => setShowParkingProblemModal(false)}>
  <View style={styles.modalOverlay}>
    <View style={[styles.modalContainer, { width: '85%' }]}>
      
      {/* ปุ่มปิดมุมขวาบน */}
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={() => setShowParkingProblemModal(false)}
      >
        <Ionicons name="close" size={24} color="#fff" />
      </TouchableOpacity>

      <View style={styles.warningIconContainer}><Ionicons name="warning" size={50} color="#FF9800" /></View>
      <Text style={styles.modalTitle}>Parking Slot Unavailable</Text>
      <Text style={styles.modalMessage}>The parking slot A02 you booked is currently unavailable because the previous vehicle exceeded the parking time.</Text>
      <Text style={styles.modalMessage}>We apologize for the inconvenience. Please choose one of the following options:</Text>
      <View style={styles.optionsContainer}>
        <TouchableOpacity style={[styles.optionButton, { backgroundColor: '#4CAF50' }]} onPress={handleAcceptRelocation}>
          <Text style={styles.optionButtonText}>Accept Relocation</Text>
          <Text style={styles.optionSubtext}>Move to Slot A04</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.optionButton, { backgroundColor: '#2196F3' }]} onPress={handleDeclineRelocation}>
          <Text style={styles.optionButtonText}>Decline & Receive Coupon</Text>
          <Text style={styles.optionSubtext}>10% off next booking</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>


    </View>
  );
};

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
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  couponButton: {
    padding: 8,
    marginRight: 8,
    position: 'relative',
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
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
  subtitleContainer: { 
    alignItems: 'center',        
    justifyContent: 'center',   
    width: '100%',
    marginTop: 5,
    flexDirection: 'column',  
    gap: 10,                    
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
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
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
  // สไตล์ใหม่สำหรับ Modal ที่จอดรถไม่พร้อมใช้งาน
  warningIconContainer: {
    marginBottom: 15,
  },
  optionsContainer: {
    width: '100%',
    marginTop: 10,
  },
  optionButton: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  optionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  optionSubtext: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  closeButton: {
  position: 'absolute',
  top: 10,
  right: 10,
  backgroundColor: '#B19CD8',
  borderRadius: 15,
  width: 30,
  height: 30,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
},

});

export default MyParkingScreen;