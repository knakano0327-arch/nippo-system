import { type NextRequest } from "next/server";
import { ErrorCode, errorResponse, paginatedResponse, parseBody, successResponse } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createReportSchema } from "@/lib/validation/schemas/report.schema";
import type { Prisma } from "../../../../generated/prisma/client";
import { fetchReportDetail, formatReportDetail } from "./_shared";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const salespersonIdParam = searchParams.get("salesperson_id");
  const statusParam = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const perPage = Math.min(100, Math.max(1, Number(searchParams.get("per_page") ?? "20") || 20));

  const currentUserId = Number(session.sub);
  const isManager = session.isManager;

  const where: Prisma.DailyReportWhereInput = {};

  if (!isManager) {
    where.salespersonId = currentUserId;
  } else if (salespersonIdParam) {
    where.salespersonId = Number(salespersonIdParam);
  }

  if (from || to) {
    where.reportDate = {};
    if (from) where.reportDate.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.reportDate.lte = toDate;
    }
  }

  if (statusParam && ["draft", "submitted", "reviewed"].includes(statusParam)) {
    where.status = statusParam as "draft" | "submitted" | "reviewed";
  }

  const [total, reports] = await Promise.all([
    prisma.dailyReport.count({ where }),
    prisma.dailyReport.findMany({
      where,
      orderBy: { reportDate: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        salespersonId: true,
        salesperson: { select: { name: true } },
        reportDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { visitRecords: true, comments: true } },
      },
    }),
  ]);

  const data = reports.map((r) => ({
    id: r.id,
    salesperson_id: r.salespersonId,
    salesperson_name: r.salesperson.name,
    report_date: r.reportDate.toISOString().split("T")[0],
    status: r.status,
    visit_count: r._count.visitRecords,
    has_comment: r._count.comments > 0,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  }));

  return paginatedResponse(data, {
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");

  const parsed = await parseBody(req, createReportSchema);
  if (!parsed.ok) return parsed.response;

  const body = parsed.data;
  const currentUserId = Number(session.sub);
  const reportDate = new Date(body.report_date);

  const duplicate = await prisma.dailyReport.findFirst({
    where: { salespersonId: currentUserId, reportDate },
  });
  if (duplicate) {
    return errorResponse(ErrorCode.DUPLICATE_REPORT, "この日付の日報はすでに作成されています");
  }

  const created = await prisma.$transaction(async (tx) => {
    const report = await tx.dailyReport.create({
      data: {
        salespersonId: currentUserId,
        reportDate,
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
    return fetchReportDetail(tx, report.id);
  });

  return successResponse(formatReportDetail(created!), 201);
}
