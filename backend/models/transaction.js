// --- backend/models/transaction.js --- (Correct and Final Version)

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    // A link to the user who initiated the transaction
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    // The type of transaction (Deposit or Withdrawal)
    type: {
        type: String,
        required: true,
        enum: ['Deposit', 'Withdrawal'],
    },
    // The amount of the transaction
    amount: {
        type: Number,
        required: true,
    },
    // The status of the transaction, which starts as Pending for deposits
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Pending', // New default is 'Pending'
    },
    // The phone number the user claims to have deposited from
    depositorPhone: {
        type: String,
        default: ''
    },
    // A counter for failed verification attempts
    verificationAttempts: {
        type: Number,
        default: 0
    },
    // The payment method used (optional but good to have)
    method: {
        type: String,
        default: 'Telebirr',
    }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;