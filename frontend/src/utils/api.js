// frontend/src/utils/api.js
import axios from "axios";

const RAW_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "https://med2-vgw1.onrender.com/";

// Always append `/api` safely
const BASE_URL = `${RAW_BASE}`.replace(/\/+$/, "") + "/api";

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Prevent stale 304-cached responses for counts/lists
API.interceptors.request.use((config) => {
  try {
    const token =
      (typeof window !== "undefined" && (localStorage.getItem("token") || sessionStorage.getItem("token"))) ||
      null;
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    // disable cache for GETs
    if ((config.method || "get").toLowerCase() === "get") {
      config.headers = { ...(config.headers || {}), "Cache-Control": "no-cache", Pragma: "no-cache" };
    }
    // helpful debug
    if (typeof window !== "undefined") {
      const auth = config.headers?.Authorization;
      const preview = auth ? `${auth.slice(0, 20)}…` : "(no auth)";
      console.debug("API ->", (config.method || "GET").toUpperCase(), config.baseURL + config.url, preview);
    }
  } catch {}
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401 || 403) console.warn("Auth error:", err?.response?.data || err.message);
    return Promise.reject(err);
  }
);

export const getAuthHeaders = () => {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default API;

export const loginUser = (role, data) => API.post(`/auth/${role}/login`, data);
export const registerUser = (role, data) => API.post(`/auth/${role}/register`, data);
