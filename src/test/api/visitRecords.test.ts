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
import { POST as visitRecordsPOST } from "@/app/api/reports/[report_id]/visit_records/route";
import { DELETE as visitRecordDELETE } from "@/app/api/reports/[report_id]/visit_records/[id]/route";
import { cleanTestDb, seedTestData, testPrisma, type SeedResult } from "@/test/helpers/testDb";

let seed: SeedResult;

async function createDraftReport(salespersonId: number, customerId: number) {
  return testPrisma.dailyReport.create({
    data: {
      salespersonId,
      reportDate: new Date("2026-05-08T00:00:00.000Z"),
      status: "draft",
      visitRecords: {
        create: [{ customerId, visitContent: "初期訪問内容", sortOrder: 1 }],
      },
    },
    include: { visitRecords: true },
  });
}

beforeEach(async () => {
  await cleanTestDb();
  seed = await seedTestData();
  vi.mocked(getSession).mockResolvedValue({
    sub: String(seed.yamada.id),
    email: seed.yamada.email,
    isManager: false,
    isAdmin: false,
  });
});

describe("AT-VST-001: 訪問記録追加 正常系", () => {
  it("下書き日報に訪問記録を追加すると 201 と新規記録を返す", async () => {
    const report = await createDraftReport(seed.yamada.id, seed.aShoji.id);

    const req = new NextRequest(`http://localhost/api/reports/${report.id}/visit_records`, {
      method: "POST",
      body: JSON.stringify({
        customer_id: seed.bSeizo.id,
        visit_content: "新規訪問内容",
        sort_order: 2,
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await visitRecordsPOST(req, {
      params: Promise.resolve({ report_id: String(report.id) }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.customer_name).toBe("株式会社B製造");
    expect(body.visit_content).toBe("新規訪問内容");
    expect(body.daily_report_id).toBe(report.id);
  });
});

describe("AT-VST-002: 最後の訪問記録の削除（エラー）", () => {
  it("訪問記録が 1 件しかない場合に削除すると 400 LAST_RECORD を返す", async () => {
    const report = await createDraftReport(seed.yamada.id, seed.aShoji.id);
    const recordId = report.visitRecords[0].id;

    const res = await visitRecordDELETE(
      new NextRequest(`http://localhost/api/reports/${report.id}/visit_records/${recordId}`, {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({
          report_id: String(report.id),
          id: String(recordId),
        }),
      },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("LAST_RECORD");
  });
});
