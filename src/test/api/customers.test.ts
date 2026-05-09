// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
  setSession: vi.fn(),
  clearSession: vi.fn(),
  getSessionToken: vi.fn(),
  COOKIE_NAME: "session_token",
}));

import { getSession } from "@/lib/auth/session";
import { GET as customersGET, POST as customersPOST } from "@/app/api/customers/route";
import { cleanTestDb, seedTestData, type SeedResult } from "@/test/helpers/testDb";

let seed: SeedResult;

function makeCustomersRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/customers");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

beforeEach(async () => {
  await cleanTestDb();
  seed = await seedTestData();
});

describe("AT-CST-001: 顧客登録 正常系", () => {
  it("管理者が顧客を登録すると 201 と顧客オブジェクトを返す", async () => {
    vi.mocked(getSession).mockResolvedValue({
      sub: String(seed.admin.id),
      email: seed.admin.email,
      isManager: true,
    });

    const req = new NextRequest("http://localhost/api/customers", {
      method: "POST",
      body: JSON.stringify({ name: "株式会社テスト商事", industry: "商社" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await customersPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("株式会社テスト商事");
    expect(body.industry).toBe("商社");
    expect(body.id).toBeDefined();
  });
});

describe("AT-CST-002: 顧客登録 管理者以外によるアクセスエラー", () => {
  it("一般営業が顧客登録を試みると 403 FORBIDDEN を返す", async () => {
    vi.mocked(getSession).mockResolvedValue({
      sub: String(seed.yamada.id),
      email: seed.yamada.email,
      isManager: false,
    });

    const req = new NextRequest("http://localhost/api/customers", {
      method: "POST",
      body: JSON.stringify({ name: "株式会社テスト商事" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await customersPOST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });
});

describe("AT-CST-003: 顧客一覧取得 名前フィルター", () => {
  it("name フィルターで部分一致検索できる", async () => {
    vi.mocked(getSession).mockResolvedValue({
      sub: String(seed.yamada.id),
      email: seed.yamada.email,
      isManager: false,
    });

    const res = await customersGET(makeCustomersRequest({ name: "A商事" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("株式会社A商事");
    expect(body.data.some((c: { name: string }) => c.name === "株式会社B製造")).toBe(false);
  });
});
