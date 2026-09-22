import { notFound } from "next/navigation";
import { connection } from "next/server";
import { updatePostAction } from "@/app/actions";
import { PostForm } from "@/components/post-form";
import { getPost } from "@/lib/posts";

export default async function EditPostPage({ params }: PageProps<"/posts/[id]/edit">) {
  await connection();
  const { id } = await params;
  const post = await getPost(Number(id));
  if (!post) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">글 수정</h1>
      <PostForm
        action={updatePostAction.bind(null, post.id)}
        defaults={post}
        cancelHref={`/posts/${post.id}`}
        submitLabel="수정"
      />
    </div>
  );
}
