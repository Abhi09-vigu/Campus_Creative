import axios from 'axios';
import { getAssignedApiOrigin } from './roundRobinOrigin';

const baseURL = getAssignedApiOrigin();

export const api = axios.create({
    baseURL
});

export function getApiBaseURL() {
    return baseURL;
}
