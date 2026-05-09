import { type NextRequest } from "next/server";
import { ErrorCode, errorResponse, paginatedResponse, parseBody, successResponse } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validation/schemas/customer.schema";

function formatCustomer(c: {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  industry: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: c.id,
    name: c.name,
    address: c.address,
    phone: c.phone,
    industry: c.industry,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");

  const { searchParams } = req.nextUrl;
  const name = searchParams.get("name") ?? undefined;
  const industry = searchParams.get("industry") ?? undefined;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const perPage = Math.min(100, Math.max(1, Number(searchParams.get("per_page") ?? "20") || 20));

  const where = {
    deletedAt: null,
    ...(name ? { name: { contains: name } } : {}),
    ...(industry ? { industry } : {}),
  };

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return paginatedResponse(customers.map(formatCustomer), {
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");

  if (!session.isManager) {
    return errorResponse(ErrorCode.FORBIDDEN, "権限がありません");
  }

  const parsed = await parseBody(req, customerSchema);
  if (!parsed.ok) return parsed.response;

  const customer = await prisma.customer.create({
    data: {
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      phone: parsed.data.phone ?? null,
      industry: parsed.data.industry ?? null,
    },
  });

  return successResponse(formatCustomer(customer), 201);
}
