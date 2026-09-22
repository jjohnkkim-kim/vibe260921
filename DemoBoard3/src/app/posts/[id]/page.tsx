import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPost, increaseViews } from "@/lib/posts";
import { CommentSection } from "@/components/CommentSection";
import { DeletePostButton } from "@/components/DeletePostButton";
import { StatusBanner } from "@/components/StatusBanner";

export default async function PostDetailPage({ params, searchParams }: PageProps<"/posts/[id]">) {
  await connection();
  const { id } = await params;
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const postId = Number(id);
  if (!Number.isInteger(postId)) notFound();

  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    post,
  ] = await Promise.all([supabase.auth.getUser(), getPost(supabase, postId)]);
  if (!post) notFound();

  await increaseViews(supabase, post.id, post.views);
  const isOwner = user?.id === post.userId;

  return (
    <div className="space-y-8">
      <StatusBanner status={status} error={error} />

      <article className="space-y-4 rounded-md border border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900">{post.title}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 pb-4 text-sm text-slate-500">
          <span>{post.authorName}</span>
          <span aria-hidden>·</span>
          <span>{new Date(post.createdAt).toLocaleString("ko-KR")}</span>
          <span aria-hidden>·</span>
          <span>조회 {post.views + 1}</span>
        </div>
        <p className="whitespace-pre-wrap break-words leading-relaxed text-slate-800">
          {post.content}
        </p>
      </article>

      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          목록
        </Link>
        {isOwner && (
          <div className="flex gap-2">
            <Link
              href={`/posts/${post.id}/edit`}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              수정
            </Link>
            <DeletePostButton id={post.id} />
          </div>
        )}
      </div>

      <CommentSection postId={post.id} />
    </div>
  );
}
