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

export type ComposerTileStatus = 'local' | 'existing' | 'embed';

export type ComposerTile = {
    key: string;
    status: ComposerTileStatus;
    kind: 'image' | 'gif' | 'video' | 'embed';
    size: number;
    previewUrl: string;
    file?: File;
    payload?: PostMediaItem;
};

export type PostMediaPayloadItem = PostMediaItem | { upload: string };

export function totalUploadBytes(tiles: Pick<ComposerTile, 'size'>[]) {
    return tiles.reduce((sum, tile) => sum + (tile.size || 0), 0);
}

export function canPublish(text: string, tiles: Pick<ComposerTile, 'size'>[]) {
    if (tiles.length > MAX_MEDIA_ITEMS) {
        return { ok: false, reason: `At most ${MAX_MEDIA_ITEMS} items` };
    }

    if (totalUploadBytes(tiles) > MAX_MEDIA_BYTES) {
        return { ok: false, reason: 'Media exceeds 100 MB' };
    }

    if (!text.trim() && tiles.length === 0) {
        return { ok: false, reason: 'Write something or add media' };
    }

    return { ok: true, reason: '' };
}

export function buildMediaPayload(
    tiles: Pick<ComposerTile, 'key' | 'status' | 'payload'>[],
): PostMediaPayloadItem[] {
    const items: PostMediaPayloadItem[] = [];

    for (const tile of tiles) {
        if (tile.status === 'local') {
            items.push({ upload: tile.key });
        } else if (tile.payload) {
            items.push(tile.payload);
        }
    }

    return items;
}

export function buildPostFormData(
    html: string,
    tiles: Pick<ComposerTile, 'key' | 'status' | 'payload' | 'file'>[],
) {
    const form = new FormData();
    form.append('postContent', html);
    form.append('media', JSON.stringify(buildMediaPayload(tiles)));

    for (const tile of tiles) {
        if (tile.status === 'local' && tile.file) {
            form.append(tile.key, tile.file, tile.file.name);
        }
    }

    return form;
}
