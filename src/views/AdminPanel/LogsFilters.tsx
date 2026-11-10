'use client';

import { useState } from 'react';

import ActionButton from '../../components/Ui/ActionButton';

import ChevronDownIcon from '../../assets/svg/chevron-down.svg';
import PlayIcon from '../../assets/svg/play.svg';
import PauseIcon from '../../assets/svg/pause.svg';
import RefreshIcon from '../../assets/svg/refresh.svg';

import { RUNTIME_SERVICES } from './logsToolbar';

export const LogsFilters = ({
    activeCount = 0,
    children,
}: {
    activeCount?: number;
    children: any;
}) => {
    const [open, setOpen] = useState<boolean>(false);

    return (
        <aside
            className={`logs_filters${open ? ' logs_filters_open' : ''}`}
            aria-label="Filters"
        >
            <button
                type="button"
                className="logs_filters_toggle"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
            >
                <span>Filters</span>
                {activeCount ? (
                    <span className="logs_filters_count">{activeCount}</span>
                ) : null}
                <ChevronDownIcon />
            </button>
            <div className="logs_filters_body">{children}</div>
        </aside>
    );
};

export const FilterField = ({
    label,
    children,
}: {
    label: string;
    children: any;
}) => (
    <div className="logs_field">
        <span className="logs_field_label">{label}</span>
        {children}
    </div>
);

export const LogsActions = ({
    live,
    setLive,
    busy,
    onReload,
}: {
    live: boolean;
    setLive: (value: boolean | ((prev: boolean) => boolean)) => void;
    busy: boolean;
    onReload: () => void;
}) => (
    <div className="logs_actions">
        <ActionButton
            size="lg"
            className={live ? 'logs_live_active' : ''}
            onClick={() => setLive((value: boolean) => !value)}
        >
            {live ? <PauseIcon /> : <PlayIcon />}
            Live
        </ActionButton>
        <ActionButton
            size="lg"
            onClick={onReload}
            isLoading={busy || live}
            loaderVariant="segments"
            className="logs_reload"
        >
            <RefreshIcon />
        </ActionButton>
    </div>
);

const SERVICE_LABELS: Record<string, string> = {
    backend: 'Backend',
    frontend: 'Frontend',
    socket: 'Socket',
};

export const ServiceChecks = ({
    value,
    onChange,
}: {
    value: string[];
    onChange: (value: string[]) => void;
}) => (
    <div className="logs_checks" role="group" aria-label="Services">
        {RUNTIME_SERVICES.map((service) => {
            const checked = value.includes(service);

            return (
                <label
                    key={service}
                    className={`logs_check${checked ? ' logs_check_checked' : ''}`}
                >
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                            const next = checked
                                ? value.filter((item) => item !== service)
                                : RUNTIME_SERVICES.filter(
                                      (item) =>
                                          item === service ||
                                          value.includes(item),
                                  );

                            if (next.length) {
                                onChange(next);
                            }
                        }}
                    />
                    <span className="logs_check_box" aria-hidden="true" />
                    <span className="logs_check_label">
                        {SERVICE_LABELS[service]}
                    </span>
                </label>
            );
        })}
    </div>
);
