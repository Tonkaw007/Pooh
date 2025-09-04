import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, TouchableOpacity } from "react-native";
import CustomButton from "../component/CustomButton";
import SearchBox from "../component/SearchBox";
import { MaterialIcons } from "@expo/vector-icons";
import { db } from "../firebaseConfig";
import { ref, push, set } from "firebase/database";

const VisitorRegisterScreen = ({ navigation, route }) => {
  const username = route.params?.username || "User";

  const [visitorUsername, setVisitorUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [licensePlate, setLicensePlate] = useState("");

  const handleRegisterVisitor = async () => {
    try {
      if (!visitorUsername || !phoneNumber || !email || !licensePlate) {
        Alert.alert("Error", "กรุณากรอกข้อมูลให้ครบทุกช่อง");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Alert.alert("Error", "รูปแบบอีเมลไม่ถูกต้อง");
        return;
      }

      const phoneRegex = /^[0-9]{9,10}$/;
      if (!phoneRegex.test(phoneNumber)) {
        Alert.alert("Error", "เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก");
        return;
      }

      const newVisitorRef = push(ref(db, "visitors"));
      await set(newVisitorRef, {
        visitorUsername,
        phoneNumber,
        email,
        licensePlate,
        createdAt: new Date().toISOString(),
        createdBy: username,
      });
      //รอแก้
      Alert.alert("Success", "ลงทะเบียนผู้มาเยือนเรียบร้อยแล้ว!");
      navigation.navigate("Parking", {
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

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <View style={styles.header}>
        <MaterialIcons name="person-add" size={40} color="white" />
        <Text style={styles.title}>Visitor Information</Text>
      </View>

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

      <SearchBox
        placeHolder="License Plate"
        value={licensePlate}
        onChangeText={setLicensePlate}
        icon="directions-car"
        containerStyle={styles.input}
      />

      <CustomButton
        title="Submit Visitor"
        backgroundColor="#FFFFFF"
        textColor="#B19CD8"
        fontSize={18}
        width="100%"
        borderRadius={15}
        marginTop={20}
        onPress={handleRegisterVisitor}
      />

      <TouchableOpacity
        style={styles.loginLink}
        onPress={() => navigation.goBack()}
      >
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
    backgroundColor: "#B19CD8",
    padding: 25,
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
  loginLink: {
    marginTop: 25,
    alignItems: "center",
  },
  loginText: {
    color: "white",
    fontSize: 16,
  },
  loginHighlight: {
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});

export default VisitorRegisterScreen;