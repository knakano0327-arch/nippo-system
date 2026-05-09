import { type NextRequest } from "next/server";
import { ErrorCode, errorResponse, parseBody, successResponse } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { updateReportSchema } from "@/lib/validation/schemas/report.schema";
import { fetchReportDetail, formatReportDetail } from "../_shared";

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

  return successResponse(formatReportDetail(report));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");

  const { id } = await params;
  const reportId = Number(id);
  if (!Number.isInteger(reportId) || reportId <= 0) {
    return errorResponse(ErrorCode.NOT_FOUND, "日報が見つかりません");
  }

  const parsed = await parseBody(req, updateReportSchema);
  if (!parsed.ok) return parsed.response;

  const body = parsed.data;
  const currentUserId = Number(session.sub);

  const existing = await prisma.dailyReport.findUnique({ where: { id: reportId } });
  if (!existing) {
    return errorResponse(ErrorCode.NOT_FOUND, "日報が見つかりません");
  }
  if (existing.salespersonId !== currentUserId || existing.status !== "draft") {
    return errorResponse(ErrorCode.FORBIDDEN, "アクセスが拒否されました");
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.visitRecord.deleteMany({ where: { dailyReportId: reportId } });
    await tx.dailyReport.update({
      where: { id: reportId },
      data: {
        reportDate: new Date(body.report_date),
        problem: body.problem ?? null,
        plan: body.plan ?? null,
        status: body.status,
        visitRecords: {
          create: body.visit_records.map((vr) => ({
            customerId: vr.customer_id,
            visitContent: vr.visit_content,
            sortOrder: vr.sort_order,
          })),
        },
      },
    });
    return fetchReportDetail(tx, reportId);
  });

  return successResponse(formatReportDetail(updated!));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");

  const { id } = await params;
  const reportId = Number(id);
  if (!Number.isInteger(reportId) || reportId <= 0) {
    return errorResponse(ErrorCode.NOT_FOUND, "日報が見つかりません");
  }

  const currentUserId = Number(session.sub);

  const existing = await prisma.dailyReport.findUnique({ where: { id: reportId } });
  if (!existing) {
    return errorResponse(ErrorCode.NOT_FOUND, "日報が見つかりません");
  }
  if (existing.salespersonId !== currentUserId || existing.status !== "draft") {
    return errorResponse(ErrorCode.FORBIDDEN, "アクセスが拒否されました");
  }

  await prisma.dailyReport.delete({ where: { id: reportId } });

  return new Response(null, { status: 204 });
}
