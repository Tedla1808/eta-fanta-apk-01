// --- server.js --- (FINAL, CORRECTED PATHS FOR MONOREPO)

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

// ** THIS IS THE CRITICAL PATH FIX **
// Serve static files from the 'public' directory, which is one level up from 'backend'
app.use(express.static(path.join(__dirname, '..', 'public')));
// Serve uploads from the 'uploads' directory, located in the root.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API ROUTES
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/game', require('./routes/gameRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/webauthn', require('./routes/webAuthnRoutes'));

// THE "CATCH-ALL" ROUTE
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// --- (The rest of the file remains exactly the same) ---
const connectDB = async () => { try { await mongoose.connect(process.env.MONGO_URI); console.log('MongoDB Connected...'); } catch (err) { console.error('MongoDB Connection Error:', err.message); process.exit(1); } };
const userSockets = new Map();
io.on('connection', (socket) => {
    socket.on('authenticate', (token) => {
        try { if (!token) return; const decoded = jwt.verify(token, process.env.JWT_SECRET); userSockets.set(decoded.user.id, socket.id); console.log(`[Socket] Authenticated user ${decoded.user.id}`); } catch (error) { console.log('[Socket] Auth failed.'); }
    });
    socket.on('disconnect', () => { for (let [userId, socketId] of userSockets.entries()) { if (socketId === socket.id) { userSockets.delete(userId); console.log(`[Socket] User ${userId} disconnected.`); break; } } });
});
bot.start((ctx) => { ctx.reply('Welcome! Use the button to share your contact.', { reply_markup: { keyboard: [[{ text: 'Share My Phone Number', request_contact: true }]], one_time_keyboard: true, resize_keyboard: true } }); });
bot.on('callback_query', async (ctx) => { try { if (String(ctx.callbackQuery.from.id) !== String(ADMIN_TELEGRAM_ID)) return ctx.answerCbQuery("Not authorized."); const [action, transactionId] = ctx.callbackQuery.data.split('_'); const transaction = await Transaction.findById(transactionId).populate('user'); if (!transaction || transaction.status !== 'Pending') return ctx.answerCbQuery('Already processed.'); const user = transaction.user; const userSocketId = userSockets.get(user._id.toString()); if (action === 'verify-deposit') { transaction.status = 'Completed'; user.balance += transaction.amount; await Promise.all([transaction.save(), user.save()]); await ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n--- ✅ VERIFIED ---`); if (userSocketId) io.to(userSocketId).emit('depositApproved', { message: `Deposit of ${transaction.amount.toFixed(2)} ETB approved!`, newBalance: user.balance }); } else if (action === 'reject-deposit') { transaction.status = 'Failed'; await transaction.save(); await ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n--- ❌ REJECTED ---`); if (userSocketId) io.to(userSocketId).emit('depositRejected', { final: false }); } else if (action === 'approve-withdraw') { if (user.balance < transaction.amount) return ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n--- ⚠️ INSUFFICIENT FUNDS ---`); transaction.status = 'Completed'; user.balance -= transaction.amount; transaction.amount = -transaction.amount; await Promise.all([transaction.save(), user.save()]); await ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n--- ✅ WITHDRAWAL APPROVED ---`); if(userSocketId) io.to(userSocketId).emit('withdrawalApproved', { message: `Your withdrawal of ${Math.abs(transaction.amount).toFixed(2)} ETB was approved.`, newBalance: user.balance }); } else if (action === 'decline-withdraw') { transaction.status = 'Failed'; await transaction.save(); await ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n--- ❌ WITHDRAWAL DECLINED ---`); if(userSocketId) io.to(userSocketId).emit('withdrawalDeclined', { message: 'Your withdrawal request was declined.' }); } } catch (error) { console.error("[Bot] Error processing callback:", error); ctx.answerCbQuery("An error occurred."); } });
bot.on('contact', async (ctx) => { const contact = ctx.message.contact; const chatId = ctx.chat.id; const phoneNumber = contact.phone_number.replace(/\D/g, ''); if (contact.user_id !== ctx.from.id) return ctx.reply('Please share your own contact.'); try { await User.findOneAndUpdate({ phone: phoneNumber }, { $set: { telegramChatId: chatId } }, { upsert: true, new: true, setDefaultsOnInsert: true }); console.log(`[Bot] Linked phone ${phoneNumber} to Chat ID ${chatId}.`); await ctx.reply(`Thank you! Your phone is linked.`); } catch (error) { console.error('[Bot] Error saving contact:', error); await ctx.reply('A server error occurred.'); } });
const startServer = async () => {
    await connectDB();
    server.listen(PORT, '0.0.0.0', () => console.log(`[SERVER] Server running on port ${PORT}`));
    bot.launch().then(() => console.log('[BOT] Telegram bot running...'));
};
startServer();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));