"use client";

import NextLink from "next/link";
import {
    useParams as useNextParams,
    usePathname,
    useRouter,
    useSearchParams as useNextSearchParams,
} from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps } from "react";

const NAV_STATE_KEY = "__scribo_nav_state__";

let navGeneration = 0;
let navMemory: unknown = null;

type HrefObject = {
    pathname?: string;
    search?: string;
    query?: Record<string, string>;
    hash?: string;
};

type NavOptions = {
    replace?: boolean;
    state?: unknown;
};

function toHref(to: string | HrefObject) {
    if (typeof to === "string") {
        return to;
    }

    const pathname = to.pathname || "";
    let search = "";

    if (to.search) {
        search = to.search.startsWith("?") ? to.search : `?${to.search}`;
    } else if (to.query) {
        search = `?${new URLSearchParams(to.query).toString()}`;
    }

    return `${pathname}${search}${to.hash || ""}`;
}

function rememberState(state: unknown) {
    navGeneration += 1;
    navMemory = state;

    try {
        sessionStorage.setItem(NAV_STATE_KEY, JSON.stringify(state));
    } catch {
        // sessionStorage is unavailable during SSR and in restricted iframes
    }
}

function clearNavState() {
    navGeneration += 1;
    navMemory = null;

    try {
        sessionStorage.removeItem(NAV_STATE_KEY);
    } catch {
        // sessionStorage is unavailable during SSR and in restricted iframes
    }
}

function readStoredState() {
    try {
        const raw = sessionStorage.getItem(NAV_STATE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

type AppLinkProps = ComponentProps<typeof NextLink> & {
    state?: unknown;
};

export function Link({
    href,
    replace,
    state,
    children,
    ...rest
}: AppLinkProps) {
    return (
        <NextLink
            href={href}
            replace={replace}
            onClick={() => {
                if (state !== undefined) {
                    rememberState(state);
                    return;
                }

                clearNavState();
            }}
            {...rest}
        >
            {children}
        </NextLink>
    );
}

export function useNavigate() {
    const router = useRouter();

    return useCallback((to: string | number | HrefObject, options: NavOptions = {}) => {
        if (typeof to === "number") {
            if (to < 0) {
                router.back();
            }

            return;
        }

        if (options.state !== undefined) {
            rememberState(options.state);
        } else {
            clearNavState();
        }

        const href = toHref(to);

        if (options.replace) {
            router.replace(href);
            return;
        }

        router.push(href);
    }, [router]);
}

export function useLocation() {
    const pathname = usePathname() || "/";
    const searchParams = useNextSearchParams();
    const search = searchParams.toString();
    const [state, setState] = useState<any>(null);
    const seenGeneration = useRef(0);
    const key = `${pathname}?${search}`;

    useLayoutEffect(() => {
        if (navGeneration !== seenGeneration.current) {
            seenGeneration.current = navGeneration;
            setState(navGeneration === 0 ? readStoredState() : navMemory);
            return;
        }

        if (navGeneration === 0) {
            setState(readStoredState());
        }
    }, [key]);

    return useMemo(
        () => ({
            pathname,
            search: search ? `?${search}` : "",
            hash: "",
            state,
            key,
        }),
        [pathname, search, state, key],
    );
}

export function useParams<T extends Record<string, string | string[] | undefined> = Record<string, string | undefined>>() {
    return (useNextParams() || {}) as T;
}

export function useSearchParams() {
    const searchParams = useNextSearchParams();
    const router = useRouter();
    const pathname = usePathname() || "/";

    const setSearchParams = useCallback((
        next: URLSearchParams | Record<string, string | undefined | null> | ((current: URLSearchParams) => URLSearchParams | Record<string, string | undefined | null>),
        options: { replace?: boolean } = {},
    ) => {
        const params = typeof next === "function"
            ? next(new URLSearchParams(searchParams.toString()))
            : next;

        let query = "";

        if (params instanceof URLSearchParams) {
            query = params.toString();
        } else if (params && typeof params === "object") {
            const usp = new URLSearchParams();

            Object.entries(params).forEach(([key, value]: any) => {
                if (value === undefined || value === null || value === "") {
                    return;
                }

                usp.set(key, String(value));
            });

            query = usp.toString();
        }

        const href = query ? `${pathname}?${query}` : pathname;

        if (options.replace) {
            router.replace(href, { scroll: false });
            return;
        }

        router.push(href, { scroll: false });
    }, [pathname, router, searchParams]);

    return [searchParams, setSearchParams] as const;
}

export function Navigate({ href, replace = false }: { href: string; replace?: boolean }) {
    const navigate = useNavigate();

    useEffect(() => {
        navigate(href, { replace });
    }, [navigate, replace, href]);

    return null;
}
