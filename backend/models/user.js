// backend/models/user.js - CLEANED UP

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    password: { type: String, default: null },
    balance: { type: Number, default: 0 },
    fullName: { type: String, default: '' },
    // profilePictureUrl field has been removed.
    withdrawalMethod: {
        accountName: { type: String, default: '' },
        accountPhone: { type: String, default: '' },
        provider: { type: String, default: 'telebirr' }
    },
    isVerified: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },
    telegramChatId: { type: String, default: null },
    isBlocked: { type: Boolean, default: false }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) { return next(); }
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;