// --- backend/routes/authRoutes.js --- (FINAL, CORRECTED, WITH REFERRAL LOGIC)

const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper function is defined ONCE at the top
const sendTelegramMessage = async (chatId, message) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    try {
        await axios.post(url, { chat_id: chatId, text: message });
        console.log(`Successfully sent Telegram message to Chat ID: ${chatId}`);
    } catch (error) {
        const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error("Error sending Telegram message:", errorMessage);
        throw new Error("Could not send message to Telegram.");
    }
};

// === STEP 1: SEND OTP ===
router.post('/otp/send', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ message: "Phone number is required." });
        }
        const user = await User.findOne({ phone });
        if (!user || !user.telegramChatId) {
            return res.status(404).json({ message: 'We have not received your contact from Telegram yet. Please go to the bot, share your contact, and try again.' });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        user.otp = otp;
        user.otpExpires = otpExpires;
        user.isVerified = false;
        await user.save();
        await sendTelegramMessage(user.telegramChatId, `Your Eta Fanta verification code is: ${otp}`);
        res.status(200).json({ message: "OTP sent to your Telegram account." });
    } catch (error) {
        console.error("Send OTP Error:", error);
        res.status(500).json({ message: "Server error while sending OTP." });
    }
});

// === STEP 2: VERIFY OTP ===
router.post('/otp/verify', async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) return res.status(400).json({ message: "Phone and OTP are required." });
        const user = await User.findOne({ phone, otp, otpExpires: { $gt: Date.now() } });
        if (!user) return res.status(400).json({ message: "Invalid OTP or OTP has expired." });
        user.isVerified = true;
        user.otp = null;
        user.otpExpires = null;
        await user.save();
        res.status(200).json({ message: "Phone number verified successfully." });
    } catch (error) {
        console.error("Verify OTP Error:", error);
        res.status(500).json({ message: "Server error while verifying OTP." });
    }
});

// === STEP 3: FINAL REGISTRATION (WITH REFERRAL LOGIC) ===
router.post('/register', async (req, res) => {
    try {
        const { phone, password, referralCode } = req.body;
        if (!phone || !password) return res.status(400).json({ message: "Phone and password are required." });

        const user = await User.findOne({ phone });
        if (!user || !user.isVerified) {
            return res.status(400).json({ message: "Phone number not verified. Please complete the OTP step first." });
        }
        if (user.password) {
            return res.status(400).json({ message: "This account is already registered. Please log in." });
        }
        
        // Generate a unique referral code for the new user
        user.referralCode = `ETA-${phone.slice(-5)}`;

        // Handle the incoming referral code if provided
        if (referralCode) {
            const referringUser = await User.findOne({ referralCode: referralCode.trim().toUpperCase() });
            if (referringUser) {
                user.referredBy = referringUser._id;
                user.bonusBalance += 10; // Give the new user their 10 ETB Welcome Bonus
                console.log(`User ${user.phone} referred by ${referringUser.phone}, awarded 10 ETB bonus.`);
            }
        }
        
        user.password = password;
        await user.save();
        res.status(201).json({ message: "Registration complete! You can now log in." });
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ message: "Server error during final registration." });
    }
});

// === LOGIN (WITH TOTAL BALANCE) ===
router.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const user = await User.findOne({ phone });
        if (user && user.isBlocked) { return res.status(403).json({ message: "Your account is blocked. Please contact support." }); }
        if (!user || !user.isVerified || !user.password) { return res.status(400).json({ message: "Invalid credentials or user not verified." }); }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) { return res.status(400).json({ message: "Invalid credentials." }); }
        
        const payload = { user: { id: user.id } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
        
        res.json({
            token,
            user: {
                phone: user.phone,
                balance: user.totalBalance, // Send the combined balance
                fullName: user.fullName,
                withdrawalMethod: user.withdrawalMethod,
                referralCode: user.referralCode
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server error during login." });
    }
});

// === FORGOT PASSWORD ===
router.post('/forgot-password', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) { return res.status(400).json({ message: 'Phone number is required.' }); }
        const user = await User.findOne({ phone });
        if (!user || !user.telegramChatId) { return res.status(404).json({ message: 'User not found or not linked to Telegram. Please contact support.' }); }
        const tempPassword = Math.random().toString(36).slice(-8);
        await sendTelegramMessage(user.telegramChatId, `Your Eta Fanta password has been reset.\n\nYour new temporary password is: ${tempPassword}\n\nPlease log in and change it immediately.`);
        user.password = tempPassword;
        await user.save();
        res.status(200).json({ message: 'A new password has been sent to your Telegram account.' });
    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ message: 'A server error occurred.' });
    }
});

module.exports = router;