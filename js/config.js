// js/config.js
// ══════════════════════════════════════════════════════════
//  Firebase Configuration for Glomer Palace Museum
//  See README.md for setup instructions
// ══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// STEP 1: Replace the values below with your Firebase project config.
// Get it from: Firebase Console → Project Settings → Your apps → Web app → SDK setup and configuration
// ─────────────────────────────────────────────────────────
export const FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// ─────────────────────────────────────────────────────────
// DEMO MODE: Set to true to run without Firebase (uses localStorage)
// Data won't be shared between users in demo mode.
// ─────────────────────────────────────────────────────────
export const DEMO_MODE = FIREBASE_CONFIG.apiKey === "YOUR_API_KEY";
