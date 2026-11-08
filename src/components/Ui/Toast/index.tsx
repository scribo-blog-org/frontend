'use client';

import { useEffect, useState } from 'react';
import './Toast.scss';

const TOAST_DURATION = 3000;
const ENTER_DELAY = 20;
const EXIT_DURATION = 700;

type ToastItem = {
    id: string;
    source: unknown;
    message: string;
    type: string;
    createdAt: number;
};

type Phase = 'enter' | 'show' | 'exit' | 'gone';

// Where a toast is in its life is worked out from when it was created, not
// from timers that were started for it. Timers only wake the component up at
// the next change. If the effects are torn down and run again with the state
// kept (React StrictMode, hot reload in development), the timer is simply
// planned again from the toasts, and no toast can be left on screen.
const phaseOf = (item: ToastItem, now: number): Phase => {
    const age = now - item.createdAt;

    if (age < ENTER_DELAY) return 'enter';
    if (age < TOAST_DURATION) return 'show';
    if (age < TOAST_DURATION + EXIT_DURATION) return 'exit';
    return 'gone';
};

const msUntilChange = (item: ToastItem, now: number) => {
    const age = now - item.createdAt;
    const edges = [ENTER_DELAY, TOAST_DURATION, TOAST_DURATION + EXIT_DURATION];
    const next = edges.find((edge) => edge > age);

    return next === undefined ? 0 : next - age;
};

const Toast = ({ toast }: any) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [now, setNow] = useState<number>(() => Date.now());

    useEffect(() => {
        if (!toast) {
            return;
        }

        const item: ToastItem = {
            id: `${Date.now()}-${Math.random()}`,
            source: toast,
            message: toast.message,
            type: toast.type || 'info',
            createdAt: Date.now(),
        };

        // The same toast is added once even if this effect runs twice.
        setToasts((prev) =>
            prev.some((entry) => entry.source === toast)
                ? prev
                : [...prev, item],
        );
        setNow(Date.now());
    }, [toast]);

    useEffect(() => {
        if (!toasts.length) {
            return;
        }

        const current = Date.now();
        const delay = Math.max(
            10,
            Math.min(...toasts.map((item) => msUntilChange(item, current))),
        );

        const timer = setTimeout(() => {
            const at = Date.now();

            setToasts((prev) =>
                prev.filter((item) => phaseOf(item, at) !== 'gone'),
            );
            setNow(at);
        }, delay);

        return () => clearTimeout(timer);
    }, [toasts, now]);

    const visibleToasts = toasts
        .filter((item) => phaseOf(item, now) !== 'gone')
        .slice(-3);

    return (
        <div className="toast-container">
            {visibleToasts
                .slice()
                .reverse()
                .map((item, index) => {
                    const phase = phaseOf(item, now);

                    return (
                        <div
                            key={item.id}
                            className={`
                            float_section
                            blurred
                            toast
                            toast_position_${index}
                            ${phase === 'enter' ? 'toast_enter' : ''}
                            ${phase === 'exit' ? 'toast_exit' : ''}
                        `}
                        >
                            <div className="toast_content">
                                <p
                                    className={`
                                    toast_indicator
                                    toast_indicator_${item.type}
                                `}
                                />

                                <p>{item.message}</p>
                            </div>
                        </div>
                    );
                })}
        </div>
    );
};

export default Toast;
