// --- backend/routes/authRoutes.js (FINAL SIMPLIFIED REGISTRATION) ---

const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper function for sending Telegram messages (used for forgot password)
const sendTelegramMessage = async (chatId, message) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    try {
        await axios.post(url, { chat_id: chatId, text: message });
    } catch (error) {
        console.error("Error sending Telegram message:", error.response ? error.response.data : error.message);
        throw new Error("Could not send message to Telegram.");
    }
};

// === NEW, SIMPLIFIED REGISTRATION ROUTE ===
router.post('/register', async (req, res) => {
    try {
        const { phone, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({ message: "Phone number and password are required." });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long." });
        }

        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ message: "An account with this phone number already exists. Please log in." });
        }

        const newUser = new User({ phone, password });
        await newUser.save();

        res.status(201).json({ message: "Registration successful! You can now log in." });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ message: "Server error during registration." });
    }
});

// === LOGIN (MODIFIED - isVerified check removed) ===
router.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const user = await User.findOne({ phone });
        if (user && user.isBlocked) { return res.status(403).json({ message: "Your account is blocked. Please contact support." }); }
        
        // The old 'isVerified' check is now completely gone.
        if (!user) { return res.status(400).json({ message: "Invalid credentials." }); }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) { return res.status(400).json({ message: "Invalid credentials." }); }

        const payload = { user: { id: user.id } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { phone: user.phone, balance: user.balance, fullName: user.fullName, withdrawalMethod: user.withdrawalMethod } });
    } catch (error) { console.error("Login Error:", error); res.status(500).json({ message: "Server error during login." }); }
});

// === FORGOT PASSWORD (UNCHANGED) ===
router.post('/forgot-password', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) { return res.status(400).json({ message: 'Phone number is required.' }); }
        
        const user = await User.findOne({ phone });
        if (!user || !user.telegramChatId) { 
            return res.status(404).json({ message: 'Account not found or not linked to Telegram. Please contact our support or link your account via the Telegram bot.' }); 
        }

        const tempPassword = Math.random().toString(36).slice(-8);
        await sendTelegramMessage(user.telegramChatId, `Your Eta Fanta password has been reset.\n\nYour new temporary password is: ${tempPassword}\n\nPlease log in and change it immediately.`);
        
        user.password = tempPassword;
        await user.save();
        
        res.status(200).json({ message: 'A new password has been sent to your linked Telegram account.' });
    } catch (error) { console.error("Forgot Password Error:", error); res.status(500).json({ message: 'A server error occurred.' }); }
});

module.exports = router;