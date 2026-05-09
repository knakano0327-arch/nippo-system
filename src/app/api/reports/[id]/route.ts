import { type NextRequest } from "next/server";
import { ErrorCode, errorResponse, successResponse } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");

  const { id } = await params;
  const reportId = Number(id);
  if (!Number.isInteger(reportId) || reportId <= 0) {
    return errorResponse(ErrorCode.NOT_FOUND, "日報が見つかりません");
  }

  const report = await prisma.dailyReport.findUnique({
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

  if (!report) {
    return errorResponse(ErrorCode.NOT_FOUND, "日報が見つかりません");
  }

  const currentUserId = Number(session.sub);
  const isManager = session.isManager;

  if (!isManager && report.salespersonId !== currentUserId) {
    return errorResponse(ErrorCode.FORBIDDEN, "アクセスが拒否されました");
  }

  return successResponse({
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
  });
}
