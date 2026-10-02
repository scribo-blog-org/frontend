'use client';

import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from '@/navigation';

import { scrollToTop } from '../../utils/navigation';

const ScrollToTop = () => {
    const location = useLocation();

    useLayoutEffect(() => {
        scrollToTop();
    }, [location.pathname, location.key]);

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            scrollToTop();
        });

        return () => cancelAnimationFrame(frame);
    }, [location.pathname, location.key]);

    return null;
};

export default ScrollToTop;
