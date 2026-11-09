'use client';

import type React from 'react';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';

import MediaViewer from '../MediaViewer';
import { mediaUrl } from '../../utils/image';
import {
    decodeEntities,
    hostLabel,
    isSafeEmbedUrl,
    parseHttpUrl,
    withTwitchParent,
} from '../../utils/embed';
import type { PostMediaItem } from '../../utils/postMedia';

import './PostMedia.scss';

type PostMediaProps = {
    media: PostMediaItem[];
    variant?: 'feed' | 'article';
    className?: string;
};

const PlayIcon = () => (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
        <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" />
    </svg>
);

const subscribeNothing = () => () => undefined;
const readHostname = () => window.location.hostname;
const serverHostname = () => '';

function playerSrc(embedUrl: string, provider: string, hostname: string) {
    try {
        const url = new URL(embedUrl);
        url.searchParams.set('autoplay', provider === 'twitch' ? 'true' : '1');
        const next = url.toString();
        return provider === 'twitch' ? withTwitchParent(next, hostname) : next;
    } catch {
        return embedUrl;
    }
}

const EmbedPlayer = ({ item }: { item: PostMediaItem }) => {
    const [playing, setPlaying] = useState(false);
    const hostname = useSyncExternalStore(
        subscribeNothing,
        readHostname,
        serverHostname,
    );
    const embed = item.embed || {};
    const thumbnail = embed.thumbnail ? mediaUrl(embed.thumbnail) : '';
    const provider = String(embed.provider || '');

    if (!isSafeEmbedUrl(embed.embed_url)) {
        return null;
    }

    const embedUrl = String(embed.embed_url);

    if (playing) {
        return (
            <div className="post_media_frame">
                <iframe
                    src={playerSrc(embedUrl, provider, hostname)}
                    title={embed.title || 'Embedded video'}
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                    allowFullScreen
                    sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                    referrerPolicy="strict-origin-when-cross-origin"
                />
            </div>
        );
    }

    return (
        <button
            type="button"
            className="post_media_frame post_media_poster"
            aria-label={`Play ${embed.title || 'video'}`}
            onClick={() => setPlaying(true)}
        >
            {thumbnail ? <img src={thumbnail} alt="" loading="lazy" /> : null}
            <span className="post_media_play">
                <PlayIcon />
            </span>
        </button>
    );
};
const AutoVideo = ({
    src,
    poster,
    onOpen,
}: {
    src: string;
    poster?: string;
    onOpen: () => void;
}) => {
    const ref = useRef<HTMLVideoElement>(null);
    const [autoplay, setAutoplay] = useState(true);

    useEffect(() => {
        const reduced =
            typeof window !== 'undefined' &&
            window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduced) {
            setAutoplay(false);
            return;
        }

        const element = ref.current;
        if (!element || typeof IntersectionObserver === 'undefined') {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
                    element.play().catch(() => undefined);
                } else {
                    element.pause();
                }
            },
            { threshold: [0, 0.6, 1] },
        );
        observer.observe(element);

        return () => {
            observer.disconnect();
            element.pause();
        };
    }, [src]);

    return (
        <button
            type="button"
            className="post_media_open post_media_open_video"
            aria-label="Open video"
            onClick={onOpen}
        >
            <video
                ref={ref}
                src={src}
                poster={poster}
                muted
                loop
                playsInline
                preload="metadata"
            />
            {autoplay ? null : (
                <span className="post_media_play">
                    <PlayIcon />
                </span>
            )}
        </button>
    );
};
const Slide = ({
    item,
    onZoom,
    eager = false,
}: {
    item: PostMediaItem;
    onZoom: () => void;
    eager?: boolean;
}) => {
    const src = mediaUrl(item.url);

    if (item.type === 'image' || item.type === 'gif') {
        return (
            <button
                type="button"
                className="post_media_open"
                aria-label="Open image"
                onClick={onZoom}
            >
                <img
                    src={src}
                    alt=""
                    loading={eager ? 'eager' : 'lazy'}
                    draggable={false}
                />
            </button>
        );
    }

    if (item.type === 'video') {
        return (
            <AutoVideo
                src={src}
                poster={item.poster ? mediaUrl(item.poster) : undefined}
                onOpen={onZoom}
            />
        );
    }

    if (item.type === 'embed') {
        return <EmbedPlayer item={item} />;
    }

    return null;
};

const MediaRow = ({
    media,
    variant = 'feed',
    className = '',
}: PostMediaProps) => {
    const items = useMemo(
        () =>
            (Array.isArray(media) ? media : []).filter(
                (item) => item && item.url && item.type,
            ),
        [media],
    );
    const track = useRef<HTMLDivElement>(null);
    const drag = useRef({
        down: false,
        moved: false,
        suppress: false,
        startX: 0,
        startLeft: 0,
    });

    const [active, setActive] = useState(0);
    const [zoom, setZoom] = useState<number | null>(null);
    const [canScroll, setCanScroll] = useState(false);
    const [edges, setEdges] = useState({ start: true, end: false });

    useEffect(() => {
        const element = track.current;
        if (!element) {
            return;
        }
        const measure = () => {
            setCanScroll(element.scrollWidth > element.clientWidth + 2);
            setEdges({
                start: element.scrollLeft <= 2,
                end:
                    element.scrollLeft + element.clientWidth >=
                    element.scrollWidth - 2,
            });
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        element.querySelectorAll('img, video').forEach((node) => {
            node.addEventListener('load', measure);
            node.addEventListener('loadedmetadata', measure);
        });
        return () => observer.disconnect();
    }, [media]);
    const closeZoom = useCallback(() => setZoom(null), []);

    const zoomable = useMemo(
        () =>
            items
                .map((item, index) => ({ item, index }))
                .filter(
                    ({ item }) =>
                        item.type === 'image' ||
                        item.type === 'gif' ||
                        item.type === 'video',
                ),
        [items],
    );

    if (!items.length) {
        return null;
    }

    const multiple = items.length > 1;

    const scrollTo = (index: number) => {
        const element = track.current;
        const slide = element?.children[index] as HTMLElement | undefined;
        if (element && slide) {
            element.scrollTo({
                left: slide.offsetLeft - element.offsetLeft,
                behavior: 'smooth',
            });
        }
    };

    const onScroll = () => {
        const element = track.current;
        const first = element?.children[0] as HTMLElement | undefined;
        if (!element || !first) {
            return;
        }
        const atEnd =
            element.scrollLeft + element.clientWidth >= element.scrollWidth - 2;
        setEdges({ start: element.scrollLeft <= 2, end: atEnd });
        const step = first.offsetWidth + 8;
        setActive(
            atEnd
                ? items.length - 1
                : Math.max(
                      0,
                      Math.min(
                          items.length - 1,
                          Math.round(element.scrollLeft / step),
                      ),
                  ),
        );
    };

    const dragStart = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.pointerType !== 'mouse' || event.button !== 0) {
            return;
        }
        drag.current = {
            down: true,
            moved: false,
            suppress: false,
            startX: event.clientX,
            startLeft: track.current?.scrollLeft ?? 0,
        };
    };

    const dragMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const element = track.current;
        if (!drag.current.down || !element) {
            return;
        }
        const delta = event.clientX - drag.current.startX;
        if (!drag.current.moved && Math.abs(delta) > 5) {
            drag.current.moved = true;
            element.classList.add('post_media_track_dragging');
        }
        if (drag.current.moved) {
            element.scrollLeft = drag.current.startLeft - delta;
        }
    };

    const dragEnd = () => {
        const element = track.current;
        if (drag.current.down && drag.current.moved) {
            drag.current.suppress = true;
            window.setTimeout(() => {
                drag.current.suppress = false;
            }, 0);
        }
        drag.current.down = false;
        drag.current.moved = false;
        element?.classList.remove('post_media_track_dragging');
    };

    const swallowClick = (event: React.MouseEvent) => {
        if (drag.current.suppress) {
            event.preventDefault();
            event.stopPropagation();
            drag.current.suppress = false;
        }
    };
    return (
        <div
            className={`post_media post_media_${variant}${multiple ? ' post_media_multiple' : ''} ${className}`.trim()}
        >
            <div
                className="post_media_track"
                ref={track}
                onScroll={multiple ? onScroll : undefined}
                onPointerDown={multiple ? dragStart : undefined}
                onPointerMove={multiple ? dragMove : undefined}
                onPointerUp={multiple ? dragEnd : undefined}
                onPointerLeave={multiple ? dragEnd : undefined}
                onClickCapture={swallowClick}
            >
                {items.map((item, index) => (
                    <figure
                        key={`${item.id || item.url}-${index}`}
                        className={`post_media_slide post_media_${item.type}`}
                    >
                        <Slide
                            item={item}
                            eager={multiple}
                            onZoom={() =>
                                setZoom(
                                    zoomable.findIndex(
                                        (entry) => entry.index === index,
                                    ),
                                )
                            }
                        />
                    </figure>
                ))}
            </div>

            {multiple && canScroll ? (
                <>
                    <span className="post_media_pill">
                        {active + 1}/{items.length}
                    </span>
                    {!edges.start ? (
                        <button
                            type="button"
                            className="post_media_arrow post_media_arrow_prev"
                            aria-label="Previous"
                            onClick={() => scrollTo(active - 1)}
                        >
                            ‹
                        </button>
                    ) : null}
                    {!edges.end ? (
                        <button
                            type="button"
                            className="post_media_arrow post_media_arrow_next"
                            aria-label="Next"
                            onClick={() => scrollTo(active + 1)}
                        >
                            ›
                        </button>
                    ) : null}
                    <div className="post_media_dots" aria-hidden="true">
                        {items.map((item, index) => (
                            <span
                                key={`${item.url}-dot-${index}`}
                                className={
                                    index === active
                                        ? 'post_media_dot post_media_dot_active'
                                        : 'post_media_dot'
                                }
                            />
                        ))}
                    </div>
                </>
            ) : null}

            {zoom !== null && zoom >= 0 ? (
                <MediaViewer
                    items={zoomable.map(({ item }) => ({
                        type: item.type as 'image' | 'gif' | 'video',
                        src: mediaUrl(item.url),
                        poster: item.poster ? mediaUrl(item.poster) : undefined,
                    }))}
                    index={zoom}
                    onClose={closeZoom}
                />
            ) : null}
        </div>
    );
};

const isLegacyLink = (item: PostMediaItem) =>
    item.type === 'embed' &&
    (item.embed?.provider === 'link' || !item.embed?.embed_url);

const PostMedia = ({
    media,
    variant = 'feed',
    className = '',
}: PostMediaProps) => {
    const items = useMemo(
        () =>
            (Array.isArray(media) ? media : []).filter(
                (item) => item && item.url && item.type,
            ),
        [media],
    );
    const slides = useMemo(
        () => items.filter((item) => !isLegacyLink(item)),
        [items],
    );
    const legacyLinks = useMemo(
        () =>
            items
                .filter(isLegacyLink)
                .map((item) => ({
                    url: parseHttpUrl(item.url)?.href || '',
                    label:
                        decodeEntities(item.embed?.title) ||
                        hostLabel(item.url) ||
                        item.url,
                }))
                .filter((link) => link.url),
        [items],
    );

    if (!slides.length && !legacyLinks.length) {
        return null;
    }

    return (
        <div className={`post_media_stack ${className}`.trim()}>
            {slides.length ? (
                <MediaRow media={slides} variant={variant} />
            ) : null}
            {legacyLinks.length ? (
                <ul className="post_media_legacy_links">
                    {legacyLinks.map((link, index) => (
                        <li key={`${link.url}-${index}`}>
                            <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {link.label}
                            </a>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
};

export default PostMedia;
