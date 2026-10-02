import { publicEnv } from '../config/publicEnv';

export const SITE_NAME = 'Scribo';

export const SITE_DESCRIPTION =
    'Scribo is a blogging platform: write posts, keep a personal blog, talk in comments, and send direct messages.';

export const HOME_TITLE = 'Scribo — posts, personal blogs, and conversation';

export const SITE_ALTERNATE_NAMES = [
    'Scribo Blog',
    'scribo-blog',
    'Scribo',
    'Scribo blog',
];

export const SITE_KEYWORDS = [
    'Scribo',
    'scribo-blog',
    'scribo blog',
    'sribo',
    'Scribo',
    'scribo blog',
    'blog platform',
    'a platform for blogs',
    'create a post',
    'personal blog',
    'direct messages',
    'articles',
    'discussions',
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
