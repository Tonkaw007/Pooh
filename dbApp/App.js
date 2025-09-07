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

const Stack = createStackNavigator();

const App = () => {

  return (
    <NavigationContainer>
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
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
