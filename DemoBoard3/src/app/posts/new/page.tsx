import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createPostAction } from "@/lib/actions/posts";
import { PostForm } from "@/components/PostForm";
import { StatusBanner } from "@/components/StatusBanner";

export const metadata = { title: "글쓰기 - DemoBoard3" };

export default async function NewPostPage({ searchParams }: PageProps<"/posts/new">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-slate-900">글쓰기</h1>
      <StatusBanner error={error} />
      <PostForm action={createPostAction} cancelHref="/" submitLabel="등록" />
    </div>
  );
}
