import { apiUrl } from '../config';
import { apiFetch } from './http';

const jsonHeaders = { 'Content-Type': 'application/json' };

const getPushKey = async (): Promise<string | null> => {
    try {
        const response = await apiFetch(`${apiUrl()}/api/push/key`);
        const result = await response.json();
        return result?.data?.publicKey || null;
    } catch {
        return null;
    }
};

const hasPushSubscription = async (endpoint: string): Promise<boolean> => {
    try {
        const response = await apiFetch(
            `${apiUrl()}/api/push/subscription?endpoint=${encodeURIComponent(endpoint)}`,
        );
        const result = await response.json();
        return result?.data?.subscribed === true;
    } catch {
        return false;
    }
};

const savePushSubscription = async (subscription: PushSubscriptionJSON) => {
    const response = await apiFetch(`${apiUrl()}/api/push/subscription`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(subscription),
    });
    return response.ok;
};

const deletePushSubscription = async (endpoint: string) => {
    try {
        const response = await apiFetch(`${apiUrl()}/api/push/subscription`, {
            method: 'DELETE',
            headers: jsonHeaders,
            body: JSON.stringify({ endpoint }),
        });
        return response.ok;
    } catch {
        return false;
    }
};

export {
    getPushKey,
    hasPushSubscription,
    savePushSubscription,
    deletePushSubscription,
};
