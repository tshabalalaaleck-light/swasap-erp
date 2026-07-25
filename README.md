# SWASAP Axle & Shaft Manufacturing ERP

A full-stack manufacturing ERP/MES for railway axle, shaft, and round bar
production: raw material receiving, Cast → Serial genealogy, the full
SWASAP process flow (cutting, induction heating, GFM forging, heat
treatment, machining, grinding, inspection, dispatch), machine tracking,
work orders, quality/NCR, and role-based user management with a 10-day
trial system.

## What's included in this build

- **Auth**: JWT access + refresh tokens, bcrypt password hashing, account
  lockout after 5 failed logins, audit logging of every login/action.
- **Permanent administrator**, seeded automatically:
  - Email: `alecmshengu@outlook.com`
  - Password: `Admin123!`
  - Never expires, cannot be deleted, bypasses the trial system, full access
    to every module.
  - **Change this password after first login** — it's in this README and in
    source, so treat it as a placeholder credential, not a secret.
- **User management**: admin can add, disable, delete, extend trials, grant
  permanent licenses, and reset passwords for up to **10 users excluding the
  admin** (enforced server-side, not just in the UI).
- **10-day trial** per new user, clock starts on first login, shown on the
  dashboard, login blocked with "Your trial has expired. Please contact the
  administrator." once it lapses.
- **Cast/Serial traceability**: receive a cast (bloom/lot), cut it into N
  serialized billets, and trace forward (cast → every serial produced) or
  backward (serial → parent cast/heat/supplier) at any time.
- **Digital traveler**: every stage movement for a serial is logged with
  operator, machine, timestamp, and comments — nothing is ever deleted.
- **Production stages** seeded directly from your flow diagram (Stock Yard
  through Despatch); the administrator can add stages or change their order.
- **Machines** seeded from your equipment list (Do All saws, Banyard coils,
  GFM forge, furnaces, Endomatic, Morando, CNC lathes/grinders, wheel/bearing
  press, etc.) with downtime logging.
- **Work orders**, **inspections** (Mechanical/Ultrasonic/Crack
  Detection/Final Ultrasonic/Final) with automatic NCR creation on FAIL and
  automatic hold on the serial, and **dispatch** (blocked while an NCR is
  open).
- **Real-time sync**: a WebSocket broadcasts every mutation (cast received,
  serial moved, inspection recorded, dispatch, etc.) to all connected users
  instantly.
- **Runs anywhere via Docker**: one `docker compose up` gives you Postgres +
  backend + frontend, portable to any machine or cloud host.

## What's *not* built in this pass

This is a large scope (20+ modules including AI forecasting, PDF/certificate
generation, automatic customer emailing, procurement, maintenance
scheduling, financial reporting, barcode label printing). What's here is a
working, extensible core covering the traceability requirement, plus
auth/licensing/user management. The schema and route structure follow one
consistent pattern (Express route → Prisma model → audit log → WebSocket
broadcast), so adding the remaining modules means following that same
pattern rather than a redesign. See "Extending" below.

---

## Running it locally (any computer, one command)

Requires only [Docker Desktop](https://www.docker.com/products/docker-desktop/)
(or Docker Engine + Compose on Linux) — nothing else needs to be installed.

```bash
unzip swasap-erp.zip
cd swasap-erp
cp .env.example .env
docker compose up --build
```

Then open:
- Frontend: **http://localhost:8080**
- Backend API: **http://localhost:4000** (health check at `/health`)

Log in with `alecmshengu@outlook.com` / `Admin123!`.

The database persists in a Docker volume, so stopping and restarting
(`docker compose up`) keeps your data. To reset everything:
`docker compose down -v`.

## Making it reachable from any computer over the internet

Docker makes the app **portable** (identical on any machine), but for
multiple computers in different locations to reach the *same* running
instance, it needs to be hosted somewhere with a public address.

**For a free option using Netlify, see [DEPLOY_FREE.md](./DEPLOY_FREE.md)**
— it walks through Netlify (frontend) + Render (backend) + Neon
(PostgreSQL), all free, no credit card. `netlify.toml` and `render.yaml`
are already in this repo for that path.

Other options:
1. **A cloud platform that builds from Dockerfiles** — Railway or Fly.io
   can each take this repo and give you a public HTTPS URL in a few minutes.
2. **Your own VPS** (DigitalOcean, Linode, Hetzner, etc.) — copy this
   folder up, install Docker, run the same `docker compose up --build -d`,
   and open ports 80/443 (put a reverse proxy like Caddy or nginx in front
   for HTTPS).
3. **On-prem server** on your factory network — same Docker command, then
   users connect via your VPN or local network.

Whichever you choose, set `VITE_API_URL` (frontend → backend) and
`CORS_ORIGIN` (backend → frontend) to the real public URLs before
building, so the two services can find each other from outside `localhost`.

---

## Local development (without Docker)

Backend:
```bash
cd backend
npm install
cp .env.example .env   # point DATABASE_URL at your own Postgres
npx prisma db push
npx tsx src/lib/seed.ts
npm run dev             # http://localhost:4000
```

Frontend:
```bash
cd frontend
npm install
cp .env.example .env
npm run dev              # http://localhost:5173
```

## Project structure

```
swasap-erp/
├── docker-compose.yml       # Postgres + backend + frontend, one command
├── netlify.toml             # Free frontend hosting config
├── render.yaml               # Free backend hosting blueprint
├── DEPLOY_FREE.md            # Step-by-step: Netlify + Render + Neon
├── backend/
│   ├── prisma/schema.prisma # Full data model (User, Cast, Serial, WorkOrder,
│   │                        #   ProductionStage, Machine, ProcessHistory,
│   │                        #   Inspection, Ncr, Certificate, DispatchItem, AuditLog)
│   └── src/
│       ├── lib/             # auth, license/trial engine, realtime, audit, seed
│       ├── middleware/      # JWT + license gate + role checks
│       └── routes/          # auth, casts, serials, stages, machines, work-orders, quality
└── frontend/
    └── src/
        ├── pages/           # Login, Dashboard, Casts, Trace, WorkOrders, AdminUsers
        └── lib/api.ts       # fetch client with token refresh + WebSocket helper
```

## Extending

Each new module follows the same three-step pattern already used
throughout:

1. Add the Prisma model(s) to `schema.prisma`, run `npx prisma db push`.
2. Add a route file under `backend/src/routes/`, call `audit(...)` on
   writes and `broadcast(...)` so connected clients update live, mount it
   in `src/index.ts`.
3. Add a page under `frontend/src/pages/` that calls the new endpoints.

Concrete next modules, in the order they'd add the most value:

- **PDF/certificates** (Puppeteer or `pdfkit`) for Job Cards, COC, and
  Dispatch Notes — the `Certificate` model already exists to store the
  resulting document reference.
- **Nodemailer** on the dispatch route (`quality.ts`) to auto-email the
  customer when a serial is dispatched.
- **Barcode/QR**: the `/api/serials/:serialNumber/scan` endpoint already
  returns the compact payload a scanner needs — add a `qrcode` npm call to
  render it as an image for label printing.
- **Maintenance scheduling**, **procurement**, and **financial reporting**
  as their own route/page pairs against new Prisma models.
