FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_APP_API_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_APP_VERCEL_PROJECT_PRODUCTION_URL
ARG NEXT_PUBLIC_SOCKET_URL
RUN set -e; \
    : > .env.production.local; \
    if [ -n "$NEXT_PUBLIC_APP_API_URL" ]; then printf 'NEXT_PUBLIC_APP_API_URL=%s\n' "$NEXT_PUBLIC_APP_API_URL" >> .env.production.local; fi; \
    if [ -n "$NEXT_PUBLIC_GOOGLE_CLIENT_ID" ]; then printf 'NEXT_PUBLIC_GOOGLE_CLIENT_ID=%s\n' "$NEXT_PUBLIC_GOOGLE_CLIENT_ID" >> .env.production.local; fi; \
    if [ -n "$NEXT_PUBLIC_APP_VERCEL_PROJECT_PRODUCTION_URL" ]; then printf 'NEXT_PUBLIC_APP_VERCEL_PROJECT_PRODUCTION_URL=%s\n' "$NEXT_PUBLIC_APP_VERCEL_PROJECT_PRODUCTION_URL" >> .env.production.local; fi; \
    if [ -n "$NEXT_PUBLIC_SOCKET_URL" ]; then printf 'NEXT_PUBLIC_SOCKET_URL=%s\n' "$NEXT_PUBLIC_SOCKET_URL" >> .env.production.local; fi
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.mjs ./
RUN chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node_modules/.bin/next", "start", "--hostname", "0.0.0.0", "--port", "3000"]
