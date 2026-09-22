"use client";

import { useTransition } from "react";
import { deleteCommentAction } from "@/lib/actions/comments";

export function DeleteCommentButton({ id, postId }: { id: number; postId: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("댓글을 삭제하시겠습니까?")) return;
        const formData = new FormData();
        formData.set("id", String(id));
        formData.set("postId", String(postId));
        startTransition(() => deleteCommentAction(formData));
      }}
      className="text-xs font-medium text-slate-400 transition hover:text-red-600 disabled:opacity-50"
    >
      {pending ? "삭제 중..." : "삭제"}
    </button>
  );
}
