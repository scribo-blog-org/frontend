import { MAX_MEDIA_BYTES } from './media';

export const MAX_MEDIA_ITEMS = 10;

export type PostMediaItem = {
    id?: string;
    type: 'image' | 'gif' | 'video' | 'embed';
    url: string;
    poster?: string;
    width?: number;
    height?: number;
    size?: number;
    mime?: string;
    external?: boolean;
    embed?: {
        provider?: string;
        embed_url?: string;
        title?: string;
        description?: string;
        thumbnail?: string;
    };
};

export function normalizePostMedia(post: any): PostMediaItem[] {
    if (Array.isArray(post?.media) && post.media.length) {
        return post.media.filter(
            (item: any) => item && typeof item.url === 'string' && item.type,
        );
    }

    if (post?.banner && typeof post.banner === 'object' && post.banner.url) {
        return [post.banner];
    }

    if (typeof post?.featured_image === 'string' && post.featured_image) {
        return [{ type: 'image', url: post.featured_image }];
    }

    return [];
}

export function mediaThumbnail(item: PostMediaItem | undefined | null) {
    if (!item) {
        return '';
    }

    if (item.type === 'image' || item.type === 'gif') {
        return item.url;
    }

    if (item.type === 'video') {
        return item.poster || '';
    }

    return item.embed?.thumbnail || '';
}

export function firstMediaThumbnail(post: any) {
    for (const item of normalizePostMedia(post)) {
        const thumbnail = mediaThumbnail(item);
        if (thumbnail) {
            return thumbnail;
        }
    }

    return '';
}

export type ComposerTileStatus = 'uploading' | 'done' | 'error';

export type ComposerTile = {
    key: string;
    status: ComposerTileStatus;
    kind: 'image' | 'gif' | 'video' | 'embed';
    size: number;
    progress: number;
    previewUrl: string;
    payload?: PostMediaItem;
    error?: string;
};

export function totalUploadBytes(tiles: Pick<ComposerTile, 'size'>[]) {
    return tiles.reduce((sum, tile) => sum + (tile.size || 0), 0);
}

export function canPublish(
    text: string,
    tiles: Pick<ComposerTile, 'size' | 'status'>[],
) {
    const done = tiles.filter((tile) => tile.status === 'done').length;

    if (tiles.some((tile) => tile.status === 'uploading')) {
        return { ok: false, reason: 'Wait for the uploads to finish' };
    }

    if (tiles.some((tile) => tile.status === 'error')) {
        return { ok: false, reason: 'Retry or remove the failed uploads' };
    }

    if (tiles.length > MAX_MEDIA_ITEMS) {
        return { ok: false, reason: `At most ${MAX_MEDIA_ITEMS} items` };
    }

    if (totalUploadBytes(tiles) > MAX_MEDIA_BYTES) {
        return { ok: false, reason: 'Media exceeds 100 MB' };
    }

    if (!text.trim() && done === 0) {
        return { ok: false, reason: 'Write something or add media' };
    }

    return { ok: true, reason: '' };
}

export function buildMediaPayload(tiles: ComposerTile[]): PostMediaItem[] {
    return tiles
        .filter((tile) => tile.status === 'done' && tile.payload)
        .map((tile) => tile.payload as PostMediaItem);
}
