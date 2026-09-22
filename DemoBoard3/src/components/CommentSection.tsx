import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listComments } from "@/lib/comments";
import { CommentForm } from "@/components/CommentForm";
import { DeleteCommentButton } from "@/components/DeleteCommentButton";

export async function CommentSection({ postId }: { postId: number }) {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    comments,
  ] = await Promise.all([supabase.auth.getUser(), listComments(supabase, postId)]);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">댓글 {comments.length}개</h2>

      <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
        {comments.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-400">첫 댓글을 남겨보세요.</li>
        )}
        {comments.map((c) => (
          <li key={c.id} className="space-y-1 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="font-medium text-slate-900">{c.authorName}</span>
                <span className="text-xs text-slate-400">
                  {new Date(c.createdAt).toLocaleString("ko-KR")}
                </span>
              </div>
              {user?.id === c.userId && <DeleteCommentButton id={c.id} postId={postId} />}
            </div>
            <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{c.content}</p>
          </li>
        ))}
      </ul>

      {user ? (
        <CommentForm postId={postId} />
      ) : (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          댓글을 작성하려면{" "}
          <Link href="/login" className="font-medium text-blue-700 hover:underline">
            로그인
          </Link>
          이 필요합니다.
        </p>
      )}
    </section>
  );
}
