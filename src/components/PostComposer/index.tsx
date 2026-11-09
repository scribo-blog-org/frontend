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
import { classifyLink, type LinkInfo } from '../../utils/embed';
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

type UrlPreview = {
    status: 'loading' | 'ok' | 'error';
    kind: ComposerTile['kind'];
    label: string;
    image: string;
};

const URL_ERROR =
    'Only image, video, YouTube, Vimeo or Twitch links can be added here. Paste other links into your text.';

function directKind(info: LinkInfo): ComposerTile['kind'] {
    if (info.kind === 'video') {
        return 'video';
    }
    return /\.gif$/i.test(new URL(info.url).pathname) ? 'gif' : 'image';
}

function previewFromInfo(info: LinkInfo): UrlPreview | null {
    switch (info.kind) {
        case 'youtube':
            return {
                status: 'ok',
                kind: 'embed',
                label: 'YouTube video',
                image: info.thumbnail || '',
            };
        case 'vimeo':
            return {
                status: 'ok',
                kind: 'embed',
                label: 'Vimeo video',
                image: '',
            };
        case 'twitch':
            return {
                status: 'ok',
                kind: 'embed',
                label: 'Twitch',
                image: '',
            };
        case 'image':
            return {
                status: 'ok',
                kind: directKind(info),
                label: directKind(info) === 'gif' ? 'GIF' : 'Image',
                image: info.url,
            };
        case 'video':
            return {
                status: 'ok',
                kind: 'video',
                label: 'Video file',
                image: '',
            };
        default:
            return null;
    }
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
    const [linkPreview, setLinkPreview] = useState<UrlPreview | null>(null);
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
        const direct = info ? previewFromInfo(info) : null;
        setLinkPreview(direct);

        if (!info) {
            return;
        }

        let cancelled = false;
        const timer = window.setTimeout(
            async () => {
                const result = await fetchLinkPreview(info.url);
                if (cancelled) {
                    return;
                }
                const data = result?.status === true ? result.data : null;

                if (direct) {
                    if (data?.image && !direct.image) {
                        setLinkPreview({ ...direct, image: data.image });
                    }
                    return;
                }

                const mediaType = data?.media_type;
                if (
                    mediaType === 'image' ||
                    mediaType === 'gif' ||
                    mediaType === 'video'
                ) {
                    setLinkPreview({
                        status: 'ok',
                        kind: mediaType,
                        label:
                            mediaType === 'video'
                                ? 'Video file'
                                : mediaType === 'gif'
                                  ? 'GIF'
                                  : 'Image',
                        image: mediaType === 'video' ? '' : data?.image || '',
                    });
                    return;
                }

                setLinkPreview({
                    status: 'error',
                    kind: 'embed',
                    label: '',
                    image: '',
                });
            },
            direct ? 300 : 450,
        );

        if (!direct) {
            setLinkPreview({
                status: 'loading',
                kind: 'embed',
                label: '',
                image: '',
            });
        }

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [linkValue, linkOpen]);
    const addLink = () => {
        const info = classifyLink(linkValue);

        if (!info || linkPreview?.status !== 'ok') {
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
        setTiles((current) => [
            ...current,
            {
                key: tileKey,
                status: 'embed',
                kind: linkPreview.kind,
                size: 0,
                previewUrl: linkPreview.image,
                payload: { type: 'embed', url: info.url },
            },
        ]);

        if (!linkPreview.image && info.kind === 'twitch') {
            fetchLinkPreview(info.url).then((result: any) => {
                const image = result?.status === true && result.data?.image;
                if (image) {
                    setTiles((current) =>
                        current.map((tile) =>
                            tile.key === tileKey && !tile.previewUrl
                                ? { ...tile, previewUrl: image }
                                : tile,
                        ),
                    );
                }
            });
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
                                    ) : null}{' '}
                                    {linkOpen ? (
                                        <div className="composer_link">
                                            <p className="composer_link_title">
                                                Add media from a URL
                                            </p>
                                            <div className="composer_link_row">
                                                <input
                                                    autoFocus
                                                    type="url"
                                                    value={linkValue}
                                                    placeholder="Image, video, YouTube or Twitch link"
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
                                                        linkPreview?.status !==
                                                        'ok'
                                                    }
                                                >
                                                    Add
                                                </button>
                                            </div>
                                            {linkPreview?.status === 'error' ? (
                                                <p className="composer_link_error">
                                                    {URL_ERROR}
                                                </p>
                                            ) : linkPreview?.status ===
                                              'loading' ? (
                                                <p className="composer_link_hint">
                                                    Checking the linkвЂ¦
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
                                                        {linkPreview.label}
                                                    </span>
                                                </div>
                                            ) : (
                                                <p className="composer_link_hint">
                                                    Direct image or video links
                                                    go into the carousel,
                                                    YouTube and Twitch links
                                                    become players. For any
                                                    other link, just paste it
                                                    into your text.
                                                </p>
                                            )}
                                        </div>
                                    ) : null}{' '}
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
                                        aria-label="Add media from a URL"
                                        title="Add media from a URL"
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
