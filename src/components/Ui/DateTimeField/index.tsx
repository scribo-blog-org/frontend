'use client';

import { useEffect, useRef, useState } from 'react';

import './DateTimeField.scss';

import CalendarIcon from '../../../assets/svg/calendar-icon.svg';
import ChevronDownIcon from '../../../assets/svg/chevron-down.svg';
import CrossIcon from '../../../assets/svg/cross-icon.svg';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

const pad = (value: number) => String(value).padStart(2, '0');

const dayKey = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const toValue = (date: Date) =>
    `${dayKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const parse = (value: string): Date | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value || '');

    if (!match) {
        return null;
    }

    const [, y, m, d, hh, mm] = match.map(Number);

    return new Date(y, m - 1, d, hh, mm);
};

const display = (date: Date | null) =>
    date
        ? `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
        : '';

const monthGrid = (view: Date) => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;

    return Array.from(
        { length: 42 },
        (_, index) =>
            new Date(first.getFullYear(), first.getMonth(), 1 - offset + index),
    );
};

const clamp = (date: Date, min: Date | null, max: Date | null) => {
    if (min && date < min) {
        return min;
    }

    if (max && date > max) {
        return max;
    }

    return date;
};

type Props = {
    label?: string;
    value?: string;
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    defaultTime?: string;
    className?: string;
};

const DateTimeField = ({
    label,
    value = '',
    onChange,
    min,
    max,
    defaultTime = '00:00',
    className = '',
}: Props) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const current = parse(value);
    const minDate = parse(min ?? '');
    const maxDate = parse(max ?? '');
    const [open, setOpen] = useState<boolean>(false);
    const [view, setView] = useState<Date>(() => current ?? new Date());
    const [hours, setHours] = useState<string>(
        current ? pad(current.getHours()) : defaultTime.slice(0, 2),
    );
    const [minutes, setMinutes] = useState<string>(
        current ? pad(current.getMinutes()) : defaultTime.slice(3, 5),
    );

    useEffect(() => {
        if (!open) {
            return;
        }

        const close = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const escape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('pointerdown', close);
        document.addEventListener('keydown', escape);

        return () => {
            document.removeEventListener('pointerdown', close);
            document.removeEventListener('keydown', escape);
        };
    }, [open]);

    const toggle = () => {
        if (!open) {
            const base = current ?? new Date();

            setView(new Date(base.getFullYear(), base.getMonth(), 1));
            setHours(
                current ? pad(current.getHours()) : defaultTime.slice(0, 2),
            );
            setMinutes(
                current ? pad(current.getMinutes()) : defaultTime.slice(3, 5),
            );
        }

        setOpen((state) => !state);
    };

    const commit = (date: Date) => {
        const next = clamp(date, minDate, maxDate);

        onChange(toValue(next));
        setHours(pad(next.getHours()));
        setMinutes(pad(next.getMinutes()));
    };

    const pickDay = (day: Date) => {
        const hh = Number(hours) || 0;
        const mm = Number(minutes) || 0;

        commit(
            new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm),
        );
    };

    const commitTime = (nextHours: string, nextMinutes: string) => {
        const hh = Math.min(Number(nextHours) || 0, 23);
        const mm = Math.min(Number(nextMinutes) || 0, 59);
        const base = current ?? new Date();

        commit(
            new Date(
                base.getFullYear(),
                base.getMonth(),
                base.getDate(),
                hh,
                mm,
            ),
        );
    };

    const step = (field: 'h' | 'm', delta: number) => {
        const hh = Number(hours) || 0;
        const mm = Number(minutes) || 0;

        if (field === 'h') {
            commitTime(String((hh + delta + 24) % 24), String(mm));
        } else {
            commitTime(String(hh), String((mm + delta + 60) % 60));
        }
    };

    const timeKeys =
        (field: 'h' | 'm') =>
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                step(field, 1);
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                step(field, -1);
            } else if (event.key === 'Enter') {
                event.preventDefault();
                commitTime(hours, minutes);
            }
        };

    const todayKey = dayKey(new Date());
    const selectedKey = current ? dayKey(current) : null;
    const minKey = minDate ? dayKey(minDate) : null;
    const maxKey = maxDate ? dayKey(maxDate) : null;

    return (
        <div
            ref={rootRef}
            className={`dt_field${open ? ' dt_field_open' : ''}${value ? ' dt_field_filled' : ''} ${className}`.trim()}
        >
            <div
                className="dt_field_trigger app-transition"
                role="button"
                tabIndex={0}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={toggle}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggle();
                    }
                }}
            >
                {label ? <span className="dt_field_label">{label}</span> : null}
                <span className="dt_field_value">
                    {display(current) || 'dd.mm.yyyy --:--'}
                </span>
                {value ? (
                    <button
                        type="button"
                        className="dt_field_clear"
                        aria-label="Clear"
                        onClick={(event) => {
                            event.stopPropagation();
                            onChange('');
                        }}
                    >
                        <CrossIcon />
                    </button>
                ) : null}
                <CalendarIcon className="dt_field_icon" />
            </div>

            {open ? (
                <div className="dt_pop" role="dialog" aria-label={label}>
                    <div className="dt_pop_head">
                        <button
                            type="button"
                            className="dt_pop_nav dt_pop_nav_prev"
                            aria-label="Previous month"
                            onClick={() =>
                                setView(
                                    new Date(
                                        view.getFullYear(),
                                        view.getMonth() - 1,
                                        1,
                                    ),
                                )
                            }
                        >
                            <ChevronDownIcon />
                        </button>
                        <span className="dt_pop_title">
                            {MONTHS[view.getMonth()]} {view.getFullYear()}
                        </span>
                        <button
                            type="button"
                            className="dt_pop_nav dt_pop_nav_next"
                            aria-label="Next month"
                            onClick={() =>
                                setView(
                                    new Date(
                                        view.getFullYear(),
                                        view.getMonth() + 1,
                                        1,
                                    ),
                                )
                            }
                        >
                            <ChevronDownIcon />
                        </button>
                    </div>

                    <div className="dt_pop_weekdays">
                        {WEEKDAYS.map((day) => (
                            <span key={day}>{day}</span>
                        ))}
                    </div>

                    <div className="dt_pop_days">
                        {monthGrid(view).map((day) => {
                            const key = dayKey(day);
                            const outside = day.getMonth() !== view.getMonth();
                            const disabled =
                                Boolean(minKey && key < minKey) ||
                                Boolean(maxKey && key > maxKey);

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    disabled={disabled}
                                    className={`dt_pop_day${outside ? ' dt_pop_day_outside' : ''}${key === todayKey ? ' dt_pop_day_today' : ''}${key === selectedKey ? ' dt_pop_day_selected' : ''}`}
                                    onClick={() => pickDay(day)}
                                >
                                    {day.getDate()}
                                </button>
                            );
                        })}
                    </div>

                    <div className="dt_pop_time">
                        <span className="dt_pop_time_label">Time</span>
                        <input
                            className="dt_pop_time_input"
                            inputMode="numeric"
                            aria-label="Hours"
                            maxLength={2}
                            value={hours}
                            onChange={(event) =>
                                setHours(event.target.value.replace(/\D/g, ''))
                            }
                            onBlur={() => commitTime(hours, minutes)}
                            onKeyDown={timeKeys('h')}
                        />
                        <span className="dt_pop_time_colon">:</span>
                        <input
                            className="dt_pop_time_input"
                            inputMode="numeric"
                            aria-label="Minutes"
                            maxLength={2}
                            value={minutes}
                            onChange={(event) =>
                                setMinutes(
                                    event.target.value.replace(/\D/g, ''),
                                )
                            }
                            onBlur={() => commitTime(hours, minutes)}
                            onKeyDown={timeKeys('m')}
                        />
                    </div>

                    <div className="dt_pop_foot">
                        <button
                            type="button"
                            className="dt_pop_text"
                            onClick={() => {
                                commit(new Date());
                                setView(new Date());
                            }}
                        >
                            Now
                        </button>
                        <button
                            type="button"
                            className="dt_pop_text"
                            onClick={() => {
                                onChange('');
                                setOpen(false);
                            }}
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            className="dt_pop_text dt_pop_text_primary"
                            onClick={() => setOpen(false)}
                        >
                            Done
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default DateTimeField;
