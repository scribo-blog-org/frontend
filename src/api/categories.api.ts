import { apiUrl } from '../config';
import { apiFetch } from './http';

const getCategories = async () => {
    try {
        const res = await apiFetch(
            `${apiUrl()}/api/categories?expand=category`,
        );
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

const editCategory = async (id: any, data: any) => {
    try {
        const res = await apiFetch(`${apiUrl()}/api/categories/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
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

const createCategory = async (data: any) => {
    try {
        const res = await apiFetch(`${apiUrl()}/api/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
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

const deleteCategory = async (id: any) => {
    try {
        const res = await apiFetch(`${apiUrl()}/api/categories/${id}`, {
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

export { getCategories, editCategory, createCategory, deleteCategory };
