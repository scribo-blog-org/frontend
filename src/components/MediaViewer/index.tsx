'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import './MediaViewer.scss';

export type MediaViewerItem = {
    type: 'image' | 'gif' | 'video';
    src: string;
    poster?: string;
};

type MediaViewerProps = {
    items: MediaViewerItem[];
    index?: number;
    onClose: () => void;
};

const CloseIcon = () => (
    <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
    >
        <path d="M6 6l12 12M18 6L6 18" />
    </svg>
);

const ChevronIcon = ({ direction }: { direction: 'left' | 'right' }) => (
    <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
);

const MediaViewer = ({ items, index = 0, onClose }: MediaViewerProps) => {
    const [current, setCurrent] = useState(index);
    const touchStart = useRef<number | null>(null);
    const count = items.length;

    const go = useCallback(
        (delta: number) => {
            setCurrent((value) => (value + delta + count) % count);
        },
        [count],
    );

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            } else if (event.key === 'ArrowRight' && count > 1) {
                go(1);
            } else if (event.key === 'ArrowLeft' && count > 1) {
                go(-1);
            }
        };

        document.addEventListener('keydown', onKey);
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = previous;
        };
    }, [onClose, go, count]);

    if (typeof document === 'undefined' || !count) {
        return null;
    }

    const item = items[Math.min(current, count - 1)];

    return createPortal(
        <div
            className="media_viewer"
            role="dialog"
            aria-modal="true"
            aria-label={
                item.type === 'video' ? 'Video preview' : 'Image preview'
            }
            onClick={(event) => {
                event.stopPropagation();
                onClose();
            }}
            onTouchStart={(event) => {
                touchStart.current = event.touches[0].clientX;
            }}
            onTouchEnd={(event) => {
                if (touchStart.current === null || count < 2) {
                    return;
                }
                const delta =
                    event.changedTouches[0].clientX - touchStart.current;
                touchStart.current = null;
                if (Math.abs(delta) > 50) {
                    go(delta < 0 ? 1 : -1);
                }
            }}
        >
            <button
                type="button"
                className="media_viewer_button media_viewer_close"
                aria-label="Close"
                onClick={(event) => {
                    event.stopPropagation();
                    onClose();
                }}
            >
                <CloseIcon />
            </button>

            {count > 1 ? (
                <>
                    <button
                        type="button"
                        className="media_viewer_button media_viewer_nav media_viewer_nav_prev"
                        aria-label="Previous"
                        onClick={(event) => {
                            event.stopPropagation();
                            go(-1);
                        }}
                    >
                        <ChevronIcon direction="left" />
                    </button>
                    <button
                        type="button"
                        className="media_viewer_button media_viewer_nav media_viewer_nav_next"
                        aria-label="Next"
                        onClick={(event) => {
                            event.stopPropagation();
                            go(1);
                        }}
                    >
                        <ChevronIcon direction="right" />
                    </button>
                    <span className="media_viewer_counter">
                        {current + 1} / {count}
                    </span>
                </>
            ) : null}

            <div
                className="media_viewer_stage"
                onClick={(event) => event.stopPropagation()}
            >
                {item.type === 'video' ? (
                    <video
                        key={item.src}
                        className="media_viewer_media"
                        src={item.src}
                        poster={item.poster}
                        controls
                        autoPlay
                        playsInline
                    />
                ) : (
                    <img
                        key={item.src}
                        className="media_viewer_media"
                        src={item.src}
                        alt=""
                        draggable={false}
                    />
                )}
            </div>
        </div>,
        document.body,
    );
};

export default MediaViewer;
