'use client';

import { createContext, useContext, useEffect, useState } from 'react';

import { useSearchParams } from '@/navigation';

export const LOG_VIEWS = ['events', 'runtime'];
export const RUNTIME_SERVICES = ['backend', 'frontend', 'socket'];

export type LogEntity = { type: string | null; id: string | null };

export type LogsToolbar = {
    view: string;
    setView: (value: string) => void;
    services: string[];
    setServices: (value: string[]) => void;
    searchText: string;
    setSearchText: (value: string) => void;
    levelFilter: string;
    setLevelFilter: (value: string) => void;
    dateFrom: string;
    setDateFrom: (value: string) => void;
    dateTo: string;
    setDateTo: (value: string) => void;
    live: boolean;
    setLive: (value: boolean | ((prev: boolean) => boolean)) => void;
    typeFilter: string;
    setTypeFilter: (value: string) => void;
    entity: LogEntity;
    setEntity: (value: LogEntity) => void;
};

const LogsToolbarContext = createContext<LogsToolbar | null>(null);

export const LogsToolbarProvider = LogsToolbarContext.Provider;

const MOMENT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const momentParam = (value: string | null) =>
    value && MOMENT.test(value) ? value : '';

const entityParam = (params: URLSearchParams): LogEntity => {
    const raw = params.get('filter');

    if (raw && raw.includes(':')) {
        const index = raw.indexOf(':');

        return { type: raw.slice(0, index), id: raw.slice(index + 1) };
    }

    const user = params.get('user');

    return user ? { type: 'user', id: user } : { type: null, id: null };
};

export const useLogsToolbarState = (): LogsToolbar => {
    const [params] = useSearchParams();
    const [view, setView] = useState<string>(() => {
        const value = params.get('view') ?? '';

        return LOG_VIEWS.includes(value) ? value : 'events';
    });
    const [services, setServices] = useState<string[]>(() => {
        const picked = (params.get('services') ?? '')
            .split(',')
            .filter((item) => RUNTIME_SERVICES.includes(item));

        return picked.length ? picked : RUNTIME_SERVICES;
    });
    const [searchText, setSearchText] = useState<string>(
        () => params.get('q') ?? '',
    );
    const [levelFilter, setLevelFilter] = useState<string>(
        () => params.get('level') ?? 'all',
    );
    const [dateFrom, setDateFrom] = useState<string>(() =>
        momentParam(params.get('from')),
    );
    const [dateTo, setDateTo] = useState<string>(() =>
        momentParam(params.get('to')),
    );
    const [live, setLive] = useState<boolean>(() => params.get('live') === '1');
    const [typeFilter, setTypeFilter] = useState<string>(
        () => params.get('type') ?? 'all',
    );
    const [entity, setEntity] = useState<LogEntity>(() => entityParam(params));

    useEffect(() => {
        const url = new URL(window.location.href);
        const query = url.searchParams;
        const write = (key: string, value: string, fallback = '') => {
            if (value && value !== fallback) {
                query.set(key, value);
            } else {
                query.delete(key);
            }
        };

        write('view', view, 'events');
        write(
            'services',
            services.length === RUNTIME_SERVICES.length
                ? ''
                : services.join(','),
        );
        query.delete('source');
        write('q', searchText);
        write('level', levelFilter, 'all');
        write('from', dateFrom);
        write('to', dateTo);
        write('live', live ? '1' : '');
        write('type', typeFilter, 'all');
        write(
            'filter',
            entity.type && entity.id ? `${entity.type}:${entity.id}` : '',
        );
        query.delete('user');

        const search = query.toString();
        const next = `${url.pathname}${search ? `?${search}` : ''}${url.hash}`;
        const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;

        if (next !== current) {
            window.history.replaceState(window.history.state, '', next);
        }
    }, [
        view,
        services,
        searchText,
        levelFilter,
        dateFrom,
        dateTo,
        live,
        typeFilter,
        entity,
    ]);

    return {
        view,
        setView,
        services,
        setServices,
        searchText,
        setSearchText,
        levelFilter,
        setLevelFilter,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        live,
        setLive,
        typeFilter,
        setTypeFilter,
        entity,
        setEntity,
    };
};

export const useLogsToolbar = (): LogsToolbar => {
    const value = useContext(LogsToolbarContext);

    if (!value) {
        throw new Error('useLogsToolbar needs LogsToolbarProvider');
    }

    return value;
};
