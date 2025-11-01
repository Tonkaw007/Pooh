import React, { useState, useEffect } from 'react';
// 1. เพิ่ม TextInput, ActivityIndicator
import { 
    View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, 
    KeyboardAvoidingView, Platform, TextInput, ActivityIndicator 
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { db } from '../firebaseConfig'; 
import { ref, push, get } from 'firebase/database';

// 🚀 [ส่วนที่ 1] เพิ่ม VERCEL API URL 🚀
// URL หลักของ Backend ที่เรา Deploy บน Vercel
const VERCEL_API_URL = "https://pooh-backend.vercel.app"; 
// 🚀 (เราลบ comment ของ Firebase Functions เก่าทิ้งไปแล้ว) 🚀


const VisitorControlScreen = ({ route, navigation }) => {
    const { sessionId } = route.params || {}; 
    const sessionKey = sessionId?.includes('-') 
        ? sessionId.substring(0, sessionId.lastIndexOf('-')) 
        : sessionId;

    // --- 1. STATES ใหม่สำหรับ Verification ---
    const [verificationStep, setVerificationStep] = useState('plate'); // 'plate', 'otp', 'verified'
    const [pageLoading, setPageLoading] = useState(true); // โหลด booking data ครั้งแรก
    const [actionLoading, setActionLoading] = useState(false); // โหลดตอนกดปุ่ม Verify
    
    const [inputPlate, setInputPlate] = useState('');
    const [inputOtp, setInputOtp] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // --- 2. STATES เดิม (จะถูกโหลดหลัง verify ผ่าน) ---
    const [payFineStatus, setPayFineStatus] = useState('unpaid');
    const [barrierLocked, setBarrierLocked] = useState(true);
    const [bookingData, setBookingData] = useState(null);

    // --- 3. MODIFIED useEffect (โหลดเฉพาะข้อมูลที่จำเป็นก่อน) ---
    // (โค้ดส่วนนี้เหมือนเดิม)
    useEffect(() => {
        if (!sessionKey) {
            setPageLoading(false);
            setErrorMessage("Invalid session ID.");
            return;
        }
        
        get(ref(db, `bookings/${sessionKey}`))
            .then(bookingSnap => {
                if (bookingSnap.exists()) {
                    setBookingData(bookingSnap.val());
                } else {
                    setErrorMessage("Booking not found.");
                }
                setPageLoading(false);
            })
            .catch(error => {
                console.error('Failed to fetch bookingData:', error);
                setErrorMessage("Failed to load booking data.");
                setPageLoading(false);
            });
    }, [sessionKey]);

    // --- 4. ฟังก์ชันสำหรับโหลดสถานะ Barrier (หลัง Verify ผ่าน) ---
    // (โค้ดส่วนนี้เหมือนเดิม)
    const loadBarrierStatus = () => {
        get(ref(db, `payFine/${sessionKey}`))
            .then(snapshot => {
                const payStatus = snapshot.exists() ? snapshot.val().payFineStatus || 'unpaid' : 'unpaid';
                setPayFineStatus(payStatus);

                const data = bookingData; 
                if (data.rateType === 'hourly') {
                    const exitDateTime = new Date(`${data.exitDate}T${data.exitTime}`);
                    const now = new Date();
                    setBarrierLocked(now > exitDateTime && payStatus !== 'paid');
                } 
                else if (data.rateType === 'daily' || data.rateType === 'monthly') {
                    setBarrierLocked(snapshot.exists() && payStatus !== 'paid');
                }
            })
            .catch(error => console.error('Failed to fetch payFineStatus:', error));
    };


    // --- 5. ฟังก์ชัน VERIFICATION (ส่วนที่ติดต่อ Backend) ---

    // 🚀 [ส่วนที่ 2] แก้ไข handlePlateVerification 🚀
    // (เปลี่ยนจากโค้ดจำลอง เป็นการเรียก Vercel API จริงด้วย fetch)
    const handlePlateVerification = async () => {
        if (!bookingData?.visitorInfo?.licensePlate) {
            setErrorMessage("Visitor information not found.");
            return;
        }

        const storedPlate = bookingData.visitorInfo.licensePlate.toLowerCase().trim();
        const input = inputPlate.toLowerCase().trim();

        if (input !== storedPlate) {
            setErrorMessage('License Plate does not match. Please try again.');
            return;
        }

        setActionLoading(true);
        setErrorMessage('');
        
        try {
            // --- 🚀 นี่คือโค้ดใหม่ที่เรียก Vercel ---
            const response = await fetch(`${VERCEL_API_URL}/api/send-otp`, {
                method: 'POST', // ต้องเป็น POST
                headers: {
                    'Content-Type': 'application/json', // บอกว่าเราส่ง JSON
                },
                body: JSON.stringify({
                    bookingId: sessionKey // ส่ง bookingId ไปใน body
                }),
            });

            const data = await response.json(); // อ่านค่าที่ Vercel ตอบกลับมา

            if (!response.ok) {
                // ถ้า Vercel ตอบ error (เช่น 404, 500)
                throw new Error(data.error || "Failed to send OTP.");
            }
            // --- 🚀 สิ้นสุดโค้ดใหม่ ---
            
            setVerificationStep('otp'); // ไปขั้นตอนถัดไป (เหมือนเดิม)
            Alert.alert("OTP Sent", `An OTP has been sent to ${bookingData.visitorInfo.email}`);

        } catch (error) {
            console.error("Error sending OTP:", error);
            setErrorMessage(error.message); // แสดง Error จริงจาก Vercel
        }
        setActionLoading(false);
    };

    // 🚀 [ส่วนที่ 3] แก้ไข handleOtpVerification 🚀
    // (เปลี่ยนจากโค้ดจำลอง "123456" เป็นการเรียก Vercel API จริงด้วย fetch)
    const handleOtpVerification = async () => {
        if (inputOtp.length < 6) {
            setErrorMessage('Please enter a 6-digit OTP.');
            return;
        }

        setActionLoading(true);
        setErrorMessage('');

        try {
            // --- 🚀 นี่คือโค้ดใหม่ที่เรียก Vercel ---
            const response = await fetch(`${VERCEL_API_URL}/api/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bookingId: sessionKey, // ส่ง bookingId
                    otp: inputOtp          // และ OTP ที่ผู้ใช้กรอก
                }),
            });

            const data = await response.json();

            if (!response.ok || data.verified !== true) {
                // ถ้า Vercel ตอบ error หรือ verified ไม่ใช่ true
                throw new Error(data.error || "Invalid or expired OTP.");
            }
            // --- 🚀 สิ้นสุดโค้ดใหม่ ---

            // ถ้า OTP ถูกต้อง
            setVerificationStep('verified'); // ยืนยันตัวตนสำเร็จ!
            loadBarrierStatus(); // โหลดสถานะที่กั้น (ของเดิม)

        } catch (error) {
            console.error("Error verifying OTP:", error);
            setErrorMessage(error.message); // แสดง Error จริงจาก Vercel
        }
        setActionLoading(false);
    };

    // --- 6. ฟังก์ชัน HandleControl (ของเดิม) ---
    // (โค้ดส่วนนี้เหมือนเดิม)
    const handleControl = async (action) => {
        if (!sessionId) {
            Alert.alert("Error", "Session ID is missing.");
            return;
        }
        if (barrierLocked) {
            Alert.alert("Action not allowed", "Please pay the fine first.");
            return;
        }

        const status = action === 'Open Barrier' ? 'lifted' : 'lowered';
        const now = new Date();
        const actionDate = now.toISOString().slice(0, 10); 
        const actionTime = now.toTimeString().slice(0, 5); 

        try {
            const logRef = ref(db, `bookings/${sessionKey}/barrierLogs`);
            await push(logRef, { status, date: actionDate, time: actionTime });
            Alert.alert("Success", `Barrier action '${status}' has been logged.`);
        } catch (error) {
            console.error("❌ Failed to log barrier action:", error);
            Alert.alert("Error", "Failed to log barrier action.");
        }
    };
    

    // --- 7. RENDER FUNCTIONS (สำหรับแต่ละสถานะ) ---
    // (โค้ดส่วนนี้ทั้งหมดเหมือนเดิม)

    // 7.1 หน้าจอโหลด
    if (pageLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="white" />
                <Text style={styles.subtitle}>Loading Session...</Text>
            </View>
        );
    }
    
    // 7.2 หน้าจอกรณี Error (เช่น หา booking ไม่เจอ)
    if (!bookingData && !pageLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="alert-circle-outline" size={60} color="white" />
                <Text style={styles.title}>Session Error</Text>
                <Text style={styles.subtitle}>{errorMessage || "Could not load session data."}</Text>
            </View>
        );
    }

    // 7.3 หน้าจอกรอกทะเบียนรถ (State 1)
    const renderPlateInput = () => (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.header}>
                <Text style={styles.title}>Verification Required</Text>
                <Text style={styles.subtitle}>Please enter your license plate</Text>
            </View>
            <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                    <Ionicons name="shield-checkmark" size={24} color="#2196F3" />
                    <Text style={styles.cardTitle}>Verify Your Identity</Text>
                </View>
                <TextInput
                    style={styles.inputField} 
                    placeholder="Enter License Plate"
                    value={inputPlate}
                    onChangeText={setInputPlate}
                    autoCapitalize="characters"
                    editable={!actionLoading}
                />
                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                <TouchableOpacity
                    style={[styles.verifyButton, (actionLoading || !inputPlate) && styles.disabledButton]} 
                    onPress={handlePlateVerification}
                    disabled={actionLoading || !inputPlate}
                >
                    {actionLoading 
                        ? <ActivityIndicator color="white" /> 
                        : <Text style={styles.verifyButtonText}>Send OTP</Text>
                    }
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    // 7.4 หน้าจอกรอก OTP (State 2)
    const renderOtpInput = () => (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.header}>
                <Text style={styles.title}>Enter OTP</Text>
                <Text style={styles.subtitle}>Check your email for a 6-digit code</Text>
            </View>
            <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                    <Ionicons name="keypad" size={24} color="#4CAF50" />
                    <Text style={styles.cardTitle}>Enter Verification Code</Text>
                </View>
                <TextInput
                    style={styles.inputField}
                    placeholder="OTP"
                    value={inputOtp}
                    onChangeText={setInputOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!actionLoading}
                />
                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                <TouchableOpacity
                    style={[styles.verifyButton, (actionLoading || inputOtp.length < 6) && styles.disabledButton]}
                    onPress={handleOtpVerification}
                    disabled={actionLoading || inputOtp.length < 6}
                >
                    {actionLoading 
                        ? <ActivityIndicator color="white" /> 
                        : <Text style={styles.verifyButtonText}>Verify & Continue</Text>
                    }
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {setVerificationStep('plate'); setErrorMessage('');}} style={styles.linkButton}>
                    <Text style={styles.linkButtonText}>Wrong License Plate?</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    // 7.5 หน้าจอควบคุม (State 3 - UI เดิมของคุณ)
    const renderBarrierControl = () => (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            {/* Header (UI เดิม) */}
            <View style={styles.header}>
                <Text style={styles.title}>Visitor Control</Text>
                <Text style={styles.subtitle}>Parking Barrier Access</Text>
            </View>
            {/* ข้อมูล Session (UI เดิม) */}
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
            {/* ปุ่มควบคุม Barrier (UI เดิม) */}
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
            {/* Instructions (UI เดิม) */}
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
    );

    // --- 8. MAIN RETURN (เลือก RENDER ตามสถานะ) ---
    // (โค้ดส่วนนี้เหมือนเดิม)
    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {verificationStep === 'plate' && renderPlateInput()}
            {verificationStep === 'otp' && renderOtpInput()}
            {verificationStep === 'verified' && renderBarrierControl()}
        </KeyboardAvoidingView>
    );
};

// --- 9. STYLES (รวมของเดิมและของใหม่) ---
// (โค้ดส่วนนี้ทั้งหมดเหมือนเดิม)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#B19CD8',
    },
    scrollContainer: {
        padding: 20,
        paddingTop: 60,
        alignItems: 'center',
        flexGrow: 1, 
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
    instructionText: {
        fontSize: 14,
        color: '#4A5568',
        marginBottom: 8,
        lineHeight: 20,
    },
    inputField: {
        backgroundColor: '#F7FAFC',
        borderRadius: 10,
        padding: 15,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        width: '100%',
        marginTop: 10,
        marginBottom: 10,
        textAlign: 'center',
    },
    errorText: {
        color: 'red',
        marginTop: 5,
        marginBottom: 10,
        textAlign: 'center',
    },
    verifyButton: {
        backgroundColor: '#4CAF50', // สีเขียว
        padding: 16,
        borderRadius: 15,
        alignItems: 'center',
        marginTop: 10,
    },
    verifyButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    disabledButton: {
        backgroundColor: '#B0BEC5', // สีเทา
    },
    linkButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    linkButtonText: {
        color: '#2196F3',
        textDecorationLine: 'underline',
    },
});

export default VisitorControlScreen;