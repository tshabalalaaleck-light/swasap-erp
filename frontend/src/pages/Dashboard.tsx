import { useEffect, useState } from "react";
import { api, connectRealtime } from "../lib/api";

export default function Dashboard() {
  const [me, setMe] = useState<any>(null);
  const [stats, setStats] = useState({ casts: 0, serials: 0, workOrders: 0, openNcrs: 0 });
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    api.get("/api/auth/me").then(setMe).catch(() => {});
    Promise.all([
      api.get("/api/casts"),
      api.get("/api/serials"),
      api.get("/api/work-orders"),
      api.get("/api/quality/ncrs?open=true"),
    ]).then(([casts, serials, wos, ncrs]) => {
      setStats({ casts: casts.length, serials: serials.length, workOrders: wos.length, openNcrs: ncrs.length });
    }).catch(() => {});

    const socket = connectRealtime((type) => {
      setEvents((prev) => [`${new Date().toLocaleTimeString()}  ${type}`, ...prev].slice(0, 8));
    });
    return () => socket.close();
  }, []);

  const license = me?.license;

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-1">Dashboard</h1>
      <p className="text-slate-500 text-sm mb-6">Welcome back, {me?.name}.</p>

      {license && !me.isPermanentAdmin && (
        <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${license.status === "ACTIVE" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-red-50 border-red-200 text-red-700"}`}>
          {license.status === "ACTIVE"
            ? `Trial license — ${license.daysRemaining ?? "?"} day(s) remaining.`
            : "Your trial has expired. Please contact the administrator."}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Casts Received", value: stats.casts },
          { label: "Serials in System", value: stats.serials },
          { label: "Work Orders", value: stats.workOrders },
          { label: "Open NCRs", value: stats.openNcrs },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg shadow p-5">
            <div className="text-3xl font-bold text-navy">{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="text-sm font-semibold text-navy mb-3">Live Activity</h2>
        {events.length === 0 ? (
          <p className="text-sm text-slate-400">No activity yet — updates from any connected user appear here in real time.</p>
        ) : (
          <ul className="text-sm text-slate-600 space-y-1 font-mono">
            {events.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
