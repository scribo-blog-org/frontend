'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import MediaViewer from '../MediaViewer';
import { mediaUrl } from '../../utils/image';
import { hostLabel, isSafeEmbedUrl } from '../../utils/embed';
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

const EmbedPlayer = ({ item }: { item: PostMediaItem }) => {
    const [playing, setPlaying] = useState(false);
    const embed = item.embed || {};
    const thumbnail = embed.thumbnail ? mediaUrl(embed.thumbnail) : '';

    if (!isSafeEmbedUrl(embed.embed_url)) {
        return null;
    }

    const embedUrl = String(embed.embed_url);

    if (playing) {
        return (
            <div className="post_media_frame">
                <iframe
                    src={`${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1`}
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

const LinkCard = ({ item }: { item: PostMediaItem }) => {
    const embed = item.embed || {};
    const thumbnail = embed.thumbnail ? mediaUrl(embed.thumbnail) : '';

    return (
        <a
            className="post_media_link"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
        >
            {thumbnail ? (
                <span className="post_media_link_image">
                    <img src={thumbnail} alt="" loading="lazy" />
                </span>
            ) : null}
            <span className="post_media_link_copy">
                <span className="post_media_link_host">
                    {hostLabel(item.url)}
                </span>
                <span className="post_media_link_title">
                    {embed.title || item.url}
                </span>
                {embed.description ? (
                    <span className="post_media_link_description">
                        {embed.description}
                    </span>
                ) : null}
            </span>
        </a>
    );
};

const Slide = ({
    item,
    onZoom,
}: {
    item: PostMediaItem;
    onZoom: () => void;
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
                <img src={src} alt="" loading="lazy" draggable={false} />
            </button>
        );
    }

    if (item.type === 'video') {
        return (
            <button
                type="button"
                className="post_media_open post_media_open_video"
                aria-label="Play video"
                onClick={onZoom}
            >
                <video
                    src={src}
                    poster={item.poster ? mediaUrl(item.poster) : undefined}
                    muted
                    playsInline
                    preload="metadata"
                />
                <span className="post_media_play">
                    <PlayIcon />
                </span>
            </button>
        );
    }

    if (item.type === 'embed') {
        return item.embed?.provider === 'link' || !item.embed?.embed_url ? (
            <LinkCard item={item} />
        ) : (
            <EmbedPlayer item={item} />
        );
    }

    return null;
};

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
    const track = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(0);
    const [zoom, setZoom] = useState<number | null>(null);
    const [canScroll, setCanScroll] = useState(false);

    useEffect(() => {
        const element = track.current;
        if (!element) {
            return;
        }
        const measure = () =>
            setCanScroll(element.scrollWidth > element.clientWidth + 2);
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
        const step = first.offsetWidth + 8;
        setActive(
            Math.max(
                0,
                Math.min(
                    items.length - 1,
                    Math.round(element.scrollLeft / step),
                ),
            ),
        );
    };

    return (
        <div
            className={`post_media post_media_${variant}${multiple ? ' post_media_multiple' : ''} ${className}`.trim()}
        >
            <div
                className="post_media_track"
                ref={track}
                onScroll={multiple ? onScroll : undefined}
            >
                {items.map((item, index) => (
                    <figure
                        key={item.id || `${item.url}-${index}`}
                        className={`post_media_slide post_media_${item.type}`}
                    >
                        <Slide
                            item={item}
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
                    {active > 0 ? (
                        <button
                            type="button"
                            className="post_media_arrow post_media_arrow_prev"
                            aria-label="Previous"
                            onClick={() => scrollTo(active - 1)}
                        >
                            ‹
                        </button>
                    ) : null}
                    {active < items.length - 1 ? (
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

export default PostMedia;
