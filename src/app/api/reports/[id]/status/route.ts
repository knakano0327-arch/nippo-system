import { type NextRequest } from "next/server";
import { ErrorCode, errorResponse, parseBody, successResponse } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { updateReportStatusSchema } from "@/lib/validation/schemas/report.schema";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");

  if (!session.isManager) {
    return errorResponse(ErrorCode.FORBIDDEN, "権限がありません");
  }

  const { id } = await params;
  const reportId = Number(id);
  if (!Number.isInteger(reportId) || reportId <= 0) {
    return errorResponse(ErrorCode.NOT_FOUND, "日報が見つかりません");
  }

  const parsed = await parseBody(req, updateReportStatusSchema);
  if (!parsed.ok) return parsed.response;

  const existing = await prisma.dailyReport.findUnique({ where: { id: reportId } });
  if (!existing) {
    return errorResponse(ErrorCode.NOT_FOUND, "日報が見つかりません");
  }

  const updated = await prisma.dailyReport.update({
    where: { id: reportId },
    data: { status: parsed.data.status },
    select: { id: true, status: true, updatedAt: true },
  });

  return successResponse({
    id: updated.id,
    status: updated.status,
    updated_at: updated.updatedAt.toISOString(),
  });
}
