import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword, signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/auth";
import { startTrialClockIfNeeded, evaluateLicense, assertUnderUserCap } from "../lib/license";
import { audit } from "../lib/audit";
import { requireAuth, requireAdmin, AuthedRequest } from "../middleware/auth";

export const authRouter = Router();

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid email or password format" });
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(423).json({ error: `Account locked until ${user.lockedUntil.toISOString()}` });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const failedLoginCount = user.failedLoginCount + 1;
    const lockedUntil = failedLoginCount >= MAX_FAILED_LOGINS
      ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
      : null;
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount, lockedUntil } });
    await audit({ userId: user.id, action: "LOGIN_FAILED", entity: "User", entityId: user.id, ip: req.ip });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (!user.active) return res.status(403).json({ error: "Account is disabled. Please contact the administrator." });

  const withTrial = await startTrialClockIfNeeded(user);
  const state = evaluateLicense(withTrial);
  if (!state.canAccess) {
    return res.status(402).json({
      error: state.status === "EXPIRED"
        ? "Your trial has expired. Please contact the administrator."
        : "Account disabled. Please contact the administrator.",
      license: state,
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: req.ip },
  });
  await audit({ userId: user.id, action: "LOGIN_SUCCESS", entity: "User", entityId: user.id, ip: req.ip });

  const accessToken = signAccessToken({ sub: user.id, role: user.role, companyId: null, isPermanentAdmin: user.isPermanentAdmin });
  const refreshToken = signRefreshToken(user.id);

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, isPermanentAdmin: user.isPermanentAdmin },
    license: state,
  });
});

authRouter.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) return res.status(400).json({ error: "Missing refresh token" });
  try {
    const { sub } = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: sub } });
    if (!user || !user.active) return res.status(401).json({ error: "Invalid session" });
    const accessToken = signAccessToken({ sub: user.id, role: user.role, companyId: null, isPermanentAdmin: user.isPermanentAdmin });
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "Not found" });
  const state = evaluateLicense(user);
  res.json({
    id: user.id, email: user.email, name: user.name, role: user.role,
    isPermanentAdmin: user.isPermanentAdmin, license: state,
  });
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum([
    "PRODUCTION_MANAGER", "PLANNER", "QUALITY_CONTROL", "MACHINE_OPERATOR",
    "STORES", "PROCUREMENT", "SALES", "MAINTENANCE", "DISPATCH", "FINANCE", "CUSTOMER_PORTAL",
  ]),
});

authRouter.post("/admin/users", requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    await assertUnderUserCap();
  } catch (e: any) {
    return res.status(409).json({ error: e.message });
  }

  const { email, password, name, role } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return res.status(409).json({ error: "A user with that email already exists" });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email: email.toLowerCase(), passwordHash, name, role },
  });
  await audit({ userId: req.user!.id, action: "USER_CREATED", entity: "User", entityId: user.id, ip: req.ip });

  res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

authRouter.get("/admin/users", requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true, email: true, name: true, role: true, active: true, isPermanentAdmin: true,
      trialStartedAt: true, trialExpiresAt: true, licenseStatus: true, lastLoginAt: true,
    },
  });
  res.json(users);
});

authRouter.delete("/admin/users/:id", requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: "User not found" });
  if (target.isPermanentAdmin) return res.status(403).json({ error: "The permanent administrator account cannot be deleted" });

  await prisma.user.delete({ where: { id: target.id } });
  await audit({ userId: req.user!.id, action: "USER_DELETED", entity: "User", entityId: target.id, ip: req.ip });
  res.status(204).send();
});

authRouter.patch("/admin/users/:id", requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: "User not found" });
  if (target.isPermanentAdmin) return res.status(403).json({ error: "The permanent administrator account cannot be modified" });

  const schema = z.object({
    active: z.boolean().optional(),
    role: z.string().optional(),
    extendTrialDays: z.number().optional(),
    grantPermanent: z.boolean().optional(),
    resetPassword: z.string().min(8).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data: any = {};
  if (parsed.data.active !== undefined) data.active = parsed.data.active;
  if (parsed.data.role) data.role = parsed.data.role;
  if (parsed.data.extendTrialDays) {
    const base = target.trialExpiresAt && target.trialExpiresAt > new Date() ? target.trialExpiresAt : new Date();
    data.trialExpiresAt = new Date(base.getTime() + parsed.data.extendTrialDays * 24 * 60 * 60 * 1000);
  }
  if (parsed.data.grantPermanent) data.trialExpiresAt = new Date("2999-01-01");
  if (parsed.data.resetPassword) data.passwordHash = await hashPassword(parsed.data.resetPassword);

  const updated = await prisma.user.update({ where: { id: target.id }, data });
  await audit({ userId: req.user!.id, action: "USER_UPDATED", entity: "User", entityId: target.id, detail: JSON.stringify(parsed.data), ip: req.ip });
  res.json({ id: updated.id, email: updated.email, active: updated.active, role: updated.role });
});
