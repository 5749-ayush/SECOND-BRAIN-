import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";

export const WORKSPACE_ID = "main";
export const OWNER_EMAIL = "ayushamitjain@gmail.com";

const firebaseConfig = {
  apiKey: "AIzaSyC-5tqUCtzx9l92Y0LWitDoAfFnKGWiYBc",
  authDomain: "shared-space-cca50.firebaseapp.com",
  projectId: "shared-space-cca50",
  storageBucket: "shared-space-cca50.firebasestorage.app",
  messagingSenderId: "586298766404",
  appId: "1:586298766404:web:42d4891f74849c1aac3811"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export const cloudFunctions = getFunctions(firebaseApp, "asia-south1");
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: "select_account" });

let emulatorsConnected = false;
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true" && !emulatorsConnected) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  connectFunctionsEmulator(cloudFunctions, "127.0.0.1", 5001);
  emulatorsConnected = true;
}
