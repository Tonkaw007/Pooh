import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, TouchableOpacity } from "react-native";
import CustomButton from "../component/CustomButton";
import SearchBox from "../component/SearchBox";
import { MaterialIcons } from "@expo/vector-icons";
import { db } from "../firebaseConfig";
import { ref, push, set } from "firebase/database";

const VisitorRegisterScreen = ({ navigation, route }) => {
  const username = route.params?.username || 'User';
  const [visitorName, setVisitorName] = useState("");
  const [email, setEmail] = useState("");
  const [licensePlate, setLicensePlate] = useState("");

  const handleRegisterVisitor = async () => {
    try {
      if (!visitorName || !email || !licensePlate) {
        Alert.alert("Error", "Please fill in all fields");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Alert.alert("Error", "Invalid email format");
        return;
      }

      const newVisitorRef = push(ref(db, "visitors"));
      await set(newVisitorRef, {
        visitorName,
        email,
        licensePlate,
        createdAt: new Date().toISOString(),
        createdBy: username,
      });

      Alert.alert("Success", "Visitor registered!");
      navigation.navigate("Parking", { username, bookingType: "visitor" });

    } catch (error) {
      console.error(error);
      Alert.alert("Register Failed", error.message);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <View style={styles.header}>
        <MaterialIcons name="person-add" size={40} color="white" />
        <Text style={styles.title}>Visitor Information</Text>
      </View>

      <SearchBox
        placeHolder="Visitor Name"
        value={visitorName}
        onChangeText={setVisitorName}
        icon="person"
        containerStyle={styles.input}
      />

      <SearchBox
        placeHolder="Visitor Email"
        value={email}
        onChangeText={setEmail}
        icon="email"
        containerStyle={styles.input}
      />

      <SearchBox
        placeHolder="License Plate"
        value={licensePlate}
        onChangeText={setLicensePlate}
        icon="directions-car"
        containerStyle={styles.input}
      />

      <CustomButton
        title="Save Visitor"
        backgroundColor="#FFFFFF"
        textColor="#B19CD8"
        fontSize={18}
        width="100%"
        borderRadius={15}
        marginTop={20}
        onPress={handleRegisterVisitor}
      />

      <TouchableOpacity style={styles.loginLink} onPress={() => navigation.goBack()}>
        <Text style={styles.loginText}>
          Back to <Text style={styles.loginHighlight}>Booking</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: '#B19CD8',
    padding: 25,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 15,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
  },
  loginLink: {
    marginTop: 25,
    alignItems: 'center',
  },
  loginText: {
    color: 'white',
    fontSize: 16,
  },
  loginHighlight: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

export default VisitorRegisterScreen;