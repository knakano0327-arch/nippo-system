// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/prisma");

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { GET } from "../[id]/route";

const mockGetSession = vi.mocked(getSession);
const mockPrisma = vi.mocked(prisma, true);

const salesSession = { sub: "1", email: "yamada@test.com", isManager: false };
const managerSession = { sub: "5", email: "suzuki@test.com", isManager: true };

const makeFullReport = (overrides = {}) => ({
  id: 101,
  salespersonId: 1,
  salesperson: { name: "山田 太郎" },
  reportDate: new Date("2026-05-08T00:00:00.000Z"),
  problem: "A社の課題",
  plan: "B社訪問",
  status: "submitted",
  createdAt: new Date("2026-05-08T18:00:00.000Z"),
  updatedAt: new Date("2026-05-08T18:30:00.000Z"),
  visitRecords: [
    {
      id: 201,
      customerId: 10,
      customer: { name: "株式会社A商事" },
      visitContent: "商談実施",
      sortOrder: 1,
    },
  ],
  comments: [
    {
      id: 301,
      commenterId: 5,
      commenter: { name: "鈴木 部長" },
      targetType: "problem",
      content: "対応策を検討してください。",
      createdAt: new Date("2026-05-08T20:00:00.000Z"),
      updatedAt: new Date("2026-05-08T20:00:00.000Z"),
    },
  ],
  ...overrides,
});

function makeRequest(id: string) {
  return new NextRequest(`http://localhost/api/reports/${id}`);
}

async function callGET(id: string) {
  return GET(makeRequest(id), { params: Promise.resolve({ id }) });
}

describe("GET /api/reports/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.dailyReport.findUnique = vi.fn().mockResolvedValue(makeFullReport());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callGET("101");
    expect(res.status).toBe(401);
  });

  it("本人は自分の日報を取得できる", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callGET("101");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(101);
    expect(body.salesperson_id).toBe(1);
    expect(body.visit_records).toHaveLength(1);
    expect(body.comments).toHaveLength(1);
  });

  it("他人の日報は 403 を返す (AT-RPT-008)", async () => {
    mockGetSession.mockResolvedValue({ sub: "2", email: "tanaka@test.com", isManager: false });
    const res = await callGET("101");
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("上長は他人の日報も取得できる", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callGET("101");
    expect(res.status).toBe(200);
  });

  it("存在しない ID は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    mockPrisma.dailyReport.findUnique = vi.fn().mockResolvedValue(null);
    const res = await callGET("9999");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("不正な ID（非数値）は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callGET("abc");
    expect(res.status).toBe(404);
  });

  it("visit_records が sort_order 順で返る", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callGET("101");
    const body = await res.json();
    expect(body.visit_records[0].sort_order).toBe(1);
    expect(body.visit_records[0].customer_name).toBe("株式会社A商事");
  });

  it("comments に commenter_name と target_type が含まれる", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callGET("101");
    const body = await res.json();
    expect(body.comments[0].commenter_name).toBe("鈴木 部長");
    expect(body.comments[0].target_type).toBe("problem");
  });
});
