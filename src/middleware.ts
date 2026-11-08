import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiUrl } from '@/config';
import { decodeRouteParam } from '@/utils/routeParam';

const CHECK_TIMEOUT_MS = 2500;

async function isMissing(pathname: string) {
    const base = apiUrl();
    const post = pathname.match(/^\/posts\/([^/]+)\/?$/);
    const user = pathname.match(/^\/users\/([^/]+)\/?$/);

    if (!base || (!post && !user)) {
        return false;
    }

    try {
        const response = await fetch(
            post
                ? `${base}/api/posts/${post[1]}`
                : `${base}/api/users/?nick_name=${encodeURIComponent(decodeRouteParam(user![1]))}`,
            {
                headers: { Accept: 'application/json' },
                cache: 'no-store',
                signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
            },
        );

        if (post) {
            return response.status === 404 || response.status === 400;
        }

        const body = await response.json();

        return (
            response.ok &&
            body?.status === true &&
            Array.isArray(body.data) &&
            body.data.length === 0
        );
    } catch {
        return false;
    }
}

export async function middleware(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', request.nextUrl.pathname);

    if (
        request.method === 'GET' &&
        !request.headers.has('rsc') &&
        (await isMissing(request.nextUrl.pathname))
    ) {
        return NextResponse.rewrite(new URL('/404', request.url), {
            status: 404,
            request: { headers: requestHeaders },
        });
    }

    return NextResponse.next({
        request: { headers: requestHeaders },
    });
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
};
