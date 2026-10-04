# Scribo frontend

The web client of the Scribo blog. Next.js 16 with the App Router and React 19. Public pages are rendered on the server so that the first paint carries real content: the feed, an article, a profile, search results. Everything behind a login — the editor, settings, messages, the admin panel — stays on the client.

Production: `https://scribo.pp.ua`. Staging: `https://scribo-stage.pp.ua`. The API and the socket live on the same host; nginx routes `/api` to the backend and `/ws` to the socket service. This process proxies neither.

## Repositories

| Repository | Role |
| --- | --- |
| `frontend` | this repository |
| `backend` | NestJS HTTP API; owns all data |
| `socket` | WebSocket delivery for chat, typing and presence |
| `infra` | compose files, nginx, certificates, server scripts |

## Where it sits

The browser loads a page from this process and then talks to the other services directly. It does not tunnel API calls through Next. The API origin comes from `NEXT_PUBLIC_APP_API_URL` with `/api/...` appended, which in production is the public host again, not the container's internal address. The socket connects to `NEXT_PUBLIC_SOCKET_URL`, in production `wss://scribo.pp.ua/ws`.

```
browser ──► this process :3000        pages, assets
        ├─► backend  /api/...         data, auth, uploads metadata
        └─► socket   /ws              chat events, typing, presence
```

The `NEXT_PUBLIC_*` values are not baked into the image. The container reads them at startup and injects them into the page as `window.__SCRIBO_ENV`. On the server they live in `env/frontend.env`. Changing one of them requires recreating the container, not rebuilding the image.

Startup logs a single line, `frontend ready port=3000`. Per-request logging from Next is disabled.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16, App Router |
| UI | React 19, SCSS, Geist |
| Editor | Lexical |
| Session | access JWT in memory, refresh cookie held by the API |
| Google sign-in | `@react-oauth/google`, client id from the environment |
| Realtime | `ws` against the socket service, never against this process |

Design tokens live in `src/styles/theme.scss`.

## Routes

| Path | Rendering |
| --- | --- |
| `/` | server, feed |
| `/posts/:id` | server, article |
| `/posts/:id/edit` | client, editor |
| `/users/:id` | server, profile |
| `/search` | server |
| `/support`, `/support/mine`, `/support/:key` | support tickets |
| `/auth/login`, `/auth/register`, `/auth/forgot-password` | client |
| `/create-post`, `/settings`, `/notifications` | client |
| `/messages`, `/messages/:conversationId` | client, socket |
| `/chats/:id` | legacy group invite landing page |
| `/admin-panel` | client |
| `/api` | a page that documents the API, not the API itself |

The `(default)` and `(full)` route groups select the shell: the normal site column, or a full-width screen such as the messenger.

## How data flows

`src/api` holds the browser-side calls. The base URL comes from `apiUrl()` in `src/config`. The access token is kept in memory only; `POST /api/auth/refresh` is sent with the refresh cookie and `credentials: include`. When a request fails because the access token expired, it is refreshed and the original request is retried once.

Server-rendered pages read the API through `src/lib/server-api.ts` so that the document arrives with its content and metadata already filled in, rather than an empty shell plus a client fetch.

`src/sockets` owns the realtime client. After connecting it sends `auth` with the access token, then `subscribe` for `user:<id>` and the open `chat:<id>`. Presence, new messages and typing arrive as events. Writes never go through the socket: sending a message is an HTTP call to the backend, and the socket event is only the notification that it happened.

The Google button is hidden entirely when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is empty.

## Messenger

The messenger is the most stateful screen in the application and worth describing separately.

A single `Messages` view renders both the conversation list and the open chat, which is why `/messages` and `/messages/:conversationId` share a layout and the route pages themselves return nothing. The list supports direct conversations and groups; groups carry a title, a description, a photo, a member list and per-member roles.

Typing indicators are resolved client-side. The socket reports only a conversation id and a user id, so the view maps those ids to nicknames from data it already has — the participants of the listed conversations and the members of the open group — and fetches the rest by id when needed. In the conversation list the indicator replaces the last-message preview; in the chat header it replaces the member and online counters.

Group links use the ordinary conversation URL. Opening `/messages/:id` as a member goes straight into the chat. Opening it as a non-member falls back to the public invite endpoint and shows a join dialog: accepting joins the group and loads the conversation in place without changing the URL, declining returns to `/messages`.

## Running locally

```bash
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:3000`. `next dev` reads `.env`.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_API_URL` | API origin without a trailing slash. Locally `http://localhost:3001` |
| `NEXT_PUBLIC_SOCKET_URL` | Locally `ws://localhost:3002` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Web client id, only if Google sign-in is wanted |
| `NEXT_PUBLIC_APP_VERCEL_PROJECT_PRODUCTION_URL` | Host used for SEO and share links, without a scheme. Locally `localhost:3000` |

The backend must allow this origin through `FRONTEND_ORIGIN`, otherwise every call fails CORS.

To run the whole system locally instead, use `infra/local`, which builds all three applications next to Mongo and Redis.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
```

`/sitemap.xml` and `/robots.txt` are generated by the Next server. The host comes from `NEXT_PUBLIC_APP_VERCEL_PROJECT_PRODUCTION_URL`; the list of articles and profiles is fetched from the API at request time.

## Layout

```
src/
  app/                 App Router routes and layouts
  views/               page-level screens
  components/          buttons, cards, editor, navigation, modals
  layouts/             shared page shells
  providers/           application context, modal and toast host
  api/                 browser-side HTTP calls
  lib/                 server-side fetch and metadata helpers
  sockets/             WebSocket client, rooms, presence, typing
  session/             access token storage and refresh
  content/             post HTML, mentions, hashtags
  seo/                 metadata, JSON-LD, sitemap helpers
  config/              public environment access
  navigation/          typed links and router helpers
  styles/              tokens and global styles
```

## Deployment

A push to `master` builds `ghcr.io/scribo-blog-org/frontend` on an ARM runner, publishes the `latest` and commit-sha tags and restarts the `frontend` service of the `prod` stack over SSH. A push to `dev` does the same with the `staging` tag against the `stage` stack. Pull requests run lint, test and a local `docker build` without publishing, and report the progress of each step as a comment.

The machine, nginx and the compose layout are documented in the `infra` repository.
