import Link from "next/link";
import { connection } from "next/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listPosts } from "@/lib/posts";

const PAGE_SIZE = 10;

export default async function Home({ searchParams }: PageProps<"/">) {
  await connection();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const pageNum = Number(typeof sp.page === "string" ? sp.page : 1) || 1;
  const { posts, total, totalPages, page } = await listPosts(q, pageNum, PAGE_SIZE);

  const href = (p: number) => {
    const params = new URLSearchParams({ page: String(p) });
    if (q) params.set("q", q);
    return `/?${params}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <form action="/" className="flex flex-1 gap-2">
          <Input name="q" defaultValue={q} placeholder="제목·내용·작성자 검색" className="max-w-sm" />
          <Button type="submit" variant="secondary">검색</Button>
        </form>
        <Button nativeButton={false} render={<Link href="/posts/new" />}>글쓰기</Button>
      </div>

      <p className="text-sm text-muted-foreground">총 {total}건</p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">번호</TableHead>
            <TableHead>제목</TableHead>
            <TableHead className="w-28">작성자</TableHead>
            <TableHead className="w-28">작성일</TableHead>
            <TableHead className="w-16 text-right">조회</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                게시글이 없습니다.
              </TableCell>
            </TableRow>
          )}
          {posts.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.id}</TableCell>
              <TableCell>
                <Link href={`/posts/${p.id}`} className="hover:underline">
                  {p.title}
                </Link>
              </TableCell>
              <TableCell>{p.author}</TableCell>
              <TableCell>{new Date(p.createdAt).toLocaleDateString("ko-KR")}</TableCell>
              <TableCell className="text-right">{p.views}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            nativeButton={false}
            render={<Link href={href(page - 1)} />}
          >
            이전
          </Button>
          <span className="text-sm">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            nativeButton={false}
            render={<Link href={href(page + 1)} />}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
