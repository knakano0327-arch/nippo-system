// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/prisma");

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { GET } from "../route";

const mockGetSession = vi.mocked(getSession);
const mockPrisma = vi.mocked(prisma, true);

const managerSession = { sub: "5", email: "suzuki@test.com", isManager: true, isAdmin: false };
const salesSession = { sub: "1", email: "yamada@test.com", isManager: false, isAdmin: false };

const makeReport = (overrides = {}) => ({
  id: 101,
  salespersonId: 1,
  salesperson: { name: "山田 太郎" },
  reportDate: new Date("2026-05-08T00:00:00.000Z"),
  status: "submitted",
  createdAt: new Date("2026-05-08T18:00:00.000Z"),
  updatedAt: new Date("2026-05-08T18:30:00.000Z"),
  _count: { visitRecords: 3, comments: 1 },
  ...overrides,
});

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/reports");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

describe("GET /api/reports", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.dailyReport.count = vi.fn().mockResolvedValue(1);
    mockPrisma.dailyReport.findMany = vi.fn().mockResolvedValue([makeReport()]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("一般営業は自分の salesperson_id で絞り込まれる (AT-RPT-005)", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    await GET(makeRequest());
    expect(mockPrisma.dailyReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ salespersonId: 1 }),
      }),
    );
  });

  it("上長は全件取得（where に salespersonId なし） (AT-RPT-006)", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const tanaka = makeReport({ id: 102, salespersonId: 2, salesperson: { name: "田中 次郎" } });
    mockPrisma.dailyReport.count = vi.fn().mockResolvedValue(2);
    mockPrisma.dailyReport.findMany = vi.fn().mockResolvedValue([makeReport(), tanaka]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    // where に salespersonId が含まれないこと
    const callArg = (mockPrisma.dailyReport.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArg.where?.salespersonId).toBeUndefined();
  });

  it("上長は salesperson_id フィルターを指定できる", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    await GET(makeRequest({ salesperson_id: "2" }));
    expect(mockPrisma.dailyReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ salespersonId: 2 }),
      }),
    );
  });

  it("期間フィルター from/to が where.reportDate に反映される (AT-RPT-007)", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    await GET(makeRequest({ from: "2026-05-01", to: "2026-05-07" }));
    const callArg = (mockPrisma.dailyReport.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArg.where.reportDate.gte).toEqual(new Date("2026-05-01"));
    expect(callArg.where.reportDate.lte).toBeDefined();
  });

  it("レスポンスに visit_count と has_comment が含まれる", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.data[0].visit_count).toBe(3);
    expect(body.data[0].has_comment).toBe(true);
  });

  it("コメント 0 件のとき has_comment が false", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    mockPrisma.dailyReport.findMany = vi
      .fn()
      .mockResolvedValue([makeReport({ _count: { visitRecords: 1, comments: 0 } })]);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.data[0].has_comment).toBe(false);
  });

  it("ページネーション情報が含まれる", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    mockPrisma.dailyReport.count = vi.fn().mockResolvedValue(45);
    const res = await GET(makeRequest({ page: "2", per_page: "20" }));
    const body = await res.json();
    expect(body.pagination).toEqual({ total: 45, page: 2, per_page: 20, total_pages: 3 });
  });

  it("デフォルトソートが reportDate desc", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    await GET(makeRequest());
    expect(mockPrisma.dailyReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { reportDate: "desc" } }),
    );
  });
});
