'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from '@/navigation';

import Presence from '../Ui/Presence';

import './SideNav.scss';

export type SideNavItem = {
    key: string;
    label: string;
    hint?: string;
    href?: string;
    icon?: any;
    avatar?: any;
    active?: boolean;
    badge?: number;
    dot?: boolean;
    onClick?: (event: any) => void;
};

export const SideNavList = ({ items }: { items: SideNavItem[] }) => (
    <>
        {items.map((item) => {
            const Icon = item.icon;
            const className =
                'side_nav_item app-transition' +
                (item.active ? ' side_nav_item_active' : '');
            const content = (
                <>
                    <Presence
                        value={item.badge && item.badge > 0 ? item.badge : 0}
                        className="side_nav_badge"
                    >
                        {(count) =>
                            typeof count === 'number' && count > 99
                                ? '99+'
                                : count
                        }
                    </Presence>
                    <Presence
                        value={Boolean(item.dot)}
                        className="side_nav_dot"
                        aria-hidden="true"
                    />
                    {Icon ? <Icon className="side_nav_icon" /> : null}
                    {item.avatar ?? null}
                    <span className="side_nav_copy">
                        <span className="side_nav_label">{item.label}</span>
                        {item.hint ? (
                            <span className="side_nav_hint">{item.hint}</span>
                        ) : null}
                    </span>
                </>
            );

            return item.href ? (
                <Link
                    key={item.key}
                    href={item.href}
                    className={className}
                    aria-current={item.active ? 'page' : undefined}
                    onClick={item.onClick}
                >
                    {content}
                </Link>
            ) : (
                <button
                    key={item.key}
                    type="button"
                    className={className}
                    aria-current={item.active ? 'page' : undefined}
                    onClick={item.onClick}
                >
                    {content}
                </button>
            );
        })}
    </>
);

type SideNavProps = {
    variant?: 'app' | 'section';
    label?: string;
    header?: any;
    footer?: any;
    className?: string;
    children?: any;
};

const SideNav = ({
    variant = 'section',
    label,
    header,
    footer,
    className = '',
    children,
}: SideNavProps) => {
    const Root: any = variant === 'app' ? 'aside' : 'div';
    const bodyRef = useRef<HTMLElement>(null);
    const [indicator, setIndicator] = useState<{
        x: number;
        y: number;
        w: number;
        h: number;
    } | null>(null);

    useLayoutEffect(() => {
        const body = bodyRef.current;
        const measure = () => {
            const active = body?.querySelector<HTMLElement>(
                '.side_nav_item_active',
            );
            if (!active) {
                setIndicator(null);
                return;
            }
            const next = {
                x: active.offsetLeft,
                y: active.offsetTop,
                w: active.offsetWidth,
                h: active.offsetHeight,
            };
            setIndicator((prev) =>
                prev &&
                prev.x === next.x &&
                prev.y === next.y &&
                prev.w === next.w &&
                prev.h === next.h
                    ? prev
                    : next,
            );
        };

        measure();
        window.addEventListener('resize', measure);

        const observer =
            typeof ResizeObserver === 'undefined'
                ? null
                : new ResizeObserver(measure);
        if (body && observer) {
            observer.observe(body);
            body.querySelectorAll('.side_nav_item').forEach((item) =>
                observer.observe(item),
            );
        }

        let cancelled = false;
        document.fonts?.ready.then(() => {
            if (!cancelled) {
                measure();
            }
        });

        return () => {
            cancelled = true;
            observer?.disconnect();
            window.removeEventListener('resize', measure);
        };
    });

    return (
        <Root
            className={`side_nav side_nav_${variant} ${className}`}
            aria-label={label}
        >
            {header ? <div className="side_nav_header">{header}</div> : null}
            <nav
                ref={bodyRef}
                className={`side_nav_body${indicator ? ' side_nav_has_indicator' : ''}`}
                aria-label={label}
            >
                {indicator ? (
                    <span
                        className="side_nav_indicator"
                        aria-hidden="true"
                        style={
                            {
                                '--nav-x': `${indicator.x}px`,
                                '--nav-y': `${indicator.y}px`,
                                '--nav-w': `${indicator.w}px`,
                                '--nav-h': `${indicator.h}px`,
                            } as React.CSSProperties
                        }
                    />
                ) : null}
                {children}
            </nav>
            {footer ? <div className="side_nav_footer">{footer}</div> : null}
        </Root>
    );
};

export default SideNav;
