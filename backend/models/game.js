// --- backend/models/game.js ---

const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    slotId: {
        type: String,
        required: true,
        index: true,
    },
    round: {
        type: Number,
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['Active', 'Settled'],
        default: 'Active',
        index: true,
    },
    winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    }
}, { timestamps: true });

// A slot can only have one active game at a time.
gameSchema.index({ slotId: 1, status: 1 });

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;