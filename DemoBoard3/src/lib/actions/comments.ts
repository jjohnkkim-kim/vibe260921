"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createComment, deleteComment } from "@/lib/comments";

export async function createCommentAction(postId: number, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/posts/${postId}?error=comment_login_required`);

  const content = String(formData.get("content") ?? "").trim();
  if (!content) redirect(`/posts/${postId}?error=comment_empty`);
  if (content.length > 1000) redirect(`/posts/${postId}?error=comment_too_long`);

  await createComment(supabase, {
    postId,
    content,
    userId: user.id,
    authorName: user.email ?? "익명",
  });

  revalidatePath(`/posts/${postId}`);
  redirect(`/posts/${postId}?status=commented`);
}

export async function deleteCommentAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const postId = Number(formData.get("postId"));
  if (!Number.isInteger(id) || !Number.isInteger(postId)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/posts/${postId}?error=forbidden`);

  const ok = await deleteComment(supabase, id);
  revalidatePath(`/posts/${postId}`);
  if (!ok) redirect(`/posts/${postId}?error=forbidden`);
  redirect(`/posts/${postId}`);
}
