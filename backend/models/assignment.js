
const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            default: ""
        },

        dueDate: {
            type: Date,
            required: true
        },

        priority: {
            type: String,
            enum: ["High", "Medium", "Low"],
            default: "Medium"
        },

        completed: {
            type: Boolean,
            default: false
        },

        coinsAwarded: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Assignment", assignmentSchema);
