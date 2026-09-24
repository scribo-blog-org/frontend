import { API_URL } from "@/config";
import { unwrapPostsResponse } from "@/api/posts.api";

// posts.api is isomorphic (fetch + JSON). unwrapPostsResponse is used on the server.

export function buildQuery(query) {
    if (!query) {
        return "";
    }

    return Object.entries(query)
        .map(([key, value]) => {
            if (key === "empty" || value === undefined || value === null) {
                return null;
            }

            if (Array.isArray(value)) {
                if (value.length === 0) {
                    return `${key}=`;
                }

                return value.map((id) => `${key}=${id}`).join("&");
            }

            return `${key}=${value}`;
        })
        .filter(Boolean)
        .join("&");
}

export async function serverGet(path, { revalidate = 30 } = {}) {
    if (!API_URL) {
        return {
            status: false,
            data: null,
            message: "API URL is not configured",
        };
    }

    try {
        const response = await fetch(`${API_URL}${path}`, {
            headers: { Accept: "application/json" },
            next: { revalidate },
        });

        return await response.json();
    } catch (error) {
        return {
            status: false,
            data: null,
            message: error?.message || "Request failed",
        };
    }
}

export async function fetchPosts(query = {}) {
    const search = buildQuery(query);
    const response = await serverGet(`/api/posts${search ? `?${search}` : ""}`);

    return {
        response,
        ...unwrapPostsResponse(response),
    };
}

export async function fetchPostById(id, query = {}) {
    const search = buildQuery(query);
    return serverGet(`/api/posts/${id}${search ? `?${search}` : ""}`);
}

export async function fetchCategories() {
    return serverGet("/api/categories?expand=category");
}

export async function fetchUserByNick(nick) {
    return serverGet(`/api/users/?nick_name=${encodeURIComponent(nick)}`);
}

export async function fetchSearch(q) {
    const query = String(q || "").trim();

    if (query.length < 2) {
        return {
            status: true,
            data: { posts: [], users: [], categories: [] },
        };
    }

    return serverGet(`/api/search?q=${encodeURIComponent(query)}`, { revalidate: 15 });
}
