import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPost } from "@/lib/posts";
import { updatePostAction } from "@/lib/actions/posts";
import { PostForm } from "@/components/PostForm";
import { StatusBanner } from "@/components/StatusBanner";

export default async function EditPostPage({ params, searchParams }: PageProps<"/posts/[id]/edit">) {
  await connection();
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) notFound();

  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    post,
  ] = await Promise.all([supabase.auth.getUser(), getPost(supabase, postId)]);
  if (!post) notFound();
  if (!user) redirect("/login");
  if (user.id !== post.userId) redirect(`/posts/${postId}?error=forbidden`);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-slate-900">글 수정</h1>
      <StatusBanner error={error} />
      <PostForm
        action={updatePostAction.bind(null, post.id)}
        defaults={post}
        cancelHref={`/posts/${post.id}`}
        submitLabel="수정"
      />
    </div>
  );
}
