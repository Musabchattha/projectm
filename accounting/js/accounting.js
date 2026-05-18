/* ===== NipponAuto Uganda — Accounting Panel JS ===== */
'use strict';

// ===== AUTH =====
const AUTH = {
  USERS: [
    { user: 'accountant', pass: 'nippon@acc', role: 'Accountant' },
    { user: 'admin', pass: 'nippon2025', role: 'Super Admin' }
  ],
  KEY: 'nau_acc_session',
  login(u, p) {
    const found = this.USERS.find(x => x.user === u && x.pass === p);
    if (found) {
      sessionStorage.setItem(this.KEY, JSON.stringify({ user: u, role: found.role }));
      return found;
    }
    return null;
  },
  logout() { sessionStorage.removeItem(this.KEY); },
  isLoggedIn() { return !!sessionStorage.getItem(this.KEY); },
  getSession() { try { return JSON.parse(sessionStorage.getItem(this.KEY)); } catch { return null; } }
};

// ===== DATA STORE =====
const DB = {
  load(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  loadObj(key, def) { try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; } },
  save(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
  nextId(key) {
    const items = this.load(key);
    return items.length ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
  }
};

// ===== UTILITIES =====
function toast(msg, dur = 3000) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, dur);
}

function fmtDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateShort(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US');
}

function nowISO() { return new Date().toISOString(); }

function fmtMoney(n, curr) {
  const num = Number(n || 0);
  const sym = curr === 'UGX' ? 'UGX ' : curr === 'KES' ? 'KES ' : curr === 'EUR' ? '€' : '$';
  return sym + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ===== NUMBER GENERATORS =====
function genInvoiceNo() {
  const inv = DB.load('nau_invoices');
  const yr = new Date().getFullYear();
  const seq = String(inv.length + 1).padStart(3, '0');
  return `INV-${yr}-${seq}`;
}
function genBillNo() {
  const bills = DB.load('nau_bills');
  const yr = new Date().getFullYear();
  const seq = String(bills.length + 1).padStart(3, '0');
  return `BILL-${yr}-${seq}`;
}
function genPaymentNo() {
  const pmts = DB.load('nau_payments');
  const yr = new Date().getFullYear();
  const seq = String(pmts.length + 1).padStart(3, '0');
  return `PMT-${yr}-${seq}`;
}
function genReceiptNo() {
  const recs = DB.load('nau_receipts');
  const yr = new Date().getFullYear();
  const seq = String(recs.length + 1).padStart(3, '0');
  return `REC-${yr}-${seq}`;
}

// ===== PAYMENT ACCOUNTS =====
function getActiveAccounts() {
  return DB.load('nau_payment_accounts').filter(a => a.status === 'Active');
}

function accountOptions(selectedName) {
  const accts = getActiveAccounts();
  if (!accts.length) {
    return `<option value="Cash USD" ${selectedName === 'Cash USD' ? 'selected' : ''}>Cash USD</option>
            <option value="Cash UGX" ${selectedName === 'Cash UGX' ? 'selected' : ''}>Cash UGX</option>`;
  }
  return accts.map(a =>
    `<option value="${a.name}" ${a.name === selectedName ? 'selected' : ''}>${a.name} (${a.currency})</option>`
  ).join('');
}

function accountFilterOptions() {
  const accts = DB.load('nau_payment_accounts');
  return '<option value="">All Accounts</option>' + accts.map(a =>
    `<option value="${a.name}">${a.name}</option>`
  ).join('');
}

// ===== VEHICLE HELPERS =====
function markVehicleSold(vehicleId) {
  const vehs = DB.load('nau_vehicles');
  const v = vehs.find(v => v.id === vehicleId);
  if (v) { v.status = 'SOLD'; v.soldAt = nowISO(); DB.save('nau_vehicles', vehs); }
}

function archiveOldSoldVehicles() {
  const vehs = DB.load('nau_vehicles');
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  let count = 0;
  vehs.forEach(v => {
    if ((v.status === 'SOLD' || v.status === 'Sold') && v.soldAt) {
      if (now - new Date(v.soldAt).getTime() > thirtyDays) { v.status = 'ARCHIVED'; count++; }
    }
  });
  if (count) { DB.save('nau_vehicles', vehs); toast(`${count} sold vehicle(s) archived.`); }
}

// ===== STATUS BADGES =====
function invStatusBadge(status) {
  const map = { 'Draft': 'badge-draft', 'Sent': 'badge-sent', 'Partially Paid': 'badge-partial', 'Paid': 'badge-paid', 'Cancelled': 'badge-cancelled' };
  return `<span class="badge ${map[status] || 'badge-draft'}">${status || '-'}</span>`;
}

function billStatusBadge(status) {
  const map = { 'Pending': 'badge-pending', 'Paid': 'badge-paid', 'Overdue': 'badge-overdue', 'Cancelled': 'badge-cancelled' };
  return `<span class="badge ${map[status] || 'badge-pending'}">${status || '-'}</span>`;
}

// ===== ROUTER =====
let currentPage = 'dashboard';

function navigate(page) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  currentPage = page;

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  // Render page
  const renders = {
    dashboard: renderDashboard,
    invoices: renderInvoices,
    bills: renderBills,
    payments: renderPayments,
    receipts: renderReceipts,
    accounts: renderAccounts,
    reports: () => { showReportTab('pnl'); }
  };
  if (renders[page]) renders[page]();

  // Close mobile sidebar
  closeMobileSidebar();
}

// ===== MODAL =====
let _modalType = null;
let _editId = null;
let _modalSaveOverride = null;

function openModal(type, id) {
  _modalType = type;
  _editId = id || null;
  _modalSaveOverride = null;
  const cfg = modalConfigs[type];
  if (!cfg) return;
  const data = id ? cfg.getData(id) : null;
  document.getElementById('modalTitle').textContent = (id ? 'Edit ' : (cfg.createLabel || 'Add ')) + cfg.label;
  document.getElementById('modalBody').innerHTML = cfg.form(data);
  document.getElementById('modalSaveBtn').textContent = cfg.saveBtnLabel || 'Save';
  document.getElementById('modalBackdrop').classList.add('open');
  if (cfg.onOpen) cfg.onOpen(data);
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('open');
  _modalType = null;
  _editId = null;
  _modalSaveOverride = null;
  document.getElementById('modalSaveBtn').onclick = submitModal;
}

function submitModal() {
  if (_modalSaveOverride) { _modalSaveOverride(); return; }
  const cfg = modalConfigs[_modalType];
  if (!cfg) return;
  const data = cfg.collect();
  if (!data) return;
  if (_editId) {
    cfg.update(_editId, data);
    toast('Updated successfully');
  } else {
    cfg.create(data);
    toast('Created successfully');
  }
  closeModal();
  if (cfg.refresh) cfg.refresh();
}

function deleteItem(key, id, refresh) {
  if (!confirm('Are you sure you want to delete this item?')) return;
  DB.save(key, DB.load(key).filter(x => x.id !== id));
  toast('Deleted');
  if (refresh) refresh();
}

// ===== MODAL CONFIGS =====
const modalConfigs = {
  invoice: {
    label: 'Invoice',
    createLabel: 'Create ',
    getData: id => DB.load('nau_invoices').find(i => i.id === id),
    form: d => {
      const vehs = DB.load('nau_vehicles').filter(v => v.status === 'Published' || (d && d.vehicleId === v.id));
      return `
      <div class="form-row full">
        <div class="form-group">
          <label>Vehicle <span class="required">*</span></label>
          <select class="form-control" id="inv-veh" onchange="onVehicleChange()">
            <option value="">-- Select Vehicle --</option>
            ${vehs.map(v => `<option value="${v.id}" data-price="${v.priceUSD}" ${d && d.vehicleId === v.id ? 'selected' : ''}>${v.sku || ''} — ${v.make || ''} ${v.model || ''} ${v.year || ''} — ${fmtMoney(v.priceUSD)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Customer Name <span class="required">*</span></label>
          <input class="form-control" id="inv-cust-name" value="${d ? d.customerName || '' : ''}" />
        </div>
        <div class="form-group">
          <label>Customer Email</label>
          <input class="form-control" id="inv-cust-email" value="${d ? d.customerEmail || '' : ''}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Customer Phone</label>
          <input class="form-control" id="inv-cust-phone" value="${d ? d.customerPhone || '' : ''}" />
        </div>
        <div class="form-group">
          <label>Due Date</label>
          <input class="form-control" type="date" id="inv-due" value="${d ? d.dueDate || '' : ''}" />
        </div>
      </div>
      <div class="form-row full">
        <div class="form-group">
          <label>Customer Address</label>
          <textarea class="form-control" id="inv-cust-addr" rows="2">${d ? d.customerAddress || '' : ''}</textarea>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Sale Price (USD) <span class="required">*</span></label>
          <input class="form-control" type="number" id="inv-sale-price" value="${d ? d.salePrice || '' : ''}" step="0.01" min="0" />
        </div>
        <div class="form-group">
          <label>Discount (USD)</label>
          <input class="form-control" type="number" id="inv-discount" value="${d ? d.discount || 0 : 0}" step="0.01" min="0" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Include 18% VAT</label>
          <label class="toggle-switch" style="margin-top:.4rem">
            <input type="checkbox" id="inv-tax" ${d && d.taxRate ? 'checked' : ''}>
            <span class="toggle-slider"></span>
            <span>Include VAT (18%)</span>
          </label>
        </div>
        <div class="form-group">
          <label>Payment Account</label>
          <select class="form-control" id="inv-pay-acct">${accountOptions(d && d.paymentMethod)}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Status</label>
          <select class="form-control" id="inv-status">
            <option value="Draft" ${!d || d.status === 'Draft' ? 'selected' : ''}>Draft</option>
            <option value="Sent" ${d && d.status === 'Sent' ? 'selected' : ''}>Sent</option>
          </select>
        </div>
      </div>
      <div class="form-row full">
        <div class="form-group">
          <label>Notes</label>
          <textarea class="form-control" id="inv-notes" rows="2">${d ? d.notes || '' : ''}</textarea>
        </div>
      </div>`;
    },
    onOpen: () => { setTimeout(() => { if (document.getElementById('inv-veh')) onVehicleChange(); }, 50); },
    collect: () => {
      const vehicleId = Number(document.getElementById('inv-veh').value);
      const customerName = document.getElementById('inv-cust-name').value.trim();
      const salePrice = parseFloat(document.getElementById('inv-sale-price').value) || 0;
      if (!vehicleId) { toast('Vehicle is required'); return null; }
      if (!customerName) { toast('Customer Name is required'); return null; }
      if (!salePrice) { toast('Sale Price is required'); return null; }
      const discount = parseFloat(document.getElementById('inv-discount').value) || 0;
      const includeTax = document.getElementById('inv-tax').checked;
      const taxRate = includeTax ? 18 : 0;
      const taxable = salePrice - discount;
      const taxAmount = includeTax ? Math.round(taxable * 0.18 * 100) / 100 : 0;
      const totalAmount = Math.round((taxable + taxAmount) * 100) / 100;
      const vehs = DB.load('nau_vehicles');
      const veh = vehs.find(v => v.id === vehicleId);
      const status = document.getElementById('inv-status').value;
      return {
        vehicleId, vehicleName: veh ? `${veh.make} ${veh.model} ${veh.year}` : '',
        vehicleSKU: veh ? veh.sku : '',
        customerName, customerEmail: document.getElementById('inv-cust-email').value,
        customerPhone: document.getElementById('inv-cust-phone').value,
        customerAddress: document.getElementById('inv-cust-addr').value,
        salePrice, discount, taxRate, taxAmount, totalAmount, paidAmount: 0,
        currency: 'USD', paymentMethod: document.getElementById('inv-pay-acct').value,
        status, dueDate: document.getElementById('inv-due').value,
        notes: document.getElementById('inv-notes').value
      };
    },
    create: d => {
      const all = DB.load('nau_invoices');
      const inv = { id: DB.nextId('nau_invoices'), invoiceNo: genInvoiceNo(), ...d, createdAt: nowISO() };
      all.push(inv);
      DB.save('nau_invoices', all);
      if (d.status === 'Sent') markVehicleSold(d.vehicleId);
    },
    update: (id, d) => {
      const all = DB.load('nau_invoices');
      const i = all.findIndex(x => x.id === id);
      if (i > -1) { all[i] = { ...all[i], ...d }; DB.save('nau_invoices', all); }
      if (d.status === 'Sent') markVehicleSold(d.vehicleId);
    },
    refresh: renderInvoices
  },

  bill: {
    label: 'Bill',
    createLabel: 'Add ',
    getData: id => DB.load('nau_bills').find(b => b.id === id),
    form: d => {
      const vehs = DB.load('nau_vehicles');
      return `
      <div class="form-row">
        <div class="form-group">
          <label>Vendor / Supplier <span class="required">*</span></label>
          <input class="form-control" id="bill-vendor" value="${d ? d.vendor || '' : ''}" />
        </div>
        <div class="form-group">
          <label>Category <span class="required">*</span></label>
          <select class="form-control" id="bill-category">
            ${['Vehicle Purchase', 'Freight', 'Insurance', 'Maintenance', 'Salaries', 'Utilities', 'Office Supplies', 'Other'].map(c => `<option ${d && d.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row full">
        <div class="form-group">
          <label>Related Vehicle (optional)</label>
          <select class="form-control" id="bill-veh-id">
            <option value="">-- None --</option>
            ${vehs.map(v => `<option value="${v.id}" ${d && d.vehicleId === v.id ? 'selected' : ''}>${v.make} ${v.model} ${v.year}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row full">
        <div class="form-group">
          <label>Description</label>
          <textarea class="form-control" id="bill-desc" rows="2">${d ? d.description || '' : ''}</textarea>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Amount (USD) <span class="required">*</span></label>
          <input class="form-control" type="number" id="bill-amount" value="${d ? d.amount || '' : ''}" step="0.01" min="0" />
        </div>
        <div class="form-group">
          <label>Due Date</label>
          <input class="form-control" type="date" id="bill-due" value="${d ? d.dueDate || '' : ''}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Status</label>
          <select class="form-control" id="bill-status-sel">
            <option value="Pending" ${!d || d.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Paid" ${d && d.status === 'Paid' ? 'selected' : ''}>Paid</option>
          </select>
        </div>
        <div class="form-group">
          <label>Payment Account</label>
          <select class="form-control" id="bill-pay-acct">${accountOptions(d && d.paymentMethod)}</select>
        </div>
      </div>
      <div class="form-row full">
        <div class="form-group">
          <label>Notes</label>
          <textarea class="form-control" id="bill-notes" rows="2">${d ? d.notes || '' : ''}</textarea>
        </div>
      </div>`;
    },
    collect: () => {
      const vendor = document.getElementById('bill-vendor').value.trim();
      const amount = parseFloat(document.getElementById('bill-amount').value) || 0;
      if (!vendor) { toast('Vendor is required'); return null; }
      if (!amount) { toast('Amount is required'); return null; }
      const vehId = Number(document.getElementById('bill-veh-id').value) || null;
      const vehs = DB.load('nau_vehicles');
      const veh = vehId ? vehs.find(v => v.id === vehId) : null;
      return {
        vendor, category: document.getElementById('bill-category').value,
        vehicleId: vehId, vehicleName: veh ? `${veh.make} ${veh.model} ${veh.year}` : null,
        description: document.getElementById('bill-desc').value,
        amount, currency: 'USD', dueDate: document.getElementById('bill-due').value,
        status: document.getElementById('bill-status-sel').value,
        paymentMethod: document.getElementById('bill-pay-acct').value,
        notes: document.getElementById('bill-notes').value
      };
    },
    create: d => {
      const all = DB.load('nau_bills');
      all.push({ id: DB.nextId('nau_bills'), billNo: genBillNo(), ...d, createdAt: nowISO() });
      DB.save('nau_bills', all);
    },
    update: (id, d) => {
      const all = DB.load('nau_bills');
      const i = all.findIndex(b => b.id === id);
      if (i > -1) { all[i] = { ...all[i], ...d }; DB.save('nau_bills', all); }
    },
    refresh: renderBills
  },

  account: {
    label: 'Payment Account',
    getData: id => DB.load('nau_payment_accounts').find(a => a.id === id),
    form: d => `
      <div class="form-row">
        <div class="form-group">
          <label>Account Name <span class="required">*</span></label>
          <input class="form-control" id="pa-name" value="${d ? d.name || '' : ''}" placeholder="e.g. Stanbic USD" />
        </div>
        <div class="form-group">
          <label>Type <span class="required">*</span></label>
          <select class="form-control" id="pa-type">
            ${['Bank', 'Cash', 'Mobile Money', 'Cheque'].map(t => `<option ${d && d.type === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Currency <span class="required">*</span></label>
          <select class="form-control" id="pa-currency">
            <option value="USD" ${d && d.currency === 'USD' ? 'selected' : ''}>USD — US Dollar</option>
            <option value="UGX" ${d && d.currency === 'UGX' ? 'selected' : ''}>UGX — Uganda Shilling</option>
            <option value="KES" ${d && d.currency === 'KES' ? 'selected' : ''}>KES — Kenya Shilling</option>
            <option value="EUR" ${d && d.currency === 'EUR' ? 'selected' : ''}>EUR — Euro</option>
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select class="form-control" id="pa-status">
            <option value="Active" ${!d || d.status === 'Active' ? 'selected' : ''}>Active</option>
            <option value="Inactive" ${d && d.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Bank / Provider Name</label>
        <input class="form-control" id="pa-bank" value="${d ? d.bankName || '' : ''}" placeholder="e.g. Stanbic Bank Uganda" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Account Number</label>
          <input class="form-control" id="pa-acctno" value="${d ? d.accountNumber || '' : ''}" />
        </div>
        <div class="form-group">
          <label>Account Holder</label>
          <input class="form-control" id="pa-holder" value="${d ? d.accountHolder || '' : ''}" placeholder="e.g. NipponAuto Uganda Ltd" />
        </div>
      </div>`,
    collect: () => {
      const name = document.getElementById('pa-name').value.trim();
      if (!name) { toast('Account name is required'); return null; }
      return {
        name,
        type: document.getElementById('pa-type').value,
        currency: document.getElementById('pa-currency').value,
        status: document.getElementById('pa-status').value,
        bankName: document.getElementById('pa-bank').value.trim(),
        accountNumber: document.getElementById('pa-acctno').value.trim(),
        accountHolder: document.getElementById('pa-holder').value.trim()
      };
    },
    create: d => {
      const all = DB.load('nau_payment_accounts');
      all.push({ id: DB.nextId('nau_payment_accounts'), ...d, createdAt: nowISO() });
      DB.save('nau_payment_accounts', all);
    },
    update: (id, d) => {
      const all = DB.load('nau_payment_accounts');
      const i = all.findIndex(a => a.id === id);
      if (i > -1) { all[i] = { ...all[i], ...d }; DB.save('nau_payment_accounts', all); }
    },
    refresh: renderAccounts
  }
};

// Vehicle change handler for invoice modal
function onVehicleChange() {
  const sel = document.getElementById('inv-veh');
  if (!sel) return;
  const opt = sel.options[sel.selectedIndex];
  const price = opt ? opt.dataset.price : '';
  const priceEl = document.getElementById('inv-sale-price');
  if (priceEl && price) priceEl.value = price;
}

// ===== DASHBOARD =====
function renderDashboard() {
  const invoices = DB.load('nau_invoices');
  const bills = DB.load('nau_bills');

  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const totalExpenses = bills.filter(b => b.status === 'Paid').reduce((s, b) => s + Number(b.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const outstanding = invoices.filter(i => ['Draft', 'Sent', 'Partially Paid'].includes(i.status))
    .reduce((s, i) => s + (Number(i.totalAmount || 0) - Number(i.paidAmount || 0)), 0);

  // Stat cards
  document.getElementById('stat-revenue').textContent = '$' + totalRevenue.toLocaleString();
  document.getElementById('stat-expenses').textContent = '$' + totalExpenses.toLocaleString();
  document.getElementById('stat-profit').textContent = '$' + netProfit.toLocaleString();
  document.getElementById('stat-outstanding').textContent = '$' + outstanding.toLocaleString();

  // Recent Invoices table
  const recentInv = [...invoices].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
  document.getElementById('dash-inv-tbody').innerHTML = recentInv.length
    ? recentInv.map(inv => `<tr>
        <td><strong>${inv.invoiceNo}</strong></td>
        <td>${inv.customerName}</td>
        <td style="font-size:.78rem">${inv.vehicleName || '-'}</td>
        <td class="amount-mono">${fmtMoney(inv.totalAmount)}</td>
        <td>${invStatusBadge(inv.status)}</td>
        <td>${fmtDate(inv.createdAt)}</td>
      </tr>`).join('')
    : '<tr><td colspan="6" class="table-empty"><span class="empty-icon">🧾</span>No invoices yet</td></tr>';

  // Recent Bills table
  const recentBills = [...bills].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
  document.getElementById('dash-bill-tbody').innerHTML = recentBills.length
    ? recentBills.map(b => `<tr>
        <td><strong>${b.billNo}</strong></td>
        <td>${b.vendor}</td>
        <td><span class="badge badge-draft">${b.category || '-'}</span></td>
        <td class="amount-mono">${fmtMoney(b.amount)}</td>
        <td>${billStatusBadge(b.status)}</td>
        <td>${fmtDate(b.createdAt)}</td>
      </tr>`).join('')
    : '<tr><td colspan="6" class="table-empty"><span class="empty-icon">📋</span>No bills yet</td></tr>';

  // Monthly chart
  renderMonthlyChart('dash-monthly-chart', invoices, bills);
}

function renderMonthlyChart(containerId, invoices, bills) {
  const chartEl = document.getElementById(containerId);
  if (!chartEl) return;

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({ label: d.toLocaleString('en-US', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() });
  }

  const rows = months.map(m => {
    const rev = invoices.filter(i => {
      const dt = new Date(i.paidAt || i.createdAt);
      return i.status === 'Paid' && dt.getFullYear() === m.year && dt.getMonth() === m.month;
    }).reduce((s, i) => s + Number(i.totalAmount || 0), 0);

    const exp = bills.filter(b => {
      const dt = new Date(b.paidAt || b.createdAt);
      return b.status === 'Paid' && dt.getFullYear() === m.year && dt.getMonth() === m.month;
    }).reduce((s, b) => s + Number(b.amount || 0), 0);

    return { label: m.label, rev, exp };
  });

  const maxVal = Math.max(...rows.map(r => Math.max(r.rev, r.exp)), 1);

  chartEl.innerHTML = `
    <div class="chart-legend">
      <span><span class="legend-dot" style="background:#10b981"></span>Revenue</span>
      <span><span class="legend-dot" style="background:#c0392b"></span>Expenses</span>
    </div>
    <div class="bar-chart-wrap">
      ${rows.map(r => `
        <div class="bar-row">
          <div class="bar-label">${r.label}</div>
          <div class="bar-tracks">
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round(r.rev / maxVal * 100)}%;background:#10b981"></div></div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round(r.exp / maxVal * 100)}%;background:#c0392b"></div></div>
          </div>
          <div class="bar-values">
            <div class="bar-val" style="color:#10b981">$${Math.round(r.rev / 1000)}K</div>
            <div class="bar-val" style="color:#c0392b">$${Math.round(r.exp / 1000)}K</div>
          </div>
        </div>`).join('')}
    </div>`;
}

// ===== INVOICES =====
function renderInvoices() {
  const q = (document.getElementById('inv-search') || {}).value || '';
  const st = (document.getElementById('inv-status-filter') || {}).value || '';
  const from = (document.getElementById('inv-date-from') || {}).value || '';
  const to = (document.getElementById('inv-date-to') || {}).value || '';

  let data = DB.load('nau_invoices').filter(inv => {
    const matchQ = !q || (inv.invoiceNo + inv.customerName + (inv.vehicleName || '')).toLowerCase().includes(q.toLowerCase());
    const matchSt = !st || inv.status === st;
    const matchFrom = !from || inv.createdAt >= from;
    const matchTo = !to || inv.createdAt <= to + 'T23:59:59Z';
    return matchQ && matchSt && matchFrom && matchTo;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const countEl = document.getElementById('inv-count');
  if (countEl) countEl.textContent = `${data.length} invoice${data.length !== 1 ? 's' : ''}`;

  const tbody = document.getElementById('inv-tbody');
  if (!tbody) return;

  tbody.innerHTML = data.length ? data.map(inv => {
    const balance = Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0);
    const canEdit = ['Draft', 'Sent'].includes(inv.status);
    const canPay = !['Paid', 'Cancelled'].includes(inv.status);
    const canDelete = inv.status === 'Draft';
    return `<tr>
      <td><strong style="font-family:monospace">${inv.invoiceNo}</strong></td>
      <td>
        <div style="font-weight:600">${inv.customerName}</div>
        <div style="font-size:.75rem;color:#6b7280">${inv.customerEmail || ''}</div>
      </td>
      <td style="font-size:.78rem">${inv.vehicleName || '-'}</td>
      <td class="amount-mono">${fmtMoney(inv.salePrice)}</td>
      <td class="amount-mono" style="color:#c0392b">${inv.discount ? '-' + fmtMoney(inv.discount) : '-'}</td>
      <td class="amount-mono" style="color:#6b7280">${inv.taxAmount ? fmtMoney(inv.taxAmount) : '-'}</td>
      <td class="amount-mono"><strong>${fmtMoney(inv.totalAmount)}</strong></td>
      <td class="amount-mono" style="color:#10b981">${fmtMoney(inv.paidAmount || 0)}</td>
      <td class="amount-mono" style="color:${balance > 0 ? '#f59e0b' : '#10b981'}">${fmtMoney(balance)}</td>
      <td>${invStatusBadge(inv.status)}</td>
      <td>${inv.dueDate ? fmtDate(inv.dueDate + 'T00:00:00') : '-'}</td>
      <td>
        <div class="row-actions">
          <button class="btn-row" title="View / Print" onclick="printInvoiceModal(${inv.id})">👁️</button>
          ${canEdit ? `<button class="btn-row" title="Edit" onclick="openModal('invoice',${inv.id})">✏️</button>` : ''}
          ${canPay ? `<button class="btn-row" title="Record Payment" onclick="openPaymentModal('invoice',${inv.id})">💳</button>` : ''}
          ${canDelete ? `<button class="btn-row btn-row-delete" title="Delete" onclick="deleteItem('nau_invoices',${inv.id},renderInvoices)">🗑️</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="12" class="table-empty"><span class="empty-icon">🧾</span>No invoices found. Create your first invoice above.</td></tr>';
}

// ===== BILLS =====
function renderBills() {
  const q = (document.getElementById('bill-search') || {}).value || '';
  const cat = (document.getElementById('bill-cat-filter') || {}).value || '';
  const st = (document.getElementById('bill-status-filter') || {}).value || '';

  let data = DB.load('nau_bills').filter(b => {
    const matchQ = !q || (b.billNo + b.vendor + (b.category || '')).toLowerCase().includes(q.toLowerCase());
    const matchCat = !cat || b.category === cat;
    const matchSt = !st || b.status === st;
    return matchQ && matchCat && matchSt;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const countEl = document.getElementById('bill-count');
  if (countEl) countEl.textContent = `${data.length} bill${data.length !== 1 ? 's' : ''}`;

  const tbody = document.getElementById('bill-tbody');
  if (!tbody) return;

  tbody.innerHTML = data.length ? data.map(b => `
    <tr>
      <td><strong style="font-family:monospace">${b.billNo}</strong></td>
      <td><strong>${b.vendor}</strong></td>
      <td><span class="badge badge-draft">${b.category || '-'}</span></td>
      <td style="font-size:.78rem">${b.vehicleName || '-'}</td>
      <td class="amount-mono"><strong>${fmtMoney(b.amount)}</strong></td>
      <td>${b.dueDate ? fmtDate(b.dueDate + 'T00:00:00') : '-'}</td>
      <td>${billStatusBadge(b.status)}</td>
      <td>
        <div class="row-actions">
          <button class="btn-row" title="Edit" onclick="openModal('bill',${b.id})">✏️</button>
          ${b.status !== 'Paid' && b.status !== 'Cancelled' ? `<button class="btn-row" title="Record Payment" onclick="openPaymentModal('bill',${b.id})">💳</button>` : ''}
          <button class="btn-row btn-row-delete" title="Delete" onclick="deleteItem('nau_bills',${b.id},renderBills)">🗑️</button>
        </div>
      </td>
    </tr>`).join('')
    : '<tr><td colspan="8" class="table-empty"><span class="empty-icon">📋</span>No bills found. Add your first bill above.</td></tr>';
}

// ===== PAYMENTS =====
function renderPayments() {
  const q = (document.getElementById('pay-search') || {}).value || '';
  const type = (document.getElementById('pay-type-filter') || {}).value || '';
  const acct = (document.getElementById('pay-acct-filter') || {}).value || '';

  let data = DB.load('nau_payments').filter(p => {
    const matchQ = !q || (p.paymentNo + (p.referenceNo || '') + (p.issuedTo || '')).toLowerCase().includes(q.toLowerCase());
    const matchType = !type || p.type === type;
    const matchAcct = !acct || p.method === acct;
    return matchQ && matchType && matchAcct;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const tbody = document.getElementById('pay-tbody');
  if (!tbody) return;

  tbody.innerHTML = data.length ? data.map(p => `
    <tr>
      <td><strong style="font-family:monospace">${p.paymentNo}</strong></td>
      <td><span class="badge ${p.type === 'invoice' ? 'badge-invoice' : 'badge-bill'}">${p.type}</span></td>
      <td style="font-family:monospace;font-size:.82rem">${p.referenceNo || '-'}</td>
      <td>${p.issuedTo || '-'}</td>
      <td class="amount-mono"><strong>${fmtMoney(p.amount, p.currency)}</strong></td>
      <td><span class="badge badge-draft">${p.currency || 'USD'}</span></td>
      <td>${p.method || '-'}</td>
      <td>${p.date ? fmtDate(p.date + 'T00:00:00') : '-'}</td>
      <td>${p.receiptId ? `<span class="badge badge-paid" style="cursor:pointer" onclick="printReceiptModal(${p.receiptId})">${DB.load('nau_receipts').find(r => r.id === p.receiptId) ? DB.load('nau_receipts').find(r => r.id === p.receiptId).receiptNo : '-'}</span>` : '-'}</td>
      <td>
        <div class="row-actions">
          ${p.receiptId ? `<button class="btn-row" title="View Receipt" onclick="printReceiptModal(${p.receiptId})">👁️</button>` : ''}
        </div>
      </td>
    </tr>`).join('')
    : '<tr><td colspan="10" class="table-empty"><span class="empty-icon">💳</span>No payments recorded yet.</td></tr>';
}

// ===== RECEIPTS =====
function renderReceipts() {
  const q = (document.getElementById('rec-search') || {}).value || '';

  let data = DB.load('nau_receipts').filter(r => {
    return !q || (r.receiptNo + r.issuedTo + (r.referenceNo || '')).toLowerCase().includes(q.toLowerCase());
  }).sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));

  const tbody = document.getElementById('rec-tbody');
  if (!tbody) return;

  tbody.innerHTML = data.length ? data.map(r => `
    <tr>
      <td><strong style="font-family:monospace">${r.receiptNo}</strong></td>
      <td>${r.issuedTo}</td>
      <td style="font-family:monospace;font-size:.82rem">${r.referenceNo || '-'}</td>
      <td class="amount-mono"><strong>${fmtMoney(r.amount, r.currency)}</strong></td>
      <td><span class="badge badge-draft">${r.currency || 'USD'}</span></td>
      <td>${r.method || '-'}</td>
      <td>${fmtDate(r.issuedAt)}</td>
      <td>
        <div class="row-actions">
          <button class="btn-row" title="Print Receipt" onclick="printReceiptModal(${r.id})">🖨️</button>
        </div>
      </td>
    </tr>`).join('')
    : '<tr><td colspan="8" class="table-empty"><span class="empty-icon">🧾</span>No receipts yet.</td></tr>';
}

// ===== PAYMENT ACCOUNTS =====
function renderAccounts() {
  const search = (document.getElementById('acct-search') || {}).value || '';
  const typeF = (document.getElementById('acct-type-filter') || {}).value || '';
  const currF = (document.getElementById('acct-currency-filter') || {}).value || '';

  let rows = DB.load('nau_payment_accounts');
  if (search) rows = rows.filter(a => (a.name + (a.bankName || '') + (a.accountHolder || '')).toLowerCase().includes(search.toLowerCase()));
  if (typeF) rows = rows.filter(a => a.type === typeF);
  if (currF) rows = rows.filter(a => a.currency === currF);

  const countEl = document.getElementById('acct-count');
  if (countEl) countEl.textContent = `${rows.length} account${rows.length !== 1 ? 's' : ''}`;

  const typeIcon = { Bank: '🏦', Cash: '💵', 'Mobile Money': '📱', Cheque: '📝' };
  const tbody = document.getElementById('acct-tbody');
  if (!tbody) return;

  tbody.innerHTML = rows.length ? rows.map(a => `
    <tr>
      <td><strong>${a.name}</strong></td>
      <td>${typeIcon[a.type] || ''} ${a.type}</td>
      <td><span class="badge ${a.currency === 'USD' ? 'badge-paid' : 'badge-sent'}">${a.currency}</span></td>
      <td>${a.bankName || '—'}</td>
      <td style="font-family:monospace;font-size:.83rem">${a.accountNumber || '—'}</td>
      <td>${a.accountHolder || '—'}</td>
      <td>
        <label class="toggle-switch">
          <input type="checkbox" ${a.status === 'Active' ? 'checked' : ''} onchange="toggleAccountStatus(${a.id},this.checked)">
          <span class="toggle-slider"></span>
          <span style="font-size:.78rem">${a.status}</span>
        </label>
      </td>
      <td>
        <div class="row-actions">
          <button class="btn-row" title="Edit" onclick="openModal('account',${a.id})">✏️</button>
          <button class="btn-row btn-row-delete" title="Delete" onclick="deletePayAccount(${a.id})">🗑️</button>
        </div>
      </td>
    </tr>`).join('')
    : '<tr><td colspan="8" style="text-align:center;color:#8a9ab5;padding:2rem">No accounts found. Add your first payment account above.</td></tr>';
}

function toggleAccountStatus(id, active) {
  const accts = DB.load('nau_payment_accounts');
  const a = accts.find(x => x.id === id);
  if (a) { a.status = active ? 'Active' : 'Inactive'; DB.save('nau_payment_accounts', accts); toast('Status updated'); renderAccounts(); }
}

function deletePayAccount(id) {
  if (!confirm('Delete this payment account?')) return;
  DB.save('nau_payment_accounts', DB.load('nau_payment_accounts').filter(a => a.id !== id));
  toast('Account deleted');
  renderAccounts();
}

// ===== PAYMENT MODAL =====
function openPaymentModal(type, refId) {
  let refNo, amount, issuedTo;

  if (type === 'invoice') {
    const inv = DB.load('nau_invoices').find(i => i.id === refId);
    if (!inv) return;
    refNo = inv.invoiceNo;
    amount = Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0);
    issuedTo = inv.customerName;
  } else {
    const bill = DB.load('nau_bills').find(b => b.id === refId);
    if (!bill) return;
    refNo = bill.billNo;
    amount = bill.amount;
    issuedTo = bill.vendor;
  }

  _modalType = 'payment';
  document.getElementById('modalTitle').textContent = 'Record Payment';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group">
      <label>Reference</label>
      <input class="form-control" value="${refNo}" readonly />
    </div>
    <div class="form-group">
      <label>Issued To</label>
      <input class="form-control" value="${issuedTo}" readonly />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Amount (USD) <span class="required">*</span></label>
        <input class="form-control" type="number" id="pmt-amount" value="${amount}" step="0.01" min="0" />
      </div>
      <div class="form-group">
        <label>Currency</label>
        <select class="form-control" id="pmt-currency">
          <option value="USD">USD</option>
          <option value="UGX">UGX</option>
          <option value="KES">KES</option>
          <option value="EUR">EUR</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Payment Account</label>
      <select class="form-control" id="pmt-method">${accountOptions()}</select>
    </div>
    <div class="form-group">
      <label>Payment Date</label>
      <input class="form-control" type="date" id="pmt-date" value="${new Date().toISOString().split('T')[0]}" />
    </div>
    <div class="form-group">
      <label>Notes</label>
      <textarea class="form-control" id="pmt-notes" rows="2"></textarea>
    </div>`;

  document.getElementById('modalSaveBtn').textContent = 'Record Payment';
  document.getElementById('modalBackdrop').classList.add('open');

  _modalSaveOverride = () => {
    const pmtAmount = parseFloat(document.getElementById('pmt-amount').value) || 0;
    if (!pmtAmount) { toast('Enter payment amount'); return; }

    const pmt = {
      id: DB.nextId('nau_payments'),
      paymentNo: genPaymentNo(),
      type, referenceId: refId, referenceNo: refNo, issuedTo,
      amount: pmtAmount, currency: document.getElementById('pmt-currency').value,
      method: document.getElementById('pmt-method').value,
      date: document.getElementById('pmt-date').value,
      notes: document.getElementById('pmt-notes').value,
      receiptId: null, createdAt: nowISO()
    };

    // Create receipt
    const receipt = {
      id: DB.nextId('nau_receipts'),
      receiptNo: genReceiptNo(),
      paymentId: pmt.id, paymentNo: pmt.paymentNo,
      type, referenceId: refId, referenceNo: refNo,
      issuedTo, amount: pmt.amount, currency: pmt.currency,
      method: pmt.method, issuedAt: nowISO(), notes: pmt.notes
    };
    const recs = DB.load('nau_receipts');
    recs.push(receipt);
    DB.save('nau_receipts', recs);
    pmt.receiptId = receipt.id;

    const pmts = DB.load('nau_payments');
    pmts.push(pmt);
    DB.save('nau_payments', pmts);

    // Update invoice or bill
    if (type === 'invoice') {
      const invs = DB.load('nau_invoices');
      const inv = invs.find(i => i.id === refId);
      if (inv) {
        inv.paidAmount = (inv.paidAmount || 0) + pmt.amount;
        if (inv.paidAmount >= inv.totalAmount) {
          inv.status = 'Paid';
          inv.paidAt = nowISO();
          if (inv.vehicleId) markVehicleSold(inv.vehicleId);
        } else {
          inv.status = 'Partially Paid';
        }
        DB.save('nau_invoices', invs);
      }
    } else {
      const billsArr = DB.load('nau_bills');
      const bill = billsArr.find(b => b.id === refId);
      if (bill) { bill.status = 'Paid'; bill.paidAt = nowISO(); DB.save('nau_bills', billsArr); }
    }

    closeModal();
    toast('Payment recorded. Receipt generated.');
    if (currentPage === 'invoices') renderInvoices();
    else if (currentPage === 'bills') renderBills();
    else if (currentPage === 'payments') renderPayments();
    else if (currentPage === 'receipts') renderReceipts();
  };

  document.getElementById('modalSaveBtn').onclick = () => { if (_modalSaveOverride) _modalSaveOverride(); };
}

// ===== PRINT FUNCTIONS =====
function printInvoiceModal(id) {
  const inv = DB.load('nau_invoices').find(i => i.id === id);
  if (!inv) { toast('Invoice not found'); return; }
  const isPaid = inv.status === 'Paid';
  const isPartial = inv.status === 'Partially Paid';

  document.getElementById('printContent').innerHTML = `
    <div class="invoice-doc">
      <div class="inv-header">
        <div class="inv-logo">
          <h2>NipponAuto Uganda</h2>
          <div class="logo-badge">Genuine Japanese Cars</div>
          <p>Plot 45, Nakawa Industrial Road, Kampala, Uganda</p>
          <p>Tel: +256 700 123 456 &nbsp;|&nbsp; info@nipponauto.ug</p>
          <p>TIN: 1234567890</p>
        </div>
        <div class="inv-meta">
          <h1>INVOICE</h1>
          <p><strong>${inv.invoiceNo}</strong></p>
          <p>Date: ${fmtDate(inv.createdAt)}</p>
          <p>Due: ${inv.dueDate ? fmtDate(inv.dueDate + 'T00:00:00') : '-'}</p>
          <p>Status: ${inv.status}</p>
        </div>
      </div>
      <div class="inv-parties">
        <div class="inv-party">
          <h4>From</h4>
          <strong>NipponAuto Uganda Ltd</strong>
          <p>Plot 45, Nakawa Industrial Road</p>
          <p>Kampala, Uganda</p>
          <p>TIN: 1234567890</p>
        </div>
        <div class="inv-party">
          <h4>Bill To</h4>
          <strong>${inv.customerName}</strong>
          ${inv.customerEmail ? `<p>${inv.customerEmail}</p>` : ''}
          ${inv.customerPhone ? `<p>${inv.customerPhone}</p>` : ''}
          ${inv.customerAddress ? `<p>${inv.customerAddress}</p>` : ''}
        </div>
      </div>
      <table class="inv-table">
        <thead>
          <tr><th>SKU</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>${inv.vehicleSKU || '-'}</td>
            <td>${inv.vehicleName || '-'}</td>
            <td>1</td>
            <td>${fmtMoney(inv.salePrice)}</td>
            <td>${fmtMoney(inv.salePrice)}</td>
          </tr>
        </tbody>
      </table>
      <div class="inv-totals">
        <div class="tot-row"><span>Subtotal</span><span>${fmtMoney(inv.salePrice)}</span></div>
        ${inv.discount ? `<div class="tot-row discount"><span>Discount</span><span>- ${fmtMoney(inv.discount)}</span></div>` : ''}
        ${inv.taxRate ? `<div class="tot-row"><span>VAT (${inv.taxRate}%)</span><span>${fmtMoney(inv.taxAmount)}</span></div>` : ''}
        <div class="tot-row"><span>TOTAL</span><span>${fmtMoney(inv.totalAmount)}</span></div>
      </div>
      <div class="inv-status-bar ${isPaid ? 'paid' : isPartial ? 'partial' : 'unpaid'}">
        ${isPaid
          ? '✅ PAID IN FULL — Thank you! Payment received on ' + fmtDate(inv.paidAt)
          : isPartial
            ? '⚠️ PARTIALLY PAID — Amount paid: ' + fmtMoney(inv.paidAmount) + ' | Balance: ' + fmtMoney(Number(inv.totalAmount) - Number(inv.paidAmount || 0))
            : '⏳ PAYMENT PENDING — Due: ' + (inv.dueDate ? fmtDate(inv.dueDate + 'T00:00:00') : '—')
        }
      </div>
      ${inv.paymentMethod ? `<p style="margin-top:.5rem;font-size:.82rem;color:#6b7280">Payment Account: ${inv.paymentMethod}</p>` : ''}
      ${inv.notes ? `<p style="margin-top:.5rem;font-size:.82rem;color:#374151"><strong>Notes:</strong> ${inv.notes}</p>` : ''}
      <div class="inv-footer">
        <p>Thank you for choosing NipponAuto Uganda — Kampala's #1 Source for Genuine Japanese Cars.</p>
        <p>For queries, contact info@nipponauto.ug or call +256 700 123 456</p>
        <p style="margin-top:.3rem;font-size:.72rem">This is a computer-generated invoice.</p>
      </div>
    </div>`;

  document.getElementById('printOverlay').classList.add('open');
}

function printReceiptModal(id) {
  const rec = DB.load('nau_receipts').find(r => r.id === id);
  if (!rec) { toast('Receipt not found'); return; }

  document.getElementById('printContent').innerHTML = `
    <div class="receipt-doc">
      <div class="rec-header">
        <h2>NipponAuto Uganda</h2>
        <div style="font-size:.78rem;color:#6b7280;margin:.25rem 0">Plot 45, Nakawa Industrial Road, Kampala</div>
        <div class="rec-no">${rec.receiptNo}</div>
        <div style="font-size:.78rem;color:#6b7280">${fmtDate(rec.issuedAt)}</div>
      </div>
      <div class="rec-row"><span>Issued To</span><span><strong>${rec.issuedTo}</strong></span></div>
      <div class="rec-row"><span>Reference</span><span>${rec.referenceNo || '-'}</span></div>
      <div class="rec-row"><span>Payment Method / Account</span><span>${rec.method || '-'}</span></div>
      <div class="rec-row"><span>Currency</span><span>${rec.currency || 'USD'}</span></div>
      <div class="rec-row"><span>Transaction Type</span><span>${rec.type === 'invoice' ? 'Sale Invoice' : 'Bill Payment'}</span></div>
      ${rec.notes ? `<div class="rec-row"><span>Notes</span><span>${rec.notes}</span></div>` : ''}
      <div class="rec-total"><span>Amount Paid</span><span>${fmtMoney(rec.amount, rec.currency)}</span></div>
      <div class="rec-stamp">✅ PAYMENT CONFIRMED</div>
      <div class="rec-footer">
        <p>This is an official payment receipt issued by NipponAuto Uganda.</p>
        <p>info@nipponauto.ug | +256 700 123 456</p>
        <p style="margin-top:.3rem;font-size:.7rem">Computer-generated — no signature required.</p>
      </div>
    </div>`;

  document.getElementById('printOverlay').classList.add('open');
}

// ===== REPORTS =====
let currentReportTab = 'pnl';

function showReportTab(tab) {
  currentReportTab = tab;
  document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
  const el = document.querySelector(`.report-tab[data-tab="${tab}"]`);
  if (el) el.classList.add('active');

  document.querySelectorAll('.report-section').forEach(s => s.style.display = 'none');
  const sec = document.getElementById('rpt-' + tab);
  if (sec) sec.style.display = 'block';

  const renders = { pnl: renderPNL, aging: renderAging, expenses: renderExpenseBreakdown };
  if (renders[tab]) renders[tab]();
}

function getDateRange() {
  const from = (document.getElementById('rpt-from') || {}).value || '';
  const to = (document.getElementById('rpt-to') || {}).value || '';
  return { from, to };
}

function renderPNL() {
  const { from, to } = getDateRange();
  const invoices = DB.load('nau_invoices');
  const bills = DB.load('nau_bills');

  const filterDate = (items, dateField) => items.filter(x => {
    const dt = x[dateField] || x.createdAt;
    if (from && dt < from) return false;
    if (to && dt > to + 'T23:59:59Z') return false;
    return true;
  });

  const paidInv = filterDate(invoices.filter(i => i.status === 'Paid'), 'paidAt');
  const paidBills = filterDate(bills.filter(b => b.status === 'Paid'), 'paidAt');
  const outstandingInv = invoices.filter(i => ['Draft', 'Sent', 'Partially Paid'].includes(i.status));

  const revenue = paidInv.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const expenses = paidBills.reduce((s, b) => s + Number(b.amount || 0), 0);
  const grossProfit = revenue - expenses;
  const outstandingAmt = outstandingInv.reduce((s, i) => s + (Number(i.totalAmount || 0) - Number(i.paidAmount || 0)), 0);

  const el = document.getElementById('pnl-content');
  if (!el) return;

  el.innerHTML = `
    <div class="report-card">
      <h3 style="margin-bottom:1.25rem;font-size:1rem;font-weight:700">Profit & Loss Statement</h3>
      <div class="pnl-row">
        <span>Revenue (Paid Invoices)</span>
        <span class="amount-green">${fmtMoney(revenue)}</span>
      </div>
      <div class="pnl-row" style="padding-left:1.5rem;font-size:.85rem">
        <span>Number of Paid Invoices</span>
        <span>${paidInv.length}</span>
      </div>
      <div class="pnl-row">
        <span>Total Expenses (Paid Bills)</span>
        <span class="amount-red">(${fmtMoney(expenses)})</span>
      </div>
      <div class="pnl-row" style="padding-left:1.5rem;font-size:.85rem">
        <span>Number of Paid Bills</span>
        <span>${paidBills.length}</span>
      </div>
      <div class="pnl-row sub-total">
        <span>Gross Profit</span>
        <span class="${grossProfit >= 0 ? 'amount-green' : 'amount-red'}">${grossProfit >= 0 ? fmtMoney(grossProfit) : '(' + fmtMoney(Math.abs(grossProfit)) + ')'}</span>
      </div>
      <div class="pnl-row">
        <span>Outstanding Receivables</span>
        <span class="amount-blue">${fmtMoney(outstandingAmt)}</span>
      </div>
      <div class="pnl-row total">
        <span>Net Position (Profit + Outstanding)</span>
        <span class="amount-mono">${fmtMoney(grossProfit + outstandingAmt)}</span>
      </div>
    </div>`;

  // Monthly breakdown
  renderMonthlyChart('pnl-monthly-chart', invoices, bills);
}

function renderAging() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const invoices = DB.load('nau_invoices').filter(i => ['Sent', 'Partially Paid', 'Draft'].includes(i.status));

  const groups = [
    { key: 'current', label: 'Current (Not Yet Due)', cls: 'aging-current', items: [] },
    { key: '30', label: '1–30 Days Overdue', cls: 'aging-30', items: [] },
    { key: '60', label: '31–60 Days Overdue', cls: 'aging-60', items: [] },
    { key: '90', label: '60+ Days Overdue', cls: 'aging-90', items: [] }
  ];

  invoices.forEach(inv => {
    const balance = Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0);
    if (balance <= 0) return;
    if (!inv.dueDate) { groups[0].items.push(inv); return; }
    const due = new Date(inv.dueDate + 'T00:00:00');
    const diffDays = Math.floor((today - due) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) groups[0].items.push(inv);
    else if (diffDays <= 30) groups[1].items.push(inv);
    else if (diffDays <= 60) groups[2].items.push(inv);
    else groups[3].items.push(inv);
  });

  const el = document.getElementById('aging-content');
  if (!el) return;

  el.innerHTML = groups.map(g => {
    const total = g.items.reduce((s, i) => s + (Number(i.totalAmount || 0) - Number(i.paidAmount || 0)), 0);
    return `
      <div class="aging-group">
        <div class="aging-group-header">
          <span class="aging-group-label ${g.cls}">${g.label}</span>
          <span class="aging-total">${g.items.length} invoice(s) — <strong>${fmtMoney(total)}</strong></span>
        </div>
        ${g.items.length ? `
          <div class="table-wrap table-scroll">
            <table class="acc-table">
              <thead><tr><th>Invoice No</th><th>Customer</th><th>Vehicle</th><th>Total</th><th>Paid</th><th>Balance</th><th>Due Date</th></tr></thead>
              <tbody>
                ${g.items.map(inv => {
                  const balance = Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0);
                  return `<tr>
                    <td><strong>${inv.invoiceNo}</strong></td>
                    <td>${inv.customerName}</td>
                    <td style="font-size:.78rem">${inv.vehicleName || '-'}</td>
                    <td class="amount-mono">${fmtMoney(inv.totalAmount)}</td>
                    <td class="amount-mono" style="color:#10b981">${fmtMoney(inv.paidAmount || 0)}</td>
                    <td class="amount-mono" style="color:#c0392b"><strong>${fmtMoney(balance)}</strong></td>
                    <td>${inv.dueDate ? fmtDate(inv.dueDate + 'T00:00:00') : '-'}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>` : `<p style="color:#9ca3af;font-size:.82rem;padding:.5rem 0">No invoices in this category.</p>`}
      </div>`;
  }).join('');
}

function renderExpenseBreakdown() {
  const bills = DB.load('nau_bills').filter(b => b.status === 'Paid');
  const categories = {};
  bills.forEach(b => {
    const cat = b.category || 'Other';
    categories[cat] = (categories[cat] || 0) + Number(b.amount || 0);
  });

  const total = Object.values(categories).reduce((s, v) => s + v, 0);
  const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);

  const colors = ['#0a1628', '#c0392b', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  const el = document.getElementById('expense-content');
  if (!el) return;

  if (!sorted.length) {
    el.innerHTML = '<div class="report-card"><p style="color:#9ca3af;text-align:center;padding:2rem">No paid expenses yet.</p></div>';
    return;
  }

  el.innerHTML = `
    <div class="report-card">
      <h3 style="margin-bottom:1.25rem;font-size:1rem;font-weight:700">Expense Breakdown by Category</h3>
      <p style="color:#6b7280;font-size:.82rem;margin-bottom:1.25rem">Total Paid Expenses: <strong>${fmtMoney(total)}</strong></p>
      ${sorted.map(([cat, amt], i) => {
        const pct = total > 0 ? Math.round(amt / total * 100) : 0;
        return `
          <div class="exp-row">
            <div class="exp-label">
              <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${colors[i % colors.length]};margin-right:.4rem"></span>${cat}</span>
              <span>${fmtMoney(amt)} <span style="color:#9ca3af">(${pct}%)</span></span>
            </div>
            <div class="exp-bar-track">
              <div class="exp-bar-fill" style="width:${pct}%;background:${colors[i % colors.length]}"></div>
            </div>
          </div>`;
      }).join('')}
      <div style="margin-top:1.5rem">
        <table class="report-table">
          <thead><tr><th>Category</th><th>Amount</th><th>% of Total</th><th># Bills</th></tr></thead>
          <tbody>
            ${sorted.map(([cat, amt]) => {
              const cnt = bills.filter(b => (b.category || 'Other') === cat).length;
              const pct = total > 0 ? Math.round(amt / total * 100) : 0;
              return `<tr><td>${cat}</td><td class="amount-mono">${fmtMoney(amt)}</td><td>${pct}%</td><td>${cnt}</td></tr>`;
            }).join('')}
            <tr><td><strong>Total</strong></td><td class="amount-mono"><strong>${fmtMoney(total)}</strong></td><td>100%</td><td>${bills.length}</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

// ===== MOBILE SIDEBAR =====
function openMobileSidebar() {
  document.getElementById('accSidebar').classList.add('open');
  document.getElementById('mobileOverlay').classList.add('show');
}

function closeMobileSidebar() {
  document.getElementById('accSidebar').classList.remove('open');
  document.getElementById('mobileOverlay').classList.remove('show');
}

// ===== INIT =====
function init() {
  if (!AUTH.isLoggedIn()) {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appShell').style.display = 'none';
    return;
  }

  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';

  const session = AUTH.getSession();
  if (session) {
    const userNameEl = document.getElementById('sidebarUserName');
    const userRoleEl = document.getElementById('sidebarUserRole');
    if (userNameEl) userNameEl.textContent = session.user;
    if (userRoleEl) userRoleEl.textContent = session.role;
  }

  archiveOldSoldVehicles();
  navigate('dashboard');

  // Populate payment account filter for payments page
  const payAcctFilter = document.getElementById('pay-acct-filter');
  if (payAcctFilter) payAcctFilter.innerHTML = accountFilterOptions();
}

document.addEventListener('DOMContentLoaded', () => {
  // Login
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      const u = document.getElementById('loginUser').value.trim();
      const p = document.getElementById('loginPass').value;
      const result = AUTH.login(u, p);
      if (result) {
        init();
      } else {
        document.getElementById('loginError').classList.add('show');
      }
    });
  }

  // Enter key on login
  ['loginUser', 'loginPass'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('loginBtn').click(); });
  });

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => { AUTH.logout(); init(); });

  // Nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.page));
  });

  // Modal close
  document.getElementById('modalBackdrop').addEventListener('click', e => {
    if (e.target === document.getElementById('modalBackdrop')) closeModal();
  });

  // Modal save button
  document.getElementById('modalSaveBtn').addEventListener('click', submitModal);

  // Print overlay close
  const printClose = document.getElementById('printClose');
  if (printClose) printClose.addEventListener('click', () => {
    document.getElementById('printOverlay').classList.remove('open');
  });

  const printDo = document.getElementById('printDo');
  if (printDo) printDo.addEventListener('click', () => window.print());

  // Mobile hamburger
  const hamburger = document.getElementById('hamburgerBtn');
  if (hamburger) hamburger.addEventListener('click', openMobileSidebar);

  const mobileOverlay = document.getElementById('mobileOverlay');
  if (mobileOverlay) mobileOverlay.addEventListener('click', closeMobileSidebar);

  // Report tabs
  document.querySelectorAll('.report-tab').forEach(tab => {
    tab.addEventListener('click', () => showReportTab(tab.dataset.tab));
  });

  // Report date filter apply
  const rptApply = document.getElementById('rpt-apply');
  if (rptApply) rptApply.addEventListener('click', () => {
    const renders = { pnl: renderPNL, aging: renderAging, expenses: renderExpenseBreakdown };
    if (renders[currentReportTab]) renders[currentReportTab]();
  });

  // Refresh pay-acct-filter when navigating to payments
  document.querySelectorAll('.nav-item[data-page="payments"]').forEach(el => {
    el.addEventListener('click', () => {
      setTimeout(() => {
        const f = document.getElementById('pay-acct-filter');
        if (f) f.innerHTML = accountFilterOptions();
      }, 50);
    });
  });

  // Init
  init();
});
