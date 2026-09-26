# Scribo Next

Next.js rewrite of the Scribo web client (`Scribo_frontend`). App Router, React 19, SCSS tokens from `src/styles/theme.scss`.

Public routes are **server pages** (feed, article, profile, search) with metadata and initial data. Auth, editor, settings, messages, and admin stay **client pages**.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19, SCSS, Geist |
| Editor | Lexical |
| Auth | JWT in memory + refresh cookie; Google Identity |
| Realtime | Supabase |

Design tokens live in `src/styles/theme.scss`. Keep canvas / object / field roles; do not wrap the feed in extra cards.

## Setup

```bash
cd Scribo_next
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:3000`. Point `NEXT_PUBLIC_APP_API_URL` at **Scribo_nest**. The API must list this origin in `FRONTEND_ORIGIN`.

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_API_URL` | yes | API origin without a trailing slash |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | for Google login | OAuth web client id |
| `NEXT_PUBLIC_APP_VERCEL_PROJECT_PRODUCTION_URL` | SEO / share | Host only, e.g. `scribo-blog.vercel.app` |
| `NEXT_PUBLIC_SOCKET_URL` | messages / presence | WebSocket URL, `ws://localhost:3002` locally |

## Routes

| Path | Render |
| --- | --- |
| `/posts` | Server feed |
| `/posts/:id` | Server article |
| `/users/:id` | Server profile |
| `/search` | Server search |
| `/auth/*`, `/create-post`, `/settings`, `/messages`, `/admin-panel`, `/notifications` | Client |

The Vite SPA in `Scribo_frontend` is unchanged until this app replaces it.
