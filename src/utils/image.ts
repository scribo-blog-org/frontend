import { apiUrl } from '../config';
import { usesLocalDevApi } from '../config/publicEnv';

export function mediaUrl(value: unknown) {
    if (typeof value !== 'string' || !value) {
        return '';
    }

    if (value.startsWith('/uploads/')) {
        if (usesLocalDevApi()) {
            return value;
        }

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
