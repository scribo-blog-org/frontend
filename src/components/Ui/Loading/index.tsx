'use client';

import './Loading.scss';

// A ring that fades out behind a rounded head, turning clockwise. The ring
// width follows the size so it stays readable from button icons to pages.
const Loading = ({ size = 80 }: any) => {
    return (
        <div
            className="loader loader_ring"
            style={
                {
                    width: size,
                    height: size,
                    '--ring-width': `${Math.max(2, Math.round(size * 0.16))}px`,
                } as React.CSSProperties
            }
            role="status"
            aria-label="Loading"
        />
    );
};

export default Loading;
