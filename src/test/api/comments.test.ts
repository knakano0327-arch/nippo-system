// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
  setSession: vi.fn(),
  clearSession: vi.fn(),
  getSessionToken: vi.fn(),
  COOKIE_NAME: "session_token",
}));

import { getSession } from "@/lib/auth/session";
import { POST as commentsPOST } from "@/app/api/reports/[report_id]/comments/route";
import { cleanTestDb, seedTestData, testPrisma, type SeedResult } from "@/test/helpers/testDb";

let seed: SeedResult;

async function createSubmittedReport(salespersonId: number, customerId: number) {
  return testPrisma.dailyReport.create({
    data: {
      salespersonId,
      reportDate: new Date("2026-05-08T00:00:00.000Z"),
      status: "submitted",
      problem: "テスト課題",
      plan: "テスト計画",
      visitRecords: {
        create: [{ customerId, visitContent: "訪問内容", sortOrder: 1 }],
      },
    },
  });
}

beforeEach(async () => {
  await cleanTestDb();
  seed = await seedTestData();
});

describe("AT-CMT-001: コメント投稿 正常系", () => {
  it("上長が日報に Problem コメントを投稿すると 201 とコメントオブジェクトを返す", async () => {
    const report = await createSubmittedReport(seed.yamada.id, seed.aShoji.id);

    vi.mocked(getSession).mockResolvedValue({
      sub: String(seed.suzuki.id),
      email: seed.suzuki.email,
      isManager: true,
      isAdmin: false,
    });

    const req = new NextRequest(`http://localhost/api/reports/${report.id}/comments`, {
      method: "POST",
      body: JSON.stringify({
        target_type: "problem",
        content: "対応策を検討してください。",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await commentsPOST(req, {
      params: Promise.resolve({ report_id: String(report.id) }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.target_type).toBe("problem");
    expect(body.content).toBe("対応策を検討してください。");
    expect(body.commenter_name).toBe("鈴木 部長");
    expect(body.daily_report_id).toBe(report.id);
  });
});

describe("AT-CMT-002: コメント投稿 営業による操作エラー", () => {
  it("一般営業がコメント投稿を試みると 403 FORBIDDEN を返す", async () => {
    const report = await createSubmittedReport(seed.yamada.id, seed.aShoji.id);

    vi.mocked(getSession).mockResolvedValue({
      sub: String(seed.yamada.id),
      email: seed.yamada.email,
      isManager: false,
      isAdmin: false,
    });

    const req = new NextRequest(`http://localhost/api/reports/${report.id}/comments`, {
      method: "POST",
      body: JSON.stringify({
        target_type: "problem",
        content: "コメント試み",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await commentsPOST(req, {
      params: Promise.resolve({ report_id: String(report.id) }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
