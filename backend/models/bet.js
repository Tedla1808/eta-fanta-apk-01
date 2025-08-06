// --- backend/models/bet.js --- (FINAL CONSOLIDATED AND CORRECTED VERSION)

const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
    // A link to the user who placed the bet
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // A link to the specific game instance this bet belongs to
    game: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game',
        required: true,
        index: true
    },
    // Which slot this bet belongs to (e.g., "slot1"). Kept for easier querying.
    slotId: {
        type: String,
        required: true
    },
    // The specific box ID (e.g., "5-7")
    boxId: {
        type: String,
        required: true
    },
    // The cost of this single bet
    cost: {
        type: Number,
        required: true
    },
    // Flag to mark the single winning bet of a game
    isWinner: {
        type: Boolean,
        default: false
    },
    // The net prize amount awarded to the winner
    prizeAmount: {
        type: Number,
        default: 0
    },
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

// ** THIS IS THE CRITICAL FIX FOR THE DUPLICATE KEY ERROR **
// It ensures a boxId can only be bet on ONCE per unique game instance.
betSchema.index({ game: 1, boxId: 1 }, { unique: true });

const Bet = mongoose.model('Bet', betSchema);

module.exports = Bet;