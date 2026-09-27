import { cache } from "react";

import { apiUrl } from "@/config";
import { decodeRouteParam } from "@/utils/routeParam";

export type ApiResult<T> = {
    status: boolean;
    data: T;
    message?: string;
};

type QueryValue = string | number | boolean | null | undefined | Array<string | number>;

export function buildQuery(query?: Record<string, QueryValue>) {
    if (!query) {
        return "";
    }

    return Object.entries(query)
        .map(([key, value]: any) => {
            if (key === "empty" || value === undefined || value === null) {
                return null;
            }

            if (Array.isArray(value)) {
                if (value.length === 0) {
                    return `${key}=`;
                }

                return value.map((id: any) => `${key}=${id}`).join("&");
            }

            return `${key}=${value}`;
        })
        .filter(Boolean)
        .join("&");
}

export async function serverGet<T>(path: string): Promise<ApiResult<T | null>> {
    if (!apiUrl()) {
        return {
            status: false,
            data: null,
            message: "API URL is not configured",
        };
    }

    try {
        const response = await fetch(`${apiUrl()}${path}`, {
            headers: { Accept: "application/json" },
            cache: "no-store",
        });

        return await response.json() as ApiResult<T | null>;
    } catch (error: any) {
        return {
            status: false,
            data: null,
            message: error instanceof Error ? error.message : "Request failed",
        };
    }
}

export async function fetchPosts(query: Record<string, QueryValue> = {}) {
    const search = buildQuery(query);
    return serverGet<{
        items?: Array<Record<string, unknown>>;
        pagination?: { pages?: number };
    }>(`/api/posts${search ? `?${search}` : ""}`);
}

export async function fetchPostById(id: string, query: Record<string, QueryValue> = {}) {
    const search = buildQuery(query);
    return serverGet<Record<string, unknown>>(`/api/posts/${id}${search ? `?${search}` : ""}`);
}

export async function fetchUserByNick(nick: string) {
    const name = decodeRouteParam(nick);
    return serverGet<Array<Record<string, unknown>>>(`/api/users/?nick_name=${encodeURIComponent(name)}`);
}

export const loadPublicPost = cache((id: string) =>
    fetchPostById(id, { expand: "author,category" }),
);

export const loadPublicProfile = cache((nick: string) => fetchUserByNick(nick));
