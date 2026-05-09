import { type NextRequest } from "next/server";
import { ErrorCode, errorResponse, parseBody, successResponse } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { updateCommentSchema } from "@/lib/validation/schemas/comment.schema";

async function resolveComment(reportId: number, commentId: number, currentUserId: number) {
  const report = await prisma.dailyReport.findUnique({ where: { id: reportId } });
  if (!report) return { error: "report_not_found" } as const;

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.dailyReportId !== reportId) {
    return { error: "comment_not_found" } as const;
  }
  if (comment.commenterId !== currentUserId) {
    return { error: "forbidden" } as const;
  }
  return { comment };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ report_id: string; id: string }> },
) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");

  const { report_id, id } = await params;
  const reportId = Number(report_id);
  const commentId = Number(id);

  if (!Number.isInteger(reportId) || reportId <= 0) {
    return errorResponse(ErrorCode.NOT_FOUND, "日報が見つかりません");
  }
  if (!Number.isInteger(commentId) || commentId <= 0) {
    return errorResponse(ErrorCode.NOT_FOUND, "コメントが見つかりません");
  }

  const parsed = await parseBody(req, updateCommentSchema);
  if (!parsed.ok) return parsed.response;

  const currentUserId = Number(session.sub);
  const result = await resolveComment(reportId, commentId, currentUserId);

  if ("error" in result) {
    if (result.error === "report_not_found") {
      return errorResponse(ErrorCode.NOT_FOUND, "日報が見つかりません");
    }
    if (result.error === "comment_not_found") {
      return errorResponse(ErrorCode.NOT_FOUND, "コメントが見つかりません");
    }
    return errorResponse(ErrorCode.FORBIDDEN, "アクセスが拒否されました");
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { content: parsed.data.content },
    include: { commenter: { select: { name: true } } },
  });

  return successResponse({
    id: updated.id,
    daily_report_id: updated.dailyReportId,
    commenter_id: updated.commenterId,
    commenter_name: updated.commenter.name,
    target_type: updated.targetType,
    content: updated.content,
    created_at: updated.createdAt.toISOString(),
    updated_at: updated.updatedAt.toISOString(),
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
  const commentId = Number(id);

  if (!Number.isInteger(reportId) || reportId <= 0) {
    return errorResponse(ErrorCode.NOT_FOUND, "日報が見つかりません");
  }
  if (!Number.isInteger(commentId) || commentId <= 0) {
    return errorResponse(ErrorCode.NOT_FOUND, "コメントが見つかりません");
  }

  const currentUserId = Number(session.sub);
  const result = await resolveComment(reportId, commentId, currentUserId);

  if ("error" in result) {
    if (result.error === "report_not_found") {
      return errorResponse(ErrorCode.NOT_FOUND, "日報が見つかりません");
    }
    if (result.error === "comment_not_found") {
      return errorResponse(ErrorCode.NOT_FOUND, "コメントが見つかりません");
    }
    return errorResponse(ErrorCode.FORBIDDEN, "アクセスが拒否されました");
  }

  await prisma.comment.delete({ where: { id: commentId } });

  return new Response(null, { status: 204 });
}
