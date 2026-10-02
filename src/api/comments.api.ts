import { apiUrl } from '../config';
import { apiFetch } from './http';

const deleteComment = async (commentId: any) => {
    try {
        const res = await apiFetch(`${apiUrl()}/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const result = await res.json();

        return result;
    } catch (err: any) {
        console.log(err);
        return {
            status: 'error',
            message: err,
            data: null,
        };
    }
};

const editComment = async (commentId: any, commentText: any) => {
    try {
        const res = await apiFetch(`${apiUrl()}/api/comments/${commentId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ commentText: commentText }),
        });
        const result = await res.json();

        return result;
    } catch (err: any) {
        console.log(err);
        return {
            status: 'error',
            message: err,
            data: null,
        };
    }
};

const likeComment = async (commentId: any, method: any = 'POST') => {
    try {
        const res = await apiFetch(
            `${apiUrl()}/api/comments/${commentId}/like`,
            {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );
        const result = await res.json();

        return {
            statusCode: res.status,
            ...result,
        };
    } catch (err: any) {
        console.log(err);
        return {
            status: false,
            statusCode: 0,
            message: err,
            data: null,
        };
    }
};

export { deleteComment, editComment, likeComment };
