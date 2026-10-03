import { socketClient } from './socket.client';

class SocketEvents {
    subscribeUserNotifications(userId: any, callback: any) {
        const roomName = `user:${userId}`;

        return socketClient.subscribe(
            roomName,
            'notification',
            (message: any) => {
                const notifications = message.payload?.notifications;
                if (!notifications) {
                    return;
                }
                callback(notifications);
            },
            { private: true },
        );
    }

    subscribeChatUnread(userId: any, callback: any) {
        const roomName = `user:${userId}`;

        socketClient.subscribe(
            roomName,
            'chat:unread',
            (message: any) => {
                if (typeof message.payload?.unread !== 'number') {
                    return;
                }
                callback(message.payload.unread);
            },
            { private: true },
        );
    }

    subscribeChatConversation(userId: any, callback: any) {
        const roomName = `user:${userId}`;

        socketClient.subscribe(
            roomName,
            'chat:conversation',
            (message: any) => {
                if (!message.payload?.conversation) {
                    return;
                }
                callback(message.payload.conversation);
            },
            { private: true },
        );
    }

    subscribeChatTyping(userId: any, callback: any) {
        const roomName = `user:${userId}`;

        socketClient.subscribe(
            roomName,
            'chat:typing',
            (message: any) => {
                const payload = message.payload;
                if (!payload?.conversation_id || !payload?.user_id) {
                    return;
                }
                callback(payload);
            },
            { private: true },
        );
    }

    subscribeChatConversationDeleted(userId: any, callback: any) {
        const roomName = `user:${userId}`;

        socketClient.subscribe(
            roomName,
            'chat:conversation-deleted',
            (message: any) => {
                if (!message.payload?.conversation_id) {
                    return;
                }
                callback(message.payload.conversation_id);
            },
            { private: true },
        );
    }

    userRoom(userId: any) {
        return `user:${userId}`;
    }

    chatRoom(conversationId: any) {
        return `chat:${conversationId}`;
    }

    subscribeConversation(userId: any, conversationId: any, handlers: any) {
        const roomName = this.chatRoom(conversationId);

        if (handlers.onMessage) {
            socketClient.subscribe(
                roomName,
                'chat:message',
                (message: any) => {
                    if (!message.payload?.message) {
                        return;
                    }
                    handlers.onMessage(message.payload.message);
                },
                { private: true },
            );
        }

        if (handlers.onMessagesDeleted) {
            socketClient.subscribe(
                roomName,
                'chat:messages-deleted',
                (message: any) => {
                    if (!Array.isArray(message.payload?.ids)) {
                        return;
                    }

                    handlers.onMessagesDeleted(message.payload.ids);
                },
                { private: true },
            );
        }

        if (handlers.onRead) {
            socketClient.subscribe(
                roomName,
                'chat:read',
                (message: any) => {
                    handlers.onRead(message.payload);
                },
                { private: true },
            );
        }
    }

    unsubscribeConversation(userId: any, conversationId: any) {
        const roomName = this.chatRoom(conversationId);
        return socketClient.removeChannel(roomName);
    }
}

export const socketEvents = new SocketEvents();
