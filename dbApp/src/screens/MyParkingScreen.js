import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const MyParkingScreen = ({ route, navigation }) => {
    const { username, bookingData } = route.params;
    
    const handleBack = () => {
        navigation.goBack();
    };

    const handleCardPress = () => {
        // Navigate to MyParkingInfoScreen with all the data
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
            case 'hourly': return '#48BB78';
            case 'daily': return '#4ECDC4';
            case 'monthly': return '#45B7D1';
            default: return '#B19CD8';
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>

                <View style={styles.header}>
                    <Text style={styles.title}>My Parking</Text>
                    <Text style={styles.subtitle}>Tap on a reservation to view details</Text>
                </View>

                {/* Parking Card */}
                <TouchableOpacity 
                    style={styles.parkingCard}
                    onPress={handleCardPress}
                    activeOpacity={0.7}
                >
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.slotText}>Slot {bookingData.slotId}</Text>
                            <Text style={styles.floorText}>Floor {bookingData.floor}</Text>
                        </View>
                        <View style={styles.headerRight}>
                            <View style={[styles.bookingTypeBadge, 
                                {backgroundColor: getBookingTypeColor(bookingData.rateType)}]}>
                                <Text style={styles.bookingTypeText}>
                                    {formatBookingType(bookingData.rateType)}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="#B19CD8" />
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Additional cards can be added here for multiple reservations */}
                <Text style={styles.moreText}>Swipe down to see more reservations</Text>
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
    moreText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        marginTop: 10,
        fontStyle: 'italic',
    },
});

export default MyParkingScreen;