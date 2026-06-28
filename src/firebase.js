import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAfh3p-JACVcSw1OGOa2g0ixHm8hbYIUEs",
  authDomain: "dairypro-5eef3.firebaseapp.com",
  databaseURL: "https://dairypro-5eef3-default-rtdb.firebaseio.com",
  projectId: "dairypro-5eef3",
  storageBucket: "dairypro-5eef3.firebasestorage.app",
  messagingSenderId: "226880100501",
  appId: "1:226880100501:web:b61aa1462fa289c0a1a39c",
  measurementId: "G-9GG84Q13V1"
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
