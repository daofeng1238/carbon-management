import { api } from './client';

export const fetchOrgTree = (depthLimit = 4) =>
  api.get('/organizations/tree', { params: { depthLimit } });

export const fetchOrgList = (params?: any) =>
  api.get('/organizations', { params });

export const fetchOrgById = (id: string) =>
  api.get(`/organizations/${id}`);

export const fetchOrgDescendants = (id: string) =>
  api.get(`/organizations/${id}/descendants`);

export const fetchOrgChildren = (id: string) =>
  api.get(`/organizations/${id}/children`);

export const createOrg = (data: any) =>
  api.post('/organizations', data);

export const updateOrg = (id: string, data: any) =>
  api.put(`/organizations/${id}`, data);

export const moveOrg = (id: string, newParentId: string) =>
  api.patch(`/organizations/${id}/move`, { newParentId });

export const deleteOrg = (id: string, cascade = false) =>
  api.delete(`/organizations/${id}`, { params: cascade ? { cascade: 'true' } : {} });
