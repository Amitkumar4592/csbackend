const express = require("express");
const bcrypt = require("bcryptjs");
const { auth, db } = require("./db");

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
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Get user by email from Firebase Auth
    const userRecord = await auth.getUserByEmail(email);
    const userId = userRecord.uid;

    // Fetch user data from Firestore
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();

    // 🔒 Check password (compare hashed password)
    const isPasswordValid = await bcrypt.compare(password, userData.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // ✅ Successful login, return user details
    res.status(200).json({
      message: "Login successful",
      uid: userId,
      name: userData.name,
      email: userData.email,
      role: userData.role,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
