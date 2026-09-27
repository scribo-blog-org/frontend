function decodeRouteParam(value: unknown) {
    const raw = Array.isArray(value) ? value[0] : value;

    if (typeof raw !== "string" || raw.length === 0) {
        return "";
    }

    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}

export { decodeRouteParam };
