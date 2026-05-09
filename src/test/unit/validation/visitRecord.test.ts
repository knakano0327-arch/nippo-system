import { describe, expect, it } from "vitest";
import { visitRecordSchema } from "@/lib/validation/schemas/visitRecord.schema";

const validRecord = {
  customer_id: 10,
  visit_content: "商談を実施しました",
  sort_order: 1,
};

describe("visitRecordSchema", () => {
  // UT-VST-001: customer_id 必須チェック
  it("UT-VST-001: customer_id が null は「顧客を選択してください」", () => {
    const result = visitRecordSchema.safeParse({ ...validRecord, customer_id: null });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("顧客を選択してください");
    }
  });

  it("UT-VST-001: customer_id が string は「顧客を選択してください」", () => {
    const result = visitRecordSchema.safeParse({
      customer_id: "not-a-number",
      visit_content: validRecord.visit_content,
      sort_order: validRecord.sort_order,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("顧客を選択してください");
    }
  });

  // UT-VST-002: visit_content 必須チェック
  it("UT-VST-002: visit_content が空は「訪問内容を入力してください」", () => {
    const result = visitRecordSchema.safeParse({ ...validRecord, visit_content: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("訪問内容を入力してください");
    }
  });

  // UT-VST-003: visit_content 1001文字 → エラー
  it("UT-VST-003: visit_content が 1001文字は「1000文字以内で入力してください」", () => {
    const result = visitRecordSchema.safeParse({
      ...validRecord,
      visit_content: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("1000文字以内で入力してください");
    }
  });

  // UT-VST-004: visit_content 1000文字（境界値）→ エラーなし
  it("UT-VST-004: visit_content が 1000文字はエラーなし（境界値）", () => {
    const result = visitRecordSchema.safeParse({
      ...validRecord,
      visit_content: "a".repeat(1000),
    });
    expect(result.success).toBe(true);
  });
});
