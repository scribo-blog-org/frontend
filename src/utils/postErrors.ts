export function postErrorMessage(result: any, fallback: string) {
    const fields = result?.errors?.body;

    if (fields && typeof fields === 'object') {
        for (const value of Object.values(fields) as any[]) {
            if (typeof value?.message === 'string' && value.message) {
                return value.message;
            }
        }
    }

    if (typeof result?.message === 'string' && result.message) {
        return result.message;
    }

    return fallback;
}
