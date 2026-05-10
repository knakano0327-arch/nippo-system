// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/prisma");

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { DELETE } from "../[id]/route";

const mockGetSession = vi.mocked(getSession);
const mockPrisma = vi.mocked(prisma, true);

const salesSession = { sub: "1", email: "yamada@test.com", isManager: false, isAdmin: false };

const draftReport = { id: 101, salespersonId: 1, status: "draft" };

function makeDeleteRequest(id: string) {
  return new NextRequest(`http://localhost/api/reports/${id}`, { method: "DELETE" });
}

async function callDELETE(id: string) {
  return DELETE(makeDeleteRequest(id), { params: Promise.resolve({ id }) });
}

describe("DELETE /api/reports/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.dailyReport.findUnique = vi.fn().mockResolvedValue(draftReport);
    mockPrisma.dailyReport.delete = vi.fn().mockResolvedValue(draftReport);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callDELETE("101");
    expect(res.status).toBe(401);
  });

  it("本人が draft 日報を削除すると 204 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callDELETE("101");
    expect(res.status).toBe(204);
  });

  it("存在しない ID は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    mockPrisma.dailyReport.findUnique = vi.fn().mockResolvedValue(null);
    const res = await callDELETE("9999");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("他人の日報は 403 を返す", async () => {
    mockGetSession.mockResolvedValue({
      sub: "2",
      email: "tanaka@test.com",
      isManager: false,
      isAdmin: false,
    });
    const res = await callDELETE("101");
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("提出済み日報の削除は 403 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    mockPrisma.dailyReport.findUnique = vi
      .fn()
      .mockResolvedValue({ ...draftReport, status: "submitted" });
    const res = await callDELETE("101");
    expect(res.status).toBe(403);
  });

  it("確認済み日報の削除は 403 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    mockPrisma.dailyReport.findUnique = vi
      .fn()
      .mockResolvedValue({ ...draftReport, status: "reviewed" });
    const res = await callDELETE("101");
    expect(res.status).toBe(403);
  });

  it("不正な ID（非数値）は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callDELETE("abc");
    expect(res.status).toBe(404);
  });

  it("delete が正しい ID で呼ばれる", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    await callDELETE("101");
    expect(mockPrisma.dailyReport.delete).toHaveBeenCalledWith({ where: { id: 101 } });
  });
});
