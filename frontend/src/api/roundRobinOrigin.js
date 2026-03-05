const DEFAULT_ORIGINS = [
    'https://campus-creative.onrender.com'
];

function normalizeOrigin(origin) {
    return String(origin || '').trim().replace(/\/+$/, '');
}

function getConfiguredOrigins() {
    const raw = import.meta.env.VITE_API_ORIGINS;
    if (!raw) return DEFAULT_ORIGINS;

    const parsed = String(raw)
        .split(',')
        .map(normalizeOrigin)
        .filter(Boolean);

    return parsed.length > 0 ? parsed : DEFAULT_ORIGINS;
}

/**
 * Assigns one API origin per browser session.
 *
 * This project now defaults to a single deployed server. If multiple origins are
 * provided via `VITE_API_ORIGINS`, we still pin one origin per session for
 * consistency.
 */
export function getAssignedApiOrigin() {
    const origins = getConfiguredOrigins().map(normalizeOrigin).filter(Boolean);
    if (origins.length === 0) return '';

    if (origins.length === 1) return origins[0];

    const SESSION_KEY = 'cc_api_origin';
    const RR_KEY = 'cc_api_rr_idx';

    try {
        const existing = normalizeOrigin(sessionStorage.getItem(SESSION_KEY));
        if (existing && origins.includes(existing)) return existing;

        const rawIdx = localStorage.getItem(RR_KEY);
        const idx = Number.parseInt(rawIdx ?? '0', 10);
        const safeIdx = Number.isFinite(idx) && idx >= 0 ? idx : 0;

        const origin = origins[safeIdx % origins.length];

        sessionStorage.setItem(SESSION_KEY, origin);
        localStorage.setItem(RR_KEY, String((safeIdx + 1) % 1000000));

        return origin;
    } catch {
        // If storage is blocked, fall back to the first origin.
        return origins[0];
    }
}

export function getAllApiOrigins() {
    return getConfiguredOrigins().map(normalizeOrigin).filter(Boolean);
}
