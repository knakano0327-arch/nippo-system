import { type NextRequest } from "next/server";
import { ErrorCode, errorResponse, paginatedResponse, parseBody, successResponse } from "@/lib/api";
import { canManageMaster } from "@/lib/auth/permissions";
import { hashPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createSalespersonSchema } from "@/lib/validation/schemas/salesperson.schema";

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

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");
  if (!canManageMaster(session)) return errorResponse(ErrorCode.FORBIDDEN, "権限がありません");

  const { searchParams } = req.nextUrl;
  const department = searchParams.get("department") ?? undefined;
  const isManagerParam = searchParams.get("is_manager");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const perPage = Math.min(100, Math.max(1, Number(searchParams.get("per_page") ?? "20") || 20));

  const where = {
    deletedAt: null,
    ...(department ? { department: { contains: department } } : {}),
    ...(isManagerParam !== null ? { isManager: isManagerParam === "true" } : {}),
  };

  const [total, salespersons] = await Promise.all([
    prisma.salesperson.count({ where }),
    prisma.salesperson.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return paginatedResponse(salespersons.map(formatSalesperson), {
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");
  if (!canManageMaster(session)) return errorResponse(ErrorCode.FORBIDDEN, "権限がありません");

  const parsed = await parseBody(req, createSalespersonSchema);
  if (!parsed.ok) return parsed.response;

  const { name, email, password, department, is_manager } = parsed.data;

  const existing = await prisma.salesperson.findFirst({ where: { email, deletedAt: null } });
  if (existing)
    return errorResponse(ErrorCode.DUPLICATE_EMAIL, "このメールアドレスはすでに登録されています");

  const passwordHash = await hashPassword(password);

  const salesperson = await prisma.salesperson.create({
    data: {
      name,
      email,
      passwordHash,
      department: department ?? null,
      isManager: is_manager ?? false,
    },
  });

  return successResponse(formatSalesperson(salesperson), 201);
}
