import { api } from './client';

export const fetchDashboardOverview = (params: any) =>
  api.get('/dashboard/overview', { params });

export const fetchDashboardTrend = (params: any) =>
  api.get('/dashboard/trend', { params });
