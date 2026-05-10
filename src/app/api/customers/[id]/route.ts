import { type NextRequest } from "next/server";
import { ErrorCode, errorResponse, parseBody, successResponse } from "@/lib/api";
import { canManageMaster } from "@/lib/auth/permissions";
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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");

  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isInteger(customerId) || customerId <= 0) {
    return errorResponse(ErrorCode.NOT_FOUND, "顧客が見つかりません");
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, deletedAt: null },
  });
  if (!customer) return errorResponse(ErrorCode.NOT_FOUND, "顧客が見つかりません");

  return successResponse(formatCustomer(customer));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");

  if (!canManageMaster(session)) {
    return errorResponse(ErrorCode.FORBIDDEN, "権限がありません");
  }

  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isInteger(customerId) || customerId <= 0) {
    return errorResponse(ErrorCode.NOT_FOUND, "顧客が見つかりません");
  }

  const existing = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null } });
  if (!existing) return errorResponse(ErrorCode.NOT_FOUND, "顧客が見つかりません");

  const parsed = await parseBody(req, customerSchema);
  if (!parsed.ok) return parsed.response;

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      phone: parsed.data.phone ?? null,
      industry: parsed.data.industry ?? null,
    },
  });

  return successResponse(formatCustomer(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です");

  if (!canManageMaster(session)) {
    return errorResponse(ErrorCode.FORBIDDEN, "権限がありません");
  }

  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isInteger(customerId) || customerId <= 0) {
    return errorResponse(ErrorCode.NOT_FOUND, "顧客が見つかりません");
  }

  const existing = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null } });
  if (!existing) return errorResponse(ErrorCode.NOT_FOUND, "顧客が見つかりません");

  await prisma.customer.update({
    where: { id: customerId },
    data: { deletedAt: new Date() },
  });

  return new Response(null, { status: 204 });
}
