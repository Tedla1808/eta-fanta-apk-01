// --- backend/models/user.js --- (FINAL, CORRECTED BALANCE LOGIC)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    password: { type: String, default: null },
    
    // CORRECTED BALANCE FIELDS
    mainBalance: { type: Number, default: 0 },
    bonusBalance: { type: Number, default: 0 },
    // The old 'balance' field is now REMOVED.
    
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
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    referralBonusAwarded: { type: Boolean, default: false }
}, { 
    timestamps: true,
    toJSON: { virtuals: true }, // Ensure virtuals are included when converting to JSON
    toObject: { virtuals: true } 
});

// This "virtual" property automatically calculates the total balance
userSchema.virtual('totalBalance').get(function() {
    return (this.mainBalance || 0) + (this.bonusBalance || 0);
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;