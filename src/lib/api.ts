import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/useAuthStore";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

function isAuthEndpoint(url?: string) {
  return Boolean(url?.startsWith("/api/auth/"));
}

function decodeJwtPayload(token: string) {
  const [, payload] = token.split(".");
  if (!payload || typeof atob === "undefined") return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized)) as { exp?: number };
  } catch {
    return null;
  }
}

function isTokenExpiring(token: string) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;

  const refreshBufferMs = 30_000;
  return payload.exp * 1000 <= Date.now() + refreshBufferMs;
}

function setAuthHeader(config: InternalAxiosRequestConfig, token: string) {
  config.headers.set("Authorization", `Bearer ${token}`);
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const { refreshToken, setAccessToken, logout } = useAuthStore.getState();
    if (!refreshToken) {
      logout();
      return null;
    }

    try {
      const res = await axios.post(`${BASE_URL}/api/auth/refresh`, {
        refreshToken,
      });
      setAccessToken(res.data.accessToken);
      return res.data.accessToken as string;
    } catch {
      logout();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

api.interceptors.request.use(async (config) => {
  let token = useAuthStore.getState().accessToken;

  if (token && !isAuthEndpoint(config.url) && isTokenExpiring(token)) {
    token = await refreshAccessToken();
  }

  if (token) setAuthHeader(config, token);
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableRequestConfig | undefined;
    const status = error.response?.status;

    if (original && (status === 401 || status === 403) && !original._retry && !isAuthEndpoint(original.url)) {
      original._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        setAuthHeader(original, token);
        return api(original);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
