import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Casts() {
  const [casts, setCasts] = useState<any[]>([]);
  const [form, setForm] = useState({ castNumber: "", heatNumber: "", steelGrade: "", supplier: "", originalWeightKg: "" });
  const [cutting, setCutting] = useState<{ id: string; count: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.get("/api/casts").then(setCasts).catch(() => {});
  }
  useEffect(load, []);

  async function submitCast(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/api/casts", { ...form, originalWeightKg: Number(form.originalWeightKg) });
      setForm({ castNumber: "", heatNumber: "", steelGrade: "", supplier: "", originalWeightKg: "" });
      load();
    } catch (err: any) {
      setError(err.data?.error || err.message);
    }
  }

  async function submitCut(castId: string) {
    if (!cutting) return;
    try {
      await api.post(`/api/casts/${castId}/cut`, { count: Number(cutting.count) });
      setCutting(null);
      load();
    } catch (err: any) {
      setError(err.data?.error || err.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6">Casts & Serials</h1>

      <form onSubmit={submitCast} className="bg-white rounded-lg shadow p-5 mb-8 grid grid-cols-5 gap-3 items-end">
        {[
          ["castNumber", "Cast Number", "CAST-2026-001"],
          ["heatNumber", "Heat Number", "H-4471"],
          ["steelGrade", "Steel Grade", "EA4T"],
          ["supplier", "Supplier", "Acme Steel"],
          ["originalWeightKg", "Weight (kg)", "1200"],
        ].map(([key, label, ph]) => (
          <div key={key}>
            <label className="block text-xs text-slate-500 mb-1">{label}</label>
            <input required placeholder={ph} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
        ))}
        <button className="col-span-5 bg-navy text-white rounded py-2 text-sm font-medium hover:opacity-90 mt-1">
          Receive Cast
        </button>
      </form>

      {error && <div className="mb-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2">{error}</div>}

      <div className="bg-white rounded-lg shadow divide-y">
        {casts.map((c) => (
          <div key={c.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-navy">{c.castNumber}</div>
                <div className="text-xs text-slate-500">Heat {c.heatNumber} · {c.steelGrade} · {c.supplier} · {c.originalWeightKg} kg</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 mb-1">{c.serials.length} serial(s) cut</div>
                {cutting?.id === c.id ? (
                  <div className="flex gap-1">
                    <input type="number" min={1} className="w-16 border rounded px-1 py-0.5 text-xs" value={cutting.count} onChange={(e) => setCutting({ id: c.id, count: e.target.value })} />
                    <button onClick={() => submitCut(c.id)} className="text-xs bg-orange text-white px-2 rounded">Cut</button>
                    <button onClick={() => setCutting(null)} className="text-xs text-slate-400">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setCutting({ id: c.id, count: "4" })} className="text-xs text-orange hover:underline">
                    Cut into serials
                  </button>
                )}
              </div>
            </div>
            {c.serials.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.serials.map((s: any) => (
                  <span key={s.id} className="text-xs bg-slate-100 rounded px-2 py-0.5 text-slate-600">{s.serialNumber}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {casts.length === 0 && <div className="p-6 text-sm text-slate-400">No casts received yet.</div>}
      </div>
    </div>
  );
}
