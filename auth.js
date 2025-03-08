const express = require("express");
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
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Firebase Sign-in using email & password
    const userCredential = await auth.getUserByEmail(email);

    if (!userCredential) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Fetch user details from Firestore
    const userDoc = await db.collection("users").doc(userCredential.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found in database" });
    }

    // Send user data
    res.status(200).json({
      message: "Login successful",
      user: {
        id: userCredential.uid,
        email: userCredential.email,
        name: userCredential.displayName,
        role: userDoc.data().role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
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
