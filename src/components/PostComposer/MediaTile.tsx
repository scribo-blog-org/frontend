'use client';

import { hostLabel } from '../../utils/embed';
import type { ComposerTile } from '../../utils/postMedia';

const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const ProgressRing = ({ percent }: { percent: number }) => (
    <svg
        className="composer_ring"
        viewBox="0 0 40 40"
        width="40"
        height="40"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
    >
        <circle
            cx="20"
            cy="20"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.25"
            strokeWidth="3"
        />
        <circle
            cx="20"
            cy="20"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
            transform="rotate(-90 20 20)"
        />
    </svg>
);

const MediaTile = ({
    tile,
    uploading = false,
    progress = 0,
    disabled = false,
    onRemove,
}: {
    tile: ComposerTile;
    uploading?: boolean;
    progress?: number;
    disabled?: boolean;
    onRemove: () => void;
}) => {
    const busy = uploading && tile.status === 'local';

    return (
        <div
            className={`composer_tile composer_tile_${tile.status} composer_tile_${tile.kind}${busy ? ' composer_tile_busy' : ''}`}
        >
            {tile.previewUrl ? (
                <img src={tile.previewUrl} alt="" draggable={false} />
            ) : (
                <div className="composer_tile_placeholder">
                    {tile.kind === 'embed' ? (
                        <span className="composer_tile_host">
                            {hostLabel(String(tile.payload?.url || ''))}
                        </span>
                    ) : null}
                </div>
            )}

            {tile.kind === 'video' ? (
                <span className="composer_tile_badge" aria-hidden="true">
                    ▶
                </span>
            ) : null}
            {tile.kind === 'embed' ? (
                <span className="composer_tile_badge" aria-hidden="true">
                    Link
                </span>
            ) : null}

            {busy ? (
                <div className="composer_tile_overlay">
                    <ProgressRing percent={progress} />
                </div>
            ) : null}

            <button
                type="button"
                className="composer_tile_remove"
                aria-label="Remove"
                disabled={disabled}
                onClick={onRemove}
            >
                ×
            </button>
        </div>
    );
};

export default MediaTile;
