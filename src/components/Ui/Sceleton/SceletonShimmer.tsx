'use client';

import { useEffect } from "react";

const SceletonShimmer = () => {
    useEffect(() => {
        let animationFrame: any;

        const start = performance.now();
        const duration = 3000;

        const animate = (time: any) => {
            const progress = ((time - start) % duration) / duration;

            const x = -300 + progress * 600;

            document.documentElement.style.setProperty(
                "--sceleton-shimmer-x",
                `${x}vw`
            );

            animationFrame = requestAnimationFrame(animate);
        };

        animationFrame = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrame);
        };
    }, []);

    return null;
};

export default SceletonShimmer;