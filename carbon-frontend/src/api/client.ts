import axios, { AxiosInstance } from 'axios';

export class ApiError extends Error {
  constructor(public code: number, message: string, public data?: any) {
    super(message);
  }
}

// The interceptors unwrap { code, data, message } → return `data` directly.
// So `api.get(...)` resolves to the inner `data` field, not AxiosResponse.
const _axios = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api/v1',
  timeout: 30000,
});

_axios.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers!.Authorization = `Bearer ${token}`;
  return cfg;
});

_axios.interceptors.response.use(
  (res) => {
    if (res.data.code !== 0) {
      throw new ApiError(res.data.code, res.data.message, res.data.data);
    }
    return res.data.data;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    const msg = err.response?.data?.message || err.message || '请求失败';
    return Promise.reject(new ApiError(err.response?.data?.code || 50001, msg));
  },
);

// Re-export as `api` with `any` typed returns to avoid type mismatches
export const api: any = _axios;
