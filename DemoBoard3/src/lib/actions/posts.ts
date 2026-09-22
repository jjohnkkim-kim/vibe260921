"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createPost, deletePost, updatePost } from "@/lib/posts";

function parse(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    content: String(formData.get("content") ?? "").trim(),
  };
}

function validationError(v: ReturnType<typeof parse>): string | undefined {
  if (!v.title) return "title_required";
  if (v.title.length > 150) return "title_too_long";
  if (!v.content) return "content_required";
  if (v.content.length > 20000) return "content_too_long";
}

export async function createPostAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/posts/new?error=login_required");

  const v = parse(formData);
  const error = validationError(v);
  if (error) redirect(`/posts/new?error=${error}`);

  const post = await createPost(supabase, {
    title: v.title,
    content: v.content,
    userId: user.id,
    authorName: user.email ?? "익명",
  });
  revalidatePath("/");
  redirect(`/posts/${post.id}?status=created`);
}

export async function updatePostAction(id: number, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/posts/${id}/edit?error=login_required`);

  const v = parse(formData);
  const error = validationError(v);
  if (error) redirect(`/posts/${id}/edit?error=${error}`);

  const post = await updatePost(supabase, id, v);
  if (!post) redirect(`/posts/${id}?error=forbidden`);

  revalidatePath("/");
  revalidatePath(`/posts/${id}`);
  redirect(`/posts/${id}?status=updated`);
}

export async function deletePostAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/posts/${id}?error=forbidden`);

  const ok = await deletePost(supabase, id);
  revalidatePath("/");
  if (!ok) redirect(`/posts/${id}?error=forbidden`);
  redirect("/?status=deleted");
}
