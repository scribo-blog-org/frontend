import { apiUrl } from '../config';
import { apiFetch, setAccessToken } from './http';

const verificationGoogle = async (token: any) => {
    try {
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ googleToken: token }),
        };

        const response = await apiFetch(
            `${apiUrl()}/api/auth/verification/google`,
            requestOptions,
        );
        const result = await response.json();
        const code = response.status;

        return {
            statusCode: code,
            ...result,
        };
    } catch (err) {
        console.log(err);
    }
};

const applyAuthResult = (result: any) => {
    if (result?.status && result?.data?.accessToken) {
        setAccessToken(result.data.accessToken);
    }
    return result;
};

const loginGoogle = async (token: any) => {
    try {
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ googleToken: token }),
        };

        const response = await apiFetch(
            `${apiUrl()}/api/auth/login/google`,
            requestOptions,
        );
        const code = response.status;
        const result = await response.json();

        return applyAuthResult({
            statusCode: code,
            ...result,
        });
    } catch (err) {
        console.log(err);
    }
};

const loginUsername = async (username: any, password: any) => {
    try {
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userName: username,
                userPassword: password,
            }),
        };

        const response = await apiFetch(
            `${apiUrl()}/api/auth/login/username`,
            requestOptions,
        );
        const code = response.status;
        const result = await response.json();

        return applyAuthResult({
            statusCode: code,
            ...result,
        });
    } catch (e) {
        console.log(e);
    }
};

const emailRegister = async (data: any) => {
    const response = await apiFetch(`${apiUrl()}/api/auth/register/email`, {
        method: 'POST',
        body: data,
    });

    const code = response.status;
    const result = await response.json();

    return {
        statusCode: code,
        ...result,
    };
};

const googleRegister = async (data: any) => {
    const response = await apiFetch(`${apiUrl()}/api/auth/register/google`, {
        method: 'POST',
        body: data,
    });

    const code = response.status;
    const result = await response.json();

    return {
        statusCode: code,
        ...result,
    };
};

const veriticationEmailConfirm = async (email: any, fullCode: any) => {
    try {
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userEmail: email,
                emailCode: fullCode,
            }),
        };

        const response = await apiFetch(
            `${apiUrl()}/api/auth/verification/email/confirm`,
            requestOptions,
        );

        const code = response.status;
        const result = await response.json();

        return {
            statusCode: code,
            ...result,
        };
    } catch (error) {
        console.log(error);
    }
};

const verificationEmail = async (email: any) => {
    try {
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userEmail: email,
            }),
        };

        const response = await apiFetch(
            `${apiUrl()}/api/auth/verification/email`,
            requestOptions,
        );

        const code = response.status;
        const result = await response.json();

        return {
            statusCode: code,
            ...result,
        };
    } catch (error) {
        console.log(error);
    }
};

const jsonAuthPost = async (path: any, body: any) => {
    try {
        const response = await apiFetch(`${apiUrl()}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body),
        });
        const result = await response.json();
        return {
            statusCode: response.status,
            ...result,
        };
    } catch (error: any) {
        console.log(error);
        return {
            status: false,
            statusCode: 0,
            message: 'server not found',
        };
    }
};

const requestPasswordReset = (email: any) =>
    jsonAuthPost('/api/auth/password/forgot', { userEmail: email });

const confirmPasswordReset = (email: any, emailCode: any) =>
    jsonAuthPost('/api/auth/password/forgot/confirm', {
        userEmail: email,
        emailCode,
    });

const resetPassword = ({
    email,
    emailCode,
    newPassword,
    newPasswordConfirm,
}: any) =>
    jsonAuthPost('/api/auth/password/reset', {
        userEmail: email,
        emailCode,
        newPassword,
        newPasswordConfirm,
    });

const logout = async () => {
    const response = await apiFetch(`${apiUrl()}/api/auth/logout`, {
        method: 'POST',
    });
    const result = await response.json();
    setAccessToken(null);
    return {
        statusCode: response.status,
        ...result,
    };
};

const getSessions = async () => {
    const response = await apiFetch(`${apiUrl()}/api/auth/sessions`);
    const result = await response.json();
    return {
        statusCode: response.status,
        ...result,
    };
};

const deleteSession = async (id: any) => {
    const response = await apiFetch(`${apiUrl()}/api/auth/sessions/${id}`, {
        method: 'DELETE',
    });
    const result = await response.json();
    if (result?.data?.wasCurrent) {
        setAccessToken(null);
    }
    return {
        statusCode: response.status,
        ...result,
    };
};

export {
    verificationGoogle,
    loginGoogle,
    loginUsername,
    emailRegister,
    googleRegister,
    veriticationEmailConfirm,
    verificationEmail,
    requestPasswordReset,
    confirmPasswordReset,
    resetPassword,
    logout,
    getSessions,
    deleteSession,
};
