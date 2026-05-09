import { type NextRequest } from "next/server";
import { ErrorCode, errorResponse, parseBody, successResponse } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { visitRecordSchema } from "@/lib/validation/schemas/visitRecord.schema";

async function resolveReport(reportId: number, currentUserId: number) {
  const report = await prisma.dailyReport.findUnique({ where: { id: reportId } });
  if (!report) return { error: "not_found" } as const;
  if (report.salespersonId !== currentUserId || report.status !== "draft") {
    return { error: "forbidden" } as const;
  }
  return { report };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ report_id: string; id: string }> },
) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");

  const { report_id, id } = await params;
  const reportId = Number(report_id);
  const recordId = Number(id);

  if (!Number.isInteger(reportId) || reportId <= 0) {
    return errorResponse(ErrorCode.NOT_FOUND, "日報が見つかりません");
  }
  if (!Number.isInteger(recordId) || recordId <= 0) {
    return errorResponse(ErrorCode.NOT_FOUND, "訪問記録が見つかりません");
  }

  const parsed = await parseBody(req, visitRecordSchema);
  if (!parsed.ok) return parsed.response;

  const currentUserId = Number(session.sub);
  const result = await resolveReport(reportId, currentUserId);
  if ("error" in result) {
    return result.error === "not_found"
      ? errorResponse(ErrorCode.NOT_FOUND, "日報が見つかりません")
      : errorResponse(ErrorCode.FORBIDDEN, "アクセスが拒否されました");
  }

  const existing = await prisma.visitRecord.findUnique({ where: { id: recordId } });
  if (!existing || existing.dailyReportId !== reportId) {
    return errorResponse(ErrorCode.NOT_FOUND, "訪問記録が見つかりません");
  }

  const { customer_id, visit_content, sort_order } = parsed.data;

  const updated = await prisma.visitRecord.update({
    where: { id: recordId },
    data: { customerId: customer_id, visitContent: visit_content, sortOrder: sort_order },
    include: { customer: { select: { name: true } } },
  });

  return successResponse({
    id: updated.id,
    daily_report_id: updated.dailyReportId,
    customer_id: updated.customerId,
    customer_name: updated.customer.name,
    visit_content: updated.visitContent,
    sort_order: updated.sortOrder,
    created_at: updated.createdAt.toISOString(),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ report_id: string; id: string }> },
) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");

  const { report_id, id } = await params;
  const reportId = Number(report_id);
  const recordId = Number(id);

  if (!Number.isInteger(reportId) || reportId <= 0) {
    return errorResponse(ErrorCode.NOT_FOUND, "日報が見つかりません");
  }
  if (!Number.isInteger(recordId) || recordId <= 0) {
    return errorResponse(ErrorCode.NOT_FOUND, "訪問記録が見つかりません");
  }

  const currentUserId = Number(session.sub);
  const result = await resolveReport(reportId, currentUserId);
  if ("error" in result) {
    return result.error === "not_found"
      ? errorResponse(ErrorCode.NOT_FOUND, "日報が見つかりません")
      : errorResponse(ErrorCode.FORBIDDEN, "アクセスが拒否されました");
  }

  const count = await prisma.visitRecord.count({ where: { dailyReportId: reportId } });
  if (count <= 1) {
    return errorResponse(ErrorCode.LAST_RECORD, "最後の訪問記録は削除できません");
  }

  const existing = await prisma.visitRecord.findUnique({ where: { id: recordId } });
  if (!existing || existing.dailyReportId !== reportId) {
    return errorResponse(ErrorCode.NOT_FOUND, "訪問記録が見つかりません");
  }

  await prisma.visitRecord.delete({ where: { id: recordId } });

  return new Response(null, { status: 204 });
}
