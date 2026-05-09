import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { CustomerSearchFilter } from "@/components/master/CustomerSearchFilter";
import { CustomerTable } from "@/components/master/CustomerTable";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";

type Props = {
  searchParams: Promise<{ name?: string; industry?: string; page?: string }>;
};

export default async function CustomersPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.isManager) redirect("/");

  const params = await searchParams;
  const name = params.name ?? "";
  const industry = params.industry ?? "";
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const perPage = 20;

  const where = {
    deletedAt: null,
    ...(name ? { name: { contains: name } } : {}),
    ...(industry ? { industry } : {}),
  };

  const [total, customers, industryRows] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.customer.findMany({
      where: { deletedAt: null, industry: { not: null } },
      select: { industry: true },
      distinct: ["industry"],
      orderBy: { industry: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(total / perPage);
  const industries = industryRows.map((r) => r.industry as string);

  const formattedCustomers = customers.map((c) => ({
    id: c.id,
    name: c.name,
    industry: c.industry,
    phone: c.phone,
    address: c.address,
    created_at: c.createdAt.toISOString(),
  }));

  const currentSearchParams: Record<string, string> = {};
  if (name) currentSearchParams.name = name;
  if (industry) currentSearchParams.industry = industry;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">顧客マスタ</h1>
        <Button asChild>
          <Link href="/master/customers/new">新規登録</Link>
        </Button>
      </div>

      <CustomerSearchFilter name={name} industry={industry} industries={industries} />

      <div className="text-muted-foreground text-sm">
        {total} 件中 {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)}{" "}
        件を表示
      </div>

      <CustomerTable customers={formattedCustomers} />

      <DashboardPagination page={page} totalPages={totalPages} searchParams={currentSearchParams} />
    </div>
  );
}
