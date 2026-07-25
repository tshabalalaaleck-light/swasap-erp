import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireActiveLicense, AuthedRequest } from "../middleware/auth";
import { broadcast } from "../lib/realtime";
import { audit } from "../lib/audit";

export const serialRouter = Router();
serialRouter.use(requireAuth, requireActiveLicense);

serialRouter.get("/", async (req, res) => {
  const { status, customer } = req.query;
  const serials = await prisma.serial.findMany({
    where: {
      status: status ? (status as any) : undefined,
      customer: customer ? String(customer) : undefined,
    },
    include: { cast: true, currentStage: true, workOrder: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json(serials);
});

serialRouter.get("/:serialNumber/trace", async (req, res) => {
  const serial = await prisma.serial.findUnique({
    where: { serialNumber: req.params.serialNumber },
    include: {
      cast: true,
      currentStage: true,
      workOrder: true,
      processHistory: { include: { fromStage: true, toStage: true, operator: true, machine: true }, orderBy: { createdAt: "asc" } },
      inspections: { include: { inspector: true, ncr: true }, orderBy: { createdAt: "asc" } },
      certificates: true,
      dispatch: true,
    },
  });
  if (!serial) return res.status(404).json({ error: "Serial not found" });
  res.json(serial);
});

serialRouter.get("/:serialNumber/scan", async (req, res) => {
  const serial = await prisma.serial.findUnique({
    where: { serialNumber: req.params.serialNumber },
    include: {
      cast: true,
      currentStage: true,
      processHistory: { include: { toStage: true, operator: true, machine: true }, orderBy: { createdAt: "desc" }, take: 1 },
      inspections: { orderBy: { createdAt: "desc" }, take: 3 },
      dispatch: true,
    },
  });
  if (!serial) return res.status(404).json({ error: "Serial not found" });
  res.json({
    serialNumber: serial.serialNumber,
    partNumber: serial.partNumber,
    heatNumber: serial.cast.heatNumber,
    castNumber: serial.cast.castNumber,
    customer: serial.customer,
    currentStage: serial.currentStage?.name ?? "Not started",
    lastOperator: serial.processHistory[0]?.operator.name ?? null,
    lastMachine: serial.processHistory[0]?.machine?.name ?? null,
    status: serial.status,
    recentInspections: serial.inspections,
    dispatched: serial.dispatch.length > 0,
  });
});

const moveSchema = z.object({
  toStageId: z.string(),
  machineId: z.string().optional(),
  comments: z.string().optional(),
});

serialRouter.post("/:serialNumber/move", async (req: AuthedRequest, res) => {
  const parsed = moveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const serial = await prisma.serial.findUnique({ where: { serialNumber: req.params.serialNumber } });
  if (!serial) return res.status(404).json({ error: "Serial not found" });

  const toStage = await prisma.productionStage.findUnique({ where: { id: parsed.data.toStageId } });
  if (!toStage) return res.status(404).json({ error: "Target stage not found" });

  const [movement] = await prisma.$transaction([
    prisma.processHistory.create({
      data: {
        serialId: serial.id,
        fromStageId: serial.currentStageId,
        toStageId: toStage.id,
        machineId: parsed.data.machineId,
        operatorId: req.user!.id,
        comments: parsed.data.comments,
      },
    }),
    prisma.serial.update({ where: { id: serial.id }, data: { currentStageId: toStage.id } }),
  ]);

  await audit({
    userId: req.user!.id, action: "STAGE_MOVE", entity: "Serial", entityId: serial.id,
    detail: `-> ${toStage.name}`, ip: req.ip,
  });
  broadcast("SERIAL_MOVED", { serialNumber: serial.serialNumber, toStage: toStage.name, movement });
  res.status(201).json(movement);
});
