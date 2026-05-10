// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/prisma");

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { GET as LIST, POST } from "../route";
import { DELETE, GET as DETAIL, PUT } from "../[id]/route";

const mockGetSession = vi.mocked(getSession);
const mockPrisma = vi.mocked(prisma, true);

const managerSession = { sub: "5", email: "admin@test.com", isManager: false, isAdmin: true };
const salesSession = { sub: "1", email: "yamada@test.com", isManager: false, isAdmin: false };

const existingCustomer = {
  id: 10,
  name: "株式会社A商事",
  address: "東京都千代田区1-1-1",
  phone: "03-1234-5678",
  industry: "商社",
  createdAt: new Date("2026-01-10T09:00:00.000Z"),
  updatedAt: new Date("2026-01-10T09:00:00.000Z"),
  deletedAt: null,
};

const validBody = {
  name: "株式会社テスト",
  address: "大阪府大阪市1-1-1",
  phone: "06-9876-5432",
  industry: "製造業",
};

function makeRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    ...(body
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  });
}

// ── GET /api/customers ────────────────────────────────────────────────────────

describe("GET /api/customers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.customer.count = vi.fn().mockResolvedValue(1);
    mockPrisma.customer.findMany = vi.fn().mockResolvedValue([existingCustomer]);
  });

  afterEach(() => vi.restoreAllMocks());

  async function callGET(query = "") {
    return LIST(makeRequest("GET", `http://localhost/api/customers${query}`));
  }

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callGET();
    expect(res.status).toBe(401);
  });

  it("一覧を返す (AT-CST-003 相当)", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("株式会社A商事");
    expect(body.pagination).toBeDefined();
  });

  it("name フィルターで contains 検索が呼ばれる (AT-CST-003)", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    await callGET("?name=A商事");
    expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ name: { contains: "A商事" } }),
      }),
    );
  });

  it("industry フィルターで絞り込める", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    await callGET("?industry=商社");
    expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ industry: "商社" }),
      }),
    );
  });

  it("ページネーションパラメーターが反映される", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    await callGET("?page=2&per_page=10");
    expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
  });

  it("deletedAt: null フィルターが含まれる", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    await callGET();
    expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });
});

// ── POST /api/customers ───────────────────────────────────────────────────────

describe("POST /api/customers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.customer.create = vi.fn().mockResolvedValue({ ...existingCustomer, ...validBody });
  });

  afterEach(() => vi.restoreAllMocks());

  async function callPOST(body: unknown) {
    return POST(makeRequest("POST", "http://localhost/api/customers", body));
  }

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callPOST(validBody);
    expect(res.status).toBe(401);
  });

  it("一般営業は 403 を返す (AT-CST-002)", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callPOST(validBody);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("管理者が顧客を登録して 201 を返す (AT-CST-001)", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPOST(validBody);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe(validBody.name);
    expect(body.created_at).toBeDefined();
  });

  it("name が空は 422 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPOST({ ...validBody, name: "" });
    expect(res.status).toBe(422);
  });

  it("name が 100 文字超過は 422 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPOST({ ...validBody, name: "a".repeat(101) });
    expect(res.status).toBe(422);
  });

  it("phone の形式が不正は 422 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPOST({ ...validBody, phone: "invalid-phone!" });
    expect(res.status).toBe(422);
  });

  it("address が 255 文字超過は 422 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPOST({ ...validBody, address: "a".repeat(256) });
    expect(res.status).toBe(422);
  });
});

// ── GET /api/customers/[id] ───────────────────────────────────────────────────

describe("GET /api/customers/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.customer.findFirst = vi.fn().mockResolvedValue(existingCustomer);
  });

  afterEach(() => vi.restoreAllMocks());

  async function callGET(id: string) {
    return DETAIL(makeRequest("GET", `http://localhost/api/customers/${id}`), {
      params: Promise.resolve({ id }),
    });
  }

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callGET("10");
    expect(res.status).toBe(401);
  });

  it("顧客詳細を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callGET("10");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(10);
    expect(body.name).toBe("株式会社A商事");
  });

  it("存在しない ID は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    mockPrisma.customer.findFirst = vi.fn().mockResolvedValue(null);
    const res = await callGET("9999");
    expect(res.status).toBe(404);
  });
});

// ── PUT /api/customers/[id] ───────────────────────────────────────────────────

describe("PUT /api/customers/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.customer.findFirst = vi.fn().mockResolvedValue(existingCustomer);
    mockPrisma.customer.update = vi
      .fn()
      .mockResolvedValue({ ...existingCustomer, name: validBody.name });
  });

  afterEach(() => vi.restoreAllMocks());

  async function callPUT(id: string, body: unknown) {
    return PUT(makeRequest("PUT", `http://localhost/api/customers/${id}`, body), {
      params: Promise.resolve({ id }),
    });
  }

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callPUT("10", validBody);
    expect(res.status).toBe(401);
  });

  it("一般営業は 403 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callPUT("10", validBody);
    expect(res.status).toBe(403);
  });

  it("管理者が顧客を更新して 200 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPUT("10", validBody);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe(validBody.name);
  });

  it("存在しない顧客は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    mockPrisma.customer.findFirst = vi.fn().mockResolvedValue(null);
    const res = await callPUT("9999", validBody);
    expect(res.status).toBe(404);
  });

  it("バリデーションエラーは 422 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPUT("10", { ...validBody, name: "" });
    expect(res.status).toBe(422);
  });
});

// ── DELETE /api/customers/[id] ────────────────────────────────────────────────

describe("DELETE /api/customers/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.customer.findFirst = vi.fn().mockResolvedValue(existingCustomer);
    mockPrisma.customer.update = vi.fn().mockResolvedValue({});
  });

  afterEach(() => vi.restoreAllMocks());

  async function callDELETE(id: string) {
    return DELETE(makeRequest("DELETE", `http://localhost/api/customers/${id}`), {
      params: Promise.resolve({ id }),
    });
  }

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callDELETE("10");
    expect(res.status).toBe(401);
  });

  it("一般営業は 403 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callDELETE("10");
    expect(res.status).toBe(403);
  });

  it("管理者が論理削除して 204 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callDELETE("10");
    expect(res.status).toBe(204);
  });

  it("論理削除で deletedAt が設定される", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    await callDELETE("10");
    expect(mockPrisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });

  it("存在しない顧客は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    mockPrisma.customer.findFirst = vi.fn().mockResolvedValue(null);
    const res = await callDELETE("9999");
    expect(res.status).toBe(404);
  });
});
