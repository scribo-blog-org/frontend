'use client';

import './Panel.scss';

export type PillTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

// A titled group: a small caption above a soft frame that holds the rows.
// `flat` drops the frame and the row cards, for a group that already sits in a
// bigger block: the rows are then only divided by thin lines.
export const Panel = ({
    title,
    hint,
    action,
    flat = false,
    children,
    className,
}: any) => (
    <section
        className={`panel_group${flat ? ' panel_group_flat' : ''}${className ? ` ${className}` : ''}`}
    >
        {title || action ? (
            <header className="panel_head">
                <div className="panel_head_text">
                    {title ? <h3 className="panel_title">{title}</h3> : null}
                    {hint ? <p className="panel_hint">{hint}</p> : null}
                </div>
                {action ? (
                    <div className="panel_head_action">{action}</div>
                ) : null}
            </header>
        ) : null}
        <div className={`panel${flat ? ' panel_flat' : ''}`}>{children}</div>
    </section>
);

// One row inside a Panel: icon, title with a muted description, and a control
// (select, toggle, button, pill) on the right. A row with onClick is a button.
export const PanelRow = ({
    icon,
    title,
    description,
    trailing,
    onClick,
    danger = false,
    disabled = false,
    children,
    className,
}: any) => {
    const Tag: any = onClick ? 'button' : 'div';

    return (
        <Tag
            type={onClick ? 'button' : undefined}
            className={`panel_row${onClick ? ' panel_row_action' : ''}${danger ? ' panel_row_danger' : ''}${disabled ? ' panel_row_disabled' : ''}${className ? ` ${className}` : ''}`}
            onClick={onClick}
            disabled={onClick ? disabled : undefined}
        >
            {icon ? <span className="panel_row_icon">{icon}</span> : null}
            <span className="panel_row_text">
                {title ? (
                    <span className="panel_row_title">{title}</span>
                ) : null}
                {description ? (
                    <span className="panel_row_description">{description}</span>
                ) : null}
                {children}
            </span>
            {trailing ? (
                <span className="panel_row_trailing">{trailing}</span>
            ) : null}
        </Tag>
    );
};

export const Pill = ({ tone = 'neutral', icon, children, className }: any) => (
    <span className={`pill pill_${tone}${className ? ` ${className}` : ''}`}>
        {icon ? <span className="pill_icon">{icon}</span> : null}
        {children}
    </span>
);

// A tinted strip for one important sentence (a result, a warning, a hint).
export const Banner = ({ tone = 'info', icon, action, children }: any) => (
    <div className={`notice notice_${tone}`}>
        {icon ? <span className="notice_icon">{icon}</span> : null}
        <p className="notice_text">{children}</p>
        {action ? <span className="notice_action">{action}</span> : null}
    </div>
);

// Key and value pairs in a tidy grid, like the metadata block of a detail card.
export const MetaGrid = ({ items }: any) => (
    <dl className="meta_grid">
        {items
            .filter(
                (item: any) =>
                    item &&
                    item.value !== null &&
                    item.value !== undefined &&
                    item.value !== '',
            )
            .map((item: any) => (
                <div className="meta_grid_item" key={item.label}>
                    <dt className="meta_grid_label">
                        {item.icon ? (
                            <span className="meta_grid_icon">{item.icon}</span>
                        ) : null}
                        {item.label}
                    </dt>
                    <dd className="meta_grid_value">{item.value}</dd>
                </div>
            ))}
    </dl>
);
