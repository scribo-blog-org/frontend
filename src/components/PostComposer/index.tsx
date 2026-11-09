'use client';

import {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import { AppContext } from '@/providers/AppProviders';

import PageHeader from '../PageHeader';
import UserAvatar from '../UserBadge/UserAvatar';
import TextEditorField from '../Ui/TextEditorField';
import PrimaryButton from '../Ui/PrimaryButton';
import ActionButton from '../Ui/ActionButton';
import MediaTile from './MediaTile';

import { fetchLinkPreview } from '../../api/linkPreview.api';
import { classifyLink } from '../../utils/embed';
import { captureVideoFrame } from '../../utils/videoFrame';
import { mediaUrl } from '../../utils/image';
import {
    MAX_MEDIA_BYTES,
    MEDIA_ACCEPT,
    formatBytes,
    mediaKindFromMime,
    validateMediaFile,
} from '../../utils/media';
import {
    MAX_MEDIA_ITEMS,
    buildPostFormData,
    canPublish,
    mediaThumbnail,
    totalUploadBytes,
    type ComposerTile,
    type PostMediaItem,
} from '../../utils/postMedia';

import MediaInsertIcon from '../../assets/svg/media-insert.svg';
import LinkIcon from '../../assets/svg/link-icon.svg';

import './PostComposer.scss';

type PostComposerProps = {
    mode: 'create' | 'edit';
    initialHtml?: string;
    initialMedia?: PostMediaItem[];
    submitting?: boolean;
    onSubmit: (value: {
        formData: FormData;
        onProgress: (percent: number) => void;
        signal: AbortSignal;
    }) => Promise<void> | void;
    onCancel: () => void;
};

let tileCounter = 0;
const nextKey = () => `m${Date.now().toString(36)}${(tileCounter += 1)}`;

const isBlobUrl = (value: string) => value.startsWith('blob:');

function tilesFromMedia(media: PostMediaItem[]): ComposerTile[] {
    return media.map((item) => ({
        key: nextKey(),
        status: item.type === 'embed' ? 'embed' : 'existing',
        kind: item.type,
        size: item.size || 0,
        previewUrl: mediaThumbnail(item) ? mediaUrl(mediaThumbnail(item)) : '',
        payload: item,
    }));
}

const PostComposer = ({
    mode,
    initialHtml = '',
    initialMedia = [],
    submitting = false,
    onSubmit,
    onCancel,
}: PostComposerProps) => {
    const { profile, showToast } = useContext(AppContext);

    const [html, setHtml] = useState(initialHtml);
    const [tiles, setTiles] = useState<ComposerTile[]>(() =>
        tilesFromMedia(initialMedia),
    );
    const [dragging, setDragging] = useState(false);
    const [confirmDiscard, setConfirmDiscard] = useState(false);
    const [linkOpen, setLinkOpen] = useState(false);
    const [linkValue, setLinkValue] = useState('');
    const [linkPreview, setLinkPreview] = useState<any>(null);
    const [linkLoading, setLinkLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [confirmAbort, setConfirmAbort] = useState(false);

    const fileInput = useRef<HTMLInputElement>(null);
    const controller = useRef<AbortController | null>(null);
    const tilesRef = useRef<ComposerTile[]>(tiles);
    tilesRef.current = tiles;

    const initialSignature = useRef(
        initialMedia.map((item) => item.id || item.url).join('|'),
    );
    const signature = tiles
        .map((tile) => tile.payload?.id || tile.payload?.url || tile.key)
        .join('|');
    const dirty =
        html.trim() !== initialHtml.trim() ||
        signature !== initialSignature.current;

    const addFiles = useCallback(
        (incoming: File[]) => {
            let count = tilesRef.current.length;
            let bytes = totalUploadBytes(tilesRef.current);
            const created: ComposerTile[] = [];

            for (const file of incoming) {
                if (count >= MAX_MEDIA_ITEMS) {
                    showToast?.({
                        message: `At most ${MAX_MEDIA_ITEMS} items per post.`,
                        type: 'error',
                    });
                    break;
                }

                const problem = validateMediaFile(file);
                if (problem) {
                    showToast?.({
                        message: `${file.name}: ${problem}`,
                        type: 'error',
                    });
                    continue;
                }

                if (bytes + file.size > MAX_MEDIA_BYTES) {
                    showToast?.({
                        message: `${file.name}: media in one post cannot exceed ${formatBytes(MAX_MEDIA_BYTES)}.`,
                        type: 'error',
                    });
                    continue;
                }

                const kind = mediaKindFromMime(file.type) || 'image';
                created.push({
                    key: nextKey(),
                    status: 'local',
                    kind,
                    size: file.size,
                    file,
                    previewUrl:
                        kind === 'video' ? '' : URL.createObjectURL(file),
                });
                count += 1;
                bytes += file.size;
            }

            if (!created.length) {
                return;
            }

            setTiles((current) => [...current, ...created]);

            created.forEach((tile) => {
                if (tile.kind === 'video' && tile.file) {
                    captureVideoFrame(tile.file).then((frame) => {
                        if (!frame) {
                            return;
                        }
                        setTiles((current) =>
                            current.map((item) =>
                                item.key === tile.key
                                    ? { ...item, previewUrl: frame }
                                    : item,
                            ),
                        );
                    });
                }
            });
        },
        [showToast],
    );

    const removeTile = (key: string) => {
        const tile = tilesRef.current.find((item) => item.key === key);
        if (tile && isBlobUrl(tile.previewUrl)) {
            URL.revokeObjectURL(tile.previewUrl);
        }
        setTiles((current) => current.filter((item) => item.key !== key));
    };

    useEffect(() => {
        return () => {
            controller.current?.abort();
            tilesRef.current.forEach((tile) => {
                if (isBlobUrl(tile.previewUrl)) {
                    URL.revokeObjectURL(tile.previewUrl);
                }
            });
        };
    }, []);
    const requestCancel = useCallback(() => {
        if (submitting) {
            setConfirmAbort(true);
            return;
        }
        if (dirty && !confirmDiscard) {
            setConfirmDiscard(true);
            return;
        }
        onCancel();
    }, [submitting, dirty, confirmDiscard, onCancel]);

    const abortUpload = () => {
        controller.current?.abort();
        setConfirmAbort(false);
    };

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !linkOpen) {
                requestCancel();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [requestCancel, linkOpen]);

    useEffect(() => {
        if (!dirty) {
            return;
        }
        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [dirty]);

    useEffect(() => {
        if (!linkOpen) {
            return;
        }

        const info = classifyLink(linkValue);
        setLinkPreview(null);

        if (!info) {
            return;
        }

        if (info.kind === 'youtube') {
            setLinkPreview({ title: 'YouTube video', image: info.thumbnail });
            return;
        }

        if (info.kind === 'image') {
            setLinkPreview({ title: 'Image', image: info.url });
            return;
        }

        if (info.kind === 'vimeo' || info.kind === 'video') {
            setLinkPreview({
                title: info.kind === 'vimeo' ? 'Vimeo video' : 'Video file',
                image: '',
            });
            return;
        }

        let cancelled = false;
        setLinkLoading(true);
        const timer = window.setTimeout(async () => {
            const result = await fetchLinkPreview(info.url);
            if (cancelled) {
                return;
            }
            setLinkLoading(false);
            setLinkPreview(
                result?.status === true && result.data
                    ? {
                          title: result.data.media_type
                              ? result.data.media_type === 'video'
                                  ? 'Video'
                                  : 'Image'
                              : result.data.title || info.url,
                          image: result.data.image || '',
                      }
                    : { title: info.url, image: '' },
            );
        }, 450);

        return () => {
            cancelled = true;
            setLinkLoading(false);
            window.clearTimeout(timer);
        };
    }, [linkValue, linkOpen]);

    const addLink = () => {
        const info = classifyLink(linkValue);

        if (!info) {
            showToast?.({ message: 'Enter a valid link.', type: 'error' });
            return;
        }

        if (tilesRef.current.length >= MAX_MEDIA_ITEMS) {
            showToast?.({
                message: `At most ${MAX_MEDIA_ITEMS} items per post.`,
                type: 'error',
            });
            return;
        }

        const tileKey = nextKey();
        const knownPreview = linkPreview?.image || '';
        setTiles((current) => [
            ...current,
            {
                key: tileKey,
                status: 'embed',
                kind: 'embed',
                size: 0,
                previewUrl: knownPreview,
                payload: { type: 'embed', url: info.url },
            },
        ]);
        if (!knownPreview) {
            const previewFor = (value: string) =>
                classifyLink(value)?.kind === 'youtube'
                    ? (classifyLink(value) as any).thumbnail || ''
                    : '';
            const immediate = previewFor(info.url);
            const fill = (image: string) =>
                image &&
                setTiles((current) =>
                    current.map((tile) =>
                        tile.key === tileKey && !tile.previewUrl
                            ? { ...tile, previewUrl: image }
                            : tile,
                    ),
                );
            if (immediate) {
                fill(immediate);
            } else {
                fetchLinkPreview(info.url).then((result: any) => {
                    if (result?.status === true && result.data?.image) {
                        fill(result.data.image);
                    }
                });
            }
        }
        setLinkValue('');
        setLinkPreview(null);
        setLinkOpen(false);
    };

    const total = totalUploadBytes(tiles);
    const overLimit = total > MAX_MEDIA_BYTES;
    const verdict = canPublish(html, tiles);
    const hasText = html.trim() !== '';
    const ready = verdict.ok;

    const publish = () => {
        if (!ready || submitting) {
            return;
        }
        const next = new AbortController();
        controller.current = next;
        setProgress(0);
        setConfirmAbort(false);
        onSubmit({
            formData: buildPostFormData(html, tiles),
            onProgress: setProgress,
            signal: next.signal,
        });
    };

    const hasFiles = (event: any) =>
        Array.from(event.dataTransfer?.types || []).includes('Files');

    const title = mode === 'create' ? 'New post' : 'Edit post';

    return (
        <div className="composer">
            <PageHeader
                title={title}
                actions={
                    confirmAbort && submitting ? (
                        <>
                            <span className="composer_confirm">
                                Cancel the upload?
                            </span>
                            <ActionButton
                                onClick={() => setConfirmAbort(false)}
                            >
                                Keep uploading
                            </ActionButton>
                            <ActionButton onClick={abortUpload}>
                                Cancel upload
                            </ActionButton>
                        </>
                    ) : confirmDiscard ? (
                        <>
                            <span className="composer_confirm">
                                Discard this post?
                            </span>
                            <ActionButton
                                onClick={() => setConfirmDiscard(false)}
                            >
                                Keep editing
                            </ActionButton>
                            <ActionButton onClick={onCancel}>
                                Discard
                            </ActionButton>
                        </>
                    ) : (
                        <ActionButton onClick={requestCancel}>
                            Cancel
                        </ActionButton>
                    )
                }
            />

            <div
                className={`composer_card${dragging ? ' composer_card_dragging' : ''}`}
                onDragEnter={(event) => {
                    if (hasFiles(event) && !submitting) {
                        event.preventDefault();
                        setDragging(true);
                    }
                }}
                onDragOver={(event) => {
                    if (hasFiles(event)) {
                        event.preventDefault();
                    }
                }}
                onDragLeave={(event) => {
                    if (
                        !event.currentTarget.contains(
                            event.relatedTarget as Node | null,
                        )
                    ) {
                        setDragging(false);
                    }
                }}
                onDrop={(event) => {
                    if (!hasFiles(event)) {
                        return;
                    }
                    event.preventDefault();
                    setDragging(false);
                    if (!submitting) {
                        addFiles(Array.from(event.dataTransfer.files));
                    }
                }}
            >
                {dragging ? (
                    <div className="composer_drop">Drop to add media</div>
                ) : null}

                <div className="composer_row">
                    <div className="composer_side" aria-hidden="true">
                        <UserAvatar
                            data={profile}
                            className="composer_avatar"
                        />
                        <span className="composer_line" />
                    </div>

                    <div className="composer_main">
                        <span className="composer_nick">
                            {profile?.nick_name}
                        </span>

                        <TextEditorField
                            variant="compose"
                            placeholder="What's new?"
                            initialHtml={initialHtml}
                            disabled={submitting}
                            onChange={(value: string) => setHtml(value)}
                            belowEditor={
                                <>
                                    {tiles.length ? (
                                        <div className="composer_tiles">
                                            {tiles.map((tile) => (
                                                <MediaTile
                                                    key={tile.key}
                                                    tile={tile}
                                                    uploading={submitting}
                                                    progress={progress}
                                                    disabled={submitting}
                                                    onRemove={() =>
                                                        removeTile(tile.key)
                                                    }
                                                />
                                            ))}
                                        </div>
                                    ) : null}
                                    {linkOpen ? (
                                        <div className="composer_link">
                                            <div className="composer_link_row">
                                                <input
                                                    autoFocus
                                                    type="url"
                                                    value={linkValue}
                                                    placeholder="Any link"
                                                    onChange={(event) =>
                                                        setLinkValue(
                                                            event.target.value,
                                                        )
                                                    }
                                                    onKeyDown={(event) => {
                                                        if (
                                                            event.key ===
                                                            'Enter'
                                                        ) {
                                                            event.preventDefault();
                                                            addLink();
                                                        } else if (
                                                            event.key ===
                                                            'Escape'
                                                        ) {
                                                            event.stopPropagation();
                                                            setLinkOpen(false);
                                                        }
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={addLink}
                                                    disabled={
                                                        !classifyLink(linkValue)
                                                    }
                                                >
                                                    Add
                                                </button>
                                            </div>
                                            {linkLoading ? (
                                                <p className="composer_link_hint">
                                                    Loading preview…
                                                </p>
                                            ) : linkPreview ? (
                                                <div className="composer_link_preview">
                                                    {linkPreview.image ? (
                                                        <img
                                                            src={
                                                                linkPreview.image
                                                            }
                                                            alt=""
                                                        />
                                                    ) : null}
                                                    <span>
                                                        {linkPreview.title}
                                                    </span>
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </>
                            }
                            toolbarLeading={
                                <>
                                    <button
                                        type="button"
                                        className="app-transition"
                                        aria-label="Add photo or video"
                                        title="Add photo or video"
                                        disabled={
                                            submitting ||
                                            tiles.length >= MAX_MEDIA_ITEMS
                                        }
                                        onClick={() =>
                                            fileInput.current?.click()
                                        }
                                    >
                                        <MediaInsertIcon />
                                    </button>
                                    <button
                                        type="button"
                                        className="app-transition"
                                        aria-label="Add media by link"
                                        title="Add media by link"
                                        aria-pressed={linkOpen}
                                        disabled={submitting}
                                        onClick={() =>
                                            setLinkOpen((open) => !open)
                                        }
                                    >
                                        <LinkIcon />
                                    </button>
                                </>
                            }
                            toolbarTrailing={
                                total >= MAX_MEDIA_BYTES * 0.8 ? (
                                    <span
                                        className={`composer_counter${overLimit ? ' composer_counter_over' : ''}`}
                                    >
                                        {formatBytes(total)} /{' '}
                                        {formatBytes(MAX_MEDIA_BYTES)}
                                    </span>
                                ) : null
                            }
                        />

                        <input
                            ref={fileInput}
                            type="file"
                            accept={MEDIA_ACCEPT}
                            multiple
                            hidden
                            onChange={(event) => {
                                addFiles(Array.from(event.target.files || []));
                                event.target.value = '';
                            }}
                        />
                    </div>
                </div>

                <div className="composer_footer">
                    <span className="composer_hint">
                        {!verdict.ok && (hasText || tiles.length)
                            ? verdict.reason
                            : ''}
                    </span>
                    <PrimaryButton
                        className="composer_publish"
                        onClick={publish}
                        disabled={!ready}
                        isLoading={submitting}
                    >
                        {mode === 'create' ? 'Publish' : 'Save'}
                    </PrimaryButton>
                </div>
            </div>
        </div>
    );
};

export default PostComposer;
