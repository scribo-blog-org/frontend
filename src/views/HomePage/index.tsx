'use client';

import { useMemo } from 'react';
import { useSearchParams } from '@/navigation';
import Posts from '../../components/Posts/index';
import './HomePage.scss';

const HomePage = ({
    initialPosts = [],
    initialPagesCount = 0,
}: {
    initialPosts?: Array<Record<string, unknown>>;
    initialPagesCount?: number;
}) => {
    const [searchParams] = useSearchParams();

    const filtersFromUrl = useMemo(() => {
        return (
            searchParams
                .get('filter')
                ?.split(',')
                .map((f: any) => f.toLowerCase()) || []
        );
    }, [searchParams]);

    return (
        <>
            <Posts
                postsFilters={filtersFromUrl}
                initialPosts={initialPosts}
                initialPagesCount={initialPagesCount}
            />
        </>
    );
};

export default HomePage;
