import { api } from './client';

export const fetchEntries = (params?: any) =>
  api.get('/entries', { params });

export const fetchEntrySummary = (params?: any) =>
  api.get('/entries/summary', { params });

export const fetchEntryById = (id: string) =>
  api.get(`/entries/${id}`);

export const createEntry = (data: any) =>
  api.post('/entries', data);

export const updateEntry = (id: string, data: any) =>
  api.put(`/entries/${id}`, data);

export const deleteEntry = (id: string) =>
  api.delete(`/entries/${id}`);

export const submitEntry = (id: string) =>
  api.post(`/entries/${id}/submit`);

export const approveEntry = (id: string) =>
  api.post(`/entries/${id}/approve`);

export const rejectEntry = (id: string, reason: string) =>
  api.post(`/entries/${id}/reject`, { reason });

export const importEntries = (file: File, options: any) => {
  const form = new FormData();
  form.append('file', file);
  Object.entries(options).forEach(([k, v]) => form.append(k, String(v)));
  return api.post('/entries/import', form);
};
