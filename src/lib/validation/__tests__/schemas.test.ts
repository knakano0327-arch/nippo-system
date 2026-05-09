// @vitest-environment node
import { describe, expect, it } from "vitest";
import { loginSchema } from "../schemas/auth.schema";
import { createCommentSchema } from "../schemas/comment.schema";
import { customerSchema } from "../schemas/customer.schema";
import { createReportSchema, updateReportStatusSchema } from "../schemas/report.schema";
import { createSalespersonSchema, updateSalespersonSchema } from "../schemas/salesperson.schema";
import { visitRecordSchema } from "../schemas/visitRecord.schema";

// ─── auth ────────────────────────────────────────────────────────────────────
describe("loginSchema", () => {
  it("正常値でパースできる", () => {
    const r = loginSchema.safeParse({ email: "a@b.com", password: "pass" });
    expect(r.success).toBe(true);
  });
  it("メール形式が不正はエラー", () => {
    const r = loginSchema.safeParse({ email: "not-email", password: "p" });
    expect(r.success).toBe(false);
  });
  it("パスワード空はエラー", () => {
    const r = loginSchema.safeParse({ email: "a@b.com", password: "" });
    expect(r.success).toBe(false);
  });
});

// ─── visitRecord ─────────────────────────────────────────────────────────────
describe("visitRecordSchema", () => {
  const valid = { customer_id: 1, visit_content: "content", sort_order: 0 };
  it("正常値でパースできる", () => {
    expect(visitRecordSchema.safeParse(valid).success).toBe(true);
  });
  it("visit_content 空はエラー", () => {
    expect(visitRecordSchema.safeParse({ ...valid, visit_content: "" }).success).toBe(false);
  });
  it("visit_content 1001文字はエラー", () => {
    expect(
      visitRecordSchema.safeParse({
        ...valid,
        visit_content: "a".repeat(1001),
      }).success,
    ).toBe(false);
  });
  it("visit_content 1000文字はOK", () => {
    expect(
      visitRecordSchema.safeParse({
        ...valid,
        visit_content: "a".repeat(1000),
      }).success,
    ).toBe(true);
  });
});

// ─── report ──────────────────────────────────────────────────────────────────
describe("createReportSchema", () => {
  const validVisit = { customer_id: 1, visit_content: "x", sort_order: 0 };
  const valid = {
    report_date: "2026-05-08",
    status: "submitted" as const,
    visit_records: [validVisit],
  };
  it("正常値でパースできる", () => {
    expect(createReportSchema.safeParse(valid).success).toBe(true);
  });
  it("report_date 未指定はエラー", () => {
    expect(createReportSchema.safeParse({ ...valid, report_date: "" }).success).toBe(false);
  });
  it("problem 2001文字はエラー", () => {
    expect(
      createReportSchema.safeParse({
        ...valid,
        problem: "a".repeat(2001),
      }).success,
    ).toBe(false);
  });
  it("problem 2000文字はOK", () => {
    expect(
      createReportSchema.safeParse({
        ...valid,
        problem: "a".repeat(2000),
      }).success,
    ).toBe(true);
  });
  it("visit_records 空配列はエラー", () => {
    expect(createReportSchema.safeParse({ ...valid, visit_records: [] }).success).toBe(false);
  });
});

describe("updateReportStatusSchema", () => {
  it("reviewed はOK", () => {
    expect(updateReportStatusSchema.safeParse({ status: "reviewed" }).success).toBe(true);
  });
  it("submitted はエラー", () => {
    expect(updateReportStatusSchema.safeParse({ status: "submitted" }).success).toBe(false);
  });
});

// ─── comment ─────────────────────────────────────────────────────────────────
describe("createCommentSchema", () => {
  it("target_type=problem はOK", () => {
    expect(
      createCommentSchema.safeParse({
        target_type: "problem",
        content: "text",
      }).success,
    ).toBe(true);
  });
  it("target_type 不正値はエラー", () => {
    expect(
      createCommentSchema.safeParse({
        target_type: "invalid",
        content: "text",
      }).success,
    ).toBe(false);
  });
  it("content 空はエラー", () => {
    expect(
      createCommentSchema.safeParse({
        target_type: "plan",
        content: "",
      }).success,
    ).toBe(false);
  });
  it("content 1001文字はエラー", () => {
    expect(
      createCommentSchema.safeParse({
        target_type: "plan",
        content: "a".repeat(1001),
      }).success,
    ).toBe(false);
  });
});

// ─── customer ────────────────────────────────────────────────────────────────
describe("customerSchema", () => {
  it("正常値でパースできる", () => {
    expect(customerSchema.safeParse({ name: "株式会社テスト", industry: "商社" }).success).toBe(
      true,
    );
  });
  it("name 空はエラー", () => {
    expect(customerSchema.safeParse({ name: "" }).success).toBe(false);
  });
  it("phone 形式不正はエラー", () => {
    expect(customerSchema.safeParse({ name: "test", phone: "abc" }).success).toBe(false);
  });
  it("phone 数字・ハイフンはOK", () => {
    expect(customerSchema.safeParse({ name: "test", phone: "03-1234-5678" }).success).toBe(true);
  });
});

// ─── salesperson ─────────────────────────────────────────────────────────────
describe("createSalespersonSchema", () => {
  const valid = {
    name: "山田 太郎",
    email: "yamada@test.com",
    password: "password123",
  };
  it("正常値でパースできる", () => {
    expect(createSalespersonSchema.safeParse(valid).success).toBe(true);
  });
  it("email 不正形式はエラー", () => {
    expect(createSalespersonSchema.safeParse({ ...valid, email: "bad" }).success).toBe(false);
  });
  it("password 7文字はエラー", () => {
    expect(createSalespersonSchema.safeParse({ ...valid, password: "abc123x" }).success).toBe(
      false,
    );
  });
  it("password 8文字はOK", () => {
    expect(createSalespersonSchema.safeParse({ ...valid, password: "abc12345" }).success).toBe(
      true,
    );
  });
});

describe("updateSalespersonSchema", () => {
  const valid = { name: "山田 太郎", email: "yamada@test.com" };
  it("password なしでもOK", () => {
    expect(updateSalespersonSchema.safeParse(valid).success).toBe(true);
  });
  it("password 指定時は8文字以上", () => {
    expect(updateSalespersonSchema.safeParse({ ...valid, password: "abc1234" }).success).toBe(
      false,
    );
  });
});
