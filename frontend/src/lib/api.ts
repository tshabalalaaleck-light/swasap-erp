import axios from 'axios';

const API_URL = "https://swasap-erp-backend-q5gw.onrender.com"; // <-- CHANGE LINE 3 TO THIS

export const api = axios.create({
  baseURL: API_URL, // https://swasap-erp-backend-q5gw.onrender.com
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
