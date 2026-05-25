import { api } from './client';

export const fetchFactors = (params?: any) =>
  api.get('/factors', { params });

export const fetchFactorById = (id: string) =>
  api.get(`/factors/${id}`);

export const fetchFactorHistory = (id: string) =>
  api.get(`/factors/${id}/history`);

export const fetchRecommendedFactors = (params: any) =>
  api.get('/factors/recommended', { params });

export const createFactor = (data: any) =>
  api.post('/factors', data);

export const updateFactor = (id: string, data: any) =>
  api.put(`/factors/${id}`, data);

export const updateFactorStatus = (id: string, status: string) =>
  api.patch(`/factors/${id}/status`, { status });

export const deleteFactor = (id: string) =>
  api.delete(`/factors/${id}`);

export const importFactors = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/factors/import', form);
};
