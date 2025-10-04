// --- backend/routes/gameRoutes.js --- (FINAL, WITH PROFITABLE SPINNER)

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/user');
const Bet = require('../models/bet');
const Game = require('../models/game');
const Transaction = require('../models/transaction');
const { protect } = require('../middleware/authMiddleware');

const TOTAL_BOXES = 100;

// ** SLOTS CONFIGURATION **
const SLOT_CONFIG = {
    'slot0.9': { cost: 10,   commission: 0.11 },
    'slot1':   { cost: 20,   commission: 0.10 },
    'slot2':   { cost: 50,   commission: 0.09 },
    'slot3':   { cost: 75,   commission: 0.08 },
    'slot4':   { cost: 100,  commission: 0.07 },
    'slot5':   { cost: 150,  commission: 0.06 },
    'slot6':   { cost: 500,  commission: 0.05 },
    'slot7':   { cost: 5000, commission: 0.04 },
};

// ** MODIFIED PROFITABLE SPINNER GAME CONFIGURATION **
const SPINNER_OUTCOMES = [
    // Multiplier, the visual segment index on the wheel, and the server-side probability
    { multiplier: 3.0,  segmentIndex: 1, probability: 0.10 }, // 10% chance of 3x
    { multiplier: 2.0,  segmentIndex: 3, probability: 0.20 }, // 20% chance of 2x
    { multiplier: 0.5,  segmentIndex: 5, probability: 0.35 }, // 35% chance to get half back
    { multiplier: 0,    segmentIndex: 0, probability: 0.35 }  // 35% chance of 0x
];

// Helper function to get a weighted random outcome
const getSpinnerResult = () => {
    const rand = Math.random();
    let cumulativeProbability = 0;
    for (const outcome of SPINNER_OUTCOMES) {
        cumulativeProbability += outcome.probability;
        if (rand < cumulativeProbability) {
            return outcome;
        }
    }
    return SPINNER_OUTCOMES[SPINNER_OUTCOMES.length - 1]; // Fallback
};
// ===================================

const APP_VERSION_CONFIG = {
    latestVersion: '1.2.0',
    updateUrl: 'https://t.me/etafanta_user'
};

router.get('/version', (req, res) => {
    res.json(APP_VERSION_CONFIG);
});

async function getOrCreateActiveGame(slotId, session) {
    let game = await Game.findOne({ slotId, status: 'Active' }).session(session);
    if (game) return game;
    const lastGame = await Game.findOne({ slotId }).sort({ round: -1 }).session(session);
    const nextRound = lastGame ? lastGame.round + 1 : 1;
    game = new Game({ slotId, round: nextRound });
    await game.save({ session });
    return game;
}

router.get('/slots', protect, async (req, res) => {
    try {
        const slotStatus = {};
        for (const slotId in SLOT_CONFIG) {
            const activeGame = await getOrCreateActiveGame(slotId);
            const betsInGame = await Bet.find({ game: activeGame._id }).lean();
            slotStatus[slotId] = {
                percentage: Math.round((betsInGame.length / TOTAL_BOXES) * 100),
                unavailableBoxes: betsInGame.map(b => b.boxId),
                cost: SLOT_CONFIG[slotId].cost
            };
        }
        res.status(200).json(slotStatus);
    } catch (error) { res.status(500).json({ message: "Server error." }); }
});

router.post('/bet', protect, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { bets } = req.body;
        const user = await User.findById(req.user.id).session(session);
        if (!user) return res.status(404).json({ message: "User not found." });
        let totalCost = 0;
        const betsToCreate = [];
        const gamesInvolved = new Map();
        for (const slotId in bets) {
            if (!gamesInvolved.has(slotId)) {
                gamesInvolved.set(slotId, await getOrCreateActiveGame(slotId, session));
            }
            const game = gamesInvolved.get(slotId);
            const costPerBox = SLOT_CONFIG[slotId].cost;
            for (const boxId of bets[slotId]) {
                totalCost += costPerBox;
                betsToCreate.push({ user: req.user.id, game: game._id, slotId, boxId, cost: costPerBox });
            }
        }
        if (user.balance < totalCost) return res.status(400).json({ message: `Insufficient balance.` });
        const conflictCheck = await Bet.findOne({ $or: betsToCreate.map(b => ({ game: b.game, boxId: b.boxId })) }).session(session);
        if (conflictCheck) throw new Error(`Sorry, at least one selection was just taken.`);
        user.balance -= totalCost;
        await user.save({ session });
        await Bet.insertMany(betsToCreate, { session });
        for (const [slotId, game] of gamesInvolved.entries()) {
            const betCount = await Bet.countDocuments({ game: game._id }).session(session);
            if (betCount >= TOTAL_BOXES) {
                const gameBets = await Bet.find({ game: game._id }).session(session);
                const winningBet = gameBets[Math.floor(Math.random() * gameBets.length)];
                game.status = 'Settled';
                game.winner = winningBet.user;
                const { cost, commission } = SLOT_CONFIG[slotId];
                const prizeAmount = (cost * TOTAL_BOXES) * (1 - commission);
                await User.findByIdAndUpdate(winningBet.user, { $inc: { balance: prizeAmount } }).session(session);
                await Bet.updateOne({ _id: winningBet._id }, { $set: { isWinner: true, prizeAmount: prizeAmount } }, { session });
                await game.save({ session });
            }
        }
        await session.commitTransaction();
        res.status(201).json({ message: "Bet placed successfully!", newBalance: user.balance });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: error.message || "A server error occurred." });
    } finally {
        session.endSession();
    }
});

router.post('/spinner/spin', protect, async (req, res) => {
    const { betAmount } = req.body;
    const amount = parseFloat(betAmount);

    if (isNaN(amount) || amount < 2 || amount > 1000) {
        return res.status(400).json({ message: "Invalid bet amount. Must be between 2 and 1000." });
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const user = await User.findById(req.user.id).session(session);
        if (!user) {
            await session.abortTransaction();
            return res.status(404).json({ message: "User not found." });
        }
        if (user.balance < amount) {
            await session.abortTransaction();
            return res.status(400).json({ message: "Insufficient balance." });
        }

        user.balance -= amount;
        
        await Transaction.create([{
            user: user._id,
            type: 'Withdrawal',
            amount: -amount,
            status: 'Completed',
            method: 'Spinner Bet'
        }], { session });

        const result = getSpinnerResult();
        const prizeAmount = amount * result.multiplier;

        if (prizeAmount > 0) {
            user.balance += prizeAmount;
            await Transaction.create([{
                user: user._id,
                type: 'Deposit',
                amount: prizeAmount,
                status: 'Completed',
                method: 'Spinner Win'
            }], { session });
        }
        
        await user.save({ session });
        await session.commitTransaction();

        res.status(200).json({
            message: "Spin successful!",
            newBalance: user.balance,
            prize: prizeAmount,
            winningSegmentIndex: result.segmentIndex
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("Spinner Game Error:", error);
        res.status(500).json({ message: "A server error occurred during the spin." });
    } finally {
        session.endSession();
    }
});


router.get('/recent-winners', async (req, res) => {
    try {
        const winners = await Bet.find({ isWinner: true }).sort({ createdAt: -1 }).limit(10).populate('user', 'phone').lean();
        res.json(winners);
    } catch (error) { res.status(500).json({ message: "Server error fetching winners." }); }
});

module.exports = router;