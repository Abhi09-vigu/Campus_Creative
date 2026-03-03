const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const Problem = require('../models/Problem');
const Settings = require('../models/Settings');
const Selection = require('../models/Selection');
const rateLimit = require('express-rate-limit');
const { validateBody, adminAddProblemSchema, adminLoginSchema, adminViewModeSchema } = require('../utils/validate');

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

async function getGlobalSettings() {
    return Settings.findOneAndUpdate(
        { key: 'global' },
        { $setOnInsert: { key: 'global', viewMode: false } },
        { new: true, upsert: true }
    ).lean();
}

// GET /api/admin/settings
router.get('/settings', async (req, res) => {
    const settings = await getGlobalSettings();
    res.json({ viewMode: Boolean(settings.viewMode) });
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
    res.json(selections);
});

module.exports = router;
