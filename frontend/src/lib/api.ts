import axios, { type InternalAxiosRequestConfig } from 'axios'

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to every request automatically
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function getToken() {
  return localStorage.getItem("accessToken");
}

// Keep your existing functions below, but make sure you DON'T have another "api" or duplicate "getUser"
export function setSession(token: string) {
  localStorage.setItem("accessToken", token);
}

export function clearSession() {
  localStorage.removeItem("accessToken");
}

export function getUser() {
  const token = getToken();
  if (!token) return null;
  // ... your decode logic
}
