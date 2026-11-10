import { useEffect, useState } from 'react';

import { getUnreadCount } from '../api/chat.api';
import { socketService } from '../sockets/socket.service';

let sharedUnread = 0;
let inFlight: Promise<void> | null = null;
const listeners = new Set<(count: number) => void>();

const publish = (count: number) => {
    sharedUnread = count;
    listeners.forEach((listener) => listener(count));
};

const refresh = () => {
    if (!inFlight) {
        inFlight = getUnreadCount()
            .then((result: any) => {
                if (result?.status) {
                    publish(Number(result.data?.unread) || 0);
                }
            })
            .catch(() => undefined)
            .finally(() => {
                inFlight = null;
            });
    }

    return inFlight;
};

export function useUnreadMessages(profile: any): number {
    const [unread, setUnread] = useState(sharedUnread);

    useEffect(() => {
        if (!profile) {
            sharedUnread = 0;
            setUnread(0);
            return;
        }

        listeners.add(setUnread);
        setUnread(sharedUnread);
        refresh();

        const unsubscribe = socketService.on('chat:unread', (count: any) =>
            publish(Number(count) || 0),
        );

        return () => {
            listeners.delete(setUnread);
            unsubscribe();
        };
    }, [profile?._id]);

    return unread;
}
