import { type NextRequest } from "next/server";
import { ErrorCode, errorResponse, parseBody, successResponse } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { updateSalespersonSchema } from "@/lib/validation/schemas/salesperson.schema";

function formatSalesperson(s: {
  id: number;
  name: string;
  email: string;
  department: string | null;
  isManager: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    department: s.department,
    is_manager: s.isManager,
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");
  if (!session.isManager) return errorResponse(ErrorCode.FORBIDDEN, "権限がありません");

  const { id } = await params;
  const salespersonId = Number(id);
  if (!Number.isInteger(salespersonId) || salespersonId <= 0) {
    return errorResponse(ErrorCode.NOT_FOUND, "営業が見つかりません");
  }

  const salesperson = await prisma.salesperson.findFirst({
    where: { id: salespersonId, deletedAt: null },
  });
  if (!salesperson) return errorResponse(ErrorCode.NOT_FOUND, "営業が見つかりません");

  return successResponse(formatSalesperson(salesperson));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");
  if (!session.isManager) return errorResponse(ErrorCode.FORBIDDEN, "権限がありません");

  const { id } = await params;
  const salespersonId = Number(id);
  if (!Number.isInteger(salespersonId) || salespersonId <= 0) {
    return errorResponse(ErrorCode.NOT_FOUND, "営業が見つかりません");
  }

  const existing = await prisma.salesperson.findFirst({
    where: { id: salespersonId, deletedAt: null },
  });
  if (!existing) return errorResponse(ErrorCode.NOT_FOUND, "営業が見つかりません");

  const parsed = await parseBody(req, updateSalespersonSchema);
  if (!parsed.ok) return parsed.response;

  const { name, email, password, department, is_manager } = parsed.data;

  const duplicate = await prisma.salesperson.findFirst({
    where: { email, deletedAt: null, id: { not: salespersonId } },
  });
  if (duplicate)
    return errorResponse(ErrorCode.DUPLICATE_EMAIL, "このメールアドレスはすでに登録されています");

  const data: {
    name: string;
    email: string;
    department: string | null;
    isManager: boolean;
    passwordHash?: string;
  } = {
    name,
    email,
    department: department ?? null,
    isManager: is_manager ?? existing.isManager,
  };

  if (password) {
    data.passwordHash = await hashPassword(password);
  }

  const updated = await prisma.salesperson.update({
    where: { id: salespersonId },
    data,
  });

  return successResponse(formatSalesperson(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");
  if (!session.isManager) return errorResponse(ErrorCode.FORBIDDEN, "権限がありません");

  const { id } = await params;
  const salespersonId = Number(id);
  if (!Number.isInteger(salespersonId) || salespersonId <= 0) {
    return errorResponse(ErrorCode.NOT_FOUND, "営業が見つかりません");
  }

  const existing = await prisma.salesperson.findFirst({
    where: { id: salespersonId, deletedAt: null },
  });
  if (!existing) return errorResponse(ErrorCode.NOT_FOUND, "営業が見つかりません");

  await prisma.salesperson.update({
    where: { id: salespersonId },
    data: { deletedAt: new Date() },
  });

  return new Response(null, { status: 204 });
}
