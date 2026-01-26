import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB0kK4ZS7rRwcYozENX1jqRpFZD2GN6jvQ",
  authDomain: "saimdairyfarm-43c6e.firebaseapp.com",
  databaseURL: "https://saimdairyfarm-43c6e-default-rtdb.firebaseio.com",
  projectId: "saimdairyfarm-43c6e",
  storageBucket: "saimdairyfarm-43c6e.firebasestorage.app",
  messagingSenderId: "512212375872",
  appId: "1:512212375872:web:3cfac3f1859235aa0042a5",
  measurementId: "G-10GNPSVPJ2"
};

let app;
let auth;
let db;
let rtdb;
let storage;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  rtdb = getDatabase(app);
  storage = getStorage(app);
  console.log("Firebase Initialized Successfully");
} catch (error) {
  console.error("Firebase Initialization Failed:", error);
}

export { auth, db, rtdb, storage };
export default app;
