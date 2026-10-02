import { apiUrl } from '../config';

/** Путь из базы (`/uploads/...`) плюс origin этого окружения. Абсолютные ссылки не трогает. */
export function mediaUrl(value: unknown) {
    if (typeof value !== 'string' || !value) {
        return '';
    }

    if (value.startsWith('/uploads/')) {
        return `${apiUrl().replace(/\/+$/, '')}${value}`;
    }

    return value;
}

export function imageSrc(value: any, fallback: any) {
    const source = value || fallback;

    if (typeof source === 'string') {
        return mediaUrl(source);
    }

    if (source && typeof source.src === 'string') {
        return source.src;
    }

    return '';
}
