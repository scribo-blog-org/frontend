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

import { uploadPostMedia } from '../../api/media.api';
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
    buildMediaPayload,
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
        html: string;
        media: PostMediaItem[];
    }) => Promise<void> | void;
    onCancel: () => void;
};

let tileCounter = 0;
const nextKey = () => `tile-${Date.now()}-${(tileCounter += 1)}`;

function tilesFromMedia(media: PostMediaItem[]): ComposerTile[] {
    return media.map((item) => ({
        key: nextKey(),
        status: 'done',
        kind: item.type,
        size: item.size || 0,
        progress: 100,
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

    const fileInput = useRef<HTMLInputElement>(null);
    const files = useRef(new Map<string, File>());
    const controllers = useRef(new Map<string, AbortController>());
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

    const patchTile = useCallback(
        (key: string, patch: Partial<ComposerTile>) =>
            setTiles((current) =>
                current.map((tile) =>
                    tile.key === key ? { ...tile, ...patch } : tile,
                ),
            ),
        [],
    );

    const startUpload = useCallback(
        async (key: string) => {
            const file = files.current.get(key);
            if (!file) {
                return;
            }

            const controller = new AbortController();
            controllers.current.set(key, controller);
            patchTile(key, { status: 'uploading', progress: 0, error: '' });

            const result = await uploadPostMedia(
                file,
                (percent) => patchTile(key, { progress: percent }),
                controller.signal,
            );
            controllers.current.delete(key);

            if (!tilesRef.current.some((tile) => tile.key === key)) {
                return;
            }

            if (!result.status) {
                patchTile(key, { status: 'error', error: result.message });
                return;
            }

            patchTile(key, {
                status: 'done',
                progress: 100,
                kind: result.data.type,
                payload: {
                    type: result.data.type,
                    url: result.data.url,
                    mime: result.data.mime,
                    size: result.data.size ?? file.size,
                },
            });
        },
        [patchTile],
    );

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
                const key = nextKey();
                files.current.set(key, file);
                created.push({
                    key,
                    status: 'uploading',
                    kind,
                    size: file.size,
                    progress: 0,
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
                const file = files.current.get(tile.key);
                if (tile.kind === 'video' && file) {
                    captureVideoFrame(file).then((frame) => {
                        if (frame) {
                            patchTile(tile.key, { previewUrl: frame });
                        }
                    });
                }
                startUpload(tile.key);
            });
        },
        [patchTile, showToast, startUpload],
    );

    const removeTile = (key: string) => {
        controllers.current.get(key)?.abort();
        controllers.current.delete(key);
        files.current.delete(key);
        setTiles((current) => {
            const tile = current.find((item) => item.key === key);
            if (tile?.previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(tile.previewUrl);
            }
            return current.filter((item) => item.key !== key);
        });
    };

    useEffect(() => {
        const live = controllers.current;
        return () => {
            live.forEach((controller) => controller.abort());
        };
    }, []);

    const requestCancel = useCallback(() => {
        if (dirty && !confirmDiscard) {
            setConfirmDiscard(true);
            return;
        }
        onCancel();
    }, [dirty, confirmDiscard, onCancel]);

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
                          title: result.data.title || info.url,
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

        setTiles((current) => [
            ...current,
            {
                key: nextKey(),
                status: 'done',
                kind: 'embed',
                size: 0,
                progress: 100,
                previewUrl: linkPreview?.image || '',
                payload: { type: 'embed', url: info.url },
            },
        ]);
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
        onSubmit({ html, media: buildMediaPayload(tiles) });
    };

    const hasFiles = (event: any) =>
        Array.from(event.dataTransfer?.types || []).includes('Files');

    const title = mode === 'create' ? 'New post' : 'Edit post';

    return (
        <div className="composer">
            <PageHeader
                title={title}
                actions={
                    confirmDiscard ? (
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
                        <ActionButton
                            onClick={requestCancel}
                            disabled={submitting}
                        >
                            Cancel
                        </ActionButton>
                    )
                }
            />

            <div
                className={`composer_card${dragging ? ' composer_card_dragging' : ''}`}
                onDragEnter={(event) => {
                    if (hasFiles(event)) {
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
                    addFiles(Array.from(event.dataTransfer.files));
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
                                                    onRemove={() =>
                                                        removeTile(tile.key)
                                                    }
                                                    onRetry={() =>
                                                        startUpload(tile.key)
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
