// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/prisma");

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { POST } from "../comments/route";
import { DELETE, PUT } from "../comments/[id]/route";

const mockGetSession = vi.mocked(getSession);
const mockPrisma = vi.mocked(prisma, true);

const managerSession = { sub: "5", email: "suzuki@test.com", isManager: true, isAdmin: false };
const salesSession = { sub: "1", email: "yamada@test.com", isManager: false, isAdmin: false };

const existingReport = { id: 101, salespersonId: 1, status: "submitted" };

const createdComment = {
  id: 301,
  dailyReportId: 101,
  commenterId: 5,
  commenter: { name: "鈴木 部長" },
  targetType: "problem",
  content: "対応策を検討してください。",
  createdAt: new Date("2026-05-08T20:00:00.000Z"),
  updatedAt: new Date("2026-05-08T20:00:00.000Z"),
};

const validPostBody = { target_type: "problem", content: "対応策を検討してください。" };
const validPutBody = { content: "修正後のコメント内容" };

function makeRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    ...(body
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  });
}

// ── POST /api/reports/[report_id]/comments ────────────────────────────────────

describe("POST /api/reports/[report_id]/comments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.dailyReport.findUnique = vi.fn().mockResolvedValue(existingReport);
    mockPrisma.comment.create = vi.fn().mockResolvedValue(createdComment);
  });

  afterEach(() => vi.restoreAllMocks());

  async function callPOST(reportId: string, body: unknown) {
    return POST(makeRequest("POST", `http://localhost/api/reports/${reportId}/comments`, body), {
      params: Promise.resolve({ report_id: reportId }),
    });
  }

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callPOST("101", validPostBody);
    expect(res.status).toBe(401);
  });

  it("一般営業は 403 を返す (AT-CMT-002)", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callPOST("101", validPostBody);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("上長がコメントを投稿して 201 を返す (AT-CMT-001)", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPOST("101", validPostBody);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(301);
    expect(body.commenter_name).toBe("鈴木 部長");
    expect(body.target_type).toBe("problem");
    expect(body.daily_report_id).toBe(101);
  });

  it("target_type が plan でも投稿できる", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    mockPrisma.comment.create = vi
      .fn()
      .mockResolvedValue({ ...createdComment, targetType: "plan" });
    const res = await callPOST("101", { ...validPostBody, target_type: "plan" });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.target_type).toBe("plan");
  });

  it("存在しない report_id は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    mockPrisma.dailyReport.findUnique = vi.fn().mockResolvedValue(null);
    const res = await callPOST("9999", validPostBody);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("target_type が不正な値は 422 を返す (UT-CMT-003)", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPOST("101", { ...validPostBody, target_type: "invalid" });
    expect(res.status).toBe(422);
  });

  it("content が空は 422 を返す (UT-CMT-001)", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPOST("101", { ...validPostBody, content: "" });
    expect(res.status).toBe(422);
  });

  it("content が 1000 文字超過は 422 を返す (UT-CMT-002)", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPOST("101", { ...validPostBody, content: "a".repeat(1001) });
    expect(res.status).toBe(422);
  });

  it("create が commenterId = 5（上長）で呼ばれる", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    await callPOST("101", validPostBody);
    expect(mockPrisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ commenterId: 5 }) }),
    );
  });
});

// ── PUT /api/reports/[report_id]/comments/[id] ────────────────────────────────

describe("PUT /api/reports/[report_id]/comments/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.dailyReport.findUnique = vi.fn().mockResolvedValue(existingReport);
    mockPrisma.comment.findUnique = vi
      .fn()
      .mockResolvedValue({ ...createdComment, commenterId: 5 });
    mockPrisma.comment.update = vi.fn().mockResolvedValue({
      ...createdComment,
      content: validPutBody.content,
    });
  });

  afterEach(() => vi.restoreAllMocks());

  async function callPUT(reportId: string, id: string, body: unknown) {
    return PUT(
      makeRequest("PUT", `http://localhost/api/reports/${reportId}/comments/${id}`, body),
      { params: Promise.resolve({ report_id: reportId, id }) },
    );
  }

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callPUT("101", "301", validPutBody);
    expect(res.status).toBe(401);
  });

  it("投稿者本人が更新して 200 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPUT("101", "301", validPutBody);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(301);
    expect(body.content).toBe(validPutBody.content);
  });

  it("他人のコメントは 403 を返す", async () => {
    mockGetSession.mockResolvedValue({
      sub: "9",
      email: "other@test.com",
      isManager: true,
      isAdmin: false,
    });
    const res = await callPUT("101", "301", validPutBody);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("存在しない report_id は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    mockPrisma.dailyReport.findUnique = vi.fn().mockResolvedValue(null);
    const res = await callPUT("9999", "301", validPutBody);
    expect(res.status).toBe(404);
  });

  it("別日報に属するコメントは 404 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    mockPrisma.comment.findUnique = vi
      .fn()
      .mockResolvedValue({ ...createdComment, dailyReportId: 999 });
    const res = await callPUT("101", "301", validPutBody);
    expect(res.status).toBe(404);
  });

  it("content が空は 422 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPUT("101", "301", { content: "" });
    expect(res.status).toBe(422);
  });

  it("content が 1000 文字超過は 422 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPUT("101", "301", { content: "a".repeat(1001) });
    expect(res.status).toBe(422);
  });
});

// ── DELETE /api/reports/[report_id]/comments/[id] ─────────────────────────────

describe("DELETE /api/reports/[report_id]/comments/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.dailyReport.findUnique = vi.fn().mockResolvedValue(existingReport);
    mockPrisma.comment.findUnique = vi
      .fn()
      .mockResolvedValue({ ...createdComment, commenterId: 5 });
    mockPrisma.comment.delete = vi.fn().mockResolvedValue({});
  });

  afterEach(() => vi.restoreAllMocks());

  async function callDELETE(reportId: string, id: string) {
    return DELETE(
      makeRequest("DELETE", `http://localhost/api/reports/${reportId}/comments/${id}`),
      { params: Promise.resolve({ report_id: reportId, id }) },
    );
  }

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callDELETE("101", "301");
    expect(res.status).toBe(401);
  });

  it("投稿者本人が削除して 204 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callDELETE("101", "301");
    expect(res.status).toBe(204);
  });

  it("他人のコメントは 403 を返す", async () => {
    mockGetSession.mockResolvedValue({
      sub: "9",
      email: "other@test.com",
      isManager: true,
      isAdmin: false,
    });
    const res = await callDELETE("101", "301");
    expect(res.status).toBe(403);
  });

  it("存在しない report_id は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    mockPrisma.dailyReport.findUnique = vi.fn().mockResolvedValue(null);
    const res = await callDELETE("9999", "301");
    expect(res.status).toBe(404);
  });

  it("別日報に属するコメントは 404 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    mockPrisma.comment.findUnique = vi
      .fn()
      .mockResolvedValue({ ...createdComment, dailyReportId: 999 });
    const res = await callDELETE("101", "301");
    expect(res.status).toBe(404);
  });

  it("delete が正しい ID で呼ばれる", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    await callDELETE("101", "301");
    expect(mockPrisma.comment.delete).toHaveBeenCalledWith({ where: { id: 301 } });
  });
});
