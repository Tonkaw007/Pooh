import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, TouchableOpacity } from "react-native";
import CustomButton from "../component/CustomButton";
import SearchBox from "../component/SearchBox";
import { MaterialIcons } from "@expo/vector-icons";
import Ionicons from "react-native-vector-icons/Ionicons";
import { db } from "../firebaseConfig";
import { ref, push, set, get, child } from "firebase/database";

const VisitorRegisterScreen = ({ navigation, route }) => {
  const username = route.params?.username || "User";

  const [visitorUsername, setVisitorUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [licensePlate, setLicensePlate] = useState("");

  // ฟังก์ชันเช็ค visitor เดิมจาก License Plate
  const checkExistingVisitor = async (plate) => {
    try {
      if (!plate) return;

      const snapshot = await get(child(ref(db), "visitors"));
      if (snapshot.exists()) {
        const data = snapshot.val();

        const existingVisitor = Object.values(data).find(
          (v) => v.licensePlate === plate
        );

        if (existingVisitor) {
          setVisitorUsername(existingVisitor.visitorUsername);
          setPhoneNumber(existingVisitor.phoneNumber);
          setEmail(existingVisitor.email);
          // Auto-fill ข้อมูลเดิม
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRegisterVisitor = async () => {
    try {
      if (!visitorUsername || !phoneNumber || !email || !licensePlate) {
        Alert.alert("Error", "Please fill in all fields");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Alert.alert("Error", "Invalid email format");
        return;
      }

      const phoneRegex = /^[0-9]{9,10}$/;
      if (!phoneRegex.test(phoneNumber)) {
        Alert.alert("Error", "Phone number must be 9-10 digits");
        return;
      }

      // ตรวจสอบว่า visitor มีอยู่แล้วใน Firebase หรือยัง
      const snapshot = await get(child(ref(db), "visitors"));
      let visitorExists = false;

      if (snapshot.exists()) {
        const data = snapshot.val();
        visitorExists = Object.values(data).some(
          (v) => v.licensePlate === licensePlate
        );
      }

      // ถ้ายังไม่มีใน Firebase ให้บันทึกใหม่ และแสดง alert success
      if (!visitorExists) {
        const newVisitorRef = push(ref(db, "visitors"));
        await set(newVisitorRef, {
          visitorUsername,
          phoneNumber,
          email,
          licensePlate,
          createdAt: new Date().toISOString(),
          createdBy: username,
        });
        Alert.alert("Success", "Visitor registered successfully!");
      }

      // ไปหน้าต่อไปได้เลย ไม่ว่าจะมีอยู่แล้วหรือไม่
      navigation.navigate("BookParking", {
        username,
        bookingType: "visitor",
        visitorInfo: {
          visitorUsername,
          phoneNumber,
          email,
          licensePlate,
        },
      });

    } catch (error) {
      console.error(error);
      Alert.alert("Register Failed", error.message);
    }
  };

  // ฟังก์ชัน back button
  const handleBack = () => {
    navigation.navigate("BookingType", { username });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">

      {/* Back Arrow */}
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      <View style={styles.header}>
        <MaterialIcons name="person-add" size={40} color="white" />
        <Text style={styles.title}>Visitor Information</Text>
      </View>

      <SearchBox
        placeHolder="License Plate"
        value={licensePlate}
        onChangeText={(text) => {
          setLicensePlate(text);
          checkExistingVisitor(text);
        }}
        icon="directions-car"
        containerStyle={styles.input}
      />

      <SearchBox
        placeHolder="Username"
        value={visitorUsername}
        onChangeText={setVisitorUsername}
        icon="person"
        containerStyle={styles.input}
      />

      <SearchBox
        placeHolder="Phone Number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        icon="phone"
        containerStyle={styles.input}
        keyboardType="phone-pad"
      />

      <SearchBox
        placeHolder="Email"
        value={email}
        onChangeText={setEmail}
        icon="email"
        containerStyle={styles.input}
        keyboardType="email-address"
      />

      <CustomButton
        title="Submit"
        backgroundColor="#FFFFFF"
        textColor="#B19CD8"
        fontSize={18}
        width="100%"
        borderRadius={15}
        marginTop={20}
        onPress={handleRegisterVisitor}
      />

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#B19CD8",
    padding: 25,
    paddingTop: 60,
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 1,
    padding: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    marginTop: 15,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 20,
    width: "100%",
  },
});

export default VisitorRegisterScreen;


