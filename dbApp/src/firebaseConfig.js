import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDNekD1A3vaOenJzjUfhnQesoztGdr4w2o",
  authDomain: "test-f7d64.firebaseapp.com",
  databaseURL: "https://test-f7d64-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "test-f7d64",
  storageBucket: "test-f7d64.appspot.com",
  messagingSenderId: "567197240732",
  appId: "1:567197240732:web:8230878e596cdb1e028c59",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
const auth = getAuth(app);
const db = getDatabase(app);

export { auth, db };
