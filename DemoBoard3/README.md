# DemoBoard3

Next.js(App Router) + TypeScript + Tailwind CSS + Supabase로 만든 로그인 기능이 있는 게시판입니다. 이메일 회원가입/로그인, 게시글 CRUD, 댓글, 검색, 페이지네이션을 지원하며 Supabase RLS로 "본인 글/댓글만 수정·삭제 가능" 규칙을 데이터베이스 레벨에서 강제합니다.

## 1. 프로젝트 소개

- **기술 스택**: Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Supabase(Auth + Postgres), Vercel 배포
- **주요 기능**
  - 이메일 회원가입 / 로그인 / 로그아웃 (세션은 쿠키로 유지)
  - 비로그인 사용자는 게시글/댓글 조회만 가능, 로그인 사용자만 작성 가능
  - 게시글 목록(번호/제목/작성자/작성일/조회수), 최신순 정렬, 페이지당 10건 페이지네이션
  - 제목 / 내용 / 제목+내용 검색
  - 게시글 작성·수정·삭제(본인 글만), 조회수 카운트
  - 댓글 작성·삭제(본인 댓글만), 로그인 사용자만 작성 가능
  - Supabase RLS로 "본인 글/댓글만 수정·삭제" 규칙을 DB 레벨에서 강제

## 2. 프로젝트 구조

```
src/
  app/
    page.tsx                 # 게시판 목록 + 검색 + 페이지네이션
    login/page.tsx           # 로그인
    signup/page.tsx          # 회원가입
    posts/new/page.tsx       # 글쓰기 (로그인 필요)
    posts/[id]/page.tsx      # 게시글 상세 + 댓글
    posts/[id]/edit/page.tsx # 글 수정 (작성자 본인만)
  components/                # Navbar, PostForm, CommentForm, Pagination 등 UI
  lib/
    supabase/
      client.ts              # 브라우저용 Supabase 클라이언트
      server.ts              # 서버 컴포넌트/서버 액션용 Supabase 클라이언트
      middleware.ts           # 세션 쿠키 갱신 로직 (proxy.ts에서 사용)
    actions/
      auth.ts                # 회원가입/로그인/로그아웃 서버 액션
      posts.ts                # 게시글 작성/수정/삭제 서버 액션
      comments.ts              # 댓글 작성/삭제 서버 액션
    posts.ts, comments.ts     # Supabase 쿼리(데이터 접근) 함수
    types.ts                  # Post/Comment 타입
  proxy.ts                    # Next.js 16의 미들웨어(Proxy) — 요청마다 세션 쿠키 갱신
```

Supabase 연결 코드는 `src/lib/supabase/*`에만 있고, 나머지 코드는 이 모듈을 통해서만 Supabase에 접근합니다.

## 3. Supabase 설정 방법

### 3-1. 이미 준비된 프로젝트 (바로 실행 가능)

이 저장소의 `.env.local`에는 이미 생성된 Supabase 프로젝트(`demoboard3`, 서울 리전)의 URL/anon key가 들어 있고, 아래 SQL도 이미 그 프로젝트에 적용되어 있습니다. 즉 `npm install && npm run dev`만으로 바로 동작합니다.

> 기본적으로 Supabase는 회원가입 시 이메일 인증(Confirm email)을 요구합니다. 테스트를 빠르게 하려면 Supabase 대시보드 → **Authentication → Sign In / Providers → Email**에서 "Confirm email"을 꺼 두면 가입 즉시 로그인할 수 있습니다.

### 3-2. 새 프로젝트를 직접 만들 경우

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 생성합니다.
2. 프로젝트의 **Settings → API**에서 `Project URL`과 `anon public` key를 확인합니다.
3. **SQL Editor**에서 아래 SQL을 실행해 테이블과 RLS 정책을 생성합니다.

```sql
-- ============================================
-- 1) 테이블
-- ============================================
create table public.posts (
  id bigint generated always as identity primary key,
  title text not null,
  content text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  views integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_id_desc_idx on public.posts (id desc);
create index posts_user_id_idx on public.posts (user_id);

create table public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index comments_post_id_idx on public.comments (post_id, id);
create index comments_user_id_idx on public.comments (user_id);

-- ============================================
-- 2) RLS 활성화
-- ============================================
alter table public.posts enable row level security;
alter table public.comments enable row level security;

-- ============================================
-- 3) RLS 정책
-- ============================================
-- posts: 모든 사용자 조회 가능
create policy "posts_select_all" on public.posts
  for select to anon, authenticated using (true);

-- posts: 로그인 사용자만 작성 가능 (본인 user_id로만 insert)
create policy "posts_insert_own" on public.posts
  for insert to authenticated with check (auth.uid() = user_id);

-- posts: 작성자 본인만 수정 가능
create policy "posts_update_own" on public.posts
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- posts: 작성자 본인만 삭제 가능
create policy "posts_delete_own" on public.posts
  for delete to authenticated using (auth.uid() = user_id);

-- comments: 모든 사용자 조회 가능
create policy "comments_select_all" on public.comments
  for select to anon, authenticated using (true);

-- comments: 로그인 사용자만 작성 가능 (본인 user_id로만 insert)
create policy "comments_insert_own" on public.comments
  for insert to authenticated with check (auth.uid() = user_id);

-- comments: 작성자 본인만 삭제 가능
create policy "comments_delete_own" on public.comments
  for delete to authenticated using (auth.uid() = user_id);
```

4. **Authentication → Sign In / Providers → Email**에서 "Confirm email" 여부를 원하는 대로 설정합니다.

## 4. 환경변수 설정 방법

`.env.local.example`을 복사해 `.env.local`을 만들고 값을 채웁니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트의 Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase 프로젝트의 anon public key

`.env.local`은 `.gitignore`에 포함되어 Git에 커밋되지 않습니다.

## 5. 로컬 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다. (3000번 포트가 사용 중이면 Next.js가 자동으로 다른 포트를 사용합니다.)

빌드/린트 확인:

```bash
npm run build   # 프로덕션 빌드 + 타입 체크
npm run lint     # ESLint
```

## 6. GitHub 업로드 방법

```bash
cd DemoBoard3
git init
git add .
git commit -m "Initial commit"
gh repo create demoboard3 --private --source=. --remote=origin   # GitHub CLI 사용 시
# 또는 GitHub 웹에서 빈 저장소를 만든 뒤:
# git remote add origin https://github.com/<your-id>/demoboard3.git
git branch -M main
git push -u origin main
```

`.env.local`은 `.gitignore`에 포함되어 있으므로 실수로 키가 올라가지 않습니다.

## 7. Vercel 배포 방법

1. [vercel.com](https://vercel.com)에 로그인 후 **Add New → Project**에서 방금 올린 GitHub 저장소를 선택합니다.
2. Framework Preset은 Next.js로 자동 인식됩니다.
3. **Environment Variables**에 아래 두 값을 추가합니다 (Production/Preview 모두).

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `.env.local`과 동일한 값 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local`과 동일한 값 |

4. **Deploy**를 누르면 빌드 후 배포됩니다.
5. 이후 GitHub `main` 브랜치에 push할 때마다 자동으로 재배포됩니다.

Vercel CLI로 배포하려면:

```bash
npm i -g vercel
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel deploy --prod
```

## 8. 전체 배포 순서 (처음부터 끝까지)

1. `npm install`로 의존성을 설치한다.
2. `.env.local`에 Supabase URL/anon key가 채워져 있는지 확인한다 (이미 채워져 있음, 새 프로젝트를 쓸 경우 3장 참고).
3. Supabase SQL Editor에서 3장의 SQL(테이블 + RLS)을 실행한다 (이미 적용되어 있음).
4. `npm run dev`로 로컬에서 회원가입 → 로그인 → 글쓰기 → 목록 확인 → 상세 확인 → 수정 → 댓글 작성 → 삭제 → 로그아웃 흐름을 직접 확인한다.
5. `npm run build`로 빌드/타입 오류가 없는지 확인한다.
6. `git init` → `git add .` → `git commit`으로 커밋하고 GitHub 저장소를 만들어 push한다 (6장 참고).
7. Vercel에서 그 저장소를 Import하고, `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` 환경변수를 등록한다 (7장 참고).
8. Deploy를 눌러 배포하고, 배포된 URL에서 다시 한 번 회원가입~로그아웃 흐름을 확인한다.
9. Supabase 대시보드에서 "Confirm email"을 켜 둘지(운영) 끌지(데모) 결정한다.
