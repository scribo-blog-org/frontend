import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const svgrLoader = {
    loader: "@svgr/webpack",
    options: {
        dimensions: false,
        svgoConfig: {
            plugins: [
                {
                    name: "preset-default",
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

/** @type {import('next').NextConfig} */
const nextConfig = {
    async redirects() {
        return [
            {
                source: "/",
                destination: "/posts",
                permanent: true,
            },
        ];
    },
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
            "*.svg": {
                loaders: [svgrLoader],
                as: "*.js",
            },
        },
    },
    webpack: (config) => {
        const fileLoaderRule = config.module.rules.find((rule) =>
            rule.test?.test?.(".svg"),
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
