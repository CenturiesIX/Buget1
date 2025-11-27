const api = {
  async request(path, options = {}) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || (err.errors && err.errors.join(', ')) || 'Request failed');
    }
    return res.json();
  },
  getTransactions(params = '') { return this.request(`/api/transactions${params}`); },
  createTransaction(data) { return this.request('/api/transactions', { method: 'POST', body: JSON.stringify(data) }); },
  updateTransaction(id, data) { return this.request(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteTransaction(id) { return this.request(`/api/transactions/${id}`, { method: 'DELETE' }); },

  getCategories() { return this.request('/api/categories'); },
  createCategory(data) { return this.request('/api/categories', { method: 'POST', body: JSON.stringify(data) }); },
  updateCategory(id, data) { return this.request(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteCategory(id, replacement) {
    const query = replacement ? `?replacement=${replacement}` : '';
    return this.request(`/api/categories/${id}${query}`, { method: 'DELETE' });
  },

  getMonthlyReport(year, month) {
    const params = [];
    if (year) params.push(`year=${year}`);
    if (month) params.push(`month=${month}`);
    const query = params.length ? `?${params.join('&')}` : '';
    return this.request(`/api/reports/monthly${query}`);
  },
  getYearlyReport(year) {
    const query = year ? `?year=${year}` : '';
    return this.request(`/api/reports/yearly${query}`);
  },

  getSettings() { return this.request('/api/settings'); },
  updateSettings(data) { return this.request('/api/settings', { method: 'PUT', body: JSON.stringify(data) }); },
  backup() { return this.request('/api/settings/backup', { method: 'POST' }); },
  importBackup(data) { return this.request('/api/settings/import', { method: 'POST', body: JSON.stringify(data) }); },
  resetData() { return this.request('/api/settings/reset', { method: 'POST', body: JSON.stringify({ confirm: true, confirmAgain: true }) }); }
};

window.api = api;
