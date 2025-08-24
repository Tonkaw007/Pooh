import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, TouchableOpacity } from "react-native";
import CustomButton from "../component/CustomButton";
import SearchBox from "../component/SearchBox";
import { MaterialIcons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState(""); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [licensePlate, setLicensePlate] = useState("");

  const handleRegister = async () => {
    try {
      if (!username || !email || !password || !confirmPassword || !licensePlate) {
        Alert.alert("Error", "Please fill in all fields");
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert("Error", "Passwords do not match");
        return;
      }

      // สมัคร user ด้วย email + password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      // บันทึกเพิ่มใน Realtime Database
      await set(ref(db, "users/" + userId), {
        username,       // เก็บชื่อ-นามสกุล (username)
        email,          // เก็บอีเมล
        licensePlate,   // เก็บทะเบียนรถ
        createdAt: new Date().toISOString(),
      });

      Alert.alert("Success", "Registration Successful!");
      navigation.navigate("Login");

    } catch (error) {
      console.error(error);
      Alert.alert("Register Failed", error.message);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <View style={styles.header}>
        <MaterialIcons name="person-add" size={40} color="white" />
        <Text style={styles.title}>Create Account</Text>
      </View>

      {/* Username */}
      <SearchBox
        placeHolder="Username"
        value={username}
        onChangeText={setUsername}
        icon="person"
        containerStyle={styles.input}
      />

      <SearchBox
        placeHolder="Email"
        value={email}
        onChangeText={setEmail}
        icon="email"
        containerStyle={styles.input}
      />

      <SearchBox
        placeHolder="Password"
        secure={true}
        value={password}
        onChangeText={setPassword}
        icon="lock"
        containerStyle={styles.input}
      />

      <SearchBox
        placeHolder="Confirm Password"
        secure={true}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        icon="lock"
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
        title="Register"
        backgroundColor="#FFFFFF"
        textColor="#B19CD8"
        fontSize={18}
        width="100%"
        borderRadius={15}
        marginTop={20}
        onPress={handleRegister}
      />

      <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate("Login")}>
        <Text style={styles.loginText}>
          Already have an account? <Text style={styles.loginHighlight}>Log In</Text>
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

export default RegisterScreen;
