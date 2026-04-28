import jwt from "jsonwebtoken";

export interface JwtPayload {
  userId: number;
  email: string;
}

const EXPIRY = "7d";

function secret(): string {
  const s = process.env["JWT_SECRET"];
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, secret(), { expiresIn: EXPIRY });
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, secret());
    if (typeof decoded !== "object" || decoded === null) return null;
    const { userId, email } = decoded as Record<string, unknown>;
    if (typeof userId !== "number" || typeof email !== "string") return null;
    return { userId, email };
  } catch {
    return null;
  }
}
