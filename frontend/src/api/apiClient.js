import axios from 'axios';
import { getAssignedApiOrigin } from './roundRobinOrigin';

function normalizeOrigin(origin) {
    return String(origin || '').trim().replace(/\/+$/, '');
}

const engineOrigin = normalizeOrigin(import.meta.env.VITE_ENGINE_ORIGIN);
const baseURL = engineOrigin || getAssignedApiOrigin();

export const api = axios.create({
    baseURL,
    // Avoid browser caches returning 304s for API responses.
    headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache'
    }
});

api.interceptors.request.use((config) => {
    const nextConfig = { ...config };

    // Cache-bust GET requests to prevent 304 responses with empty bodies.
    const method = String(nextConfig.method || 'get').toLowerCase();
    if (method === 'get') {
        nextConfig.params = {
            ...(nextConfig.params || {}),
            __ts: Date.now()
        };
    }

    // Attach auth/identity headers when not explicitly provided.
    const url = String(nextConfig.url || '');
    const isAdminRoute = url.startsWith('/api/admin');

    const userToken = localStorage.getItem('userToken');
    const adminToken = localStorage.getItem('adminToken');
    const userDataStr = localStorage.getItem('userData');
    const userData = userDataStr ? JSON.parse(userDataStr) : null;

    nextConfig.headers = nextConfig.headers || {};

    if (!nextConfig.headers.Authorization && !nextConfig.headers.authorization) {
        const token = isAdminRoute ? adminToken : userToken;
        if (token) {
            nextConfig.headers.Authorization = `Bearer ${token}`;
        }
    }

    if (!isAdminRoute) {
        if (!nextConfig.headers['x-user-id'] && userToken) {
            nextConfig.headers['x-user-id'] = userData?.id || userToken;
        }
        if (!nextConfig.headers['x-user-name']) {
            nextConfig.headers['x-user-name'] = userData?.name || 'Team Agent';
        }
        if (!nextConfig.headers['x-user-email']) {
            nextConfig.headers['x-user-email'] = userData?.email || '';
        }
    }

    return nextConfig;
});

export function getApiBaseURL() {
    return baseURL;
}
