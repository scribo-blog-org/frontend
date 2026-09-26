import { getAccessToken, subscribeAccessToken } from "../api/http";
import { socketClient } from "./socket.client";
import { socketEvents } from "./socket.events";

class SocketService {
    constructor() {
        this.isConnected = false;
        this.currentUser = null;
        this.tokenUnsubscribe = null;
    }

    _userRoom(userId) {
        return socketEvents.userRoom(userId);
    }

    async init(user, accessToken) {
        const token = accessToken || getAccessToken();
        if (!user?._id || !token) {
            console.warn(
                "[SocketService] Недостатньо даних для підключення"
            );
            return;
        }

        if (
            this.isConnected &&
            this.currentUser?._id === user._id
        ) {
            await socketClient.setAuth(token);
            return;
        }

        if (this.isConnected) {
            await this.disconnect();
        }

        this.currentUser = user;
        await socketClient.setAuth(token);
        this.tokenUnsubscribe = subscribeAccessToken((nextToken) => {
            if (nextToken) {
                void socketClient.setAuth(nextToken);
            }
        });

        await socketEvents.subscribeUserNotifications(
            user._id,
            (notifications) => {
                this.emit("notification", notifications);
            }
        );

        void socketEvents.subscribeChatUnread(user._id, (unread) => {
            this.emit("chat:unread", unread);
        });

        void socketEvents.subscribeChatConversation(user._id, (conversation) => {
            this.emit("chat:conversation", conversation);
        });

        void socketEvents.subscribeChatConversationDeleted(user._id, (conversationId) => {
            this.emit("chat:conversation-deleted", conversationId);
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

    on(eventName, callback) {
        const event = `socket:${eventName}`;

        const handler = (event) => {
            callback(event.detail);
        };

        window.addEventListener(event, handler);

        return () => {
            window.removeEventListener(event, handler);
        };
    }

    emit(eventName, payload) {
        window.dispatchEvent(
            new CustomEvent(`socket:${eventName}`, {
                detail: payload,
            })
        );
    }
}

export const socketService = new SocketService();
