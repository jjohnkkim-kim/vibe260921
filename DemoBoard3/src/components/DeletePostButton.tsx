"use client";

import { useTransition } from "react";
import { deletePostAction } from "@/lib/actions/posts";

export function DeletePostButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("게시글을 삭제하시겠습니까? 삭제하면 되돌릴 수 없습니다.")) return;
        const formData = new FormData();
        formData.set("id", String(id));
        startTransition(() => deletePostAction(formData));
      }}
      className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "삭제 중..." : "삭제"}
    </button>
  );
}
