import { publicEnv } from '../config/publicEnv';

export const SITE_NAME = 'Scribo';

export const SITE_DESCRIPTION =
    'Scribo (Скрибо) — блог-платформа: создавайте посты, ведите личный блог, обсуждайте в комментариях и переписывайтесь в личных сообщениях.';

export const HOME_TITLE =
    'Scribo — блог-платформа: посты, личные блоги и общение';

export const SITE_ALTERNATE_NAMES = [
    'Scribo Blog',
    'scribo-blog',
    'Скрибо',
    'Скрибо блог',
];

export const SITE_KEYWORDS = [
    'Scribo',
    'scribo-blog',
    'scribo blog',
    'sribo',
    'Скрибо',
    'скрибо блог',
    'блог платформа',
    'платформа для блогов',
    'создать пост',
    'личный блог',
    'личные сообщения',
    'статьи',
    'обсуждения',
];

export const DEFAULT_OG_IMAGE = '/og.png';
export const BRAND_LOGO = '/logo-512.png';

export function getSiteOrigin() {
    const host = publicEnv('NEXT_PUBLIC_APP_VERCEL_PROJECT_PRODUCTION_URL');

    if (!host) {
        return 'https://scribo.pp.ua';
    }

    if (host.startsWith('http://') || host.startsWith('https://')) {
        return host.replace(/\/$/, '');
    }

    const protocol = host.startsWith('localhost') ? 'http' : 'https';

    return `${protocol}://${host.replace(/\/$/, '')}`;
}

export function absoluteUrl(path: any = '/') {
    const normalized = path.startsWith('/') ? path : `/${path}`;

    return `${getSiteOrigin()}${normalized}`;
}

export function pageTitle(title: any) {
    return title ? `${title} | ${SITE_NAME}` : SITE_NAME;
}
