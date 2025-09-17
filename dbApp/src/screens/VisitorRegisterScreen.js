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

      // โหลด visitor ทั้งหมด
      const visitorsSnapshot = await get(child(ref(db), "visitors"));
      const allVisitors = visitorsSnapshot.exists() ? Object.values(visitorsSnapshot.val()) : [];

      // ตรวจสอบว่า visitor นี้มีอยู่แล้ว
      const existingVisitor = allVisitors.find(v => v.licensePlate === licensePlate);

      // ถ้า visitor ใหม่ ต้องตรวจสอบ 3 คนต่อ resident
      if (!existingVisitor) {
        const visitorCount = allVisitors.filter(v => v.createdBy === username).length;
        if (visitorCount >= 3) {
          Alert.alert("Limit Reached", "You cannot register more than 3 visitors.");
          return;
        }
      }

      // ตรวจสอบจำนวน booking ของ visitor ต่อวัน
      const bookingsSnapshot = await get(child(ref(db), "bookings"));
      const allBookings = bookingsSnapshot.exists() ? Object.values(bookingsSnapshot.val()) : [];
      const todayStr = new Date().toISOString().substring(0, 10);

      const todaysBookingsCount = allBookings.filter(b => 
        b.visitorInfo?.licensePlate === licensePlate &&
        b.bookingDate?.substring(0,10) === todayStr &&
        b.status !== "cancelled"
      ).length;

      if (todaysBookingsCount >= 5) {
        Alert.alert("Booking Limit Reached", "This visitor has reached booking limit.");
        return;
      }

      // ถ้า visitor ใหม่ ให้บันทึกลง Firebase
      if (!existingVisitor) {
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

  const handleBack = () => {
    navigation.navigate("BookingType", { username });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
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
