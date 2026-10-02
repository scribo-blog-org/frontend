'use client';

import './TabsPage.scss';

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

import { useSearchParams } from '@/navigation';

const TabsPage = ({ pages, label, className = '' }: any) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const barRef = useRef<any>(null);
    const tabsRef = useRef<any[]>([]);
    const [indicator, setIndicator] = useState<any>({ left: 0, width: 0 });

    const requested = searchParams.get('tab') ?? pages[0]?.key;
    const found = pages.findIndex(
        (page: any) =>
            page.key === requested || (page.aliases || []).includes(requested),
    );
    const activeIndex = found === -1 ? 0 : found;
    const active = pages[activeIndex];

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

    useLayoutEffect(() => {
        updateIndicator();
    }, [updateIndicator, pages]);

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

        return () => {
            window.removeEventListener('resize', updateIndicator);
            observer?.disconnect();
        };
    }, [updateIndicator]);

    if (!active) {
        return null;
    }

    return (
        <div className={`tabs_page ${className}`.trim()}>
            <div
                ref={barRef}
                className="tabs_page_bar"
                role="tablist"
                aria-label={label}
            >
                <div
                    className="tabs_page_indicator"
                    style={{
                        width: indicator.width,
                        transform: `translateX(${indicator.left}px)`,
                        opacity: indicator.width > 0 ? 1 : 0,
                    }}
                />
                {pages.map((page: any, index: number) => (
                    <button
                        key={page.key}
                        ref={(element: any) => {
                            tabsRef.current[index] = element;
                        }}
                        type="button"
                        role="tab"
                        aria-selected={page.key === active.key}
                        className={`tabs_page_tab${
                            page.key === active.key
                                ? ' tabs_page_tab_active'
                                : ''
                        }`}
                        onClick={() =>
                            setSearchParams(
                                { tab: page.key },
                                { replace: true },
                            )
                        }
                    >
                        {page.icon}
                        <span>{page.title}</span>
                    </button>
                ))}
            </div>

            <div key={active.key} className="tabs_page_content" role="tabpanel">
                {active.content}
            </div>
        </div>
    );
};

export default TabsPage;
