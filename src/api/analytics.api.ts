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

const getDashboard = async (range: any = 14) => {
    const params = new URLSearchParams({ days: String(range) });
    const response = await apiFetch(
        `${apiUrl()}/api/analytics/dashboard?${params.toString()}`,
        {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        },
    );

    return await response.json();
};

export { trackVisit, getDashboard };
