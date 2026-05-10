// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/prisma");

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { POST } from "../route";

const mockGetSession = vi.mocked(getSession);
const mockPrisma = vi.mocked(prisma, true);

const salesSession = { sub: "1", email: "yamada@test.com", isManager: false, isAdmin: false };

const fullReport = {
  id: 101,
  salespersonId: 1,
  salesperson: { name: "山田 太郎" },
  reportDate: new Date("2026-05-08T00:00:00.000Z"),
  problem: "課題です",
  plan: "計画です",
  status: "submitted",
  createdAt: new Date("2026-05-08T18:00:00.000Z"),
  updatedAt: new Date("2026-05-08T18:00:00.000Z"),
  visitRecords: [
    {
      id: 201,
      customerId: 10,
      customer: { name: "株式会社A商事" },
      visitContent: "商談実施",
      sortOrder: 1,
    },
  ],
  comments: [],
};

const validBody = {
  report_date: "2026-05-08",
  problem: "課題です",
  plan: "計画です",
  status: "submitted",
  visit_records: [{ customer_id: 10, visit_content: "商談実施", sort_order: 1 }],
};

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/reports", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.dailyReport.findFirst = vi.fn().mockResolvedValue(null);
    mockPrisma.$transaction = vi
      .fn()
      .mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        const mockTx = {
          dailyReport: {
            create: vi.fn().mockResolvedValue({ id: 101 }),
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
    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("正常系: 日報を作成して 201 を返す (AT-RPT-001)", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(101);
    expect(body.visit_records).toHaveLength(1);
  });

  it("下書きステータスで作成できる (AT-RPT-003)", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await POST(makePostRequest({ ...validBody, status: "draft" }));
    expect(res.status).toBe(201);
  });

  it("同日重複は 409 を返す (AT-RPT-004)", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    mockPrisma.dailyReport.findFirst = vi.fn().mockResolvedValue({ id: 99 });
    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("DUPLICATE_REPORT");
  });

  it("visit_records が空のときは 422 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await POST(makePostRequest({ ...validBody, visit_records: [] }));
    expect(res.status).toBe(422);
  });

  it("report_date 未指定は 422 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await POST(
      makePostRequest({
        problem: validBody.problem,
        plan: validBody.plan,
        status: validBody.status,
        visit_records: validBody.visit_records,
      }),
    );
    expect(res.status).toBe(422);
  });

  it("visit_content が 1000 文字超過は 422 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const longContent = "a".repeat(1001);
    const res = await POST(
      makePostRequest({
        ...validBody,
        visit_records: [{ customer_id: 10, visit_content: longContent, sort_order: 1 }],
      }),
    );
    expect(res.status).toBe(422);
  });

  it("problem が 2000 文字超過は 422 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await POST(makePostRequest({ ...validBody, problem: "a".repeat(2001) }));
    expect(res.status).toBe(422);
  });

  it("トランザクションで create が currentUserId で呼ばれる", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    let capturedCreateArgs: unknown;
    mockPrisma.$transaction = vi
      .fn()
      .mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        const mockTx = {
          dailyReport: {
            create: vi.fn().mockImplementation((args: unknown) => {
              capturedCreateArgs = args;
              return Promise.resolve({ id: 101 });
            }),
            findUnique: vi.fn().mockResolvedValue(fullReport),
          },
          visitRecord: { deleteMany: vi.fn() },
        };
        return fn(mockTx as unknown as typeof prisma);
      });
    await POST(makePostRequest(validBody));
    expect((capturedCreateArgs as { data: { salespersonId: number } }).data.salespersonId).toBe(1);
  });
});
