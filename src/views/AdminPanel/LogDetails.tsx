'use client';

import { useContext, useState } from 'react';

import { AppContext } from '@/providers/AppProviders';

import ChevronDownIcon from '../../assets/svg/chevron-down.svg';
import CopyIcon from '../../assets/svg/copy.svg';

import { Arrow, RoleChange, StatusChange } from './LogEntities';
import { describeDetails, type DetailRow } from './logFormat';

const formatMoment = (date: any) =>
    new Date(date).toLocaleString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

const Card = ({
    rows,
    children,
    setFilter,
}: {
    rows?: DetailRow[];
    children?: any;
    setFilter?: any;
}) => (
    <div className="log_card">
        {rows?.map((row, index) => (
            <div key={`${row.label}-${index}`} className="log_card_row">
                <span className="log_card_label">{row.label}</span>
                <span
                    className={`log_card_value${row.mono ? ' log_card_mono' : ''}`}
                >
                    {row.change?.kind === 'role' ? (
                        <RoleChange
                            from={row.change.from}
                            to={row.change.to}
                            setFilter={setFilter}
                        />
                    ) : row.change?.kind === 'status' ? (
                        <StatusChange
                            from={row.change.from}
                            to={row.change.to}
                        />
                    ) : row.change ? (
                        <span className="log_card_change">
                            {row.change.from ? (
                                <>
                                    <span className="log_card_change_from">
                                        {row.change.from}
                                    </span>
                                    <Arrow />
                                </>
                            ) : null}
                            <span>{row.change.to}</span>
                        </span>
                    ) : (
                        row.value
                    )}
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

const LogDetails = ({ log, config, names, setFilter, onPrev, onNext }: any) => {
    const { showToast } = useContext(AppContext);
    const [showRaw, setShowRaw] = useState<any>(false);
    const details = describeDetails(log, formatMoment, names);
    const raw = JSON.stringify(log, null, 2);
    const isError = log.type === 'server_error';

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(raw);
            showToast({ type: 'success', message: 'Copied' });
        } catch {
            showToast({ type: 'error', message: 'Could not copy' });
        }
    };

    return (
        <div className="log_details">
            <div className="log_details_header">
                {details.route ? (
                    <>
                        <span className="log_badge log_badge_mono">
                            {details.route.method}
                        </span>
                        <span className="log_details_path">
                            {details.route.path}
                        </span>
                    </>
                ) : (
                    <span className="log_details_path log_details_path_plain">
                        {config.title}
                    </span>
                )}
                {isError && log.data?.status ? (
                    <span className="log_badge log_badge_error">
                        {log.data.status}
                    </span>
                ) : null}

                <span className="log_details_actions">
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
                    <button
                        type="button"
                        className="log_text_button"
                        onClick={copy}
                    >
                        <CopyIcon />
                        Copy
                    </button>
                </span>
            </div>

            <div className="log_steps">
                {details.request.length ? (
                    <Step title="Request received" meta={details.time}>
                        <Card rows={details.request} />
                    </Step>
                ) : null}

                <Step
                    title="Event"
                    meta={details.request.length ? config.title : details.time}
                >
                    <Card rows={details.facts} setFilter={setFilter} />
                </Step>

                {details.changes.length ? (
                    <Step title="What changed">
                        <Card>
                            {details.changes.map((change: any, index) => (
                                <div key={index} className="log_card_row">
                                    <span className="log_card_label">
                                        {change.label}
                                    </span>
                                    <span className="log_card_value log_card_change">
                                        {change.from !== null ? (
                                            <>
                                                <span className="log_card_change_from">
                                                    {change.from}
                                                </span>
                                                <Arrow />
                                            </>
                                        ) : null}
                                        <span>{change.to}</span>
                                    </span>
                                </div>
                            ))}
                        </Card>
                    </Step>
                ) : null}

                {details.error.length || details.stack ? (
                    <Step title="Error" tone="error">
                        <Card rows={details.error}>
                            {details.stack ? (
                                <pre className="log_pre log_pre_error">
                                    {details.stack}
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
                    onClick={() => setShowRaw((value: any) => !value)}
                >
                    {showRaw ? 'Hide raw data' : 'Raw data'}
                </button>
            </div>
            {showRaw ? <pre className="log_pre log_pre_raw">{raw}</pre> : null}
        </div>
    );
};

export default LogDetails;
