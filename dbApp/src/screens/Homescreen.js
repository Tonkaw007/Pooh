import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from 'react-native';
import Icon from "react-native-vector-icons/FontAwesome5";

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
                <Icon name="car-alt" size={80} color="black" />
                <Text style={styles.pabuText}>Pooh</Text>
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