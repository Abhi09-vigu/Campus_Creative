const express = require('express');
const router = express.Router();
const { requireUser } = require('../middleware/auth');
const Problem = require('../models/Problem');
const Settings = require('../models/Settings');
const Selection = require('../models/Selection');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs/promises');
const { validateBody, selectProblemSchema, userLoginSchema } = require('../utils/validate');

const selectLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false
});

// POST /api/user/login
router.post('/user/login', validateBody(userLoginSchema), async (req, res, next) => {
    try {
        const { teamName } = req.body;
        const normalized = teamName.trim().toLowerCase();

        // Reuse the same users list the frontend uses.
        const usersPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'data', 'users.json');
        const raw = await fs.readFile(usersPath, 'utf8');
        const users = JSON.parse(raw);

        const user = Array.isArray(users)
            ? users.find(u => (u?.name || '').trim().toLowerCase() === normalized)
            : null;

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid team name' });
        }

        // Keep it simple: token is the user id (frontend already uses this pattern).
        res.json({
            success: true,
            token: String(user.id),
            user: {
                id: String(user.id),
                name: String(user.name),
                email: user.email ? String(user.email) : ''
            }
        });
    } catch (err) {
        return next(err);
    }
});

// GET /api/problems
// Protected routes below
router.use(requireUser);

async function isViewModeOn() {
    const settings = await Settings.findOneAndUpdate(
        { key: 'global' },
        { $setOnInsert: { key: 'global', viewMode: false } },
        { new: true, upsert: true }
    ).lean();

    return Boolean(settings.viewMode);
}

const MAX_TEAMS_PER_PROBLEM = 5;

// GET /api/problems
router.get('/problems', async (req, res) => {
    if (!(await isViewModeOn())) {
        return res.json([]);
    }

    const mySelection = await Selection.findOne({ userId: req.user.id }).lean();
    const myProblemId = mySelection?.problemId;

    const baseFilter = {
        isActive: true,
        $or: [{ selectedCount: { $lt: MAX_TEAMS_PER_PROBLEM } }, { selectedCount: { $exists: false } }]
    };

    const filter = myProblemId
        ? {
              $or: [baseFilter, { id: myProblemId }]
          }
        : baseFilter;

    const problems = await Problem.find(filter).sort({ createdAt: -1 }).lean();
    res.json(problems);
});

// GET /api/my-selection
router.get('/my-selection', async (req, res) => {
    const selection = await Selection.findOne({ userId: req.user.id }).lean();
    res.json({ selection });
});

// POST /api/select-problem
router.post('/select-problem', selectLimiter, validateBody(selectProblemSchema), async (req, res) => {
    if (!(await isViewModeOn())) {
        return res.status(400).json({ message: 'Admin has not enabled View Mode yet.' });
    }

    // User ID comes from the middleware (req.user) OR from the body
    const { problemId } = req.body;
    const userId = req.user.id; // from requireUser middleware

    const existingSelection = await Selection.findOne({ userId }).lean();
    if (existingSelection) {
        return res.status(400).json({ message: 'You have already selected a problem' });
    }

    // Reserve a slot for this problem (atomic) to enforce per-problem cap.
    const reservedProblem = await Problem.findOneAndUpdate(
        {
            id: problemId,
            isActive: true,
            $or: [{ selectedCount: { $lt: MAX_TEAMS_PER_PROBLEM } }, { selectedCount: { $exists: false } }]
        },
        { $inc: { selectedCount: 1 } },
        { new: true }
    ).lean();

    if (!reservedProblem) {
        const existingProblem = await Problem.findOne({ id: problemId }).lean();
        if (!existingProblem) {
            return res.status(404).json({ message: 'Problem not found' });
        }
        if (!existingProblem.isActive) {
            return res.status(400).json({ message: 'Problem is not available right now' });
        }
        return res.status(400).json({ message: `Team limit reached for this problem (max ${MAX_TEAMS_PER_PROBLEM}).` });
    }

    // Save selection
    const newSelection = {
        userId,
        teamName: req.user.name,
        email: req.user.email || '',
        problemId,
        problemTitle: reservedProblem.title,
        timestamp: new Date()
    };

    try {
        const created = await Selection.create(newSelection);
        res.status(201).json({ message: 'Problem selected successfully', selection: created.toObject() });
    } catch (err) {
        // Roll back reserved slot on failure
        await Problem.updateOne({ id: problemId }, { $inc: { selectedCount: -1 } });

        // Unique index on userId enforces one selection per team
        if (err?.code === 11000) {
            return res.status(400).json({ message: 'You have already selected a problem' });
        }
        throw err;
    }
});

module.exports = router;
