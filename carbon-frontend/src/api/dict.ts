import { api } from './client';

export const fetchIndustries = () => api.get('/dict/industries');
export const fetchCategories = () => api.get('/dict/categories');
