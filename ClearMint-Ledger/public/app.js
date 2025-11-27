const state = {
  settings: { currency: '$', animations_enabled: true },
  categories: [],
  transactions: []
};

function $(selector, parent = document) { return parent.querySelector(selector); }
function $all(selector, parent = document) { return Array.from(parent.querySelectorAll(selector)); }

function formatCurrency(value) {
  return `${state.settings.currency} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function setActiveNav() {
  const path = location.pathname.split('/').pop();
  $all('.nav-links a').forEach((link) => {
    if (link.getAttribute('href').includes(path)) link.classList.add('active');
  });
}

function toggleAnimations(enabled) {
  document.body.classList.toggle('no-anim', !enabled);
}

function showToast(message, isError = false) {
  const el = document.createElement('div');
  el.textContent = message;
  el.style.position = 'fixed';
  el.style.bottom = '24px';
  el.style.right = '24px';
  el.style.padding = '12px 14px';
  el.style.background = isError ? '#e57373' : 'var(--primary)';
  el.style.color = '#fff';
  el.style.borderRadius = '12px';
  el.style.boxShadow = 'var(--shadow)';
  el.style.zIndex = 5000;
  el.style.opacity = '0';
  el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(-4px)'; });
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(4px)';
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

function bindModal(triggerSelector, modalId) {
  const trigger = $(triggerSelector);
  const backdrop = $(`#${modalId}`)?.closest('.modal-backdrop');
  if (!trigger || !backdrop) return;
  trigger.addEventListener('click', () => openModal(modalId));
  backdrop.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) closeModal(modalId);
  });
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  const backdrop = modal.closest('.modal-backdrop');
  backdrop.classList.add('show');
  requestAnimationFrame(() => modal.classList.add('show'));
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  const backdrop = modal.closest('.modal-backdrop');
  modal.classList.remove('show');
  setTimeout(() => backdrop.classList.remove('show'), 200);
}

async function loadSettings() {
  const res = await api.getSettings();
  state.settings = res.data || state.settings;
  toggleAnimations(Boolean(state.settings.animations_enabled));
  const currencyInputs = $all('[data-bind="currency"]');
  currencyInputs.forEach((input) => (input.value = state.settings.currency));
  const animToggle = $('[data-bind="animations"]');
  if (animToggle) animToggle.checked = Boolean(state.settings.animations_enabled);
}

async function loadCategories() {
  const res = await api.getCategories();
  state.categories = res.data || [];
  $all('[data-category-select]').forEach((select) => {
    select.innerHTML = '';
    state.categories.forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      select.appendChild(opt);
    });
  });
}

async function refreshTransactions(params = '') {
  const res = await api.getTransactions(params);
  state.transactions = res.data;
  renderTransactions();
}

function renderTransactions() {
  const tbody = $('#transactions-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  state.transactions.forEach((t) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date(t.date).toLocaleDateString()}</td>
      <td><span class="badge ${t.type}">${t.type}</span></td>
      <td>${formatCurrency(t.amount)}</td>
      <td><span class="chip" style="background:${t.category_color}1a;color:${t.category_color}">${t.category_name}</span></td>
      <td>${t.description}</td>
      <td class="flex">
        <button class="btn secondary" data-edit="${t.id}">Edit</button>
        <button class="btn danger" data-delete="${t.id}">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function getTransactionFormData(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  return {
    ...data,
    amount: parseFloat(data.amount),
    category_id: Number(data.category_id)
  };
}

function attachTransactionPage() {
  const form = $('#transaction-form');
  const filtersForm = $('#filters-form');
  const sortSelect = $('#sort');
  const searchInput = $('#search');
  const modalForm = $('#edit-transaction-form');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api.createTransaction(getTransactionFormData(form));
      form.reset();
      await refreshTransactions();
      showToast('Transaction added');
    } catch (err) { showToast(err.message, true); }
  });

  filtersForm?.addEventListener('input', () => {
    const params = new URLSearchParams(new FormData(filtersForm)).toString();
    refreshTransactions(params ? `?${params}` : '');
  });

  sortSelect?.addEventListener('change', () => {
    const params = new URLSearchParams(new FormData(filtersForm));
    params.set('sort', sortSelect.value);
    refreshTransactions(`?${params.toString()}`);
  });

  searchInput?.addEventListener('input', () => {
    const params = new URLSearchParams(new FormData(filtersForm));
    params.set('search', searchInput.value);
    refreshTransactions(`?${params.toString()}`);
  });

  $('#transactions-body')?.addEventListener('click', async (e) => {
    const editId = e.target.getAttribute('data-edit');
    const deleteId = e.target.getAttribute('data-delete');
    if (editId) {
      const txn = state.transactions.find((t) => t.id == editId);
      if (!txn) return;
      modalForm.dataset.id = txn.id;
      modalForm.type.value = txn.type;
      modalForm.amount.value = txn.amount;
      modalForm.category_id.value = txn.category_id;
      modalForm.date.value = txn.date;
      modalForm.description.value = txn.description;
      openModal('edit-transaction-modal');
    }
    if (deleteId) {
      if (confirm('Delete this transaction?')) {
        try {
          await api.deleteTransaction(deleteId);
          await refreshTransactions();
          showToast('Transaction deleted');
        } catch (err) { showToast(err.message, true); }
      }
    }
  });

  modalForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = modalForm.dataset.id;
    try {
      await api.updateTransaction(id, getTransactionFormData(modalForm));
      closeModal('edit-transaction-modal');
      await refreshTransactions();
      showToast('Transaction updated');
    } catch (err) { showToast(err.message, true); }
  });
}

async function loadDashboard() {
  const summaryIncome = $('#summary-income');
  if (!summaryIncome) return;
  const now = new Date();
  const report = await api.getMonthlyReport(now.getFullYear(), now.getMonth() + 1);
  const data = report.data;
  summaryIncome.textContent = formatCurrency(data.totals.income);
  $('#summary-expense').textContent = formatCurrency(data.totals.expense);
  $('#summary-net').textContent = formatCurrency(data.totals.net);
  $('#summary-highest').textContent = formatCurrency(data.totals.highestExpense);
  $('#summary-category').textContent = data.totals.mostUsedCategory || '—';
  $('#summary-average').textContent = formatCurrency(data.totals.averageDailySpending);

  chartManager.pie(
    'category-pie',
    data.categories.map((c) => c.name),
    data.categories.map((c) => c.expense || 0),
    data.categories.map((c) => c.color),
    'Spending by category'
  );

  chartManager.bar(
    'daily-bar',
    data.daily.map((d) => new Date(d.date).getDate()),
    data.daily.map((d) => d.expense || 0),
    'Daily spending'
  );
}

function attachCategoriesPage() {
  const form = $('#category-form');
  const list = $('#category-list');
  if (!form) return;

  function render() {
    list.innerHTML = '';
    state.categories.forEach((cat) => {
      const row = document.createElement('div');
      row.className = 'card flex';
      row.style.justifyContent = 'space-between';
      row.innerHTML = `
        <div class="flex">
          <span class="chip" style="background:${cat.color}1a;color:${cat.color}">● ${cat.name}</span>
        </div>
        <div class="flex">
          <button class="btn secondary" data-edit="${cat.id}">Rename</button>
          <button class="btn danger" data-delete="${cat.id}">Delete</button>
        </div>`;
      list.appendChild(row);
    });
    $all('[data-replacement]').forEach((select) => {
      select.innerHTML = '';
      state.categories.filter((c) => c.id !== Number(select.dataset.target)).forEach((cat) => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        select.appendChild(opt);
      });
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await api.createCategory(data);
      form.reset();
      await loadCategories();
      render();
      showToast('Category added');
    } catch (err) { showToast(err.message, true); }
  });

  list.addEventListener('click', async (e) => {
    const editId = e.target.getAttribute('data-edit');
    const deleteId = e.target.getAttribute('data-delete');
    if (editId) {
      const name = prompt('New category name:');
      const color = prompt('Hex color (e.g. #7bcfa7):');
      if (!name || !color) return;
      try {
        await api.updateCategory(editId, { name, color });
        await loadCategories();
        render();
        showToast('Category updated');
      } catch (err) { showToast(err.message, true); }
    }
    if (deleteId) {
      const needsReplacement = state.transactions.some((t) => t.category_id == deleteId);
      if (needsReplacement) {
        const replacement = state.categories.find((c) => c.id != deleteId);
        if (!replacement) return alert('Create another category first.');
        const replacementId = prompt(`Category in use. Enter replacement category ID (${replacement.id} is available):`, replacement.id);
        if (!replacementId) return;
        try {
          await api.deleteCategory(deleteId, replacementId);
          await Promise.all([loadCategories(), refreshTransactions()]);
          render();
          showToast('Category reassigned and deleted');
        } catch (err) { showToast(err.message, true); }
      } else if (confirm('Delete this category?')) {
        try {
          await api.deleteCategory(deleteId);
          await loadCategories();
          render();
          showToast('Category deleted');
        } catch (err) { showToast(err.message, true); }
      }
    }
  });

  render();
}

function attachReportsPage() {
  const monthSelect = $('#report-month');
  const yearSelect = $('#report-year');
  const yearlySelect = $('#report-yearly-select');
  const exportBtn = $('#export-report');
  if (!monthSelect) return;

  const now = new Date();
  for (let m = 1; m <= 12; m++) {
    monthSelect.append(new Option(m, m, m === now.getMonth() + 1));
  }
  for (let y = now.getFullYear(); y >= now.getFullYear() - 5; y--) {
    const opt = new Option(y, y, y === now.getFullYear());
    yearSelect.append(opt.cloneNode(true));
    yearlySelect.append(opt.cloneNode(true));
  }

  async function loadMonthly() {
    const data = await api.getMonthlyReport(yearSelect.value, monthSelect.value);
    const report = data.data;
    $('#monthly-total').textContent = formatCurrency(report.totals.expense);
    chartManager.pie('report-category', report.categories.map(c=>c.name), report.categories.map(c=>c.expense||0), report.categories.map(c=>c.color), 'Category Breakdown');
    chartManager.bar('report-daily', report.daily.map(d=>new Date(d.date).getDate()), report.daily.map(d=>d.expense||0), 'Daily trend');
    exportBtn.onclick = () => downloadJSON('monthly-report.json', report);
  }

  async function loadYearly() {
    const res = await api.getYearlyReport(yearlySelect.value);
    const report = res.data;
    $('#yearly-total').textContent = formatCurrency(report.totals.expense);
    chartManager.bar('report-yearly-chart', report.months.map(m=>m.month), report.months.map(m=>m.expense||0), 'Monthly totals');
    chartManager.pie('report-yearly-category', report.categories.map(c=>c.name), report.categories.map(c=>c.expense||0), report.categories.map(c=>c.color), 'Yearly category split');
  }

  monthSelect.addEventListener('change', loadMonthly);
  yearSelect.addEventListener('change', loadMonthly);
  yearlySelect.addEventListener('change', loadYearly);
  loadMonthly();
  loadYearly();
}

function attachSettingsPage() {
  const form = $('#settings-form');
  const backupBtn = $('#download-backup');
  const importInput = $('#import-backup');
  const resetBtn = $('#reset-data');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api.updateSettings({
        currency: form.currency.value,
        animations_enabled: form.animations.checked
      });
      await loadSettings();
      showToast('Settings saved');
    } catch (err) { showToast(err.message, true); }
  });

  backupBtn.addEventListener('click', async () => {
    const res = await api.backup();
    downloadJSON('clearmint-backup.json', res.data);
  });

  importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await api.importBackup(JSON.parse(reader.result));
        await Promise.all([loadSettings(), loadCategories(), refreshTransactions()]);
        showToast('Backup imported');
      } catch (err) { showToast(err.message, true); }
    };
    reader.readAsText(file);
  });

  resetBtn.addEventListener('click', async () => {
    if (confirm('This will erase all data. Continue?') && confirm('Really erase everything?')) {
      await api.resetData();
      await Promise.all([loadSettings(), loadCategories(), refreshTransactions()]);
      showToast('Data reset');
    }
  });
}

function downloadJSON(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

async function init() {
  setActiveNav();
  await loadSettings();
  await loadCategories();
  await refreshTransactions();
  loadDashboard();
  attachTransactionPage();
  attachCategoriesPage();
  attachReportsPage();
  attachSettingsPage();
}

document.addEventListener('DOMContentLoaded', init);
