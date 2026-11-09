export function postErrorMessage(result: any, fallback: string) {
    const bag = result?.errors;

    if (bag && typeof bag === 'object') {
        for (const source of Object.values(bag) as any[]) {
            if (!source || typeof source !== 'object') {
                continue;
            }
            for (const value of Object.values(source) as any[]) {
                if (typeof value?.message === 'string' && value.message) {
                    return value.message;
                }
            }
        }
    }

    if (typeof result?.message === 'string' && result.message) {
        return result.message;
    }

    return fallback;
}
