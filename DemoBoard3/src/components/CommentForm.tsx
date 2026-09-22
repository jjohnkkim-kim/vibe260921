"use client";

import { useFormStatus } from "react-dom";
import { createCommentAction } from "@/lib/actions/comments";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "등록 중..." : "댓글 등록"}
    </button>
  );
}

export function CommentForm({ postId }: { postId: number }) {
  const action = createCommentAction.bind(null, postId);

  return (
    <form action={action} className="space-y-2">
      <textarea
        name="content"
        rows={3}
        maxLength={1000}
        required
        placeholder="댓글을 입력하세요."
        className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
      />
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
