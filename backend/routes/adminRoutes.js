const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const Problem = require('../models/Problem');
const Settings = require('../models/Settings');
const Selection = require('../models/Selection');
const Marks = require('../models/Marks');
const rateLimit = require('express-rate-limit');
const { validateBody, adminAddProblemSchema, adminLoginSchema, adminViewModeSchema, adminUpdateMarksSchema, adminCreateMarksRoundSchema } = require('../utils/validate');

const adminAuthLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false
});

// POST /api/admin/login
router.post('/login', adminAuthLimiter, validateBody(adminLoginSchema), (req, res) => {
    const { secretKey } = req.body;

    if (secretKey === process.env.ADMIN_SECRET) {
        // Generate a simple token (we'll just use the secret itself for simplicity here)
        res.json({ success: true, token: process.env.ADMIN_SECRET, message: 'Admin logged in successfully' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Admin Secret Key' });
    }
});

// Protect all other admin routes
router.use(requireAdmin);

function clampInt(value, min, max) {
    const n = Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0;
    return Math.max(min, Math.min(max, n));
}

function computeRoundTotalOutOf10(criteria, total) {
    // Preferred: derive from criteria (each 0..10) => average out of 10.
    if (criteria && typeof criteria === 'object') {
        const sum =
            clampInt(criteria.clarity, 0, 10) +
            clampInt(criteria.relevance, 0, 10) +
            clampInt(criteria.technical, 0, 10) +
            clampInt(criteria.prototype, 0, 10);
        return clampInt(Math.round(sum / 4), 0, 10);
    }

    // Fallback: accept a legacy 0..40 total and normalize to 0..10.
    if (typeof total === 'number') {
        const rounded = Math.round(total);
        if (rounded > 10) return clampInt(Math.round(rounded / 4), 0, 10);
        return clampInt(rounded, 0, 10);
    }

    return 0;
}

async function getGlobalSettings() {
    return Settings.findOneAndUpdate(
        { key: 'global' },
        { $setOnInsert: { key: 'global', viewMode: false, marksRounds: [], activeMarksRoundId: '' } },
        { new: true, upsert: true }
    ).lean();
}

async function ensureMarksSettings() {
    const settings = await Settings.findOneAndUpdate(
        { key: 'global' },
        { $setOnInsert: { key: 'global', viewMode: false, marksRounds: [], activeMarksRoundId: '' } },
        { new: true, upsert: true }
    );

    const rounds = Array.isArray(settings.marksRounds) ? settings.marksRounds : [];
    const activeRoundId = String(settings.activeMarksRoundId || '').trim();
    const activeStillExists = rounds.some((r) => String(r?.id || '').trim() === activeRoundId);

    if (!activeStillExists) {
        settings.activeMarksRoundId = rounds[0]?.id || '';
        await settings.save();
    }

    return settings.toObject();
}

async function computeTotalMarksForUser(userId) {
    const rows = await Marks.aggregate([
        { $match: { userId: String(userId) } },
        { $group: { _id: '$userId', sum: { $sum: '$total' } } }
    ]);
    return rows?.[0]?.sum ?? 0;
}

// GET /api/admin/settings
router.get('/settings', async (req, res) => {
    const settings = await getGlobalSettings();
    res.json({ viewMode: Boolean(settings.viewMode) });
});

// GET /api/admin/marks/rounds
router.get('/marks/rounds', async (req, res) => {
    try {
        const settings = await ensureMarksSettings();
        res.json({ rounds: settings.marksRounds || [], activeRoundId: settings.activeMarksRoundId || '' });
    } catch (err) {
        req.log?.error({ err }, 'Failed to load marks rounds');
        res.status(500).json({ message: 'Failed to load marks rounds' });
    }
});

// POST /api/admin/marks/rounds
router.post('/marks/rounds', validateBody(adminCreateMarksRoundSchema), async (req, res) => {
    try {
        const settings = await ensureMarksSettings();
        const existing = Array.isArray(settings.marksRounds) ? settings.marksRounds : [];
        const { name } = req.body;

        const nextIndex = existing.length + 1;
        const id = `round_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 6)}`;
        const createdAt = new Date();
        const roundName = String(name || '').trim() || `Round ${nextIndex}`;

        const updated = await Settings.findOneAndUpdate(
            { key: 'global' },
            {
                $push: { marksRounds: { id, name: roundName, createdAt } },
                $set: { activeMarksRoundId: id }
            },
            { new: true, upsert: true }
        ).lean();

        // Initialize this round in the separate marks collection for all existing selections.
        const selectionUserIds = await Selection.distinct('userId', {});
        const ops = (selectionUserIds || []).map((uid) => ({
            updateOne: {
                filter: { userId: String(uid), roundId: String(id) },
                update: {
                    $setOnInsert: {
                        userId: String(uid),
                        roundId: String(id),
                        roundName,
                        total: 0,
                        criteria: { clarity: 0, relevance: 0, technical: 0, prototype: 0 },
                        updatedAt: new Date()
                    }
                },
                upsert: true
            }
        }));
        if (ops.length > 0) {
            await Marks.bulkWrite(ops, { ordered: false });
        }

        res.status(201).json({
            message: 'Round created',
            round: { id, name: roundName, createdAt },
            rounds: updated?.marksRounds || [],
            activeRoundId: updated?.activeMarksRoundId || id
        });
    } catch (err) {
        req.log?.error({ err }, 'Failed to create marks round');
        res.status(500).json({ message: 'Failed to create marks round' });
    }
});

// PATCH /api/admin/settings/view-mode
router.patch('/settings/view-mode', validateBody(adminViewModeSchema), async (req, res) => {
    const { viewMode } = req.body;
    const updated = await Settings.findOneAndUpdate(
        { key: 'global' },
        { $set: { viewMode: Boolean(viewMode) } },
        { new: true, upsert: true }
    ).lean();

    res.json({ message: 'View mode updated', viewMode: Boolean(updated.viewMode) });
});

// POST /api/admin/problems
router.post('/problems', validateBody(adminAddProblemSchema), async (req, res) => {
    const { title, description, difficulty, isActive } = req.body;

    const id = `p${Date.now().toString()}${Math.random().toString(16).slice(2, 8)}`;
    const created = await Problem.create({
        id,
        title,
        description,
        difficulty,
        isActive: isActive !== false,
        isLocked: false,
        selectedCount: 0
    });

    res.status(201).json({ message: 'Problem added successfully', problem: created.toObject() });
});

// PATCH /api/admin/problems/:id/toggle
router.patch('/problems/:id/toggle', async (req, res) => {
    const { id } = req.params;
    const existing = await Problem.findOne({ id }).lean();
    if (!existing) {
        return res.status(404).json({ message: 'Problem not found' });
    }

    const updated = await Problem.findOneAndUpdate(
        { id },
        { $set: { isActive: !existing.isActive } },
        { new: true }
    ).lean();

    res.json({ message: 'Problem visibility toggled', problem: updated });
});

// GET /api/admin/problems
router.get('/problems', async (req, res) => {
    const problems = await Problem.find({}).sort({ createdAt: -1 }).lean();
    res.json(problems);
});

// GET /api/admin/selections
router.get('/selections', async (req, res) => {
    const selections = await Selection.find({}).sort({ timestamp: -1 }).lean();

    const userIds = selections.map((s) => String(s.userId)).filter(Boolean);
    const marksRows = userIds.length
        ? await Marks.find({ userId: { $in: userIds } })
            .select({ userId: 1, roundId: 1, roundName: 1, total: 1, criteria: 1, updatedAt: 1 })
            .lean()
        : [];

    const byUser = new Map();
    for (const row of marksRows) {
        const uid = String(row.userId);
        if (!byUser.has(uid)) byUser.set(uid, {});
        byUser.get(uid)[String(row.roundId)] = {
            total: row.total,
            criteria: row.criteria,
            roundName: row.roundName,
            updatedAt: row.updatedAt
        };
    }

    const hydrated = selections.map((s) => ({
        ...s,
        marksByRound: byUser.get(String(s.userId)) || {}
    }));

    res.json(hydrated);
});

// PATCH /api/admin/selections/:userId/marks
router.patch('/selections/:userId/marks', validateBody(adminUpdateMarksSchema), async (req, res) => {
    try {
        const { userId } = req.params;
        const { roundId, total, criteria } = req.body;

        const selection = await Selection.findOne({ userId: String(userId) }).lean();
        if (!selection) return res.status(404).json({ message: 'Selection not found' });

        const settings = await ensureMarksSettings();
        const rounds = Array.isArray(settings.marksRounds) ? settings.marksRounds : [];
        const roundMeta = rounds.find((r) => String(r?.id || '') === String(roundId));
        const roundName = String(roundMeta?.name || '').trim() || 'Round';

        const safeCriteria = criteria || { clarity: 0, relevance: 0, technical: 0, prototype: 0 };
        const normalizedTotal = computeRoundTotalOutOf10(safeCriteria, total);
        const updatedAt = new Date();

        await Marks.findOneAndUpdate(
            { userId: String(userId), roundId: String(roundId) },
            {
                $set: {
                    roundName,
                    total: normalizedTotal,
                    criteria: safeCriteria,
                    updatedAt
                }
            },
            { new: true, upsert: true }
        ).lean();

        const totalMarks = await computeTotalMarksForUser(String(userId));
        const updatedSelection = await Selection.findOneAndUpdate(
            { userId: String(userId) },
            { $set: { totalMarks, marks: totalMarks } },
            { new: true }
        ).lean();

        const userMarks = await Marks.find({ userId: String(userId) })
            .select({ roundId: 1, roundName: 1, total: 1, criteria: 1, updatedAt: 1 })
            .lean();
        const marksByRound = {};
        for (const row of userMarks) {
            marksByRound[String(row.roundId)] = {
                total: row.total,
                criteria: row.criteria,
                roundName: row.roundName,
                updatedAt: row.updatedAt
            };
        }

        res.json({ message: 'Marks updated', selection: { ...updatedSelection, marksByRound } });
    } catch (err) {
        req.log?.error({ err }, 'Failed to update marks');
        res.status(500).json({ message: 'Failed to update marks' });
    }
});

module.exports = router;
