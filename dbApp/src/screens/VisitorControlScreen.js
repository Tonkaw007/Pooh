import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { db } from '../firebaseConfig';
import { ref, push, get } from 'firebase/database';

const VisitorControlScreen = ({ route, navigation }) => {
    const { sessionId } = route.params || {}; 
    const [payFineStatus, setPayFineStatus] = useState('unpaid');
    const [barrierLocked, setBarrierLocked] = useState(true);
    const [bookingData, setBookingData] = useState(null);

    // ดึงสถานะ payFine และ bookingData
    useEffect(() => {
        if (!sessionId) return;

        const sessionKey = sessionId.includes('-') 
            ? sessionId.substring(0, sessionId.lastIndexOf('-')) 
            : sessionId;

        // ดึง payFineStatus
        get(ref(db, `payFine/${sessionKey}`))
            .then(snapshot => {
                const payStatus = snapshot.exists() ? snapshot.val().payFineStatus || 'unpaid' : 'unpaid';
                setPayFineStatus(payStatus);

                // ดึงข้อมูล booking เพื่อเช็ก exitTime
                get(ref(db, `bookings/${sessionKey}`))
                    .then(bookingSnap => {
                        if (!bookingSnap.exists()) return;

                        const data = bookingSnap.val();
                        setBookingData(data);

                        // logic สำหรับรายชั่วโมง
                        if (data.rateType === 'hourly') {
                            const exitDateTime = new Date(`${data.exitDate}T${data.exitTime}`);
                            const now = new Date();
                            setBarrierLocked(now > exitDateTime && payStatus !== 'paid');
                        } 
                        else if (data.rateType === 'daily' || data.rateType === 'monthly') {
                            setBarrierLocked(snapshot.exists() && payStatus !== 'paid');
                        }
                    });
            })
            .catch(error => console.error('Failed to fetch payFineStatus or bookingData:', error));
    }, [sessionId]);

    // กดปุ่ม barrier
    const handleControl = async (action) => {
        if (!sessionId) {
            Alert.alert("Error", "Session ID is missing.");
            return;
        }

        const sessionKey = sessionId.includes('-') 
            ? sessionId.substring(0, sessionId.lastIndexOf('-')) 
            : sessionId;

        if (barrierLocked) {
            Alert.alert("Action not allowed", "Please pay the fine first.");
            return;
        }

        const status = action === 'Open Barrier' ? 'lifted' : 'lowered';
        const now = new Date();
        const actionDate = now.toISOString().slice(0, 10); 
        const actionTime = now.toTimeString().slice(0, 5); 

        try {
            const bookingsSnap = await get(ref(db, 'bookings'));
            if (!bookingsSnap.exists()) {
                Alert.alert("Error", "No bookings found.");
                return;
            }

            const bookings = bookingsSnap.val();
            const existingKey = Object.keys(bookings).find(key => key === sessionKey);

            if (!existingKey) {
                Alert.alert("Error", "Booking not found for this session.");
                return;
            }

            // บันทึก log การเปิด/ปิด barrier
            const logRef = ref(db, `bookings/${existingKey}/barrierLogs`);
            await push(logRef, { status, date: actionDate, time: actionTime });

            Alert.alert("Success", `Barrier action '${status}' has been logged.`);
        } catch (error) {
            console.error("❌ Failed to log barrier action:", error);
            Alert.alert("Error", "Failed to log barrier action.");
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Visitor Control</Text>
                    <Text style={styles.subtitle}>Parking Barrier Access</Text>
                </View>

                {/* ข้อมูล Session */}
                <View style={styles.infoCard}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="key" size={24} color="#FF9800" />
                        <Text style={styles.cardTitle}>Session Information</Text>
                    </View>
                    <View style={styles.sessionContainer}>
                        <Text style={styles.sessionLabel}>Session ID:</Text>
                        <Text style={styles.sessionValue}>{sessionId || 'N/A'}</Text>
                    </View>
                </View>

                {/* ปุ่มควบคุม Barrier */}
                <View style={styles.controlCard}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="car" size={24} color="#2196F3" />
                        <Text style={styles.cardTitle}>Barrier Control</Text>
                    </View>
                    <Text style={styles.controlDescription}>
                        Tap the buttons below to control the parking barrier
                    </Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[
                                styles.controlButton, 
                                styles.openButton,
                                barrierLocked ? { backgroundColor: '#B0BEC5' } : {}
                            ]}
                            onPress={() => handleControl('Open Barrier')}
                            activeOpacity={0.8}
                            disabled={barrierLocked}
                        >
                            <View style={styles.buttonContent}>
                                <Ionicons name="arrow-up" size={32} color="white" />
                                <Text style={styles.buttonText}>Lift the barrier up</Text>
                                
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.controlButton, 
                                styles.closeButton,
                                barrierLocked ? { backgroundColor: '#B0BEC5' } : {}
                            ]}
                            onPress={() => handleControl('Close Barrier')}
                            activeOpacity={0.8}
                            disabled={barrierLocked}
                        >
                            <View style={styles.buttonContent}>
                                <Ionicons name="arrow-down" size={32} color="white" />
                                <Text style={styles.buttonText}>Lower the barrier down</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Instructions */}
                <View style={styles.instructionsCard}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="information-circle" size={24} color="#6C757D" />
                        <Text style={styles.cardTitle}>Instructions</Text>
                    </View>
                    <Text style={styles.instructionText}>• Use "Lift the barrier up" when arriving at the parking</Text>
                    <Text style={styles.instructionText}>• Use "Lower the barrier down" after your vehicle has passed</Text>
                    <Text style={styles.instructionText}>• Make sure the area is clear before operating</Text>
                    <Text style={styles.instructionText}>• This session will expire automatically</Text>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#B19CD8',
    },
    scrollContainer: {
        padding: 20,
        paddingTop: 60,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
    },
    infoCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    controlCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    instructionsCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        width: '100%',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3748',
        marginLeft: 10,
    },
    sessionContainer: {
        backgroundColor: '#F7FAFC',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    sessionLabel: {
        fontSize: 14,
        color: '#718096',
        marginBottom: 5,
    },
    sessionValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D3748',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4CAF50',
        marginRight: 8,
    },
    statusText: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: '600',
    },
    controlDescription: {
        fontSize: 14,
        color: '#718096',
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 20,
    },
    buttonContainer: {
        gap: 15,
    },
    controlButton: {
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 3,
    },
    openButton: {
        backgroundColor: '#4CAF50',
    },
    closeButton: {
        backgroundColor: '#ff4d00ff',
    },
    buttonContent: {
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 8,
        marginBottom: 4,
    },
    buttonSubtext: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
        textAlign: 'center',
    },
    instructionText: {
        fontSize: 14,
        color: '#4A5568',
        marginBottom: 8,
        lineHeight: 20,
    },
});

export default VisitorControlScreen;