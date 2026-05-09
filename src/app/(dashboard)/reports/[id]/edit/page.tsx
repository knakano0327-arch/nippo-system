import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReportForm } from "@/components/reports/ReportForm";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function EditReportPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const reportId = Number(id);
  if (!Number.isInteger(reportId) || reportId <= 0) notFound();

  const currentUserId = Number(session.sub);

  const [report, user, customers] = await Promise.all([
    prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: {
        visitRecords: {
          select: { customerId: true, visitContent: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.salesperson.findFirst({
      where: { id: currentUserId },
      select: { name: true },
    }),
    prisma.customer.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!report) notFound();
  if (!user) redirect("/login");

  if (report.salespersonId !== currentUserId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <h1 className="text-2xl font-semibold">アクセスが拒否されました</h1>
        <p className="text-muted-foreground text-sm">この日報を編集する権限がありません。</p>
        <Button asChild variant="outline">
          <Link href="/">ダッシュボードへ戻る</Link>
        </Button>
      </div>
    );
  }

  if (report.status !== "draft") {
    redirect(`/reports/${reportId}`);
  }

  const initialValues = {
    report_date: report.reportDate.toISOString().slice(0, 10),
    problem: report.problem ?? "",
    plan: report.plan ?? "",
    visit_records: report.visitRecords.map((vr) => ({
      customer_id: vr.customerId,
      visit_content: vr.visitContent,
    })),
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">日報編集</h1>
      <ReportForm
        authorName={user.name}
        customers={customers}
        reportId={reportId}
        initialValues={initialValues}
      />
    </div>
  );
}
