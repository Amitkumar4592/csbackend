const express = require("express");
const multer = require("multer");
const { storage, db } = require("./db");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const vision = require("@google-cloud/vision");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const client = new vision.ImageAnnotatorClient({
    keyFilename: path.join(__dirname, "service-account.json"),
});

router.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const bucket = storage.bucket(process.env.FIREBASE_STORAGE_BUCKET);
        const filename = `uploads/${Date.now()}_${req.file.originalname}`;
        const file = bucket.file(filename);

        await file.save(req.file.buffer, { contentType: req.file.mimetype });

        const url = `https://firebasestorage.googleapis.com/v0/b/${process.env.FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(filename)}?alt=media`;

        return res.status(200).json({ message: "File uploaded successfully", url });
    } catch (error) {
        return res.status(500).json({ error: "Failed to upload file", details: error.message });
    }
});

router.post("/detect", async (req, res) => {
    try {
        const { image_url, sunlight, water_availability, user_id } = req.body;
        if (!image_url || !sunlight || !water_availability || !user_id) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const validSunlight = ["High Sunlight", "Partial Shade", "Full Shade"];
        const validWater = ["Directly Available", "Indirectly Available", "Not Available"];

        if (!validSunlight.includes(sunlight) || !validWater.includes(water_availability)) {
            return res.status(400).json({ error: "Invalid sunlight or water input" });
        }

        const imagePath = path.join(__dirname, "temp_image.jpg");
        const response = await axios({
            url: image_url,
            responseType: "stream",
        });

        return new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(imagePath);
            response.data.pipe(writer);
            writer.on("finish", resolve);
            writer.on("error", reject);
        }).then(() => {
            execFile("python", ["yolo_detect.py", imagePath, sunlight, water_availability], (error, stdout) => {
                fs.unlink(imagePath, (err) => {
                    if (err) console.error("Failed to delete temp file:", err);
                });

                if (error) {
                    return res.status(500).json({ error: "YOLO processing failed", details: error.message });
                }

                try {
                    const result = JSON.parse(stdout);
                    const recommendations = result.farming_recommendations;
                    
                    // Save the past recommendations to Firestore
                    db.collection("recommendations").add({
                        user_id: user_id,
                        recommendations: recommendations,
                        date: new Date()
                    });

                    res.json({
                        message: "Detection completed",
                        vacant_percentage: result.vacant_percentage,
                        vacant_area: result.vacant_area,
                        sunlight: result.sunlight,
                        water_availability: result.water_availability,
                        farming_recommendations: recommendations,
                        detected_objects: result.detected_objects
                    });
                    
                } catch (parseError) {
                    res.status(500).json({ error: "Invalid JSON from YOLO", raw_output: stdout });
                }
            });
        }).catch(() => {
            res.status(500).json({ error: "Failed to download image" });
        });

    } catch (error) {
        return res.status(500).json({ error: "Unexpected error", details: error.message });
    }
});

// New endpoint to retrieve past recommendations for a user
router.get("/recommendations/:user_id", async (req, res) => {
    try {
        const { user_id } = req.params;
        const snapshot = await db.collection("recommendations").where("user_id", "==", user_id).get();

        if (snapshot.empty) {
            return res.status(404).json({ message: "No past recommendations found" });
        }

        const recommendations = snapshot.docs.map(doc => doc.data());
        res.json({ recommendations });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch past recommendations", details: error.message });
    }
});

module.exports = router;
