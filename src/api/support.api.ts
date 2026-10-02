import { apiUrl } from '../config';
import { apiFetch } from './http';

const API = () => `${apiUrl()}/api/support`;

const withQuery = (query: any = {}) => {
    const params = new URLSearchParams();

    Object.entries(query).forEach(([key, value]: any) => {
        if (value !== undefined && value !== null && value !== '') {
            params.append(key, value);
        }
    });

    const search = params.toString();
    return search ? `?${search}` : '';
};

const jsonHeaders = {
    'Content-Type': 'application/json',
};

const createSupportRequest = async (body: any) => {
    const response = await apiFetch(API(), {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(body),
    });

    return await response.json();
};

const getMySupportRequests = async (query: any = {}) => {
    const response = await apiFetch(`${API()}/mine${withQuery(query)}`, {
        method: 'GET',
        headers: jsonHeaders,
    });

    return await response.json();
};

const getSupportRequests = async (query: any = {}) => {
    const response = await apiFetch(`${API()}${withQuery(query)}`, {
        method: 'GET',
        headers: jsonHeaders,
    });

    return await response.json();
};

const getSupportRequest = async (id: any) => {
    const response = await apiFetch(`${API()}/${id}`, {
        method: 'GET',
        headers: jsonHeaders,
    });

    return await response.json();
};

const getPublicSupportRequest = async (key: any) => {
    const response = await apiFetch(`${API()}/public/${key}`, {
        method: 'GET',
        headers: jsonHeaders,
    });

    return await response.json();
};

const replySupportRequest = async (id: any, text: any) => {
    const response = await apiFetch(`${API()}/${id}/replies`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ replyText: text }),
    });

    return await response.json();
};

const replyPublicSupportRequest = async (key: any, text: any) => {
    const response = await apiFetch(`${API()}/public/${key}/replies`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ replyText: text }),
    });

    return await response.json();
};

const updateSupportRequestStatus = async (id: any, status: any) => {
    const response = await apiFetch(`${API()}/${id}/status`, {
        method: 'PATCH',
        headers: jsonHeaders,
        body: JSON.stringify({ supportStatus: status }),
    });

    return await response.json();
};

export {
    createSupportRequest,
    getSupportRequests,
    getMySupportRequests,
    getSupportRequest,
    getPublicSupportRequest,
    replySupportRequest,
    replyPublicSupportRequest,
    updateSupportRequestStatus,
};
