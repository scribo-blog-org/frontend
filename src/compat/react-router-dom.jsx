'use client';

import NextLink from "next/link";
import {
    useParams as useNextParams,
    usePathname,
    useRouter,
    useSearchParams as useNextSearchParams,
} from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const NAV_STATE_KEY = "__scribo_nav_state__";

function toHref(to) {
    if (typeof to === "string") {
        return to;
    }

    if (!to || typeof to !== "object") {
        return "/";
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

export function Link({ to, href, replace, children, ...rest }) {
    const target = href ?? toHref(to);

    return (
        <NextLink href={target} replace={replace} {...rest}>
            {children}
        </NextLink>
    );
}

export function useNavigate() {
    const router = useRouter();

    return useCallback((to, options = {}) => {
        if (typeof to === "number") {
            if (to < 0) {
                router.back();
            }

            return;
        }

        if (options.state !== undefined) {
            try {
                sessionStorage.setItem(NAV_STATE_KEY, JSON.stringify(options.state));
            } catch {
                // sessionStorage is unavailable during SSR / restricted iframes
            }
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
    const [state, setState] = useState(null);
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
            // ignore
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

export function useParams() {
    return useNextParams() || {};
}

export function useSearchParams() {
    const searchParams = useNextSearchParams();
    const router = useRouter();
    const pathname = usePathname() || "/";

    const setSearchParams = useCallback((next, options = {}) => {
        const params = typeof next === "function"
            ? next(new URLSearchParams(searchParams.toString()))
            : next;

        let query = "";

        if (params instanceof URLSearchParams) {
            query = params.toString();
        } else if (params && typeof params === "object") {
            const usp = new URLSearchParams();

            Object.entries(params).forEach(([key, value]) => {
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

    return [searchParams, setSearchParams];
}

export function Navigate({ to, replace = false }) {
    const navigate = useNavigate();

    useEffect(() => {
        navigate(to, { replace });
    }, [navigate, replace, to]);

    return null;
}

export function Outlet({ children }) {
    return children ?? null;
}

export default {
    Link,
    Navigate,
    Outlet,
    useLocation,
    useNavigate,
    useParams,
    useSearchParams,
};
