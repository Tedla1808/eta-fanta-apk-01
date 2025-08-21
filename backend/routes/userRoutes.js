// --- backend/routes/userRoutes.js --- (FINAL, SIMPLIFIED, AND CONSOLIDATED)

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
// Multer is no longer needed
// const multer = require('multer');
const path = require('path');
const axios = require('axios');
const User = require('../models/user');
const Bet = require('../models/bet');
const Transaction = require('../models/transaction');
const { protect } = require('../middleware/authMiddleware');

// Multer configuration has been removed as it is no longer used.

// === UPDATE USER PROFILE (NAME ONLY) ===
router.post('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Only update the full name from the request body.
        user.fullName = req.body.fullName || user.fullName;
        
        const updatedUser = await user.save();
        
        res.json({
            message: 'Profile updated successfully',
            fullName: updatedUser.fullName
            // No longer sending back profilePictureUrl
        });
    } catch (error) {
        console.error('Profile Update Error:', error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
});

// === CHANGE PASSWORD ===
router.post('/change-password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found." });
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: "Incorrect current password." });
        user.password = newPassword; await user.save();
        res.json({ message: "Password changed successfully." });
    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).json({ message: "Server error while changing password." });
    }
});

// === SAVE WITHDRAWAL METHOD ===
router.post('/withdrawal-method', protect, async (req, res) => {
    try {
        const { accountName, accountPhone, provider } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found." });
        user.withdrawalMethod = { accountName, accountPhone, provider };
        await user.save();
        res.status(200).json({ message: 'Withdrawal method saved successfully.' });
    } catch (error) {
        console.error("Save Withdrawal Method Error:", error);
        res.status(500).json({ message: "Server error while saving withdrawal method." });
    }
});

// === DEPOSIT VERIFICATION REQUEST ===
router.post('/request-deposit-verification', protect, async (req, res) => {
    try {
        const { depositorPhone, amount } = req.body;
        const user = await User.findById(req.user.id);
        if (!depositorPhone || !amount || amount <= 0) {
            return res.status(400).json({ message: "Valid phone and amount are required." });
        }
        const transaction = await Transaction.create({ user: req.user.id, type: 'Deposit', amount: parseFloat(amount), depositorPhone: depositorPhone, status: 'Pending' });
        const adminMessage = `--- Deposit Verification Request ---\nRequest ID: ${transaction._id}\nUser Phone: ${user.phone}\n-----------------------------------\nDepositor Phone: ${depositorPhone}\nAmount Claimed: ${amount} ETB\n-----------------------------------\nReply with buttons to process.`;
        
        if (process.env.ADMIN_TELEGRAM_ID && process.env.TELEGRAM_BOT_TOKEN) {
            await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                chat_id: process.env.ADMIN_TELEGRAM_ID,
                text: adminMessage,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ Verify Deposit", callback_data: `verify-deposit_${transaction._id}` },
                            { text: "❌ Reject Deposit", callback_data: `reject-deposit_${transaction._id}` }
                        ]
                    ]
                }
            });
        }
        res.status(200).json({ message: "Verification request submitted. Awaiting admin approval." });
    } catch (error) {
        console.error("Request Deposit Error:", error);
        res.status(500).json({ message: "Server error submitting request." });
    }
});

// === WITHDRAWAL REQUEST (ADMIN APPROVAL FLOW) ===
router.post('/request-withdrawal', protect, async (req, res) => {
    try {
        const { amount } = req.body;
        const requestedAmount = parseFloat(amount);
        const user = await User.findById(req.user.id);
        if (!requestedAmount || requestedAmount <= 0) return res.status(400).json({ message: "Invalid withdrawal amount." });
        if (!user) return res.status(404).json({ message: "User not found." });
        if (!user.withdrawalMethod || !user.withdrawalMethod.accountName) return res.status(400).json({ message: "Please save your withdrawal method first." });
        if (user.balance < requestedAmount) return res.status(400).json({ message: `Insufficient balance.` });
        const transaction = await Transaction.create({ user: req.user.id, type: 'Withdrawal', amount: requestedAmount, status: 'Pending', method: user.withdrawalMethod.provider });
        const adminMessage = `--- ⚠️ Withdrawal Request ---\nRequest ID: ${transaction._id}\nUser Phone: ${user.phone}\nBalance: ${user.balance.toFixed(2)} ETB\n-----------------------------------\nWithdraw Amount: ${requestedAmount.toFixed(2)} ETB\nMethod: ${user.withdrawalMethod.provider}\nTo: ${user.withdrawalMethod.accountName} (${user.withdrawalMethod.accountPhone})`;
        
        if (process.env.ADMIN_TELEGRAM_ID && process.env.TELEGRAM_BOT_TOKEN) {
            await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                chat_id: process.env.ADMIN_TELEGRAM_ID,
                text: adminMessage,
                reply_markup: {
                    inline_keyboard: [[
                        { text: "✅ Approve", callback_data: `approve-withdraw_${transaction._id}` },
                        { text: "❌ Decline", callback_data: `decline-withdraw_${transaction._id}` }
                    ]]
                }
            });
        }
        res.status(200).json({ message: "Withdrawal request submitted for admin approval." });
    } catch (error) {
        console.error("Withdrawal Request Error:", error);
        res.status(500).json({ message: "Server error during withdrawal request." });
    }
});

// === HISTORY ROUTES ===
router.get('/transaction-history', protect, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const transactions = await Transaction.find({ user: req.user.id, createdAt: { $gte: thirtyDaysAgo } }).sort({ createdAt: -1 }).lean();
        res.json(transactions);
    } catch (error) {
        console.error("Fetch Transaction History Error:", error);
        res.status(500).json({ message: "Server error fetching transaction history." });
    }
});
router.get('/bet-history', protect, async (req, res) => {
    try {
        const bets = await Bet.find({ user: req.user.id, isSettled: true }).sort({ updatedAt: -1 }).limit(10).lean();
        res.json(bets);
    } catch (error) {
        console.error("Fetch Bet History Error:", error);
        res.status(500).json({ message: "Server error fetching bet history." });
    }
});

module.exports = router;