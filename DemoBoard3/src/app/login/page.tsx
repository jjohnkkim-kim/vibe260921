import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { StatusBanner } from "@/components/StatusBanner";

export const metadata = { title: "로그인 - DemoBoard3" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <h1 className="text-xl font-bold text-slate-900">로그인</h1>
      <StatusBanner status={status} error={error} />
      <LoginForm />
      <p className="text-center text-sm text-slate-500">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="font-medium text-blue-700 hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}
