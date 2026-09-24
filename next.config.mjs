import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const routerShim = path.join(rootDir, "src/compat/react-router-dom.jsx");

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    outputFileTracingRoot: rootDir,
    turbopack: {
        root: rootDir,
        resolveAlias: {
            "react-router-dom": "./src/compat/react-router-dom.jsx",
            "react-router": "./src/compat/react-router-dom.jsx",
        },
        rules: {
            "*.svg": {
                loaders: ["@svgr/webpack"],
                as: "*.js",
            },
        },
    },
    webpack: (config) => {
        config.resolve.alias["react-router-dom"] = routerShim;
        config.resolve.alias["react-router"] = routerShim;

        const fileLoaderRule = config.module.rules.find((rule) =>
            rule.test?.test?.(".svg"),
        );

        if (fileLoaderRule) {
            fileLoaderRule.exclude = /\.svg$/i;
        }

        config.module.rules.push({
            test: /\.svg$/i,
            issuer: /\.[jt]sx?$/,
            use: ["@svgr/webpack"],
        });

        return config;
    },
};

export default nextConfig;
