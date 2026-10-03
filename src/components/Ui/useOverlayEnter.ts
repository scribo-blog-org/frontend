'use client';

import { useEffect, useState } from 'react';

const OVERLAY_MS = 340;

function prefersReducedMotion() {
    return (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

export function useOverlayPresence(active: any = true) {
    const [mounted, setMounted] = useState<any>(false);
    const [visible, setVisible] = useState<any>(false);

    useEffect(() => {
        let innerFrame = 0;
        let timer = 0;

        if (active) {
            setMounted(true);
            setVisible(false);

            const outerFrame = requestAnimationFrame(() => {
                innerFrame = requestAnimationFrame(() => {
                    setVisible(true);
                });
            });

            return () => {
                cancelAnimationFrame(outerFrame);
                cancelAnimationFrame(innerFrame);
            };
        }

        setVisible(false);
        timer = window.setTimeout(
            () => setMounted(false),
            prefersReducedMotion() ? 0 : OVERLAY_MS,
        );

        return () => {
            window.clearTimeout(timer);
            cancelAnimationFrame(innerFrame);
        };
    }, [active]);

    return { mounted, visible };
}

export function useOverlayEnter(active: any = true) {
    return useOverlayPresence(active).visible;
}
