import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

const Homescreen = ({ navigation }) => {
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const timer = setTimeout(() => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
            }).start(() => navigation.navigate("Register"));
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <FontAwesome5 name="car-alt" size={80} color="black" />
                <Text style={styles.pabuText}>POOH</Text>
            </View>
            <Animated.View style={{ opacity: fadeAnim }}>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        backgroundColor: '#B19CD8',
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    pabuText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'black',
        marginTop: 10,
    },
});

export default Homescreen;
