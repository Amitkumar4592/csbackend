const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const authRoutes = require("./auth");
const farmingRoutes = require("./farming");
const marketplaceRoutes = require("./marketplace");
const consultationsRoutes = require("./consultations");
const blogRoutes = require('./blogRoutes');



require("dotenv").config(); // Load environment variables
require("./db"); // Ensure Firebase initializes

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Import Routes
app.use("/api/auth", authRoutes);
app.use("/api/farming", farmingRoutes);
app.use("/api/consultations", consultationsRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use('/api/posts', blogRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT,"0.0.0.0", () => console.log(`✅ Server running on port ${PORT}`));
