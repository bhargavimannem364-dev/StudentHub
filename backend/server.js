
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authMiddleware = require("./middleware/authMiddleware");
const User = require("./models/user");

const app = express();


// Middleware
app.use(cors());

app.use(express.json());

// Authentication routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/assignments", require("./routes/assignments"));

// Home route
app.get("/", (req, res) => {
    res.send("Student Assignment Dashboard Backend is Running!");
});

// Protected dashboard route
app.get("/api/dashboard", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "Welcome to your dashboard!",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                coins: user.coins,
                streak: user.streak
            }
        });

    } catch (error) {
        console.error("Dashboard Error:", error.message);

        res.status(500).json({
            message: "Dashboard loading failed"
        });
    }
});

// Server port
const PORT = process.env.PORT || 5000;

// Connect MongoDB and start server
async function startServer() {
    try {
        console.log("Connecting to MongoDB...");

        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000
        });

        console.log("MongoDB Connected Successfully!");

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.log("MongoDB Connection Failed!");
        console.log("Reason:", error.message);
    }
}

startServer();
