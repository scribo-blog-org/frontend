import { apiUrl } from '../config';
import { apiFetch, getAccessToken } from './http';

const getProfile = async () => {
    if (!getAccessToken()) {
        return {
            status: false,
            unauthorized: true,
            message: 'No token found',
            data: null,
        };
    }

    try {
        const response = await apiFetch(`${apiUrl()}/api/profile`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        const result = await response.json();

        if (response.status === 401) {
            return {
                status: false,
                unauthorized: true,
                message: result?.message || 'Unauthorized',
                data: null,
            };
        }

        return result;
    } catch (error: any) {
        console.error('Error fetching profile:', error);

        return {
            status: false,
            unauthorized: false,
            message: 'Error fetching profile',
            data: null,
        };
    }
};

const editProfile = async (data: any) => {
    if (!getAccessToken()) {
        return {
            status: false,
            message: 'No token found',
            data: null,
        };
    }

    const response = await apiFetch(`${apiUrl()}/api/profile/`, {
        method: 'PATCH',
        body: data,
    });

    const code = response.status;
    const result = await response.json();

    return {
        statusCode: code,
        ...result,
    };
};

const changePassword = async ({
    currentPassword,
    newPassword,
    newPasswordConfirm,
}: any) => {
    if (!getAccessToken()) {
        return {
            status: false,
            message: 'No token found',
            data: null,
        };
    }

    const response = await apiFetch(`${apiUrl()}/api/profile/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            currentPassword,
            newPassword,
            newPasswordConfirm,
        }),
    });

    const code = response.status;
    const result = await response.json();

    return {
        statusCode: code,
        ...result,
    };
};

export { getProfile, editProfile, changePassword };
