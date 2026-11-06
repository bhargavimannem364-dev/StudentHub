
const express = require("express");
const router = express.Router();

const Assignment = require("../models/assignment");
const User = require("../models/user");
const authMiddleware = require("../middleware/authMiddleware");

// Log assignment requests
router.use((req, res, next) => {
    console.log(
        "Assignment request received:",
        req.method,
        req.originalUrl
    );
    next();
});

console.log("Assignments route file loaded!");

// Test route
router.get("/test", (req, res) => {
    res.send("Assignment routes are working!");
});

// GET: Get all assignments for logged-in user
router.get("/", authMiddleware, async (req, res) => {
    try {
        const assignments = await Assignment.find({
            user: req.user.id
        }).sort({ dueDate: 1 });

        res.status(200).json(assignments);

    } catch (error) {
        console.error("Get assignments error:", error);

        res.status(500).json({
            message: "Failed to fetch assignments"
        });
    }
});

// POST: Create a new assignment
router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            title,
            description,
            dueDate,
            priority
        } = req.body;

        if (!title || !dueDate) {
            return res.status(400).json({
                message: "Title and due date are required"
            });
        }

        const assignment = await Assignment.create({
            user: req.user.id,
            title,
            description,
            dueDate,
            priority
        });

        res.status(201).json({
            message: "Assignment created successfully",
            assignment
        });

    } catch (error) {
        console.error("Create assignment error:", error);

        res.status(500).json({
            message: "Failed to create assignment"
        });
    }
});

// PATCH: Complete or undo an assignment
router.patch("/:id", authMiddleware, async (req, res) => {
    try {
        const { completed } = req.body;

        if (typeof completed !== "boolean") {
            return res.status(400).json({
                message: "Completed must be true or false"
            });
        }

        const assignment = await Assignment.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!assignment) {
            return res.status(404).json({
                message: "Assignment not found"
            });
        }

        let coinsAwardedNow = false;
        let streakUpdated = false;

        // Complete assignment
        if (completed === true) {

            // Award coins only once per assignment
            if (!assignment.coinsAwarded) {
                assignment.coinsAwarded = true;
                coinsAwardedNow = true;
            }

            // Update streak only when assignment changes
            // from pending to completed
            if (!assignment.completed) {

                const user = await User.findById(req.user.id);

                if (!user) {
                    return res.status(404).json({
                        message: "User not found"
                    });
                }

                const today = new Date();
                today.setUTCHours(0, 0, 0, 0);

                let newStreak = 1;

                if (user.lastCompletedDate) {

                    const lastDate = new Date(
                        user.lastCompletedDate
                    );

                    lastDate.setUTCHours(0, 0, 0, 0);

                    const difference = Math.round(
                        (today - lastDate) /
                        (1000 * 60 * 60 * 24)
                    );

                    if (difference === 0) {
                        // Already completed something today
                        newStreak = user.streak;

                    } else if (difference === 1) {
                        // Completed something yesterday
                        newStreak = user.streak + 1;

                    } else {
                        // Missed one or more days
                        newStreak = 1;
                    }
                }

                user.streak = newStreak;
                user.lastCompletedDate = today;

                await user.save();

                streakUpdated = true;
            }

            assignment.completed = true;

        } else {

            // Undo completion.
            // Do not remove coins or reset streak.
            assignment.completed = false;
        }

        await assignment.save();

        // Award 10 coins only once per assignment
        if (coinsAwardedNow) {
            await User.findByIdAndUpdate(
                req.user.id,
                {
                    $inc: { coins: 10 }
                }
            );
        }

        // Get updated user information
        const user = await User.findById(req.user.id)
            .select("coins streak lastCompletedDate");

        res.status(200).json({
            message: completed
                ? coinsAwardedNow
                    ? "Assignment completed! You earned 10 coins."
                    : "Assignment completed! Coins were already awarded."
                : "Assignment marked as pending.",

            assignment,

            coins: user ? user.coins : 0,

            streak: user ? user.streak : 0,

            lastCompletedDate: user
                ? user.lastCompletedDate
                : null,

            coinsAwarded: coinsAwardedNow,

            streakUpdated
        });

    } catch (error) {
        console.error("Update assignment error:", error);

        res.status(500).json({
            message: "Failed to update assignment"
        });
    }
});

// DELETE: Delete an assignment
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const assignment = await Assignment.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id
        });

        if (!assignment) {
            return res.status(404).json({
                message: "Assignment not found"
            });
        }

        res.status(200).json({
            message: "Assignment deleted successfully"
        });

    } catch (error) {
        console.error("Delete assignment error:", error);

        res.status(500).json({
            message: "Failed to delete assignment"
        });
    }
});

module.exports = router;
