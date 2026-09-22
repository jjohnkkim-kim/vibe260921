import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="space-y-4 py-20 text-center">
      <p className="text-lg">게시글을 찾을 수 없습니다.</p>
      <Button nativeButton={false} render={<Link href="/" />}>목록으로</Button>
    </div>
  );
}
