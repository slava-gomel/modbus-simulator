import axios from "axios";

/**
 * Базовый клиент API с перехватчиком для обработки 401
 */
export const api = axios.create({
  baseURL: "/api"
});

api.interceptors.response.use(
  (response) => response,
  (err) => {
    if (err.response?.status === 401) {
      window.dispatchEvent(new CustomEvent("auth:required"));
    }
    return Promise.reject(err);
  }
);

/**
 * Установить учётные данные для базовой авторизации
 */
export function setAuth(username: string, password: string): void {
  api.defaults.auth = { username, password };
}
