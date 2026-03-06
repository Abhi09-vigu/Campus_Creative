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

const adminCreateMarksRoundSchema = z.object({
    name: z.string().trim().min(1).max(80)
});

const marksCriteriaSchema = z.object({
    clarity: z.coerce.number().min(0).max(10),
    relevance: z.coerce.number().min(0).max(10),
    technical: z.coerce.number().min(0).max(10),
    prototype: z.coerce.number().min(0).max(10)
});

const adminUpdateMarksSchema = z
    .object({
        roundId: z.string().trim().min(1).max(128),
        // Accept either the new 0–10 total or a legacy 0–40 total.
        // Server will normalize to 0–10 when persisting.
        total: z.coerce.number().min(0).max(40).optional(),
        criteria: marksCriteriaSchema.optional()
    })
    .refine((v) => v.criteria != null || v.total != null, {
        message: 'Provide criteria or total'
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
    adminCreateMarksRoundSchema,
    adminUpdateMarksSchema,
    userLoginSchema
};
