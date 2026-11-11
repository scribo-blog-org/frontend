'use client';

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import './InfiniteScroll.scss';

import Loading from '../Loading';

const SENTINEL_CLASS = 'infinite-scroll_sentinel';

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

type Anchor = {
    el: Element;
    offset: number;
    first: Element | null;
    topSentinel: boolean;
};

/**
 * Infinite list. With `onLoadPrev` it becomes a windowed list: the owner may
 * drop rows from either end after loading, and this component keeps the
 * visible rows where they are (scroll anchoring) and loads in the direction
 * the user is scrolling.
 */
const InfiniteScroll = ({
    children,
    onLoadNext,
    hasNext = false,
    loadingNext = false,
    onLoadPrev,
    hasPrev = false,
    loadingPrev = false,
    rootMargin = '400px',
    loader,
    className = '',
}: {
    children: ReactNode;
    onLoadNext?: () => void;
    hasNext?: boolean;
    loadingNext?: boolean;
    onLoadPrev?: () => void;
    hasPrev?: boolean;
    loadingPrev?: boolean;
    rootMargin?: string;
    loader?: ReactNode;
    className?: string;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const onLoadNextRef = useRef(onLoadNext);
    const windowed = Boolean(onLoadPrev);
    const live = useRef({
        hasNext,
        loadingNext,
        hasPrev,
        loadingPrev,
        onLoadNext,
        onLoadPrev,
    });
    const scroll = useRef<{
        lastTop: number;
        dir: 'up' | 'down' | 'none';
        anchor: Anchor | null;
    }>({ lastTop: 0, dir: 'none', anchor: null });

    onLoadNextRef.current = onLoadNext;

    useEffect(() => {
        if (windowed || !hasNext || loadingNext || !bottomRef.current) {
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
    }, [windowed, hasNext, loadingNext, rootMargin]);

    useLayoutEffect(() => {
        const container = containerRef.current;

        live.current = {
            hasNext,
            loadingNext,
            hasPrev,
            loadingPrev,
            onLoadNext,
            onLoadPrev,
        };

        if (!windowed || !container) {
            return;
        }

        const scroller = findScroller(container);

        if (!scroller) {
            return;
        }

        const margin = parseInt(rootMargin, 10) || 0;
        const state = scroll.current;

        const rows = () =>
            Array.from(container.children).filter(
                (child) => !child.classList.contains(SENTINEL_CLASS),
            );
        const hasTopSentinel = () =>
            container.firstElementChild?.classList.contains(SENTINEL_CLASS) ??
            false;

        // remember the first visible row and where it is on screen
        const record = () => {
            const top = scroller.getBoundingClientRect().top;
            const list = rows();
            const visible = list.find(
                (row) => row.getBoundingClientRect().bottom > top,
            );

            state.anchor = visible
                ? {
                      el: visible,
                      offset: visible.getBoundingClientRect().top - top,
                      first: list[0] ?? null,
                      topSentinel: hasTopSentinel(),
                  }
                : null;
        };

        // load in the direction of the scroll, once it gets close to the end
        const check = () => {
            const current = live.current;
            const s = scroller.getBoundingClientRect();
            const c = container.getBoundingClientRect();

            if (state.dir === 'up') {
                if (
                    current.hasPrev &&
                    !current.loadingPrev &&
                    s.top - c.top < margin
                ) {
                    current.onLoadPrev?.();
                }

                return;
            }

            if (
                current.hasNext &&
                !current.loadingNext &&
                c.bottom - s.bottom < margin
            ) {
                current.onLoadNext?.();
            }
        };

        // rows were added or removed above the viewport: put the same row
        // back where it was so the list doesn't jump
        const previous = state.anchor;

        if (
            previous &&
            previous.el.isConnected &&
            (previous.first !== rows()[0] ||
                previous.topSentinel !== hasTopSentinel())
        ) {
            const top = scroller.getBoundingClientRect().top;
            const delta =
                previous.el.getBoundingClientRect().top - top - previous.offset;

            if (delta) {
                scroller.scrollTop += delta;
            }
        }

        // a correction is not the user scrolling
        state.lastTop = scroller.scrollTop;
        record();

        let frame = 0;
        const schedule = () => {
            if (!frame) {
                frame = requestAnimationFrame(() => {
                    frame = 0;
                    check();
                });
            }
        };
        const onScroll = () => {
            const top = scroller.scrollTop;

            if (top < state.lastTop) {
                state.dir = 'up';
            } else if (top > state.lastTop) {
                state.dir = 'down';
            }

            state.lastTop = top;
            record();
            schedule();
        };

        scroller.addEventListener('scroll', onScroll, { passive: true });
        schedule();

        return () => {
            scroller.removeEventListener('scroll', onScroll);
            cancelAnimationFrame(frame);
        };
    });

    return (
        <div
            className={`infinite-scroll ${className}`.trim()}
            ref={containerRef}
        >
            {windowed && hasPrev && loadingPrev ? (
                <div className={SENTINEL_CLASS}>
                    {loader ?? <Loading size={28} />}
                </div>
            ) : null}

            {children}

            {hasNext && (
                <div className={SENTINEL_CLASS} ref={bottomRef}>
                    {loadingNext && (loader ?? <Loading size={28} />)}
                </div>
            )}
        </div>
    );
};

export default InfiniteScroll;
