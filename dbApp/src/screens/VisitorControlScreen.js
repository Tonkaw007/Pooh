import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert,ScrollView,KeyboardAvoidingView,Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const VisitorControlScreen = ({ route, navigation }) => {
    const { sessionId } = route.params || {};

    const handleControl = (action) => {
        // ตอนนี้ยังไม่เชื่อม Firebase
        Alert.alert(
            'Barrier Control', 
            `Action: ${action}\nSession ID: ${sessionId}`,
            [
                { text: 'OK', style: 'default' }
            ]
        );
    };

    const handleBack = () => {
        navigation.goBack();
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                
                {/* Back Button */}
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Visitor Control</Text>
                    <Text style={styles.subtitle}>Parking Barrier Access</Text>
                </View>

                {/* Session Info Card */}
                <View style={styles.infoCard}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="key" size={24} color="#FF9800" />
                        <Text style={styles.cardTitle}>Session Information</Text>
                    </View>
                    
                    <View style={styles.sessionContainer}>
                        <Text style={styles.sessionLabel}>Session ID:</Text>
                        <Text style={styles.sessionValue}>{sessionId || 'N/A'}</Text>
                    </View>

                    <View style={styles.statusContainer}>
                        <View style={styles.statusIndicator} />
                        <Text style={styles.statusText}>Active Session</Text>
                    </View>
                </View>

                {/* Control Buttons Card */}
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
                            style={[styles.controlButton, styles.openButton]}
                            onPress={() => handleControl('Open Barrier')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.buttonContent}>
                                <Ionicons name="arrow-up" size={32} color="white" />
                                <Text style={styles.buttonText}>Open Barrier</Text>
                                <Text style={styles.buttonSubtext}>Lift the barrier up</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.controlButton, styles.closeButton]}
                            onPress={() => handleControl('Close Barrier')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.buttonContent}>
                                <Ionicons name="arrow-down" size={32} color="white" />
                                <Text style={styles.buttonText}>Close Barrier</Text>
                                <Text style={styles.buttonSubtext}>Lower the barrier down</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Instructions Card */}
                <View style={styles.instructionsCard}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="information-circle" size={24} color="#6C757D" />
                        <Text style={styles.cardTitle}>Instructions</Text>
                    </View>
                    
                    <Text style={styles.instructionText}>• Use "Open Barrier" when arriving at the parking</Text>
                    <Text style={styles.instructionText}>• Use "Close Barrier" after your vehicle has passed</Text>
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
        backgroundColor: '#F44336',
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