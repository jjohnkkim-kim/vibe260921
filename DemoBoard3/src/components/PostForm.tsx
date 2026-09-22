"use client";

import { useFormStatus } from "react-dom";
import Link from "next/link";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  defaults?: { title: string; content: string };
  cancelHref: string;
  submitLabel: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "저장 중..." : label}
    </button>
  );
}

export function PostForm({ action, defaults, cancelHref, submitLabel }: Props) {
  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="title" className="block text-sm font-medium text-slate-700">
          제목
        </label>
        <input
          id="title"
          name="title"
          maxLength={150}
          defaultValue={defaults?.title}
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="content" className="block text-sm font-medium text-slate-700">
          내용
        </label>
        <textarea
          id="content"
          name="content"
          rows={14}
          maxLength={20000}
          defaultValue={defaults?.content}
          required
          className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        />
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
        <Link
          href={cancelHref}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          취소
        </Link>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
