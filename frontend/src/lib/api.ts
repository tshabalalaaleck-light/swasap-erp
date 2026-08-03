import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to every request automatically
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


function getToken() {
  return localStorage.getItem("accessToken");
}

function getToken() {
  return localStorage.getItem("accessToken");
}

export function setSession(accessToken: string, refreshToken: string, user: any) {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

export function getUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 && token) {
    const refreshed = await tryRefresh();
    if (refreshed) return request(path, options);
    clearSession();
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { status: res.status, data });
  return data;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem("accessToken", data.accessToken);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: unknown) => request(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: (path: string, body?: unknown) => request(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: (path: string) => request(path, { method: "DELETE" }),
};

export function connectRealtime(onMessage: (type: string, payload: unknown) => void) {
  const wsUrl = API_URL.replace(/^http/, "ws") + "/ws";
  const socket = new WebSocket(wsUrl);
  socket.onmessage = (event) => {
    try {
      const { type, payload } = JSON.parse(event.data);
      onMessage(type, payload);
    } catch {
      /* ignore malformed frames */
    }
  };
  return socket;
}
