import type { CSSProperties, ReactNode } from 'react';

import './Skeleton.scss';

type SkeletonProps = {
    width?: number | string;
    height?: number | string;
    circle?: boolean;
    className?: string;
};

export function Skeleton({
    width = '100%',
    height = 14,
    circle = false,
    className = '',
}: SkeletonProps) {
    const style: CSSProperties = {
        width,
        height,
        borderRadius: circle ? '50%' : undefined,
    };

    return (
        <span
            className={`skeleton${className ? ` ${className}` : ''}`}
            style={style}
        />
    );
}

export function SkeletonLines({
    count,
    lastWidth = '60%',
    height = 14,
}: {
    count: number;
    lastWidth?: string;
    height?: number;
}) {
    return (
        <div className="skeleton_lines">
            {Array.from({ length: count }, (_, index) => (
                <Skeleton
                    key={index}
                    height={height}
                    width={index === count - 1 ? lastWidth : '100%'}
                />
            ))}
        </div>
    );
}

// Appears only if loading takes longer than ~150ms, so fast navigations
// don't flash a placeholder.
export function SkeletonGate({ children }: { children: ReactNode }) {
    return (
        <div className="skeleton_gate" role="status" aria-label="Loading">
            {children}
        </div>
    );
}

export function PostSkeleton() {
    return (
        <div className="skeleton_post">
            <div className="skeleton_row">
                <Skeleton width={36} height={36} circle />
                <div className="skeleton_col">
                    <Skeleton width={120} height={12} />
                    <Skeleton width={80} height={10} />
                </div>
            </div>
            <SkeletonLines count={3} />
            <div className="skeleton_row">
                <Skeleton width={56} height={24} />
                <Skeleton width={56} height={24} />
            </div>
        </div>
    );
}

export function ArticleSkeleton() {
    return (
        <div className="skeleton_page">
            <div className="skeleton_row">
                <Skeleton width={40} height={40} circle />
                <div className="skeleton_col">
                    <Skeleton width={140} height={12} />
                    <Skeleton width={90} height={10} />
                </div>
            </div>
            <Skeleton height={32} width="75%" />
            <Skeleton height={240} />
            <SkeletonLines count={6} height={16} />
        </div>
    );
}

export function ProfileSkeleton() {
    return (
        <div className="skeleton_page skeleton_page_wide">
            <div className="skeleton_row skeleton_row_top">
                <Skeleton width={96} height={96} circle />
                <div className="skeleton_col skeleton_col_fill">
                    <Skeleton width={180} height={26} />
                    <SkeletonLines count={2} lastWidth="40%" />
                </div>
            </div>
            <PostListSkeleton count={2} />
        </div>
    );
}

export function PostListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="skeleton_posts">
            {Array.from({ length: count }, (_, index) => (
                <PostSkeleton key={index} />
            ))}
        </div>
    );
}
