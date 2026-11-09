'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import './Lightbox.scss';

type LightboxProps = {
    items: string[];
    index?: number;
    onClose: () => void;
};

const Lightbox = ({ items, index = 0, onClose }: LightboxProps) => {
    const [current, setCurrent] = useState(index);
    const touchStart = useRef<number | null>(null);
    const count = items.length;

    const go = (delta: number) => {
        setCurrent((value) => (value + delta + count) % count);
    };

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            } else if (event.key === 'ArrowRight' && count > 1) {
                setCurrent((value) => (value + 1) % count);
            } else if (event.key === 'ArrowLeft' && count > 1) {
                setCurrent((value) => (value - 1 + count) % count);
            }
        };

        document.addEventListener('keydown', onKey);
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = previous;
        };
    }, [onClose, count]);

    if (typeof document === 'undefined' || !count) {
        return null;
    }

    return createPortal(
        <div
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
            onClick={onClose}
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
                className="lightbox_close"
                aria-label="Close"
                onClick={onClose}
            >
                ×
            </button>
            {count > 1 ? (
                <>
                    <button
                        type="button"
                        className="lightbox_nav lightbox_nav_prev"
                        aria-label="Previous"
                        onClick={(event) => {
                            event.stopPropagation();
                            go(-1);
                        }}
                    >
                        ‹
                    </button>
                    <button
                        type="button"
                        className="lightbox_nav lightbox_nav_next"
                        aria-label="Next"
                        onClick={(event) => {
                            event.stopPropagation();
                            go(1);
                        }}
                    >
                        ›
                    </button>
                    <span className="lightbox_counter">
                        {current + 1} / {count}
                    </span>
                </>
            ) : null}
            <img
                className="lightbox_image"
                src={items[current]}
                alt=""
                onClick={(event) => event.stopPropagation()}
            />
        </div>,
        document.body,
    );
};

export default Lightbox;
