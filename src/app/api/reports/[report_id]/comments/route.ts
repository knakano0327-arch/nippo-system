import { type NextRequest } from "next/server";
import { ErrorCode, errorResponse, parseBody, successResponse } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createCommentSchema } from "@/lib/validation/schemas/comment.schema";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ report_id: string }> },
) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");

  if (!session.isManager) {
    return errorResponse(ErrorCode.FORBIDDEN, "権限がありません");
  }

  const { report_id } = await params;
  const reportId = Number(report_id);
  if (!Number.isInteger(reportId) || reportId <= 0) {
    return errorResponse(ErrorCode.NOT_FOUND, "日報が見つかりません");
  }

  const parsed = await parseBody(req, createCommentSchema);
  if (!parsed.ok) return parsed.response;

  const report = await prisma.dailyReport.findUnique({ where: { id: reportId } });
  if (!report) {
    return errorResponse(ErrorCode.NOT_FOUND, "日報が見つかりません");
  }

  const commenterId = Number(session.sub);

  const comment = await prisma.comment.create({
    data: {
      dailyReportId: reportId,
      commenterId,
      targetType: parsed.data.target_type,
      content: parsed.data.content,
    },
    include: { commenter: { select: { name: true } } },
  });

  return successResponse(
    {
      id: comment.id,
      daily_report_id: comment.dailyReportId,
      commenter_id: comment.commenterId,
      commenter_name: comment.commenter.name,
      target_type: comment.targetType,
      content: comment.content,
      created_at: comment.createdAt.toISOString(),
      updated_at: comment.updatedAt.toISOString(),
    },
    201,
  );
}
