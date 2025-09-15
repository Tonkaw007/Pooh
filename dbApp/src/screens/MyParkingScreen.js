import React, { useEffect, useState } from "react"; 
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from '../firebaseConfig';
import { ref, get, child } from 'firebase/database';

const MyParkingScreen = ({ route, navigation }) => {
    const { username, userType } = route.params; 
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    // ฟังก์ชันโหลด bookings ล่าสุดจาก Firebase
    const fetchBookings = async () => {
        try {
            const snapshot = await get(child(ref(db), 'bookings'));
            const data = snapshot.val() || {};
            // กรองเฉพาะ booking ของผู้ใช้และยังไม่ถูกยกเลิก
            const activeBookings = Object.values(data).filter(
                b => b.username === username && b.slotId && b.status !== 'cancelled'
            );
            setBookings(activeBookings);
            setLoading(false);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Unable to fetch bookings.');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();

        // รีเฟรชทุกครั้งเมื่อกลับมาที่หน้านี้
        const unsubscribe = navigation.addListener('focus', () => {
            fetchBookings();
        });

        return unsubscribe;
    }, [navigation, username]);

    const handleBack = () => navigation.goBack();

    const handleCardPress = (bookingData) => {
        navigation.navigate('MyParkingInfo', {
            username,
            bookingData,  // แก้ไข: เพิ่ม comma ตรงนี้
            userType: userType
        });
    };

    const handleNotificationPress = () => {
        // ไปยังหน้าการแจ้งเตือน
        navigation.navigate('Notifications', { username });
    };

    const formatBookingType = (type) => {
        if (type === 'hourly') return 'Hourly';
        if (type === 'daily') return 'Daily';
        if (type === 'monthly') return 'Monthly';
        return type;
    };

    const getBookingTypeColor = (type) => {
        switch (type) {
            case 'hourly': return '#bb489cff';
            case 'daily': return '#4e67cdff';
            case 'monthly': return '#45B7D1';
            default: return '#B19CD8';
        }
    };

    const getUserTypeColor = (type) => {
        switch (type) {
            case 'resident': return '#4CAF50'; // สีเขียวสำหรับ Resident
            case 'visitor': return '#FF9800';  // สีส้มสำหรับ Visitor
            default: return '#B19CD8';
        }
    };

    if (loading) return (
        <View style={[styles.container, {justifyContent:'center', alignItems:'center'}]}>
            <ActivityIndicator size="large" color="#fff" />
        </View>
    );

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                {/* Header Section */}
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
                    
                    <TouchableOpacity 
                        style={styles.notificationButton}
                        onPress={handleNotificationPress}
                    >
                        <Ionicons name="notifications" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                <View style={styles.header}>
                    <Text style={styles.title}>My Parking</Text>
                    {bookings.length > 0 && (
                        <Text style={styles.subtitle}>
                            Tap on a reservation to view details
                        </Text>
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
            <Text style={styles.visitorText}>For: {bookingData.visitorInfo.visitorUsername}</Text>
            <Text style={styles.visitorText}>Plate: {bookingData.visitorInfo.licensePlate}</Text>
          </View>
        )}
                                    {/* เพิ่ม Badge สำหรับแสดงประเภทผู้ใช้ */}
                                
                                    {bookingData.bookingType && (
                                        <View style={[styles.userTypeBadge, {backgroundColor: getUserTypeColor(bookingData.bookingType)}]}>
                                            <Text style={styles.userTypeText}>
                                                {bookingData.bookingType === 'resident' ? 'Resident' : 'Visitor'}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.headerRight}>
                                    <View style={[styles.bookingTypeBadge, {backgroundColor: getBookingTypeColor(bookingData.rateType)}]}>
                                        <Text style={styles.bookingTypeText}>
                                            {formatBookingType(bookingData.rateType)}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={24} color="#B19CD8" />
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                ) : (
                    <Text style={styles.noBookingText}>No reservations yet</Text>
                )}

                {/* ปุ่ม Book Again */}
                <TouchableOpacity
                    style={styles.bookAgainButton}
                    onPress={async () => {
                        // โหลด bookings ล่าสุดก่อน navigate ไป BookingTypeScreen
                        await fetchBookings();
                        navigation.navigate('BookingType', { username });
                    }}
                >
                    <Text style={styles.bookAgainText}>Book Again</Text>
                </TouchableOpacity>

            </ScrollView>
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
  marginTop: 40,  // เพิ่ม marginTop
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
    // สไตล์สำหรับ User Type Badge (ใหม่)
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
    // สไตล์สำหรับ Booking Type Badge (เดิม)
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
        backgroundColor: '#4CAF50',
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
        color: '#666',
      },
});

export default MyParkingScreen;
