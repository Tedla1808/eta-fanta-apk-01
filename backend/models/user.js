// backend/models/user.js - FINAL SIMPLIFIED VERSION

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 },
    fullName: { type: String, default: '' },
    withdrawalMethod: {
        accountName: { type: String, default: '' },
        accountPhone: { type: String, default: '' },
        provider: { type: String, default: 'telebirr' }
    },
    telegramChatId: { type: String, default: null }, // Kept for 'Forgot Password'
    isBlocked: { type: Boolean, default: false }
}, { timestamps: true });

// This pre-save hook automatically hashes the password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) { return next(); }
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;