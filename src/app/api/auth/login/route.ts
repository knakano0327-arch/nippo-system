import { type NextRequest } from "next/server";
import { ErrorCode, errorResponse, parseBody, successResponse } from "@/lib/api";
import { verifyPassword } from "@/lib/auth/password";
import { setSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/schemas/auth.schema";

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, loginSchema);
  if (!parsed.ok) return parsed.response;

  const { email, password } = parsed.data;

  const user = await prisma.salesperson.findFirst({
    where: { email, deletedAt: null },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return errorResponse(
      ErrorCode.INVALID_CREDENTIALS,
      "メールアドレスまたはパスワードが正しくありません",
    );
  }

  const payload = {
    sub: String(user.id),
    email: user.email,
    isManager: user.isManager,
  };

  const token = await setSession(payload);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return successResponse({
    token,
    expires_at: expiresAt,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
      is_manager: user.isManager,
    },
  });
}
