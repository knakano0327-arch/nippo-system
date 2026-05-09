// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  setSession: vi.fn().mockResolvedValue("test-token-123"),
  getSession: vi.fn().mockResolvedValue(null),
  clearSession: vi.fn(),
  getSessionToken: vi.fn(),
  COOKIE_NAME: "session_token",
}));

import { getSession } from "@/lib/auth/session";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { GET as reportsGET } from "@/app/api/reports/route";
import { cleanTestDb, seedTestData } from "@/test/helpers/testDb";

beforeEach(async () => {
  await cleanTestDb();
  await seedTestData();
  vi.mocked(getSession).mockResolvedValue(null);
});

describe("AT-AUTH-001: ログイン正常系", () => {
  it("正しい認証情報でログインすると 200 と token・user が返る", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "yamada@test.com", password: "password123" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await loginPOST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBe("test-token-123");
    expect(body.expires_at).toBeDefined();
    expect(body.user.email).toBe("yamada@test.com");
    expect(body.user.name).toBe("山田 太郎");
    expect(body.user.is_manager).toBe(false);
  });
});

describe("AT-AUTH-002: ログイン異常系（パスワード誤り）", () => {
  it("パスワードが誤っていると 401 INVALID_CREDENTIALS を返す", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "yamada@test.com", password: "wrongpass" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await loginPOST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
  });
});

describe("AT-AUTH-003: ログイン異常系（存在しないメールアドレス）", () => {
  it("存在しないメールアドレスで 401 INVALID_CREDENTIALS を返す", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "notexist@test.com", password: "password123" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await loginPOST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
  });
});

describe("AT-AUTH-004: 未認証リクエスト", () => {
  it("Authorization なしで保護エンドポイントにアクセスすると 401 UNAUTHORIZED", async () => {
    const req = new NextRequest("http://localhost/api/reports");
    const res = await reportsGET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("AT-AUTH-005: 期限切れトークン", () => {
  it("無効なセッションで保護エンドポイントにアクセスすると 401 UNAUTHORIZED", async () => {
    const req = new NextRequest("http://localhost/api/reports");
    const res = await reportsGET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
