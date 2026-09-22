"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPost, deletePost, updatePost } from "@/lib/posts";

export type FormState = { error?: string };

function parse(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    author: String(formData.get("author") ?? "").trim(),
    content: String(formData.get("content") ?? "").trim(),
  };
}

function validate(v: ReturnType<typeof parse>): string | undefined {
  if (!v.title) return "제목을 입력하세요.";
  if (v.title.length > 100) return "제목은 100자 이내로 입력하세요.";
  if (!v.author) return "작성자를 입력하세요.";
  if (v.author.length > 30) return "작성자는 30자 이내로 입력하세요.";
  if (!v.content) return "내용을 입력하세요.";
  if (v.content.length > 10000) return "내용은 10,000자 이내로 입력하세요.";
}

export async function createPostAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const v = parse(formData);
  const error = validate(v);
  if (error) return { error };
  const post = await createPost(v);
  revalidatePath("/");
  redirect(`/posts/${post.id}`);
}

export async function updatePostAction(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const v = parse(formData);
  const error = validate(v);
  if (error) return { error };
  const post = await updatePost(id, v);
  if (!post) return { error: "게시글을 찾을 수 없습니다." };
  revalidatePath("/");
  redirect(`/posts/${id}`);
}

export async function deletePostAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) await deletePost(id);
  revalidatePath("/");
  redirect("/");
}
