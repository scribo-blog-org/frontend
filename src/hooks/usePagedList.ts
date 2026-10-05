import { useCallback, useEffect, useRef, useState } from 'react';

type PageResult = { items: any[]; pages: number; total?: number } | null;

type Options = {
    fetchPage: (page: number) => Promise<PageResult>;
    resetKey: string;
    enabled?: boolean;
    initial?: { items: any[]; pages: number };
    keepStale?: boolean;
};

// Holds the server pages loaded so far; the next page is appended on demand.
export function usePagedList({
    fetchPage,
    resetKey,
    enabled = true,
    initial,
    keepStale = true,
}: Options) {
    const [items, setItems] = useState<any[]>(initial?.items || []);
    const [page, setPage] = useState<number>(initial?.items.length ? 1 : 0);
    const [pages, setPages] = useState<number>(initial?.pages || 0);
    const [total, setTotal] = useState<number>(initial?.items.length || 0);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingNext, setLoadingNext] = useState<boolean>(false);

    const fetchRef = useRef(fetchPage);
    const requestRef = useRef(0);
    const busyRef = useRef(false);
    const pageRef = useRef(page);
    const pagesRef = useRef(pages);

    fetchRef.current = fetchPage;
    pageRef.current = page;
    pagesRef.current = pages;

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const request = ++requestRef.current;
        busyRef.current = false;
        setLoadingNext(false);
        setLoading(true);

        if (!keepStale) {
            setItems([]);
            setPage(0);
        }

        fetchRef.current(1).then((result: PageResult) => {
            if (request !== requestRef.current) {
                return;
            }

            setItems(result?.items || []);
            setPage(result?.items ? 1 : 0);
            setPages(result?.pages || 0);
            setTotal(result?.total ?? result?.items?.length ?? 0);
            setLoading(false);
        });

        return () => {
            requestRef.current++;
        };
    }, [resetKey, enabled, keepStale]);

    const loadNext = useCallback(async () => {
        const next = pageRef.current + 1;

        if (busyRef.current || pageRef.current < 1 || next > pagesRef.current) {
            return;
        }

        const request = requestRef.current;

        busyRef.current = true;
        setLoadingNext(true);

        const result = await fetchRef.current(next);

        if (request !== requestRef.current) {
            return;
        }

        busyRef.current = false;
        setLoadingNext(false);

        if (!result) {
            return;
        }

        setItems((prev: any[]) => [...prev, ...result.items]);
        setPage(next);
        setPages(result.pages || 0);

        if (result.total !== undefined) {
            setTotal(result.total);
        }
    }, []);

    return {
        items,
        setItems,
        total,
        loading,
        loadingNext,
        hasNext: page > 0 && page < pages,
        loadNext,
    };
}
