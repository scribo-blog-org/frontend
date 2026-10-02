# Scribo

Веб-клиент блога. Next.js 16, App Router, React 19. Публичные страницы собираются на сервере: лента, статья, профиль, поиск. Вход, редактор, настройки, сообщения и админка остаются клиентскими.

Прод: `https://scribo.pp.ua`. API и сокет — тот же хост. Nginx отправляет `/api` на backend и `/ws` на socket. Этот процесс их не проксирует.

## Место в системе

Браузер открывает страницу здесь. Данные он запрашивает сам, по `NEXT_PUBLIC_APP_API_URL` плюс `/api/...`. В проде это снова публичный хост, не `localhost` контейнера backend. Сокет подключается к `NEXT_PUBLIC_SOCKET_URL`, в проде `wss://scribo.pp.ua/ws`.

Переменные `NEXT_PUBLIC_*` не зашиваются в образ. Контейнер читает их при старте и кладёт в страницу как `window.__SCRIBO_ENV`. На сервере они лежат в `env/frontend.env`. После правки контейнер нужно пересоздать.

При старте в лог пишется одна строка: `frontend ready port=3000`. Построчные логи запросов Next выключены.

## Стек

| Слой | Выбор |
| --- | --- |
| Framework | Next.js 16, App Router |
| UI | React 19, SCSS, Geist |
| Редактор | Lexical |
| Сессия | Access JWT в памяти, refresh cookie на API |
| Google | `@react-oauth/google`, client id из env |
| Сокет | `ws` на свой сервис, не на этот процесс |

Токены оформления лежат в `src/styles/theme.scss`.

## Страницы

| Путь | Как рисуется |
| --- | --- |
| `/` | Сервер, лента |
| `/posts/:id` | Сервер, статья |
| `/posts/:id/edit` | Клиент, правка |
| `/users/:id` | Сервер, профиль |
| `/search` | Сервер, поиск |
| `/support`, `/support/mine`, `/support/:key` | Поддержка |
| `/auth/login`, `/auth/register`, `/auth/forgot-password` | Клиент |
| `/create-post`, `/settings`, `/notifications` | Клиент |
| `/messages`, `/messages/:conversationId` | Клиент, сокет |
| `/admin-panel` | Клиент |
| `/api` | Страница описания API, не сам backend |

Группы маршрутов `(default)` и `(full)` задают оболочку: обычная колонка сайта или экран на всю ширину.

## Как ходят данные

`src/api` — функции браузера. Базовый URL даёт `apiUrl()` из `src/config`. Access token хранится в памяти. `POST /api/auth/refresh` уходит с cookie. Истёкший access обновляется и запрос повторяется.

Серверные страницы читают API через `src/lib/server-api.ts`, чтобы отдать заголовок и первый экран без пустой оболочки.

Сокет: `src/sockets`. Клиент шлёт `auth` с access token, затем `subscribe` на комнату `user:<id>` или `chat:<id>`. Присутствие и новые сообщения приходят событиями. Сами сообщения создаются HTTP-запросом к backend. Этот репозиторий их в Mongo не пишет.

Google-кнопка не показывается, если `NEXT_PUBLIC_GOOGLE_CLIENT_ID` пустой.

## Локальный запуск

```bash
cp .env.example .env
npm install
npm run dev
```

Открыть `http://localhost:3000`. `next dev` читает `.env`.

| Переменная | Зачем |
| --- | --- |
| `NEXT_PUBLIC_APP_API_URL` | Origin API без слэша на конце. Локально `http://localhost:3001` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Web client id, если нужен вход через Google |
| `NEXT_PUBLIC_APP_VERCEL_PROJECT_PRODUCTION_URL` | Хост для SEO и шаринга, без схемы. Локально `localhost:3000` |
| `NEXT_PUBLIC_SOCKET_URL` | Локально `ws://localhost:3002` |

Backend должен пускать этот origin в `FRONTEND_ORIGIN`.

## Скрипты

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
```

`test` сейчас заглушка: отдельного набора тестов нет, скрипт завершается с кодом 0, чтобы проверка pull request не падала на пустом месте.

`/sitemap.xml` и `/robots.txt` отдаёт сервер Next. Адреса берутся из `NEXT_PUBLIC_APP_VERCEL_PROJECT_PRODUCTION_URL`, список статей и профилей — из API в момент запроса.

## Как устроен код

```
src/
  app/                 маршруты App Router
  views/               экраны страниц
  components/          кнопки, карточки, редактор, навигация
  api/                 вызовы HTTP из браузера
  lib/                 серверный fetch и metadata
  sockets/             клиент WebSocket, комнаты, присутствие
  content/             HTML поста, упоминания, хештеги
  config/              публичные env
  styles/              токены и глобальные стили
```

## Выкладка

Push в `master` собирает образ `ghcr.io/scribo-blog-org/frontend` и поднимает сервис `frontend` в compose. Pull request в `master` гоняет lint, test и `docker build` без публикации. В комментарии PR виден ход шагов Lint, Test, Build. Как устроена машина — в репозитории `infra`.
