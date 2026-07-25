import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireActiveLicense, AuthedRequest } from "../middleware/auth";
import { broadcast } from "../lib/realtime";
import { audit } from "../lib/audit";

export const qualityRouter = Router();
qualityRouter.use(requireAuth, requireActiveLicense);

const inspectionSchema = z.object({
  serialNumber: z.string(),
  type: z.enum(["MECHANICAL", "ULTRASONIC", "CRACK_DETECTION", "FINAL_ULTRASONIC", "FINAL"]),
  result: z.enum(["PASS", "FAIL", "REWORK"]),
  notes: z.string().optional(),
  ncrDescription: z.string().optional(),
});

qualityRouter.post("/inspections", async (req: AuthedRequest, res) => {
  const parsed = inspectionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const serial = await prisma.serial.findUnique({ where: { serialNumber: parsed.data.serialNumber } });
  if (!serial) return res.status(404).json({ error: "Serial not found" });

  const inspection = await prisma.inspection.create({
    data: {
      serialId: serial.id,
      type: parsed.data.type,
      result: parsed.data.result,
      notes: parsed.data.notes,
      inspectorId: req.user!.id,
    },
  });

  if (parsed.data.result === "FAIL") {
    await prisma.ncr.create({
      data: {
        inspectionId: inspection.id,
        description: parsed.data.ncrDescription || "Failed inspection - see notes",
      },
    });
    await prisma.serial.update({ where: { id: serial.id }, data: { status: "ON_HOLD" } });
  }

  await audit({ userId: req.user!.id, action: "INSPECTION_RECORDED", entity: "Serial", entityId: serial.id, detail: parsed.data.result, ip: req.ip });
  broadcast("INSPECTION_RECORDED", { serialNumber: serial.serialNumber, result: parsed.data.result, type: parsed.data.type });
  res.status(201).json(inspection);
});

qualityRouter.get("/ncrs", async (req, res) => {
  const openOnly = req.query.open === "true";
  const ncrs = await prisma.ncr.findMany({
    where: openOnly ? { status: { not: "CLOSED" } } : undefined,
    include: { inspection: { include: { serial: true, inspector: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(ncrs);
});

qualityRouter.patch("/ncrs/:id", async (req, res) => {
  const schema = z.object({
    status: z.enum(["OPEN", "CORRECTIVE_ACTION", "CLOSED"]).optional(),
    correctiveAction: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data: any = { ...parsed.data };
  if (parsed.data.status === "CLOSED") data.closedAt = new Date();
  const ncr = await prisma.ncr.update({ where: { id: req.params.id }, data });
  res.json(ncr);
});

export const dispatchRouter = Router();
dispatchRouter.use(requireAuth, requireActiveLicense);

const dispatchSchema = z.object({ serialNumber: z.string(), customer: z.string(), trackingRef: z.string().optional() });

dispatchRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = dispatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const serial = await prisma.serial.findUnique({ where: { serialNumber: parsed.data.serialNumber } });
  if (!serial) return res.status(404).json({ error: "Serial not found" });
  if (serial.status === "ON_HOLD") return res.status(409).json({ error: "Serial is on hold pending NCR resolution - cannot dispatch" });

  const [item] = await prisma.$transaction([
    prisma.dispatchItem.create({
      data: { serialId: serial.id, customer: parsed.data.customer, trackingRef: parsed.data.trackingRef },
    }),
    prisma.serial.update({ where: { id: serial.id }, data: { status: "DISPATCHED" } }),
  ]);

  await audit({ userId: req.user!.id, action: "DISPATCHED", entity: "Serial", entityId: serial.id, ip: req.ip });
  broadcast("SERIAL_DISPATCHED", item);
  res.status(201).json(item);
});
