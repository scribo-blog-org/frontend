import { apiUrl } from '../config';
import { apiFetch } from './http';

const API = () => `${apiUrl()}/api/backups`;

const getBackups = async (query: any = {}) => {
    const params = new URLSearchParams();

    Object.entries(query).forEach(([key, value]: any) => {
        if (value !== undefined && value !== null && value !== '') {
            params.append(key, value);
        }
    });

    const search = params.toString();
    const response = await apiFetch(`${API()}${search ? `?${search}` : ''}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    return await response.json();
};

const runBackup = async () => {
    const response = await apiFetch(API(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });

    return await response.json();
};

const restoreBackup = async (id: string) => {
    const response = await apiFetch(`${API()}/${id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
    });

    return await response.json();
};

/**
 * Загрузка своего архива. Сервер проверяет его целиком и добавляет в список,
 * ставится он потом обычным откатом. Тело multipart, заголовок Content-Type
 * ставит браузер сам, иначе потеряется boundary.
 */
const uploadBackup = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await apiFetch(`${API()}/upload`, {
            method: 'POST',
            body: formData,
            // Обрыв большой загрузки не значит, что сайт лежит.
            reportOutage: false,
        });

        try {
            return await response.json();
        } catch {
            // Прокси отвечает не JSON-ом, например когда файл больше его лимита.
            return {
                status: false,
                message:
                    response.status === 413
                        ? 'Файл больше допустимого размера'
                        : 'Не удалось загрузить архив',
            };
        }
    } catch {
        return { status: false, message: 'Не удалось загрузить архив' };
    }
};

/** Архив нельзя отдать ссылкой: эндпоинт требует токен, поэтому качаем через fetch. */
const downloadBackup = async (id: string) => {
    const response = await apiFetch(`${API()}/${id}/download`, {
        method: 'GET',
    });

    if (!response.ok) {
        try {
            const result = await response.json();
            return { status: false, message: result?.message };
        } catch {
            return { status: false, message: 'Не удалось скачать бекап' };
        }
    }

    const disposition = response.headers.get('Content-Disposition') || '';
    const name = /filename="([^"]+)"/.exec(disposition)?.[1] || 'backup.gz';
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    return { status: true };
};

export { getBackups, runBackup, restoreBackup, downloadBackup, uploadBackup };
