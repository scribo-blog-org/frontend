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
const SENSITIVE_QUERY =
    /pass|secret|token|auth|cookie|key|signature|code|email/i;

function queryOf(url: string): Record<string, string> | null {
    const index = url.indexOf('?');
    if (index < 0) return null;
    const out: Record<string, string> = {};
    let count = 0;
    for (const [key, value] of new URLSearchParams(url.slice(index + 1))) {
        if (key === '_rsc') continue;
        if (count++ >= 20) break;
        const name = key.slice(0, 60);
        const safe = SENSITIVE_QUERY.test(key)
            ? '[redacted]'
            : value.slice(0, 120);
        out[name] = name in out ? `${out[name]},${safe}` : safe;
    }
    return Object.keys(out).length ? out : null;
}

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
                const query = queryOf(req.url ?? '');
                rlog.write(
                    status >= 500 ? 'error' : 'info',
                    `${req.method} ${path}`,
                    {
                        status,
                        method: req.method,
                        path,
                        total_ms: totalMs,
                        ...(query ? { query } : {}),
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
