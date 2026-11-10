'use client';

import { Link } from '@/navigation';

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
                    {item.badge && item.badge > 0 ? (
                        <span className="side_nav_badge">
                            {item.badge > 99 ? '99+' : item.badge}
                        </span>
                    ) : null}
                    {item.dot ? (
                        <span className="side_nav_dot" aria-hidden="true" />
                    ) : null}
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

    return (
        <Root
            className={`side_nav side_nav_${variant} ${className}`}
            aria-label={label}
        >
            {header ? <div className="side_nav_header">{header}</div> : null}
            <nav className="side_nav_body" aria-label={label}>
                {children}
            </nav>
            {footer ? <div className="side_nav_footer">{footer}</div> : null}
        </Root>
    );
};

export default SideNav;
