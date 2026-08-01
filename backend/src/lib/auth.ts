import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";
const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TTL = process.env.REFRESH_TOKEN_TTL || "7d";

export interface AccessTokenPayload {
  sub: string;
  role: string;
  companyId: string | null;
  isPermanentAdmin: boolean;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = { expiresIn: ACCESS_TTL as any };
  return jwt.sign(payload, ACCESS_SECRET as string, options);
}

export function signRefreshToken(userId: string): string {
  const options: SignOptions = { expiresIn: REFRESH_TTL as any };
  return jwt.sign({ sub: userId, type: "refresh" }, REFRESH_SECRET as string, options);
}
