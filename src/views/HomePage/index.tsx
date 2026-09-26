'use client';

import { useMemo } from "react";
import { useSearchParams } from "@/navigation";
import Banner from "../../components/Banner";
import Posts from "../../components/Posts/index";
import "./HomePage.scss";

const HomePage = () => {
    const [searchParams] = useSearchParams();

    const filtersFromUrl = useMemo(() => {
        return (
            searchParams
                .get("filter")
                ?.split(",")
                .map((f: any) => f.toLowerCase()) || []
        );
    }, [searchParams]);

    return (
        <>
            <Banner />
            <Posts postsFilters={filtersFromUrl} />
        </>
    );
};

export default HomePage;
