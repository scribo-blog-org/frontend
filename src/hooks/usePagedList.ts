import { useCallback, useEffect, useRef, useState } from 'react';

type PageResult = { items: any[]; pages: number; total?: number } | null;

type Options = {
    fetchPage: (page: number) => Promise<PageResult>;
    resetKey: string;
    enabled?: boolean;
    initial?: { items: any[]; pages: number };
    keepStale?: boolean;
    // Keep at most this many pages in memory. Pages that fall off the end the
    // user is scrolling away from are dropped and loaded again on the way
    // back (`loadPrev` / `loadNext`). Unlimited when omitted.
    windowPages?: number;
};

const sum = (list: number[]) => list.reduce((total, n) => total + n, 0);

export function usePagedList({
    fetchPage,
    resetKey,
    enabled = true,
    initial,
    keepStale = true,
    windowPages,
}: Options) {
    const [items, setItems] = useState<any[]>(initial?.items || []);
    const [page, setPage] = useState<number>(initial?.items.length ? 1 : 0);
    const [pages, setPages] = useState<number>(initial?.pages || 0);
    const [total, setTotal] = useState<number>(initial?.items.length || 0);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingNext, setLoadingNext] = useState<boolean>(false);
    const [loadingPrev, setLoadingPrev] = useState<boolean>(false);
    const [firstPage, setFirstPage] = useState<number>(1);

    const fetchRef = useRef(fetchPage);
    const requestRef = useRef(0);
    const busyRef = useRef(false);
    const prevBusyRef = useRef(false);
    const refreshingRef = useRef(false);
    const pageRef = useRef(page);
    const pagesRef = useRef(pages);
    const itemsRef = useRef(items);
    const firstPageRef = useRef(1);
    // how many items each loaded page contributed, oldest page first
    const lensRef = useRef<number[]>(
        initial?.items.length ? [initial.items.length] : [],
    );

    fetchRef.current = fetchPage;
    pageRef.current = page;
    pagesRef.current = pages;
    itemsRef.current = items;

    const setWindow = useCallback((first: number) => {
        firstPageRef.current = first;
        setFirstPage(first);
    }, []);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const request = ++requestRef.current;
        busyRef.current = false;
        prevBusyRef.current = false;
        setLoadingNext(false);
        setLoadingPrev(false);
        setLoading(true);

        if (!keepStale) {
            setItems([]);
            setPage(0);
        }

        fetchRef.current(1).then((result: PageResult) => {
            if (request !== requestRef.current) {
                return;
            }

            lensRef.current = result?.items?.length
                ? [result.items.length]
                : [];
            setWindow(1);
            setItems(result?.items || []);
            setPage(result?.items ? 1 : 0);
            setPages(result?.pages || 0);
            setTotal(result?.total ?? result?.items?.length ?? 0);
            setLoading(false);
        });

        return () => {
            requestRef.current++;
        };
    }, [resetKey, enabled, keepStale, setWindow]);

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

        const known = new Set(itemsRef.current.map((item: any) => item._id));
        const added = result.items.filter((item: any) => !known.has(item._id));
        let merged = [...itemsRef.current, ...added];
        const lens = [...lensRef.current, added.length];
        let first = firstPageRef.current;

        if (windowPages && lens.length > windowPages) {
            const drop = lens.length - windowPages;

            merged = merged.slice(sum(lens.splice(0, drop)));
            first += drop;
        }

        lensRef.current = lens;
        itemsRef.current = merged;
        setItems(merged);
        setWindow(first);
        setPage(next);
        setPages(result.pages || 0);

        if (result.total !== undefined) {
            setTotal(result.total);
        }
    }, [windowPages, setWindow]);

    // the pages above the loaded window, only when some were dropped
    const loadPrev = useCallback(async () => {
        const target = firstPageRef.current - 1;

        if (prevBusyRef.current || target < 1) {
            return;
        }

        const request = requestRef.current;

        prevBusyRef.current = true;
        setLoadingPrev(true);

        const result = await fetchRef.current(target);

        if (request !== requestRef.current) {
            return;
        }

        prevBusyRef.current = false;
        setLoadingPrev(false);

        if (!result) {
            return;
        }

        const known = new Set(itemsRef.current.map((item: any) => item._id));
        const added = result.items.filter((item: any) => !known.has(item._id));
        let merged = [...added, ...itemsRef.current];
        const lens = [added.length, ...lensRef.current];
        let last = pageRef.current;

        if (windowPages && lens.length > windowPages) {
            const drop = lens.length - windowPages;
            const removed = sum(lens.splice(lens.length - drop, drop));

            merged = merged.slice(0, merged.length - removed);
            last -= drop;
        }

        lensRef.current = lens;
        itemsRef.current = merged;
        setItems(merged);
        setWindow(target);
        setPage(last);
        setPages(result.pages || 0);
    }, [windowPages, setWindow]);

    const refresh = useCallback(async () => {
        if (refreshingRef.current) {
            return;
        }

        refreshingRef.current = true;

        const request = requestRef.current;
        const result = await fetchRef.current(1).finally(() => {
            refreshingRef.current = false;
        });

        // new entries only belong on top when the window starts at the top
        if (
            request !== requestRef.current ||
            !result ||
            firstPageRef.current > 1
        ) {
            return;
        }

        const known = new Set(itemsRef.current.map((item: any) => item._id));
        const fresh = result.items.filter((item: any) => !known.has(item._id));

        if (fresh.length) {
            const lens = [...lensRef.current];

            lens[0] = (lens[0] ?? 0) + fresh.length;
            lensRef.current = lens;
            setItems((prev: any[]) => {
                const seen = new Set(prev.map((item: any) => item._id));
                const toAdd = fresh.filter((item: any) => !seen.has(item._id));

                return toAdd.length ? [...toAdd, ...prev] : prev;
            });
        }

        if (pageRef.current <= 1) {
            setPage(result.items.length ? 1 : 0);
            setPages(result.pages || 0);
        }

        if (result.total !== undefined) {
            setTotal(result.total);
        }
    }, []);

    return {
        refresh,
        items,
        setItems,
        total,
        loading,
        loadingNext,
        loadingPrev,
        hasNext: page > 0 && page < pages,
        hasPrev: firstPage > 1,
        loadNext,
        loadPrev,
    };
}
