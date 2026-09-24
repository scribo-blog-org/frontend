'use client';

import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Banner from "../../components/Banner";
import Posts from "../../components/Posts/index.jsx";
import "./HomePage.scss";

const HomePage = ({ initialPosts, initialCategories, initialPagination }) => {
    const [searchParams] = useSearchParams();

    const filtersFromUrl = useMemo(() => {
        return (
            searchParams
                .get("filter")
                ?.split(",")
                .map((f) => f.toLowerCase()) || []
        );
    }, [searchParams]);

    const useServerFeed = filtersFromUrl.length === 0;

    return (
        <>
            <Banner />
            <Posts
                postsFilters={filtersFromUrl}
                initialPosts={useServerFeed ? initialPosts : undefined}
                initialCategories={initialCategories}
                initialPagination={useServerFeed ? initialPagination : undefined}
            />
        </>
    );
};

export default HomePage;
