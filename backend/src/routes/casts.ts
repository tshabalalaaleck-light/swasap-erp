import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireActiveLicense, AuthedRequest } from "../middleware/auth";
import { broadcast } from "../lib/realtime";
import { audit } from "../lib/audit";

export const castRouter = Router();
castRouter.use(requireAuth, requireActiveLicense);

const createCastSchema = z.object({
  castNumber: z.string().min(1),
  heatNumber: z.string().min(1),
  steelGrade: z.string().min(1),
  supplier: z.string().min(1),
  originalWeightKg: z.number().positive(),
});

castRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = createCastSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.cast.findUnique({ where: { castNumber: parsed.data.castNumber } });
  if (existing) return res.status(409).json({ error: "A cast with that number already exists" });

  const cast = await prisma.cast.create({ data: parsed.data });
  await audit({ userId: req.user!.id, action: "CAST_RECEIVED", entity: "Cast", entityId: cast.id, ip: req.ip });
  broadcast("CAST_CREATED", cast);
  res.status(201).json(cast);
});

castRouter.get("/", async (_req, res) => {
  const casts = await prisma.cast.findMany({
    orderBy: { createdAt: "desc" },
    include: { serials: { select: { id: true, serialNumber: true, status: true } } },
  });
  res.json(casts);
});

const cutSchema = z.object({
  count: z.number().int().min(1).max(50),
  partNumber: z.string().optional(),
  customer: z.string().optional(),
});

castRouter.post("/:id/cut", async (req: AuthedRequest, res) => {
  const parsed = cutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const cast = await prisma.cast.findUnique({ where: { id: req.params.id }, include: { serials: true } });
  if (!cast) return res.status(404).json({ error: "Cast not found" });

  const startIndex = cast.serials.length + 1;
  const created = [];
  for (let i = 0; i < parsed.data.count; i++) {
    const seq = String(startIndex + i).padStart(3, "0");
    const serialNumber = `${cast.castNumber.replace("CAST-", "SN-")}-${seq}`;
    const serial = await prisma.serial.create({
      data: {
        serialNumber,
        castId: cast.id,
        partNumber: parsed.data.partNumber,
        customer: parsed.data.customer,
      },
    });
    created.push(serial);
  }

  await audit({
    userId: req.user!.id, action: "CAST_CUT", entity: "Cast", entityId: cast.id,
    detail: `Cut into ${created.length} serialized billets`, ip: req.ip,
  });
  broadcast("SERIALS_CREATED", { castId: cast.id, serials: created });
  res.status(201).json(created);
});

castRouter.get("/:id/genealogy", async (req, res) => {
  const cast = await prisma.cast.findUnique({
    where: { id: req.params.id },
    include: {
      serials: {
        include: {
          currentStage: true,
          processHistory: { include: { toStage: true, operator: true, machine: true }, orderBy: { createdAt: "asc" } },
          inspections: true,
        },
      },
    },
  });
  if (!cast) return res.status(404).json({ error: "Cast not found" });
  res.json(cast);
});
