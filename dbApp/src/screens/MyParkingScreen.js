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
  const [showNoShowWarningModal, setShowNoShowWarningModal] = useState(false);
  const [currentNoShowBooking, setCurrentNoShowBooking] = useState(null);
  const [relocationSlot, setRelocationSlot] = useState(null);
  const [originalBooking, setOriginalBooking] = useState(null);
  const [handledOverstaySlot, setHandledOverstaySlot] = useState(null); // <-- State ป้องกัน Modal เด้งซ้ำ

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
            Math.abs(now - (item.timestamp || 0)) < 10 * 60 * 1000 // 10 นาที
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


  // 2. สร้างฟังก์ชันใหม่สำหรับค้นหาช่องจอด
  const findRandomAvailableSlot = async (bookingToMove) => {
    try {
      const allSlotsSnap = await get(ref(db, 'parkingSlots'));
      const allBookingsSnap = await get(ref(db, 'bookings'));
      const allSlots = allSlotsSnap.val() || {};
      const allBookings = allBookingsSnap.val() || {};

      // 1. ดึงข้อมูลเวลาของ booking ที่มีปัญหา
      const checkEntry = new Date(`${bookingToMove.entryDate}T${bookingToMove.entryTime || '00:00'}`);
      const checkExit = new Date(`${bookingToMove.exitDate}T${bookingToMove.exitTime || '23:59'}`);
      const checkEntryDate = bookingToMove.entryDate;
      const checkExitDate = bookingToMove.exitDate;
      const checkRateType = bookingToMove.rateType;

      const availableSlots = [];

      // 2. วนลูปทุกชั้น ทุกช่องจอด
      for (const floor in allSlots) {
        for (const slotId in allSlots[floor]) {
          // ข้ามช่องจอดเดิม (ช่องที่มีปัญหา)
          if (floor === bookingToMove.floor && slotId === bookingToMove.slotId) {
            continue;
          }

          let isAvailable = true;

          // 3. วนลูปเช็ก booking ทั้งหมด
          for (const booking of Object.values(allBookings)) {
            // ถ้า booking นี้ถูกยกเลิก หรือ ไม่ใช่ช่องจอดนี้ -> ข้าม
            if (booking.status === 'cancelled' || booking.floor !== floor || booking.slotId !== slotId) {
              continue;
            }

            // 4. เช็กเวลาซ้อนทับ (Logic เดียวกับหน้า ReservationScreen)
            const bookingEntry = new Date(`${booking.entryDate}T${booking.entryTime || '00:00'}`);
            const bookingExit = new Date(`${booking.exitDate}T${booking.exitTime || '23:59'}`);

            let overlap = false;
            if (checkRateType === 'hourly') {
              if (checkEntry < bookingExit && checkExit > bookingEntry) overlap = true;
            } else {
              if (checkEntryDate <= booking.exitDate && checkExitDate >= booking.entryDate) overlap = true;
            }

            if (overlap) {
              isAvailable = false;
              break; // ช่องนี้ไม่ว่าง, หยุดเช็ก
            }
          }

          if (isAvailable) {
            availableSlots.push({ floor, slotId });
          }
        }
      }

      // 5. จัดลำดับและสุ่ม
      const sameFloorSlots = availableSlots.filter(s => s.floor === bookingToMove.floor);
      const otherFloorSlots = availableSlots.filter(s => s.floor !== bookingToMove.floor);

      if (sameFloorSlots.length > 0) {
        // มีช่องว่างในชั้นเดียวกัน
        return sameFloorSlots[Math.floor(Math.random() * sameFloorSlots.length)];
      } else if (otherFloorSlots.length > 0) {
        // ไม่มี, ไปสุ่มจากชั้นอื่น
        return otherFloorSlots[Math.floor(Math.random() * otherFloorSlots.length)];
      } else {
        // ไม่มีช่องว่างเหลือเลย
        return null;
      }

    } catch (error) {
      console.error("Error finding available slot:", error);
      return null;
    }
  };


  const [showParkingProblemModal, setShowParkingProblemModal] = useState(false);

  const showParkingProblemDemo = async () => {
    // 1. (Demo) ค้นหา booking "A02"
    const bookingsSnapshot = await get(child(ref(db), "bookings"));
    const data = bookingsSnapshot.val() || {};
    const bookingToMoveEntry = Object.entries(data).find(
      ([id, b]) => b.username === username && b.slotId === "A02" && b.status !== "cancelled"
    );

    if (!bookingToMoveEntry) {
      Alert.alert("Demo Error", "Cannot find active booking for Slot A02 to start demo.");
      return;
    }
    
    const [bookingId, bookingData] = bookingToMoveEntry;
    const bookingToMove = { ...bookingData, id: bookingId }; // <-- ข้อมูล booking A02
    setOriginalBooking(bookingToMove); // เก็บไว้ใน state

    // 2. ค้นหาช่องจอดใหม่
    const newSlot = await findRandomAvailableSlot(bookingToMove);

    if (!newSlot) {
      Alert.alert("System Alert", "No available slots found for relocation. Please contact admin.");
      return;
    }

    // 3. เก็บช่องจอดใหม่ไว้ใน state
    setRelocationSlot(newSlot);

    // 4. ส่งแจ้งเตือน
    const now = new Date();
    const newNotif = {
      username: username,
      bookingType: userType || "resident",
      slotId: "A02", // แจ้งเตือนเรื่อง A02
      floor: bookingToMove.floor || "1st Floor",
      licensePlate: bookingToMove.licensePlate || "bt77",
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0,5),
      read: false,
      type: "Parking Slot Unavailable",
      message: `Your booked parking slot A02 is currently unavailable. We found a new slot for you: ${newSlot.slotId} (${newSlot.floor}). Please choose relocation or receive compensation.`
    };

    const sent = await sendNotification(newNotif);
    if (sent) setUnreadCount(prev => prev + 1);

    // 5. แสดง Modal
    setShowParkingProblemModal(true);
  };

   
  const handleAcceptRelocation = async () => {

    // ตรวจสอบว่ามีข้อมูลจาก state หรือไม่
    if (!originalBooking || !relocationSlot) {
      Alert.alert("Error", "Relocation data is missing. Please try again.");
      setShowParkingProblemModal(false);
      return;
    }

    try {
      const oldBooking = originalBooking;
      const oldBookingId = originalBooking.id;
      const newSlot = relocationSlot; // สุ่มพื้นที่ว่าง
  
      // 1. สร้าง TimeRange ที่ถูกต้อง 
      const bookingTimeRange = `${oldBooking.entryTime}-${oldBooking.exitTime}`;

      // สร้าง Object 'updates' ว่างๆ เพื่อรวบรวมทุกอย่างที่จะทำ
      const updates = {};
  
      // 2. คำสั่ง "ยกเลิก booking เดิม" 
      updates[`bookings/${oldBookingId}/status`] = "cancelled";
  
      //  3. จัดการ "ลบข้อมูลใน slot เดิม" 
      const oldSlotRef = ref(db, `parkingSlots/${oldBooking.floor}/${oldBooking.slotId}`);
      const oldSlotSnap = await get(oldSlotRef);
      
      if (oldSlotSnap.exists()) {
        const oldSlotData = oldSlotSnap.val();
        let remainingBookings = []; 
        let matchingKey = null;

        for (const key in oldSlotData) {
          const parkedBooking = oldSlotData[key];
          if (typeof parkedBooking === 'object' && parkedBooking !== null && parkedBooking.date) {
            if (
              parkedBooking.date === oldBooking.entryDate && 
              parkedBooking.timeRange === bookingTimeRange && 
              parkedBooking.username === oldBooking.username
            ) {
              matchingKey = key; 
            } else {
              remainingBookings.push(parkedBooking); 
            }
          }
        }
  
        if (matchingKey) {
          if (remainingBookings.length > 0) {
            updates[`parkingSlots/${oldBooking.floor}/${oldBooking.slotId}`] = remainingBookings;
          } else {
            updates[`parkingSlots/${oldBooking.floor}/${oldBooking.slotId}`] = { status: "available" };
          }
        }
      }
  
      // 4. สร้าง booking ใหม่ (ที่ช่องจอดใหม่) 
      const newBookingData = {
        ...oldBooking,
        slotId: newSlot.slotId, //  ใช้ slotId ใหม่
        floor: newSlot.floor,   //  ใช้ floor ใหม่
        status: "confirmed",
        date: oldBooking.entryDate,
        timeRange: bookingTimeRange,
        id: null, 
        sessionKey: null,
        notifiedHour: null,
        notifiedDaily: null,
        notifiedMonthly: null,
      };

      const newBookingRef = push(child(ref(db), 'bookings'));
      const newBookingId = newBookingRef.key;

      newBookingData.id = newBookingId;
      newBookingData.sessionKey = newBookingId;

      updates[`bookings/${newBookingId}`] = newBookingData;
  
      //  5. เตรียมข้อมูลใหม่สำหรับ parkingSlots (ที่ช่องจอดใหม่) 
      const selectedFloor = newSlot.floor; //  ใช้ floor ใหม่
      const selectedSlot = newSlot.slotId; //  ใช้ slotId ใหม่
      const slotRef = ref(db, `parkingSlots/${selectedFloor}/${selectedSlot}`);
      const slotSnap = await get(slotRef);
  
      const newSlotBooking = {
        date: newBookingData.date,
        timeRange: newBookingData.timeRange,
        available: false,
        status: "moved",
        username: newBookingData.username,
      };
  
      let updatedSlotData = [];
      if (slotSnap.exists()) {
        const val = slotSnap.val();
        const existingBookings = (Array.isArray(val) || (typeof val === 'object' && val !== null && val.hasOwnProperty('0')))
          ? Object.values(val).filter(item => typeof item === 'object' && item !== null && item.date)
          : []; 
        
        const isDuplicate = existingBookings.some(
          (b) => b.date === newSlotBooking.date && b.timeRange === newSlotBooking.timeRange
        );
        updatedSlotData = isDuplicate ? existingBookings : [...existingBookings, newSlotBooking];
      } else {
        updatedSlotData = [newSlotBooking];
      }
  
      updates[`parkingSlots/${selectedFloor}/${selectedSlot}`] = updatedSlotData;
  
      //6. สั่งทำงาน 'updates' ทั้งหมดในครั้งเดียว
      await update(ref(db), updates);
  
      Alert.alert(
        "Parking Relocated Successfully", 
        `Your booking has been moved to Slot ${newSlot.slotId} (${newSlot.floor})` //  แสดง slot ใหม่
      );
      
      setShowParkingProblemModal(false); // ปิด Modal
      setOriginalBooking(null); // ล้าง state
      setRelocationSlot(null); // ล้าง state
      fetchBookings();

    } catch (error) {
      console.error("Error relocating booking:", error);
      Alert.alert("Error", "Failed to relocate booking: " + error.message);
    }
  };
  
 // ฟังก์ชันรับคูปอง 
  const handleDeclineRelocation = async () => {
   
    //  ตรวจสอบว่ามีข้อมูลจาก state หรือไม่
    if (!originalBooking) {
      Alert.alert("Error", "Booking data is missing. Please try again.");
      setShowParkingProblemModal(false);
      return;
    }

  try {
    //  ใช้ข้อมูลจาก state (originalBooking)
    const currentBooking = originalBooking;

    // สร้างวันที่และเวลา
    const now = new Date();
    const createdDate = now.toISOString().split('T')[0]; 
    const createdTime = now.toTimeString().split(' ')[0].slice(0, 5); 
    
    // คำนวณ expiryDate (createdDate + 1 เดือน)
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    const expiryDateStr = expiryDate.toISOString().split('T')[0];

    // สร้างคูปองตาม rateType ของ booking
    const newCoupon = {
      username: currentBooking.username, // ใช้ username ของเจ้าของ booking ที่มีปัญหา
      createdDate: createdDate,
      createdTime: createdTime,
      expiryDate: expiryDateStr, // ไม่มีเวลา
      reason: `Slot ${currentBooking.slotId} unavailable due to overstay`,
      discountType: currentBooking.rateType || 'hourly', // ใช้ rateType จาก booking จริง
      used: false,
      bookingId: currentBooking.id,
    };

    // บันทึกคูปองลง Firebase
    const couponRef = ref(db, "coupons");
    await push(couponRef, newCoupon);

    // อัปเดตสถานะ booking เป็น cancelled
    await update(ref(db, `bookings/${currentBooking.id}`), { 
      status: "cancelled",
      cancelReason: "Slot unavailable - Compensation issued"
    });

    // อัปเดต coupon count (ถ้า username ตรงกัน)
    if (currentBooking.username === username) {
        setCouponCount(prev => prev + 1);
    }


    Alert.alert(
      "Compensation Coupon Received", 
      `You have received a ${currentBooking.rateType === 'hourly' ? '10%' : currentBooking.rateType === 'daily' ? '20%' : '30%'} discount coupon for your next ${currentBooking.rateType} booking. The coupon is valid until ${expiryDateStr}.`,
      [{ 
        text: "OK", 
        onPress: () => {
          setShowParkingProblemModal(false);
          setOriginalBooking(null); // ล้าง state
          setRelocationSlot(null); // ล้าง state
          setHandledOverstaySlot(null); // เคลียร์ flag ป้องกันเด้งซ้ำ
          fetchBookings();
        }
      }]
    );
  } catch (error) {
    console.error("Error creating coupon:", error);
    Alert.alert("Error", "Failed to create coupon: " + error.message);
  }
};

  //เพิ่ม 1.
// Helper function สำหรับยกเลิกการจองอัตโนมัติ (No-Show)
  const autoCancelBooking = async (booking) => {
    try {
      console.log(`Auto-cancelling booking: ${booking.id}`);
      const updates = {};

      // 1. อัปเดตสถานะ booking เป็น 'cancelled'
      updates[`bookings/${booking.id}/status`] = 'cancelled';
      updates[`bookings/${booking.id}/cancelReason`] = 'Auto-cancelled (No-Show)';

      // 2. ค้นหาและลบ booking ออกจาก parkingSlots
      const slotRef = ref(db, `parkingSlots/${booking.floor}/${booking.slotId}`);
      const slotSnap = await get(slotRef);
      const bookingTimeRange = `${booking.entryTime}-${booking.exitTime}`;

      if (slotSnap.exists()) {
        const val = slotSnap.val();
        // ดึงข้อมูล booking ทั้งหมดใน slot (จาก Logic ของ handleAcceptRelocation)
        const existingBookings = (Array.isArray(val) || (typeof val === 'object' && val !== null && val.hasOwnProperty('0')))
          ? Object.values(val).filter(item => typeof item === 'object' && item !== null && item.date)
          : [];

        // กรอง booking ที่ถูกยกเลิกนี้ออก
        const updatedSlotData = existingBookings.filter(b =>
          !(b.date === booking.entryDate &&
            b.timeRange === bookingTimeRange &&
            b.username === booking.username)
        );

        if (updatedSlotData.length > 0) {
          // ถ้ายังมี booking อื่นเหลือ -> อัปเดต array
          updates[`parkingSlots/${booking.floor}/${booking.slotId}`] = updatedSlotData;
        } else {
          // ถ้าไม่เหลือเลย -> ตั้งค่าเป็น available
          updates[`parkingSlots/${booking.floor}/${booking.slotId}`] = { status: "available" };
        }
      }

      // 3. สั่ง update ทั้งหมด
      await update(ref(db), updates);
      console.log(`Successfully auto-cancelled ${booking.id} and freed slot.`);

    } catch (error) {
      console.error(`Error during auto-cancel for ${booking.id}:`, error);
      // ไม่ต้อง Alert เพราะเป็น background task
    }
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
      const snapshot = await get(child(ref(db), "coupons"));
      const data = snapshot.val() || {};
  
      // กรองเฉพาะคูปองของ user นี้และยังไม่หมดอายุ
      const userCoupons = Object.entries(data)
        .map(([id, coupon]) => ({
          id,
          ...coupon
        }))
        .filter(coupon => {
          const expiryDate = new Date(coupon.expiryDate);
          return coupon.username === username && expiryDate > new Date() && !coupon.used;
        });
  
      setCouponCount(userCoupons.length);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      setCouponCount(0);
    }
  };


// Demo: แสดง Pop-up "No-Show Warning"
  const handleDemoNoShowWarningModal = async () => {
    setLoading(true);
    
    // 1. ค้นหา booking "B03"
    const snapshot = await get(child(ref(db), "bookings"));
    const data = snapshot.val() || {};
    const demoBooking = Object.values(data).find(
      (b) => b.username === username && b.bookingType === "resident" && b.slotId === "B03" && b.status !== 'cancelled'
    );

    if (!demoBooking) {
      Alert.alert("Demo Error", "Cannot find active booking for Slot B03 to start demo.");
      setLoading(false);
      return;
    }

    
    const now = new Date(); 
    
    // 2. คำนวณเวลา
    const entryDateTime = new Date(`${demoBooking.entryDate}T${demoBooking.entryTime}`);
    const cancelTime = new Date(entryDateTime.getTime() + 30 * 60 * 1000);
    const cancelTimeStr = cancelTime.toTimeString().slice(0, 5); // เช่น "10:30"

    // 3. สร้าง Notification
    const newNotif = {
      username: demoBooking.username,
      visitorUsername: demoBooking.visitorInfo?.visitorUsername,
      bookingType: demoBooking.bookingType,
      slotId: demoBooking.slotId,
      floor: demoBooking.floor,
      licensePlate: demoBooking.visitorInfo?.licensePlate || demoBooking.licensePlate,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
      read: false,
      type: "No-Show Warning",
      message: `Your booking for ${demoBooking.slotId} will be automatically cancelled at ${cancelTimeStr}(30 mins after entrytime)`
    };

    //4. "เรียกใช้ฟังก์ชันจริง" (ส่ง Noti)
    const sent = await sendNotificationOnce(newNotif);
    if (sent) {
       setUnreadCount(prev => prev + 1);
    }

    // 5. มาร์คว่าแจ้งเตือนแล้ว (ใน Firebase)
    await update(ref(db, `bookings/${demoBooking.id}`), { notifiedNoShowWarning: true });

    // 6. "เรียกใช้ฟังก์ชันจริง" (ตั้งค่า State)
    setCurrentNoShowBooking({
      username: demoBooking.bookingType === "visitor" ? demoBooking.visitorInfo?.visitorUsername || "N/A" : demoBooking.username || "N/A",
      slotId: demoBooking.slotId || 'N/A',
      floor: demoBooking.floor || 'N/A',
      licensePlate: demoBooking.visitorInfo?.licensePlate || demoBooking.licensePlate || 'N/A',
      cancelTime: cancelTimeStr,
    });

    // 7. "เรียกใช้ฟังก์ชันจริง" (แสดง Modal)
    setShowNoShowWarningModal(true);
    
    setLoading(false);
  };



  // ฟังก์ชัน checkOverstayAndTriggerRelocation 
const checkOverstayAndTriggerRelocation = async () => {
    // ถ้า Modal เปิดอยู่แล้ว หรือ กำลังจัดการปัญหา Slot อื่นอยู่ -> ออก
    if (showParkingProblemModal || handledOverstaySlot) return;

    const now = new Date();
    const activeBookings = bookingsRef.current; // Booking ของ User ปัจจุบัน

    for (const myBooking of activeBookings) {
        // ตรวจสอบเฉพาะ Booking ที่กำลังจะเริ่ม หรือ เพิ่งเริ่ม
        if (!myBooking.entryDate || !myBooking.entryTime) continue;

        const entryDateTime = new Date(`${myBooking.entryDate}T${myBooking.entryTime}`);
        const timeDiffMinutes = (entryDateTime - now) / (1000 * 60);

        if (timeDiffMinutes > 0 || timeDiffMinutes < -15) continue;

        // ถ้าใกล้ถึงเวลาจอดของ myBooking 
        try {
            // Query หา Booking *ทั้งหมด* ของ Slot เดียวกัน
            const bookingsQuery = query(
                ref(db, 'bookings'),
                orderByChild('slotId'),
                equalTo(myBooking.slotId)
            );
            const snapshot = await get(bookingsQuery);
            if (!snapshot.exists()) continue; // ไม่มี Booking อื่นในช่องนี้

            const slotBookings = snapshot.val();
            let isOverstayConflict = false;
            let overstayingBooking = null;
            let lastBarrierStatusReasoning = 'No conflicting booking found'; // สำหรับ Debug

            // วนลูปหา Booking อื่นๆ ที่อาจจอดทับ
            for (const otherBookingId in slotBookings) {
                const otherBooking = { ...slotBookings[otherBookingId], id: otherBookingId };

                // ข้าม Booking ของตัวเอง และ Booking ที่ Cancelled
                if (otherBooking.id === myBooking.id || otherBooking.status === 'cancelled') continue;

                // เช็กว่าเป็น Booking ที่อยู่ *ก่อนหน้า* myBooking
                if (!otherBooking.exitDate || !otherBooking.exitTime) continue;
                const otherExitDateTime = new Date(`${otherBooking.exitDate}T${otherBooking.exitTime}`);

                // 1. เช็กเวลาจอดเกิน 
                if (otherExitDateTime < entryDateTime && now > otherExitDateTime) {

                    // 2. เช็ก Barrier Logs 
                    const barrierLogsRef = ref(db, `bookings/${otherBooking.id}/barrierLogs`);
                    const barrierSnapshot = await get(barrierLogsRef); // ดึง Log ทั้งหมด

                    let conflictBasedOnBarrier = false; // Flag สำหรับตัดสินจาก Barrier

                    if (!barrierSnapshot.exists()) {
                        // กรณี 1: ไม่มี Log เลย -> ถือว่าจอดเกิน
                        conflictBasedOnBarrier = true;
                        lastBarrierStatusReasoning = 'No barrier logs found';
                    } else {
                        const logs = barrierSnapshot.val();
                        const logEntries = Object.values(logs).map(log => ({
                            ...log,
                            datetime: new Date(`${log.date}T${log.time || '00:00'}`)
                        }));
                        logEntries.sort((a, b) => a.datetime - b.datetime); // เรียง เก่า -> ใหม่

                        if (logEntries.length === 0) {
                             // (เผื่อกรณี log เป็น object ว่าง)
                            conflictBasedOnBarrier = true;
                             lastBarrierStatusReasoning = 'Log object was empty';
                        } else {
                            const lastLog = logEntries[logEntries.length - 1];
                            
                            if (lastLog.status === 'lifted') {
                                // กรณี 2: Log สุดท้ายคือ lifted -> จอดเกิน
                                conflictBasedOnBarrier = true;
                                lastBarrierStatusReasoning = `Last log was 'lifted' at ${lastLog.time}`;
                            } else if (lastLog.status === 'lowered') {
                                if (logEntries.length === 1) {
                                    // กรณี 1 (ซ้ำ): มีแค่ Log เดียว และเป็น lowered -> จอดเกิน
                                    conflictBasedOnBarrier = true;
                                     lastBarrierStatusReasoning = `Only one log found: 'lowered' at ${lastLog.time}`;
                                } else {
                                    // กรณี 3 & 4: Log สุดท้ายคือ lowered, ดูรองสุดท้าย
                                    const secondLastLog = logEntries[logEntries.length - 2];
                                    if (secondLastLog.status === 'lifted') {
                                        // กรณี 3: รองสุดท้าย lifted -> ออกแล้ว 
                                        conflictBasedOnBarrier = false; // ไม่ใช่ Conflict
                                        lastBarrierStatusReasoning = `Exited: Sequence 'lifted' then 'lowered' (last at ${lastLog.time})`;
                                    } else {
                                        // กรณี 4: รองสุดท้ายไม่ใช่ lifted -> จอดเกิน
                                        conflictBasedOnBarrier = true;
                                        lastBarrierStatusReasoning = `Incorrect sequence: Last was 'lowered' at ${lastLog.time}, previous was '${secondLastLog.status}'`;
                                    }
                                }
                            }
                        }
                    }
                    if (conflictBasedOnBarrier) {
                        isOverstayConflict = true;
                        overstayingBooking = otherBooking;
                        break; // เจอ Conflict แล้ว หยุดหา
                    }
                }
            } 

            // ถ้าเจอ Conflict จริงๆ
            if (isOverstayConflict) {
                console.log(`Conflict detected: Slot ${myBooking.slotId} occupied by user ${overstayingBooking?.username}. Reasoning: ${lastBarrierStatusReasoning}.`);

                // ตั้งค่า state เพื่อเริ่มกระบวนการย้ายที่
                setOriginalBooking(myBooking);
                setHandledOverstaySlot(myBooking.slotId); // ตั้ง Flag ว่ากำลังจัดการ Slot นี้

                const newSlot = await findRandomAvailableSlot(myBooking);
                if (!newSlot) {
                    Alert.alert(
                        "Critical Error",
                        `Your slot ${myBooking.slotId} is unavailable due to overstay, and no free slots were found.`
                    );
                    setRelocationSlot(null);
                } else {
                    setRelocationSlot(newSlot);
                }

                // แสดง Modal
                setShowParkingProblemModal(true);
                break; // เจอ Conflict แล้ว หยุดเช็ก Booking อื่นของ User นี้
            }

        } catch (error) {
            console.error("Error checking for overstay conflict:", error);
        }
    } 
};

//เพิ่ม 2.
// ฟังก์ชันใหม่สำหรับเช็ก No-Show และ Auto-Cancel
 const checkNoShowAndAutoCancel = async () => {
    const now = new Date();
    const activeBookings = bookingsRef.current; // Booking ของ User ปัจจุบัน

    for (const booking of activeBookings) {
      
      //เช็กแค่ status (จะเช็ก rateType ข้างใน)
      if (booking.status !== 'confirmed') {
        continue;
      }

      // กำหนดเวลาเข้าจอด (entryDateTime) ตามประเภทการจอง
      let entryDateTime;
      let entryTimeStr; // สำหรับใช้ใน Message ตอนยกเลิก

      if (booking.rateType === 'hourly') {
        if (!booking.entryTime) continue; // ข้ามถ้าข้อมูลไม่ครบ
        entryDateTime = new Date(`${booking.entryDate}T${booking.entryTime}`);
        entryTimeStr = booking.entryTime; // เช่น "10:00"
      } else if (booking.rateType === 'daily' || booking.rateType === 'monthly') {
        if (!booking.entryDate) continue; // ข้ามถ้าข้อมูลไม่ครบ
        entryDateTime = new Date(`${booking.entryDate}T00:00:00`); // บังคับเป็นเที่ยงคืน
        entryTimeStr = '00:00';
      } else {
        continue; // ไม่ใช่ประเภทที่รองรับ No-Show
      }


      // คำนวณเวลา
      if (now < entryDateTime) {
        continue;
      }

      const minutesSinceEntry = (now - entryDateTime) / (1000 * 60);

      //ถ้ายังไม่ถึง 10 นาที (เวลาเตือน) หรือเลย 35 นาที -> ข้าม
      if (minutesSinceEntry < 10 || minutesSinceEntry > 35) {
        continue;
      }

      // ถ้าอยู่ในช่วง (>= 10 นาที) ให้เช็ก Barrier Logs 
      let hasEntered = false;
      try {
        const barrierRef = ref(db, `bookings/${booking.id}/barrierLogs`);
        const snapshot = await get(barrierRef);

        if (snapshot.exists()) {
          const logs = snapshot.val();
          // วนหาแค่ 'lowered' อันแรกก็พอ
          for (const key in logs) {
            if (logs[key].status === 'lowered') {
              hasEntered = true; // เจอแล้ว = เข้าจอดรถแล้ว
              break;
            }
          }
        }
      } catch (err) {
        console.error("Error checking barrier logs for no-show:", err);
        continue; // ถ้า error ให้ข้ามไปก่อน
      }

      // การแจ้งเตือน 
      const warningKey = 'notifiedNoShowWarning';
      
      if (minutesSinceEntry >= 10 && minutesSinceEntry < 30 && !hasEntered && !booking[warningKey]) {
        
        console.log(`Sending no-show warning for ${booking.id}`);

        // คำนวณเวลาที่จะยกเลิก (Entry + 30 นาที)
        const cancelTime = new Date(entryDateTime.getTime() + 30 * 60 * 1000);
        const cancelTimeStr = cancelTime.toTimeString().slice(0, 5); // เช่น "10:30" หรือ "00:30"

        const newNotif = {
          username: booking.username,
          visitorUsername: booking.visitorInfo?.visitorUsername,
          bookingType: booking.bookingType,
          slotId: booking.slotId,
          floor: booking.floor,
          licensePlate: booking.visitorInfo?.licensePlate || booking.licensePlate,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().slice(0, 5),
          read: false,
          type: "No-Show Warning",
          message: `Your booking for ${booking.slotId} will be automatically cancelled at ${cancelTimeStr} (30 mins after entrytime)`         
        };

        // 1. ตั้งค่าข้อมูลสำหรับ Modal
        setCurrentNoShowBooking({
          username: booking.bookingType === "visitor" ? booking.visitorInfo?.visitorUsername || "N/A" : booking.username || "N/A",
          slotId: booking.slotId || 'N/A',
          floor: booking.floor || 'N/A',
          licensePlate: booking.visitorInfo?.licensePlate || booking.licensePlate || 'N/A',
          cancelTime: cancelTimeStr, // เช่น "10:30" หรือ "00:30"
        });

        // 2. แสดง Modal
        setShowNoShowWarningModal(true);

        // ส่งแจ้งเตือน (แบบเช็กซ้ำ)
        const sent = await sendNotificationOnce(newNotif);
        if (sent) {
           setUnreadCount(prev => prev + 1);
        }

        // มาร์คว่าแจ้งเตือนแล้ว
        await update(ref(db, `bookings/${booking.id}`), { [warningKey]: true });
        booking[warningKey] = true; // อัปเดตใน state ชั่วคราวด้วย
      }

      // การยกเลิก 
      if (minutesSinceEntry >= 30 && !hasEntered) {
        console.log(`Auto-cancelling ${booking.id} for no-show.`);

        // เรียกใช้ฟังก์ชันยกเลิก
        await autoCancelBooking(booking);

        // ส่งแจ้งเตือนว่ายกเลิกแล้ว
        const cancelNotif = {
          username: booking.username,
          visitorUsername: booking.visitorInfo?.visitorUsername,
          bookingType: booking.bookingType,
          slotId: booking.slotId,
          floor: booking.floor,
          licensePlate: booking.visitorInfo?.licensePlate || booking.licensePlate,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().slice(0, 5),
          read: false,
          type: "Booking Auto-Cancelled",
          //ใช้ entryTimeStr เพื่อให้ message ถูกต้อง
          message: `Your booking for ${booking.slotId} at ${entryTimeStr} was automatically cancelled due to your no-show at the parking.`
        };
        const sent = await sendNotification(cancelNotif); // ส่งเลย ไม่ต้องเช็กซ้ำ
         if (sent) {
           setUnreadCount(prev => prev + 1);
        }

        // สั่งโหลดข้อมูลใหม่ทั้งหมด
        fetchBookings();
        break; // หยุด loop เพราะ booking list เปลี่ยนแล้ว
      }
    }
  };




  //  2. เพิ่มฟังก์ชัน checkUnavailableSlotNotifications
  const checkUnavailableSlotNotifications = async (activeBookings, userNotifications) => {
    // ถ้า Modal เปิดอยู่แล้ว (จาก Demo หรือจาก Noti รอบก่อน) ให้ข้ามไป
    if (showParkingProblemModal) {
      return;
    }

    // ค้นหา notification "Parking Slot Unavailable" ที่ยังไม่ถูกจัดการ
    const problemNotification = userNotifications.find(
      n => n.type === "Parking Slot Unavailable" && !n.handled
    );

    if (!problemNotification) {
      return; // ไม่มีปัญหา
    }

    // ถ้าเจอ, ค้นหา booking ที่ active อยู่ซึ่งตรงกับ notification
    const bookingToMove = activeBookings.find(
      b => b.slotId === problemNotification.slotId && b.floor === problemNotification.floor
    );

    // ถ้าไม่เจอ booking (เช่น user กดยกเลิกไปแล้ว)
    if (!bookingToMove) {
      // มาร์คว่าจัดการแล้ว จะได้ไม่เด้งอีก
      await update(ref(db, `notifications/${problemNotification.id}`), { handled: true });
      return;
    }

    // ถ้าเจอ booking:
    // 1. เก็บ booking ที่มีปัญหาไว้ใน state
    setOriginalBooking(bookingToMove);

    // 2. ค้นหาช่องจอดใหม่ (ใช้ฟังก์ชันเดียวกับ Demo)
    const newSlot = await findRandomAvailableSlot(bookingToMove);

    if (!newSlot) {
      // กรณีฉุกเฉิน: ไม่มีที่จอดเหลือเลย
      Alert.alert(
        "Critical Error", 
        `Your slot ${bookingToMove.slotId} is unavailable, and we could not find any free slots to relocate you. Please decline and accept a coupon.`
      );
      setRelocationSlot(null); // ตั้งเป็น null
    } else {
      // 3. เก็บช่องจอดใหม่ไว้ใน state
      setRelocationSlot(newSlot);
    }

    // 4. มาร์ค notification นี้ว่า "จัดการแล้ว"
    await update(ref(db, `notifications/${problemNotification.id}`), { handled: true });
    
    // 5. แสดง Modal
    setShowParkingProblemModal(true);
  };



  // ฟังก์ชัน fetchBookings (แก้ให้เก็บ Notifications)
  const fetchBookings = async () => {
    try {
      const bookingsSnapshot = await get(child(ref(db), "bookings"));
      const bookingsData = bookingsSnapshot.val() || {};

      const activeBookings = Object.values(bookingsData).filter(
        (b) => (b.username === username || (userType === "visitor" && b.visitorInfo?.visitorUsername === username)) && b.slotId && b.status !== "cancelled"
      );

      activeBookings.forEach(b => b.showingModal = false);

      setBookings(activeBookings);
      bookingsRef.current = activeBookings; // อัปเดต ref ด้วย
      setLoading(false);
      checkBookingReminders(); // เช็ก Reminder ปกติ

      // ดึง notifications ทั้งหมด (รวม ID)
      const notifSnapshot = await get(child(ref(db), `notifications`));
      const notifData = notifSnapshot.val() || {};
      
      const userNotifications = Object.entries(notifData) // เอา [id, data]
        .filter(([id, n]) => n.username === username || n.visitorUsername === username)
        .map(([id, n]) => ({ id, ...n })); // เราต้องการ 'id' เพื่ออัปเดต 'handled'
      
      const unread = userNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);

      await fetchCoupons();

      // เช็ก Notification Unavailable ก่อน (ระบบจริงแบบเดิม)
      await checkUnavailableSlotNotifications(activeBookings, userNotifications);
      
      // ถ้า Modal ยังไม่เปิดจาก Noti, ให้ลองเช็ก Overstay (ระบบใหม่)
      // (เราต้อง await fetchBookings เสร็จก่อน ถึงจะมี activeBookings ให้เช็ก)
      // การเช็ก Overstay จะถูกเรียกจาก Interval ใน useEffect แทน

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


  // useEffect
  useEffect(() => {
    fetchBookings(); // Fetch ครั้งแรกเมื่อเข้าหน้าจอ
    
    // เมื่อกลับเข้าหน้าจอ ให้ fetch ใหม่
    const unsubscribeFocus = navigation.addListener("focus", fetchBookings); 

    // ตั้งเวลาเช็ก Reminder และ Overstay ทุก 30 วินาที
    const intervalId = setInterval(() => {
      checkBookingReminders();
      checkOverstayAndTriggerRelocation(); // <-- เรียกใช้ฟังก์ชันใหม่
      checkNoShowAndAutoCancel();
    }, 30000); // 30 วินาที

    // Cleanup function: หยุด interval และ listener เมื่อออกจากหน้าจอ
    return () => {
      unsubscribeFocus();
      clearInterval(intervalId);
    };
  }, [navigation, username]); // Dependency array

  const handleBack = () => {
  navigation.reset({
    index: 0,
    routes: [{ name: "BookingType", params: { username } }],
  });
};

 const handleCardPress = (bookingData) => navigation.navigate("MyParkingInfo", { username, bookingData, userType });
  const handleNotificationPress = () => {
    setShowReminderModal(false);
    navigation.navigate("Notifications", { username, userType });
  };
  const handleCouponPress = () => navigation.navigate("MyCoupon", { username });

  // (Formatters: formatBookingType, getBookingTypeColor, getUserTypeColor)
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
        <TouchableOpacity style={[styles.bookAgainButton, { backgroundColor: '#FF5252', marginTop: 10 }]} onPress={showParkingProblemDemo}><Text style={styles.bookAgainText}>Demo: Parking Slot Unavailable (Move)</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.bookAgainButton, { backgroundColor: '#2196F3', marginTop: 10 }]} onPress={showParkingProblemDemo}><Text style={styles.bookAgainText}>Demo: Parking Slot Unavailable (Coupon)</Text></TouchableOpacity>

        <TouchableOpacity style={[styles.bookAgainButton, { backgroundColor: '#056d26ff', marginTop: 10}]} onPress={handleDemoNoShowWarningModal}>
          <Text style={styles.bookAgainText}>Demo: No-Show Warning</Text>
        </TouchableOpacity>

      </ScrollView>

      <Modal visible={showReminderModal} transparent animationType="fade" onRequestClose={() => setShowReminderModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {currentReminder && <>
              <Text style={styles.modalTitle}>⚠️ Parking Time Alert</Text>
              <Text style={styles.modalMessage}>10 minutes left, please move your car immediately.</Text>
              <Text style={styles.modalMessage}>Username: {currentReminder.username}{"\n"}Slot {currentReminder.slotId}, Floor: {currentReminder.floor }, License: {currentReminder.licensePlate }</Text>
            </>}
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#B19CD8' }]} onPress={() => setShowReminderModal(false)}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* === [ Modal ใหม่สำหรับ No-Show Warning ] === */}
      <Modal visible={showNoShowWarningModal} transparent animationType="fade" onRequestClose={() => setShowNoShowWarningModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {currentNoShowBooking && <>
              <Text style={styles.modalTitle}>⚠️ Didn't show up at the parkingslot </Text>
              <Text style={styles.modalMessage}>
                You have not yet parked, the reservation will be automatically canceled at time {currentNoShowBooking.cancelTime}
              </Text>
              <Text style={styles.modalMessage}>Username: {currentNoShowBooking.username}{"\n"}Slot {currentNoShowBooking.slotId}, Floor: {currentNoShowBooking.floor}, License: {currentNoShowBooking.licensePlate}
              </Text>
            </>}
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#B19CD8' }]} onPress={() => setShowNoShowWarningModal(false)}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 4. แก้ไข `Modal` (ให้แสดงข้อมูลจริง) */}
      <Modal visible={showParkingProblemModal} transparent animationType="fade" onRequestClose={() => setShowParkingProblemModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { width: '85%' }]}>
            
            {/* ปุ่มปิดมุมขวาบน */}
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => {
                  setShowParkingProblemModal(false);
                  setOriginalBooking(null); // ล้าง state เมื่อปิด
                  setRelocationSlot(null); // ล้าง state เมื่อปิด
              }}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.warningIconContainer}><Ionicons name="warning" size={50} color="#FF9800" /></View>
            <Text style={styles.modalTitle}>Parking Slot Unavailable</Text>
            
            <Text style={styles.modalMessage}>
              The parking slot {originalBooking?.slotId || '...'} ({originalBooking?.floor || '...'}) 
              you booked is currently unavailable.
            </Text>

            <Text style={styles.modalMessage}>We apologize for the inconvenience. Please choose one of the following options:</Text>
            <View style={styles.optionsContainer}>
              <TouchableOpacity 
                style={[styles.optionButton, { backgroundColor: '#4CAF50' }]} 
                onPress={handleAcceptRelocation}
                // ปิดปุ่มถ้าระบบหาที่ใหม่ไม่เจอ
                disabled={!relocationSlot} 
              >
                <Text style={styles.optionButtonText}>Accept Relocation</Text>
                {/* แสดงช่องจอดใหม่ที่สุ่มได้จาก state */}
                {relocationSlot ? (
                  <Text style={styles.optionSubtext}>
                    Move to Slot {relocationSlot.slotId} ({relocationSlot.floor})
                  </Text>
                ) : (
                  <Text style={styles.optionSubtext}>Finding new slot...</Text>
                )}

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