const express = require("express");
const { auth, db } = require("./db");
const axios = require("axios");
const router = express.Router();

// 🆕 User Signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // Store user details in Firestore
    await db.collection("users").doc(userRecord.uid).set({
      name,
      email,
      role,
      createdAt: new Date(),
    });

    res.status(201).json({ message: "User registered successfully", userId: userRecord.uid });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🔑 User Login (Handled on frontend)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Step 1: Get user from Firebase Auth (to check if user exists)
    const userRecord = await auth.getUserByEmail(email);
    const userId = userRecord.uid;

    // Step 2: Verify password using Firebase REST API
    const verifyPasswordUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`;
    const verifyResponse = await axios.post(verifyPasswordUrl, {
      email,
      password,
      returnSecureToken: true,
    });

    const idToken = verifyResponse.data.idToken; // Firebase JWT token

    // Step 3: Fetch additional user details from Firestore
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: "User data not found in Firestore" });
    }

    res.status(200).json({
      message: "Login successful",
      user: {
        id: userId,
        email: userRecord.email,
        name: userDoc.data().name,
        role: userDoc.data().role,
      },
      token: idToken, // If needed for authentication
    });
  } catch (error) {
    return res.status(401).json({ message: "Invalid email or password", error: error.message });
  }
});


// 👤 Get User Profile
router.get("/user/profile", async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    if (!userId) return res.status(400).json({ message: "User ID required" });

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ message: "User not found" });

    res.status(200).json(userDoc.data());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✏️ Update User Profile
router.put("/user/profile/update", async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    const { name, contact, address } = req.body;
    if (!userId) return res.status(400).json({ message: "User ID required" });

    await db.collection("users").doc(userId).update({
      name,
      contact,
      address,
      updatedAt: new Date(),
    });

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
