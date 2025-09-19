import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import Homescreen from "./src/screens/Homescreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import LoginScreen from "./src/screens/LoginScreen";
import BookingTypeScreen from "./src/screens/BookingTypeScreen";
import VisitorRegisterScreen from "./src/screens/VisitorRegisterScreen";
import BookParkingScreen from "./src/screens/BookParkingScreen";
import ReservationScreen from "./src/screens/ReservationScreen";
import PaymentScreen from "./src/screens/PaymentScreen";
import MyParkingScreen from "./src/screens/MyParkingScreen";
import MyParkingInfoScreen from "./src/screens/MyParkingInfoScreen";
import InviteLinkScreen from "./src/screens/InviteLinkScreen";
import VisitorControlScreen from "./src/screens/VisitorControlScreen";
import * as Linking from 'expo-linking';
const Stack = createStackNavigator();
const linking = {
  prefixes: ['https://yourapp.com', 'yourapp://'],
  config: {
    screens: {
      InviteLink: 'invite-link',
      VisitorControl: 'visitor/:sessionId', // ใช้ sessionId เป็น param
    },
  },
};


const App = () => {

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName="Home"> 
        <Stack.Screen 
        name="Home" 
        component={Homescreen}
        options={{ headerShown: false }}
        />
        <Stack.Screen 
        name="Register" 
        component={RegisterScreen}
        options={{ headerShown: false }}
         />
         <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ headerShown: false }}
        />
        <Stack.Screen 
        name="BookingType" 
        component={BookingTypeScreen}
        options={{ headerShown: false }}
        />
        <Stack.Screen 
        name="VisitorRegister" 
        component={VisitorRegisterScreen}
        options={{ headerShown: false }}
        />
        <Stack.Screen 
        name="BookParking" 
        component={BookParkingScreen} 
        options={{ headerShown: false }}
        />
        <Stack.Screen 
        name="Reservation" 
        component={ReservationScreen} 
        options={{ headerShown: false }}
        />
        <Stack.Screen 
        name="Payment" 
        component={PaymentScreen} 
        options={{ headerShown: false }}
        />
        <Stack.Screen
        name="MyParking"
        component={MyParkingScreen}
        options={{ headerShown: false }}
        />
        <Stack.Screen
        name="MyParkingInfo"
        component={MyParkingInfoScreen}
        options={{ headerShown: false }}
        />
        <Stack.Screen
        name="InviteLink"
        component={InviteLinkScreen}
        options={{ headerShown: false }}
        />
        <Stack.Screen
        name="VisitorControl"
        component={VisitorControlScreen}
        options={{ headerShown: false }}
      />  
      </Stack.Navigator>  
      
    </NavigationContainer>
  );
};

export default App;