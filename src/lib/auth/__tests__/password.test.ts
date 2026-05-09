// @vitest-environment node
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../password";

describe("password", () => {
  it("hashPassword は平文と異なる文字列を返す", async () => {
    const hash = await hashPassword("password123");
    expect(hash).not.toBe("password123");
  });

  it("verifyPassword は正しいパスワードで true を返す", async () => {
    const hash = await hashPassword("password123");
    expect(await verifyPassword("password123", hash)).toBe(true);
  });

  it("verifyPassword は誤ったパスワードで false を返す", async () => {
    const hash = await hashPassword("password123");
    expect(await verifyPassword("wrongpass", hash)).toBe(false);
  });
});
