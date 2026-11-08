import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const svgrLoader = {
    loader: '@svgr/webpack',
    options: {
        dimensions: false,
        svgoConfig: {
            plugins: [
                {
                    name: 'preset-default',
                    params: {
                        overrides: {
                            removeViewBox: false,
                        },
                    },
                },
            ],
        },
    },
};

const nextConfig = {
    agentRules: false,
    async rewrites() {
        const api = process.env.NEXT_PUBLIC_APP_API_URL?.replace(/\/+$/, '');

        if (
            process.env.NODE_ENV === 'production' ||
            !api ||
            !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(api)
        ) {
            return [];
        }

        return [
            { source: '/uploads/:path*', destination: `${api}/uploads/:path*` },
        ];
    },
    async redirects() {
        return [
            {
                source: '/posts',
                destination: '/',
                permanent: true,
            },
        ];
    },
    allowedDevOrigins: ['192.168.*.*', '10.*.*.*'],
    reactStrictMode: true,
    logging: {
        incomingRequests: false,
    },
    experimental: {
        staleTimes: {
            dynamic: 0,
        },
        serverComponentsHmrCache: false,
    },
    outputFileTracingRoot: rootDir,
    turbopack: {
        root: rootDir,
        rules: {
            '*.svg': {
                loaders: [svgrLoader],
                as: '*.js',
            },
        },
    },
    webpack: (config) => {
        const fileLoaderRule = config.module.rules.find((rule) =>
            rule.test?.test?.('.svg'),
        );

        if (fileLoaderRule) {
            fileLoaderRule.exclude = /\.svg$/i;
        }

        config.module.rules.push({
            test: /\.svg$/i,
            issuer: /\.[jt]sx?$/,
            use: [svgrLoader],
        });

        return config;
    },
};

export default nextConfig;
