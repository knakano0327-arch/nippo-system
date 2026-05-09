import { errorResponse, successResponse } from "@/lib/api";
import { ErrorCode } from "@/lib/api/errors";
import { verifyToken } from "@/lib/auth/jwt";
import { getSessionToken, setSession } from "@/lib/auth/session";

export async function POST() {
  const currentToken = await getSessionToken();
  if (!currentToken) {
    return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です。");
  }

  let payload;
  try {
    payload = await verifyToken(currentToken);
  } catch {
    return errorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です。");
  }

  const newToken = await setSession(payload);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return successResponse({ token: newToken, expires_at: expiresAt });
}
