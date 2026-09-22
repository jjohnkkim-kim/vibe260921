import Link from "next/link";
import { SignupForm } from "@/components/SignupForm";
import { StatusBanner } from "@/components/StatusBanner";

export const metadata = { title: "회원가입 - DemoBoard3" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <h1 className="text-xl font-bold text-slate-900">회원가입</h1>
      <StatusBanner error={error} />
      <SignupForm />
      <p className="text-center text-sm text-slate-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-medium text-blue-700 hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
