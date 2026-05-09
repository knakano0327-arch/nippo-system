// @vitest-environment node
import { describe, expect, it } from "vitest";
import { type JwtPayload, refreshToken, signToken, verifyToken } from "../jwt";

const payload: JwtPayload = {
  sub: "1",
  email: "yamada@test.com",
  isManager: false,
};

describe("jwt", () => {
  it("signToken / verifyToken で同じペイロードが返る", async () => {
    const token = await signToken(payload);
    const result = await verifyToken(token);
    expect(result.sub).toBe(payload.sub);
    expect(result.email).toBe(payload.email);
    expect(result.isManager).toBe(payload.isManager);
  });

  it("改ざんトークンは verifyToken で例外になる", async () => {
    const token = await signToken(payload);
    const tampered = token.slice(0, -4) + "xxxx";
    await expect(verifyToken(tampered)).rejects.toThrow();
  });

  it("refreshToken で有効なトークンが返される", async () => {
    const token = await signToken(payload);
    const newToken = await refreshToken(token);
    const result = await verifyToken(newToken);
    expect(result.sub).toBe(payload.sub);
    expect(result.email).toBe(payload.email);
  });
});
