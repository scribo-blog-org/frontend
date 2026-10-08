'use client';

import './Tabs.scss';

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

const Tabs = ({ items, activeKey, onChange, label, className = '' }: any) => {
    const barRef = useRef<any>(null);
    const tabsRef = useRef<any[]>([]);
    const [indicator, setIndicator] = useState<any>({ left: 0, width: 0 });

    const activeIndex = Math.max(
        0,
        items.findIndex((item: any) => item.key === activeKey),
    );

    const updateIndicator = useCallback(() => {
        const button = tabsRef.current[activeIndex];

        if (!button) {
            setIndicator({ left: 0, width: 0 });
            return;
        }

        setIndicator({
            left: button.offsetLeft,
            width: button.offsetWidth,
        });
    }, [activeIndex]);

    const revealActiveTab = useCallback(() => {
        const bar = barRef.current;
        const button = tabsRef.current[activeIndex];

        if (!bar || !button) {
            return;
        }

        const target =
            button.offsetLeft - (bar.clientWidth - button.offsetWidth) / 2;

        bar.scrollTo({
            left: Math.max(0, target),
            top: 0,
        });
    }, [activeIndex]);

    useLayoutEffect(() => {
        updateIndicator();
        revealActiveTab();
    }, [updateIndicator, revealActiveTab, items]);

    useEffect(() => {
        window.addEventListener('resize', updateIndicator);

        const bar = barRef.current;
        const observer = bar
            ? new ResizeObserver(() => {
                  updateIndicator();
              })
            : null;

        if (bar && observer) {
            observer.observe(bar);
        }

        const lockVertical = () => {
            if (bar && bar.scrollTop !== 0) {
                bar.scrollTop = 0;
            }
        };

        const onWheel = (event: WheelEvent) => {
            if (!bar) {
                return;
            }

            const vertical = Math.abs(event.deltaY) > Math.abs(event.deltaX);

            if (!vertical || bar.scrollHeight <= bar.clientHeight) {
                return;
            }

            event.preventDefault();

            let parent = bar.parentElement;

            while (parent) {
                const style = getComputedStyle(parent);
                const canScroll = /(auto|scroll)/.test(style.overflowY);

                if (canScroll && parent.scrollHeight > parent.clientHeight) {
                    parent.scrollTop += event.deltaY;
                    break;
                }

                parent = parent.parentElement;
            }
        };

        bar?.addEventListener('scroll', lockVertical);
        bar?.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            window.removeEventListener('resize', updateIndicator);
            observer?.disconnect();
            bar?.removeEventListener('scroll', lockVertical);
            bar?.removeEventListener('wheel', onWheel);
        };
    }, [updateIndicator]);

    return (
        <div
            ref={barRef}
            className={`tabs ${className}`.trim()}
            role="tablist"
            aria-label={label}
        >
            <div
                className="tabs_indicator"
                style={{
                    width: indicator.width,
                    transform: `translateX(${indicator.left}px)`,
                    opacity: indicator.width > 0 ? 1 : 0,
                }}
            />
            {items.map((item: any, index: number) => (
                <button
                    key={item.key}
                    ref={(element: any) => {
                        tabsRef.current[index] = element;
                    }}
                    type="button"
                    role="tab"
                    aria-selected={item.key === activeKey}
                    className={`tabs_tab${
                        item.key === activeKey ? ' tabs_tab_active' : ''
                    }`}
                    onClick={() => onChange?.(item.key)}
                >
                    {item.icon}
                    <span>{item.title}</span>
                    {item.dot ? (
                        <i className="tabs_tab_dot" aria-hidden="true" />
                    ) : null}
                </button>
            ))}
        </div>
    );
};

export default Tabs;
