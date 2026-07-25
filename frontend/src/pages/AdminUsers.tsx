import { useEffect, useState } from "react";
import { api } from "../lib/api";

const ROLES = [
  "PRODUCTION_MANAGER", "PLANNER", "QUALITY_CONTROL", "MACHINE_OPERATOR",
  "STORES", "PROCUREMENT", "SALES", "MAINTENANCE", "DISPATCH", "FINANCE", "CUSTOMER_PORTAL",
];

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: ROLES[0] });
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.get("/api/auth/admin/users").then(setUsers).catch(() => {});
  }
  useEffect(load, []);

  const nonAdminCount = users.filter((u) => !u.isPermanentAdmin).length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/api/auth/admin/users", form);
      setForm({ email: "", password: "", name: "", role: ROLES[0] });
      load();
    } catch (err: any) {
      setError(err.data?.error || err.message);
    }
  }

  async function removeUser(id: string) {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    await api.del(`/api/auth/admin/users/${id}`);
    load();
  }

  async function toggleActive(u: any) {
    await api.patch(`/api/auth/admin/users/${u.id}`, { active: !u.active });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-1">User Management</h1>
      <p className="text-sm text-slate-500 mb-6">{nonAdminCount} / 10 users used (administrator does not count against the limit).</p>

      <form onSubmit={submit} className="bg-white rounded-lg shadow p-5 mb-8 grid grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Email</label>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Password</label>
          <input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Role</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm">
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <button disabled={nonAdminCount >= 10} className="bg-navy text-white rounded py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40">
          Add User
        </button>
      </form>

      {error && <div className="mb-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2">{error}</div>}

      <div className="bg-white rounded-lg shadow divide-y">
        {users.map((u) => (
          <div key={u.id} className="p-4 flex justify-between items-center">
            <div>
              <div className="font-semibold text-navy">
                {u.name} {u.isPermanentAdmin && <span className="text-xs text-orange ml-1">(Permanent Admin)</span>}
              </div>
              <div className="text-xs text-slate-500">{u.email} · {u.role}</div>
              {!u.isPermanentAdmin && (
                <div className="text-xs text-slate-400 mt-0.5">
                  {u.trialExpiresAt ? `Trial expires ${new Date(u.trialExpiresAt).toLocaleDateString()}` : "Trial not yet started"}
                </div>
              )}
            </div>
            {!u.isPermanentAdmin && (
              <div className="flex items-center gap-3">
                <button onClick={() => toggleActive(u)} className="text-xs text-slate-500 hover:underline">
                  {u.active ? "Disable" : "Enable"}
                </button>
                <button onClick={() => removeUser(u.id)} className="text-xs text-red-500 hover:underline">
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
