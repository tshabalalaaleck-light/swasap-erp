import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { authRouter } from "./routes/auth";
import { castRouter } from "./routes/casts";
import { serialRouter } from "./routes/serials";
import { stageRouter, machineRouter } from "./routes/stages";
import { workOrderRouter } from "./routes/workorders";
import { qualityRouter, dispatchRouter } from "./routes/quality";
import { initRealtime } from "./lib/realtime";

const app = express();

const origins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*";
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "swasap-erp-backend" }));

app.use("/api/auth", authRouter);
app.use("/api/casts", castRouter);
app.use("/api/serials", serialRouter);
app.use("/api/stages", stageRouter);
app.use("/api/machines", machineRouter);
app.use("/api/work-orders", workOrderRouter);
app.use("/api/quality", qualityRouter);
app.use("/api/dispatch", dispatchRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const server = http.createServer(app);
initRealtime(server);

const PORT = Number(process.env.PORT) || 4000;
server.listen(PORT, () => {
  console.log(`SWASAP ERP backend listening on port ${PORT}`);
});
