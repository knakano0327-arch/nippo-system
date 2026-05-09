// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/prisma");

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PATCH } from "../[id]/status/route";

const mockGetSession = vi.mocked(getSession);
const mockPrisma = vi.mocked(prisma, true);

const managerSession = { sub: "5", email: "suzuki@test.com", isManager: true };
const salesSession = { sub: "1", email: "yamada@test.com", isManager: false };

const submittedReport = { id: 101, salespersonId: 1, status: "submitted" };
const updatedReport = {
  id: 101,
  status: "reviewed",
  updatedAt: new Date("2026-05-08T21:00:00.000Z"),
};

function makePatchRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/reports/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function callPATCH(id: string, body: unknown) {
  return PATCH(makePatchRequest(id, body), { params: Promise.resolve({ id }) });
}

describe("PATCH /api/reports/[id]/status", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.dailyReport.findUnique = vi.fn().mockResolvedValue(submittedReport);
    mockPrisma.dailyReport.update = vi.fn().mockResolvedValue(updatedReport);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callPATCH("101", { status: "reviewed" });
    expect(res.status).toBe(401);
  });

  it("一般営業は 403 を返す (AT-RPT-012)", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callPATCH("101", { status: "reviewed" });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("上長は正常にステータスを reviewed に更新できる (AT-RPT-011)", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPATCH("101", { status: "reviewed" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(101);
    expect(body.status).toBe("reviewed");
    expect(body.updated_at).toBe("2026-05-08T21:00:00.000Z");
  });

  it("存在しない ID は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    mockPrisma.dailyReport.findUnique = vi.fn().mockResolvedValue(null);
    const res = await callPATCH("9999", { status: "reviewed" });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("不正な ID（非数値）は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPATCH("abc", { status: "reviewed" });
    expect(res.status).toBe(404);
  });

  it("status が reviewed 以外（draft）は 422 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPATCH("101", { status: "draft" });
    expect(res.status).toBe(422);
  });

  it("status が reviewed 以外（submitted）は 422 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPATCH("101", { status: "submitted" });
    expect(res.status).toBe(422);
  });

  it("update が正しい引数で呼ばれる", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    await callPATCH("101", { status: "reviewed" });
    expect(mockPrisma.dailyReport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 101 },
        data: { status: "reviewed" },
      }),
    );
  });
});
