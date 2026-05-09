import { type NextRequest, NextResponse } from "next/server";
import { type ZodSchema } from "zod";
import { zodErrorResponse } from "./response";

export async function parseBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "リクエストボディが不正です。" } },
        { status: 422 },
      ),
    };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { ok: false, response: zodErrorResponse(result.error) };
  }
  return { ok: true, data: result.data };
}
