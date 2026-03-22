import api from './axios';

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
};

export const companyAPI = {
  get:    ()     => api.get('/companies/me'),
  update: (data) => api.put('/companies/me', data),
};

export const accountAPI = {
  list:   ()          => api.get('/accounts'),
  create: (data)      => api.post('/accounts', data),
  update: (id, data)  => api.put(`/accounts/${id}`, data),
  delete: (id)        => api.delete(`/accounts/${id}`),
};

export const transactionAPI = {
  list:   (params)    => api.get('/transactions', { params }),
  create: (data)      => api.post('/transactions', data),
  void:   (id)        => api.delete(`/transactions/${id}`),
};

export const reportAPI = {
  trialBalance: (params) => api.get('/reports/trial-balance', { params }),
  profitLoss:   (params) => api.get('/reports/profit-loss', { params }),
  balanceSheet: (params) => api.get('/reports/balance-sheet', { params }),
  dashboard:    ()       => api.get('/reports/dashboard'),
};

export const taxAPI = {
  compute:    (data)   => api.post('/tax/compute', data),
  history:    ()       => api.get('/tax/computations'),
  getByYear:  (year)   => api.get(`/tax/computation/${year}`),
  calcCIT:    (data)   => api.post('/tax/calculate/cit',              data),
  calcSST:    (data)   => api.post('/tax/calculate/sst',              data),
  calcWHT:    (data)   => api.post('/tax/calculate/withholding',      data),
  calcCA:     (data)   => api.post('/tax/calculate/capital-allowance',data),
  calcCGT:    (data)   => api.post('/tax/calculate/cgt',              data),
  calcGMT:    (data)   => api.post('/tax/calculate/gmt',              data),
};

export const payrollAPI = {
  listEmployees:  ()         => api.get('/employees'),
  createEmployee: (data)     => api.post('/employees', data),
  updateEmployee: (id, data) => api.put(`/employees/${id}`, data),
  preview:        (data)     => api.post('/payroll/preview', data),
  run:            (data)     => api.post('/payroll/run', data),
  listRuns:       ()         => api.get('/payroll/runs'),
  getRun:         (id)       => api.get(`/payroll/runs/${id}`),
  approveRun:     (id)       => api.put(`/payroll/runs/${id}/approve`),
};

export const invoiceAPI = {
  list:         (params)     => api.get('/invoices', { params }),
  get:          (id)         => api.get(`/invoices/${id}`),
  create:       (data)       => api.post('/invoices', data),
  updateStatus: (id, status) => api.put(`/invoices/${id}/status`, { status }),
};

export const customerAPI = {
  list:   ()          => api.get('/customers'),
  create: (data)      => api.post('/customers', data),
  update: (id, data)  => api.put(`/customers/${id}`, data),
};

export const expenseAPI = {
  list:    (params) => api.get('/expenses', { params }),
  create:  (data)   => api.post('/expenses', data),
  approve: (id)     => api.put(`/expenses/${id}/approve`),
};

export const assetAPI = {
  list:   ()          => api.get('/assets'),
  create: (data)      => api.post('/assets', data),
  getCA:  (id, year)  => api.get(`/assets/${id}/capital-allowance/${year}`),
};

export const einvoiceAPI = {
  list:   ()    => api.get('/einvoices'),
  submit: (id)  => api.post(`/einvoices/submit/${id}`),
  status: (uuid)=> api.get(`/einvoices/status/${uuid}`),
};

export const aiAPI = {
  categorize: (data)  => api.post('/ai/categorize', data),
  optimize:   (data)  => api.post('/ai/optimize', data),
  predict:    ()      => api.post('/ai/predict'),
};

export const deadlineAPI = {
  list:         (params) => api.get('/deadlines', { params }),
  create:       (data)   => api.post('/deadlines', data),
  complete:     (id)     => api.put(`/deadlines/${id}/complete`),
  seedStandard: (data)   => api.post('/deadlines/seed-standard', data),
};
