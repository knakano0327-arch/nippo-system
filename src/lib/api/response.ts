import { NextResponse } from "next/server";
import { type ZodError } from "zod";
import { ErrorCode, type ErrorCode as ErrorCodeType, ErrorStatus } from "./errors";

export type ValidationDetail = { field: string; message: string };

export type Pagination = {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function paginatedResponse<T>(data: T[], pagination: Pagination): NextResponse {
  return NextResponse.json({ data, pagination }, { status: 200 });
}

export function errorResponse(
  code: ErrorCodeType,
  message: string,
  details?: ValidationDetail[],
): NextResponse {
  const status = ErrorStatus[code];
  const body: {
    error: { code: string; message: string; details?: ValidationDetail[] };
  } = { error: { code, message } };
  if (details) body.error.details = details;
  return NextResponse.json(body, { status });
}

export function zodErrorResponse(error: ZodError): NextResponse {
  const details: ValidationDetail[] = error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
  return errorResponse(ErrorCode.VALIDATION_ERROR, "入力内容に誤りがあります。", details);
}
