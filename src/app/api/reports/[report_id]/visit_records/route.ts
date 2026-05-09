import { type NextRequest } from "next/server";
import { ErrorCode, errorResponse, parseBody, successResponse } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { visitRecordSchema } from "@/lib/validation/schemas/visitRecord.schema";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ report_id: string }> },
) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");

  const { report_id } = await params;
  const reportId = Number(report_id);
  if (!Number.isInteger(reportId) || reportId <= 0) {
    return errorResponse(ErrorCode.NOT_FOUND, "日報が見つかりません");
  }

  const parsed = await parseBody(req, visitRecordSchema);
  if (!parsed.ok) return parsed.response;

  const currentUserId = Number(session.sub);

  const report = await prisma.dailyReport.findUnique({ where: { id: reportId } });
  if (!report) {
    return errorResponse(ErrorCode.NOT_FOUND, "日報が見つかりません");
  }
  if (report.salespersonId !== currentUserId || report.status !== "draft") {
    return errorResponse(ErrorCode.FORBIDDEN, "アクセスが拒否されました");
  }

  const { customer_id, visit_content, sort_order } = parsed.data;

  const record = await prisma.visitRecord.create({
    data: {
      dailyReportId: reportId,
      customerId: customer_id,
      visitContent: visit_content,
      sortOrder: sort_order,
    },
    include: { customer: { select: { name: true } } },
  });

  return successResponse(
    {
      id: record.id,
      daily_report_id: record.dailyReportId,
      customer_id: record.customerId,
      customer_name: record.customer.name,
      visit_content: record.visitContent,
      sort_order: record.sortOrder,
      created_at: record.createdAt.toISOString(),
    },
    201,
  );
}
