const mongoose = require('mongoose');

async function connectMongo() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('Missing MONGODB_URI in backend/.env');
    }

    mongoose.set('strictQuery', true);

    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000
    });

    return mongoose.connection;
}

module.exports = { connectMongo };
