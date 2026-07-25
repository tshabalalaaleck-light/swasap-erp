# Deploying SWASAP ERP for Free (Netlify + Render + Neon)

Netlify only hosts static sites and short-lived serverless functions — it
can't run the backend's persistent Express server or keep a WebSocket
connection open. So the app splits across three free services:

| Piece | Where | Why |
|---|---|---|
| Frontend (React) | **Netlify** | Free static hosting, exactly what it's built for |
| Backend (Express + WebSocket) | **Render** | Free tier runs a real persistent Node process |
| Database (PostgreSQL) | **Neon** | Free tier that doesn't expire (Render's free Postgres deletes itself after 30 days) |

All three have permanent free tiers with no credit card required. Total cost: $0.
Render's free web service **sleeps after 15 minutes of inactivity** and takes
~30-60 seconds to wake back up on the next request — that's the one real
trade-off of going free. Everything below still works, it's just not
always-on.

You'll need a free GitHub account to connect these platforms to your code.

---

## 1. Push this project to GitHub

```bash
cd swasap-erp
git init
git add .
git commit -m "Initial commit"
```

Create a new empty repository on github.com, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/swasap-erp.git
git branch -M main
git push -u origin main
```

## 2. Create the database on Neon

1. Go to **neon.tech** → sign up (no card needed) → **Create a project**.
2. Once created, copy the **connection string** shown on the project
   dashboard — it looks like:
   `postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
3. Keep this tab open, you'll paste it into Render next.

## 3. Deploy the backend on Render

1. Go to **render.com** → sign up (no card needed) → **New** →
   **Blueprint**.
2. Connect your GitHub account and select the `swasap-erp` repo. Render
   will read `render.yaml` at the repo root and pre-fill a web service
   called `swasap-erp-backend`.
3. Before deploying, fill in the two variables the blueprint left blank:
   - `DATABASE_URL` → paste the Neon connection string from step 2.
   - `CORS_ORIGIN` → leave blank for now, you'll come back and set this
     after step 4 (once you know your Netlify URL).
4. Click **Apply** / **Deploy**. First build takes a few minutes (it's
   building the Docker image). When it's done, note the public URL Render
   gives you, e.g. `https://swasap-erp-backend.onrender.com`.
5. Confirm it's alive: open `https://swasap-erp-backend.onrender.com/health`
   in a browser — you should see `{"ok":true,...}`.

## 4. Deploy the frontend on Netlify

1. Go to **netlify.com** → sign up (no card needed) → **Add new site** →
   **Import an existing project** → choose GitHub → select `swasap-erp`.
2. Netlify auto-detects `netlify.toml` at the repo root (base directory
   `frontend`, build command `npm run build`, publish directory
   `frontend/dist`) — you shouldn't need to change anything here.
3. Before the first deploy, go to **Site configuration → Environment
   variables** and add:
   - `VITE_API_URL` → your Render backend URL from step 3, e.g.
     `https://swasap-erp-backend.onrender.com`
4. Deploy. Netlify gives you a URL like `https://swasap-erp.netlify.app`
   (you can rename this in Site configuration → Domain management, still
   free).

## 5. Connect the two: set CORS on the backend

Go back to Render → your backend service → **Environment**, and set:

- `CORS_ORIGIN` → your Netlify URL from step 4, e.g.
  `https://swasap-erp.netlify.app`

Save — Render will redeploy automatically with the new setting.

## 6. Log in

Open your Netlify URL. First load may take ~30-60 seconds if the Render
backend was asleep. Log in with:

- **Email**: `alecmshengu@outlook.com`
- **Password**: `Admin123!`

Change this password immediately after logging in for the first time
(there's no in-app "change my own password" button yet — as the admin, add
a user for yourself with your real email under a non-admin role for daily
use, or edit `backend/src/lib/seed.ts` before redeploying to seed a
different admin password).

---

## What "free" actually gets you here

- **Netlify**: effectively unlimited for a project this size — no sleep,
  no expiry.
- **Neon**: permanent free tier (0.5 GB storage, autoscaling compute that
  scales to zero when idle) — this is a real production-grade Postgres,
  not a trial.
- **Render**: 750 free instance-hours/month (more than enough for one
  service running continuously), but it **sleeps after 15 minutes idle**
  and cold-starts on the next request. For an always-on backend with no
  sleep, Render's paid Starter plan is $7/month — everything else in this
  guide stays the same.

## Redeploying after code changes

Both Netlify and Render auto-deploy on every `git push` to `main` once
connected — no extra steps needed after the first setup.
