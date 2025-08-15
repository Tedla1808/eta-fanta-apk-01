// --- server.js --- (FINAL, CORRECTED CORS FOR RENDER SERVICE)

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

// ** THIS IS THE CRITICAL CORS FIX **
const allowedOrigins = [
    'https://www.etafanta.com',
    'https://etafanta.com',
    'https://eta-fanta-apk-01.onrender.com', // <-- ADD THIS LINE
    'http://localhost',                     // For Capacitor mobile app
    'http://127.0.0.1:5500', 
    'http://localhost:5500'
];
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
// ** END OF FIX **

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'www')));


// API ROUTES
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/game', require('./routes/gameRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/webauthn', require('./routes/webAuthnRoutes'));

// THE "CATCH-ALL" ROUTE
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'www', 'index.html'));
});

// --- (The rest of the file is unchanged) ---
const connectDB = async () => { try { await mongoose.connect(process.env.MONGO_URI); console.log('MongoDB Connected...'); } catch (err) { console.error('MongoDB Connection Error:', err.message); process.exit(1); } };
const userSockets = new Map();
io.on('connection', (socket) => { /* ... */ });
bot.start((ctx) => { /* ... */ });
bot.on('callback_query', async (ctx) => { /* ... */ });
bot.on('contact', async (ctx) => { /* ... */ });
const startServer = async () => { await connectDB(); server.listen(PORT, '0.0.0.0', () => console.log(`[SERVER] Server running on port ${PORT}`)); bot.launch().then(() => console.log('[BOT] Telegram bot running...')); };
startServer();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));