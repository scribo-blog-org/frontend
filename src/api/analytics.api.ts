import { apiUrl } from '../config';
import { apiFetch } from './http';

const trackVisit = async (path: any) => {
    try {
        await apiFetch(`${apiUrl()}/api/analytics/visit`, {
            method: 'POST',
            reportOutage: false,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pagePath: path,
                pageReferrer:
                    typeof document === 'undefined' ? '' : document.referrer,
            }),
        });
    } catch {}
};

const getDashboard = async ({
    period = '7',
    from,
    to,
}: {
    period?: string;
    from?: string;
    to?: string;
} = {}) => {
    const params = new URLSearchParams({ period });
    if (period === 'custom' && from && to) {
        params.set('from', from);
        params.set('to', to);
    }
    const response = await apiFetch(
        `${apiUrl()}/api/analytics/dashboard?${params.toString()}`,
        {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        },
    );

    return await response.json();
};

const getAppInfo = async () => {
    const response = await apiFetch(`${apiUrl()}/api/analytics/app`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    return await response.json();
};

export { trackVisit, getDashboard, getAppInfo };
