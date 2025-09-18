import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ScrollView, 
    Alert, 
    KeyboardAvoidingView,
    Clipboard,
    Share,
    Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';

const InviteLinkScreen = ({ route, navigation }) => {
    const { username, bookingData } = route.params;
    const [inviteLink, setInviteLink] = useState('');

    useEffect(() => {
        // Generate invite link when component mounts
        generateInviteLink();
    }, []);

    const generateInviteLink = () => {
        // Generate a unique invite link based on booking data
        const baseUrl = 'https://yourapp.com/parking-invite';
        const linkId = `${bookingData.id}-${Date.now()}`;
        const generatedLink = `${baseUrl}?booking=${linkId}&slot=${bookingData.slotId}&floor=${bookingData.floor}`;
        setInviteLink(generatedLink);
    };

    const handleBack = () => {
        navigation.goBack();
    };

    const copyToClipboard = async () => {
        try {
            await Clipboard.setString(inviteLink);
            Alert.alert("Success", "Invite link copied to clipboard!");
        } catch (error) {
            Alert.alert("Error", "Failed to copy link to clipboard.");
        }
    };

    const shareLink = async () => {
        try {
            const shareMessage = `Hi ${bookingData.visitorInfo?.visitorUsername || 'there'}!\n\nYou have been invited to use parking slot ${bookingData.slotId} on Floor ${bookingData.floor}.\n\nBooking Details:\n- Date: ${formatDate(bookingData.bookingDate)}\n- Slot: ${bookingData.slotId}\n- Floor: ${bookingData.floor}\n\nAccess Link: ${inviteLink}`;
            
            const result = await Share.share({
                message: shareMessage,
                url: Platform.OS === 'ios' ? inviteLink : undefined,
                title: 'Parking Invitation'
            });

            if (result.action === Share.sharedAction) {
                Alert.alert("Success", "Invite link shared successfully!");
            }
        } catch (error) {
            Alert.alert("Error", "Failed to share invite link.");
        }
    };

    const regenerateLink = () => {
        Alert.alert(
            "Regenerate Link",
            "Are you sure you want to generate a new invite link? The previous link will become invalid.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Generate New", 
                    onPress: () => {
                        generateInviteLink();
                        Alert.alert("Success", "New invite link generated!");
                    }
                }
            ]
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString(
            'en-US', 
            { year: 'numeric', month: 'short', day: 'numeric' }
        );
    };

    const formatTime = (timeString) => {
        if (!timeString) return '-';
        return timeString.includes(':') ? timeString : timeString;
    };

    const formatBookingType = (type) => {
        if (type === 'hourly') return 'Hourly';
        if (type === 'daily') return 'Daily';
        if (type === 'monthly') return 'Monthly';
        return type;
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                
                {/* Back Button */}
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Visitor Invite Link</Text>
                    <Text style={styles.subtitle}>Share parking access with your visitor</Text>
                </View>

                {/* Visitor Information Card */}
                <View style={styles.infoCard}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="person" size={24} color="#2196F3" />
                        <Text style={styles.cardTitle}>Visitor Information</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Visitor Name:</Text>
                        <Text style={styles.detailValue}>
                            {bookingData.visitorInfo?.visitorUsername || 'N/A'}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Phone Number:</Text>
                        <Text style={styles.detailValue}>
                            {bookingData.visitorInfo?.phoneNumber || 'N/A'}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Email:</Text>
                        <Text style={styles.detailValue}>
                            {bookingData.visitorInfo?.email || 'N/A'}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>License Plate:</Text>
                        <Text style={styles.detailValue}>
                            {bookingData.visitorInfo?.licensePlate || 'N/A'}
                        </Text>
                    </View>
                </View>

                {/* Booking Details Card */}
                <View style={styles.infoCard}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="car" size={24} color="#4CAF50" />
                        <Text style={styles.cardTitle}>Parking Details</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Parking Slot:</Text>
                        <Text style={styles.detailValue}>
                            Slot {bookingData.slotId} - Floor {bookingData.floor}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Booking ID:</Text>
                        <Text style={styles.detailValue}>{bookingData.id}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Booking Type:</Text>
                        <Text style={styles.detailValue}>
                            {formatBookingType(bookingData.rateType)}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Booking Date:</Text>
                        <Text style={styles.detailValue}>
                            {formatDate(bookingData.bookingDate)}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Status:</Text>
                        <Text style={[styles.detailValue, { color: bookingData.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
                            {bookingData.status}
                        </Text>
                    </View>

                    {/* Time Information */}
                    {(bookingData.entryDate || bookingData.entryTime || bookingData.exitDate || bookingData.exitTime) && (
                        <>
                            <View style={styles.divider} />
                            <Text style={styles.sectionTitle}>Time Information</Text>
                            
                            {bookingData.entryDate && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Entry Date:</Text>
                                    <Text style={styles.detailValue}>
                                        {formatDate(bookingData.entryDate)}
                                    </Text>
                                </View>
                            )}
                            {bookingData.entryTime && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Entry Time:</Text>
                                    <Text style={styles.detailValue}>
                                        {formatTime(bookingData.entryTime)}
                                    </Text>
                                </View>
                            )}
                            {bookingData.exitDate && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Exit Date:</Text>
                                    <Text style={styles.detailValue}>
                                        {formatDate(bookingData.exitDate)}
                                    </Text>
                                </View>
                            )}
                            {bookingData.exitTime && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Exit Time:</Text>
                                    <Text style={styles.detailValue}>
                                        {formatTime(bookingData.exitTime)}
                                    </Text>
                                </View>
                            )}
                        </>
                    )}

                    {/* Payment Information */}
                    {bookingData.paymentStatus && (
                        <>
                            <View style={styles.divider} />
                            <Text style={styles.sectionTitle}>Payment Information</Text>
                            
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Payment Status:</Text>
                                <Text 
                                    style={[
                                        styles.detailValue, 
                                        { 
                                            color: bookingData.paymentStatus === 'paid' 
                                                ? '#4CAF50' 
                                                : '#FF9800' 
                                        }
                                    ]}
                                >
                                    {bookingData.paymentStatus}
                                </Text>
                            </View>
                            {bookingData.price && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Total Price:</Text>
                                    <Text style={styles.detailValue}>
                                        {bookingData.price} baht
                                    </Text>
                                </View>
                            )}
                        </>
                    )}
                </View>

                {/* Invite Link Card */}
                <View style={styles.infoCard}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="link" size={24} color="#FF9800" />
                        <Text style={styles.cardTitle}>Invite Link</Text>
                    </View>
                    
                    <Text style={styles.linkDescription}>
                        Share this link with your visitor to grant them access to the parking slot.
                    </Text>

                    <View style={styles.linkContainer}>
                        <Text style={styles.linkText} numberOfLines={2}>
                            {inviteLink}
                        </Text>
                    </View>

                    <View style={styles.linkActions}>
                        <TouchableOpacity style={styles.shareButton} onPress={shareLink}>
                            <Ionicons name="share" size={20} color="white" />
                            <Text style={styles.shareButtonText}>Share Link</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.regenerateButton} onPress={regenerateLink}>
                        <Ionicons name="refresh" size={18} color="#666" />
                        <Text style={styles.regenerateButtonText}>Generate New Link</Text>
                    </TouchableOpacity>
                </View>

                {/* Instructions */}
                <View style={styles.instructionsCard}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="information-circle" size={24} color="#2196F3" />
                        <Text style={styles.cardTitle}>Instructions</Text>
                    </View>
                    
                    <Text style={styles.instructionText}>
                        • Share the invite link with your visitor via message, email, or any messaging app
                    </Text>
                    <Text style={styles.instructionText}>
                        • The visitor can use this link to access the parking barrier
                    </Text>
                    <Text style={styles.instructionText}>
                        • Make sure to provide the correct parking slot and floor information
                    </Text>
                    <Text style={styles.instructionText}>
                        • The link will remain valid until the booking is cancelled or expires
                    </Text>
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

    backButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        zIndex: 1,
        padding: 8,
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
        flex: 1,
    },

    detailValue: {
        fontWeight: '700',
        color: '#2D3748',
        fontSize: 14,
        textAlign: 'right',
        flex: 1,
    },

    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 15,
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2D3748',
        marginBottom: 10,
    },

    linkDescription: {
        fontSize: 14,
        color: '#718096',
        marginBottom: 15,
        textAlign: 'center',
        lineHeight: 20,
    },

    linkContainer: {
        backgroundColor: '#F7FAFC',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },

    linkText: {
        fontSize: 12,
        color: '#2D3748',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        lineHeight: 18,
    },

    linkActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 15,
    },


    shareButton: {
        backgroundColor: '#2196F3',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        flex: 1,
    },

    shareButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },

    regenerateButton: {
        backgroundColor: '#F8F9FA',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },

    regenerateButtonText: {
        color: '#666',
        fontWeight: '500',
        fontSize: 14,
    },

    instructionsCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        width: '100%',
    },

    instructionText: {
        fontSize: 14,
        color: '#4A5568',
        marginBottom: 8,
        lineHeight: 20,
    },
});

export default InviteLinkScreen;