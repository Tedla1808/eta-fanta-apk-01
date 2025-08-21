// --- backend/models/user.js --- (UPDATED FOR ADVANCED REFERRALS)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    password: { type: String, default: null },
    
    // BALANCE FIELDS
    mainBalance: { type: Number, default: 0 }, // For user's own deposits and winnings
    bonusBalance: { type: Number, default: 0 }, // For non-withdrawable referral bonuses
    
    fullName: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },
    telegramChatId: { type: String, default: null },
    withdrawalMethod: {
        accountName: { type: String, default: '' },
        accountPhone: { type: String, default: '' },
        provider: { type: String, default: 'telebirr' }
    },
    
    // REFERRAL FIELDS
    referralCode: { type: String, unique: true, sparse: true }, // e.g., ETA-12345
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    referralBonusAwarded: { type: Boolean, default: false } // To ensure referrer gets bonus only once

}, { timestamps: true });

// VIRTUAL PROPERTY: Create a 'totalBalance' that combines both balances for display
userSchema.virtual('totalBalance').get(function() {
    return this.mainBalance + this.bonusBalance;
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;