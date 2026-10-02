'use client';

import { useCallback, useContext, useEffect, useState } from 'react';

import { AppContext } from '@/providers/AppProviders';
import { downloadBackup, getBackups, runBackup } from '../../api/backups.api';
import { format_back, format_date_time } from '../../utils/format';

import Pagination from '../../components/Ui/Pagination';
import Loading from '../../components/Ui/Loading';
import Tooltip from '../../components/Ui/Tooltip';
import PrimaryButton from '../../components/Ui/PrimaryButton';
import ActionButton from '../../components/Ui/ActionButton';

import './Backups.scss';

const STATUS_LABELS: Record<string, string> = {
    running: 'Идёт',
    success: 'Успешно',
    failed: 'Ошибка',
};

const TRIGGER_LABELS: Record<string, string> = {
    schedule: 'По расписанию',
    manual: 'Вручную',
};

const POLL_MS = 3000;

const formatSize = (bytes: any) => {
    if (typeof bytes !== 'number') {
        return '—';
    }

    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
    }

    return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
};

const formatDuration = (item: any) => {
    if (!item.finished_at) {
        return '—';
    }

    const seconds = Math.round(
        (new Date(item.finished_at).getTime() -
            new Date(item.started_at).getTime()) /
            1000,
    );

    return seconds < 60
        ? `${seconds} с`
        : `${Math.floor(seconds / 60)} мин ${seconds % 60} с`;
};

const BackupsPage = () => {
    const { showToast } = useContext(AppContext);
    const [items, setItems] = useState<any[]>([]);
    const [info, setInfo] = useState<any>(null);
    const [loading, setLoading] = useState<any>(true);
    const [page, setPage] = useState<any>(1);
    const [pagesCount, setPagesCount] = useState<any>(0);
    const [starting, setStarting] = useState<any>(false);
    const [downloadingId, setDownloadingId] = useState<any>(null);

    const load = useCallback(async () => {
        const result = await getBackups({ page, limit: 9 });

        if (!result.status) {
            showToast({ type: 'error', message: result.message });
            setItems([]);
            setPagesCount(0);
            setLoading(false);
            return;
        }

        setItems(result.data?.items || []);
        setInfo(result.data?.status || null);
        setPagesCount(result.data?.pagination?.pages || 0);
        setLoading(false);
    }, [page, showToast]);

    useEffect(() => {
        load();
    }, [load]);

    const running = Boolean(info?.running);

    // Пока дамп идёт, перечитываем список: запуск не держит запрос открытым.
    useEffect(() => {
        if (!running) {
            return;
        }

        const timer = setInterval(load, POLL_MS);
        return () => clearInterval(timer);
    }, [running, load]);

    const start = async () => {
        setStarting(true);
        const result = await runBackup();
        setStarting(false);

        if (!result.status) {
            showToast({ type: 'error', message: result.message });
            return;
        }

        showToast({ type: 'success', message: 'Бекап запущен' });
        setPage(1);
        await load();
    };

    const download = async (item: any) => {
        setDownloadingId(item._id);
        const result = await downloadBackup(item._id);
        setDownloadingId(null);

        if (!result.status) {
            showToast({ type: 'error', message: result.message });
        }
    };

    if (loading) {
        return <Loading size={40} />;
    }

    return (
        <div className="admin_panel_content_backups_page">
            <div className="admin_panel_content_backups_page_header">
                <div className="admin_panel_content_backups_page_header_info">
                    {info?.enabled ? (
                        <>
                            <p>
                                Ежедневно в {info.schedule_at_utc} UTC. Храним
                                каждый день за {info.keep_daily_days} дн.,
                                дальше по одному в месяц за {info.keep_months}{' '}
                                мес.
                            </p>
                            <p className="admin_panel_content_backups_page_hint">
                                В архиве база и загрузки. Ручной запуск
                                перезаписывает сегодняшний бекап. Архивы лежат
                                на сервере вместе с приложением, время от
                                времени скачивайте свежий.
                            </p>
                        </>
                    ) : (
                        <p>Бекапы выключены на этом окружении.</p>
                    )}
                </div>
                <PrimaryButton
                    onClick={start}
                    isLoading={starting}
                    disabled={!info?.enabled || running}
                >
                    {running ? 'Идёт бекап…' : 'Запустить бекап'}
                </PrimaryButton>
            </div>
            <Pagination
                content={items}
                page={page - 1}
                pagesCount={pagesCount}
                onPageChange={(index: any) => setPage(index + 1)}
            >
                {(visibleContent: any) =>
                    visibleContent.length ? (
                        visibleContent.map((item: any) => (
                            <div
                                key={item._id}
                                className="admin_panel_content_backups_page_item"
                            >
                                <span
                                    className={`backup_status backup_status_${item.status}`}
                                >
                                    {STATUS_LABELS[item.status] || item.status}
                                </span>
                                <Tooltip
                                    text={format_date_time(item.started_at)}
                                >
                                    <p className="admin_panel_content_backups_page_item_time">
                                        {format_back(item.started_at)}
                                    </p>
                                </Tooltip>
                                <p className="admin_panel_content_backups_page_item_trigger">
                                    {TRIGGER_LABELS[item.trigger] ||
                                        item.trigger}
                                </p>
                                <p className="admin_panel_content_backups_page_item_size">
                                    {formatSize(item.size_bytes)} ·{' '}
                                    {formatDuration(item)}
                                </p>
                                <div className="admin_panel_content_backups_page_item_action">
                                    {item.can_download ? (
                                        <ActionButton
                                            onClick={() => download(item)}
                                            isLoading={
                                                downloadingId === item._id
                                            }
                                        >
                                            Скачать
                                        </ActionButton>
                                    ) : item.file_removed_at ? (
                                        <p className="admin_panel_content_backups_page_hint">
                                            {item.file_removed_reason ===
                                            'replaced'
                                                ? 'Заменён новым за этот день'
                                                : 'Удалён по сроку хранения'}
                                        </p>
                                    ) : null}
                                </div>
                                {item.error ? (
                                    <p className="admin_panel_content_backups_page_item_error">
                                        {item.error}
                                    </p>
                                ) : null}
                            </div>
                        ))
                    ) : (
                        <p className="admin_panel_content_backups_page_empty">
                            Бекапов пока нет
                        </p>
                    )
                }
            </Pagination>
        </div>
    );
};

export default BackupsPage;
