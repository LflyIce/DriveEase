import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Customers
export const getCustomers = (params) => api.get('/customers', { params }).then((r) => r.data);
export const getCustomer = (id) => api.get(`/customers/${id}`).then((r) => r.data);
export const createCustomer = (data) => api.post('/customers', data).then((r) => r.data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data).then((r) => r.data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`).then((r) => r.data);

// Vehicles
export const getVehicles = (params) => api.get('/vehicles', { params }).then((r) => r.data);
export const getVehicle = (id) => api.get(`/vehicles/${id}`).then((r) => r.data);
export const createVehicle = (data) => api.post('/vehicles', data).then((r) => r.data);
export const updateVehicle = (id, data) => api.put(`/vehicles/${id}`, data).then((r) => r.data);
export const deleteVehicle = (id) => api.delete(`/vehicles/${id}`).then((r) => r.data);

// Policies
export const getPolicies = (params) => api.get('/policies', { params }).then((r) => r.data);
export const getPolicy = (id) => api.get(`/policies/${id}`).then((r) => r.data);
export const createPolicy = (data) => api.post('/policies', data).then((r) => r.data);
export const updatePolicy = (id, data) => api.put(`/policies/${id}`, data).then((r) => r.data);
export const updatePolicyStatus = (id, status) => api.patch(`/policies/${id}/status`, { status }).then((r) => r.data);
export const deletePolicy = (id) => api.delete(`/policies/${id}`).then((r) => r.data);

// Renewals
export const getRenewals = (params) => api.get('/renewals', { params }).then((r) => r.data);
export const getUpcomingRenewals = () => api.get('/renewals/upcoming').then((r) => r.data);
export const createRenewal = (data) => api.post('/renewals', data).then((r) => r.data);
export const updateRenewal = (id, data) => api.patch(`/renewals/${id}`, data).then((r) => r.data);
export const executeRenewal = (id, data) => api.post(`/renewals/${id}/renew`, data).then((r) => r.data);

// Stats
export const getDashboardStats = () => api.get('/stats/dashboard').then((r) => r.data);

// Users
export const getUsers = (params) => api.get('/users', { params }).then((r) => r.data);
export const getUser = (id) => api.get(`/users/${id}`).then((r) => r.data);
export const createUser = (data) => api.post('/users', data).then((r) => r.data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data).then((r) => r.data);
export const deleteUser = (id) => api.delete(`/users/${id}`).then((r) => r.data);

// Logs
export const getLogs = (params) => api.get('/logs', { params }).then((r) => r.data);

// Commercial insurance types
export const getCommercialInsuranceTypes = (params) => api.get('/commercial-insurance-types', { params }).then((r) => r.data);
export const createCommercialInsuranceType = (data) => api.post('/commercial-insurance-types', data).then((r) => r.data);
export const updateCommercialInsuranceType = (id, data) => api.put(`/commercial-insurance-types/${id}`, data).then((r) => r.data);
export const deleteCommercialInsuranceType = (id) => api.delete(`/commercial-insurance-types/${id}`).then((r) => r.data);

// Compulsory insurance types
export const getCompulsoryInsuranceTypes = (params) => api.get('/compulsory-insurance-types', { params }).then((r) => r.data);
export const createCompulsoryInsuranceType = (data) => api.post('/compulsory-insurance-types', data).then((r) => r.data);
export const updateCompulsoryInsuranceType = (id, data) => api.put(`/compulsory-insurance-types/${id}`, data).then((r) => r.data);
export const deleteCompulsoryInsuranceType = (id) => api.delete(`/compulsory-insurance-types/${id}`).then((r) => r.data);

// Insurance companies
export const getInsuranceCompanies = (params) => api.get('/insurance-companies', { params }).then((r) => r.data);
export const createInsuranceCompany = (data) => api.post('/insurance-companies', data).then((r) => r.data);
export const updateInsuranceCompany = (id, data) => api.put(`/insurance-companies/${id}`, data).then((r) => r.data);
export const deleteInsuranceCompany = (id) => api.delete(`/insurance-companies/${id}`).then((r) => r.data);
