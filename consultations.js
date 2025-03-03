const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.firestore();

// Fetch available consultation & service options
router.get("/services", async (req, res) => {
    try {
        const snapshot = await db.collection("services").get();
        if (snapshot.empty) {
            return res.status(404).json({ message: "No services found" });
        }
        
        const services = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return res.status(200).json(services);
    } catch (error) {
        console.error("Error fetching services:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

// Booking a consultation or service
router.post("/book", async (req, res) => {
    try {
        const { userId, serviceId, date, time } = req.body;

        if (!userId || !serviceId || !date || !time) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: "User not found" });
        }

        const serviceRef = db.collection("services").doc(serviceId);
        const serviceDoc = await serviceRef.get();
        if (!serviceDoc.exists) {
            return res.status(404).json({ message: "Service not found" });
        }

        const bookingRef = db.collection("bookings").doc();
        await bookingRef.set({
            id: bookingRef.id,
            userId,
            serviceId,
            date,
            time,
            status: "pending", // Default status
            createdAt: admin.firestore.Timestamp.now()
        });

        return res.status(201).json({ message: "Booking successful", bookingId: bookingRef.id });
    } catch (error) {
        console.error("Error booking service:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

router.get("/history/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        // Firestore Query
        const bookingsSnapshot = await db.collection("bookings")
            .where("userId", "==", userId)
            .orderBy("date", "desc") // Ensure 'date' is stored as a Firestore Timestamp
            .get();

        if (bookingsSnapshot.empty) {
            return res.status(404).json({ message: "No booking history found" });
        }

        let bookingHistory = [];
        for (let doc of bookingsSnapshot.docs) {
            let bookingData = doc.data();

            // Ensure serviceId exists
            if (!bookingData.serviceId) {
                console.error(`Booking ${doc.id} missing serviceId`);
                continue;
            }

            // Fetch Service Details
            const serviceRef = await db.collection("services").doc(bookingData.serviceId).get();
            let serviceData = null;
            if (serviceRef.exists) {
                serviceData = serviceRef.data();
            } else {
                console.warn(`Service ${bookingData.serviceId} not found`);
            }

            bookingHistory.push({
                bookingId: doc.id,
                serviceName: serviceData ? serviceData.name : "Service Not Found",
                servicePrice: serviceData ? serviceData.price : null,
                date: bookingData.date, // Ensure this is a Firestore Timestamp
                time: bookingData.time,
                timestamp: bookingData.timestamp
            });
        }

        return res.status(200).json(bookingHistory);
    } catch (error) {
        console.error("Error fetching booking history:", error.message);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});


router.delete("/:bookingId/cancel", async (req, res) => {
    try {
        const { bookingId } = req.params;

        // Reference to the booking document
        const bookingRef = db.collection("bookings").doc(bookingId);
        const bookingDoc = await bookingRef.get();

        // Check if the booking exists
        if (!bookingDoc.exists) {
            return res.status(404).json({ message: "Booking not found." });
        }

        const bookingData = bookingDoc.data();
        const currentDate = new Date();
        const bookingDate = new Date(bookingData.date);

        // Prevent cancellation of past bookings
        if (bookingDate < currentDate) {
            return res.status(400).json({ message: "Cannot cancel past bookings." });
        }

        // Delete the booking
        await bookingRef.delete();
        return res.status(200).json({ message: "Booking cancelled successfully." });

    } catch (error) {
        console.error("Error cancelling booking:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

router.get("/history", async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required." });
        }

        // Fetch user's booking history, sorted by date (most recent first)
        const bookingsSnapshot = await db.collection("bookings")
            .where("userId", "==", userId)
            .orderBy("date", "desc")
            .get();

        const bookings = bookingsSnapshot.docs.map(doc => ({
            bookingId: doc.id,
            ...doc.data()
        }));

        return res.status(200).json({ bookings });

    } catch (error) {
        console.error("Error fetching booking history:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

router.post('/booking/update-status/:bookingId', async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status } = req.body;

        // Allowed statuses
        const allowedStatuses = ["Pending", "Confirmed", "Completed", "Cancelled"];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        // Reference to Firestore document
        const bookingRef = db.collection("bookings").doc(bookingId);

        // Check if the booking exists
        const bookingDoc = await bookingRef.get();
        if (!bookingDoc.exists) {
            return res.status(404).json({ message: "Booking not found" });
        }

        // Update the booking status
        await bookingRef.update({ status });

        res.json({ message: "Booking status updated successfully" });
    } catch (error) {
        console.error("Error updating booking status:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


module.exports = router;
