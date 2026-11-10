'use client';

import { useContext, useState } from 'react';

import { AppContext } from '@/providers/AppProviders';

import ChevronDownIcon from '../../assets/svg/chevron-down.svg';
import CopyIcon from '../../assets/svg/copy.svg';
import { Pill } from '../../components/Ui';

import { formatDuration } from './logFormat';
import { TimingBreakdown } from './LogTiming';
import { LEVELS } from './logTypes';

type Row = { label: string; value: string; mono?: boolean };

const SHOWN_ELSEWHERE = new Set([
    'method',
    'path',
    'status',
    'total_ms',
    'db_ms',
    'db_queries',
    'user',
    'request_id',
    'query',
    'error',
    'error_message',
    'stack',
]);

export const queryString = (query: unknown) => {
    if (!query || typeof query !== 'object') {
        return '';
    }

    const text = Object.entries(query as Record<string, string>)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

    return text ? `?${text}` : '';
};

const formatMoment = (date: any) =>
    new Date(date).toLocaleString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

const label = (key: string) => {
    const text = key.replace(/_/g, ' ');

    return text.charAt(0).toUpperCase() + text.slice(1);
};

const primitive = (value: unknown) =>
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean';

const Card = ({ rows, children }: { rows?: Row[]; children?: any }) => (
    <div className="log_card">
        {rows?.map((row) => (
            <div key={row.label} className="log_card_row">
                <span className="log_card_label">{row.label}</span>
                <span
                    className={`log_card_value${row.mono ? ' log_card_mono' : ''}`}
                >
                    {row.value}
                </span>
            </div>
        ))}
        {children}
    </div>
);

const Step = ({ title, meta, tone = 'default', children }: any) => (
    <section className="log_step">
        <header className="log_step_header">
            <span className={`log_step_node log_step_node_${tone}`} />
            <h4>{title}</h4>
            {meta ? <span className="log_step_meta">{meta}</span> : null}
        </header>
        <div className="log_step_body">{children}</div>
    </section>
);

const RuntimeLogDetails = ({
    entry,
    onPrev,
    onNext,
    position,
    total,
    hasMore,
    onFindRequest,
}: any) => {
    const { showToast } = useContext(AppContext);
    const [showRaw, setShowRaw] = useState<boolean>(false);
    const data = entry.data ?? {};
    const raw = JSON.stringify(entry, null, 2);
    const isRequest = Boolean(data.method && data.path && data.status);
    const requestId = data.request_id ? String(data.request_id) : null;
    const status = Number(data.status);
    const duration = data.total_ms != null ? Number(data.total_ms) : null;
    const timing =
        duration !== null && data.db_ms != null
            ? {
                  total: duration,
                  db: Number(data.db_ms),
                  queries: Number(data.db_queries || 0),
              }
            : null;

    const errorObject =
        data.error && typeof data.error === 'object' ? data.error : null;
    const errorText =
        errorObject?.message ??
        (typeof data.error === 'string' ? data.error : null) ??
        data.error_message ??
        null;
    const stack = errorObject?.stack ?? data.stack ?? null;

    const request: Row[] = isRequest
        ? [
              { label: 'Method', value: String(data.method) },
              { label: 'Path', value: String(data.path), mono: true },
              ...(queryString(data.query)
                  ? [
                        {
                            label: 'Query',
                            value: queryString(data.query),
                            mono: true,
                        },
                    ]
                  : []),
              { label: 'Status', value: String(data.status) },
              ...(duration !== null
                  ? [
                        {
                            label: 'Duration',
                            value: formatDuration(duration),
                        },
                    ]
                  : []),
              ...(data.user
                  ? [{ label: 'User', value: String(data.user), mono: true }]
                  : []),
              ...(requestId
                  ? [{ label: 'Request ID', value: requestId, mono: true }]
                  : []),
          ]
        : [];

    const facts: Row[] = [
        { label: 'Service', value: entry.service },
        { label: 'Level', value: LEVELS[entry.level as keyof typeof LEVELS] },
        { label: 'Message', value: entry.msg },
        ...Object.entries(data)
            .filter(
                ([key, value]) =>
                    !SHOWN_ELSEWHERE.has(key) &&
                    primitive(value) &&
                    value !== '',
            )
            .map(([key, value]) => ({
                label: label(key),
                value: String(value),
            })),
    ];

    const copy = async (text: string, message: string) => {
        try {
            await navigator.clipboard.writeText(text);
            showToast({ type: 'success', message });
        } catch {
            showToast({ type: 'error', message: 'Could not copy' });
        }
    };

    return (
        <div className="log_details">
            <div className="log_details_header">
                {isRequest ? (
                    <>
                        <span className="log_badge log_badge_mono">
                            {data.method}
                        </span>
                        <span className="log_details_path">{data.path}</span>
                    </>
                ) : (
                    <span className="log_details_path log_details_path_plain">
                        {entry.msg}
                    </span>
                )}
                {entry.level !== 'info' ? (
                    <Pill tone={entry.level === 'error' ? 'danger' : 'warning'}>
                        {LEVELS[entry.level as keyof typeof LEVELS]}
                    </Pill>
                ) : null}
                {isRequest ? (
                    <Pill
                        tone={
                            status >= 500
                                ? 'danger'
                                : status >= 400
                                  ? 'warning'
                                  : 'neutral'
                        }
                    >
                        {data.status}
                    </Pill>
                ) : null}
                {requestId ? (
                    <button
                        type="button"
                        className="log_id_chip"
                        title="Copy the ID"
                        onClick={() => copy(requestId, 'ID copied')}
                    >
                        <span>{requestId}</span>
                        <CopyIcon />
                    </button>
                ) : null}

                <span className="log_details_actions">
                    {position ? (
                        <span className="log_details_counter">
                            {position} of {total}
                            {hasMore ? '+' : ''}
                        </span>
                    ) : null}
                    <button
                        type="button"
                        className="log_icon_button log_icon_button_up"
                        title="Previous entry"
                        disabled={!onPrev}
                        onClick={onPrev}
                    >
                        <ChevronDownIcon />
                    </button>
                    <button
                        type="button"
                        className="log_icon_button"
                        title="Next entry"
                        disabled={!onNext}
                        onClick={onNext}
                    >
                        <ChevronDownIcon />
                    </button>
                    <span className="log_details_divider" />
                    {requestId ? (
                        <button
                            type="button"
                            className="log_text_button"
                            onClick={() => onFindRequest(requestId)}
                        >
                            All entries of this request
                        </button>
                    ) : null}
                    <button
                        type="button"
                        className="log_text_button"
                        onClick={() => copy(raw, 'Copied')}
                    >
                        <CopyIcon />
                        Copy
                    </button>
                </span>
            </div>

            <div className="log_steps">
                {request.length ? (
                    <Step
                        title="Request received"
                        meta={formatMoment(entry.ts)}
                    >
                        <Card rows={request} />
                    </Step>
                ) : null}

                <Step
                    title="Entry"
                    meta={
                        request.length ? entry.service : formatMoment(entry.ts)
                    }
                >
                    <Card rows={facts} />
                </Step>

                {timing ? (
                    <Step
                        title="Timing"
                        meta={requestId ? `request ${requestId}` : undefined}
                    >
                        <TimingBreakdown timing={timing} />
                    </Step>
                ) : null}

                {errorText || stack ? (
                    <Step title="Error" tone="error">
                        <Card
                            rows={
                                errorText
                                    ? [{ label: 'Message', value: errorText }]
                                    : []
                            }
                        >
                            {stack ? (
                                <pre className="log_pre log_pre_error">
                                    {stack}
                                </pre>
                            ) : null}
                        </Card>
                    </Step>
                ) : null}
            </div>

            <div className="log_details_footer">
                <button
                    type="button"
                    className="log_text_button"
                    onClick={() => setShowRaw((value) => !value)}
                >
                    {showRaw ? 'Hide raw data' : 'Raw data'}
                </button>
            </div>
            {showRaw ? <pre className="log_pre log_pre_raw">{raw}</pre> : null}
        </div>
    );
};

export default RuntimeLogDetails;
