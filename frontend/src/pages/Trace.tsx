import { useState } from "react";
import { api } from "../lib/api";

export default function Trace() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    try {
      const data = await api.get(`/api/serials/${encodeURIComponent(query)}/trace`);
      setResult(data);
    } catch (err: any) {
      setError(err.data?.error || err.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6">Traceability Lookup</h1>

      <form onSubmit={lookup} className="flex gap-2 mb-6">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Enter serial number, e.g. SN-2026-001-001" className="flex-1 border rounded px-3 py-2 text-sm" />
        <button className="bg-orange text-white rounded px-4 py-2 text-sm font-medium">Trace</button>
      </form>

      {error && <div className="mb-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2">{error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-sm font-semibold text-navy mb-2">Parent Cast (Backward Traceability)</h2>
            <div className="text-sm text-slate-600">
              {result.cast.castNumber} · Heat {result.cast.heatNumber} · {result.cast.steelGrade} · {result.cast.supplier}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Serial {result.serialNumber} · Customer: {result.customer || "—"} · Status: {result.status}
              {" "}· Current stage: {result.currentStage?.name || "Not started"}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-sm font-semibold text-navy mb-3">Process History (Digital Traveler)</h2>
            {result.processHistory.length === 0 ? (
              <p className="text-sm text-slate-400">No stage movements recorded yet.</p>
            ) : (
              <ol className="space-y-2">
                {result.processHistory.map((m: any) => (
                  <li key={m.id} className="text-sm border-l-2 border-orange pl-3">
                    <span className="font-medium text-navy">{m.toStage.name}</span>
                    <span className="text-slate-400"> — {new Date(m.createdAt).toLocaleString()}</span>
                    <div className="text-xs text-slate-500">
                      Operator: {m.operator.name}{m.machine ? ` · Machine: ${m.machine.name}` : ""}
                      {m.comments ? ` · ${m.comments}` : ""}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-sm font-semibold text-navy mb-3">Inspections</h2>
            {result.inspections.length === 0 ? (
              <p className="text-sm text-slate-400">No inspections recorded yet.</p>
            ) : (
              <ul className="space-y-1">
                {result.inspections.map((i: any) => (
                  <li key={i.id} className="text-sm">
                    <span className={`font-medium ${i.result === "PASS" ? "text-green-600" : i.result === "FAIL" ? "text-red-600" : "text-amber-600"}`}>
                      {i.result}
                    </span>
                    {" — "}{i.type} · {new Date(i.createdAt).toLocaleDateString()}
                    {i.ncr && <span className="text-xs text-red-500"> · NCR: {i.ncr.status}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
