'use client';

import './Loading.scss';

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
