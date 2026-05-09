import { describe, expect, it } from "vitest";
import { createCommentSchema } from "@/lib/validation/schemas/comment.schema";

const validComment = {
  target_type: "problem" as const,
  content: "対応策を検討してください。",
};

describe("createCommentSchema", () => {
  // UT-CMT-001: content 必須チェック
  it("UT-CMT-001: content が空は「コメントを入力してください」", () => {
    const result = createCommentSchema.safeParse({ ...validComment, content: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("コメントを入力してください");
    }
  });

  // UT-CMT-002: content 1001文字 → エラー
  it("UT-CMT-002: content が 1001文字は「1000文字以内で入力してください」", () => {
    const result = createCommentSchema.safeParse({
      ...validComment,
      content: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("1000文字以内で入力してください");
    }
  });

  // UT-CMT-003: target_type 不正値 → エラー
  it("UT-CMT-003: target_type が不正値はバリデーションエラー", () => {
    const result = createCommentSchema.safeParse({ ...validComment, target_type: "invalid" });
    expect(result.success).toBe(false);
  });

  it("UT-CMT-003: target_type が problem は有効", () => {
    const result = createCommentSchema.safeParse({ ...validComment, target_type: "problem" });
    expect(result.success).toBe(true);
  });

  it("UT-CMT-003: target_type が plan は有効", () => {
    const result = createCommentSchema.safeParse({ ...validComment, target_type: "plan" });
    expect(result.success).toBe(true);
  });
});
