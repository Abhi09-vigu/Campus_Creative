// Users are handled in the frontend (users.json shipped with the UI).
// Backend only enforces presence of an auth token and expects user identity headers.

// Middleware to protect admin routes
const requireAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1] || req.headers.authorization;
    if (!token || token !== process.env.ADMIN_SECRET) {
        return res.status(401).json({ message: 'Unauthorized. Invalid admin token.' });
    }
    next();
};

// Middleware to protect user routes (simple check for userId for simplicity)
const requireUser = async (req, res, next) => {
    // To keep it simple, we expect userId in headers or body if needed.
    // Actually, standard is using a token. Let's assume the frontend sends the user ID as A token, or something similar.
    const rawAuth = req.headers.authorization;
    const authToken = rawAuth ? rawAuth.split(' ')[1] || rawAuth : '';
    const userIdHeader = req.headers['x-user-id'];
    const token = authToken || (userIdHeader == null ? '' : String(userIdHeader));

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized. User not logged in.' });
    }

    const userId = userIdHeader || token;
    const userName = req.headers['x-user-name'];
    const userEmail = req.headers['x-user-email'];

    if (!userId || !userName) {
        return res.status(401).json({ message: 'Unauthorized. Missing user identity headers.' });
    }

    req.user = {
        id: String(userId),
        name: String(userName),
        email: userEmail == null ? '' : String(userEmail)
    };
    next();
};

module.exports = { requireAdmin, requireUser };
