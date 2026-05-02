import axios from "axios";
import { useAuthStore } from "@/store/useAuthStore";

const api = axios.create({
  baseURL: "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const { refreshToken, setAccessToken, logout } = useAuthStore.getState();
      if (refreshToken) {
        try {
          const res = await axios.post(
            "http://localhost:8080/api/auth/refresh",
            { refreshToken }
          );
          setAccessToken(res.data.accessToken);
          original.headers.Authorization = `Bearer ${res.data.accessToken}`;
          return api(original);
        } catch {
          logout();
        }
      } else {
        logout();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
