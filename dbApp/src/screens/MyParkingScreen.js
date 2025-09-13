import React, { useEffect, useState } from "react"; 
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from '../firebaseConfig';
import { ref, get, child } from 'firebase/database';

const MyParkingScreen = ({ route, navigation }) => {
    const { username } = route.params; 
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
            bookingData
        });
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

    if (loading) return (
        <View style={[styles.container, {justifyContent:'center', alignItems:'center'}]}>
            <ActivityIndicator size="large" color="#fff" />
        </View>
    );

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>

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
        paddingTop: 60,
        alignItems: 'center'
    },
    backButton: { 
        position: 'absolute', 
        top: 40, 
        left: 20, 
        zIndex: 1, 
        padding: 8 
    },
    header: { 
        alignItems: 'center', 
        marginBottom: 25, 
        marginTop: 10 
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
        alignItems: 'center',
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
});

export default MyParkingScreen;
