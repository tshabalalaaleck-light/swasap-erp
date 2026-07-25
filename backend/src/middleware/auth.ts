import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { evaluateLicense } from "../lib/license";

export interface AuthedRequest extends Request {
  user?: { id: string; role: string; isPermanentAdmin: boolean };
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing bearer token" });
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = { id: payload.sub, role: payload.role, isPermanentAdmin: payload.isPermanentAdmin };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function requireActiveLicense(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });
  if (req.user.isPermanentAdmin) return next();
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(401).json({ error: "User not found" });
  const state = evaluateLicense(user);
  if (!state.canAccess) {
    return res.status(402).json({
      error: state.status === "EXPIRED"
        ? "Your trial has expired. Please contact the administrator."
        : "Account disabled. Please contact the administrator.",
      license: state,
    });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthenticated" });
    if (req.user.isPermanentAdmin) return next();
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Insufficient permissions" });
    next();
  };
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user?.isPermanentAdmin) return res.status(403).json({ error: "Administrator access required" });
  next();
}
