'use client';

import { useState, useEffect } from 'react';
import { format_back } from '../../utils/format';

const RelativeTime = ({ date, intervalMs = 1000 }: any) => {
    const [, forceUpdate] = useState<any>(0);

    useEffect(() => {
        if (!date) return;

        const timer = setInterval(() => {
            forceUpdate((tick: any) => tick + 1);
        }, intervalMs);

        return () => clearInterval(timer);
    }, [date, intervalMs]);

    return <>{format_back(date)}</>;
};

export default RelativeTime;
