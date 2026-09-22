# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A workspace of small, independent projects (no shared package, no test suite, no linter config). Each top-level script is standalone. Code comments, UI text and docs are in Korean; match that. Platform is Windows (breakout uses `winsound` and the "Malgun Gothic" font).

Dependencies are pinned in `requirements.txt` (a full `pip freeze` of the environment, so it includes unrelated packages). Install with `pip install -r requirements.txt`.

## Projects and how to run them

- `news_crawler.py` — PyQt6 GUI that scrapes Naver search results for news articles and exports to Excel/JSON. Run: `python news_crawler.py`. Packaged with `pyinstaller news_crawler.spec` (windowed exe; `build/` and `dist/` are gitignored).
- `stock_crawler.py` — CLI that fetches top Korean stocks from Naver's internal JSON API and writes CSV. Run: `python stock_crawler.py --market KOSPI --top 200 --sort amount`. `--html page.html` parses a saved page instead of calling the API.
- `snake.py`, `breakout.py` — tkinter games. Run: `python snake.py` / `python breakout.py`. Breakout persists its best score in `breakout_best.txt` next to the script.
- `game01/tetris.html` — single-file HTML5 Tetris; open in a browser.
- `DemoPort/` — static profile website (`index.html`, `css/`, `js/main.js`, no build step); requirements are in `DemoPort/prd.md`.
- `DemoBoard/` — Next.js (App Router) + TypeScript + shadcn/ui bulletin board with its own `package.json` and `CLAUDE.md`/`AGENTS.md` (read those first; this Next.js version has breaking changes). Run: `cd DemoBoard && npm run dev`. Posts persist in Supabase (see below) via `src/lib/posts.ts`, mutated by server actions in `src/app/actions.ts`. shadcn here is the Base UI flavor: link-styled buttons use `render={<Link/>}` with `nativeButton={false}`, not `asChild`.
- `DemoBoard2/` — copy of `DemoBoard` predating the Supabase switch (still stores posts in gitignored `data/posts.json`); its dev server defaults to a different port (`npm run dev -- -p 3001`) so both can run at once.
- `demo.py` — trivial scratch script.

## Architecture notes

- **news_crawler.py**: scraping helpers (`get_soup`, `parse_search`, `fetch_body`, `save_excel`) are module-level functions; the GUI (`MainWindow`) never does network I/O itself. `CrawlWorker` (a `QThread`) runs the crawl and reports back to the UI only via Qt signals (`found`, `article_done`, `progress`, `status`, `failed`). Cancellation uses `isInterruptionRequested()`. Body extraction tries the `BODY_SELECTORS` list and falls back to the og:description summary; add selectors there for new press sites. Requests are throttled by `DELAY`.
- **stock_crawler.py**: the Naver Stocks page is JS-rendered, so plain HTML scraping returns nothing; the default path calls the JSON API (`API_URL`, paginated by `fetch_all`), and `parse_html` exists as a fallback for saved rendered pages. Output column order is defined by `COLUMNS`.
- Crawler outputs (`news_result.json`, `stock_top.csv`, `*.xlsx`) are generated artifacts and are gitignored.
- **DemoBoard/src/lib/posts.ts** talks to a Supabase `posts` table (`id`, `title`, `author`, `content`, `views`, `created_at`, `updated_at`) instead of a local file. `src/lib/supabase.ts` reads `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` from `DemoBoard/.env` (gitignored) — deliberately without the `NEXT_PUBLIC_` prefix, since every caller is a server component or server action and the key never needs to reach the browser bundle. `SUPABASE_SECRET_KEY` is present in `.env` but unused by the app; never wire it into client-reachable code.
- **DemoBoard deployment**: linked to Vercel as project `jjohnkkim/demoboard`, live at https://demoboard-two.vercel.app. `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are set as Vercel Production and Preview env vars (mirroring `.env`); update both places if the Supabase project ever changes. Redeploy with `cd DemoBoard && vercel deploy --prod --yes` (the `.vercel/` project link is gitignored, so a fresh checkout needs `vercel link --yes --project demoboard` first). No Git integration is connected, so pushes do not auto-deploy.
