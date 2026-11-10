let cached: string | null = null;

const randomId = () => {
    const bytes = new Uint8Array(6);

    crypto.getRandomValues(bytes);

    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
        '',
    );
};

const fromNavigation = () => {
    try {
        const [entry] = performance.getEntriesByType(
            'navigation',
        ) as PerformanceNavigationTiming[];
        const timing = entry?.serverTiming?.find(
            (item) => item.name === 'trace',
        );

        return timing?.description || null;
    } catch {
        return null;
    }
};

export function getTraceId(): string | null {
    if (typeof window === 'undefined') {
        return null;
    }

    if (!cached) {
        cached = fromNavigation() ?? randomId();
    }

    return cached;
}
