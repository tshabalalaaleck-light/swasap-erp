import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setSession } from "../lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.post("/api/auth/login", { email, password })//CORRECT
      setSession(data.accessToken, data.refreshToken, data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-full max-w-sm p-8">
        <h1 className="text-xl font-bold text-navy mb-1">SWASAP ERP</h1>
        <p className="text-sm text-slate-500 mb-6">Sign in to continue</p>

        {error && <div className="mb-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2">{error}</div>}

        <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-3 py-2 mb-4 text-sm" />

        <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded px-3 py-2 mb-6 text-sm" />

        <button type="submit" disabled={loading} className="w-full bg-orange text-white rounded py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
