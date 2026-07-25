import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function WorkOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [form, setForm] = useState({ customer: "", partNumber: "", quantity: "", priority: "NORMAL" });
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.get("/api/work-orders").then(setOrders).catch(() => {});
  }
  useEffect(load, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/api/work-orders", { ...form, quantity: Number(form.quantity) });
      setForm({ customer: "", partNumber: "", quantity: "", priority: "NORMAL" });
      load();
    } catch (err: any) {
      setError(err.data?.error || err.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6">Work Orders</h1>

      <form onSubmit={submit} className="bg-white rounded-lg shadow p-5 mb-8 grid grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Customer</label>
          <input required value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Part Number</label>
          <input required value={form.partNumber} onChange={(e) => setForm({ ...form, partNumber: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Quantity</label>
          <input required type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Priority</label>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm">
            {["URGENT", "HIGH", "NORMAL", "LOW"].map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <button className="bg-navy text-white rounded py-2 text-sm font-medium hover:opacity-90">Create</button>
      </form>

      {error && <div className="mb-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2">{error}</div>}

      <div className="bg-white rounded-lg shadow divide-y">
        {orders.map((o) => (
          <div key={o.id} className="p-4 flex justify-between items-center">
            <div>
              <div className="font-semibold text-navy">{o.number} — {o.customer}</div>
              <div className="text-xs text-slate-500">{o.partNumber} · Qty {o.quantity} · {o.priority} · {o.serials.length} serial(s) linked</div>
            </div>
            <span className="text-xs bg-slate-100 rounded px-2 py-1 text-slate-600">{o.status}</span>
          </div>
        ))}
        {orders.length === 0 && <div className="p-6 text-sm text-slate-400">No work orders yet.</div>}
      </div>
    </div>
  );
}
