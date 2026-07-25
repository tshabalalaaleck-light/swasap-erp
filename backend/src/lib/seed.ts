import "dotenv/config";
import { prisma } from "./prisma";
import { hashPassword } from "./auth";

const ADMIN_EMAIL = "alecmshengu@outlook.com";
const ADMIN_PASSWORD = "Admin123!";

const STAGES = [
  "Stock Yard (Blooms & Ingots)",
  "Cutting to Length",
  "Storage - Cut Billets",
  "Induction Heating",
  "NC Forging Machine",
  "Identification Stamping",
  "Storage Racks - Forgings",
  "Oil Quenching",
  "Air Quenching",
  "Heat Treatment Furnaces",
  "Mechanical Testing",
  "Cutting to Semi-Finished Length",
  "Final Length, Face End & Centring, Drill & Tap",
  "Rough Machining",
  "Storage - Rough Machined Forgings",
  "Ultrasonic Testing",
  "Finished Machining (NC Lathe)",
  "Finished Machining (Lathes)",
  "Boring Mills",
  "Grinding",
  "Crack Detection",
  "Centreless Grinding",
  "Final Transverse Ultrasonic Inspection",
  "Assembly Press (Wheel Pairs)",
  "Final Inspection",
  "Storage - Wheels",
  "Despatch",
];

const MACHINES = [
  { assetNumber: "DA-01", name: "Do All Billet Saw 1", type: "Billet Saw" },
  { assetNumber: "BY-01", name: "Banyard Heating Coil 1", type: "Induction Heater" },
  { assetNumber: "GFM-01", name: "GFM NC Forge", type: "Forging Press" },
  { assetNumber: "HTF-01", name: "Hardening Furnace 1", type: "Furnace" },
  { assetNumber: "QT-01", name: "Quench Tank 1", type: "Quench" },
  { assetNumber: "TF-01", name: "Tempering Furnace 1", type: "Furnace" },
  { assetNumber: "NL-01", name: "Noble & Lund Saw 1", type: "Saw" },
  { assetNumber: "END-01", name: "Endomatic 1", type: "End Facing/Centring" },
  { assetNumber: "MOR-01", name: "Morando Roughing Machine 1", type: "Rough Machining" },
  { assetNumber: "STM-01", name: "Stamping Machine 1", type: "Stamping" },
  { assetNumber: "CNCL-01", name: "CNC Lathe 1", type: "CNC Lathe" },
  { assetNumber: "CNCG-01", name: "CNC Grinder 1", type: "CNC Grinder" },
  { assetNumber: "WB-01", name: "W&B Boring Mill 1", type: "Boring Mill" },
  { assetNumber: "WP-01", name: "Wheel Press 1", type: "Press" },
  { assetNumber: "BP-01", name: "Bearing Press 1", type: "Press" },
  { assetNumber: "CG-01", name: "Centreless Grinder 1", type: "Grinder" },
  { assetNumber: "DT-01", name: "CNC Drill & Tap 1", type: "Drill/Tap" },
  { assetNumber: "SCL-01", name: "Single Carriage Lathe 1", type: "Lathe" },
  { assetNumber: "CR-01", name: "Cold Rolling Machine 1", type: "Cold Rolling" },
];

async function main() {
  const existingAdmin = await prisma.user.findFirst({ where: { isPermanentAdmin: true } });
  if (!existingAdmin) {
    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash,
        name: "System Administrator",
        role: "ADMIN",
        isPermanentAdmin: true,
        active: true,
      },
    });
    console.log(`Permanent administrator seeded: ${ADMIN_EMAIL}`);
  } else {
    console.log("Permanent administrator already exists - skipping.");
  }

  const stageCount = await prisma.productionStage.count();
  if (stageCount === 0) {
    for (let i = 0; i < STAGES.length; i++) {
      await prisma.productionStage.create({ data: { name: STAGES[i], order: i + 1 } });
    }
    console.log(`Seeded ${STAGES.length} production stages.`);
  }

  const machineCount = await prisma.machine.count();
  if (machineCount === 0) {
    await prisma.machine.createMany({ data: MACHINES });
    console.log(`Seeded ${MACHINES.length} machines.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
