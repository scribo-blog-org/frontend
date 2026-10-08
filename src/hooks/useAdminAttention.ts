import { useEffect, useState } from 'react';

import { getSupportRequests } from '../api/support.api';
import { socketService } from '../sockets/socket.service';

// Each admin sub-page that can need attention adds one entry here. The sidebar
// shows a dot on the admin panel item while any of them is true.
export type AdminAttention = {
    support: boolean;
    any: boolean;
};

const NONE: AdminAttention = { support: false, any: false };

export function useAdminAttention(profile: any): AdminAttention {
    const [newSupport, setNewSupport] = useState(0);
    const canManageSupport = Boolean(
        profile?.permissions?.includes('manage_support'),
    );

    useEffect(() => {
        if (!canManageSupport) {
            setNewSupport(0);
            return;
        }

        let cancelled = false;

        const load = () => {
            getSupportRequests({ status: 'new', page: 1, limit: 1 })
                .then((result: any) => {
                    if (!cancelled && result?.status) {
                        setNewSupport(
                            Number(result.data?.pagination?.total) || 0,
                        );
                    }
                })
                .catch(() => undefined);
        };

        load();

        const unsubscribe = socketService.on(
            'admin:support-new',
            (count: any) => setNewSupport(Number(count) || 0),
        );
        // Covers whatever was missed while the socket was reconnecting.
        window.addEventListener('focus', load);

        return () => {
            cancelled = true;
            unsubscribe();
            window.removeEventListener('focus', load);
        };
    }, [canManageSupport, profile?._id]);

    if (!canManageSupport) {
        return NONE;
    }

    const support = newSupport > 0;
    return { support, any: support };
}
