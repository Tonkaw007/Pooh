import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA37emH1PSZcLW8ezfq44siXV6N9twKHws",
  authDomain: "mobile-app-e38c2.firebaseapp.com",
  databaseURL: "https://mobile-app-e38c2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mobile-app-e38c2",
  storageBucket: "mobile-app-e38c2.firebasestorage.app",
  messagingSenderId: "426715857438",
  appId: "1:426715857438:web:f968dfb184879a7438e40f",
  measurementId: "G-NYQQV5JM7Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
const auth = getAuth(app);
const db = getDatabase(app);

export { auth, db };