"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: { title: string; author: string; content: string };
  cancelHref: string;
  submitLabel: string;
};

export function PostForm({ action, defaults, cancelHref, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input id="title" name="title" maxLength={100} defaultValue={defaults?.title} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="author">작성자</Label>
        <Input id="author" name="author" maxLength={30} defaultValue={defaults?.author} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">내용</Label>
        <Textarea id="content" name="content" rows={12} maxLength={10000} defaultValue={defaults?.content} required />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" render={<Link href={cancelHref} />}>취소</Button>
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
