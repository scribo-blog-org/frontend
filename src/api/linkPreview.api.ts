import { apiUrl } from '../config';
import { apiFetch } from './http';

export async function fetchLinkPreview(url: any) {
    try {
        const response = await apiFetch(
            `${apiUrl()}/api/link-preview?url=${encodeURIComponent(url)}`,
        );
        return await response.json();
    } catch (error: any) {
        console.error(error);
        return { status: false, message: error.message };
    }
}
