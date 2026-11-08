'use client';

import { useEffect, useRef, useState } from 'react';
import { Link } from '@/navigation';

import { deltaLabel, formatDay, formatHour, formatNumber } from './format';

export const TrendChart = ({
    series,
    keys,
    hourly = false,
    format = formatNumber,
}: any) => {
    const formatTick = hourly ? formatHour : formatDay;
    const [hover, setHover] = useState<any>(null);
    const [cursor, setCursor] = useState<any>(null);
    const wrapRef = useRef<any>(null);
    const [width, setWidth] = useState<number>(720);

    useEffect(() => {
        const element = wrapRef.current;
        if (!element) {
            return;
        }

        const measure = () =>
            setWidth(Math.max(240, Math.round(element.clientWidth)));
        measure();

        const observer = new ResizeObserver(measure);
        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    const height = 200;
    const pad = { top: 12, right: 16, bottom: 28, left: 40 };
    const innerWidth = width - pad.left - pad.right;
    const innerHeight = height - pad.top - pad.bottom;

    const maxValue = Math.max(
        1,
        ...series.flatMap((point: any) =>
            keys.map((item: any) => Number(point[item.key] || 0)),
        ),
    );

    const moveCursor = (event: any) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setCursor({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            w: rect.width,
            h: rect.height,
        });
    };

    const toX = (index: any) => {
        if (series.length <= 1) {
            return pad.left;
        }
        return pad.left + (index / (series.length - 1)) * innerWidth;
    };

    const toY = (value: any) =>
        pad.top + innerHeight - (value / maxValue) * innerHeight;

    const polylines = keys.map((item: any) => ({
        ...item,
        points: series
            .map(
                (point: any, index: any) =>
                    `${toX(index)},${toY(Number(point[item.key] || 0))}`,
            )
            .join(' '),
    }));

    const areaPath = (() => {
        if (!series.length) {
            return '';
        }
        const first = polylines[0];
        const start = `${toX(0)},${toY(0)}`;
        const end = `${toX(series.length - 1)},${toY(0)}`;
        return `M ${start} L ${first.points} L ${end} Z`;
    })();

    const maxTicks = Math.max(2, Math.floor(innerWidth / 72));
    const tickStep = Math.ceil(series.length / maxTicks);
    const ticks = series.filter(
        (_: any, index: any) => (series.length - 1 - index) % tickStep === 0,
    );

    const yTicks = [0, 0.5, 1].map((ratio: any) =>
        Math.round(maxValue * ratio),
    );
    const hitWidth = series.length ? innerWidth / series.length : innerWidth;
    const active = hover != null ? series[hover] : null;

    const tooltipStyle = cursor
        ? {
              left: cursor.x,
              top: cursor.y,
              transform: `translate(${cursor.x > cursor.w * 0.62 ? 'calc(-100% - 12px)' : '12px'}, ${
                  cursor.y > cursor.h * 0.7 ? 'calc(-100% - 8px)' : '8px'
              })`,
          }
        : undefined;

    return (
        <div
            ref={wrapRef}
            className="analytics_chart_wrap"
            onMouseMove={moveCursor}
            onMouseLeave={() => {
                setHover(null);
                setCursor(null);
            }}
        >
            <svg
                className="analytics_chart"
                viewBox={`0 0 ${width} ${height}`}
                role="img"
            >
                {yTicks.map((value: any) => (
                    <g key={value}>
                        <line
                            className="analytics_chart_grid"
                            x1={pad.left}
                            y1={toY(value)}
                            x2={pad.left + innerWidth}
                            y2={toY(value)}
                        />
                        <text
                            className="analytics_chart_ytick"
                            x={pad.left - 8}
                            y={toY(value) + 3}
                            textAnchor="end"
                        >
                            {format(value)}
                        </text>
                    </g>
                ))}
                {areaPath ? (
                    <path
                        className="analytics_chart_area"
                        d={areaPath}
                        fill={keys[0]?.color}
                    />
                ) : null}
                {polylines.map((line: any) => (
                    <polyline
                        key={line.key}
                        className="analytics_chart_line"
                        points={line.points}
                        stroke={line.color}
                        fill="none"
                    />
                ))}
                {active ? (
                    <g className="analytics_chart_hint">
                        <line
                            className="analytics_chart_guide"
                            x1={toX(hover)}
                            y1={pad.top}
                            x2={toX(hover)}
                            y2={pad.top + innerHeight}
                        />
                        {keys.map((item: any) => (
                            <circle
                                key={item.key}
                                className="analytics_chart_dot"
                                cx={toX(hover)}
                                cy={toY(Number(active[item.key] || 0))}
                                r={4}
                                fill={item.color}
                            />
                        ))}
                    </g>
                ) : null}
                {series.map((point: any, index: any) => (
                    <rect
                        className="app-transition"
                        key={`hit-${point.date}`}
                        x={toX(index) - hitWidth / 2}
                        y={pad.top}
                        width={hitWidth}
                        height={innerHeight}
                        fill="transparent"
                        onMouseEnter={() => setHover(index)}
                    />
                ))}
                {ticks.map((point: any) => {
                    const index = series.indexOf(point);
                    return (
                        <text
                            key={point.date}
                            className="analytics_chart_tick"
                            x={toX(index)}
                            y={height - 8}
                            textAnchor={
                                index === series.length - 1
                                    ? 'end'
                                    : index === 0
                                      ? 'start'
                                      : 'middle'
                            }
                        >
                            {formatTick(point.date)}
                        </text>
                    );
                })}
            </svg>
            {active && cursor ? (
                <div className="analytics_chart_tooltip" style={tooltipStyle}>
                    <p>{formatTick(active.date)}</p>
                    {keys.map((item: any) => (
                        <p key={item.key}>
                            {item.label}: {format(active[item.key])}
                        </p>
                    ))}
                </div>
            ) : null}
            {keys.length > 1 ? (
                <div className="analytics_legend">
                    {keys.map((item: any) => (
                        <span className="analytics_legend_item" key={item.key}>
                            <span
                                className="analytics_legend_swatch"
                                style={{ background: item.color }}
                            />
                            {item.label}
                        </span>
                    ))}
                </div>
            ) : null}
        </div>
    );
};

export const RankedBars = ({ items, empty, wideLabel }: any) => {
    const maxValue = Math.max(
        1,
        ...items.map((item: any) => item.count || item.visits || 0),
    );

    if (!items.length) {
        return (
            <p className="analytics_empty">
                {empty || 'No data for this period'}
            </p>
        );
    }

    return (
        <div
            className={`analytics_bars${wideLabel ? ' analytics_bars_wide' : ''}`}
        >
            {items.map((item: any) => {
                const label =
                    item.label ||
                    item.type ||
                    item.path ||
                    item.query ||
                    item.tag ||
                    item.title;
                const value =
                    item.count ?? item.visits ?? item.views_count ?? 0;
                const note = item.note || null;

                return (
                    <div className="analytics_bars_row" key={item.key || label}>
                        {item.href ? (
                            <Link
                                className={`analytics_bars_label${item.hashtag ? ' hashtag' : ''}`}
                                href={item.href}
                                title={label}
                            >
                                {label}
                            </Link>
                        ) : (
                            <p className="analytics_bars_label" title={label}>
                                {label}
                            </p>
                        )}
                        <div className="analytics_bars_track">
                            <div
                                className="analytics_bars_fill app-transition"
                                style={{
                                    width: `${Math.max(6, (value / maxValue) * 100)}%`,
                                }}
                            />
                        </div>
                        <p className="analytics_bars_value">
                            {item.valueLabel || formatNumber(value)}
                            {note ? <span> · {note}</span> : null}
                        </p>
                    </div>
                );
            })}
        </div>
    );
};

export const Group = ({ title, hint, children }: any) => (
    <section className="analytics_group">
        <div className="analytics_group_head">
            <h3 className="kicker">{title}</h3>
            {hint ? <p className="analytics_group_hint">{hint}</p> : null}
        </div>
        {children}
    </section>
);

export const Block = ({ title, hint, chart = false, children }: any) => (
    <section
        className={`analytics_block app-transition${chart ? ' analytics_block_chart' : ''}`}
    >
        {title ? <h4 className="analytics_block_title">{title}</h4> : null}
        {hint ? <p className="analytics_block_hint">{hint}</p> : null}
        {children}
    </section>
);

export const StatCard = ({ label, value, display, previous, hint }: any) => {
    const delta = previous === undefined ? null : deltaLabel(value, previous);

    return (
        <div className="analytics_stat app-transition">
            <p className="analytics_stat_label">{label}</p>
            <p className="analytics_stat_value">
                {display ?? formatNumber(value)}
            </p>
            {hint ? <p className="analytics_stat_hint">{hint}</p> : null}
            {delta ? (
                <p
                    className={`analytics_stat_delta analytics_stat_delta_${delta.tone}`}
                >
                    {delta.text}
                </p>
            ) : null}
        </div>
    );
};
