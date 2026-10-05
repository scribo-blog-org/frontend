'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import './InfiniteScroll.scss';

import Loading from '../Loading';

const findScroller = (node: HTMLElement | null) => {
    let parent = node?.parentElement || null;

    while (parent) {
        const { overflowY } = getComputedStyle(parent);

        if (['auto', 'scroll', 'overlay'].includes(overflowY)) {
            return parent;
        }

        parent = parent.parentElement;
    }

    return null;
};

const InfiniteScroll = ({
    children,
    onLoadNext,
    hasNext = false,
    loadingNext = false,
    rootMargin = '400px',
    loader,
    className = '',
}: {
    children: ReactNode;
    onLoadNext?: () => void;
    hasNext?: boolean;
    loadingNext?: boolean;
    rootMargin?: string;
    loader?: ReactNode;
    className?: string;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const onLoadNextRef = useRef(onLoadNext);

    onLoadNextRef.current = onLoadNext;

    // The observer is recreated whenever loading finishes, which makes it
    // report the current state again and keeps loading while the sentinel is
    // still in view.
    useEffect(() => {
        if (!hasNext || loadingNext || !bottomRef.current) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries: IntersectionObserverEntry[]) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    onLoadNextRef.current?.();
                }
            },
            { root: findScroller(containerRef.current), rootMargin },
        );

        observer.observe(bottomRef.current);

        return () => observer.disconnect();
    }, [hasNext, loadingNext, rootMargin]);

    return (
        <div
            className={`infinite-scroll ${className}`.trim()}
            ref={containerRef}
        >
            {children}

            {hasNext && (
                <div className="infinite-scroll_sentinel" ref={bottomRef}>
                    {loadingNext && (loader ?? <Loading size={28} />)}
                </div>
            )}
        </div>
    );
};

export default InfiniteScroll;
