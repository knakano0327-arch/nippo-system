// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/prisma");

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { POST } from "../visit_records/route";
import { DELETE, PUT } from "../visit_records/[id]/route";

const mockGetSession = vi.mocked(getSession);
const mockPrisma = vi.mocked(prisma, true);

const salesSession = { sub: "1", email: "yamada@test.com", isManager: false };
const draftReport = { id: 101, salespersonId: 1, status: "draft" };

const createdRecord = {
  id: 201,
  dailyReportId: 101,
  customerId: 10,
  customer: { name: "株式会社A商事" },
  visitContent: "商談実施",
  sortOrder: 2,
  createdAt: new Date("2026-05-08T18:00:00.000Z"),
};

const validBody = { customer_id: 10, visit_content: "商談実施", sort_order: 2 };

function makeRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    ...(body
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  });
}

// ── POST /api/reports/[report_id]/visit_records ──────────────────────────────

describe("POST /api/reports/[report_id]/visit_records", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.dailyReport.findUnique = vi.fn().mockResolvedValue(draftReport);
    mockPrisma.visitRecord.create = vi.fn().mockResolvedValue(createdRecord);
  });

  afterEach(() => vi.restoreAllMocks());

  async function callPOST(reportId: string, body: unknown) {
    return POST(
      makeRequest("POST", `http://localhost/api/reports/${reportId}/visit_records`, body),
      { params: Promise.resolve({ report_id: reportId }) },
    );
  }

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callPOST("101", validBody);
    expect(res.status).toBe(401);
  });

  it("正常系: 訪問記録を追加して 201 を返す (AT-VST-001)", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callPOST("101", validBody);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(201);
    expect(body.customer_name).toBe("株式会社A商事");
    expect(body.daily_report_id).toBe(101);
  });

  it("存在しない report_id は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    mockPrisma.dailyReport.findUnique = vi.fn().mockResolvedValue(null);
    const res = await callPOST("9999", validBody);
    expect(res.status).toBe(404);
  });

  it("他人の日報は 403 を返す", async () => {
    mockGetSession.mockResolvedValue({ sub: "2", email: "tanaka@test.com", isManager: false });
    const res = await callPOST("101", validBody);
    expect(res.status).toBe(403);
  });

  it("draft 以外の日報は 403 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    mockPrisma.dailyReport.findUnique = vi
      .fn()
      .mockResolvedValue({ ...draftReport, status: "submitted" });
    const res = await callPOST("101", validBody);
    expect(res.status).toBe(403);
  });

  it("customer_id 未指定は 422 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callPOST("101", {
      visit_content: validBody.visit_content,
      sort_order: validBody.sort_order,
    });
    expect(res.status).toBe(422);
  });

  it("visit_content 1000 文字超過は 422 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callPOST("101", { ...validBody, visit_content: "a".repeat(1001) });
    expect(res.status).toBe(422);
  });
});

// ── PUT /api/reports/[report_id]/visit_records/[id] ──────────────────────────

describe("PUT /api/reports/[report_id]/visit_records/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.dailyReport.findUnique = vi.fn().mockResolvedValue(draftReport);
    mockPrisma.visitRecord.findUnique = vi.fn().mockResolvedValue({ ...createdRecord, id: 201 });
    mockPrisma.visitRecord.update = vi.fn().mockResolvedValue(createdRecord);
  });

  afterEach(() => vi.restoreAllMocks());

  async function callPUT(reportId: string, id: string, body: unknown) {
    return PUT(
      makeRequest("PUT", `http://localhost/api/reports/${reportId}/visit_records/${id}`, body),
      { params: Promise.resolve({ report_id: reportId, id }) },
    );
  }

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callPUT("101", "201", validBody);
    expect(res.status).toBe(401);
  });

  it("正常系: 訪問記録を更新して 200 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callPUT("101", "201", validBody);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(201);
    expect(body.customer_name).toBe("株式会社A商事");
  });

  it("存在しない report_id は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    mockPrisma.dailyReport.findUnique = vi.fn().mockResolvedValue(null);
    const res = await callPUT("9999", "201", validBody);
    expect(res.status).toBe(404);
  });

  it("他人の日報は 403 を返す", async () => {
    mockGetSession.mockResolvedValue({ sub: "2", email: "tanaka@test.com", isManager: false });
    const res = await callPUT("101", "201", validBody);
    expect(res.status).toBe(403);
  });

  it("別日報に属する訪問記録は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    mockPrisma.visitRecord.findUnique = vi
      .fn()
      .mockResolvedValue({ ...createdRecord, dailyReportId: 999 });
    const res = await callPUT("101", "201", validBody);
    expect(res.status).toBe(404);
  });

  it("バリデーションエラーは 422 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callPUT("101", "201", { ...validBody, visit_content: "" });
    expect(res.status).toBe(422);
  });
});

// ── DELETE /api/reports/[report_id]/visit_records/[id] ───────────────────────

describe("DELETE /api/reports/[report_id]/visit_records/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.dailyReport.findUnique = vi.fn().mockResolvedValue(draftReport);
    mockPrisma.visitRecord.count = vi.fn().mockResolvedValue(2);
    mockPrisma.visitRecord.findUnique = vi.fn().mockResolvedValue({ ...createdRecord, id: 201 });
    mockPrisma.visitRecord.delete = vi.fn().mockResolvedValue({});
  });

  afterEach(() => vi.restoreAllMocks());

  async function callDELETE(reportId: string, id: string) {
    return DELETE(
      makeRequest("DELETE", `http://localhost/api/reports/${reportId}/visit_records/${id}`),
      { params: Promise.resolve({ report_id: reportId, id }) },
    );
  }

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callDELETE("101", "201");
    expect(res.status).toBe(401);
  });

  it("正常系: 訪問記録を削除して 204 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callDELETE("101", "201");
    expect(res.status).toBe(204);
  });

  it("最後の1件の削除は 400 LAST_RECORD を返す (AT-VST-002)", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    mockPrisma.visitRecord.count = vi.fn().mockResolvedValue(1);
    const res = await callDELETE("101", "201");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("LAST_RECORD");
  });

  it("存在しない report_id は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    mockPrisma.dailyReport.findUnique = vi.fn().mockResolvedValue(null);
    const res = await callDELETE("9999", "201");
    expect(res.status).toBe(404);
  });

  it("他人の日報は 403 を返す", async () => {
    mockGetSession.mockResolvedValue({ sub: "2", email: "tanaka@test.com", isManager: false });
    const res = await callDELETE("101", "201");
    expect(res.status).toBe(403);
  });

  it("別日報に属する訪問記録は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    mockPrisma.visitRecord.findUnique = vi
      .fn()
      .mockResolvedValue({ ...createdRecord, dailyReportId: 999 });
    const res = await callDELETE("101", "201");
    expect(res.status).toBe(404);
  });

  it("draft 以外の日報は 403 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    mockPrisma.dailyReport.findUnique = vi
      .fn()
      .mockResolvedValue({ ...draftReport, status: "submitted" });
    const res = await callDELETE("101", "201");
    expect(res.status).toBe(403);
  });
});
