require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');

const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const { connectMongo } = require('./db/mongo');
const Problem = require('./models/Problem');
const Selection = require('./models/Selection');

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);
// Avoid conditional GET 304s for API responses (frontend relies on response bodies).
app.set('etag', false);

app.use(
    pinoHttp({
        level: process.env.LOG_LEVEL || 'info',
        redact: ['req.headers.authorization']
    })
);

app.use(
    cors({
        origin: process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
            : true,
        credentials: true
    })
);

app.use(
    helmet({
        crossOriginResourcePolicy: false
    })
);

app.use(compression());

app.use(express.json({ limit: '50kb' }));

app.use(
    rateLimit({
        windowMs: 60 * 1000,
        limit: 200,
        standardHeaders: 'draft-7',
        legacyHeaders: false
    })
);

// Prevent browsers/CDNs from caching API responses.
app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    next();
});

// Main Routes
app.use('/api/admin', adminRoutes);
app.use('/api', userRoutes); // Putting user routes under /api for /api/user/login, /api/problems, /api/select-problem

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Centralized error handler
app.use((err, req, res, next) => {
    req.log?.error({ err }, 'Unhandled error');
    res.status(500).json({ message: 'Internal server error' });
});

async function start() {
    try {
        await connectMongo();
        console.log('MongoDB connected');

        // Keep derived counts consistent (e.g., after restarts or older data)
        const counts = await Selection.aggregate([
            { $group: { _id: '$problemId', count: { $sum: 1 } } }
        ]);

        await Problem.updateMany({}, { $set: { selectedCount: 0 } });

        if (counts.length > 0) {
            await Problem.bulkWrite(
                counts.map(c => ({
                    updateOne: {
                        filter: { id: c._id },
                        update: { $set: { selectedCount: c.count } }
                    }
                })),
                { ordered: false }
            );
        }

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    }
}

start();
