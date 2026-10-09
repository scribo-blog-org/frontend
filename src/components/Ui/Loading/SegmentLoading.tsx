'use client';

import './Loading.scss';
import './SegmentLoading.scss';

// The loader made of fading bars. It is kept for the logs toolbar, where it
// marks a running reload and the live mode.
const SegmentLoading = ({ size = 80, segments = 12 }: any) => {
    return (
        <div
            className="loader app-transition"
            style={{ width: size, height: size }}
        >
            {Array.from({ length: segments }).map((_: any, i: any) => (
                <span
                    key={i}
                    className="loader-segment app-transition"
                    style={
                        {
                            '--i': i,
                            '--segments': segments,
                        } as React.CSSProperties
                    }
                />
            ))}
        </div>
    );
};

export default SegmentLoading;
