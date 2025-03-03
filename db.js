const admin = require("firebase-admin");
const dotenv = require("dotenv");
const { getStorage } = require("firebase-admin/storage");

dotenv.config(); // Make sure the environment variables are loaded

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const db = admin.firestore();
const storage = getStorage(); // Firebase Storage
const auth = admin.auth();  // Initialize Firebase Auth

module.exports = { auth, db, storage };  // Export auth, db, and storage
