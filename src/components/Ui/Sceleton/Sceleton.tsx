'use client';

import './Sceleton.scss';

const Sceleton = ({
    isLoading = false,
    children,
    circle = false,
    rounded = false,
    section = true,
    className = '',
}: any) => {
    if (isLoading) {
        return (
            <div
                className={
                    `sceleton app-transition ${className}` +
                    (circle ? ' circle' : '') +
                    (rounded ? ' rounded' : '') +
                    (section ? ' sceleton_section' : '')
                }
            />
        );
    }

    return children;
};

export default Sceleton;
