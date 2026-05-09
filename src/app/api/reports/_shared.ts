import type { PrismaClient } from "../../../../generated/prisma/client";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export async function fetchReportDetail(tx: Tx, reportId: number) {
  return tx.dailyReport.findUnique({
    where: { id: reportId },
    include: {
      salesperson: { select: { name: true } },
      visitRecords: {
        include: { customer: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      },
      comments: {
        include: { commenter: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

type ReportDetail = NonNullable<Awaited<ReturnType<typeof fetchReportDetail>>>;

export function formatReportDetail(report: ReportDetail) {
  return {
    id: report.id,
    salesperson_id: report.salespersonId,
    salesperson_name: report.salesperson.name,
    report_date: report.reportDate.toISOString().split("T")[0],
    problem: report.problem,
    plan: report.plan,
    status: report.status,
    created_at: report.createdAt.toISOString(),
    updated_at: report.updatedAt.toISOString(),
    visit_records: report.visitRecords.map((vr) => ({
      id: vr.id,
      customer_id: vr.customerId,
      customer_name: vr.customer.name,
      visit_content: vr.visitContent,
      sort_order: vr.sortOrder,
    })),
    comments: report.comments.map((c) => ({
      id: c.id,
      commenter_id: c.commenterId,
      commenter_name: c.commenter.name,
      target_type: c.targetType,
      content: c.content,
      created_at: c.createdAt.toISOString(),
      updated_at: c.updatedAt.toISOString(),
    })),
  };
}
