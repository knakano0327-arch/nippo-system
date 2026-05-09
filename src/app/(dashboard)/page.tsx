import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";
import { ReportTable } from "@/components/dashboard/ReportTable";
import { SearchFilter } from "@/components/dashboard/SearchFilter";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const PER_PAGE = 20;

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function firstDayOfMonth(): string {
  const d = new Date();
  return toDateString(new Date(d.getFullYear(), d.getMonth(), 1));
}

function today(): string {
  return toDateString(new Date());
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession();
  if (!session) return null;

  const sp = await searchParams;
  const get = (key: string) => (Array.isArray(sp[key]) ? sp[key][0] : sp[key]) ?? "";

  const from = get("from") || firstDayOfMonth();
  const to = get("to") || today();
  const salespersonIdParam = get("salesperson_id");
  const page = Math.max(1, Number(get("page")) || 1);

  const currentUserId = Number(session.sub);
  const isManager = session.isManager;

  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T23:59:59`);

  const where = {
    reportDate: { gte: fromDate, lte: toDate },
    ...(!isManager ? { salespersonId: currentUserId } : {}),
    ...(isManager && salespersonIdParam ? { salespersonId: Number(salespersonIdParam) } : {}),
  };

  const [total, reports, salespersons] = await Promise.all([
    prisma.dailyReport.count({ where }),
    prisma.dailyReport.findMany({
      where,
      orderBy: { reportDate: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        salesperson: { select: { name: true } },
        _count: { select: { visitRecords: true, comments: true } },
      },
    }),
    isManager
      ? prisma.salesperson.findMany({
          where: { deletedAt: null },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  const reportRows = reports.map((r) => ({
    id: r.id,
    salesperson_id: r.salespersonId,
    salesperson_name: r.salesperson.name,
    report_date: toDateString(r.reportDate),
    status: r.status as "draft" | "submitted" | "reviewed",
    visit_count: r._count.visitRecords,
    has_comment: r._count.comments > 0,
  }));

  const currentSearchParams: Record<string, string> = {};
  if (from) currentSearchParams.from = from;
  if (to) currentSearchParams.to = to;
  if (salespersonIdParam) currentSearchParams.salesperson_id = salespersonIdParam;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">日報一覧</h1>
        {!isManager && (
          <Button asChild>
            <Link href="/reports/new">新規作成</Link>
          </Button>
        )}
      </div>

      <SearchFilter
        from={from}
        to={to}
        salespersonId={salespersonIdParam}
        salespersons={salespersons}
        isManager={isManager}
      />

      <ReportTable reports={reportRows} currentUserId={currentUserId} isManager={isManager} />

      <DashboardPagination page={page} totalPages={totalPages} searchParams={currentSearchParams} />
    </div>
  );
}
