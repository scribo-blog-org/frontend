'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import './Presence.scss';

const LEAVE_MS = 220;

type PresenceProps = {
    value: number | boolean | null | undefined;
    as?: 'span' | 'p';
    className?: string;
    animateEnter?: boolean;
    children?: (value: number | true) => ReactNode;
    [key: string]: unknown;
};

const Presence = ({
    value,
    as: Tag = 'span',
    className = '',
    animateEnter = true,
    children,
    ...rest
}: PresenceProps) => {
    const current = value || 0;
    const [shown, setShown] = useState<number | true>(current);
    const [leaving, setLeaving] = useState(false);
    const shownRef = useRef<number | true>(current);

    useEffect(() => {
        if (current) {
            shownRef.current = current;
            setShown(current);
            setLeaving(false);
            return;
        }

        if (!shownRef.current) {
            return;
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            shownRef.current = 0;
            setShown(0);
            return;
        }

        setLeaving(true);
        const timer = window.setTimeout(() => {
            shownRef.current = 0;
            setShown(0);
            setLeaving(false);
        }, LEAVE_MS);

        return () => window.clearTimeout(timer);
    }, [current]);

    if (!shown) {
        return null;
    }

    return (
        <Tag
            {...rest}
            key={animateEnter ? String(shown) : undefined}
            className={`${className} presence${animateEnter ? ' presence_enter' : ''}${leaving ? ' presence_leaving' : ''}`.trim()}
        >
            {children ? children(shown) : null}
        </Tag>
    );
};

export default Presence;
