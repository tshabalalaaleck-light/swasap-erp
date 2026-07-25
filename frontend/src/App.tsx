import { Routes, Route, Navigate } from "react-router-dom";
import { getUser } from "./lib/api";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Casts from "./pages/Casts";
import Trace from "./pages/Trace";
import WorkOrders from "./pages/WorkOrders";
import AdminUsers from "./pages/AdminUsers";
import Layout from "./components/Layout";

function Protected({ children }: { children: JSX.Element }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="casts" element={<Casts />} />
        <Route path="trace" element={<Trace />} />
        <Route path="work-orders" element={<WorkOrders />} />
        <Route path="admin/users" element={<AdminUsers />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
