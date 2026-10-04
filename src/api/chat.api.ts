import { apiUrl } from '../config';
import { apiFetch } from './http';

const parse = async (response: any) => {
    try {
        return await response.json();
    } catch {
        return null;
    }
};

const getUnreadCount = async () => {
    const response = await apiFetch(`${apiUrl()}/api/chat/unread-count`);
    return parse(response);
};

const getConversations = async () => {
    const response = await apiFetch(`${apiUrl()}/api/chat/conversations`);
    return parse(response);
};

const groupForm = (fields: any, photo?: File | null) => {
    const body = new FormData();
    body.set('name', fields.name);
    body.set('description', fields.description || '');
    if (fields.memberIds) {
        body.set('memberIds', JSON.stringify(fields.memberIds));
    }
    if (fields.removePhoto) {
        body.set('removePhoto', 'true');
    }
    if (photo) {
        body.set('groupPhoto', photo);
    }
    return body;
};

const createGroup = async (fields: any, photo?: File | null) => {
    const response = await apiFetch(
        `${apiUrl()}/api/chat/conversations/group`,
        {
            method: 'POST',
            body: groupForm(fields, photo),
        },
    );
    return parse(response);
};

const updateGroup = async (
    conversationId: any,
    fields: any,
    photo?: File | null,
) => {
    const response = await apiFetch(
        `${apiUrl()}/api/chat/conversations/${conversationId}/group`,
        {
            method: 'PATCH',
            body: groupForm(fields, photo),
        },
    );
    return parse(response);
};

const addGroupMember = async (conversationId: any, userId: any) => {
    const response = await apiFetch(
        `${apiUrl()}/api/chat/conversations/${conversationId}/members`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        },
    );
    return parse(response);
};

const removeGroupMember = async (conversationId: any, userId: any) => {
    const response = await apiFetch(
        `${apiUrl()}/api/chat/conversations/${conversationId}/members/${userId}`,
        { method: 'DELETE' },
    );
    return parse(response);
};

const updateGroupMemberRole = async (
    conversationId: any,
    userId: any,
    role: any,
) => {
    const response = await apiFetch(
        `${apiUrl()}/api/chat/conversations/${conversationId}/members/${userId}`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
        },
    );
    return parse(response);
};

const createConversation = async (userId: any) => {
    const response = await apiFetch(`${apiUrl()}/api/chat/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
    });
    return parse(response);
};

const deleteConversation = async (conversationId: any) => {
    const response = await apiFetch(
        `${apiUrl()}/api/chat/conversations/${conversationId}`,
        {
            method: 'DELETE',
        },
    );
    return parse(response);
};

const getConversation = async (conversationId: any) => {
    const response = await apiFetch(
        `${apiUrl()}/api/chat/conversations/${conversationId}`,
    );
    return parse(response);
};

const getMessages = async (conversationId: any, params: any = {}) => {
    const search = new URLSearchParams();

    if (params.before) {
        search.set('before', params.before);
    }

    if (params.limit) {
        search.set('limit', String(params.limit));
    }

    const query = search.toString();
    const response = await apiFetch(
        `${apiUrl()}/api/chat/conversations/${conversationId}/messages${query ? `?${query}` : ''}`,
    );
    return parse(response);
};

const sendMessage = async (conversationId: any, payload: any) => {
    const response = await apiFetch(
        `${apiUrl()}/api/chat/conversations/${conversationId}/messages`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: payload.text,
                replyTo: payload.replyTo || undefined,
            }),
        },
    );
    return parse(response);
};

const markConversationRead = async (conversationId: any) => {
    const response = await apiFetch(
        `${apiUrl()}/api/chat/conversations/${conversationId}/read`,
        { method: 'POST' },
    );
    return parse(response);
};

const deleteMessages = async (ids: any) => {
    const response = await apiFetch(
        `${apiUrl()}/api/chat/messages/bulk-delete`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
        },
    );
    return parse(response);
};

const deleteMessage = async (messageId: any) => {
    const response = await apiFetch(
        `${apiUrl()}/api/chat/messages/${messageId}`,
        {
            method: 'DELETE',
        },
    );
    return parse(response);
};

const editMessage = async (messageId: any, payload: any) => {
    const response = await apiFetch(
        `${apiUrl()}/api/chat/messages/${messageId}`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: payload.text }),
        },
    );
    return parse(response);
};

export {
    getUnreadCount,
    getConversations,
    createConversation,
    createGroup,
    updateGroup,
    addGroupMember,
    removeGroupMember,
    updateGroupMemberRole,
    deleteConversation,
    getConversation,
    getMessages,
    sendMessage,
    markConversationRead,
    deleteMessage,
    deleteMessages,
    editMessage,
};
