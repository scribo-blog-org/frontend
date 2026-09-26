import { apiUrl } from "../config"
import { apiFetch } from "./http"

const getPosts = async (query: any) => {
    let queryString = ""

    if(query) {
        queryString = Object.entries(query).map(([key, value]: any) => {
            if (key === "empty" || value === undefined || value === null) {
                return null
            }
            if (Array.isArray(value)) {
                if (value.length === 0) {
                    return `${key}=`
                }
                return value.map((id: any) => `${key}=${id}`).join('&')
            }
            return `${key}=${value}`
        }).filter(Boolean).join('&')
    }
    
    const result = await apiFetch(`${apiUrl()}/api/posts?${queryString}`)
    .then((res: any) => res.json())
    .catch((err: any) => { 
        console.log(err)
        return ({
            status: "error",
            message: err,
            data: null
        })
    })

    return result
}

const POSTS_PAGE_LIMIT = 5

function unwrapPostsResponse(response: any) {
    const payload = response?.data
    const items = Array.isArray(payload) ? payload : (payload?.items || [])
    const pagination = Array.isArray(payload)
        ? { page: 1, pages: items.length ? 1 : 0, total: items.length, limit: POSTS_PAGE_LIMIT }
        : (payload?.pagination || { page: 1, pages: 0, total: 0, limit: POSTS_PAGE_LIMIT })

    return { items, pagination }
}

const deletePost = async (id: any) => {
    const result = await apiFetch(`${apiUrl()}/api/posts/${id}`, { method: "DELETE" })
    .then((res: any) => res.json())
    .catch((err: any) => { 
        console.log(err)
        return ({
            status: "error",
            message: err,
            data: null
        })
    })

    return result
}

const getPostById = async (id: any, query: any = {}) => {
    let queryString = ""

    if(query) {
        queryString = Object.entries(query).map(([key, value]: any) => {
            if (Array.isArray(value)) {
                if (value.length === 0) {
                    return `${key}=`
                }
                return value.map((id: any) => `${key}=${id}`).join('&')
            }
            return `${key}=${value}`
        }).join('&')
    }

    const result = await apiFetch(`${apiUrl()}/api/posts/${id}?${queryString}`)
        .then((res: any) => res.json())
        .catch((err: any) => {
            console.log(err)
            return ({
                status: "error",
                message: err,
                data: null
            })
        })

    return result
}

const commentPost = async (id: any, data: any) => {
    const result = await apiFetch(`${apiUrl()}/api/posts/${id}/comments?expand=author`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            commentText: data.commentText,
            ...(data.parentCommentId ? { parentCommentId: data.parentCommentId } : {})
        })
    })
    .then((res: any) => res.json())
    .catch((err: any) => { 
        console.log(err)
        return ({
            status: "error",
            message: err,
            data: null
        })
    })

    return result
}

const getComments = async (id: any) => {
    const result = await apiFetch(`${apiUrl()}/api/posts/${id}/comments?expand=author`)
    .then((res: any) => res.json())
    .catch((err: any) => {
        console.log(err)
        return ({
            status: "error",
            message: err,
            data: null
        })
    })
    return result
}

const likePost = async (id: any, method: any="POST") => {
    try {
        const response = await apiFetch(`${apiUrl()}/api/posts/${id}/like`, {
            method,
            headers: { "Content-Type": "application/json" }
        })
        const result = await response.json()

        return {
            statusCode: response.status,
            ...result
        }
    }
    catch (err: any) {
        return {
            status: false,
            statusCode: 0,
            message: err,
            data: null
        }
    }
}

const savePost = async (id: any, method: any="POST") => {
    let response = await apiFetch(`${apiUrl()}/api/posts/${id}/save`, { method })
    const result = await response.json();
    const code = response.status

    return {
        statusCode: code,
        ...result
    }
}

const createPost = async (data: any) => {
    try {
        const response = await apiFetch(`${apiUrl()}/api/posts`, { method: "POST", body: data})
        const result = await response.json()
        const code = response.status

        console.log(result)
        return {
            statusCode: code,
            ...result
        }
    }
    catch (err: any) {
        console.log(err)
    }
}

const editPost = async (id: any, data: any) => {
    try {
        const response = await apiFetch(`${apiUrl()}/api/posts/${id}`, { method: "PATCH", body: data})
        const result = await response.json()
        const code = response.status
        return {
            statusCode: code,
            ...result
        }
    }
    catch (err: any) {
        console.log(err)
    }
}

export { getPosts, unwrapPostsResponse, POSTS_PAGE_LIMIT, deletePost, getPostById, commentPost, getComments, likePost, savePost, createPost, editPost }
