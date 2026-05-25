import { api } from './client';

export const previewReport = (config: any) =>
  api.post('/reports/preview', config);

export const createReport = (config: any) =>
  api.post('/reports', config);

export const fetchReports = (params?: any) =>
  api.get('/reports', { params });

export const fetchReportById = (id: string) =>
  api.get(`/reports/${id}`);

export const deleteReport = (id: string) =>
  api.delete(`/reports/${id}`);
