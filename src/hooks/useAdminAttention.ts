import { useEffect, useState } from 'react';

import { getSupportRequests } from '../api/support.api';
import { socketService } from '../sockets/socket.service';

export type AdminAttention = {
    support: boolean;
    any: boolean;
};

const NONE: AdminAttention = { support: false, any: false };

let sharedCount = 0;
let inFlight: Promise<void> | null = null;
const listeners = new Set<(count: number) => void>();

const publish = (count: number) => {
    sharedCount = count;
    listeners.forEach((listener) => listener(count));
};

const refresh = () => {
    if (!inFlight) {
        inFlight = getSupportRequests({ status: 'new', page: 1, limit: 1 })
            .then((result: any) => {
                if (result?.status) {
                    publish(Number(result.data?.pagination?.total) || 0);
                }
            })
            .catch(() => undefined)
            .finally(() => {
                inFlight = null;
            });
    }

    return inFlight;
};

export function useAdminAttention(profile: any): AdminAttention {
    const [newSupport, setNewSupport] = useState(sharedCount);
    const canManageSupport = Boolean(
        profile?.permissions?.includes('manage_support'),
    );

    useEffect(() => {
        if (!canManageSupport) {
            setNewSupport(0);
            return;
        }

        listeners.add(setNewSupport);
        setNewSupport(sharedCount);
        refresh();

        const unsubscribe = socketService.on(
            'admin:support-new',
            (count: any) => publish(Number(count) || 0),
        );
        const onFocus = () => {
            refresh();
        };

        window.addEventListener('focus', onFocus);

        return () => {
            listeners.delete(setNewSupport);
            unsubscribe();
            window.removeEventListener('focus', onFocus);
        };
    }, [canManageSupport, profile?._id]);

    if (!canManageSupport) {
        return NONE;
    }

    const support = newSupport > 0;
    return { support, any: support };
}
