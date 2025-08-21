const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Game = require('./models/game');
const Bet = require('./models/bet');

const MIGRATION_MAP = {
    'slot6': 'slot7',
    'slot5': 'slot6',
    'slot4': 'slot5',
    'slot3': 'slot4',
    'slot2': 'slot3',
    'slot1': 'slot2',
};

const runMigration = async () => {
    console.log('Connecting to the database...');
    try {
        // ** THIS IS THE FIX **
        // Added serverSelectionTimeoutMS to give the connection more time.
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 30000 // Increase timeout to 30 seconds
        });
        
        console.log('MongoDB Connected. Starting migration...');

        const oldSlotIds = ['slot6', 'slot5', 'slot4', 'slot3', 'slot2', 'slot1'];

        for (const oldId of oldSlotIds) {
            const newId = MIGRATION_MAP[oldId];
            console.log(`\nMigrating ${oldId} to ${newId}...`);

            const gameUpdateResult = await Game.updateMany(
                { slotId: oldId },
                { $set: { slotId: newId } }
            );
            console.log(`- Updated ${gameUpdateResult.modifiedCount} documents in 'games' collection.`);

            const betUpdateResult = await Bet.updateMany(
                { slotId: oldId },
                { $set: { slotId: newId } }
            );
            console.log(`- Updated ${betUpdateResult.modifiedCount} documents in 'bets' collection.`);
        }

        console.log('\nMigration completed successfully!');
    } catch (err) {
        console.error('\nAn error occurred during migration:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Database connection closed.');
    }
};

runMigration();