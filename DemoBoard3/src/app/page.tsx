import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listPosts } from "@/lib/posts";
import { Pagination } from "@/components/Pagination";
import { StatusBanner } from "@/components/StatusBanner";
import type { SearchField } from "@/lib/types";

const PAGE_SIZE = 10;

function normalizeField(v: unknown): SearchField {
  return v === "title" || v === "content" || v === "both" ? v : "both";
}

export default async function Home({ searchParams }: PageProps<"/">) {
  await connection();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const field = normalizeField(sp.field);
  const pageNum = Number(typeof sp.page === "string" ? sp.page : 1) || 1;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let result;
  let loadError = false;
  try {
    result = await listPosts(supabase, q, field, pageNum, PAGE_SIZE);
  } catch {
    loadError = true;
    result = { posts: [], total: 0, totalPages: 1, page: 1 };
  }
  const { posts, total, totalPages, page } = result;

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (field !== "both") params.set("field", field);
    params.set("page", String(p));
    return `/?${params}`;
  };

  return (
    <div className="space-y-6">
      <StatusBanner status={status} error={loadError ? "load" : error} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-slate-900">게시판</h1>
        {user && (
          <Link
            href="/posts/new"
            className="inline-flex items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800"
          >
            글쓰기
          </Link>
        )}
      </div>

      <form action="/" method="get" className="flex flex-col gap-2 sm:flex-row">
        <select
          name="field"
          defaultValue={field}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        >
          <option value="both">제목+내용</option>
          <option value="title">제목</option>
          <option value="content">내용</option>
        </select>
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="검색어를 입력하세요"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        />
        <button
          type="submit"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          검색
        </button>
      </form>

      <p className="text-sm text-slate-500">총 {total}건</p>

      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="w-16 px-4 py-3 font-medium">번호</th>
              <th className="px-4 py-3 font-medium">제목</th>
              <th className="w-40 px-4 py-3 font-medium">작성자</th>
              <th className="w-32 px-4 py-3 font-medium">작성일</th>
              <th className="w-20 px-4 py-3 text-right font-medium">조회수</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {posts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center text-slate-400">
                  게시글이 없습니다.
                </td>
              </tr>
            )}
            {posts.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">{p.id}</td>
                <td className="px-4 py-3">
                  <Link href={`/posts/${p.id}`} className="font-medium text-slate-900 hover:text-blue-700 hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">{p.authorName}</td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(p.createdAt).toLocaleDateString("ko-KR")}
                </td>
                <td className="px-4 py-3 text-right text-slate-500">{p.views}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
