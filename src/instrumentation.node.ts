import http from 'http';
import { rlog } from './rlog';

type RequestInfo = { path: string; method: string };
type ErrorContext = {
    routerKind: string;
    routePath: string;
    routeType: string;
    renderSource?: string;
};

const REQUEST_LOG_SKIPPED =
    /^\/(_next|__nextjs|uploads|favicon|status)|\.[a-z0-9]+$/i;
const HOOKED = Symbol.for('scribo.requestLogHooked');

function hookRequests() {
    const proto = http.Server.prototype as unknown as Record<
        symbol | string,
        unknown
    >;
    if (proto[HOOKED]) return;
    proto[HOOKED] = true;
    const original = proto.emit as (...args: unknown[]) => boolean;

    proto.emit = function (this: unknown, event: unknown, ...args: unknown[]) {
        if (event === 'request') {
            const [req, res] = args as [
                http.IncomingMessage,
                http.ServerResponse,
            ];
            const started = performance.now();
            res.once('finish', () => {
                const path = (req.url ?? '').split('?')[0];
                if (REQUEST_LOG_SKIPPED.test(path)) return;
                const status = res.statusCode;
                const totalMs = Math.round(performance.now() - started);
                const id = req.headers['x-request-id'];
                rlog.write(
                    status >= 500 ? 'error' : 'info',
                    `${req.method} ${path}`,
                    {
                        status,
                        method: req.method,
                        path,
                        total_ms: totalMs,
                        request_id: Array.isArray(id) ? id[0] : (id ?? null),
                    },
                );
            });
        }
        return original.call(this, event, ...args);
    };
}

export function registerNode() {
    if (process.env.NEXT_PHASE === 'phase-production-build') return;

    const port = process.env.PORT ?? '3000';
    rlog.info('frontend ready', {
        port: Number(port),
        node: process.version,
        env: process.env.NODE_ENV ?? 'development',
        log_dir: process.env.LOG_DIR ?? null,
    });

    hookRequests();

    process.on('unhandledRejection', (reason) => {
        rlog.error('unhandledRejection', { error: reason });
    });
    process.on('uncaughtException', (error) => {
        rlog.error('uncaughtException', { error });
    });
    for (const signal of ['SIGTERM', 'SIGINT'] as const) {
        process.once(signal, () => {
            rlog.info('shutdown', { signal });
        });
    }
}

export function requestErrorNode(
    error: unknown,
    request: RequestInfo,
    context: ErrorContext,
) {
    const digest = (error as { digest?: string } | null)?.digest;
    rlog.error(`render error ${request.method} ${request.path}`, {
        error,
        digest,
        method: request.method,
        path: request.path,
        route: context.routePath,
        route_type: context.routeType,
        router: context.routerKind,
        render_source: context.renderSource,
    });
}
