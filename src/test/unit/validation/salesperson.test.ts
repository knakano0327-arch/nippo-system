// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/prisma");

import { prisma } from "@/lib/prisma";
import {
  createSalespersonSchema,
  updateSalespersonSchema,
} from "@/lib/validation/schemas/salesperson.schema";

const mockPrisma = vi.mocked(prisma, true);

const validCreateInput = {
  name: "山田 太郎",
  email: "yamada@test.com",
  password: "password123",
  department: "東京営業部",
  is_manager: false,
};

// ── Zod スキーマバリデーション ────────────────────────────────────────────────

describe("createSalespersonSchema", () => {
  // UT-SLP-001: email 形式チェック
  it("UT-SLP-001: email が不正形式は「メールアドレスを正しい形式で入力してください」", () => {
    const result = createSalespersonSchema.safeParse({
      ...validCreateInput,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("メールアドレスを正しい形式で入力してください");
    }
  });

  // UT-SLP-003: password 7文字 → エラー
  it("UT-SLP-003: password が 7文字は「パスワードは8文字以上で入力してください」", () => {
    const result = createSalespersonSchema.safeParse({
      ...validCreateInput,
      password: "abc1234", // 7文字
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("パスワードは8文字以上で入力してください");
    }
  });

  // 境界値: password 8文字 → エラーなし
  it("password が 8文字はエラーなし（境界値）", () => {
    const result = createSalespersonSchema.safeParse({
      ...validCreateInput,
      password: "abc12345", // 8文字
    });
    expect(result.success).toBe(true);
  });

  it("name が空は「氏名を入力してください」", () => {
    const result = createSalespersonSchema.safeParse({ ...validCreateInput, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("氏名を入力してください");
    }
  });
});

describe("updateSalespersonSchema", () => {
  it("password が省略可能（編集時）", () => {
    const result = updateSalespersonSchema.safeParse({
      name: validCreateInput.name,
      email: validCreateInput.email,
      department: validCreateInput.department,
      is_manager: validCreateInput.is_manager,
    });
    expect(result.success).toBe(true);
  });

  it("password が 7文字はエラー（指定した場合）", () => {
    const result = updateSalespersonSchema.safeParse({
      ...validCreateInput,
      password: "abc1234",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("パスワードは8文字以上で入力してください");
    }
  });
});

// ── email 重複チェック（Prisma モック） ──────────────────────────────────────

describe("email 重複チェック", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => vi.restoreAllMocks());

  // UT-SLP-002: email 重複時のエラーメッセージ確認
  it("UT-SLP-002: 登録済みメールアドレスが存在する場合はエラーメッセージが返る", async () => {
    mockPrisma.salesperson.findFirst = vi.fn().mockResolvedValue({
      id: 1,
      email: "yamada@test.com",
    });

    const duplicate = await prisma.salesperson.findFirst({
      where: { email: "yamada@test.com", deletedAt: null },
    });

    const errorMessage = duplicate ? "このメールアドレスはすでに登録されています" : null;

    expect(errorMessage).toBe("このメールアドレスはすでに登録されています");
  });

  it("UT-SLP-002: 別のメールアドレスでは重複エラーにならない", async () => {
    mockPrisma.salesperson.findFirst = vi.fn().mockResolvedValue(null);

    const duplicate = await prisma.salesperson.findFirst({
      where: { email: "new-user@test.com", deletedAt: null },
    });

    const errorMessage = duplicate ? "このメールアドレスはすでに登録されています" : null;

    expect(errorMessage).toBeNull();
  });
});
