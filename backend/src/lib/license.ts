import { prisma } from "./prisma";
import type { User } from "@prisma/client";

const TRIAL_DAYS = Number(process.env.TRIAL_DAYS || 10);
const MAX_NON_ADMIN_USERS = Number(process.env.MAX_NON_ADMIN_USERS || 10);

export async function assertUnderUserCap() {
  const count = await prisma.user.count({ where: { isPermanentAdmin: false } });
  if (count >= MAX_NON_ADMIN_USERS) {
    throw new Error(`User limit reached (${MAX_NON_ADMIN_USERS} users excluding admin). Ask the administrator to remove a user first.`);
  }
}

export async function startTrialClockIfNeeded(user: User) {
  if (!user.isPermanentAdmin && !user.trialStartedAt) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    return prisma.user.update({
      where: { id: user.id },
      data: { trialStartedAt: now, trialExpiresAt: expiresAt },
    });
  }
  return user;
}

export interface LicenseState {
  status: "ACTIVE" | "EXPIRED" | "DISABLED";
  daysRemaining: number | null;
  expiresAt: Date | null;
  canAccess: boolean;
}

export function evaluateLicense(user: User): LicenseState {
  if (user.isPermanentAdmin) {
    return { status: "ACTIVE", daysRemaining: null, expiresAt: null, canAccess: true };
  }
  if (!user.active || user.licenseStatus === "DISABLED") {
    return { status: "DISABLED", daysRemaining: null, expiresAt: null, canAccess: false };
  }
  if (!user.trialExpiresAt) {
    return { status: "ACTIVE", daysRemaining: TRIAL_DAYS, expiresAt: null, canAccess: true };
  }
  const msRemaining = user.trialExpiresAt.getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
  if (msRemaining <= 0) {
    return { status: "EXPIRED", daysRemaining: 0, expiresAt: user.trialExpiresAt, canAccess: false };
  }
  return { status: "ACTIVE", daysRemaining, expiresAt: user.trialExpiresAt, canAccess: true };
}
