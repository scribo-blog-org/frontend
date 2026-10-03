import { getAccessToken, subscribeAccessToken } from '../api/http';
import { socketClient } from './socket.client';
import { socketEvents } from './socket.events';

class SocketService {
    isConnected: any;
    currentUser: any;
    tokenUnsubscribe: any;
    constructor() {
        this.isConnected = false;
        this.currentUser = null;
        this.tokenUnsubscribe = null;
    }

    _userRoom(userId: any) {
        return socketEvents.userRoom(userId);
    }

    async init(user: any, accessToken: any) {
        const token = accessToken || getAccessToken();
        if (!user?._id || !token) {
            console.warn('[SocketService] Not enough data to connect');
            return;
        }

        if (this.isConnected && this.currentUser?._id === user._id) {
            await socketClient.setAuth(token);
            return;
        }

        if (this.isConnected) {
            await this.disconnect();
        }

        this.currentUser = user;
        await socketClient.setAuth(token);
        this.tokenUnsubscribe = subscribeAccessToken((nextToken: any) => {
            if (nextToken) {
                void socketClient.setAuth(nextToken);
            }
        });

        await socketEvents.subscribeUserNotifications(
            user._id,
            (notifications: any) => {
                this.emit('notification', notifications);
            },
        );

        void socketEvents.subscribeChatUnread(user._id, (unread: any) => {
            this.emit('chat:unread', unread);
        });

        void socketEvents.subscribeChatConversation(
            user._id,
            (conversation: any) => {
                this.emit('chat:conversation', conversation);
            },
        );

        void socketEvents.subscribeChatConversationDeleted(
            user._id,
            (conversationId: any) => {
                this.emit('chat:conversation-deleted', conversationId);
            },
        );

        void socketEvents.subscribeChatTyping(user._id, (payload: any) => {
            this.emit('chat:typing', payload);
        });

        await socketClient.waitForSubscribed(this._userRoom(user._id));

        this.isConnected = true;
    }

    async disconnect() {
        if (this.tokenUnsubscribe) {
            this.tokenUnsubscribe();
            this.tokenUnsubscribe = null;
        }

        await socketClient.disconnect();

        this.isConnected = false;
        this.currentUser = null;
    }

    on(eventName: any, callback: any) {
        const event = `socket:${eventName}`;

        const handler = (event: any) => {
            callback(event.detail);
        };

        window.addEventListener(event, handler);

        return () => {
            window.removeEventListener(event, handler);
        };
    }

    emit(eventName: any, payload: any) {
        window.dispatchEvent(
            new CustomEvent(`socket:${eventName}`, {
                detail: payload,
            }),
        );
    }
}

export const socketService = new SocketService();
