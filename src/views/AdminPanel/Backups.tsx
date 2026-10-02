'use client';

import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import { AppContext } from '@/providers/AppProviders';
import {
    downloadBackup,
    getBackups,
    restoreBackup,
    runBackup,
    uploadBackup,
} from '../../api/backups.api';
import { format_back, format_date_time } from '../../utils/format';

import Pagination from '../../components/Ui/Pagination';
import Loading from '../../components/Ui/Loading';
import Tooltip from '../../components/Ui/Tooltip';
import PrimaryButton from '../../components/Ui/PrimaryButton';
import ActionButton from '../../components/Ui/ActionButton';
import DangerButton from '../../components/Ui/DangerButton/index';
import InputField from '../../components/Ui/InputField/index';

import { formatSize } from './logFormat';

import './Backups.scss';

const STATUS_LABELS: Record<string, string> = {
    running: 'Идёт',
    success: 'Успешно',
    failed: 'Ошибка',
};

const TRIGGER_LABELS: Record<string, string> = {
    schedule: 'По расписанию',
    manual: 'Вручную',
    upload: 'Загружен вручную',
};

const PHASE_LABELS: Record<string, string> = {
    verifying: 'Проверка архива',
    snapshot: 'Страховочный снимок текущего состояния',
    database: 'Восстановление базы',
    files: 'Восстановление файлов',
    rollback: 'Возврат к состоянию до отката',
};

// Слово, которое нужно ввести, чтобы подтвердить откат.
const CONFIRM_WORD = 'ВОССТАНОВИТЬ';

const POLL_MS = 3000;
const POLL_RESTORE_MS = 2000;

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

const kindLabel = (item: any) =>
    item.kind === 'pre_restore'
        ? 'Перед откатом'
        : TRIGGER_LABELS[item.trigger] || item.trigger;

const describeContents = (contents: any) =>
    contents
        ? `база ${formatSize(contents.db_bytes)}, файлов ${contents.uploads_files} (${formatSize(contents.uploads_bytes)})`
        : null;

const SOURCE_TRIGGER_LABELS: Record<string, string> = {
    schedule: 'по расписанию',
    manual: 'вручную',
    restore: 'страховочный снимок перед откатом',
};

/** Что за бекап: когда снят, какой версией, из какой базы и что внутри. */
const BackupDetails = ({ item, info }: any) => {
    const source = item.source;
    const contents = item.contents;
    const current = info?.db_version;
    const archiveDb = source?.db_name ?? contents?.db_name;
    const dbVersion = contents?.db_version ?? source?.db_version;

    const rows: [string, any][] = [
        ['Снят', format_date_time(source?.created_at ?? item.started_at)],
        [
            'Как создан',
            source
                ? SOURCE_TRIGGER_LABELS[source.trigger] || source.trigger
                : kindLabel(item),
        ],
        [
            'Версия приложения',
            contents?.app_version ?? source?.app_version ?? 'неизвестна',
        ],
        [
            'Версия данных',
            dbVersion
                ? `${dbVersion}${current ? (dbVersion === current ? ` · совпадает с текущей (${current})` : ` · текущая ${current}`) : ''}`
                : 'неизвестна',
        ],
        [
            'База',
            archiveDb && info?.db_name && archiveDb !== info.db_name
                ? `${archiveDb} → будет установлена в ${info.db_name}`
                : archiveDb,
        ],
        ['Внутри', describeContents(contents)],
        ['Коллекций', contents?.collections],
        ['Размер архива', formatSize(item.size_bytes)],
        ['Файл', source?.original_name ?? item.file_name],
    ];

    return (
        <dl className="backup_details">
            {rows
                .filter(([, value]) => value !== undefined && value !== null)
                .map(([label, value]) => (
                    <div key={label} className="backup_details_row">
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                    </div>
                ))}
        </dl>
    );
};

const UploadedDialog = ({ item, info, duplicate, onClose, onRestore }: any) => (
    <div className="backup_restore_dialog">
        <p className="backup_restore_dialog_hint">
            {duplicate
                ? 'Этот бекап уже есть в списке, второй раз он не добавлен. Его можно восстановить прямо отсюда или кнопкой в списке.'
                : 'Архив проверен и добавлен в список. Версии совпадают, ничего пока не изменено: восстановить его можно сейчас или позже кнопкой в списке.'}
        </p>
        <BackupDetails item={item} info={info} />
        <div className="backup_restore_dialog_bottom">
            <ActionButton onClick={onClose}>Закрыть</ActionButton>
            <DangerButton onClick={onRestore} isActive={true}>
                Восстановить…
            </DangerButton>
        </div>
    </div>
);

const RestoreDialog = ({ item, info, onCancel, onStarted, showToast }: any) => {
    const [word, setWord] = useState<any>('');
    const [isStarting, setIsStarting] = useState<any>(false);

    const start = async () => {
        setIsStarting(true);
        try {
            const result = await restoreBackup(item._id);

            if (!result.status) {
                showToast({ type: 'error', message: result.message });
                return;
            }

            onStarted();
        } finally {
            setIsStarting(false);
        }
    };

    return (
        <div className="backup_restore_dialog">
            <BackupDetails item={item} info={info} />
            <ul className="backup_restore_dialog_warnings">
                <li>
                    База и загруженные файлы будут заменены полностью.
                    Пользователи, посты, комментарии и картинки, появившиеся
                    после этого бекапа, пропадут.
                </li>
                <li>
                    Перед заменой автоматически снимается страховочный снимок
                    текущего состояния. Если откат не удастся, система вернётся
                    к нему сама. После успешного отката снимок удаляется.
                </li>
                <li>
                    На время отката сайт доступен только для чтения, обычно это
                    около минуты.
                </li>
                <li>
                    Сессии тоже откатятся вместе с базой, поэтому вам и другим
                    пользователям может понадобиться войти заново.
                </li>
            </ul>
            <p className="backup_restore_dialog_label">
                Чтобы подтвердить, введите {CONFIRM_WORD}
            </p>
            <InputField
                value={word}
                placeholder={CONFIRM_WORD}
                onChange={(event: any) => setWord(event.target.value)}
            />
            <div className="backup_restore_dialog_bottom">
                <ActionButton disabled={isStarting} onClick={onCancel}>
                    Отмена
                </ActionButton>
                <DangerButton
                    onClick={start}
                    isActive={true}
                    isLoading={isStarting}
                    disabled={word.trim().toUpperCase() !== CONFIRM_WORD}
                >
                    Восстановить
                </DangerButton>
            </div>
        </div>
    );
};

const BackupsPage = () => {
    const { showToast, showModalWindow, requestCloseModal } =
        useContext(AppContext);
    const [items, setItems] = useState<any[]>([]);
    const [info, setInfo] = useState<any>(null);
    const [loading, setLoading] = useState<any>(true);
    const [page, setPage] = useState<any>(1);
    const [pagesCount, setPagesCount] = useState<any>(0);
    const [starting, setStarting] = useState<any>(false);
    const [downloadingId, setDownloadingId] = useState<any>(null);
    const [uploading, setUploading] = useState<any>(false);
    const fileInput = useRef<any>(null);
    const wasRestoring = useRef<any>(false);

    const load = useCallback(async () => {
        const result = await getBackups({ page, limit: 9 });

        if (!result.status) {
            showToast({ type: 'error', message: result.message });
            setItems([]);
            setPagesCount(0);
            setLoading(false);
            return;
        }

        const status = result.data?.status || null;

        // Откат закончился, пока страница открыта: сообщаем итог. После
        // успешного отката перезагружаем страницу, иначе интерфейс покажет
        // данные, которых в базе уже нет.
        if (wasRestoring.current && !status?.restoring) {
            const job = status?.restore_job;

            if (job?.status === 'success') {
                showToast({
                    type: 'success',
                    message: 'Бекап восстановлен. Страница перезагрузится.',
                });
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showToast({
                    type: 'error',
                    message: job?.error
                        ? `Откат не удался: ${job.error}`
                        : 'Откат не удался',
                });
            }
        }
        wasRestoring.current = Boolean(status?.restoring);

        setItems(result.data?.items || []);
        setInfo(status);
        setPagesCount(result.data?.pagination?.pages || 0);
        setLoading(false);
    }, [page, showToast]);

    useEffect(() => {
        load();
    }, [load]);

    const running = Boolean(info?.running);
    const restoring = Boolean(info?.restoring);

    // Пока дамп или откат идёт, перечитываем список: запуск не держит запрос открытым.
    useEffect(() => {
        if (!running && !restoring) {
            return;
        }

        const timer = setInterval(load, restoring ? POLL_RESTORE_MS : POLL_MS);
        return () => clearInterval(timer);
    }, [running, restoring, load]);

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

    const upload = async (event: any) => {
        const file = event.target.files?.[0];
        // Тот же файл можно выбрать снова после ошибки.
        event.target.value = '';

        if (!file) {
            return;
        }

        if (info?.upload_max_bytes && file.size > info.upload_max_bytes) {
            showToast({
                type: 'error',
                message: `Файл больше ${formatSize(info.upload_max_bytes)}`,
            });
            return;
        }

        setUploading(true);
        const result = await uploadBackup(file);
        setUploading(false);

        if (!result.status) {
            showToast({ type: 'error', message: result.message });
            return;
        }

        setPage(1);
        await load();
        showModalWindow({
            title: result.data?.already_listed
                ? 'Этот бекап уже в списке'
                : 'Бекап загружен и проверен',
            content: (
                <UploadedDialog
                    item={result.data}
                    info={info}
                    duplicate={Boolean(result.data?.already_listed)}
                    onClose={requestCloseModal}
                    onRestore={() => askRestore(result.data)}
                />
            ),
            showCloseButton: false,
            closeFunc: () => {},
        });
    };

    const download = async (item: any) => {
        setDownloadingId(item._id);
        const result = await downloadBackup(item._id);
        setDownloadingId(null);

        if (!result.status) {
            showToast({ type: 'error', message: result.message });
        }
    };

    const askRestore = (item: any) => {
        showModalWindow({
            title: 'Восстановить этот бекап?',
            content: (
                <RestoreDialog
                    item={item}
                    info={info}
                    onCancel={requestCloseModal}
                    onStarted={() => {
                        requestCloseModal();
                        wasRestoring.current = true;
                        load();
                    }}
                    showToast={showToast}
                />
            ),
            showCloseButton: false,
            closeFunc: () => {},
        });
    };

    if (loading) {
        return <Loading size={40} />;
    }

    const last = info?.last_restore;
    const job = info?.restore_job;
    const busy = running || restoring;

    return (
        <div className="admin_panel_content_backups_page">
            <div className="admin_panel_content_backups_page_header">
                <div className="admin_panel_content_backups_page_header_info">
                    {info?.enabled ? (
                        <>
                            <p>
                                Ежедневно в {info.schedule_at_utc} UTC.
                                Сегодняшние бекапы хранятся все, за прошлые{' '}
                                {info.keep_daily_days} дн. по одному в день,
                                дальше по одному в месяц (последнего дня) за{' '}
                                {info.keep_months} мес.
                            </p>
                            <p className="admin_panel_content_backups_page_hint">
                                В архиве база и загрузки. Ручной запуск
                                добавляет ещё один бекап. Архивы лежат на
                                сервере вместе с приложением, время от времени
                                скачивайте свежий. Свой архив можно загрузить:
                                он проверяется целиком и появляется в списке, а
                                устанавливается обычным откатом.
                            </p>
                        </>
                    ) : (
                        <p>Бекапы выключены на этом окружении.</p>
                    )}
                </div>
                <div className="admin_panel_content_backups_page_header_actions">
                    {info?.upload_enabled ? (
                        <>
                            <input
                                ref={fileInput}
                                type="file"
                                hidden
                                onChange={upload}
                            />
                            <ActionButton
                                onClick={() => fileInput.current?.click()}
                                isLoading={uploading}
                                disabled={busy}
                            >
                                {uploading
                                    ? 'Загрузка и проверка…'
                                    : 'Загрузить бекап'}
                            </ActionButton>
                        </>
                    ) : null}
                    <PrimaryButton
                        onClick={start}
                        isLoading={starting}
                        disabled={!info?.enabled || busy}
                    >
                        {running ? 'Идёт бекап…' : 'Запустить бекап'}
                    </PrimaryButton>
                </div>
            </div>

            {restoring ? (
                <div className="backup_notice backup_notice_warning">
                    <p>
                        <b>Идёт восстановление.</b>{' '}
                        {PHASE_LABELS[job?.phase] || 'Подготовка'}…
                    </p>
                    <p className="admin_panel_content_backups_page_hint">
                        Сайт сейчас доступен только для чтения. Не закрывайте
                        страницу, она обновится сама.
                    </p>
                </div>
            ) : null}

            {!restoring && info?.current ? (
                <div className="backup_notice">
                    <p>
                        <b>Сейчас система на бекапе от </b>
                        {format_date_time(info.current.taken_at)}
                    </p>
                    <p className="admin_panel_content_backups_page_hint">
                        Восстановлен{' '}
                        {format_date_time(info.current.restored_at)}. Всё, что
                        менялось после этого, уже новые данные поверх бекапа.
                    </p>
                </div>
            ) : null}

            {!restoring &&
            last &&
            (last.status === 'failed' || last.status === 'interrupted') ? (
                <div className="backup_notice backup_notice_error">
                    <p>
                        <b>
                            {last.status === 'interrupted'
                                ? 'Последний откат был прерван.'
                                : 'Последний откат не удался.'}
                        </b>{' '}
                        {last.rolled_back
                            ? 'Система возвращена к состоянию до отката.'
                            : last.status === 'interrupted'
                              ? 'База и файлы могут быть восстановлены наполовину. Восстановите страховочный снимок «Перед откатом» из списка ниже.'
                              : 'Проверьте данные, при необходимости восстановите страховочный снимок из списка ниже.'}
                    </p>
                    {last.error ? (
                        <p className="backup_notice_details">{last.error}</p>
                    ) : null}
                </div>
            ) : null}

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
                                    {kindLabel(item)}
                                    {info?.current?.backup_id === item._id ? (
                                        <span className="backup_current">
                                            Текущий
                                        </span>
                                    ) : null}
                                </p>
                                <p className="admin_panel_content_backups_page_item_size">
                                    {formatSize(item.size_bytes)}
                                    {item.source
                                        ? ` · снят ${format_date_time(item.source.created_at)}`
                                        : ` · ${formatDuration(item)}`}
                                    {item.contents ? (
                                        <span className="admin_panel_content_backups_page_item_contents">
                                            {describeContents(item.contents)}
                                        </span>
                                    ) : null}
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
                                                ? 'Удалён: заменён новым за этот день'
                                                : item.file_removed_reason ===
                                                    'restored'
                                                  ? 'Удалён: откат прошёл успешно, снимок не нужен'
                                                  : 'Удалён по сроку хранения'}
                                        </p>
                                    ) : null}
                                    {item.restore_blocked ? (
                                        <p className="admin_panel_content_backups_page_hint">
                                            {item.restore_blocked}
                                        </p>
                                    ) : null}
                                    {info?.restore_enabled &&
                                    item.can_restore ? (
                                        <DangerButton
                                            onClick={() => askRestore(item)}
                                            disabled={busy}
                                        >
                                            Восстановить
                                        </DangerButton>
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
