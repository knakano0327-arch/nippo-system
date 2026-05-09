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
import { GET as reportsGET, POST as reportsPOST } from "@/app/api/reports/route";
import { GET as reportGET, PUT as reportPUT } from "@/app/api/reports/[id]/route";
import { PATCH as statusPATCH } from "@/app/api/reports/[id]/status/route";
import { cleanTestDb, seedTestData, testPrisma, type SeedResult } from "@/test/helpers/testDb";

let seed: SeedResult;

function makeListRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/reports");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

function makeDetailRequest(id: number) {
  return new NextRequest(`http://localhost/api/reports/${id}`);
}

async function createReport(
  salespersonId: number,
  customerId: number,
  opts: {
    reportDate?: string;
    status?: "draft" | "submitted" | "reviewed";
    visitCount?: number;
    problem?: string;
    plan?: string;
  } = {},
) {
  const { reportDate = "2026-05-08", status = "submitted", visitCount = 1, problem, plan } = opts;
  return testPrisma.dailyReport.create({
    data: {
      salespersonId,
      reportDate: new Date(`${reportDate}T00:00:00.000Z`),
      status,
      problem: problem ?? null,
      plan: plan ?? null,
      visitRecords: {
        create: Array.from({ length: visitCount }, (_, i) => ({
          customerId,
          visitContent: `訪問内容 ${i + 1}`,
          sortOrder: i + 1,
        })),
      },
    },
  });
}

beforeEach(async () => {
  await cleanTestDb();
  seed = await seedTestData();
  vi.mocked(getSession).mockResolvedValue({
    sub: String(seed.yamada.id),
    email: seed.yamada.email,
    isManager: false,
  });
});

describe("AT-RPT-001: 日報作成 正常系", () => {
  it("訪問記録 1 件で提出すると 201 と日報詳細を返す", async () => {
    const req = new NextRequest("http://localhost/api/reports", {
      method: "POST",
      body: JSON.stringify({
        report_date: "2026-05-08",
        problem: "課題テスト",
        plan: "計画テスト",
        status: "submitted",
        visit_records: [
          { customer_id: seed.aShoji.id, visit_content: "訪問内容テスト", sort_order: 1 },
        ],
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await reportsPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("submitted");
    expect(body.salesperson_id).toBe(seed.yamada.id);
    expect(body.report_date).toBe("2026-05-08");
    expect(body.visit_records).toHaveLength(1);
    expect(body.visit_records[0].customer_name).toBe("株式会社A商事");
  });
});

describe("AT-RPT-002: 日報作成 訪問記録複数件", () => {
  it("訪問記録 3 件で作成すると visit_records が 3 件含まれる", async () => {
    const req = new NextRequest("http://localhost/api/reports", {
      method: "POST",
      body: JSON.stringify({
        report_date: "2026-05-08",
        status: "submitted",
        visit_records: [
          { customer_id: seed.aShoji.id, visit_content: "訪問1", sort_order: 1 },
          { customer_id: seed.bSeizo.id, visit_content: "訪問2", sort_order: 2 },
          { customer_id: seed.aShoji.id, visit_content: "訪問3", sort_order: 3 },
        ],
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await reportsPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.visit_records).toHaveLength(3);
  });
});

describe("AT-RPT-003: 日報作成 一時保存（下書き）", () => {
  it("status=draft で作成すると status が draft で返る", async () => {
    const req = new NextRequest("http://localhost/api/reports", {
      method: "POST",
      body: JSON.stringify({
        report_date: "2026-05-08",
        status: "draft",
        visit_records: [{ customer_id: seed.aShoji.id, visit_content: "訪問内容", sort_order: 1 }],
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await reportsPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("draft");
  });
});

describe("AT-RPT-004: 日報作成 同日重複エラー", () => {
  it("同日付の日報が既存の場合 409 DUPLICATE_REPORT を返す", async () => {
    await createReport(seed.yamada.id, seed.aShoji.id, { reportDate: "2026-05-08" });

    const req = new NextRequest("http://localhost/api/reports", {
      method: "POST",
      body: JSON.stringify({
        report_date: "2026-05-08",
        status: "submitted",
        visit_records: [{ customer_id: seed.aShoji.id, visit_content: "重複訪問", sort_order: 1 }],
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await reportsPOST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("DUPLICATE_REPORT");
  });
});

describe("AT-RPT-005: 日報一覧取得 営業（自分のみ）", () => {
  it("一般営業は自分の日報のみ取得できる", async () => {
    await createReport(seed.yamada.id, seed.aShoji.id, { reportDate: "2026-05-08" });
    await createReport(seed.tanaka.id, seed.aShoji.id, { reportDate: "2026-05-08" });

    const res = await reportsGET(makeListRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(
      body.data.every((r: { salesperson_id: number }) => r.salesperson_id === seed.yamada.id),
    ).toBe(true);
    expect(
      body.data.some((r: { salesperson_id: number }) => r.salesperson_id === seed.tanaka.id),
    ).toBe(false);
  });
});

describe("AT-RPT-006: 日報一覧取得 上長（全員分）", () => {
  it("上長は全員の日報を取得できる", async () => {
    await createReport(seed.yamada.id, seed.aShoji.id, { reportDate: "2026-05-08" });
    await createReport(seed.tanaka.id, seed.aShoji.id, { reportDate: "2026-05-08" });

    vi.mocked(getSession).mockResolvedValue({
      sub: String(seed.suzuki.id),
      email: seed.suzuki.email,
      isManager: true,
    });

    const res = await reportsGET(makeListRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    const ids = body.data.map((r: { salesperson_id: number }) => r.salesperson_id);
    expect(ids).toContain(seed.yamada.id);
    expect(ids).toContain(seed.tanaka.id);
  });
});

describe("AT-RPT-007: 日報一覧取得 期間フィルター", () => {
  it("from/to フィルターで範囲外の日報が除外される", async () => {
    await createReport(seed.yamada.id, seed.aShoji.id, { reportDate: "2026-05-06" });
    await createReport(seed.yamada.id, seed.bSeizo.id, { reportDate: "2026-05-08" });

    const res = await reportsGET(makeListRequest({ from: "2026-05-01", to: "2026-05-07" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    const dates = body.data.map((r: { report_date: string }) => r.report_date);
    expect(dates).toContain("2026-05-06");
    expect(dates).not.toContain("2026-05-08");
  });
});

describe("AT-RPT-008: 他人の日報詳細取得（権限エラー）", () => {
  it("他人の日報を取得しようとすると 403 FORBIDDEN を返す", async () => {
    const tanakaReport = await createReport(seed.tanaka.id, seed.aShoji.id);

    const res = await reportGET(makeDetailRequest(tanakaReport.id), {
      params: Promise.resolve({ id: String(tanakaReport.id) }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });
});

describe("AT-RPT-009: 日報更新 正常系", () => {
  it("本人の下書き日報を更新すると 200 と更新後の日報が返る", async () => {
    const report = await createReport(seed.yamada.id, seed.aShoji.id, { status: "draft" });

    const req = new NextRequest(`http://localhost/api/reports/${report.id}`, {
      method: "PUT",
      body: JSON.stringify({
        report_date: "2026-05-08",
        plan: "更新後の計画",
        status: "draft",
        visit_records: [
          { customer_id: seed.aShoji.id, visit_content: "更新後の訪問内容", sort_order: 1 },
        ],
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await reportPUT(req, {
      params: Promise.resolve({ id: String(report.id) }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plan).toBe("更新後の計画");
    expect(body.visit_records[0].visit_content).toBe("更新後の訪問内容");
  });
});

describe("AT-RPT-010: 提出済み日報の更新（権限エラー）", () => {
  it("提出済み日報を更新しようとすると 403 FORBIDDEN を返す", async () => {
    const report = await createReport(seed.yamada.id, seed.aShoji.id, { status: "submitted" });

    const req = new NextRequest(`http://localhost/api/reports/${report.id}`, {
      method: "PUT",
      body: JSON.stringify({
        report_date: "2026-05-08",
        status: "submitted",
        visit_records: [{ customer_id: seed.aShoji.id, visit_content: "更新試み", sort_order: 1 }],
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await reportPUT(req, {
      params: Promise.resolve({ id: String(report.id) }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });
});

describe("AT-RPT-011: ステータス更新（確認済み）正常系", () => {
  it("上長が提出済み日報を確認済みにすると 200 と status:reviewed が返る", async () => {
    const report = await createReport(seed.yamada.id, seed.aShoji.id, { status: "submitted" });

    vi.mocked(getSession).mockResolvedValue({
      sub: String(seed.suzuki.id),
      email: seed.suzuki.email,
      isManager: true,
    });

    const req = new NextRequest(`http://localhost/api/reports/${report.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "reviewed" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await statusPATCH(req, {
      params: Promise.resolve({ id: String(report.id) }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("reviewed");
  });
});

describe("AT-RPT-012: ステータス更新（営業による操作エラー）", () => {
  it("一般営業がステータス更新を試みると 403 FORBIDDEN を返す", async () => {
    const report = await createReport(seed.yamada.id, seed.aShoji.id, { status: "submitted" });

    const req = new NextRequest(`http://localhost/api/reports/${report.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "reviewed" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await statusPATCH(req, {
      params: Promise.resolve({ id: String(report.id) }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
