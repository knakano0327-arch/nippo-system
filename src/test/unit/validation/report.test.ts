// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/prisma");

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createReportSchema } from "@/lib/validation/schemas/report.schema";
import { POST } from "@/app/api/reports/route";
import { NextRequest } from "next/server";

const mockGetSession = vi.mocked(getSession);
const mockPrisma = vi.mocked(prisma, true);

const yamadaSession = { sub: "1", email: "yamada@test.com", isManager: false };
const tanakaSession = { sub: "2", email: "tanaka@test.com", isManager: false };

const validVisitRecord = {
  customer_id: 10,
  visit_content: "商談実施",
  sort_order: 1,
};

const validReportBody = {
  report_date: "2026-05-08",
  problem: "課題です",
  plan: "計画です",
  status: "submitted" as const,
  visit_records: [validVisitRecord],
};

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Zod スキーマバリデーション ───────────────────────────────────────────────

describe("createReportSchema", () => {
  // UT-RPT-001: report_date 必須チェック
  it("UT-RPT-001: report_date が空は「日付を入力してください」", () => {
    const result = createReportSchema.safeParse({ ...validReportBody, report_date: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("日付を入力してください");
    }
  });

  // UT-RPT-004: problem 2001文字 → エラー
  it("UT-RPT-004: problem が 2001文字はエラー", () => {
    const result = createReportSchema.safeParse({
      ...validReportBody,
      problem: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("2000文字以内で入力してください");
    }
  });

  // UT-RPT-005: problem 2000文字（境界値）→ エラーなし
  it("UT-RPT-005: problem が 2000文字はエラーなし（境界値）", () => {
    const result = createReportSchema.safeParse({
      ...validReportBody,
      problem: "a".repeat(2000),
    });
    expect(result.success).toBe(true);
  });

  // UT-RPT-006: plan 2001文字 → エラー
  it("UT-RPT-006: plan が 2001文字はエラー", () => {
    const result = createReportSchema.safeParse({
      ...validReportBody,
      plan: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("2000文字以内で入力してください");
    }
  });
});

// ── 重複チェック（API ルート経由） ────────────────────────────────────────────

describe("POST /api/reports - 重複チェック", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => vi.restoreAllMocks());

  // UT-RPT-002: 同一ユーザー同日付 → 409 DUPLICATE_REPORT
  it("UT-RPT-002: 同一ユーザーの同日付は 409 DUPLICATE_REPORT", async () => {
    mockGetSession.mockResolvedValue(yamadaSession);
    mockPrisma.dailyReport.findFirst = vi.fn().mockResolvedValue({ id: 1 });

    const res = await POST(makePostRequest(validReportBody));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("DUPLICATE_REPORT");
    expect(body.error.message).toBe("この日付の日報はすでに作成されています");
  });

  // UT-RPT-003: 別ユーザーの同日付 → 重複しない（201）
  it("UT-RPT-003: 別ユーザーの同日付は重複エラーにならない", async () => {
    mockGetSession.mockResolvedValue(tanakaSession);
    // 田中次郎の重複なし
    mockPrisma.dailyReport.findFirst = vi.fn().mockResolvedValue(null);
    mockPrisma.$transaction = vi.fn().mockResolvedValue({
      id: 2,
      salespersonId: 2,
      salesperson: { name: "田中 次郎" },
      reportDate: new Date("2026-05-08"),
      problem: validReportBody.problem,
      plan: validReportBody.plan,
      status: "submitted",
      createdAt: new Date(),
      updatedAt: new Date(),
      visitRecords: [
        {
          id: 1,
          customerId: 10,
          customer: { name: "株式会社A商事" },
          visitContent: "商談実施",
          sortOrder: 1,
          createdAt: new Date(),
        },
      ],
      comments: [],
    });

    const res = await POST(makePostRequest(validReportBody));
    expect(res.status).not.toBe(409);
  });
});
