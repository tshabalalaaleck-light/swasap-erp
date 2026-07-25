import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireActiveLicense, requireAdmin, AuthedRequest } from "../middleware/auth";

export const stageRouter = Router();
stageRouter.use(requireAuth, requireActiveLicense);

stageRouter.get("/", async (_req, res) => {
  const stages = await prisma.productionStage.findMany({ orderBy: { order: "asc" } });
  res.json(stages);
});

const stageSchema = z.object({ name: z.string().min(1), order: z.number().int() });

stageRouter.post("/", requireAdmin, async (req: AuthedRequest, res) => {
  const parsed = stageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const stage = await prisma.productionStage.create({ data: parsed.data });
  res.status(201).json(stage);
});

stageRouter.patch("/:id", requireAdmin, async (req, res) => {
  const parsed = stageSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const stage = await prisma.productionStage.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(stage);
});

export const machineRouter = Router();
machineRouter.use(requireAuth, requireActiveLicense);

machineRouter.get("/", async (_req, res) => {
  const machines = await prisma.machine.findMany({
    include: { downtimeLogs: { where: { endedAt: null } } },
    orderBy: { name: "asc" },
  });
  res.json(machines);
});

const machineSchema = z.object({
  assetNumber: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
});

machineRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = machineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const machine = await prisma.machine.create({ data: parsed.data });
  res.status(201).json(machine);
});

machineRouter.post("/:id/downtime", async (req: AuthedRequest, res) => {
  const { reason } = req.body ?? {};
  if (!reason) return res.status(400).json({ error: "reason is required" });
  const log = await prisma.machineDowntime.create({ data: { machineId: req.params.id, reason } });
  await prisma.machine.update({ where: { id: req.params.id }, data: { available: false } });
  res.status(201).json(log);
});

machineRouter.post("/:id/downtime/:logId/resolve", async (req, res) => {
  const log = await prisma.machineDowntime.update({
    where: { id: req.params.logId },
    data: { endedAt: new Date() },
  });
  await prisma.machine.update({ where: { id: req.params.id }, data: { available: true } });
  res.json(log);
});
