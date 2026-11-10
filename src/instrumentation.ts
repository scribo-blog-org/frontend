export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    const { registerNode } = await import('./instrumentation.node');
    registerNode();
}

export async function onRequestError(
    error: unknown,
    request: { path: string; method: string },
    context: {
        routerKind: string;
        routePath: string;
        routeType: string;
        renderSource?: string;
    },
) {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    const { requestErrorNode } = await import('./instrumentation.node');
    requestErrorNode(error, request, context);
}
