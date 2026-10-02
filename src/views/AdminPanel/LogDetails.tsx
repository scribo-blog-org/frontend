'use client';

import { useContext, useState } from 'react';

import { AppContext } from '@/providers/AppProviders';

import ChevronDownIcon from '../../assets/svg/chevron-down.svg';

import { Arrow, RoleChange } from './LogEntities';
import { describeDetails, type DetailRow } from './logFormat';

// В раскрытой записи время с секундами: по минутам события не различить.
const formatMoment = (date: any) =>
    new Date(date).toLocaleString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

/** Карточка со строками «подпись слева, значение справа». */
const Card = ({ rows, children }: { rows?: DetailRow[]; children?: any }) => (
    <div className="log_card">
        {rows?.map((row, index) => (
            <div key={`${row.label}-${index}`} className="log_card_row">
                <span className="log_card_label">{row.label}</span>
                <span
                    className={`log_card_value${row.mono ? ' log_card_mono' : ''}`}
                >
                    {row.change?.kind === 'role' ? (
                        <RoleChange from={row.change.from} to={row.change.to} />
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

/** Шаг на временной шкале: узел, заголовок, справа пометка, ниже содержимое. */
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

/**
 * Раскрытая запись. Сверху шапка (метод, путь, код ответа, стрелки к соседним
 * записям, копирование, закрытие), ниже временная шкала: запрос получен,
 * событие, что изменилось, ошибка. Внизу сырые данные для тех, кому нужен
 * точный вид.
 */
const LogDetails = ({ log, config, names, onPrev, onNext }: any) => {
    const { showToast } = useContext(AppContext);
    const [showRaw, setShowRaw] = useState<any>(false);
    const details = describeDetails(log, formatMoment, names);
    const raw = JSON.stringify(log, null, 2);
    const isError = log.type === 'server_error';

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(raw);
            showToast({ type: 'success', message: 'Скопировано' });
        } catch {
            showToast({ type: 'error', message: 'Не удалось скопировать' });
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
                        title="Предыдущая запись"
                        disabled={!onPrev}
                        onClick={onPrev}
                    >
                        <ChevronDownIcon />
                    </button>
                    <button
                        type="button"
                        className="log_icon_button"
                        title="Следующая запись"
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
                        Копировать
                    </button>
                </span>
            </div>

            <div className="log_steps">
                {details.request.length ? (
                    <Step title="Запрос получен" meta={details.time}>
                        <Card rows={details.request} />
                    </Step>
                ) : null}

                <Step
                    title="Событие"
                    meta={details.request.length ? config.title : details.time}
                >
                    <Card rows={details.facts} />
                </Step>

                {details.changes.length ? (
                    <Step title="Что изменилось">
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
                    <Step title="Ошибка" tone="error">
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
                    {showRaw ? 'Скрыть сырые данные' : 'Сырые данные'}
                </button>
            </div>
            {showRaw ? <pre className="log_pre log_pre_raw">{raw}</pre> : null}
        </div>
    );
};

export default LogDetails;
