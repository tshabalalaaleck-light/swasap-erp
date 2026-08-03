import axios, { type InternalAxiosRequestConfig } from 'axios'

// Vite uses import.meta.env
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Get token from localStorage
const getToken = () => {
  return localStorage.getItem('token')
}

// Add token to every request automatically
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
