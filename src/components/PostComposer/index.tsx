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
import CancelButton from '../Ui/CancelButton';
import DangerButton from '../Ui/DangerButton';
import { ModalFooter } from '../Ui';
import MediaTile from './MediaTile';
import MediaViewer, { type MediaViewerItem } from '../MediaViewer';

import { fetchLinkPreview } from '../../api/linkPreview.api';
import { classifyLink, type LinkInfo } from '../../utils/embed';
import {
    asDetectedMedia,
    decideLinkAction,
    linkHref,
} from '../../utils/linkAction';
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
import WarningIcon from '../../assets/svg/warning-icon.svg';

import './PostComposer.scss';

const ConfirmContent = ({
    hint,
    keepLabel,
    confirmLabel,
    onKeep,
    onConfirm,
}: {
    hint: string;
    keepLabel: string;
    confirmLabel: string;
    onKeep: () => void;
    onConfirm: () => void;
}) => (
    <ModalFooter hint={hint}>
        <ActionButton onClick={onKeep}>{keepLabel}</ActionButton>
        <DangerButton onClick={onConfirm} isActive={true}>
            {confirmLabel}
        </DangerButton>
    </ModalFooter>
);

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
    status: 'loading' | 'ok' | 'text';
    kind: ComposerTile['kind'];
    label: string;
    image: string;
};

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
    const {
        profile,
        showToast,
        modalWindow,
        showModalWindow,
        requestCloseModal,
    } = useContext(AppContext);

    const [html, setHtml] = useState(initialHtml);
    const [tiles, setTiles] = useState<ComposerTile[]>(() =>
        tilesFromMedia(initialMedia),
    );
    const [dragging, setDragging] = useState(false);
    const [viewer, setViewer] = useState<{
        items: MediaViewerItem[];
        index: number;
        objectUrls: string[];
    } | null>(null);
    const [linkOpen, setLinkOpen] = useState(false);
    const [linkValue, setLinkValue] = useState('');
    const [linkSelection, setLinkSelection] = useState(false);
    const editorApi = useRef<any>(null);
    const [linkPreview, setLinkPreview] = useState<UrlPreview | null>(null);
    const [progress, setProgress] = useState(0);

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
    const abortUpload = useCallback(() => {
        controller.current?.abort();
    }, []);

    const requestCancel = useCallback(() => {
        if (submitting) {
            showModalWindow({
                title: 'Cancel the upload?',
                subtitle: 'The post will not be published',
                icon: <WarningIcon />,
                size: 'small',
                content: (
                    <ConfirmContent
                        hint="Uploaded files will be discarded"
                        keepLabel="Keep uploading"
                        confirmLabel="Cancel upload"
                        onKeep={requestCloseModal}
                        onConfirm={() => {
                            abortUpload();
                            requestCloseModal();
                        }}
                    />
                ),
                showCloseButton: false,
                closeFunc: () => {},
            });
            return;
        }
        if (dirty) {
            showModalWindow({
                title: 'Discard this post?',
                subtitle: 'Your changes will be lost',
                icon: <WarningIcon />,
                size: 'small',
                content: (
                    <ConfirmContent
                        hint="This cannot be undone"
                        keepLabel="Keep editing"
                        confirmLabel="Discard"
                        onKeep={requestCloseModal}
                        onConfirm={() => {
                            requestCloseModal();
                            onCancel();
                        }}
                    />
                ),
                showCloseButton: false,
                closeFunc: () => {},
            });
            return;
        }
        onCancel();
    }, [
        submitting,
        dirty,
        onCancel,
        abortUpload,
        showModalWindow,
        requestCloseModal,
    ]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (
                event.key === 'Escape' &&
                !linkOpen &&
                !modalWindow &&
                !viewer
            ) {
                requestCancel();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [requestCancel, linkOpen, modalWindow, viewer]);

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
        if (!linkOpen || linkSelection) {
            setLinkPreview(null);
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

                const mediaType = asDetectedMedia(data?.media_type);
                if (mediaType) {
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
                    status: 'text',
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
    }, [linkValue, linkOpen, linkSelection]);
    const closeLink = () => {
        setLinkValue('');
        setLinkPreview(null);
        setLinkOpen(false);
    };

    const toggleLink = () => {
        if (linkOpen) {
            closeLink();
            return;
        }
        setLinkSelection(editorApi.current?.capture() ?? false);
        setLinkOpen(true);
    };

    const addMediaTile = (info: LinkInfo, preview: UrlPreview) => {
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
                kind: preview.kind,
                size: 0,
                previewUrl: preview.image,
                payload: { type: 'embed', url: info.url },
            },
        ]);

        if (!preview.image && info.kind === 'twitch') {
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
    };

    const addLink = async () => {
        const info = classifyLink(linkValue);

        if (!info) {
            showToast?.({ message: 'Enter a valid link.', type: 'error' });
            return;
        }

        if (linkSelection) {
            if (editorApi.current?.applyLink(linkHref(linkValue, info))) {
                closeLink();
            }
            return;
        }

        let preview = linkPreview?.status === 'ok' ? linkPreview : null;
        let detected: unknown = preview ? preview.kind : null;

        if (!preview && !previewFromInfo(info)) {
            const result: any = await fetchLinkPreview(info.url);
            const mediaType = asDetectedMedia(
                result?.status === true ? result.data?.media_type : null,
            );
            if (mediaType) {
                detected = mediaType;
                preview = {
                    status: 'ok',
                    kind: mediaType,
                    label: '',
                    image:
                        mediaType === 'video' ? '' : result.data?.image || '',
                };
            }
        }

        const action = decideLinkAction(false, info, detected);

        if (action === 'media') {
            addMediaTile(
                info,
                preview ?? (previewFromInfo(info) as UrlPreview),
            );
        } else {
            editorApi.current?.insertText(linkHref(linkValue, info));
        }

        closeLink();
    };
    const openViewer = (key: string) => {
        const viewable = tilesRef.current.filter(
            (tile) => tile.kind !== 'embed',
        );
        const index = viewable.findIndex((tile) => tile.key === key);

        if (index < 0) {
            return;
        }

        const objectUrls: string[] = [];
        const items = viewable.map((tile): MediaViewerItem => {
            const type = tile.kind as MediaViewerItem['type'];

            if (tile.status === 'existing' && tile.payload) {
                return {
                    type,
                    src: mediaUrl(tile.payload.url),
                    poster: tile.payload.poster
                        ? mediaUrl(tile.payload.poster)
                        : undefined,
                };
            }

            if (type === 'video' && tile.file) {
                const src = URL.createObjectURL(tile.file);
                objectUrls.push(src);
                return { type, src, poster: tile.previewUrl || undefined };
            }

            return { type, src: tile.previewUrl };
        });

        setViewer({ items, index, objectUrls });
    };

    const closeViewer = () => {
        viewer?.objectUrls.forEach((url) => URL.revokeObjectURL(url));
        setViewer(null);
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
                    <ActionButton onClick={requestCancel}>Cancel</ActionButton>
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
                            editorApiRef={editorApi}
                            belowEditor={
                                <>
                                    {linkOpen ? (
                                        <div className="composer_link">
                                            <p className="composer_link_title">
                                                {linkSelection
                                                    ? 'Link the selected text'
                                                    : 'Add a link'}
                                            </p>
                                            <div className="composer_link_row">
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    inputMode="url"
                                                    value={linkValue}
                                                    placeholder="Paste a link"
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
                                                            closeLink();
                                                            editorApi.current?.focus();
                                                        }
                                                    }}
                                                />
                                                <CancelButton
                                                    className="composer_link_cancel"
                                                    onClick={() => {
                                                        closeLink();
                                                        editorApi.current?.focus();
                                                    }}
                                                >
                                                    Cancel
                                                </CancelButton>
                                                <PrimaryButton
                                                    onClick={addLink}
                                                    disabled={
                                                        !classifyLink(linkValue)
                                                    }
                                                >
                                                    Add
                                                </PrimaryButton>
                                            </div>
                                            {linkSelection ? (
                                                <p className="composer_link_hint">
                                                    The selected text becomes a
                                                    link.
                                                </p>
                                            ) : linkPreview?.status ===
                                              'loading' ? (
                                                <p className="composer_link_hint">
                                                    Checking the linkвЂ¦
                                                </p>
                                            ) : linkPreview?.status === 'ok' ? (
                                                <>
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
                                                    <p className="composer_link_hint">
                                                        Will be added to the
                                                        carousel
                                                    </p>
                                                </>
                                            ) : linkPreview?.status ===
                                              'text' ? (
                                                <p className="composer_link_hint">
                                                    Will be inserted as a link
                                                </p>
                                            ) : (
                                                <p className="composer_link_hint">
                                                    YouTube, Twitch, photo and
                                                    video links are added to the
                                                    carousel. Other links are
                                                    inserted into your text.
                                                </p>
                                            )}
                                        </div>
                                    ) : null}
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
                                                    onOpen={
                                                        tile.kind === 'embed'
                                                            ? undefined
                                                            : () =>
                                                                  openViewer(
                                                                      tile.key,
                                                                  )
                                                    }
                                                />
                                            ))}
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
                                        className={`app-transition${linkOpen ? ' text_editor_tool_active' : ''}`}
                                        aria-label="Add link"
                                        title="Add link"
                                        aria-pressed={linkOpen}
                                        disabled={submitting}
                                        onMouseDown={(event) =>
                                            event.preventDefault()
                                        }
                                        onClick={toggleLink}
                                    >
                                        <LinkIcon />
                                    </button>{' '}
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
            {viewer ? (
                <MediaViewer
                    items={viewer.items}
                    index={viewer.index}
                    onClose={closeViewer}
                />
            ) : null}
        </div>
    );
};

export default PostComposer;
