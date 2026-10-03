import { socketClient } from './socket.client';

const PULSE_MS = 1000;

const pending = new Map<string, number>();
const sentAt = new Map<string, number>();
const active = new Set<string>();

const notifyTyping = (conversationId: any) => {
    const id = String(conversationId || '');
    if (!id) {
        return;
    }

    active.add(id);
    const now = Date.now();
    const last = sentAt.get(id) ?? 0;
    const wait = PULSE_MS - (now - last);

    if (wait <= 0) {
        const queued = pending.get(id);
        if (queued) {
            clearTimeout(queued);
            pending.delete(id);
        }
        sentAt.set(id, now);
        socketClient.typing(id, true);
        return;
    }

    if (pending.has(id)) {
        return;
    }

    const timer = window.setTimeout(() => {
        pending.delete(id);
        if (!active.has(id)) {
            return;
        }
        sentAt.set(id, Date.now());
        socketClient.typing(id, true);
    }, wait);
    pending.set(id, timer);
};

const notifyTypingStop = (conversationId: any) => {
    const id = String(conversationId || '');
    if (!id) {
        return;
    }

    const wasActive = active.delete(id);
    const queued = pending.get(id);
    if (queued) {
        clearTimeout(queued);
        pending.delete(id);
    }
    sentAt.delete(id);
    if (!wasActive) {
        return;
    }
    socketClient.typing(id, false);
};

const loadTyping = () => socketClient.queryTyping();

export { loadTyping, notifyTyping, notifyTypingStop };
