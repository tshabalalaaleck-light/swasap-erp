import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireActiveLicense, AuthedRequest } from "../middleware/auth";
import { broadcast } from "../lib/realtime";

export const workOrderRouter = Router();
workOrderRouter.use(requireAuth, requireActiveLicense);

workOrderRouter.get("/", async (_req, res) => {
  const orders = await prisma.workOrder.findMany({
    include: { serials: { select: { id: true, serialNumber: true, status: true } }, createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
});

const createSchema = z.object({
  customer: z.string().min(1),
  partNumber: z.string().min(1),
  quantity: z.number().int().positive(),
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]).default("NORMAL"),
  targetDate: z.string().datetime().optional(),
});

workOrderRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const year = new Date().getFullYear();
  const countThisYear = await prisma.workOrder.count({ where: { number: { startsWith: `WO-${year}-` } } });
  const number = `WO-${year}-${String(countThisYear + 1).padStart(6, "0")}`;

  const order = await prisma.workOrder.create({
    data: {
      number,
      customer: parsed.data.customer,
      partNumber: parsed.data.partNumber,
      quantity: parsed.data.quantity,
      priority: parsed.data.priority,
      targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : undefined,
      createdById: req.user!.id,
    },
  });
  broadcast("WORK_ORDER_CREATED", order);
  res.status(201).json(order);
});

workOrderRouter.patch("/:id", async (req, res) => {
  const schema = z.object({ status: z.enum(["PLANNED", "RELEASED", "IN_PROGRESS", "COMPLETE", "CANCELLED"]).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const order = await prisma.workOrder.update({ where: { id: req.params.id }, data: parsed.data });
  broadcast("WORK_ORDER_UPDATED", order);
  res.json(order);
});

workOrderRouter.post("/:id/assign-serial", async (req, res) => {
  const { serialNumber } = req.body ?? {};
  if (!serialNumber) return res.status(400).json({ error: "serialNumber is required" });
  const serial = await prisma.serial.update({
    where: { serialNumber },
    data: { workOrderId: req.params.id },
  });
  res.json(serial);
});
