import { publicEnv } from '../config/publicEnv';

function socketUrl() {
    return publicEnv('NEXT_PUBLIC_SOCKET_URL') || 'ws://localhost:3002';
}
const AUTH_TIMEOUT_MS = 10000;

class SocketClient {
    socket: any;
    token: any;
    authedToken: any;
    openPromise: any;
    authWait: any;
    intentionalClose: any;
    reconnectTimer: any;
    rooms: any;
    statusListeners: any;
    presenceListeners: any;
    presenceQueries: any;
    typingQueries: any;
    constructor() {
        this.socket = null;
        this.token = null;
        this.authedToken = null;
        this.openPromise = null;
        this.authWait = null;
        this.intentionalClose = false;
        this.reconnectTimer = null;
        this.rooms = new Map();
        this.statusListeners = new Map();
        this.presenceListeners = new Set();
        this.presenceQueries = new Map();
        this.typingQueries = new Map();
    }

    async setAuth(accessToken: any) {
        this.token = accessToken || null;
        if (!this.token || typeof WebSocket === 'undefined') {
            return;
        }
        this.intentionalClose = false;
        await this._ensureOpen();
        if (this.authedToken === this.token) {
            return;
        }
        await this._authenticate();
    }

    onChannelStatus(roomName: any, callback: any) {
        const listeners = this.statusListeners.get(roomName) || new Set();
        listeners.add(callback);
        this.statusListeners.set(roomName, listeners);

        const entry = this.rooms.get(roomName);
        if (entry?.status === 'SUBSCRIBED') {
            callback('SUBSCRIBED');
        }

        return () => {
            const current = this.statusListeners.get(roomName);
            if (!current) {
                return;
            }
            current.delete(callback);
            if (current.size === 0) {
                this.statusListeners.delete(roomName);
            }
        };
    }

    waitForSubscribed(roomName: any) {
        const entry = this.rooms.get(roomName);
        if (entry?.status === 'SUBSCRIBED') {
            return Promise.resolve();
        }

        return new Promise((resolve: any) => {
            const unsubscribe = this.onChannelStatus(
                roomName,
                (status: any) => {
                    if (status === 'SUBSCRIBED') {
                        unsubscribe();
                        resolve();
                    }
                },
            );
        });
    }

    async subscribe(
        roomName: any,
        eventName: any,
        callback: any,
        _options: any = {},
    ) {
        if (!this.token) {
            return;
        }
        await this.setAuth(this.token);

        let entry = this.rooms.get(roomName);
        if (!entry) {
            entry = { status: 'PENDING', events: new Map() };
            this.rooms.set(roomName, entry);
            this._send({ type: 'subscribe', room: roomName });
        }

        let handlers = entry.events.get(eventName);
        if (!handlers) {
            handlers = new Set();
            entry.events.set(eventName, handlers);
        }
        handlers.add(callback);
    }

    async removeChannel(roomName: any) {
        const entry = this.rooms.get(roomName);
        if (!entry) {
            return;
        }

        this.rooms.delete(roomName);
        this._send({ type: 'unsubscribe', room: roomName });
        this._emitChannelStatus(roomName, 'CLOSED');
        this.statusListeners.delete(roomName);
    }

    async disconnect() {
        this.intentionalClose = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        const rooms = [...this.rooms.keys()];
        this.rooms.clear();
        for (const roomName of rooms) {
            this._emitChannelStatus(roomName, 'CLOSED');
        }
        this.statusListeners.clear();
        this.authedToken = null;
        this._rejectAuth(new Error('disconnected'));
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.openPromise = null;
    }

    onPresence(callback: any) {
        this.presenceListeners.add(callback);
        return () => {
            this.presenceListeners.delete(callback);
        };
    }

    typing(conversationId: any, active: any) {
        this._send({
            type: 'typing',
            conversation: conversationId,
            typing: Boolean(active),
            at: Date.now(),
        });
    }

    queryTyping() {
        return new Promise((resolve: any) => {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const timer = setTimeout(() => {
                this.typingQueries.delete(id);
                resolve([]);
            }, AUTH_TIMEOUT_MS);

            this.typingQueries.set(id, (items: any) => {
                clearTimeout(timer);
                this.typingQueries.delete(id);
                resolve(items);
            });

            void this.setAuth(this.token)
                .then(() => {
                    this._send({ type: 'typing:query', id });
                })
                .catch(() => {
                    clearTimeout(timer);
                    this.typingQueries.delete(id);
                    resolve([]);
                });
        });
    }

    queryPresence(userIds: any) {
        const ids = [...new Set((userIds || []).map(String).filter(Boolean))];
        if (!ids.length) {
            return Promise.resolve({});
        }

        return new Promise((resolve: any) => {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const timer = setTimeout(() => {
                this.presenceQueries.delete(id);
                resolve(
                    Object.fromEntries(
                        ids.map((userId: any) => [userId, false]),
                    ),
                );
            }, AUTH_TIMEOUT_MS);

            this.presenceQueries.set(id, (users: any) => {
                clearTimeout(timer);
                this.presenceQueries.delete(id);
                resolve(users);
            });

            void this.setAuth(this.token)
                .then(() => {
                    this._send({ type: 'presence:query', id, users: ids });
                })
                .catch(() => {
                    clearTimeout(timer);
                    this.presenceQueries.delete(id);
                    resolve(
                        Object.fromEntries(
                            ids.map((userId: any) => [userId, false]),
                        ),
                    );
                });
        });
    }

    _emitChannelStatus(roomName: any, status: any) {
        const listeners = this.statusListeners.get(roomName);
        if (!listeners) {
            return;
        }
        for (const listener of listeners) {
            listener(status);
        }
    }

    _ensureOpen() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }
        if (this.openPromise) {
            return this.openPromise;
        }

        this.openPromise = new Promise((resolve: any, reject: any) => {
            let settled = false;
            const socket = new WebSocket(socketUrl());
            this.socket = socket;
            const timer = setTimeout(() => {
                if (settled) {
                    return;
                }
                settled = true;
                this.openPromise = null;
                socket.close();
                reject(new Error('socket connection timed out'));
            }, AUTH_TIMEOUT_MS);

            socket.onopen = () => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timer);
                resolve();
            };

            socket.onmessage = (event: any) => {
                this._onMessage(event.data);
            };

            socket.onclose = () => {
                clearTimeout(timer);
                if (this.socket === socket) {
                    this.socket = null;
                }
                this.openPromise = null;
                this.authedToken = null;
                if (!settled) {
                    settled = true;
                    reject(new Error('socket closed'));
                }
                this._rejectAuth(new Error('socket closed'));
                this._scheduleReconnect();
            };

            socket.onerror = () => {};
        });

        return this.openPromise;
    }

    _authenticate() {
        if (this.authWait) {
            return this.authWait.promise;
        }

        let settle: any;
        const promise = new Promise((resolve: any, reject: any) => {
            settle = { resolve, reject };
        });
        const timer = setTimeout(() => {
            if (this.authWait?.promise === promise) {
                this.authWait = null;
            }
            settle.reject(new Error('socket auth timed out'));
        }, AUTH_TIMEOUT_MS);

        this.authWait = {
            promise,
            resolve: () => {
                clearTimeout(timer);
                this.authWait = null;
                settle.resolve();
            },
            reject: (error: any) => {
                clearTimeout(timer);
                this.authWait = null;
                settle.reject(error);
            },
        };
        this._send({ type: 'auth', access: this.token });
        return promise;
    }

    _rejectAuth(error: any) {
        if (this.authWait) {
            this.authWait.reject(error);
        }
    }

    _send(body: any) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }
        this.socket.send(JSON.stringify(body));
    }

    _onMessage(raw: any) {
        let message: any;
        try {
            message = JSON.parse(raw);
        } catch {
            return;
        }

        if (message.type === 'auth' && message.ok) {
            this.authedToken = this.token;
            if (this.authWait) {
                this.authWait.resolve();
            }
            return;
        }

        if (message.type === 'subscribe' && message.ok && message.room) {
            const entry = this.rooms.get(message.room);
            if (entry) {
                entry.status = 'SUBSCRIBED';
            }
            this._emitChannelStatus(message.room, 'SUBSCRIBED');
            return;
        }

        if (
            message.type === 'error' &&
            message.error === 'unauthorized' &&
            this.authWait
        ) {
            this.authWait.reject(new Error('unauthorized'));
            return;
        }

        if (message.type === 'error' && message.room) {
            const entry = this.rooms.get(message.room);
            if (entry) {
                entry.status = 'CHANNEL_ERROR';
            }
            this._emitChannelStatus(message.room, 'CHANNEL_ERROR');
            return;
        }

        if (
            message.type === 'presence' &&
            message.id &&
            this.presenceQueries.has(message.id)
        ) {
            this.presenceQueries.get(message.id)(message.users || {});
            return;
        }

        if (
            message.type === 'typing' &&
            message.id &&
            this.typingQueries.has(message.id)
        ) {
            this.typingQueries.get(message.id)(message.items || []);
            return;
        }

        if (message.type === 'presence' && message.user) {
            for (const listener of this.presenceListeners) {
                listener(
                String(message.user),
                Boolean(message.online),
                typeof message.at === 'string' ? message.at : undefined,
            );
            }
            return;
        }

        if (
            typeof message.room === 'string' &&
            typeof message.event === 'string'
        ) {
            const entry = this.rooms.get(message.room);
            const handlers = entry?.events.get(message.event);
            if (!handlers) {
                return;
            }
            for (const handler of handlers) {
                handler({ payload: message.payload ?? {} });
            }
        }
    }

    _scheduleReconnect() {
        if (this.intentionalClose || !this.token || this.reconnectTimer) {
            return;
        }
        for (const [roomName, entry] of this.rooms) {
            entry.status = 'PENDING';
            this._emitChannelStatus(roomName, 'CHANNEL_ERROR');
        }
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            void this._recover();
        }, 1000);
    }

    async _recover() {
        if (this.intentionalClose || !this.token) {
            return;
        }
        try {
            await this._ensureOpen();
            await this._authenticate();
            for (const [roomName, entry] of this.rooms) {
                entry.status = 'PENDING';
                this._send({ type: 'subscribe', room: roomName });
            }
        } catch {
            this._scheduleReconnect();
        }
    }
}

export const socketClient = new SocketClient();
