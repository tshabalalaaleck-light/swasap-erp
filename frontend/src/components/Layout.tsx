import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearSession, getUser } from "../lib/api";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/casts", label: "Casts & Serials" },
  { to: "/trace", label: "Traceability Lookup" },
  { to: "/work-orders", label: "Work Orders" },
];

export default function Layout() {
  const user = getUser();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-navy text-white flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="text-lg font-bold tracking-wide">SWASAP ERP</div>
          <div className="text-xs text-white/60 mt-0.5">Axle & Shaft Manufacturing</div>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${isActive ? "bg-orange text-white" : "text-white/80 hover:bg-white/10"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
          {user?.isPermanentAdmin && (
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${isActive ? "bg-orange text-white" : "text-white/80 hover:bg-white/10"}`
              }
            >
              User Management
            </NavLink>
          )}
        </nav>
        <div className="px-4 py-4 border-t border-white/10 text-sm">
          <div className="text-white/90">{user?.name}</div>
          <div className="text-white/50 text-xs mb-2">{user?.role}</div>
          <button
            onClick={() => {
              clearSession();
              navigate("/login");
            }}
            className="text-xs text-orange hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
