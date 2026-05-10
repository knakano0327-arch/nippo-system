// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/prisma");

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PUT } from "../[id]/route";

const mockGetSession = vi.mocked(getSession);
const mockPrisma = vi.mocked(prisma, true);

const salesSession = { sub: "1", email: "yamada@test.com", isManager: false, isAdmin: false };

const draftReport = {
  id: 101,
  salespersonId: 1,
  status: "draft",
};

const fullReport = {
  id: 101,
  salespersonId: 1,
  salesperson: { name: "山田 太郎" },
  reportDate: new Date("2026-05-08T00:00:00.000Z"),
  problem: "更新後の課題",
  plan: "更新後の計画",
  status: "submitted",
  createdAt: new Date("2026-05-08T18:00:00.000Z"),
  updatedAt: new Date("2026-05-08T19:00:00.000Z"),
  visitRecords: [
    {
      id: 202,
      customerId: 11,
      customer: { name: "株式会社B製造" },
      visitContent: "更新内容",
      sortOrder: 1,
    },
  ],
  comments: [],
};

const validBody = {
  report_date: "2026-05-08",
  problem: "更新後の課題",
  plan: "更新後の計画",
  status: "submitted",
  visit_records: [{ customer_id: 11, visit_content: "更新内容", sort_order: 1 }],
};

function makePutRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/reports/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function callPUT(id: string, body: unknown) {
  return PUT(makePutRequest(id, body), { params: Promise.resolve({ id }) });
}

describe("PUT /api/reports/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.dailyReport.findUnique = vi.fn().mockResolvedValue(draftReport);
    mockPrisma.$transaction = vi
      .fn()
      .mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        const mockTx = {
          dailyReport: {
            update: vi.fn().mockResolvedValue({}),
            findUnique: vi.fn().mockResolvedValue(fullReport),
          },
          visitRecord: { deleteMany: vi.fn() },
        };
        return fn(mockTx as unknown as typeof prisma);
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callPUT("101", validBody);
    expect(res.status).toBe(401);
  });

  it("正常系: 下書き日報を更新して 200 を返す (AT-RPT-009)", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callPUT("101", validBody);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(101);
    expect(body.visit_records).toHaveLength(1);
  });

  it("存在しない ID は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    mockPrisma.dailyReport.findUnique = vi.fn().mockResolvedValue(null);
    const res = await callPUT("9999", validBody);
    expect(res.status).toBe(404);
  });

  it("他人の日報は 403 を返す", async () => {
    mockGetSession.mockResolvedValue({
      sub: "2",
      email: "tanaka@test.com",
      isManager: false,
      isAdmin: false,
    });
    const res = await callPUT("101", validBody);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("提出済み日報の更新は 403 を返す (AT-RPT-010)", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    mockPrisma.dailyReport.findUnique = vi
      .fn()
      .mockResolvedValue({ ...draftReport, status: "submitted" });
    const res = await callPUT("101", validBody);
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("FORBIDDEN");
  });

  it("確認済み日報の更新は 403 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    mockPrisma.dailyReport.findUnique = vi
      .fn()
      .mockResolvedValue({ ...draftReport, status: "reviewed" });
    const res = await callPUT("101", validBody);
    expect(res.status).toBe(403);
  });

  it("不正 ID（非数値）は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callPUT("abc", validBody);
    expect(res.status).toBe(404);
  });

  it("バリデーションエラーは 422 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callPUT("101", { ...validBody, visit_records: [] });
    expect(res.status).toBe(422);
  });

  it("トランザクション内で visitRecord.deleteMany が呼ばれる", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    let deleteManyCalledWith: unknown;
    mockPrisma.$transaction = vi
      .fn()
      .mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        const mockTx = {
          dailyReport: {
            update: vi.fn().mockResolvedValue({}),
            findUnique: vi.fn().mockResolvedValue(fullReport),
          },
          visitRecord: {
            deleteMany: vi.fn().mockImplementation((args: unknown) => {
              deleteManyCalledWith = args;
              return Promise.resolve({});
            }),
          },
        };
        return fn(mockTx as unknown as typeof prisma);
      });
    await callPUT("101", validBody);
    expect((deleteManyCalledWith as { where: { dailyReportId: number } }).where.dailyReportId).toBe(
      101,
    );
  });
});
