import { SignJWT, jwtVerify } from "jose";

export type JwtPayload = {
  sub: string; // salesperson id (string)
  email: string;
  isManager: boolean;
  isAdmin: boolean;
};

const SECRET = new TextEncoder().encode(
  process.env["JWT_SECRET"] ?? "dev-secret-key-at-least-32-characters-long",
);
const ALGORITHM = "HS256";
const EXPIRES_IN = "24h";

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, SECRET, {
    algorithms: [ALGORITHM],
  });
  return {
    sub: payload.sub as string,
    email: payload["email"] as string,
    isManager: payload["isManager"] as boolean,
    isAdmin: (payload["isAdmin"] as boolean | undefined) ?? false,
  };
}

export async function refreshToken(token: string): Promise<string> {
  const payload = await verifyToken(token);
  return signToken(payload);
}
