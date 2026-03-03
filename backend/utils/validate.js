const { z } = require('zod');

function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                message: 'Invalid request body',
                issues: result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
            });
        }
        req.body = result.data;
        next();
    };
}

const adminAddProblemSchema = z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(5000),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']),
    isActive: z.boolean().optional()
});

const selectProblemSchema = z.object({
    problemId: z.string().trim().min(1).max(64)
});

const adminLoginSchema = z.object({
    secretKey: z.string().min(1).max(200)
});

const adminViewModeSchema = z.object({
    viewMode: z.boolean()
});

const userLoginSchema = z.object({
    teamName: z.string().trim().min(1).max(200)
});

module.exports = {
    validateBody,
    adminAddProblemSchema,
    selectProblemSchema,
    adminLoginSchema,
    adminViewModeSchema,
    userLoginSchema
};
