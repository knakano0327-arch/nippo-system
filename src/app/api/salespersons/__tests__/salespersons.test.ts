// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/prisma");
vi.mock("@/lib/auth/password");

import { getSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { GET as LIST, POST } from "../route";
import { DELETE, GET as DETAIL, PUT } from "../[id]/route";

const mockGetSession = vi.mocked(getSession);
const mockPrisma = vi.mocked(prisma, true);
const mockHashPassword = vi.mocked(hashPassword);

const managerSession = { sub: "5", email: "admin@test.com", isManager: true };
const salesSession = { sub: "1", email: "yamada@test.com", isManager: false };

const existingSalesperson = {
  id: 1,
  name: "山田 太郎",
  email: "yamada@test.com",
  passwordHash: "$2b$12$hashedpassword",
  department: "東京営業部",
  isManager: false,
  createdAt: new Date("2026-01-05T09:00:00.000Z"),
  updatedAt: new Date("2026-01-05T09:00:00.000Z"),
  deletedAt: null,
};

const validCreateBody = {
  name: "佐藤 花子",
  email: "sato@test.com",
  password: "password123",
  department: "大阪営業部",
  is_manager: false,
};

const validUpdateBody = {
  name: "佐藤 花子",
  email: "sato@test.com",
  department: "大阪営業部",
  is_manager: false,
};

function makeRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    ...(body
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  });
}

// ── GET /api/salespersons ─────────────────────────────────────────────────────

describe("GET /api/salespersons", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.salesperson.count = vi.fn().mockResolvedValue(1);
    mockPrisma.salesperson.findMany = vi.fn().mockResolvedValue([existingSalesperson]);
  });

  afterEach(() => vi.restoreAllMocks());

  async function callGET(query = "") {
    return LIST(makeRequest("GET", `http://localhost/api/salespersons${query}`));
  }

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callGET();
    expect(res.status).toBe(401);
  });

  it("一般営業は 403 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callGET();
    expect(res.status).toBe(403);
  });

  it("管理者は一覧を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("山田 太郎");
    expect(body.pagination).toBeDefined();
  });

  it("レスポンスにパスワードハッシュが含まれない", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callGET();
    const body = await res.json();
    expect(body.data[0].password_hash).toBeUndefined();
    expect(body.data[0].passwordHash).toBeUndefined();
  });

  it("department フィルターで contains 検索が呼ばれる", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    await callGET("?department=東京");
    expect(mockPrisma.salesperson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ department: { contains: "東京" } }),
      }),
    );
  });

  it("is_manager フィルターが反映される", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    await callGET("?is_manager=true");
    expect(mockPrisma.salesperson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isManager: true }),
      }),
    );
  });

  it("deletedAt: null フィルターが含まれる", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    await callGET();
    expect(mockPrisma.salesperson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });
});

// ── POST /api/salespersons ────────────────────────────────────────────────────

describe("POST /api/salespersons", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.salesperson.findFirst = vi.fn().mockResolvedValue(null);
    mockPrisma.salesperson.create = vi
      .fn()
      .mockResolvedValue({ ...existingSalesperson, ...validCreateBody, id: 2 });
    mockHashPassword.mockResolvedValue("$2b$12$newhash");
  });

  afterEach(() => vi.restoreAllMocks());

  async function callPOST(body: unknown) {
    return POST(makeRequest("POST", "http://localhost/api/salespersons", body));
  }

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callPOST(validCreateBody);
    expect(res.status).toBe(401);
  });

  it("一般営業は 403 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callPOST(validCreateBody);
    expect(res.status).toBe(403);
  });

  it("管理者が営業を登録して 201 を返す (UT-SLP 相当)", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPOST(validCreateBody);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe(validCreateBody.name);
    expect(body.created_at).toBeDefined();
  });

  it("レスポンスにパスワードハッシュが含まれない", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPOST(validCreateBody);
    const body = await res.json();
    expect(body.password_hash).toBeUndefined();
    expect(body.passwordHash).toBeUndefined();
  });

  it("パスワードがハッシュ化されて保存される", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    await callPOST(validCreateBody);
    expect(mockHashPassword).toHaveBeenCalledWith(validCreateBody.password);
    expect(mockPrisma.salesperson.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ passwordHash: "$2b$12$newhash" }),
      }),
    );
  });

  it("メール重複は 409 DUPLICATE_EMAIL を返す (UT-SLP-002 相当)", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    mockPrisma.salesperson.findFirst = vi.fn().mockResolvedValue(existingSalesperson);
    const res = await callPOST(validCreateBody);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("DUPLICATE_EMAIL");
  });

  it("name が空は 422 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPOST({ ...validCreateBody, name: "" });
    expect(res.status).toBe(422);
  });

  it("email 形式が不正は 422 を返す (UT-SLP-001)", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPOST({ ...validCreateBody, email: "not-an-email" });
    expect(res.status).toBe(422);
  });

  it("password が 7 文字は 422 を返す (UT-SLP-003)", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPOST({ ...validCreateBody, password: "abc1234" });
    expect(res.status).toBe(422);
  });

  it("password が 8 文字は 422 を返さない", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPOST({ ...validCreateBody, password: "abc12345" });
    expect(res.status).toBe(201);
  });
});

// ── GET /api/salespersons/[id] ────────────────────────────────────────────────

describe("GET /api/salespersons/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.salesperson.findFirst = vi.fn().mockResolvedValue(existingSalesperson);
  });

  afterEach(() => vi.restoreAllMocks());

  async function callGET(id: string) {
    return DETAIL(makeRequest("GET", `http://localhost/api/salespersons/${id}`), {
      params: Promise.resolve({ id }),
    });
  }

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callGET("1");
    expect(res.status).toBe(401);
  });

  it("一般営業は 403 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callGET("1");
    expect(res.status).toBe(403);
  });

  it("営業詳細を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callGET("1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(1);
    expect(body.name).toBe("山田 太郎");
  });

  it("存在しない ID は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    mockPrisma.salesperson.findFirst = vi.fn().mockResolvedValue(null);
    const res = await callGET("9999");
    expect(res.status).toBe(404);
  });
});

// ── PUT /api/salespersons/[id] ────────────────────────────────────────────────

describe("PUT /api/salespersons/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.salesperson.findFirst = vi
      .fn()
      .mockResolvedValueOnce(existingSalesperson) // existence check
      .mockResolvedValueOnce(null); // no duplicate email
    mockPrisma.salesperson.update = vi
      .fn()
      .mockResolvedValue({ ...existingSalesperson, name: validUpdateBody.name });
    mockHashPassword.mockResolvedValue("$2b$12$newhash");
  });

  afterEach(() => vi.restoreAllMocks());

  async function callPUT(id: string, body: unknown) {
    return PUT(makeRequest("PUT", `http://localhost/api/salespersons/${id}`, body), {
      params: Promise.resolve({ id }),
    });
  }

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callPUT("1", validUpdateBody);
    expect(res.status).toBe(401);
  });

  it("一般営業は 403 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callPUT("1", validUpdateBody);
    expect(res.status).toBe(403);
  });

  it("管理者が営業を更新して 200 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPUT("1", validUpdateBody);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe(validUpdateBody.name);
  });

  it("存在しない営業は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    mockPrisma.salesperson.findFirst = vi.fn().mockResolvedValue(null);
    const res = await callPUT("9999", validUpdateBody);
    expect(res.status).toBe(404);
  });

  it("メール重複は 409 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    mockPrisma.salesperson.findFirst = vi
      .fn()
      .mockResolvedValueOnce(existingSalesperson) // existence check
      .mockResolvedValueOnce({ id: 99, email: "sato@test.com" }); // duplicate found
    const res = await callPUT("1", validUpdateBody);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("DUPLICATE_EMAIL");
  });

  it("password 指定時に再ハッシュされる", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    // reset to provide fresh sequence for this test
    mockPrisma.salesperson.findFirst = vi
      .fn()
      .mockResolvedValueOnce(existingSalesperson)
      .mockResolvedValueOnce(null);
    await callPUT("1", { ...validUpdateBody, password: "newpass123" });
    expect(mockHashPassword).toHaveBeenCalledWith("newpass123");
    expect(mockPrisma.salesperson.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ passwordHash: "$2b$12$newhash" }),
      }),
    );
  });

  it("password 未指定時にハッシュ化は呼ばれない", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    mockPrisma.salesperson.findFirst = vi
      .fn()
      .mockResolvedValueOnce(existingSalesperson)
      .mockResolvedValueOnce(null);
    await callPUT("1", validUpdateBody);
    expect(mockHashPassword).not.toHaveBeenCalled();
  });

  it("バリデーションエラーは 422 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callPUT("1", { ...validUpdateBody, name: "" });
    expect(res.status).toBe(422);
  });
});

// ── DELETE /api/salespersons/[id] ─────────────────────────────────────────────

describe("DELETE /api/salespersons/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.salesperson.findFirst = vi.fn().mockResolvedValue(existingSalesperson);
    mockPrisma.salesperson.update = vi.fn().mockResolvedValue({});
  });

  afterEach(() => vi.restoreAllMocks());

  async function callDELETE(id: string) {
    return DELETE(makeRequest("DELETE", `http://localhost/api/salespersons/${id}`), {
      params: Promise.resolve({ id }),
    });
  }

  it("未認証は 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callDELETE("1");
    expect(res.status).toBe(401);
  });

  it("一般営業は 403 を返す", async () => {
    mockGetSession.mockResolvedValue(salesSession);
    const res = await callDELETE("1");
    expect(res.status).toBe(403);
  });

  it("管理者が論理削除して 204 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    const res = await callDELETE("1");
    expect(res.status).toBe(204);
  });

  it("論理削除で deletedAt が設定される", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    await callDELETE("1");
    expect(mockPrisma.salesperson.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });

  it("存在しない営業は 404 を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession);
    mockPrisma.salesperson.findFirst = vi.fn().mockResolvedValue(null);
    const res = await callDELETE("9999");
    expect(res.status).toBe(404);
  });
});
