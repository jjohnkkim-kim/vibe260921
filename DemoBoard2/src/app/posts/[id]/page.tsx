import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { deletePostAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { increaseViews } from "@/lib/posts";

export default async function PostPage({ params }: PageProps<"/posts/[id]">) {
  await connection();
  const { id } = await params;
  const post = await increaseViews(Number(id));
  if (!post) notFound();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{post.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {post.author} · {new Date(post.createdAt).toLocaleString("ko-KR")} · 조회 {post.views}
          </p>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap break-words leading-relaxed">{post.content}</p>
        </CardContent>
      </Card>
      <div className="flex justify-between">
        <Button variant="outline" nativeButton={false} render={<Link href="/" />}>목록</Button>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href={`/posts/${post.id}/edit`} />}>수정</Button>
          <form action={deletePostAction}>
            <input type="hidden" name="id" value={post.id} />
            <Button type="submit" variant="destructive">삭제</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
