export function imageSrc(value: any, fallback: any) {
    const source = value || fallback;

    if (typeof source === 'string') {
        return source;
    }

    if (source && typeof source.src === 'string') {
        return source.src;
    }

    return '';
}
