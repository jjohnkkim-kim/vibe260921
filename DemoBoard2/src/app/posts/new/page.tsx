import { createPostAction } from "@/app/actions";
import { PostForm } from "@/components/post-form";

export const metadata = { title: "글쓰기 - DemoBoard" };

export default function NewPostPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">글쓰기</h1>
      <PostForm action={createPostAction} cancelHref="/" submitLabel="등록" />
    </div>
  );
}
