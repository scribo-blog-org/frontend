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
import BackupIcon from '../../assets/svg/backup.svg';
import DownloadIcon from '../../assets/svg/document-download.svg';
import UploadIcon from '../../assets/svg/document-upload.svg';
import RestoreIcon from '../../assets/svg/restore.svg';
import PrimaryButton from '../../components/Ui/PrimaryButton';
import ActionButton from '../../components/Ui/ActionButton';
import DangerButton from '../../components/Ui/DangerButton/index';
import InputField from '../../components/Ui/InputField/index';

import { formatSize } from './logFormat';

import './Backups.scss';

const STATUS_LABELS: Record<string, string> = {
    running: 'Running',
    success: 'Success',
    failed: 'Error',
};

const TRIGGER_LABELS: Record<string, string> = {
    schedule: 'Scheduled',
    manual: 'Manual',
    upload: 'Uploaded manually',
};

const PHASE_LABELS: Record<string, string> = {
    verifying: 'Checking the archive',
    snapshot: 'Safety snapshot of the current state',
    database: 'Restoring the database',
    files: 'Restoring files',
    rollback: 'Rolling back to the state before the restore',
};

const CONFIRM_WORD = 'RESTORE';

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
        ? `${seconds} s`
        : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
};

const kindLabel = (item: any) =>
    item.kind === 'pre_restore'
        ? 'Before restore'
        : TRIGGER_LABELS[item.trigger] || item.trigger;

const describeContents = (contents: any) =>
    contents
        ? `database ${formatSize(contents.db_bytes)}, files ${contents.uploads_files} (${formatSize(contents.uploads_bytes)})`
        : null;

const SOURCE_TRIGGER_LABELS: Record<string, string> = {
    schedule: 'on schedule',
    manual: 'manually',
    restore: 'safety snapshot before restore',
};

const BackupDetails = ({ item, info }: any) => {
    const source = item.source;
    const contents = item.contents;
    const current = info?.db_version;
    const archiveDb = source?.db_name ?? contents?.db_name;
    const dbVersion = contents?.db_version ?? source?.db_version;

    const rows: [string, any][] = [
        ['Taken', format_date_time(source?.created_at ?? item.started_at)],
        [
            'How it was created',
            source
                ? SOURCE_TRIGGER_LABELS[source.trigger] || source.trigger
                : kindLabel(item),
        ],
        [
            'App version',
            contents?.app_version ?? source?.app_version ?? 'unknown',
        ],
        [
            'Data version',
            dbVersion
                ? `${dbVersion}${current ? (dbVersion === current ? ` · matches the current one (${current})` : ` · current ${current}`) : ''}`
                : 'unknown',
        ],
        [
            'Database',
            archiveDb && info?.db_name && archiveDb !== info.db_name
                ? `${archiveDb} → will be restored into ${info.db_name}`
                : archiveDb,
        ],
        ['Contents', describeContents(contents)],
        ['Collections', contents?.collections],
        ['Archive size', formatSize(item.size_bytes)],
        ['File', source?.original_name ?? item.file_name],
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
                ? 'This backup is already in the list, so it was not added again. You can restore it from here or with the button in the list.'
                : 'The archive was checked and added to the list. The versions match and nothing has been changed yet: you can restore it now or later with the button in the list.'}
        </p>
        <BackupDetails item={item} info={info} />
        <div className="backup_restore_dialog_bottom">
            <ActionButton onClick={onClose}>Close</ActionButton>
            <DangerButton onClick={onRestore} isActive={true}>
                <RestoreIcon />
                Restore…
            </DangerButton>
        </div>
    </div>
);

const RestoreDialog = ({ item, info, onCancel, onStarted, showToast }: any) => {
    const [word, setWord] = useState<any>('');
    const [isStarting, setIsStarting] = useState<any>(false);

    const start = async () => {
        if (isStarting) return;
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
                    The database and uploaded files will be replaced completely.
                    Users, posts, comments, and images created after this backup
                    will be gone.
                </li>
                <li>
                    Before the replacement, a safety snapshot of the current
                    state is taken automatically. If the restore fails, the
                    system returns to it on its own. After a successful restore
                    the snapshot is deleted.
                </li>
                <li>
                    During a restore the site is read-only, usually for about a
                    minute.
                </li>
                <li>
                    Sessions roll back with the database, so you and other users
                    may need to log in again.
                </li>
            </ul>
            <p className="backup_restore_dialog_label">
                To confirm, type {CONFIRM_WORD}
            </p>
            <InputField
                value={word}
                placeholder={CONFIRM_WORD}
                disabled={isStarting}
                onChange={(event: any) => setWord(event.target.value)}
            />
            <div className="backup_restore_dialog_bottom">
                <ActionButton disabled={isStarting} onClick={onCancel}>
                    Cancel
                </ActionButton>
                <DangerButton
                    onClick={start}
                    isActive={true}
                    isLoading={isStarting}
                    disabled={word.trim().toUpperCase() !== CONFIRM_WORD}
                >
                    <RestoreIcon />
                    Restore
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

        if (wasRestoring.current && !status?.restoring) {
            const job = status?.restore_job;

            if (job?.status === 'success') {
                showToast({
                    type: 'success',
                    message: 'Backup restored. The page will reload.',
                });
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showToast({
                    type: 'error',
                    message: job?.error
                        ? `Restore failed: ${job.error}`
                        : 'Restore failed',
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

    useEffect(() => {
        if (!running && !restoring) {
            return;
        }

        const timer = setInterval(load, restoring ? POLL_RESTORE_MS : POLL_MS);
        return () => clearInterval(timer);
    }, [running, restoring, load]);

    const start = async () => {
        if (starting || uploading) return;
        setStarting(true);
        let result;
        try {
            result = await runBackup();
        } finally {
            setStarting(false);
        }

        if (!result.status) {
            showToast({ type: 'error', message: result.message });
            return;
        }

        showToast({ type: 'success', message: 'Backup started' });
        setPage(1);
        await load();
    };

    const upload = async (event: any) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) {
            return;
        }

        if (info?.upload_max_bytes && file.size > info.upload_max_bytes) {
            showToast({
                type: 'error',
                message: `File is larger than ${formatSize(info.upload_max_bytes)}`,
            });
            return;
        }

        if (starting || uploading) return;

        setUploading(true);
        let result;
        try {
            result = await uploadBackup(file);
        } finally {
            setUploading(false);
        }

        if (!result.status) {
            showToast({ type: 'error', message: result.message });
            return;
        }

        setPage(1);
        await load();
        showModalWindow({
            title: result.data?.already_listed
                ? 'This backup is already in the list'
                : 'Backup uploaded and checked',
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
        let result;
        try {
            result = await downloadBackup(item._id);
        } finally {
            setDownloadingId(null);
        }

        if (!result.status) {
            showToast({ type: 'error', message: result.message });
        }
    };

    const askRestore = (item: any) => {
        showModalWindow({
            title: 'Restore this backup?',
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
    const busy = running || restoring || starting || uploading;

    return (
        <div className="admin_panel_content_backups_page">
            <div className="admin_panel_content_backups_page_header">
                {info?.app_version ? (
                    <p className="admin_panel_content_backups_page_version">
                        <span className="admin_panel_content_backups_page_version_label">
                            Version
                        </span>
                        v{info.app_version}
                        {info.app_sha ? ` · ${info.app_sha}` : ''}
                        {info.db_version ? ` · data ${info.db_version}` : ''}
                    </p>
                ) : null}
                <div className="admin_panel_content_backups_page_header_info">
                    {info?.enabled ? (
                        <>
                            <p>
                                Daily at {info.schedule_at_utc} UTC — the
                                database and uploaded files. Copies from today
                                stay, then one a day for {info.keep_daily_days}{' '}
                                days and one a month for {info.keep_months}{' '}
                                months.
                            </p>
                        </>
                    ) : (
                        <p>Backups are disabled in this environment.</p>
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
                                <UploadIcon />
                                {uploading
                                    ? 'Uploading and checking…'
                                    : 'Upload a backup'}
                            </ActionButton>
                        </>
                    ) : null}
                    <PrimaryButton
                        onClick={start}
                        isLoading={starting}
                        disabled={!info?.enabled || busy}
                    >
                        <BackupIcon />
                        {running ? 'Backup in progress…' : 'Run a backup'}
                    </PrimaryButton>
                </div>
            </div>

            {restoring ? (
                <div className="backup_notice backup_notice_warning">
                    <p>
                        <b>Restore in progress.</b>{' '}
                        {PHASE_LABELS[job?.phase] || 'Preparing'}…
                    </p>
                    <p className="admin_panel_content_backups_page_hint">
                        The site is read-only right now. Do not close the page;
                        it will refresh on its own.
                    </p>
                </div>
            ) : null}

            {!restoring && info?.current ? (
                <div className="backup_notice">
                    <p>
                        <b>The system is currently on the backup from </b>
                        {format_date_time(info.current.taken_at)}
                    </p>
                    <p className="admin_panel_content_backups_page_hint">
                        Restored {format_date_time(info.current.restored_at)}.
                        Anything that changed after that is already new data on
                        top of the backup.
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
                                ? 'The last restore was interrupted.'
                                : 'The last restore failed.'}
                        </b>{' '}
                        {last.rolled_back
                            ? 'The system was returned to the state before the restore.'
                            : last.status === 'interrupted'
                              ? 'The database and files may have been restored only halfway. Restore the “Before restore” safety snapshot from the list below.'
                              : 'Check the data and, if needed, restore the safety snapshot from the list below.'}
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
                                <p className="admin_panel_content_backups_page_item_version">
                                    {item.contents?.app_version ??
                                        item.source?.app_version ??
                                        '—'}
                                </p>
                                <p className="admin_panel_content_backups_page_item_trigger">
                                    {kindLabel(item)}
                                    {info?.current?.backup_id === item._id ? (
                                        <span className="backup_current">
                                            Current
                                        </span>
                                    ) : null}
                                </p>
                                <p className="admin_panel_content_backups_page_item_size">
                                    <span className="admin_panel_content_backups_page_item_meta">
                                        {formatSize(item.size_bytes)}
                                        {item.source
                                            ? ` · taken ${format_date_time(item.source.created_at)}`
                                            : ` · ${formatDuration(item)}`}
                                    </span>
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
                                            <DownloadIcon />
                                            Download
                                        </ActionButton>
                                    ) : item.file_removed_at ? (
                                        <p className="admin_panel_content_backups_page_hint">
                                            {item.file_removed_reason ===
                                            'replaced'
                                                ? 'Deleted: replaced by a newer one for this day'
                                                : item.file_removed_reason ===
                                                    'restored'
                                                  ? 'Deleted: the restore succeeded, so the snapshot is no longer needed'
                                                  : 'Deleted because it expired'}
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
                                            <RestoreIcon />
                                            Restore
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
                            No backups yet
                        </p>
                    )
                }
            </Pagination>
        </div>
    );
};

export default BackupsPage;
