import Link from "next/link";

type Props = {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
};

export function Pagination({ page, totalPages, buildHref }: Props) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1 pt-2" aria-label="페이지네이션">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={`rounded-md px-3 py-1.5 text-sm font-medium ${
          page <= 1
            ? "pointer-events-none text-slate-300"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        이전
      </Link>
      {pages.map((p) => (
        <Link
          key={p}
          href={buildHref(p)}
          aria-current={p === page ? "page" : undefined}
          className={`min-w-9 rounded-md px-3 py-1.5 text-center text-sm font-medium ${
            p === page
              ? "bg-blue-700 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {p}
        </Link>
      ))}
      <Link
        href={buildHref(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={`rounded-md px-3 py-1.5 text-sm font-medium ${
          page >= totalPages
            ? "pointer-events-none text-slate-300"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        다음
      </Link>
    </nav>
  );
}
