import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { SalespersonTable } from "@/components/master/SalespersonTable";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function SalespersonsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.isManager) redirect("/");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const perPage = 20;

  const where = { deletedAt: null };

  const [total, salespersons] = await Promise.all([
    prisma.salesperson.count({ where }),
    prisma.salesperson.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  const formatted = salespersons.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    department: s.department,
    is_manager: s.isManager,
    created_at: s.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">営業マスタ</h1>
        <Button asChild>
          <Link href="/master/salespersons/new">新規登録</Link>
        </Button>
      </div>

      <div className="text-muted-foreground text-sm">
        {total} 件中 {Math.min((page - 1) * perPage + 1, Math.max(total, 1))}–
        {Math.min(page * perPage, total)} 件を表示
      </div>

      <SalespersonTable salespersons={formatted} />

      <DashboardPagination page={page} totalPages={totalPages} searchParams={{}} />
    </div>
  );
}
