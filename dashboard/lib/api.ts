import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ─── Request interceptor — attach JWT ────────────────────────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor — handle 401 ───────────────────────────────────────

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error: string }>) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ─── Typed API helpers ────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Bot {
  id: string;
  user_id: string;
  name: string;
  system_prompt: string;
  model: string;
  allowed_numbers: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionStatus {
  status: "disconnected" | "connecting" | "connected";
  phone: string | null;
  bot_id: string | null;
}

export interface MessageLog {
  id: string;
  from_number: string;
  message: string;
  reply: string | null;
  replied_at: string;
}

// Auth
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<{ token: string; user: User }>("/api/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post<{ token: string; user: User }>("/api/auth/login", data),
  me: () => api.get<{ user: User }>("/api/auth/me"),
};

// Bots
export const botsApi = {
  list: () => api.get<{ bots: Bot[] }>("/api/bots"),
  get: (id: string) => api.get<{ bot: Bot }>(`/api/bots/${id}`),
  create: (data: Omit<Bot, "id" | "user_id" | "is_active" | "created_at" | "updated_at">) =>
    api.post<{ bot: Bot }>("/api/bots", data),
  update: (
    id: string,
    data: Omit<Bot, "id" | "user_id" | "is_active" | "created_at" | "updated_at">
  ) => api.put<{ bot: Bot }>(`/api/bots/${id}`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/api/bots/${id}`),
  models: () =>
    api.get<{ models: { id: string; label: string }[] }>("/api/bots/meta/models"),
};

// WhatsApp
export const whatsappApi = {
  status: () => api.get<SessionStatus>("/api/whatsapp/status"),
  connect: (bot_id: string) =>
    api.post<{ message: string; ws_path: string }>("/api/whatsapp/connect", { bot_id }),
  disconnect: () => api.post("/api/whatsapp/disconnect"),
  changeBot: (bot_id: string) =>
    api.put("/api/whatsapp/bot", { bot_id }),
  logs: (limit = 50) =>
    api.get<{ logs: MessageLog[] }>(`/api/whatsapp/logs?limit=${limit}`),
};

export default api;
