// --- server.js --- (FINAL, CORRECTED, AND CONSOLIDATED)

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { Telegraf } = require('telegraf');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");
const jwt = require('jsonwebtoken');
const axios = require('axios');

const User = require('./models/user');
const Transaction = require('./models/transaction');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID;
const PORT = process.env.PORT || 5000;

const allowedOrigins = [ 'https://www.etafanta.com', 'https://etafanta.com', 'http://127.0.0.1:5500', 'http://localhost:5500' ];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
};
app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'public')));

// API ROUTES
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/game', require('./routes/gameRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/webauthn', require('./routes/webAuthnRoutes'));

// CATCH-ALL ROUTE
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const connectDB = async () => { try { await mongoose.connect(process.env.MONGO_URI); console.log('MongoDB Connected...'); } catch (err) { console.error('MongoDB Connection Error:', err.message); process.exit(1); } };

const userSockets = new Map();
io.on('connection', (socket) => {
    socket.on('authenticate', (token) => {
        try { if (!token) return; const decoded = jwt.verify(token, process.env.JWT_SECRET); userSockets.set(decoded.user.id, socket.id); console.log(`[Socket] Authenticated user ${decoded.user.id}`); } catch (error) { console.log('[Socket] Auth failed.'); }
    });
    socket.on('disconnect', () => { for (let [userId, socketId] of userSockets.entries()) { if (socketId === socket.id) { userSockets.delete(userId); console.log(`[Socket] User ${userId} disconnected.`); break; } } });
});

const sendWelcomeMessage = (ctx) => {
    ctx.reply(
        'Welcome to Eta Fanta! To connect your website account, please use the button below to share your phone number.', {
            reply_markup: {
                keyboard: [
                    [{ text: 'Share My Phone Number', request_contact: true }]
                ],
                one_time_keyboard: true,
                resize_keyboard: true
            }
        }
    );
};

bot.start((ctx) => {
    console.log(`[Bot] Received /start from user ${ctx.from.id}`);
    sendWelcomeMessage(ctx);
});

bot.help((ctx) => {
    console.log(`[Bot] Received /help from user ${ctx.from.id}`);
    sendWelcomeMessage(ctx);
});

bot.on('callback_query', async (ctx) => {
    try {
        if (String(ctx.callbackQuery.from.id) !== String(ADMIN_TELEGRAM_ID)) return ctx.answerCbQuery("Not authorized.");
        const [action, transactionId] = ctx.callbackQuery.data.split('_');
        const transaction = await Transaction.findById(transactionId).populate('user');
        if (!transaction || transaction.status !== 'Pending') {
            await ctx.answerCbQuery('Already processed.');
            return ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n--- ⚠️ Action Ignored (Already Processed) ---`);
        }
        const user = transaction.user;
        const userSocketId = userSockets.get(user._id.toString());
        
        if (action === 'verify-deposit') {
            transaction.status = 'Completed';
            user.mainBalance += transaction.amount;
            await transaction.save();
            await user.save();
            
            if (user.referredBy && !user.referralBonusAwarded) {
                const firstDeposit = await Transaction.findOne({ user: user._id, type: 'Deposit', status: 'Completed', amount: { $gte: 50 } });
                if (firstDeposit && transaction._id.equals(firstDeposit._id)) {
                    const referringUser = await User.findById(user.referredBy);
                    if (referringUser) {
                        referringUser.bonusBalance += 20;
                        user.referralBonusAwarded = true;
                        await referringUser.save();
                        await user.save();
                        console.log(`Referrer ${referringUser.phone} awarded 20 ETB bonus.`);
                    }
                }
            }
            await ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n--- ✅ DEPOSIT VERIFIED ---`);
            if (userSocketId) io.to(userSocketId).emit('depositApproved', { message: `Deposit of ${transaction.amount.toFixed(2)} ETB approved!`, newBalance: user.totalBalance });
        } else if (action === 'reject-deposit') {
            transaction.status = 'Failed';
            await transaction.save();
            await ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n--- ❌ DEPOSIT REJECTED ---`);
            if (userSocketId) io.to(userSocketId).emit('depositRejected', { final: false });
        } else if (action === 'approve-withdraw') {
            if (user.mainBalance < transaction.amount) {
                return ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n--- ⚠️ INSUFFICIENT FUNDS ---`);
            }
            transaction.status = 'Completed';
            user.mainBalance -= transaction.amount;
            transaction.amount = -transaction.amount;
            await Promise.all([transaction.save(), user.save()]);
            await ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n--- ✅ WITHDRAWAL APPROVED ---`);
            if(userSocketId) io.to(userSocketId).emit('withdrawalApproved', { message: `Your withdrawal of ${Math.abs(transaction.amount).toFixed(2)} ETB was approved.`, newBalance: user.totalBalance });
        } else if (action === 'decline-withdraw') {
            transaction.status = 'Failed';
            await transaction.save();
            await ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n--- ❌ WITHDRAWAL DECLINED ---`);
            if(userSocketId) io.to(userSocketId).emit('withdrawalDeclined', { message: 'Your withdrawal request was declined.' });
        }
    } catch (error) {
        console.error("[Bot] Error processing callback:", error);
        ctx.answerCbQuery("An error occurred.");
    }
});

bot.on('contact', async (ctx) => {
    const contact = ctx.message.contact;
    const chatId = ctx.chat.id;
    const phoneNumber = contact.phone_number.replace(/\D/g, '');
    if (contact.user_id !== ctx.from.id) return ctx.reply('Please share your own contact.');
    try {
        await User.findOneAndUpdate({ phone: phoneNumber }, { $set: { telegramChatId: chatId } }, { upsert: true, new: true, setDefaultsOnInsert: true });
        console.log(`[Bot] Linked phone ${phoneNumber} to Chat ID ${chatId}.`);
        await ctx.reply(`Thank you! Your phone is linked.`);
    } catch (error) {
        console.error('[Bot] Error saving contact:', error);
        await ctx.reply('A server error occurred.');
    }
});

const startServer = async () => {
    await connectDB();
    server.listen(PORT, '0.0.0.0', () => console.log(`[SERVER] Server running on port ${PORT}`));
    bot.launch().then(() => console.log('[BOT] Telegram bot running...'));
};
startServer();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));