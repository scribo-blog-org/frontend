"use client";

import NextLink from "next/link";
import {
    useParams as useNextParams,
    usePathname,
    useRouter,
    useSearchParams as useNextSearchParams,
} from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";

const NAV_STATE_KEY = "__scribo_nav_state__";

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
    try {
        sessionStorage.setItem(NAV_STATE_KEY, JSON.stringify(state));
    } catch {
        // sessionStorage is unavailable during SSR and in restricted iframes
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
                }
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
    const key = `${pathname}?${search}`;

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(NAV_STATE_KEY);

            if (raw) {
                sessionStorage.removeItem(NAV_STATE_KEY);
                setState(JSON.parse(raw));
                return;
            }
        } catch {
            // ignore unreadable session storage
        }

        setState(null);
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
