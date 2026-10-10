import { apiUrl } from '../config';
import { apiFetch } from './http';

const getAllLogs = async (query: any = {}) => {
    const params = new URLSearchParams();

    Object.entries(query).forEach(([key, value]: any) => {
        if (value !== undefined && value !== null && value !== '') {
            params.append(key, value);
        }
    });

    const search = params.toString();
    const response = await apiFetch(
        `${apiUrl()}/api/logs${search ? `?${search}` : ''}`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        },
    );

    return await response.json();
};

export { getAllLogs };
