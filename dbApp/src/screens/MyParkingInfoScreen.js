import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { ref, update } from 'firebase/database';

const MyParkingInfoScreen = ({ route, navigation }) => {
    const { username, bookingData } = route.params;

    const [showBarrierModal, setShowBarrierModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);

    const handleBack = () => navigation.goBack();

    const handleOpenBarrier = () => setShowBarrierModal(true);

    const handleCancelBooking = () => setShowCancelModal(true);

    // Control barrier and update Firebase with separate date & time
    const controlBarrier = (action) => {
        setShowBarrierModal(false);

        const status = action === 'lift' ? 'lifted' : 'lowered';
        const bookingRef = ref(db, `bookings/${bookingData.id}`);

        // Get current date & time
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');

        const actionDate = `${year}-${month}-${day}`; // YYYY-MM-DD
        const actionTime = `${hours}:${minutes}`;      // HH:mm

        update(bookingRef, { 
            barrierStatus: status,
            barrierActionDate: actionDate,
            barrierActionTime: actionTime
        })
        .then(() => {
            Alert.alert(
                "Success", 
                `The parking barrier has been ${status}.`,
                [{ 
                    text: "OK", 
                    onPress: () => console.log(`Barrier ${status} on ${actionDate} at ${actionTime}`) 
                }]
            );
        })
        .catch((error) => {
            Alert.alert("Error", "Failed to update barrier status.");
            console.error(error);
        });
    };


    const confirmCancelBooking = () => {
        setShowCancelModal(false);
        const bookingRef = ref(db, `bookings/${bookingData.id}`);
        update(bookingRef, { status: 'cancelled' })
            .then(() => {
                Alert.alert("Success", "Your booking has been cancelled.", [
                    { 
                        text: "OK", 
                        onPress: () => navigation.navigate('MyParking', { username }) 
                    }
                ]);
            })
            .catch((error) => {
                Alert.alert("Error", "Failed to cancel booking.");
                console.error(error);
            });
    };

    const cancelAction = () => {
        setShowBarrierModal(false);
        setShowCancelModal(false);
    };

    const formatBookingType = (type) => {
        if (type === 'hourly') return 'Hourly';
        if (type === 'daily') return 'Daily';
        if (type === 'monthly') return 'Monthly';
        return type;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatTime = (timeString) => {
        if (!timeString) return '-';
        return timeString.includes(':') ? timeString : timeString;
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                {/* Back Button */}
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Parking Details</Text>
                </View>

                {/* Info Card */}
                <View style={styles.infoCard}>
                    <Text style={styles.cardTitle}>Slot {bookingData.slotId} - Floor {bookingData.floor}</Text>

                    {/* Booking Information */}
                    <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>Booking Information</Text>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Booking ID:</Text>
                            <Text style={styles.detailValue}>{bookingData.id}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Username:</Text>
                            <Text style={styles.detailValue}>{username}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Booking Type:</Text>
                            <Text style={styles.detailValue}>{formatBookingType(bookingData.rateType)}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Booking Date:</Text>
                            <Text style={styles.detailValue}>{formatDate(bookingData.bookingDate)}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Status:</Text>
                            <Text style={styles.detailValue}>{bookingData.status}</Text>
                        </View>
                    </View>

                    {/* Time Information */}
                    <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>Time Information</Text>
                        {bookingData.entryDate && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Entry Date:</Text>
                                <Text style={styles.detailValue}>{formatDate(bookingData.entryDate)}</Text>
                            </View>
                        )}
                        {bookingData.entryTime && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Entry Time:</Text>
                                <Text style={styles.detailValue}>{formatTime(bookingData.entryTime)}</Text>
                            </View>
                        )}
                        {bookingData.exitDate && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Exit Date:</Text>
                                <Text style={styles.detailValue}>{formatDate(bookingData.exitDate)}</Text>
                            </View>
                        )}
                        {bookingData.exitTime && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Exit Time:</Text>
                                <Text style={styles.detailValue}>{formatTime(bookingData.exitTime)}</Text>
                            </View>
                        )}
                        {bookingData.durationMonths && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Duration (Months):</Text>
                                <Text style={styles.detailValue}>{bookingData.durationMonths}</Text>
                            </View>
                        )}
                    </View>

                    {/* Payment Information */}
                    <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>Payment Information</Text>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Payment Status:</Text>
                            <Text style={[
                                styles.detailValue,
                                { color: bookingData.paymentStatus === 'paid' ? '#4CAF50' : '#FF9800' }
                            ]}>
                                {bookingData.paymentStatus}
                            </Text>
                        </View>
                        {bookingData.paymentDate && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Payment Date:</Text>
                                <Text style={styles.detailValue}>{formatDate(bookingData.paymentDate)}</Text>
                            </View>
                        )}
                        {bookingData.price && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Total Price:</Text>
                                <Text style={styles.detailValue}>{bookingData.price} baht</Text>
                            </View>
                        )}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity style={styles.barrierButton} onPress={handleOpenBarrier}>
                            <Ionicons name="lock-open" size={20} color="white" />
                            <Text style={styles.barrierButtonText}>Control Barrier</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelButton} onPress={handleCancelBooking}>
                            <Ionicons name="close-circle" size={20} color="white" />
                            <Text style={styles.cancelButtonText}>Cancel Booking</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Barrier Control Modal */}
                <Modal
                    visible={showBarrierModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={cancelAction}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <View style={styles.modalHeader}>
                                <Ionicons name="car-sport" size={40} color="#FFA000" />
                                <Text style={styles.modalTitle}>Control Parking Barrier</Text>
                            </View>

                            <Text style={styles.modalMessage}>
                                Choose an action for Slot {bookingData.slotId}, Floor {bookingData.floor}:
                            </Text>

                            <View style={styles.modalRowButtons}>
                                <TouchableOpacity
                                    style={styles.modalConfirmButton}
                                    onPress={() => controlBarrier('lift')}
                                >
                                    <Text style={styles.modalConfirmText}>Lift</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalConfirmButton, { backgroundColor: '#2196F3' }]}
                                    onPress={() => controlBarrier('lower')}
                                >
                                    <Text style={styles.modalConfirmText}>Lower</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.modalCancelButtonBottom}
                                onPress={cancelAction}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Cancel Booking Confirmation Modal */}
                <Modal
                    visible={showCancelModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={cancelAction}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <View style={styles.modalHeader}>
                                <Ionicons name="warning" size={40} color="#FF6B6B" />
                                <Text style={styles.modalTitle}>Cancel Booking</Text>
                            </View>

                            <Text style={styles.modalMessage}>
                                Are you sure you want to cancel this booking for Slot {bookingData.slotId}, Floor {bookingData.floor}?
                            </Text>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.modalCancelButton} onPress={cancelAction}>
                                    <Text style={styles.modalCancelText}>No, Keep It</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalConfirmButton, { backgroundColor: '#FF6B6B' }]}
                                    onPress={confirmCancelBooking}
                                >
                                    <Text style={styles.modalConfirmText}>Yes, Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

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

    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2D3748',
        marginBottom: 20,
        textAlign: 'center',
    },

    detailSection: {
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },

    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2D3748',
        marginBottom: 15,
    },

    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingVertical: 8,
        paddingHorizontal: 10,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
    },

    detailLabel: {
        fontWeight: '600',
        color: '#4A5568',
        fontSize: 14,
    },

    detailValue: {
        fontWeight: '700',
        color: '#2D3748',
        fontSize: 14,
        textAlign: 'right',
    },

    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        marginTop: 10,
    },

    barrierButton: {
        backgroundColor: '#4CAF50',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        flex: 1,
    },

    barrierButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },

    cancelButton: {
        backgroundColor: '#FF6B6B',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        flex: 1,
    },

    cancelButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },

    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 25,
        width: '100%',
        maxWidth: 350,
        alignItems: 'center',
    },

    modalHeader: {
        alignItems: 'center',
        marginBottom: 15,
    },

    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2D3748',
        marginTop: 10,
        textAlign: 'center',
    },

    modalMessage: {
        fontSize: 16,
        color: '#718096',
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 22,
    },

    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 10,
    },

    modalCancelButton: {
        backgroundColor: '#F8F9FA',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        flex: 1,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },

    modalCancelText: {
        color: '#718096',
        fontWeight: '600',
        fontSize: 16,
    },

    modalConfirmButton: {
        backgroundColor: '#4CAF50',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        flex: 1,
    },

    modalConfirmText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },

    modalRowButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 10,
        marginBottom: 15,
    },

    modalCancelButtonBottom: {
    backgroundColor: '#E2E8F0',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '50%',
    borderWidth: 1,
    borderColor: '#A0AEC0', 
    alignSelf: 'center',
    },
});

export default MyParkingInfoScreen;
