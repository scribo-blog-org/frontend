'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { ImgHTMLAttributes } from 'react';

import './FadeImage.scss';

const FadeImage = ({
    className = '',
    onLoad,
    onError,
    ...rest
}: ImgHTMLAttributes<HTMLImageElement>) => {
    const ref = useRef<HTMLImageElement>(null);
    const [state, setState] = useState<'idle' | 'pending' | 'loaded'>('idle');

    useLayoutEffect(() => {
        const element = ref.current;

        if (element && !(element.complete && element.naturalWidth > 0)) {
            setState('pending');
        }
    }, [rest.src]);

    return (
        <img
            {...rest}
            ref={ref}
            className={`${className} fade_image${state === 'pending' ? ' fade_image_pending' : ''}`.trim()}
            alt={rest.alt ?? ''}
            onLoad={(event) => {
                setState('loaded');
                onLoad?.(event);
            }}
            onError={(event) => {
                setState('loaded');
                onError?.(event);
            }}
        />
    );
};

export default FadeImage;
