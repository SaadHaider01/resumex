/**
 * Database Configuration
 */

const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
    if (isConnected) {
        console.log('Using existing database connection');
        return;
    }

    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/resumex';

        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        isConnected = true;
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        throw error;
    }
}

module.exports = { connectDB };
