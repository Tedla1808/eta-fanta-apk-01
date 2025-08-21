// --- backend/routes/gameRoutes.js --- (FINAL, CORRECTED, WITH REFERRAL LOGIC)

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/user');
const Bet = require('../models/bet');
const Game = require('../models/game');
const { protect } = require('../middleware/authMiddleware');

const TOTAL_BOXES = 100;

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

const APP_VERSION_CONFIG = {
    latestVersion: '1.0.0',
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

        if (user.totalBalance < totalCost) {
            return res.status(400).json({ message: `Insufficient total balance.` });
        }
        
        let costToPay = totalCost;
        if (user.bonusBalance > 0) {
            const bonusDeducted = Math.min(user.bonusBalance, costToPay);
            user.bonusBalance -= bonusDeducted;
            costToPay -= bonusDeducted;
        }
        if (costToPay > 0) {
            user.mainBalance -= costToPay;
        }
        
        const conflictCheck = await Bet.findOne({ $or: betsToCreate.map(b => ({ game: b.game, boxId: b.boxId })) }).session(session);
        if (conflictCheck) throw new Error(`Sorry, at least one selection was just taken.`);

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
                
                // Winnings are always added to the main, withdrawable balance
                await User.findByIdAndUpdate(winningBet.user, { $inc: { mainBalance: prizeAmount } }).session(session);
                await Bet.updateOne({ _id: winningBet._id }, { $set: { isWinner: true, prizeAmount: prizeAmount } }, { session });
                await game.save({ session });
            }
        }
        await session.commitTransaction();
        res.status(201).json({ 
            message: "Bet placed successfully!", 
            newBalance: user.totalBalance // Return the new combined balance
        });
    } catch (error) {
        await session.abortTransaction();
        console.error("Error placing bet:", error);
        res.status(500).json({ message: error.message || "A server error occurred." });
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