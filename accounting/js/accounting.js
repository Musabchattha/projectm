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

// ===== HTML ESCAPE =====
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
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
  document.querySelectorAll('.nav-item,.nav-sub-item,.nav-parent').forEach(n => n.classList.remove('active'));
  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');
  const subEl = document.querySelector(`.nav-sub-item[data-page="${page}"]`);
  if (subEl) {
    subEl.classList.add('active');
    // Open the parent accordion group
    const sub = subEl.closest('.nav-sub');
    if (sub) { sub.classList.add('open'); const par = sub.previousElementSibling; if (par) par.classList.add('open'); }
  }

  // Render page
  const renders = {
    dashboard: renderDashboard,
    invoices: renderInvoices,
    'credit-notes': renderCreditNotes,
    bills: renderBills,
    'vendor-credit-notes': renderVendorCreditNotes,
    payments: renderPayments,
    receipts: renderReceipts,
    accounts: renderAccounts,
    'bank-statements': () => { populateBSFilter(); renderBankStatements(); },
    'journal-entries': renderJournalEntries,
    coa: renderCOA,
    journals: renderJournals,
    taxes: renderTaxes,
    'customers-acc': renderCustomersAcc,
    vendors: renderVendors,
    'purchase-orders': renderPurchaseOrders,
    employees: renderEmployees,
    payruns: renderPayruns,
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
  try {
    document.getElementById('modalBody').innerHTML = cfg.form(data);
  } catch (err) {
    console.error('[openModal] form render error for type=' + type + ':', err);
    toast('Error opening form: ' + err.message);
    return;
  }
  document.getElementById('modalSaveBtn').textContent = cfg.saveBtnLabel || 'Save';
  document.getElementById('modalBackdrop').classList.add('open');
  if (cfg.onOpen) cfg.onOpen(data);
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('open');
  _modalType = null;
  _editId = null;
  _modalSaveOverride = null;
  const saveBtn = document.getElementById('modalSaveBtn');
  saveBtn.onclick = submitModal;
  saveBtn.style.display = '';
  saveBtn.textContent = 'Save';
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
      const vehs = DB.load('nau_vehicles').filter(v => v.status === 'Published' || v.status === 'PUBLISHED' || (d && d.vehicleId === v.id));
      const custs = DB.load('nau_customers_acc');
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
          <label>Customer</label>
          <select class="form-control" id="inv-cust-sel" onchange="onInvCustomerChange()">
            <option value="">-- Select from directory --</option>
            ${custs.map(c => `<option value="${c.id}" data-name="${c.name}" data-email="${c.email||''}" data-phone="${c.phone||''}" data-addr="${c.address||''}" ${d && d.customerName===c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Customer Name <span class="required">*</span></label>
          <input class="form-control" id="inv-cust-name" value="${d ? d.customerName || '' : ''}" placeholder="Or type manually" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Customer Email</label>
          <input class="form-control" id="inv-cust-email" value="${d ? d.customerEmail || '' : ''}" />
        </div>
        <div class="form-group">
          <label>Customer Phone</label>
          <input class="form-control" id="inv-cust-phone" value="${d ? d.customerPhone || '' : ''}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Customer Address</label>
          <input class="form-control" id="inv-cust-addr" value="${d ? d.customerAddress || '' : ''}" />
        </div>
        <div class="form-group">
          <label>Due Date</label>
          <input class="form-control" type="date" id="inv-due" value="${d ? d.dueDate || '' : ''}" />
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
          <label>Tax</label>
          <select class="form-control" id="inv-tax-sel">${taxOptions(d && d.taxId)}</select>
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
      const taxSel = document.getElementById('inv-tax-sel');
      const taxId = Number(taxSel.value) || null;
      const taxOpt = taxSel.options[taxSel.selectedIndex];
      const taxRate = taxId ? parseFloat(taxOpt.dataset.rate || 0) : 0;
      const taxable = salePrice - discount;
      const taxAmount = taxRate ? Math.round(taxable * (taxRate/100) * 100) / 100 : 0;
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
        salePrice, discount, taxId, taxRate, taxAmount, totalAmount, paidAmount: 0,
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
      if (d.status === 'Sent') {
        markVehicleSold(d.vehicleId);
        postInvoiceJE(inv);
        postCOGSJE(inv.vehicleId, inv.invoiceNo);
        // Update jeRef back to storage
        const allUpd = DB.load('nau_invoices');
        const idx = allUpd.findIndex(x => x.id === inv.id);
        if (idx > -1) { allUpd[idx].jeRef = inv.jeRef; DB.save('nau_invoices', allUpd); }
      }
    },
    update: (id, d) => {
      const all = DB.load('nau_invoices');
      const i = all.findIndex(x => x.id === id);
      if (i > -1) {
        all[i] = { ...all[i], ...d };
        if (d.status === 'Sent' && !all[i].jeRef) {
          postInvoiceJE(all[i]);
          postCOGSJE(all[i].vehicleId, all[i].invoiceNo);
        }
        DB.save('nau_invoices', all);
      }
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
      const vends = DB.load('nau_vendors');
      return `
      <div class="form-row">
        <div class="form-group">
          <label>Vendor</label>
          <select class="form-control" id="bill-vendor-sel" onchange="onBillVendorChange()">
            <option value="">-- Select from directory --</option>
            ${vends.map(v => `<option value="${v.name}" ${d && d.vendor===v.name ? 'selected' : ''}>${v.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Vendor Name <span class="required">*</span></label>
          <input class="form-control" id="bill-vendor" value="${d ? d.vendor || '' : ''}" placeholder="Or type manually" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex:2">
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
      const newBill = { id: DB.nextId('nau_bills'), billNo: genBillNo(), ...d, createdAt: nowISO() };
      postBillJE(newBill);
      all.push(newBill);
      DB.save('nau_bills', all);
    },
    update: (id, d) => {
      const all = DB.load('nau_bills');
      const i = all.findIndex(b => b.id === id);
      if (i > -1) {
        all[i] = { ...all[i], ...d };
        if (all[i].status !== 'Cancelled' && !all[i].jeRef) {
          postBillJE(all[i]);
        }
        DB.save('nau_bills', all);
      }
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
      </div>
      <div class="form-group">
        <label>GL Account Code</label>
        <input class="form-control" id="acc-gl-code" placeholder="e.g. 1001" value="${d ? d.glAccountCode || '' : ''}" />
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
        accountHolder: document.getElementById('pa-holder').value.trim(),
        glAccountCode: document.getElementById('acc-gl-code').value.trim() || '1001'
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

  // Overdue alerts
  const today = new Date().toISOString().split('T')[0];
  const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const overdueInvs = invoices.filter(i => !['Paid', 'Cancelled'].includes(i.status) && i.dueDate && i.dueDate < today);
  const dueSoonBills = bills.filter(b => b.status === 'Pending' && b.dueDate && b.dueDate >= today && b.dueDate <= sevenDays);
  const overdueAmt = overdueInvs.reduce((s, i) => s + (Number(i.totalAmount || 0) - Number(i.paidAmount || 0)), 0);
  const dueSoonAmt = dueSoonBills.reduce((s, b) => s + Number(b.amount || 0), 0);

  const alertsHtml = (overdueInvs.length || dueSoonBills.length) ? `
    <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem;">
      ${overdueInvs.length ? `<div style="flex:1;min-width:240px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:1rem;">
        <div style="font-weight:700;color:#c0392b;">🔴 ${overdueInvs.length} Overdue Invoice${overdueInvs.length > 1 ? 's' : ''}</div>
        <div style="color:#c0392b;font-size:.9rem;">${fmtMoney(overdueAmt)} outstanding</div>
        <div style="font-size:.8rem;color:#888;margin-top:.25rem;">Action required</div>
      </div>` : ''}
      ${dueSoonBills.length ? `<div style="flex:1;min-width:240px;background:#fffbeb;border:1px solid #fed7aa;border-radius:8px;padding:1rem;">
        <div style="font-weight:700;color:#d97706;">🟡 ${dueSoonBills.length} Bill${dueSoonBills.length > 1 ? 's' : ''} Due This Week</div>
        <div style="color:#d97706;font-size:.9rem;">${fmtMoney(dueSoonAmt)} payable</div>
        <div style="font-size:.8rem;color:#888;margin-top:.25rem;">Due within 7 days</div>
      </div>` : ''}
    </div>` : '';

  // Cash position widget
  const glBal = getGLBalances();
  const cashAccts = DB.load('nau_payment_accounts').filter(a => a.status !== 'Inactive');
  const cashRows = cashAccts.map(a => {
    const code = a.glAccountCode || '1001';
    const b = glBal[code] || { debit: 0, credit: 0 };
    const balance = b.debit - b.credit;
    return `<div style="display:flex;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid #f0f0f0;font-size:.88rem;">
      <span>${a.name}</span>
      <span style="font-weight:600;color:${balance >= 0 ? '#0a1628' : '#c0392b'}">${a.currency || 'USD'} ${Math.abs(balance).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${balance < 0 ? ' CR' : ''}</span>
    </div>`;
  }).join('');

  const cashWidget = `
    <div style="background:#fff;border-radius:10px;padding:1.25rem;box-shadow:0 2px 12px rgba(10,22,40,.08);margin-bottom:1.5rem;">
      <div style="font-weight:700;color:#0a1628;margin-bottom:.75rem;font-size:.95rem;">💰 Cash Position</div>
      ${cashRows || '<div style="color:#999;font-size:.85rem;">No accounts configured.</div>'}
    </div>`;

  const alertsEl = document.getElementById('dash-alerts-widgets');
  if (alertsEl) alertsEl.innerHTML = alertsHtml + cashWidget;

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
          <button class="btn-row" title="Print" onclick="openPrintModal(${inv.id})">🖨️</button>
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
      <td style="font-family:monospace;font-size:.83rem;color:#0a1628;font-weight:600">${a.glAccountCode || '—'}</td>
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
    : '<tr><td colspan="9" style="text-align:center;color:#8a9ab5;padding:2rem">No accounts found. Add your first payment account above.</td></tr>';
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
        postReceiptJE(pmt, inv);
        // Save jeRef back into pmts
        const pmts2 = DB.load('nau_payments');
        const pi = pmts2.findIndex(x => x.id === pmt.id);
        if (pi > -1) { pmts2[pi].jeRef = pmt.jeRef; DB.save('nau_payments', pmts2); }
        DB.save('nau_invoices', invs);
      }
    } else {
      const billsArr = DB.load('nau_bills');
      const bill = billsArr.find(b => b.id === refId);
      if (bill) {
        bill.status = 'Paid';
        bill.paidAt = nowISO();
        postBillPaymentJE(pmt, bill);
        // Save jeRef back into pmts
        const pmts2 = DB.load('nau_payments');
        const pi = pmts2.findIndex(x => x.id === pmt.id);
        if (pi > -1) { pmts2[pi].jeRef = pmt.jeRef; DB.save('nau_payments', pmts2); }
        DB.save('nau_bills', billsArr);
      }
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

function openPrintModal(id) {
  const invoices = DB.load('nau_invoices');
  const inv = invoices.find(i => i.id === id);
  if (!inv) return;

  document.getElementById('invoicePrintModal').style.display = 'block';
  document.getElementById('invPrintNo').textContent = inv.invoiceNo || inv.id;
  document.getElementById('invPrintDate').textContent = 'Date: ' + (inv.date || inv.createdAt || '').split('T')[0];
  document.getElementById('invPrintDue').textContent = inv.dueDate ? 'Due: ' + inv.dueDate : '';
  document.getElementById('invPrintCustomer').textContent = inv.customerName || '';
  document.getElementById('invPrintEmail').textContent = inv.customerEmail || '';
  document.getElementById('invPrintPhone').textContent = inv.customerPhone || '';

  const lines = inv.lines || inv.items || [];
  document.getElementById('invPrintLines').innerHTML = lines.map((l, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${l.description || l.desc || ''}</td>
      <td>${l.qty || 1}</td>
      <td>$${Number(l.unitPrice || l.price || 0).toLocaleString()}</td>
      <td>$${Number(l.amount || (l.qty * l.unitPrice) || 0).toLocaleString()}</td>
    </tr>
  `).join('') || '<tr><td colspan="5">Vehicle: ' + (inv.vehicleName || inv.description || '') + '</td></tr>';

  const subtotal = inv.subtotal || inv.amount || 0;
  const tax = inv.tax || inv.vatAmount || inv.taxAmount || 0;
  const total = inv.total || inv.totalAmount || (subtotal + tax);
  document.getElementById('invPrintSubtotal').textContent = '$' + Number(subtotal).toLocaleString();
  document.getElementById('invPrintTax').textContent = '$' + Number(tax).toLocaleString();
  document.getElementById('invPrintTotal').textContent = '$' + Number(total).toLocaleString();
  document.getElementById('invPrintNotes').textContent = inv.notes ? 'Notes: ' + inv.notes : '';

  window.print();
  document.getElementById('invoicePrintModal').style.display = 'none';
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

  const renders = {
    pnl: renderPNL,
    'trial-balance': renderTrialBalance,
    'balance-sheet': renderBalanceSheet,
    'general-ledger': renderGeneralLedger,
    aging: renderAging,
    'aged-payables': renderAgedPayables,
    'tax-report': renderTaxReport,
    expenses: renderExpenseBreakdown,
    'vehicle-pl': renderVehiclePL,
    cashflow: renderCashFlow
  };
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

  const revenueDetail = paidInv.map(i =>
    `<tr class="pnl-detail-row">
      <td style="padding:.3rem 1rem .3rem 2rem;color:#555;font-size:.82rem;">${i.invoiceNo}</td>
      <td style="color:#555;font-size:.82rem;">${i.customerName||''} — ${i.vehicleName||''}</td>
      <td style="text-align:right;font-size:.82rem;">${fmtMoney(i.totalAmount)}</td>
    </tr>`
  ).join('');

  const expenseDetail = paidBills.map(b =>
    `<tr class="pnl-detail-row">
      <td style="padding:.3rem 1rem .3rem 2rem;color:#555;font-size:.82rem;">${b.billNo}</td>
      <td style="color:#555;font-size:.82rem;">${b.vendor||''} — ${b.category||''}</td>
      <td style="text-align:right;font-size:.82rem;">${fmtMoney(b.amount)}</td>
    </tr>`
  ).join('');

  el.innerHTML = `
    <div class="report-card">
      <h3 style="margin-bottom:1.25rem;font-size:1rem;font-weight:700">Profit & Loss Statement</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>
          <tr class="pnl-row pnl-clickable" onclick="togglePNLDetail('pnl-revenue-detail')" style="cursor:pointer;">
            <td><span class="amount-green" style="font-weight:600;">Revenue (Paid Invoices)</span> <span style="font-size:.75rem;color:#aaa;">▼ ${paidInv.length} invoice${paidInv.length!==1?'s':''}</span></td>
            <td style="text-align:right;"><span class="amount-green">${fmtMoney(revenue)}</span></td>
          </tr>
          ${revenueDetail ? `<tr id="pnl-revenue-detail" style="display:none;"><td colspan="2" style="padding:0;"><table style="width:100%;border-collapse:collapse;">${revenueDetail}</table></td></tr>` : ''}
          <tr class="pnl-row pnl-clickable" onclick="togglePNLDetail('pnl-expense-detail')" style="cursor:pointer;">
            <td><span class="amount-red" style="font-weight:600;">Total Expenses (Paid Bills)</span> <span style="font-size:.75rem;color:#aaa;">▼ ${paidBills.length} bill${paidBills.length!==1?'s':''}</span></td>
            <td style="text-align:right;"><span class="amount-red">(${fmtMoney(expenses)})</span></td>
          </tr>
          ${expenseDetail ? `<tr id="pnl-expense-detail" style="display:none;"><td colspan="2" style="padding:0;"><table style="width:100%;border-collapse:collapse;">${expenseDetail}</table></td></tr>` : ''}
          <tr class="pnl-row sub-total">
            <td>Gross Profit</td>
            <td style="text-align:right;"><span class="${grossProfit >= 0 ? 'amount-green' : 'amount-red'}">${grossProfit >= 0 ? fmtMoney(grossProfit) : '(' + fmtMoney(Math.abs(grossProfit)) + ')'}</span></td>
          </tr>
          <tr class="pnl-row">
            <td>Outstanding Receivables</td>
            <td style="text-align:right;"><span class="amount-blue">${fmtMoney(outstandingAmt)}</span></td>
          </tr>
          <tr class="pnl-row total">
            <td>Net Position (Profit + Outstanding)</td>
            <td style="text-align:right;"><span class="amount-mono">${fmtMoney(grossProfit + outstandingAmt)}</span></td>
          </tr>
        </tbody>
      </table>
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
    const renders = {
      pnl: renderPNL, 'trial-balance': renderTrialBalance, 'balance-sheet': renderBalanceSheet,
      'general-ledger': renderGeneralLedger, aging: renderAging, 'aged-payables': renderAgedPayables,
      'tax-report': renderTaxReport, expenses: renderExpenseBreakdown, 'vehicle-pl': renderVehiclePL
    };
    if (renders[currentReportTab]) renders[currentReportTab]();
  });

  // Sidebar nav items (flat)
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.page));
  });

  // Sidebar sub-items
  document.querySelectorAll('.nav-sub-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.page));
  });

  // Sidebar accordion parents
  document.querySelectorAll('.nav-parent[data-group]').forEach(parent => {
    parent.addEventListener('click', () => {
      const sub = document.getElementById(parent.dataset.group);
      if (sub) {
        const isOpen = sub.classList.toggle('open');
        parent.classList.toggle('open', isOpen);
      }
    });
  });

  // Refresh pay-acct-filter when navigating to payments
  document.querySelectorAll('.nav-item[data-page="payments"],.nav-sub-item[data-page="payments"]').forEach(el => {
    el.addEventListener('click', () => {
      setTimeout(() => {
        const f = document.getElementById('pay-acct-filter');
        if (f) f.innerHTML = accountFilterOptions();
      }, 50);
    });
  });

  // Init
  seedAccountingData();
  init();
});

// ===== SEED ACCOUNTING DATA =====
function seedAccountingData() {
  // Chart of Accounts
  if (!DB.load('nau_coa').length) {
    DB.save('nau_coa', [
      { id:1, code:'1000', name:'Cash & Bank', type:'asset', subtype:'current_asset', parentId:null, active:true },
      { id:2, code:'1010', name:'Cash - USD', type:'asset', subtype:'current_asset', parentId:1, active:true },
      { id:3, code:'1020', name:'Cash - UGX', type:'asset', subtype:'current_asset', parentId:1, active:true },
      { id:4, code:'1030', name:'Stanbic Bank USD', type:'asset', subtype:'current_asset', parentId:1, active:true },
      { id:5, code:'1040', name:'Stanbic Bank UGX', type:'asset', subtype:'current_asset', parentId:1, active:true },
      { id:6, code:'1100', name:'Accounts Receivable', type:'asset', subtype:'current_asset', parentId:null, active:true },
      { id:7, code:'1200', name:'Inventory', type:'asset', subtype:'current_asset', parentId:null, active:true },
      { id:8, code:'1300', name:'Fixed Assets', type:'asset', subtype:'fixed_asset', parentId:null, active:true },
      { id:9, code:'2000', name:'Accounts Payable', type:'liability', subtype:'current_liability', parentId:null, active:true },
      { id:10, code:'2100', name:'VAT Payable', type:'liability', subtype:'current_liability', parentId:null, active:true },
      { id:11, code:'2200', name:'Customer Deposits', type:'liability', subtype:'current_liability', parentId:null, active:true },
      { id:12, code:'3000', name:"Owner's Equity", type:'equity', subtype:'equity', parentId:null, active:true },
      { id:13, code:'3100', name:'Retained Earnings', type:'equity', subtype:'equity', parentId:null, active:true },
      { id:14, code:'4000', name:'Sales Revenue', type:'revenue', subtype:'revenue', parentId:null, active:true },
      { id:15, code:'4100', name:'Other Income', type:'revenue', subtype:'revenue', parentId:null, active:true },
      { id:16, code:'5000', name:'Cost of Goods Sold', type:'expense', subtype:'cogs', parentId:null, active:true },
      { id:17, code:'6000', name:'Operating Expenses', type:'expense', subtype:'operating_expense', parentId:null, active:true },
      { id:18, code:'6010', name:'Salaries & Wages', type:'expense', subtype:'operating_expense', parentId:17, active:true },
      { id:19, code:'6020', name:'Rent & Utilities', type:'expense', subtype:'operating_expense', parentId:17, active:true },
      { id:20, code:'6030', name:'Marketing & Advertising', type:'expense', subtype:'operating_expense', parentId:17, active:true }
    ]);
  }

  // New payroll GL accounts (add if missing)
  var coa = DB.load('nau_coa');
  var coaCodes = coa.map(function(c){ return c.code; });
  if (coaCodes.indexOf('6011') === -1) {
    coa.push({ id: DB.nextId('nau_coa'), code: '6011', name: 'NSSF Employer Contribution', type: 'expense', parentCode: '6000', balance: 'debit', description: 'Employer NSSF contributions', active: true });
    DB.save('nau_coa', coa);
  }
  coa = DB.load('nau_coa');
  coaCodes = coa.map(function(c){ return c.code; });
  if (coaCodes.indexOf('2300') === -1) {
    coa.push({ id: DB.nextId('nau_coa'), code: '2300', name: 'PAYE Payable', type: 'liability', parentCode: null, balance: 'credit', description: 'PAYE tax payable to URA', active: true });
    DB.save('nau_coa', coa);
  }
  coa = DB.load('nau_coa');
  coaCodes = coa.map(function(c){ return c.code; });
  if (coaCodes.indexOf('2400') === -1) {
    coa.push({ id: DB.nextId('nau_coa'), code: '2400', name: 'NSSF Payable', type: 'liability', parentCode: null, balance: 'credit', description: 'NSSF contributions payable', active: true });
    DB.save('nau_coa', coa);
  }

  // Employees
  if (!DB.load('nau_employees').length) {
    DB.save('nau_employees', [
      { id:1, name:'James Okello', email:'james@nipponauto.ug', phone:'+256 772 100 001', role:'Sales Manager', dept:'Sales', salary:800, allowances:100, payeRate:30, nssfEmp:5, nssfEmployer:10, bankName:'Stanbic', bankAccount:'001-234-567', status:'Active', createdAt:'2026-01-01T00:00:00.000Z' },
      { id:2, name:'Sarah Nakayima', email:'sarah@nipponauto.ug', phone:'+256 772 100 002', role:'Accountant', dept:'Finance', salary:650, allowances:50, payeRate:30, nssfEmp:5, nssfEmployer:10, bankName:'Stanbic', bankAccount:'001-234-568', status:'Active', createdAt:'2026-01-01T00:00:00.000Z' },
      { id:3, name:'Moses Kiggundu', email:'moses@nipponauto.ug', phone:'+256 772 100 003', role:'Mechanic', dept:'Workshop', salary:400, allowances:0, payeRate:10, nssfEmp:5, nssfEmployer:10, bankName:'Centenary', bankAccount:'002-345-678', status:'Active', createdAt:'2026-01-01T00:00:00.000Z' },
      { id:4, name:'Annet Namukasa', email:'annet@nipponauto.ug', phone:'+256 772 100 004', role:'Receptionist', dept:'Admin', salary:300, allowances:0, payeRate:10, nssfEmp:5, nssfEmployer:10, bankName:'Centenary', bankAccount:'002-345-679', status:'Active', createdAt:'2026-01-01T00:00:00.000Z' }
    ]);
  }

  // Payruns store init
  if (!localStorage.getItem('nau_payruns')) {
    DB.save('nau_payruns', []);
  }

  // Journals
  if (!DB.load('nau_journals').length) {
    DB.save('nau_journals', [
      { id:1, name:'Sales Journal', type:'sales', prefix:'INV', defaultAccount:'Accounts Receivable', active:true },
      { id:2, name:'Purchase Journal', type:'purchase', prefix:'BILL', defaultAccount:'Accounts Payable', active:true },
      { id:3, name:'Bank Journal - USD', type:'bank', prefix:'BNK-USD', defaultAccount:'Stanbic Bank USD', active:true },
      { id:4, name:'Bank Journal - UGX', type:'bank', prefix:'BNK-UGX', defaultAccount:'Stanbic Bank UGX', active:true },
      { id:5, name:'Cash Journal - USD', type:'cash', prefix:'CSH-USD', defaultAccount:'Cash - USD', active:true },
      { id:6, name:'General Journal', type:'general', prefix:'JNL', defaultAccount:'', active:true }
    ]);
  }

  // Taxes
  if (!DB.load('nau_taxes').length) {
    DB.save('nau_taxes', [
      { id:1, name:'VAT 18%', rate:18, type:'percentage', scope:'both', taxAccount:'VAT Payable', active:true },
      { id:2, name:'Zero-Rated (0%)', rate:0, type:'percentage', scope:'both', taxAccount:'VAT Payable', active:true },
      { id:3, name:'Exempt', rate:0, type:'percentage', scope:'sale', taxAccount:'', active:true },
      { id:4, name:'Withholding Tax 6%', rate:6, type:'percentage', scope:'purchase', taxAccount:'VAT Payable', active:true }
    ]);
  }

  // Customers
  if (!DB.load('nau_customers_acc').length) {
    DB.save('nau_customers_acc', [
      { id:1, name:'Musab Khalid', email:'musab@example.com', phone:'+256 700 111 001', address:'Kampala, Uganda', tin:'TIN-001-MK', currency:'USD', paymentTerms:30, notes:'', createdAt: nowISO() },
      { id:2, name:'Grace Nakato', email:'grace.nakato@gmail.com', phone:'+256 700 222 002', address:'Entebbe, Uganda', tin:'TIN-002-GN', currency:'USD', paymentTerms:15, notes:'', createdAt: nowISO() },
      { id:3, name:'John Mugisha', email:'j.mugisha@business.ug', phone:'+256 700 333 003', address:'Jinja, Uganda', tin:'TIN-003-JM', currency:'USD', paymentTerms:30, notes:'Corporate client', createdAt: nowISO() }
    ]);
  }

  // Vendors
  if (!DB.load('nau_vendors').length) {
    DB.save('nau_vendors', [
      { id:1, name:'Toyota Uganda Ltd', email:'sales@toyota.ug', phone:'+256 414 001 001', address:'Industrial Area, Kampala', tin:'TIN-T001', currency:'USD', paymentTerms:30, notes:'Main vehicle supplier', createdAt: nowISO() },
      { id:2, name:'Motul Uganda', email:'info@motul.ug', phone:'+256 414 002 002', address:'Nakawa, Kampala', tin:'TIN-M002', currency:'UGX', paymentTerms:14, notes:'Lubricants & oils', createdAt: nowISO() },
      { id:3, name:'Kampala Tyres', email:'orders@kampalatyres.ug', phone:'+256 414 003 003', address:'Kisenyi, Kampala', tin:'TIN-K003', currency:'UGX', paymentTerms:7, notes:'Tyre supplier', createdAt: nowISO() }
    ]);
  }

  // Purchase Orders
  if (!DB.load('nau_purchase_orders').length) {
    DB.save('nau_purchase_orders', [
      { id:1, poNo:'PO-2026-0001', vendorName:'Tokyo Auto Exports Ltd', manufacturerId:1, vehicleMake:'Toyota', modelId:3, vehicleModel:'Hilux D-Cabin', modelCodeId:4, vehicleYear:'2025', vehicleChassis:'MROYA3AV-703071210', color:'White', engineCode:'1GD-FTV', engineCC:'2755', bodyType:'D/Cabin', fuelType:'Diesel', drivetrain:'4WD', transmission:'Automatic', steeringPosition:'RHD', purchasePrice:42000, sellingPrice:49000, currency:'USD', purchaseDate:'2026-05-01', expectedDelivery:'2026-06-15', notes:'Port of Mombasa arrival', status:'Draft', vehicleId:null, billId:null, createdAt:'2026-05-01T08:00:00.000Z' },
      { id:2, poNo:'PO-2026-0002', vendorName:'Osaka Motors International', manufacturerId:2, vehicleMake:'Nissan', modelId:9, vehicleModel:'Patrol Y62', modelCodeId:8, vehicleYear:'2022', vehicleChassis:'JN8AY2ND-603141987', color:'Black', engineCode:'VK56VD', engineCC:'5552', bodyType:'SUV', fuelType:'Petrol', drivetrain:'4WD', transmission:'Automatic', steeringPosition:'RHD', purchasePrice:30000, sellingPrice:36500, currency:'USD', purchaseDate:'2026-05-05', expectedDelivery:'2026-06-20', notes:'V8 Platinum trim', status:'Confirmed', vehicleId:null, billId:null, confirmedAt:'2026-05-06T09:00:00.000Z', createdAt:'2026-05-05T10:00:00.000Z' }
    ]);
  }

  // Payment Accounts (with GL codes)
  if (!DB.load('nau_payment_accounts').length) {
    DB.save('nau_payment_accounts', [
      { id:1, name:'Cash (USD)', type:'Cash', currency:'USD', status:'Active', bankName:'', accountNumber:'', accountHolder:'NipponAuto Uganda Ltd', glAccountCode:'1001', createdAt: nowISO() },
      { id:2, name:'Cash (UGX)', type:'Cash', currency:'UGX', status:'Active', bankName:'', accountNumber:'', accountHolder:'NipponAuto Uganda Ltd', glAccountCode:'1002', createdAt: nowISO() },
      { id:3, name:'Stanbic Bank USD', type:'Bank', currency:'USD', status:'Active', bankName:'Stanbic Bank Uganda', accountNumber:'9030012345678', accountHolder:'NipponAuto Uganda Ltd', glAccountCode:'1010', createdAt: nowISO() },
      { id:4, name:'Stanbic Bank UGX', type:'Bank', currency:'UGX', status:'Active', bankName:'Stanbic Bank Uganda', accountNumber:'9030098765432', accountHolder:'NipponAuto Uganda Ltd', glAccountCode:'1011', createdAt: nowISO() }
    ]);
  }

  // Bank Statements
  if (!DB.load('nau_bank_statements').length) {
    const lines = [
      { date:'2026-05-01', ref:'TRF-001', description:'Opening deposit', debit:50000, credit:0, balance:50000, reconciled:true },
      { date:'2026-05-03', ref:'INV-2026-001', description:'Vehicle sale payment - Musab Khalid', debit:49000, credit:0, balance:99000, reconciled:true },
      { date:'2026-05-05', ref:'PMT-OUT-001', description:'Vehicle purchase - Toyota Uganda', debit:0, credit:32000, balance:67000, reconciled:false },
      { date:'2026-05-10', ref:'INV-2026-002', description:'Toyota Prado sale - Grace Nakato', debit:42000, credit:0, balance:109000, reconciled:false },
      { date:'2026-05-15', ref:'BILL-001', description:'Freight charges', debit:0, credit:3500, balance:105500, reconciled:false }
    ];
    DB.save('nau_bank_statements', [
      { id:1, accountId:'Stanbic Bank USD', statementDate:'2026-05-31', openingBalance:50000, closingBalance:105500, currency:'USD', lines, createdAt: nowISO() }
    ]);
  }

  // Journal Entries
  if (!DB.load('nau_journal_entries').length) {
    DB.save('nau_journal_entries', [
      { id:1, entryNo:'JNL-2026-0001', journalId:6, journalName:'General Journal', date:'2026-05-01', ref:'Opening', narration:'Opening balances', status:'Posted', createdAt: nowISO(),
        lines:[
          { accountCode:'1010', accountName:'Cash - USD', debit:50000, credit:0, description:'Opening cash' },
          { accountCode:'3000', accountName:"Owner's Equity", debit:0, credit:50000, description:'Opening equity' }
        ]},
      { id:2, entryNo:'JNL-2026-0002', journalId:1, journalName:'Sales Journal', date:'2026-05-03', ref:'INV-2026-001', narration:'Sale - Toyota Hilux to Musab Khalid', status:'Posted', createdAt: nowISO(),
        lines:[
          { accountCode:'1100', accountName:'Accounts Receivable', debit:49000, credit:0, description:'Invoice amount' },
          { accountCode:'4000', accountName:'Sales Revenue', debit:0, credit:49000, description:'Vehicle sale' }
        ]},
      { id:3, entryNo:'JNL-2026-0003', journalId:6, journalName:'General Journal', date:'2026-05-05', ref:'BILL-2026-001', narration:'Vehicle purchase cost', status:'Draft', createdAt: nowISO(),
        lines:[
          { accountCode:'5000', accountName:'Cost of Goods Sold', debit:32000, credit:0, description:'Cost of vehicle' },
          { accountCode:'2000', accountName:'Accounts Payable', debit:0, credit:32000, description:'Toyota Uganda invoice' }
        ]}
    ]);
  }
}

// ===== CHART OF ACCOUNTS =====
function renderCOA() {
  const q = (document.getElementById('coa-search')||{}).value||'';
  const typeF = (document.getElementById('coa-type-filter')||{}).value||'';
  const coa = DB.load('nau_coa').filter(a => {
    const mQ = !q || (a.code+a.name).toLowerCase().includes(q.toLowerCase());
    const mT = !typeF || a.type === typeF;
    return mQ && mT;
  }).sort((a,b) => a.code.localeCompare(b.code));

  const typeColor = { asset:'badge-paid', liability:'badge-overdue', equity:'badge-sent', revenue:'badge-invoice', expense:'badge-draft' };
  const tbody = document.getElementById('coa-tbody');
  if (!tbody) return;
  const allCoa = DB.load('nau_coa');
  tbody.innerHTML = coa.length ? coa.map(a => {
    const isChild = a.parentId;
    const parent = isChild ? allCoa.find(x=>x.id===a.parentId) : null;
    return `<tr>
      <td style="font-family:monospace;font-weight:600">${a.code}</td>
      <td style="padding-left:${isChild?'1.75rem':'0'}">
        ${isChild?'↳ ':''}${a.name}
        ${parent?`<div style="font-size:.72rem;color:#9ca3af">${parent.code} ${parent.name}</div>`:''}
      </td>
      <td><span class="badge ${typeColor[a.type]||'badge-draft'}">${a.type}</span></td>
      <td style="font-size:.8rem;color:#6b7280">${a.subtype||'-'}</td>
      <td>
        <label class="toggle-switch">
          <input type="checkbox" ${a.active?'checked':''} onchange="toggleCOA(${a.id},this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td>
        <div class="row-actions">
          <button class="btn-row" onclick="openModal('coa',${a.id})">✏️</button>
          <button class="btn-row btn-row-delete" onclick="deleteItem('nau_coa',${a.id},renderCOA)">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="6" class="table-empty"><span class="empty-icon">📒</span>No accounts found.</td></tr>';
}

function toggleCOA(id, active) {
  const coa = DB.load('nau_coa');
  const a = coa.find(x=>x.id===id);
  if (a) { a.active = active; DB.save('nau_coa', coa); toast('Updated'); }
}

// ===== JOURNALS =====
function renderJournals() {
  const rows = DB.load('nau_journals');
  const typeIcons = { sales:'🧾', purchase:'📋', bank:'🏦', cash:'💵', general:'📓' };
  const tbody = document.getElementById('journals-tbody');
  if (!tbody) return;
  tbody.innerHTML = rows.length ? rows.map(j => `
    <tr>
      <td><strong>${j.name}</strong></td>
      <td>${typeIcons[j.type]||''} ${j.type}</td>
      <td><span style="font-family:monospace;font-size:.82rem">${j.prefix||'-'}</span></td>
      <td style="font-size:.82rem">${j.defaultAccount||'-'}</td>
      <td>
        <label class="toggle-switch">
          <input type="checkbox" ${j.active?'checked':''} onchange="toggleJournal(${j.id},this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td>
        <div class="row-actions">
          <button class="btn-row" onclick="openModal('journal',${j.id})">✏️</button>
          <button class="btn-row btn-row-delete" onclick="deleteItem('nau_journals',${j.id},renderJournals)">🗑️</button>
        </div>
      </td>
    </tr>`).join('')
    : '<tr><td colspan="6" class="table-empty"><span class="empty-icon">📓</span>No journals configured.</td></tr>';
}

function toggleJournal(id, active) {
  const rows = DB.load('nau_journals');
  const j = rows.find(x=>x.id===id);
  if (j) { j.active = active; DB.save('nau_journals', rows); toast('Updated'); }
}

// ===== TAXES =====
function renderTaxes() {
  const rows = DB.load('nau_taxes');
  const tbody = document.getElementById('taxes-tbody');
  if (!tbody) return;
  tbody.innerHTML = rows.length ? rows.map(t => `
    <tr>
      <td><strong>${t.name}</strong></td>
      <td class="amount-mono">${t.rate}%</td>
      <td><span class="badge badge-draft">${t.scope}</span></td>
      <td style="font-size:.82rem">${t.taxAccount||'-'}</td>
      <td>
        <label class="toggle-switch">
          <input type="checkbox" ${t.active?'checked':''} onchange="toggleTax(${t.id},this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td>
        <div class="row-actions">
          <button class="btn-row" onclick="openModal('tax',${t.id})">✏️</button>
          <button class="btn-row btn-row-delete" onclick="deleteItem('nau_taxes',${t.id},renderTaxes)">🗑️</button>
        </div>
      </td>
    </tr>`).join('')
    : '<tr><td colspan="6" class="table-empty"><span class="empty-icon">💹</span>No taxes configured.</td></tr>';
}

function toggleTax(id, active) {
  const rows = DB.load('nau_taxes');
  const t = rows.find(x=>x.id===id);
  if (t) { t.active = active; DB.save('nau_taxes', rows); toast('Updated'); }
}

function taxOptions(selectedId) {
  const taxes = DB.load('nau_taxes').filter(t=>t.active);
  return `<option value="">No Tax</option>` + taxes.map(t =>
    `<option value="${t.id}" data-rate="${t.rate}" ${selectedId==t.id?'selected':''}>${t.name} (${t.rate}%)</option>`
  ).join('');
}

// ===== CUSTOMERS =====
function renderCustomersAcc() {
  const q = (document.getElementById('cacc-search')||{}).value||'';
  const rows = DB.load('nau_customers_acc').filter(c =>
    !q || (c.name+c.email+(c.tin||'')).toLowerCase().includes(q.toLowerCase())
  );
  const invoices = DB.load('nau_invoices');
  const tbody = document.getElementById('cacc-tbody');
  if (!tbody) return;
  tbody.innerHTML = rows.length ? rows.map(c => {
    const outstanding = invoices.filter(i=>i.customerName===c.name && ['Draft','Sent','Partially Paid'].includes(i.status))
      .reduce((s,i)=>s+(Number(i.totalAmount||0)-Number(i.paidAmount||0)),0);
    return `<tr>
      <td><strong>${c.name}</strong></td>
      <td style="font-size:.82rem">${c.email||'-'}</td>
      <td style="font-size:.82rem">${c.phone||'-'}</td>
      <td style="font-family:monospace;font-size:.78rem">${c.tin||'-'}</td>
      <td><span class="badge badge-draft">${c.currency||'USD'}</span></td>
      <td>${c.paymentTerms||30} days</td>
      <td class="amount-mono" style="color:${outstanding>0?'#f59e0b':'#6b7280'}">${outstanding>0?fmtMoney(outstanding):'-'}</td>
      <td>
        <div class="row-actions">
          <button class="btn-row" title="Statement of Account" onclick="openCustomerStatement('${c.email||c.name}')">📄</button>
          <button class="btn-row" onclick="openModal('customerAcc',${c.id})">✏️</button>
          <button class="btn-row btn-row-delete" onclick="deleteItem('nau_customers_acc',${c.id},renderCustomersAcc)">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="8" class="table-empty"><span class="empty-icon">👤</span>No customers yet.</td></tr>';
}

function customerAccOptions(selectedName) {
  const custs = DB.load('nau_customers_acc');
  if (!custs.length) return `<option value="">-- No customers. Add from Customers menu. --</option>`;
  return `<option value="">-- Select Customer --</option>` + custs.map(c =>
    `<option value="${c.name}" ${c.name===selectedName?'selected':''}>${c.name}</option>`
  ).join('');
}

// ===== VENDORS =====
function renderVendors() {
  const q = (document.getElementById('vend-search')||{}).value||'';
  const rows = DB.load('nau_vendors').filter(v =>
    !q || (v.name+v.email+(v.tin||'')).toLowerCase().includes(q.toLowerCase())
  );
  const bills = DB.load('nau_bills');
  const tbody = document.getElementById('vend-tbody');
  if (!tbody) return;
  tbody.innerHTML = rows.length ? rows.map(v => {
    const outstanding = bills.filter(b=>b.vendor===v.name && b.status==='Pending')
      .reduce((s,b)=>s+Number(b.amount||0),0);
    return `<tr>
      <td><strong>${v.name}</strong></td>
      <td style="font-size:.82rem">${v.email||'-'}</td>
      <td style="font-size:.82rem">${v.phone||'-'}</td>
      <td style="font-family:monospace;font-size:.78rem">${v.tin||'-'}</td>
      <td><span class="badge badge-draft">${v.currency||'USD'}</span></td>
      <td>${v.paymentTerms||30} days</td>
      <td class="amount-mono" style="color:${outstanding>0?'#c0392b':'#6b7280'}">${outstanding>0?fmtMoney(outstanding):'-'}</td>
      <td>
        <div class="row-actions">
          <button class="btn-row" title="Statement" onclick="openVendorStatement('${v.name}')">📄</button>
          <button class="btn-row" onclick="openModal('vendor',${v.id})">✏️</button>
          <button class="btn-row btn-row-delete" onclick="deleteItem('nau_vendors',${v.id},renderVendors)">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="8" class="table-empty"><span class="empty-icon">🏢</span>No vendors yet.</td></tr>';
}

function vendorOptions(selectedName) {
  const vends = DB.load('nau_vendors');
  if (!vends.length) return `<option value="">-- No vendors. Add from Vendors menu. --</option>`;
  return `<option value="">-- Select Vendor or type below --</option>` + vends.map(v =>
    `<option value="${v.name}" ${v.name===selectedName?'selected':''}>${v.name}</option>`
  ).join('');
}

// ===== CREDIT NOTES =====
function genCNNo() {
  const rows = DB.load('nau_credit_notes');
  return `CN-${new Date().getFullYear()}-${String(rows.length+1).padStart(3,'0')}`;
}

function renderCreditNotes() {
  const q = (document.getElementById('cn-search')||{}).value||'';
  const st = (document.getElementById('cn-status-filter')||{}).value||'';
  const rows = DB.load('nau_credit_notes').filter(c => {
    const mQ = !q || (c.cnNo+c.customerName+(c.invoiceRef||'')).toLowerCase().includes(q.toLowerCase());
    const mS = !st || c.status===st;
    return mQ && mS;
  }).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const tbody = document.getElementById('cn-tbody');
  if (!tbody) return;
  tbody.innerHTML = rows.length ? rows.map(cn => `
    <tr>
      <td><strong style="font-family:monospace">${cn.cnNo}</strong></td>
      <td style="font-family:monospace;font-size:.82rem">${cn.invoiceRef||'-'}</td>
      <td>${cn.customerName}</td>
      <td style="font-size:.82rem;color:#6b7280">${cn.reason||'-'}</td>
      <td class="amount-mono"><strong>${fmtMoney(cn.amount)}</strong></td>
      <td><span class="badge ${cn.status==='Confirmed'?'badge-paid':'badge-draft'}">${cn.status}</span></td>
      <td>${fmtDate(cn.createdAt)}</td>
      <td>
        <div class="row-actions">
          ${cn.status==='Draft'?`<button class="btn-row" title="Confirm" onclick="confirmCN(${cn.id})">✅</button>`:''}
          ${cn.status==='Draft'?`<button class="btn-row btn-row-delete" onclick="deleteItem('nau_credit_notes',${cn.id},renderCreditNotes)">🗑️</button>`:''}
        </div>
      </td>
    </tr>`).join('')
    : '<tr><td colspan="8" class="table-empty"><span class="empty-icon">📄</span>No credit notes found.</td></tr>';
}

function confirmCN(id) {
  const cns = DB.load('nau_credit_notes');
  const cn = cns.find(x=>x.id===id);
  if (!cn) return;
  cn.status = 'Confirmed';
  DB.save('nau_credit_notes', cns);
  // Apply to linked invoice
  if (cn.invoiceId) {
    const invs = DB.load('nau_invoices');
    const inv = invs.find(i=>i.id===cn.invoiceId);
    if (inv) {
      inv.paidAmount = (inv.paidAmount||0) + cn.amount;
      if (inv.paidAmount >= inv.totalAmount) { inv.status = 'Paid'; inv.paidAt = nowISO(); }
      else { inv.status = 'Partially Paid'; }
      DB.save('nau_invoices', invs);
    }
  }
  toast('Credit note confirmed and applied to invoice.');
  renderCreditNotes();
}

// ===== VENDOR CREDIT NOTES =====
function genVCNNo() {
  const rows = DB.load('nau_vendor_credit_notes');
  return `VCN-${new Date().getFullYear()}-${String(rows.length+1).padStart(3,'0')}`;
}

function renderVendorCreditNotes() {
  const q = (document.getElementById('vcn-search')||{}).value||'';
  const st = (document.getElementById('vcn-status-filter')||{}).value||'';
  const rows = DB.load('nau_vendor_credit_notes').filter(v => {
    const mQ = !q || (v.vcnNo+v.vendorName+(v.billRef||'')).toLowerCase().includes(q.toLowerCase());
    const mS = !st || v.status===st;
    return mQ && mS;
  }).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const tbody = document.getElementById('vcn-tbody');
  if (!tbody) return;
  tbody.innerHTML = rows.length ? rows.map(v => `
    <tr>
      <td><strong style="font-family:monospace">${v.vcnNo}</strong></td>
      <td style="font-family:monospace;font-size:.82rem">${v.billRef||'-'}</td>
      <td>${v.vendorName}</td>
      <td style="font-size:.82rem;color:#6b7280">${v.reason||'-'}</td>
      <td class="amount-mono"><strong>${fmtMoney(v.amount)}</strong></td>
      <td><span class="badge ${v.status==='Confirmed'?'badge-paid':'badge-draft'}">${v.status}</span></td>
      <td>${fmtDate(v.createdAt)}</td>
      <td>
        <div class="row-actions">
          ${v.status==='Draft'?`<button class="btn-row" onclick="confirmVCN(${v.id})">✅</button>`:''}
          ${v.status==='Draft'?`<button class="btn-row btn-row-delete" onclick="deleteItem('nau_vendor_credit_notes',${v.id},renderVendorCreditNotes)">🗑️</button>`:''}
        </div>
      </td>
    </tr>`).join('')
    : '<tr><td colspan="8" class="table-empty"><span class="empty-icon">📄</span>No vendor credit notes found.</td></tr>';
}

function confirmVCN(id) {
  const rows = DB.load('nau_vendor_credit_notes');
  const vcn = rows.find(x=>x.id===id);
  if (!vcn) return;
  vcn.status = 'Confirmed';
  DB.save('nau_vendor_credit_notes', rows);
  toast('Vendor credit note confirmed.');
  renderVendorCreditNotes();
}

// ===== BANK STATEMENTS =====
let _bsDetailId = null;

function renderBankStatements() {
  const acctF = (document.getElementById('bs-acct-filter')||{}).value||'';
  const rows = DB.load('nau_bank_statements').filter(s => !acctF || s.accountId===acctF)
    .sort((a,b)=>new Date(b.statementDate)-new Date(a.statementDate));
  const tbody = document.getElementById('bs-tbody');
  if (!tbody) return;
  tbody.innerHTML = rows.length ? rows.map(s => {
    const lines = s.lines||[];
    const reconciled = lines.filter(l=>l.reconciled).length;
    return `<tr>
      <td><strong>BST-${String(s.id).padStart(3,'0')}</strong></td>
      <td>${s.accountId}</td>
      <td>${s.statementDate||'-'}</td>
      <td class="amount-mono">${fmtMoney(s.openingBalance, s.currency||'USD')}</td>
      <td class="amount-mono">${fmtMoney(s.closingBalance, s.currency||'USD')}</td>
      <td>${lines.length} lines</td>
      <td>${reconciled}/${lines.length}</td>
      <td>
        <div class="row-actions">
          <button class="btn-row" onclick="openBSDetail(${s.id})" title="View Lines">👁️</button>
          <button class="btn-row" onclick="openReconciliation(${s.id})" title="Reconcile" style="background:#6c757d;color:#fff;">🔗</button>
          <button class="btn-row btn-row-delete" onclick="deleteItem('nau_bank_statements',${s.id},renderBankStatements)">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="8" class="table-empty"><span class="empty-icon">🏦</span>No bank statements yet.</td></tr>';
}

function openBSDetail(id) {
  _bsDetailId = id;
  const s = DB.load('nau_bank_statements').find(x=>x.id===id);
  if (!s) return;
  document.getElementById('bs-detail-title').textContent = `${s.accountId} — ${s.statementDate}`;
  const lines = s.lines||[];
  const totalIn = lines.reduce((sum,l)=>sum+Number(l.debit||0),0);
  const totalOut = lines.reduce((sum,l)=>sum+Number(l.credit||0),0);
  document.getElementById('bs-detail-summary').innerHTML = `
    <div class="bs-summary-row">
      <span>Opening Balance: <strong>${fmtMoney(s.openingBalance, s.currency||'USD')}</strong></span>
      <span>Money In: <strong style="color:#10b981">${fmtMoney(totalIn, s.currency||'USD')}</strong></span>
      <span>Money Out: <strong style="color:#c0392b">${fmtMoney(totalOut, s.currency||'USD')}</strong></span>
      <span>Closing Balance: <strong>${fmtMoney(s.closingBalance, s.currency||'USD')}</strong></span>
    </div>`;
  document.getElementById('bs-lines-tbody').innerHTML = lines.length ? lines.map((l,idx) => `
    <tr>
      <td>${l.date||'-'}</td>
      <td style="font-family:monospace;font-size:.8rem">${l.ref||'-'}</td>
      <td style="font-size:.82rem">${l.description||'-'}</td>
      <td class="amount-mono" style="color:#10b981">${l.debit?fmtMoney(l.debit):'-'}</td>
      <td class="amount-mono" style="color:#c0392b">${l.credit?fmtMoney(l.credit):'-'}</td>
      <td class="amount-mono">${fmtMoney(l.balance)}</td>
      <td>
        <label class="toggle-switch">
          <input type="checkbox" ${l.reconciled?'checked':''} onchange="toggleBSLine(${id},${idx},this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </td>
    </tr>`).join('')
    : '<tr><td colspan="7" class="table-empty">No lines in this statement.</td></tr>';
  document.getElementById('bs-detail-panel').style.display = 'block';
}

function toggleBSLine(stmtId, lineIdx, reconciled) {
  const stmts = DB.load('nau_bank_statements');
  const s = stmts.find(x=>x.id===stmtId);
  if (s && s.lines[lineIdx]) { s.lines[lineIdx].reconciled = reconciled; DB.save('nau_bank_statements', stmts); toast('Reconciliation updated'); }
}

function populateBSFilter() {
  const sel = document.getElementById('bs-acct-filter');
  if (!sel) return;
  const accts = DB.load('nau_payment_accounts');
  sel.innerHTML = '<option value="">All Accounts</option>' + accts.map(a=>
    `<option value="${a.name}">${a.name}</option>`).join('');
}

// ===== AUTO GL POSTING HELPERS =====
function coaName(code) {
  return (DB.load('nau_coa').find(a => a.code === String(code)) || {}).name || String(code);
}

function postJE(lines, ref, narration, journalType) {
  const debits = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const credits = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  if (Math.abs(debits - credits) > 0.01) {
    console.warn('[postJE] Unbalanced entry skipped:', ref, 'D:', debits, 'C:', credits);
    return;
  }
  const entries = DB.load('nau_journal_entries');
  entries.push({
    id: DB.nextId('nau_journal_entries'),
    entryNo: genJENo(),
    journalType: journalType || 'general',
    date: new Date().toISOString().split('T')[0],
    reference: ref,
    narration: narration,
    lines: lines,
    status: 'Posted',
    autoPosted: true,
    createdAt: nowISO()
  });
  DB.save('nau_journal_entries', entries);
}

function postInvoiceJE(inv) {
  if (!inv || inv.jeRef) return;
  const total = Number(inv.totalAmount || 0);
  const tax = Number(inv.taxAmount || 0);
  const net = total - tax;
  if (total <= 0) return;
  const lines = [
    { accountCode: '1100', accountName: coaName('1100'), debit: total, credit: 0, description: 'AR — ' + inv.invoiceNo },
    { accountCode: '4000', accountName: coaName('4000'), debit: 0, credit: net, description: 'Revenue — ' + inv.invoiceNo }
  ];
  if (tax > 0) lines.push({ accountCode: '2100', accountName: coaName('2100'), debit: 0, credit: tax, description: 'VAT — ' + inv.invoiceNo });
  postJE(lines, inv.invoiceNo, 'Sales invoice — ' + (inv.customerName || ''), 'sales');
  inv.jeRef = inv.invoiceNo;
}

function postCOGSJE(vehicleId, invoiceNo) {
  if (!vehicleId) return;
  const po = DB.load('nau_purchase_orders').find(p => p.vehicleId === Number(vehicleId) && p.purchasePrice);
  if (!po) return;
  const cost = Number(po.purchasePrice || 0);
  if (cost <= 0) return;
  postJE([
    { accountCode: '5000', accountName: coaName('5000'), debit: cost, credit: 0, description: 'COGS — ' + invoiceNo },
    { accountCode: '1200', accountName: coaName('1200'), debit: 0, credit: cost, description: 'Inventory — ' + invoiceNo }
  ], invoiceNo + '-COGS', 'Cost of goods sold — ' + invoiceNo, 'general');
}

function postReceiptJE(payment, inv) {
  if (!payment || payment.jeRef) return;
  const acct = DB.load('nau_payment_accounts').find(a => a.name === payment.method) || {};
  const cashCode = acct.glAccountCode || '1001';
  const cashName = acct.name || 'Cash';
  const amt = Number(payment.amount || 0);
  if (amt <= 0) return;
  postJE([
    { accountCode: cashCode, accountName: cashName, debit: amt, credit: 0, description: 'Receipt — ' + (inv.invoiceNo || '') },
    { accountCode: '1100', accountName: coaName('1100'), debit: 0, credit: amt, description: 'AR clearance — ' + (inv.invoiceNo || '') }
  ], payment.paymentNo, 'Payment from ' + (inv.customerName || ''), 'bank');
  payment.jeRef = payment.paymentNo;
}

const BILL_EXPENSE_CODES = {
  'Vehicle Purchase': '5000', 'Freight': '6020', 'Insurance': '6020',
  'Maintenance': '6030', 'Salaries': '6010', 'Utilities': '6020',
  'Marketing': '6030', 'Office Supplies': '6030', 'Other': '6030'
};

function postBillJE(bill) {
  if (!bill || bill.jeRef) return;
  const amt = Number(bill.amount || 0);
  if (amt <= 0) return;
  const expCode = BILL_EXPENSE_CODES[bill.category] || '6030';
  postJE([
    { accountCode: expCode, accountName: coaName(expCode), debit: amt, credit: 0, description: (bill.category || 'Expense') + ' — ' + bill.billNo },
    { accountCode: '2000', accountName: coaName('2000'), debit: 0, credit: amt, description: 'AP — ' + bill.billNo }
  ], bill.billNo, 'Vendor bill — ' + (bill.vendor || ''), 'purchase');
  bill.jeRef = bill.billNo;
}

function postBillPaymentJE(payment, bill) {
  if (!payment || payment.jeRef) return;
  const acct = DB.load('nau_payment_accounts').find(a => a.name === payment.method) || {};
  const cashCode = acct.glAccountCode || '1001';
  const cashName = acct.name || 'Cash';
  const amt = Number(payment.amount || 0);
  if (amt <= 0) return;
  postJE([
    { accountCode: '2000', accountName: coaName('2000'), debit: amt, credit: 0, description: 'AP clearance — ' + (bill.billNo || '') },
    { accountCode: cashCode, accountName: cashName, debit: 0, credit: amt, description: 'Payment — ' + (bill.billNo || '') }
  ], payment.paymentNo, 'Payment to ' + (bill.vendor || ''), 'bank');
  payment.jeRef = payment.paymentNo;
}

function getGLBalances() {
  const entries = DB.load('nau_journal_entries').filter(e => e.status === 'Posted');
  const bal = {};
  entries.forEach(e => {
    (e.lines || []).forEach(l => {
      const c = String(l.accountCode || '');
      if (!c) return;
      if (!bal[c]) bal[c] = { name: l.accountName || c, debit: 0, credit: 0 };
      bal[c].debit += Number(l.debit || 0);
      bal[c].credit += Number(l.credit || 0);
    });
  });
  return bal;
}

// ===== JOURNAL ENTRIES =====
let _jeEditId = null;
let _jeLines = [];

function genJENo() {
  const rows = DB.load('nau_journal_entries');
  return `JNL-${new Date().getFullYear()}-${String(rows.length+1).padStart(4,'0')}`;
}

function renderJournalEntries() {
  const q = (document.getElementById('je-search')||{}).value||'';
  const jf = (document.getElementById('je-journal-filter')||{}).value||'';
  const sf = (document.getElementById('je-status-filter')||{}).value||'';
  let rows = DB.load('nau_journal_entries').filter(e => {
    const mQ = !q || (e.entryNo+(e.ref||'')+(e.narration||'')).toLowerCase().includes(q.toLowerCase());
    const mJ = !jf || String(e.journalId)===jf;
    const mS = !sf || e.status===sf;
    return mQ && mJ && mS;
  }).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));

  const tbody = document.getElementById('je-tbody');
  if (!tbody) return;
  tbody.innerHTML = rows.length ? rows.map(e => {
    const totalDebit = (e.lines||[]).reduce((s,l)=>s+Number(l.debit||0),0);
    const totalCredit = (e.lines||[]).reduce((s,l)=>s+Number(l.credit||0),0);
    return `<tr>
      <td><strong style="font-family:monospace">${e.entryNo}</strong></td>
      <td style="font-size:.8rem">${e.journalName||'-'}</td>
      <td>${e.date||'-'}</td>
      <td style="font-size:.8rem;font-family:monospace">${e.ref||'-'}</td>
      <td style="font-size:.8rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.narration||'-'}</td>
      <td class="amount-mono" style="color:#10b981">${fmtMoney(totalDebit)}</td>
      <td class="amount-mono" style="color:#c0392b">${fmtMoney(totalCredit)}</td>
      <td><span class="badge ${e.status==='Posted'?'badge-paid':'badge-draft'}">${e.status}</span></td>
      <td>
        <div class="row-actions">
          <button class="btn-row" onclick="viewJELines(${e.id})" title="View lines">👁️</button>
          ${e.status==='Draft'?`<button class="btn-row" onclick="openJournalEntryModal(${e.id})" title="Edit">✏️</button>`:''}
          ${e.status==='Draft'?`<button class="btn-row btn-row-delete" onclick="deleteItem('nau_journal_entries',${e.id},renderJournalEntries)">🗑️</button>`:''}
        </div>
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="9" class="table-empty"><span class="empty-icon">📝</span>No journal entries yet.</td></tr>';

  // Populate journal filter
  const jfEl = document.getElementById('je-journal-filter');
  if (jfEl && (!jfEl.options.length || jfEl.options.length < 2)) {
    const journals = DB.load('nau_journals');
    jfEl.innerHTML = '<option value="">All Journals</option>' + journals.map(j=>
      `<option value="${j.id}">${j.name}</option>`).join('');
  }
}

function viewJELines(id) {
  const e = DB.load('nau_journal_entries').find(x=>x.id===id);
  if (!e) return;
  const lines = (e.lines||[]).map(l=>
    `<tr><td style="font-family:monospace">${l.accountCode||''}</td><td>${l.accountName}</td><td style="font-size:.8rem">${l.description||''}</td><td class="amount-mono" style="color:#10b981">${l.debit?fmtMoney(l.debit):''}</td><td class="amount-mono" style="color:#c0392b">${l.credit?fmtMoney(l.credit):''}</td></tr>`
  ).join('');
  document.getElementById('modalTitle').textContent = `${e.entryNo} — ${e.narration||'Journal Entry'}`;
  document.getElementById('modalBody').innerHTML = `
    <p style="font-size:.82rem;color:#6b7280;margin-bottom:.75rem">Journal: ${e.journalName||'-'} | Date: ${e.date||'-'} | Ref: ${e.ref||'-'} | Status: ${e.status}</p>
    <div class="table-wrap"><table class="acc-table"><thead><tr><th>Code</th><th>Account</th><th>Description</th><th>Debit</th><th>Credit</th></tr></thead><tbody>${lines}</tbody></table></div>`;
  document.getElementById('modalSaveBtn').style.display = 'none';
  document.getElementById('modalBackdrop').classList.add('open');
}

function openJournalEntryModal(id) {
  _jeEditId = id || null;
  const e = id ? DB.load('nau_journal_entries').find(x=>x.id===id) : null;
  _jeLines = e ? JSON.parse(JSON.stringify(e.lines||[])) : [
    { accountCode:'', accountName:'', debit:0, credit:0, description:'' },
    { accountCode:'', accountName:'', debit:0, credit:0, description:'' }
  ];
  const journals = DB.load('nau_journals');
  document.getElementById('jeModalTitle').textContent = id ? `Edit Journal Entry — ${e.entryNo}` : 'New Journal Entry';
  document.getElementById('jeModalBody').innerHTML = `
    <div class="form-row">
      <div class="form-group">
        <label>Journal <span class="required">*</span></label>
        <select class="form-control" id="je-journal-sel">
          <option value="">-- Select Journal --</option>
          ${journals.map(j=>`<option value="${j.id}" data-name="${j.name}" ${e&&e.journalId===j.id?'selected':''}>${j.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Date <span class="required">*</span></label>
        <input class="form-control" type="date" id="je-date" value="${e?e.date:new Date().toISOString().split('T')[0]}" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Reference</label>
        <input class="form-control" id="je-ref" value="${e?e.ref||'':''}" placeholder="e.g. INV-2026-001" />
      </div>
      <div class="form-group">
        <label>Narration</label>
        <input class="form-control" id="je-narration" value="${e?e.narration||'':''}" placeholder="Brief description" />
      </div>
    </div>
    <div style="margin:1rem 0 .5rem;font-weight:700;font-size:.88rem;color:#0a1628">Journal Lines</div>
    <div class="table-wrap" style="overflow-x:auto">
      <table class="je-table" id="je-lines-table">
        <thead><tr><th style="min-width:90px">Code</th><th style="min-width:180px">Account <span class="required">*</span></th><th style="min-width:140px">Description</th><th style="min-width:120px">Debit</th><th style="min-width:120px">Credit</th><th></th></tr></thead>
        <tbody id="je-lines-body"></tbody>
        <tfoot><tr class="je-totals-row">
          <td colspan="3" style="text-align:right;font-weight:700;font-size:.84rem">Totals</td>
          <td class="amount-mono" id="je-total-debit" style="color:#10b981;font-weight:700">$0</td>
          <td class="amount-mono" id="je-total-credit" style="color:#c0392b;font-weight:700">$0</td>
          <td></td>
        </tr></tfoot>
      </table>
    </div>
    <button class="je-add-btn" onclick="addJELine()">+ Add Line</button>
    <div id="je-balance-msg" style="margin-top:.5rem;font-size:.82rem"></div>`;
  renderJELines();
  document.getElementById('jeModalBackdrop').classList.add('open');
}

function renderJELines() {
  const coa = DB.load('nau_coa').filter(a=>a.active);
  const coaOpts = coa.map(a=>`<option value="${a.code}" data-name="${a.name}">${a.code} — ${a.name}</option>`).join('');
  const tbody = document.getElementById('je-lines-body');
  if (!tbody) return;
  tbody.innerHTML = _jeLines.map((l,i) => `
    <tr>
      <td style="width:90px">
        <input class="form-control" style="font-size:.8rem;padding:.3rem .4rem;font-family:monospace" value="${l.accountCode||''}" oninput="jeLineCodeChange(${i},this.value)" placeholder="Code" />
      </td>
      <td>
        <select class="form-control" style="font-size:.82rem;padding:.3rem .4rem" onchange="jeLineAccChange(${i},this)">
          <option value="">-- Account --</option>${coaOpts}
        </select>
      </td>
      <td><input class="form-control" style="font-size:.82rem;padding:.3rem .4rem" value="${l.description||''}" oninput="jeLine(${i},'description',this.value)" /></td>
      <td><input class="form-control amount-input" style="font-size:.82rem;padding:.3rem .4rem;text-align:right" type="number" min="0" step="0.01" value="${l.debit||''}" oninput="jeLine(${i},'debit',this.value);jeLine(${i},'credit',0);updateJETotals()" placeholder="0.00" /></td>
      <td><input class="form-control amount-input" style="font-size:.82rem;padding:.3rem .4rem;text-align:right" type="number" min="0" step="0.01" value="${l.credit||''}" oninput="jeLine(${i},'credit',this.value);jeLine(${i},'debit',0);updateJETotals()" placeholder="0.00" /></td>
      <td><button class="btn-row btn-row-delete" onclick="removeJELine(${i})" ${_jeLines.length<=2?'disabled':''}>✕</button></td>
    </tr>`).join('');

  // Set selected in each account dropdown
  _jeLines.forEach((l,i) => {
    const rows = tbody.querySelectorAll('tr');
    if (!rows[i]) return;
    const sel = rows[i].querySelector('select');
    if (sel && l.accountCode) sel.value = l.accountCode;
  });
  updateJETotals();
}

function addJELine() {
  _jeLines.push({ accountCode:'', accountName:'', debit:0, credit:0, description:'' });
  renderJELines();
}

function removeJELine(idx) {
  if (_jeLines.length <= 2) return;
  _jeLines.splice(idx, 1);
  renderJELines();
}

function jeLine(idx, field, val) {
  if (!_jeLines[idx]) return;
  _jeLines[idx][field] = (field==='debit'||field==='credit') ? (parseFloat(val)||0) : val;
}

function jeLineAccChange(idx, sel) {
  const opt = sel.options[sel.selectedIndex];
  _jeLines[idx].accountCode = opt.value;
  _jeLines[idx].accountName = opt.dataset.name||opt.text;
}

function jeLineCodeChange(idx, code) {
  _jeLines[idx].accountCode = code;
  const coa = DB.load('nau_coa').find(a=>a.code===code);
  if (coa) { _jeLines[idx].accountName = coa.name; renderJELines(); }
}

function updateJETotals() {
  const td = _jeLines.reduce((s,l)=>s+Number(l.debit||0),0);
  const tc = _jeLines.reduce((s,l)=>s+Number(l.credit||0),0);
  const tdEl = document.getElementById('je-total-debit');
  const tcEl = document.getElementById('je-total-credit');
  const msgEl = document.getElementById('je-balance-msg');
  if (tdEl) tdEl.textContent = fmtMoney(td);
  if (tcEl) tcEl.textContent = fmtMoney(tc);
  if (msgEl) {
    if (Math.abs(td-tc) < 0.01) {
      msgEl.innerHTML = '<span style="color:#10b981;font-weight:600">✓ Balanced — debits equal credits</span>';
    } else {
      msgEl.innerHTML = `<span style="color:#c0392b;font-weight:600">⚠ Out of balance by ${fmtMoney(Math.abs(td-tc))}</span>`;
    }
  }
}

function saveJournalEntry(status) {
  const journalSel = document.getElementById('je-journal-sel');
  const journalId = Number(journalSel.value);
  const journalName = journalSel.options[journalSel.selectedIndex]?.dataset.name || '';
  const date = document.getElementById('je-date').value;
  if (!journalId) { toast('Select a journal'); return; }
  if (!date) { toast('Date is required'); return; }

  const td = _jeLines.reduce((s,l)=>s+Number(l.debit||0),0);
  const tc = _jeLines.reduce((s,l)=>s+Number(l.credit||0),0);
  if (_jeLines.some(l=>!l.accountCode&&!l.accountName)) { toast('All lines must have an account'); return; }
  if (status==='Posted' && Math.abs(td-tc)>0.01) { toast('Cannot post: debits must equal credits'); return; }

  const entries = DB.load('nau_journal_entries');
  if (_jeEditId) {
    const idx = entries.findIndex(e=>e.id===_jeEditId);
    if (idx>-1) entries[idx] = { ...entries[idx], journalId, journalName, date, ref: document.getElementById('je-ref').value, narration: document.getElementById('je-narration').value, status, lines: _jeLines };
    DB.save('nau_journal_entries', entries);
    toast('Journal entry updated');
  } else {
    entries.push({ id: DB.nextId('nau_journal_entries'), entryNo: genJENo(), journalId, journalName, date, ref: document.getElementById('je-ref').value, narration: document.getElementById('je-narration').value, status, lines: _jeLines, createdAt: nowISO() });
    DB.save('nau_journal_entries', entries);
    toast(status==='Posted' ? 'Journal entry posted' : 'Draft saved');
  }
  closeJEModal();
  renderJournalEntries();
}

function closeJEModal() {
  document.getElementById('jeModalBackdrop').classList.remove('open');
  _jeEditId = null;
  _jeLines = [];
}

// ===== REPORTS: TRIAL BALANCE =====
function renderTrialBalance() {
  const coa = DB.load('nau_coa');
  const balances = getGLBalances();

  // Merge COA info into balances; also include GL entries for codes not in COA
  const allCodes = new Set([...coa.map(a => a.code), ...Object.keys(balances)]);
  const sortedCodes = [...allCodes].sort();

  let totalDebit = 0, totalCredit = 0;
  const rows = sortedCodes.map(code => {
    const b = balances[code];
    if (!b || (!b.debit && !b.credit)) return '';
    const coaEntry = coa.find(a => a.code === code);
    const name = b.name || (coaEntry ? coaEntry.name : code);
    const type = coaEntry ? coaEntry.type : '-';
    const netBal = b.debit - b.credit;
    totalDebit += b.debit;
    totalCredit += b.credit;
    return `<tr>
      <td style="font-family:monospace">${code}</td>
      <td>${name}</td>
      <td><span class="badge badge-draft" style="font-size:.72rem">${type}</span></td>
      <td class="amount-mono" style="color:#10b981">${b.debit ? fmtMoney(b.debit) : '-'}</td>
      <td class="amount-mono" style="color:#c0392b">${b.credit ? fmtMoney(b.credit) : '-'}</td>
      <td class="amount-mono" style="color:${netBal >= 0 ? '#0a1628' : '#c0392b'}">${fmtMoney(Math.abs(netBal))} ${netBal < 0 ? 'Cr' : 'Dr'}</td>
    </tr>`;
  }).join('');

  const el = document.getElementById('trial-balance-content');
  if (!el) return;
  el.innerHTML = `<div class="report-card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem">
      <h3 style="font-size:1rem;font-weight:700">Trial Balance</h3>
      <span style="font-size:.8rem;color:#6b7280">All posted journal entries</span>
    </div>
    <div class="table-wrap"><table class="acc-table">
      <thead><tr><th>Code</th><th>Account</th><th>Type</th><th>Total Debits</th><th>Total Credits</th><th>Balance</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="table-empty">No posted transactions yet.</td></tr>'}</tbody>
      <tfoot><tr style="background:#f4f6fa;font-weight:700">
        <td colspan="3" style="text-align:right;padding:.75rem">TOTALS</td>
        <td class="amount-mono" style="color:#10b981">${fmtMoney(totalDebit)}</td>
        <td class="amount-mono" style="color:#c0392b">${fmtMoney(totalCredit)}</td>
        <td></td>
      </tr></tfoot>
    </table></div>
    <p style="margin-top:.75rem;font-size:.8rem;color:${Math.abs(totalDebit - totalCredit) < 0.01 ? '#10b981' : '#c0392b'};font-weight:600">
      ${Math.abs(totalDebit - totalCredit) < 0.01 ? '✓ Balanced — debits equal credits' : '⚠ Out of Balance by ' + fmtMoney(Math.abs(totalDebit - totalCredit))}
    </p>
  </div>`;
}

// ===== REPORTS: BALANCE SHEET =====
function renderBalanceSheet() {
  const coa = DB.load('nau_coa');
  const balances = getGLBalances();

  // Group accounts by type using COA
  const groups = { asset: [], liability: [], equity: [], revenue: [], expense: [] };
  coa.forEach(a => {
    const b = balances[a.code];
    if (!b) return;
    const netBal = a.type === 'asset' || a.type === 'expense'
      ? b.debit - b.credit   // debit-normal
      : b.credit - b.debit;  // credit-normal
    if (groups[a.type]) groups[a.type].push({ code: a.code, name: a.name, balance: netBal });
  });

  function section(items) {
    return items.map(i => `<div class="bs-row"><span>${i.code} ${i.name}</span><span class="amount-mono">${fmtMoney(Math.abs(i.balance))}${i.balance < 0 ? ' Cr' : ''}</span></div>`).join('');
  }

  const totalAssets = groups.asset.reduce((s, i) => s + i.balance, 0);
  const totalLiabilities = groups.liability.reduce((s, i) => s + i.balance, 0);
  const totalEquity = groups.equity.reduce((s, i) => s + i.balance, 0);
  const totalRevenue = groups.revenue.reduce((s, i) => s + i.balance, 0);
  const totalExpenses = groups.expense.reduce((s, i) => s + i.balance, 0);
  const netProfit = totalRevenue - totalExpenses;
  const totalLiabEquity = totalLiabilities + totalEquity + netProfit;

  const el = document.getElementById('balance-sheet-content');
  if (!el) return;
  el.innerHTML = `<div class="bs-grid">
    <div class="bs-section">
      <h3>Assets</h3>
      ${section(groups.asset) || '<div class="bs-row" style="color:#999">No asset accounts with balances</div>'}
      <div class="bs-row bs-subtotal"><span>Total Assets</span><span class="amount-mono">${fmtMoney(totalAssets)}</span></div>
    </div>
    <div class="bs-section">
      <h3>Liabilities</h3>
      ${section(groups.liability) || '<div class="bs-row" style="color:#999">No liability accounts with balances</div>'}
      <div class="bs-row bs-subtotal"><span>Total Liabilities</span><span class="amount-mono" style="color:#c0392b">${fmtMoney(totalLiabilities)}</span></div>
      <h3 style="margin-top:1.25rem">Equity</h3>
      ${section(groups.equity) || '<div class="bs-row" style="color:#999">No equity accounts with balances</div>'}
      <div class="bs-row" style="margin-top:.5rem"><span>Net Profit (Revenue − Expenses)</span><span class="amount-mono" style="color:${netProfit >= 0 ? '#10b981' : '#c0392b'}">${fmtMoney(netProfit)}</span></div>
      <div class="bs-row bs-subtotal"><span>Total Equity + Net Profit</span><span class="amount-mono">${fmtMoney(totalEquity + netProfit)}</span></div>
      <div class="bs-row bs-subtotal" style="margin-top:.5rem"><span>Liabilities + Equity + Net Profit</span><span class="amount-mono">${fmtMoney(totalLiabEquity)}</span></div>
    </div>
  </div>
  <p style="margin-top:.75rem;font-size:.8rem;color:${Math.abs(totalAssets - totalLiabEquity) < 0.01 ? '#10b981' : '#c0392b'};font-weight:600">
    ${Math.abs(totalAssets - totalLiabEquity) < 0.01 ? '✓ Balance sheet is balanced' : '⚠ Assets ≠ Liabilities + Equity (difference: ' + fmtMoney(Math.abs(totalAssets - totalLiabEquity)) + ')'}
  </p>`;
}

// ===== REPORTS: GENERAL LEDGER =====
function renderGeneralLedger() {
  const acctFilter = (document.getElementById('gl-account-filter')||{}).value||'';
  const { from, to } = getDateRange();

  // Populate account filter
  const sel = document.getElementById('gl-account-filter');
  if (sel && sel.options.length < 2) {
    const coa = DB.load('nau_coa');
    sel.innerHTML = '<option value="">All Accounts</option>' + coa.map(a=>`<option value="${a.code}">${a.code} — ${a.name}</option>`).join('');
  }

  const entries = DB.load('nau_journal_entries').filter(e=>e.status==='Posted');
  const txns = [];
  entries.forEach(e => {
    (e.lines||[]).forEach(l => {
      if (!l.accountCode) return;
      if (acctFilter && l.accountCode !== acctFilter) return;
      if (from && e.date < from) return;
      if (to && e.date > to) return;
      txns.push({ date:e.date, entryNo:e.entryNo, description:l.description||e.narration, accountCode:l.accountCode, accountName:l.accountName, debit:Number(l.debit||0), credit:Number(l.credit||0) });
    });
  });
  txns.sort((a,b)=>a.date.localeCompare(b.date));

  let running = 0;
  const rows = txns.map(t => {
    running += t.debit - t.credit;
    return `<tr>
      <td>${t.date||'-'}</td>
      <td style="font-family:monospace;font-size:.8rem">${t.entryNo}</td>
      <td style="font-size:.8rem">${t.description||'-'}</td>
      <td style="font-size:.8rem">${t.accountCode} ${t.accountName}</td>
      <td class="amount-mono" style="color:#10b981">${t.debit?fmtMoney(t.debit):''}</td>
      <td class="amount-mono" style="color:#c0392b">${t.credit?fmtMoney(t.credit):''}</td>
      <td class="amount-mono" style="color:${running>=0?'#10b981':'#c0392b'}">${fmtMoney(Math.abs(running))} ${running<0?'Cr':'Dr'}</td>
    </tr>`;
  }).join('');

  const el = document.getElementById('general-ledger-content');
  if (!el) return;
  el.innerHTML = `<div class="report-card">
    <h3 style="margin-bottom:1.25rem;font-size:1rem;font-weight:700">General Ledger${acctFilter?' — '+acctFilter:''}</h3>
    <div class="table-wrap"><table class="acc-table">
      <thead><tr><th>Date</th><th>Entry No</th><th>Description</th><th>Account</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
      <tbody>${rows||'<tr><td colspan="7" class="table-empty">No posted transactions found.</td></tr>'}</tbody>
    </table></div>
  </div>`;
}

// ===== REPORTS: AGED PAYABLES =====
function renderAgedPayables() {
  const today = new Date();
  today.setHours(0,0,0,0);
  const bills = DB.load('nau_bills').filter(b=>['Pending','Overdue'].includes(b.status));

  const groups = [
    { label:'Current (Not Yet Due)', cls:'aging-current', items:[] },
    { label:'1–30 Days Overdue', cls:'aging-30', items:[] },
    { label:'31–60 Days Overdue', cls:'aging-60', items:[] },
    { label:'60+ Days Overdue', cls:'aging-90', items:[] }
  ];

  bills.forEach(b => {
    if (!b.dueDate) { groups[0].items.push(b); return; }
    const due = new Date(b.dueDate+'T00:00:00');
    const diff = Math.floor((today-due)/(1000*60*60*24));
    if (diff<=0) groups[0].items.push(b);
    else if (diff<=30) groups[1].items.push(b);
    else if (diff<=60) groups[2].items.push(b);
    else groups[3].items.push(b);
  });

  const el = document.getElementById('aged-payables-content');
  if (!el) return;
  el.innerHTML = groups.map(g => {
    const total = g.items.reduce((s,b)=>s+Number(b.amount||0),0);
    return `<div class="aging-group">
      <div class="aging-group-header">
        <span class="aging-group-label ${g.cls}">${g.label}</span>
        <span class="aging-total">${g.items.length} bill(s) — <strong>${fmtMoney(total)}</strong></span>
      </div>
      ${g.items.length?`<div class="table-wrap table-scroll"><table class="acc-table">
        <thead><tr><th>Bill No</th><th>Vendor</th><th>Category</th><th>Amount</th><th>Due Date</th></tr></thead>
        <tbody>${g.items.map(b=>`<tr>
          <td><strong>${b.billNo}</strong></td><td>${b.vendor}</td>
          <td>${b.category||'-'}</td><td class="amount-mono">${fmtMoney(b.amount)}</td>
          <td>${b.dueDate?fmtDate(b.dueDate+'T00:00:00'):'-'}</td>
        </tr>`).join('')}</tbody>
      </table></div>`:'<p style="color:#9ca3af;font-size:.82rem;padding:.5rem 0">No bills in this category.</p>'}
    </div>`;
  }).join('');
}

// ===== REPORTS: TAX REPORT =====
function renderTaxReport() {
  const { from, to } = getDateRange();
  const invoices = DB.load('nau_invoices').filter(i => {
    if (!['Paid','Sent','Partially Paid'].includes(i.status)) return false;
    if (from && i.createdAt < from) return false;
    if (to && i.createdAt > to+'T23:59:59Z') return false;
    return true;
  });
  const bills = DB.load('nau_bills').filter(b => {
    if (!['Paid','Pending'].includes(b.status)) return false;
    if (from && b.createdAt < from) return false;
    if (to && b.createdAt > to+'T23:59:59Z') return false;
    return true;
  });

  const outputTax = invoices.reduce((s,i)=>s+Number(i.taxAmount||0),0);
  const outputBase = invoices.reduce((s,i)=>s+Number(i.salePrice||0),0);
  const inputTax = 0; // Bills don't currently track tax separately
  const netVAT = outputTax - inputTax;

  const el = document.getElementById('tax-report-content');
  if (!el) return;
  el.innerHTML = `<div class="report-card">
    <h3 style="margin-bottom:1.25rem;font-size:1rem;font-weight:700">Tax Report / VAT Return</h3>
    <div class="pnl-row"><span style="font-weight:700">Output VAT (Sales)</span></div>
    <div class="pnl-row" style="padding-left:1.5rem"><span>Taxable Sales Amount</span><span class="amount-mono">${fmtMoney(outputBase)}</span></div>
    <div class="pnl-row" style="padding-left:1.5rem"><span>Output VAT Collected</span><span class="amount-green">${fmtMoney(outputTax)}</span></div>
    <div class="pnl-row" style="padding-left:1.5rem;font-size:.82rem;color:#6b7280"><span>Number of Tax Invoices</span><span>${invoices.filter(i=>i.taxAmount>0).length}</span></div>
    <hr style="margin:.75rem 0;border-color:#e8ecf0">
    <div class="pnl-row"><span style="font-weight:700">Input VAT (Purchases)</span></div>
    <div class="pnl-row" style="padding-left:1.5rem"><span>Input VAT Paid on Bills</span><span class="amount-red">${fmtMoney(inputTax)}</span></div>
    <hr style="margin:.75rem 0;border-color:#e8ecf0">
    <div class="pnl-row sub-total">
      <span>Net VAT Payable to URA</span>
      <span class="${netVAT>=0?'amount-green':'amount-red'}">${fmtMoney(Math.abs(netVAT))} ${netVAT<0?'(Refund)':''}</span>
    </div>
    <p style="margin-top:1rem;font-size:.78rem;color:#9ca3af">Note: Add tax to bills by setting tax amounts on bill records. This report uses VAT amounts from invoices.</p>
  </div>`;
}

// ===== NEW MODAL CONFIGS =====
Object.assign(modalConfigs, {
  coa: {
    label: 'Account',
    getData: id => DB.load('nau_coa').find(a=>a.id===id),
    form: d => {
      const coa = DB.load('nau_coa');
      const subtypes = { asset:['current_asset','fixed_asset'], liability:['current_liability','long_term_liability'], equity:['equity'], revenue:['revenue'], expense:['cogs','operating_expense','other_expense'] };
      const typeVal = d ? d.type : 'asset';
      return `
      <div class="form-row">
        <div class="form-group">
          <label>Account Code <span class="required">*</span></label>
          <input class="form-control" id="coa-code" value="${d?d.code||'':''}" placeholder="e.g. 1100" style="font-family:monospace" />
        </div>
        <div class="form-group">
          <label>Account Name <span class="required">*</span></label>
          <input class="form-control" id="coa-name" value="${d?d.name||'':''}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Type <span class="required">*</span></label>
          <select class="form-control" id="coa-type" onchange="updateCoaSubtypes()">
            ${['asset','liability','equity','revenue','expense'].map(t=>`<option value="${t}" ${typeVal===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Subtype</label>
          <select class="form-control" id="coa-subtype">
            ${(subtypes[typeVal]||[]).map(st=>`<option ${d&&d.subtype===st?'selected':''}>${st}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Parent Account</label>
        <select class="form-control" id="coa-parent">
          <option value="">-- None (top-level) --</option>
          ${coa.filter(a=>!a.parentId&&(!d||a.id!==d.id)).map(a=>`<option value="${a.id}" ${d&&d.parentId===a.id?'selected':''}>${a.code} ${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="toggle-switch">
          <input type="checkbox" id="coa-active" ${!d||d.active?'checked':''}>
          <span class="toggle-slider"></span>
          <span>Active</span>
        </label>
      </div>`;
    },
    collect: () => {
      const code = document.getElementById('coa-code').value.trim();
      const name = document.getElementById('coa-name').value.trim();
      if (!code||!name) { toast('Code and Name are required'); return null; }
      return { code, name, type: document.getElementById('coa-type').value, subtype: document.getElementById('coa-subtype').value, parentId: Number(document.getElementById('coa-parent').value)||null, active: document.getElementById('coa-active').checked };
    },
    create: d => { const all=DB.load('nau_coa'); all.push({id:DB.nextId('nau_coa'),...d}); DB.save('nau_coa',all); },
    update: (id,d) => { const all=DB.load('nau_coa'); const i=all.findIndex(x=>x.id===id); if(i>-1){all[i]={...all[i],...d};DB.save('nau_coa',all);} },
    refresh: renderCOA
  },

  journal: {
    label: 'Journal',
    getData: id => DB.load('nau_journals').find(j=>j.id===id),
    form: d => `
      <div class="form-row">
        <div class="form-group">
          <label>Journal Name <span class="required">*</span></label>
          <input class="form-control" id="jnl-name" value="${d?d.name||'':''}" />
        </div>
        <div class="form-group">
          <label>Type <span class="required">*</span></label>
          <select class="form-control" id="jnl-type">
            ${['sales','purchase','bank','cash','general'].map(t=>`<option ${d&&d.type===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Entry Prefix</label>
          <input class="form-control" id="jnl-prefix" value="${d?d.prefix||'':''}" placeholder="e.g. INV" style="font-family:monospace" />
        </div>
        <div class="form-group">
          <label>Default Account</label>
          <input class="form-control" id="jnl-acct" value="${d?d.defaultAccount||'':''}" placeholder="e.g. Accounts Receivable" />
        </div>
      </div>`,
    collect: () => {
      const name = document.getElementById('jnl-name').value.trim();
      if (!name) { toast('Journal name is required'); return null; }
      return { name, type: document.getElementById('jnl-type').value, prefix: document.getElementById('jnl-prefix').value.trim(), defaultAccount: document.getElementById('jnl-acct').value.trim(), active: true };
    },
    create: d => { const all=DB.load('nau_journals'); all.push({id:DB.nextId('nau_journals'),...d}); DB.save('nau_journals',all); },
    update: (id,d) => { const all=DB.load('nau_journals'); const i=all.findIndex(x=>x.id===id); if(i>-1){all[i]={...all[i],...d};DB.save('nau_journals',all);} },
    refresh: renderJournals
  },

  tax: {
    label: 'Tax',
    getData: id => DB.load('nau_taxes').find(t=>t.id===id),
    form: d => `
      <div class="form-row">
        <div class="form-group">
          <label>Tax Name <span class="required">*</span></label>
          <input class="form-control" id="tax-name" value="${d?d.name||'':''}" placeholder="e.g. VAT 18%" />
        </div>
        <div class="form-group">
          <label>Rate (%) <span class="required">*</span></label>
          <input class="form-control" type="number" id="tax-rate" value="${d?d.rate||0:0}" min="0" max="100" step="0.01" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Scope</label>
          <select class="form-control" id="tax-scope">
            <option value="both" ${!d||d.scope==='both'?'selected':''}>Both (Sale &amp; Purchase)</option>
            <option value="sale" ${d&&d.scope==='sale'?'selected':''}>Sales only</option>
            <option value="purchase" ${d&&d.scope==='purchase'?'selected':''}>Purchases only</option>
          </select>
        </div>
        <div class="form-group">
          <label>Tax Account</label>
          <input class="form-control" id="tax-acct" value="${d?d.taxAccount||'':''}" placeholder="e.g. VAT Payable" />
        </div>
      </div>`,
    collect: () => {
      const name = document.getElementById('tax-name').value.trim();
      if (!name) { toast('Tax name is required'); return null; }
      return { name, rate: parseFloat(document.getElementById('tax-rate').value)||0, type:'percentage', scope: document.getElementById('tax-scope').value, taxAccount: document.getElementById('tax-acct').value.trim(), active: true };
    },
    create: d => { const all=DB.load('nau_taxes'); all.push({id:DB.nextId('nau_taxes'),...d}); DB.save('nau_taxes',all); },
    update: (id,d) => { const all=DB.load('nau_taxes'); const i=all.findIndex(x=>x.id===id); if(i>-1){all[i]={...all[i],...d};DB.save('nau_taxes',all);} },
    refresh: renderTaxes
  },

  customerAcc: {
    label: 'Customer',
    getData: id => DB.load('nau_customers_acc').find(c=>c.id===id),
    form: d => `
      <div class="form-row">
        <div class="form-group">
          <label>Name <span class="required">*</span></label>
          <input class="form-control" id="cacc-name" value="${d?d.name||'':''}" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input class="form-control" type="email" id="cacc-email" value="${d?d.email||'':''}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Phone</label>
          <input class="form-control" id="cacc-phone" value="${d?d.phone||'':''}" />
        </div>
        <div class="form-group">
          <label>TIN / Tax ID</label>
          <input class="form-control" id="cacc-tin" value="${d?d.tin||'':''}" style="font-family:monospace" />
        </div>
      </div>
      <div class="form-group">
        <label>Address</label>
        <textarea class="form-control" id="cacc-addr" rows="2">${d?d.address||'':''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Currency</label>
          <select class="form-control" id="cacc-currency">
            ${['USD','UGX','KES','EUR'].map(c=>`<option ${d&&d.currency===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Payment Terms (days)</label>
          <input class="form-control" type="number" id="cacc-terms" value="${d?d.paymentTerms||30:30}" min="0" />
        </div>
      </div>`,
    collect: () => {
      const name = document.getElementById('cacc-name').value.trim();
      if (!name) { toast('Name is required'); return null; }
      return { name, email: document.getElementById('cacc-email').value.trim(), phone: document.getElementById('cacc-phone').value.trim(), tin: document.getElementById('cacc-tin').value.trim(), address: document.getElementById('cacc-addr').value.trim(), currency: document.getElementById('cacc-currency').value, paymentTerms: parseInt(document.getElementById('cacc-terms').value)||30 };
    },
    create: d => { const all=DB.load('nau_customers_acc'); all.push({id:DB.nextId('nau_customers_acc'),...d,createdAt:nowISO()}); DB.save('nau_customers_acc',all); },
    update: (id,d) => { const all=DB.load('nau_customers_acc'); const i=all.findIndex(x=>x.id===id); if(i>-1){all[i]={...all[i],...d};DB.save('nau_customers_acc',all);} },
    refresh: renderCustomersAcc
  },

  vendor: {
    label: 'Vendor',
    getData: id => DB.load('nau_vendors').find(v=>v.id===id),
    form: d => `
      <div class="form-row">
        <div class="form-group">
          <label>Name <span class="required">*</span></label>
          <input class="form-control" id="vend-name" value="${d?d.name||'':''}" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input class="form-control" type="email" id="vend-email" value="${d?d.email||'':''}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Phone</label>
          <input class="form-control" id="vend-phone" value="${d?d.phone||'':''}" />
        </div>
        <div class="form-group">
          <label>TIN / Tax ID</label>
          <input class="form-control" id="vend-tin" value="${d?d.tin||'':''}" style="font-family:monospace" />
        </div>
      </div>
      <div class="form-group">
        <label>Address</label>
        <textarea class="form-control" id="vend-addr" rows="2">${d?d.address||'':''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Currency</label>
          <select class="form-control" id="vend-currency">
            ${['USD','UGX','KES','EUR'].map(c=>`<option ${d&&d.currency===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Payment Terms (days)</label>
          <input class="form-control" type="number" id="vend-terms" value="${d?d.paymentTerms||30:30}" min="0" />
        </div>
      </div>`,
    collect: () => {
      const name = document.getElementById('vend-name').value.trim();
      if (!name) { toast('Name is required'); return null; }
      return { name, email: document.getElementById('vend-email').value.trim(), phone: document.getElementById('vend-phone').value.trim(), tin: document.getElementById('vend-tin').value.trim(), address: document.getElementById('vend-addr').value.trim(), currency: document.getElementById('vend-currency').value, paymentTerms: parseInt(document.getElementById('vend-terms').value)||30 };
    },
    create: d => { const all=DB.load('nau_vendors'); all.push({id:DB.nextId('nau_vendors'),...d,createdAt:nowISO()}); DB.save('nau_vendors',all); },
    update: (id,d) => { const all=DB.load('nau_vendors'); const i=all.findIndex(x=>x.id===id); if(i>-1){all[i]={...all[i],...d};DB.save('nau_vendors',all);} },
    refresh: renderVendors
  },

  creditNote: {
    label: 'Credit Note',
    getData: id => DB.load('nau_credit_notes').find(c=>c.id===id),
    form: d => {
      const invoices = DB.load('nau_invoices').filter(i=>['Sent','Partially Paid','Paid'].includes(i.status));
      return `
      <div class="form-row">
        <div class="form-group">
          <label>Linked Invoice</label>
          <select class="form-control" id="cn-invoice" onchange="onCNInvoiceChange()">
            <option value="">-- None --</option>
            ${invoices.map(i=>`<option value="${i.id}" data-customer="${i.customerName}" data-amount="${i.totalAmount}" ${d&&d.invoiceId===i.id?'selected':''}>${i.invoiceNo} — ${i.customerName}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Customer Name <span class="required">*</span></label>
          <input class="form-control" id="cn-customer" value="${d?d.customerName||'':''}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Date</label>
          <input class="form-control" type="date" id="cn-date" value="${d?d.date:new Date().toISOString().split('T')[0]}" />
        </div>
        <div class="form-group">
          <label>Amount (USD) <span class="required">*</span></label>
          <input class="form-control" type="number" id="cn-amount" value="${d?d.amount||'':''}" step="0.01" min="0" />
        </div>
      </div>
      <div class="form-group">
        <label>Reason <span class="required">*</span></label>
        <input class="form-control" id="cn-reason" value="${d?d.reason||'':''}" placeholder="Reason for credit note" />
      </div>`;
    },
    collect: () => {
      const customer = document.getElementById('cn-customer').value.trim();
      const amount = parseFloat(document.getElementById('cn-amount').value)||0;
      const reason = document.getElementById('cn-reason').value.trim();
      if (!customer) { toast('Customer is required'); return null; }
      if (!amount) { toast('Amount is required'); return null; }
      if (!reason) { toast('Reason is required'); return null; }
      const invSel = document.getElementById('cn-invoice');
      const invoiceId = Number(invSel.value)||null;
      const inv = invoiceId ? DB.load('nau_invoices').find(i=>i.id===invoiceId) : null;
      return { customerName:customer, invoiceId, invoiceRef:inv?inv.invoiceNo:null, date:document.getElementById('cn-date').value, amount, reason, status:'Draft' };
    },
    create: d => { const all=DB.load('nau_credit_notes'); all.push({id:DB.nextId('nau_credit_notes'),cnNo:genCNNo(),...d,createdAt:nowISO()}); DB.save('nau_credit_notes',all); },
    update: (id,d) => { const all=DB.load('nau_credit_notes'); const i=all.findIndex(x=>x.id===id); if(i>-1){all[i]={...all[i],...d};DB.save('nau_credit_notes',all);} },
    refresh: renderCreditNotes
  },

  vendorCreditNote: {
    label: 'Vendor Credit Note',
    getData: id => DB.load('nau_vendor_credit_notes').find(v=>v.id===id),
    form: d => {
      const bills = DB.load('nau_bills').filter(b=>['Paid','Pending'].includes(b.status));
      return `
      <div class="form-row">
        <div class="form-group">
          <label>Linked Bill</label>
          <select class="form-control" id="vcn-bill" onchange="onVCNBillChange()">
            <option value="">-- None --</option>
            ${bills.map(b=>`<option value="${b.id}" data-vendor="${b.vendor}" data-amount="${b.amount}" ${d&&d.billId===b.id?'selected':''}>${b.billNo} — ${b.vendor}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Vendor Name <span class="required">*</span></label>
          <input class="form-control" id="vcn-vendor" value="${d?d.vendorName||'':''}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Date</label>
          <input class="form-control" type="date" id="vcn-date" value="${d?d.date:new Date().toISOString().split('T')[0]}" />
        </div>
        <div class="form-group">
          <label>Amount (USD) <span class="required">*</span></label>
          <input class="form-control" type="number" id="vcn-amount" value="${d?d.amount||'':''}" step="0.01" min="0" />
        </div>
      </div>
      <div class="form-group">
        <label>Reason <span class="required">*</span></label>
        <input class="form-control" id="vcn-reason" value="${d?d.reason||'':''}" placeholder="Reason for vendor credit note" />
      </div>`;
    },
    collect: () => {
      const vendor = document.getElementById('vcn-vendor').value.trim();
      const amount = parseFloat(document.getElementById('vcn-amount').value)||0;
      const reason = document.getElementById('vcn-reason').value.trim();
      if (!vendor) { toast('Vendor is required'); return null; }
      if (!amount) { toast('Amount is required'); return null; }
      if (!reason) { toast('Reason is required'); return null; }
      const billSel = document.getElementById('vcn-bill');
      const billId = Number(billSel.value)||null;
      const bill = billId ? DB.load('nau_bills').find(b=>b.id===billId) : null;
      return { vendorName:vendor, billId, billRef:bill?bill.billNo:null, date:document.getElementById('vcn-date').value, amount, reason, status:'Draft' };
    },
    create: d => { const all=DB.load('nau_vendor_credit_notes'); all.push({id:DB.nextId('nau_vendor_credit_notes'),vcnNo:genVCNNo(),...d,createdAt:nowISO()}); DB.save('nau_vendor_credit_notes',all); },
    update: (id,d) => { const all=DB.load('nau_vendor_credit_notes'); const i=all.findIndex(x=>x.id===id); if(i>-1){all[i]={...all[i],...d};DB.save('nau_vendor_credit_notes',all);} },
    refresh: renderVendorCreditNotes
  },

  bankStatement: {
    label: 'Bank Statement',
    getData: id => DB.load('nau_bank_statements').find(s=>s.id===id),
    form: d => {
      const accts = DB.load('nau_payment_accounts');
      return `
      <div class="form-row">
        <div class="form-group">
          <label>Account <span class="required">*</span></label>
          <select class="form-control" id="bs-acct">
            <option value="">-- Select Account --</option>
            ${accts.map(a=>`<option value="${a.name}" ${d&&d.accountId===a.name?'selected':''}>${a.name} (${a.currency})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Statement Date</label>
          <input class="form-control" type="date" id="bs-date" value="${d?d.statementDate:new Date().toISOString().split('T')[0]}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Opening Balance</label>
          <input class="form-control" type="number" id="bs-opening" value="${d?d.openingBalance||0:0}" step="0.01" />
        </div>
        <div class="form-group">
          <label>Closing Balance</label>
          <input class="form-control" type="number" id="bs-closing" value="${d?d.closingBalance||0:0}" step="0.01" />
        </div>
      </div>`;
    },
    collect: () => {
      const accountId = document.getElementById('bs-acct').value;
      if (!accountId) { toast('Account is required'); return null; }
      return { accountId, statementDate:document.getElementById('bs-date').value, openingBalance:parseFloat(document.getElementById('bs-opening').value)||0, closingBalance:parseFloat(document.getElementById('bs-closing').value)||0, currency:'USD', lines:[] };
    },
    create: d => { const all=DB.load('nau_bank_statements'); all.push({id:DB.nextId('nau_bank_statements'),...d,createdAt:nowISO()}); DB.save('nau_bank_statements',all); },
    update: (id,d) => { const all=DB.load('nau_bank_statements'); const i=all.findIndex(x=>x.id===id); if(i>-1){all[i]={...all[i],...d};DB.save('nau_bank_statements',all);} },
    refresh: renderBankStatements
  },

  bankLine: {
    label: 'Statement Line',
    getData: () => null,
    form: () => `
      <div class="form-row">
        <div class="form-group">
          <label>Date <span class="required">*</span></label>
          <input class="form-control" type="date" id="bl-date" value="${new Date().toISOString().split('T')[0]}" />
        </div>
        <div class="form-group">
          <label>Reference</label>
          <input class="form-control" id="bl-ref" placeholder="e.g. TRF-001" style="font-family:monospace" />
        </div>
      </div>
      <div class="form-group">
        <label>Description</label>
        <input class="form-control" id="bl-desc" placeholder="Transaction description" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Money In (Debit)</label>
          <input class="form-control" type="number" id="bl-debit" value="0" step="0.01" min="0" />
        </div>
        <div class="form-group">
          <label>Money Out (Credit)</label>
          <input class="form-control" type="number" id="bl-credit" value="0" step="0.01" min="0" />
        </div>
      </div>`,
    collect: () => ({
      date: document.getElementById('bl-date').value,
      ref: document.getElementById('bl-ref').value.trim(),
      description: document.getElementById('bl-desc').value.trim(),
      debit: parseFloat(document.getElementById('bl-debit').value)||0,
      credit: parseFloat(document.getElementById('bl-credit').value)||0,
      balance: 0,
      reconciled: false
    }),
    create: d => {
      if (!_bsDetailId) return;
      const stmts = DB.load('nau_bank_statements');
      const s = stmts.find(x=>x.id===_bsDetailId);
      if (!s) return;
      s.lines = s.lines||[];
      // Calculate running balance
      const prevBalance = s.lines.length ? s.lines[s.lines.length-1].balance : s.openingBalance;
      d.balance = prevBalance + d.debit - d.credit;
      s.lines.push(d);
      s.closingBalance = d.balance;
      DB.save('nau_bank_statements', stmts);
      openBSDetail(_bsDetailId);
    },
    update: () => {},
    refresh: renderBankStatements
  },

  // ===== PURCHASE ORDER =====
  purchaseOrder: {
    label: 'Purchase Order',
    createLabel: 'Create ',
    getData: id => DB.load('nau_purchase_orders').find(p => p.id === id),
    form: d => {
      const vends = DB.load('nau_vendors');
      const mfrs = DB.load('nau_manufacturers');
      const allModels = DB.load('nau_models');
      const allCodes = DB.load('nau_model_codes');
      const selMfrId = d ? (d.manufacturerId || '') : '';
      const filteredModels = selMfrId ? allModels.filter(m => m.manufacturerId === Number(selMfrId)) : allModels;
      const selModelId = d ? (d.modelId || '') : '';
      const filteredCodes = selModelId ? allCodes.filter(c => c.modelId === Number(selModelId)) : (selMfrId ? allCodes.filter(c => filteredModels.some(m => m.id === c.modelId)) : allCodes);
      return `
      <div class="form-row">
        <div class="form-group">
          <label>Vendor</label>
          <select class="form-control" id="po-vend-sel" onchange="onPOVendorChange()">
            <option value="">-- Select from directory --</option>
            ${vends.map(v => `<option value="${v.name}" ${d && d.vendorName === v.name ? 'selected' : ''}>${v.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Vendor Name <span class="required">*</span></label>
          <input class="form-control" id="po-vendor" value="${d ? d.vendorName || '' : ''}" placeholder="Or type manually" />
        </div>
      </div>
      <div style="margin:.75rem 0 .4rem;font-weight:700;font-size:.85rem;color:#0a1628;border-bottom:1px solid #e8ecf0;padding-bottom:.3rem">Vehicle Details</div>
      <div class="form-row">
        <div class="form-group">
          <label>Make <span class="required">*</span></label>
          <select class="form-control" id="po-make-sel" onchange="onPOMakeChange()">
            <option value="">-- Select Manufacturer --</option>
            ${mfrs.map(m => `<option value="${m.id}" data-name="${m.name}" ${d && d.manufacturerId === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
          </select>
          <input type="hidden" id="po-make" value="${d ? d.vehicleMake || '' : ''}" />
        </div>
        <div class="form-group">
          <label>Model <span class="required">*</span></label>
          <select class="form-control" id="po-model-sel" onchange="onPOModelChange()">
            <option value="">-- Select Model --</option>
            ${filteredModels.map(m => `<option value="${m.id}" data-name="${m.name}" ${d && d.modelId === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
          </select>
          <input type="hidden" id="po-model" value="${d ? d.vehicleModel || '' : ''}" />
        </div>
        <div class="form-group">
          <label>Year</label>
          <input class="form-control" type="number" id="po-year" value="${d ? d.vehicleYear || '' : ''}" placeholder="2025" min="1990" max="2030" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Model Code</label>
          <select class="form-control" id="po-code-sel" onchange="onPOModelCodeChange()">
            <option value="">-- Select model code --</option>
            ${filteredCodes.map(c => `<option value="${c.id}"
              data-eng-code="${c.engineCode||''}"
              data-eng-cc="${c.engineCC||''}"
              data-fuel="${c.fuelType||''}"
              data-drive="${c.drivetrain||''}"
              data-steer="${c.steeringPosition||''}"
              ${d && d.modelCodeId === c.id ? 'selected' : ''}>${c.code}${c.engineCode ? ' — ' + c.engineCode : ''}${c.engineCC ? ' ' + c.engineCC + 'cc' : ''}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Chassis Number</label>
          <div style="display:flex;align-items:stretch;">
            <input id="po-chassis-prefix" readonly
              value="${d && d.vehicleChassis && d.vehicleChassis.includes('-') ? d.vehicleChassis.split('-')[0]+'-' : (d && d.modelCodeId ? (()=>{const mc=DB.load('nau_model_codes').find(c=>c.id===d.modelCodeId);return mc?mc.code.toUpperCase()+'-':''})() : '')}"
              style="font-family:monospace;width:110px;flex-shrink:0;background:#f1f5f9;color:#374151;border:1px solid #d1d5db;border-right:none;border-radius:4px 0 0 4px;padding:.45rem .6rem;font-size:.88rem;"
              placeholder="Code-" />
            <input class="form-control" id="po-chassis-serial"
              value="${d && d.vehicleChassis && d.vehicleChassis.includes('-') ? d.vehicleChassis.split('-').slice(1).join('-') : (d && d.vehicleChassis && !d.vehicleChassis.includes('-') ? d.vehicleChassis : '')}"
              style="font-family:monospace;border-radius:0 4px 4px 0;"
              placeholder="e.g. 037397" />
          </div>
        </div>
        <div class="form-group">
          <label>Colour</label>
          <input class="form-control" id="po-color" value="${d ? d.color || '' : ''}" placeholder="e.g. White" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Engine Code</label>
          <input class="form-control" id="po-eng-code" value="${d ? d.engineCode || '' : ''}" placeholder="e.g. 1GD-FTV" style="font-family:monospace" />
        </div>
        <div class="form-group">
          <label>Engine (cc)</label>
          <input class="form-control" type="number" id="po-engine" value="${d ? d.engineCC || '' : ''}" placeholder="e.g. 2755" />
        </div>
        <div class="form-group">
          <label>Drivetrain</label>
          <select class="form-control" id="po-drive">
            ${['4WD','2WD','AWD','RWD'].map(dr => `<option ${d && d.drivetrain===dr?'selected':''}>${dr}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Fuel Type</label>
          <select class="form-control" id="po-fuel">
            ${['Diesel','Petrol','Hybrid','Electric','Other'].map(f => `<option ${d && d.fuelType===f?'selected':''}>${f}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Transmission</label>
          <select class="form-control" id="po-trans">
            ${['Automatic','Manual','CVT'].map(t => `<option ${d && d.transmission===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Steering</label>
          <select class="form-control" id="po-steer">
            ${['RHD','LHD'].map(s => `<option ${d && d.steeringPosition===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Body Type</label>
          <input class="form-control" id="po-body" value="${d ? d.bodyType || '' : ''}" placeholder="e.g. D/Cabin" />
        </div>
      </div>
      <div style="margin:.75rem 0 .4rem;font-weight:700;font-size:.85rem;color:#0a1628;border-bottom:1px solid #e8ecf0;padding-bottom:.3rem">Pricing &amp; Dates</div>
      <div class="form-row">
        <div class="form-group">
          <label>Purchase Price <span class="required">*</span></label>
          <input class="form-control" type="number" id="po-price" value="${d ? d.purchasePrice || '' : ''}" step="0.01" min="0" placeholder="Cost from vendor" />
        </div>
        <div class="form-group">
          <label>Selling Price (optional)</label>
          <input class="form-control" type="number" id="po-sell-price" value="${d ? d.sellingPrice || '' : ''}" step="0.01" min="0" placeholder="Planned sale price" />
        </div>
        <div class="form-group">
          <label>Currency</label>
          <select class="form-control" id="po-currency">
            ${['USD','UGX','JPY','KES','EUR'].map(c => `<option ${d && d.currency===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Purchase Date</label>
          <input class="form-control" type="date" id="po-date" value="${d ? d.purchaseDate || '' : new Date().toISOString().split('T')[0]}" />
        </div>
        <div class="form-group">
          <label>Expected Delivery</label>
          <input class="form-control" type="date" id="po-delivery" value="${d ? d.expectedDelivery || '' : ''}" />
        </div>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea class="form-control" id="po-notes" rows="2">${d ? d.notes || '' : ''}</textarea>
      </div>`;
    },
    collect: () => {
      const vendorName = document.getElementById('po-vendor').value.trim();
      const makeSel = document.getElementById('po-make-sel');
      const modelSel = document.getElementById('po-model-sel');
      const vehicleMake = makeSel && makeSel.selectedIndex > 0 ? makeSel.options[makeSel.selectedIndex].dataset.name : document.getElementById('po-make').value.trim();
      const vehicleModel = modelSel && modelSel.selectedIndex > 0 ? modelSel.options[modelSel.selectedIndex].dataset.name : document.getElementById('po-model').value.trim();
      const purchasePrice = parseFloat(document.getElementById('po-price').value) || 0;
      if (!vendorName) { toast('Vendor name is required'); return null; }
      if (!vehicleMake) { toast('Manufacturer is required'); return null; }
      if (!vehicleModel) { toast('Model is required'); return null; }
      if (!purchasePrice) { toast('Purchase price is required'); return null; }
      const codeSel = document.getElementById('po-code-sel');
      const modelCodeId = codeSel && codeSel.value ? Number(codeSel.value) : null;
      return {
        vendorName,
        manufacturerId: makeSel && makeSel.value ? Number(makeSel.value) : null,
        vehicleMake,
        modelId: modelSel && modelSel.value ? Number(modelSel.value) : null,
        vehicleModel,
        modelCodeId,
        vehicleYear: document.getElementById('po-year').value,
        vehicleChassis: (document.getElementById('po-chassis-prefix').value||'') + (document.getElementById('po-chassis-serial').value.trim()||''),
        color: document.getElementById('po-color').value.trim(),
        engineCode: document.getElementById('po-eng-code').value.trim(),
        engineCC: document.getElementById('po-engine').value,
        bodyType: document.getElementById('po-body').value.trim(),
        fuelType: document.getElementById('po-fuel').value,
        drivetrain: document.getElementById('po-drive').value,
        transmission: document.getElementById('po-trans').value,
        steeringPosition: document.getElementById('po-steer').value,
        purchasePrice, sellingPrice: parseFloat(document.getElementById('po-sell-price').value) || null,
        currency: document.getElementById('po-currency').value,
        purchaseDate: document.getElementById('po-date').value,
        expectedDelivery: document.getElementById('po-delivery').value,
        notes: document.getElementById('po-notes').value.trim(),
        status: 'Draft'
      };
    },
    create: d => {
      const all = DB.load('nau_purchase_orders');
      all.push({ id: DB.nextId('nau_purchase_orders'), poNo: genPONo(), ...d, vehicleId: null, billId: null, createdAt: nowISO() });
      DB.save('nau_purchase_orders', all);
    },
    update: (id, d) => {
      const all = DB.load('nau_purchase_orders');
      const i = all.findIndex(x => x.id === id);
      if (i > -1) { all[i] = { ...all[i], ...d }; DB.save('nau_purchase_orders', all); }
    },
    refresh: renderPurchaseOrders,
    onOpen: () => {
      // Apply field locking and chassis prefix if a model code is already selected
      onPOModelCodeChange();
    }
  },

  employee: {
    label: 'Employee',
    getData: function(id) { return DB.load('nau_employees').find(function(e){ return e.id === id; }); },
    form: function(d) {
      d = d || {};
      return '<div class="form-grid">' +
        '<div class="form-group"><label>Full Name *</label><input class="form-control" id="fName" value="' + esc(d.name||'') + '" required></div>' +
        '<div class="form-group"><label>Email</label><input class="form-control" id="fEmail" type="email" value="' + esc(d.email||'') + '"></div>' +
        '<div class="form-group"><label>Phone</label><input class="form-control" id="fPhone" value="' + esc(d.phone||'') + '"></div>' +
        '<div class="form-group"><label>Department</label><input class="form-control" id="fDept" value="' + esc(d.dept||'') + '" placeholder="e.g. Sales, Finance"></div>' +
        '<div class="form-group"><label>Job Title / Role *</label><input class="form-control" id="fRole" value="' + esc(d.role||'') + '" required></div>' +
        '<div class="form-group"><label>Basic Salary (USD/month) *</label><input class="form-control" id="fSalary" type="number" min="0" step="0.01" value="' + (d.salary||'') + '" required></div>' +
        '<div class="form-group"><label>Other Allowances (USD)</label><input class="form-control" id="fAllowances" type="number" min="0" step="0.01" value="' + (d.allowances||0) + '"></div>' +
        '<div class="form-group"><label>PAYE Rate % (default 30)</label><input class="form-control" id="fPAYE" type="number" min="0" max="100" value="' + (d.payeRate||30) + '"></div>' +
        '<div class="form-group"><label>NSSF Employee % (default 5)</label><input class="form-control" id="fNSSFEmp" type="number" min="0" max="100" value="' + (d.nssfEmp||5) + '"></div>' +
        '<div class="form-group"><label>NSSF Employer % (default 10)</label><input class="form-control" id="fNSSFEmploer" type="number" min="0" max="100" value="' + (d.nssfEmployer||10) + '"></div>' +
        '<div class="form-group"><label>Bank Name</label><input class="form-control" id="fBankName" value="' + esc(d.bankName||'') + '"></div>' +
        '<div class="form-group"><label>Bank Account No.</label><input class="form-control" id="fBankAcc" value="' + esc(d.bankAccount||'') + '"></div>' +
        '<div class="form-group"><label>Status</label><select class="form-control" id="fStatus"><option value="Active"' + (d.status==='Active'?' selected':'') + '>Active</option><option value="Inactive"' + (d.status==='Inactive'?' selected':'') + '>Inactive</option></select></div>' +
        '</div>';
    },
    collect: function() {
      var d = {};
      d.name = document.getElementById('fName').value.trim();
      d.email = document.getElementById('fEmail').value.trim();
      d.phone = document.getElementById('fPhone').value.trim();
      d.dept = document.getElementById('fDept').value.trim();
      d.role = document.getElementById('fRole').value.trim();
      d.salary = parseFloat(document.getElementById('fSalary').value) || 0;
      d.allowances = parseFloat(document.getElementById('fAllowances').value) || 0;
      d.payeRate = parseFloat(document.getElementById('fPAYE').value) || 30;
      d.nssfEmp = parseFloat(document.getElementById('fNSSFEmp').value) || 5;
      d.nssfEmployer = parseFloat(document.getElementById('fNSSFEmploer').value) || 10;
      d.bankName = document.getElementById('fBankName').value.trim();
      d.bankAccount = document.getElementById('fBankAcc').value.trim();
      d.status = document.getElementById('fStatus').value;
      if (!d.name || !d.role || !d.salary) { toast('Name, role and salary are required.'); return null; }
      if (!d.createdAt) d.createdAt = nowISO();
      return d;
    },
    create: function(d) {
      var emps = DB.load('nau_employees');
      d.id = DB.nextId('nau_employees');
      emps.push(d);
      DB.save('nau_employees', emps);
      renderEmployees();
      toast('Employee added.');
    },
    update: function(id, d) {
      var emps = DB.load('nau_employees');
      var idx = emps.findIndex(function(e){ return e.id === id; });
      if (idx !== -1) { d.id = id; emps[idx] = d; DB.save('nau_employees', emps); }
      renderEmployees();
      toast('Employee updated.');
    },
    refresh: function() { renderEmployees(); }
  }
});

// Helper for credit note invoice select
function onCNInvoiceChange() {
  const sel = document.getElementById('cn-invoice');
  const opt = sel.options[sel.selectedIndex];
  if (opt && opt.dataset.customer) {
    document.getElementById('cn-customer').value = opt.dataset.customer;
    document.getElementById('cn-amount').value = opt.dataset.amount||'';
  }
}

function onVCNBillChange() {
  const sel = document.getElementById('vcn-bill');
  const opt = sel.options[sel.selectedIndex];
  if (opt && opt.dataset.vendor) {
    document.getElementById('vcn-vendor').value = opt.dataset.vendor;
    document.getElementById('vcn-amount').value = opt.dataset.amount||'';
  }
}

function updateCoaSubtypes() {
  const type = document.getElementById('coa-type').value;
  const subtypes = { asset:['current_asset','fixed_asset'], liability:['current_liability','long_term_liability'], equity:['equity'], revenue:['revenue'], expense:['cogs','operating_expense','other_expense'] };
  const sel = document.getElementById('coa-subtype');
  if (sel) sel.innerHTML = (subtypes[type]||[]).map(st=>`<option>${st}</option>`).join('');
}

// ===== INVOICE CUSTOMER AUTO-FILL =====
function onInvCustomerChange() {
  const sel = document.getElementById('inv-cust-sel');
  if (!sel) return;
  const opt = sel.options[sel.selectedIndex];
  if (!opt || !opt.dataset.name) return;
  const nameEl = document.getElementById('inv-cust-name');
  const emailEl = document.getElementById('inv-cust-email');
  const phoneEl = document.getElementById('inv-cust-phone');
  const addrEl = document.getElementById('inv-cust-addr');
  if (nameEl) nameEl.value = opt.dataset.name;
  if (emailEl) emailEl.value = opt.dataset.email || '';
  if (phoneEl) phoneEl.value = opt.dataset.phone || '';
  if (addrEl) addrEl.value = opt.dataset.addr || '';
}

// ===== BILL VENDOR AUTO-FILL =====
function onBillVendorChange() {
  const sel = document.getElementById('bill-vendor-sel');
  if (!sel) return;
  const opt = sel.options[sel.selectedIndex];
  if (!opt || !opt.value) return;
  const nameEl = document.getElementById('bill-vendor');
  if (nameEl) nameEl.value = opt.value;
}

// ===== PURCHASE ORDERS =====
function genPONo() {
  const rows = DB.load('nau_purchase_orders');
  return `PO-${new Date().getFullYear()}-${String(rows.length + 1).padStart(4, '0')}`;
}

function renderPurchaseOrders() {
  renderPOStats();
  const q = (document.getElementById('po-search') || {}).value || '';
  const sf = (document.getElementById('po-status-filter') || {}).value || '';
  let rows = DB.load('nau_purchase_orders').filter(p => {
    const mQ = !q || (p.poNo + p.vendorName + (p.vehicleMake||'') + (p.vehicleModel||'')).toLowerCase().includes(q.toLowerCase());
    const mS = !sf || p.status === sf;
    return mQ && mS;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const statusBadge = { Draft:'badge-draft', Confirmed:'badge-sent', Received:'badge-paid', Cancelled:'badge-cancelled' };
  const tbody = document.getElementById('po-tbody');
  if (!tbody) return;
  tbody.innerHTML = rows.length ? rows.map(p => `
    <tr>
      <td><strong style="font-family:monospace">${p.poNo}</strong></td>
      <td><strong>${p.vendorName}</strong></td>
      <td style="font-size:.82rem">${p.vehicleMake || ''} ${p.vehicleModel || ''} ${p.vehicleYear || ''}</td>
      <td style="font-family:monospace;font-size:.78rem">${p.vehicleChassis || '-'}</td>
      <td class="amount-mono"><strong>${fmtMoney(p.purchasePrice, p.currency || 'USD')}</strong></td>
      <td>${p.purchaseDate || '-'}</td>
      <td>${p.expectedDelivery || '-'}</td>
      <td><span class="badge ${statusBadge[p.status] || 'badge-draft'}">${p.status}</span></td>
      <td>
        <div class="row-actions">
          ${p.status === 'Draft' ? `<button class="btn-row" title="Edit" onclick="openModal('purchaseOrder',${p.id})">✏️</button>` : ''}
          ${p.status === 'Draft' ? `<button class="btn-row" title="Confirm" onclick="confirmPO(${p.id})">✅</button>` : ''}
          ${p.status === 'Confirmed' ? `<button class="btn-row" title="Mark Received — adds to inventory" onclick="receivePO(${p.id})" style="background:#10b981;color:#fff;border-color:#10b981">📦 Receive</button>` : ''}
          ${p.vehicleId ? `<button class="btn-row" title="View in inventory" onclick="toast('Vehicle ID: ${p.vehicleId} added to inventory')">🚗</button>` : ''}
          ${['Draft','Confirmed'].includes(p.status) ? `<button class="btn-row btn-row-delete" onclick="cancelPO(${p.id})">✕</button>` : ''}
        </div>
      </td>
    </tr>`).join('')
    : '<tr><td colspan="9" class="table-empty"><span class="empty-icon">🛒</span>No purchase orders yet. Create one to start procuring vehicles.</td></tr>';

  // Populate vendor filter
  const vfEl = document.getElementById('po-vendor-filter');
  if (vfEl && (!vfEl.options.length || vfEl.options.length < 2)) {
    const vends = DB.load('nau_vendors');
    vfEl.innerHTML = '<option value="">All Vendors</option>' + vends.map(v => `<option value="${v.name}">${v.name}</option>`).join('');
  }
}

function confirmPO(id) {
  const rows = DB.load('nau_purchase_orders');
  const po = rows.find(x => x.id === id);
  if (!po) return;
  if (!confirm(`Confirm Purchase Order ${po.poNo} for ${fmtMoney(po.purchasePrice, po.currency)}?`)) return;
  po.status = 'Confirmed';
  po.confirmedAt = nowISO();
  DB.save('nau_purchase_orders', rows);
  toast('Purchase order confirmed.');
  renderPurchaseOrders();
}

function cancelPO(id) {
  const rows = DB.load('nau_purchase_orders');
  const po = rows.find(x => x.id === id);
  if (!po) return;
  if (!confirm('Cancel this purchase order?')) return;
  po.status = 'Cancelled';
  DB.save('nau_purchase_orders', rows);
  toast('Purchase order cancelled.');
  renderPurchaseOrders();
}

function receivePO(id) {
  const rows = DB.load('nau_purchase_orders');
  const po = rows.find(x => x.id === id);
  if (!po) return;
  if (!confirm(`Mark PO ${po.poNo} as received?\n\nThis will:\n• Add ${po.vehicleMake} ${po.vehicleModel} ${po.vehicleYear} to inventory\n• Create a vendor bill for ${fmtMoney(po.purchasePrice, po.currency)}\n\nProceed?`)) return;

  // 1. Create vehicle in nau_vehicles
  const vehs = DB.load('nau_vehicles');
  const manufacturers = DB.load('nau_manufacturers');
  const mfr = manufacturers.find(m => m.name && m.name.toLowerCase() === (po.vehicleMake||'').toLowerCase());
  const now = new Date();
  const sku = `${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}-${String(DB.nextId('nau_vehicles')).padStart(6,'0')}`;
  const veh = {
    id: DB.nextId('nau_vehicles'),
    sku,
    manufacturerId: po.manufacturerId || (mfr ? mfr.id : null),
    modelId: po.modelId || null,
    modelCodeId: po.modelCodeId || null,
    make: po.vehicleMake || '',
    model: po.vehicleModel || '',
    year: po.vehicleYear || '',
    chassis: po.vehicleChassis || '',
    engineCode: po.engineCode || '',
    engineCC: po.engineCC || '',
    bodyType: po.bodyType || '',
    fuelType: po.fuelType || '',
    drivetrain: po.drivetrain || '',
    transmission: po.transmission || '',
    steeringPosition: po.steeringPosition || '',
    color: po.color || '',
    priceUSD: po.sellingPrice || po.purchasePrice || 0,
    costUSD: po.purchasePrice || 0,
    status: 'DRAFT',
    description: `Received via PO ${po.poNo}. Vendor: ${po.vendorName}.${po.notes ? ' Notes: ' + po.notes : ''}`,
    createdAt: nowISO()
  };
  vehs.push(veh);
  DB.save('nau_vehicles', vehs);

  // 2. Create bill in nau_bills
  const bills = DB.load('nau_bills');
  const bill = {
    id: DB.nextId('nau_bills'),
    billNo: genBillNo(),
    vendor: po.vendorName,
    category: 'Vehicle Purchase',
    vehicleId: veh.id,
    vehicleName: `${po.vehicleMake} ${po.vehicleModel} ${po.vehicleYear}`,
    description: `Vehicle purchase — PO ${po.poNo}. Chassis: ${po.vehicleChassis || '-'}`,
    amount: po.purchasePrice,
    currency: po.currency || 'USD',
    dueDate: po.expectedDelivery || '',
    status: 'Pending',
    paymentMethod: '',
    notes: `Auto-created from Purchase Order ${po.poNo}`,
    createdAt: nowISO()
  };
  bills.push(bill);
  DB.save('nau_bills', bills);

  // 3. Update PO
  po.status = 'Received';
  po.receivedAt = nowISO();
  po.vehicleId = veh.id;
  po.billId = bill.id;
  DB.save('nau_purchase_orders', rows);

  toast(`✅ Received! Vehicle added to inventory (${sku}), bill created (${bill.billNo}).`);
  renderPurchaseOrders();
}

function onPOVendorChange() {
  const sel = document.getElementById('po-vend-sel');
  if (!sel) return;
  const opt = sel.options[sel.selectedIndex];
  const nameEl = document.getElementById('po-vendor');
  if (nameEl && opt && opt.value) nameEl.value = opt.value;
}

function onPOMakeChange() {
  const makeSel = document.getElementById('po-make-sel');
  if (!makeSel) return;
  const mfrId = Number(makeSel.value);
  // Cascade: filter models
  const allModels = DB.load('nau_models');
  const filtered = mfrId ? allModels.filter(m => m.manufacturerId === mfrId) : allModels;
  const modelSel = document.getElementById('po-model-sel');
  if (modelSel) {
    modelSel.innerHTML = '<option value="">-- Select Model --</option>' +
      filtered.map(m => `<option value="${m.id}" data-name="${m.name}">${m.name}</option>`).join('');
  }
  // Clear model code
  const codeSel = document.getElementById('po-code-sel');
  if (codeSel) codeSel.innerHTML = '<option value="">-- Select model code --</option>';
}

function onPOModelChange() {
  const modelSel = document.getElementById('po-model-sel');
  if (!modelSel) return;
  const modelId = Number(modelSel.value);
  const allCodes = DB.load('nau_model_codes');
  const filtered = modelId ? allCodes.filter(c => c.modelId === modelId) : [];
  const codeSel = document.getElementById('po-code-sel');
  if (codeSel) {
    codeSel.innerHTML = '<option value="">-- Select model code --</option>' +
      filtered.map(c => `<option value="${c.id}"
        data-eng-code="${c.engineCode||''}"
        data-eng-cc="${c.engineCC||''}"
        data-fuel="${c.fuelType||''}"
        data-drive="${c.drivetrain||''}"
        data-steer="${c.steeringPosition||''}"
        >${c.code}${c.engineCode ? ' — ' + c.engineCode : ''}${c.engineCC ? ' ' + c.engineCC + 'cc' : ''}</option>`).join('');
  }
  // Unlock spec fields and clear chassis prefix when model changes
  setPOSpecFieldsLocked(false);
  const prefixEl = document.getElementById('po-chassis-prefix');
  if (prefixEl) prefixEl.value = '';
}

function setPOSpecFieldsLocked(locked) {
  ['po-eng-code','po-engine'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.readOnly = locked;
    el.style.background = locked ? '#f1f5f9' : '';
    el.style.color = locked ? '#64748b' : '';
    el.style.cursor = locked ? 'not-allowed' : '';
  });
  ['po-fuel','po-drive','po-steer'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = locked;
    el.style.background = locked ? '#f1f5f9' : '';
    el.style.color = locked ? '#64748b' : '';
    el.style.cursor = locked ? 'not-allowed' : '';
  });
}

function onPOModelCodeChange() {
  const codeSel = document.getElementById('po-code-sel');
  if (!codeSel) return;
  if (!codeSel.value) {
    setPOSpecFieldsLocked(false);
    const prefixEl = document.getElementById('po-chassis-prefix');
    if (prefixEl) prefixEl.value = '';
    return;
  }
  const mc = DB.load('nau_model_codes').find(c => c.id === Number(codeSel.value));
  if (!mc) { setPOSpecFieldsLocked(false); return; }
  const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined && val !== null && val !== '') el.value = val; };
  set('po-eng-code', mc.engineCode);
  set('po-engine', mc.engineCC);
  const fuelSel = document.getElementById('po-fuel');
  if (fuelSel && mc.fuelType) {
    Array.from(fuelSel.options).forEach(o => { o.selected = o.value === mc.fuelType || o.text === mc.fuelType; });
  }
  const driveSel = document.getElementById('po-drive');
  if (driveSel && mc.drivetrain) {
    Array.from(driveSel.options).forEach(o => { o.selected = o.value === mc.drivetrain || o.text === mc.drivetrain; });
  }
  const steerSel = document.getElementById('po-steer');
  if (steerSel && mc.steeringPosition) {
    Array.from(steerSel.options).forEach(o => { o.selected = o.value === mc.steeringPosition || o.text === mc.steeringPosition; });
  }
  setPOSpecFieldsLocked(true);
  // Set the read-only prefix field to the model code and focus the serial field
  const prefixEl = document.getElementById('po-chassis-prefix');
  if (prefixEl && mc.code) prefixEl.value = mc.code.toUpperCase() + '-';
  const serialEl = document.getElementById('po-chassis-serial');
  if (serialEl) { serialEl.focus(); serialEl.setSelectionRange(serialEl.value.length, serialEl.value.length); }
}

// ===== PURCHASE ORDER STATS BAR =====
function renderPOStats() {
  const pos = DB.load('nau_purchase_orders');
  const el = document.getElementById('po-stats');
  if (!el) return;
  const draft = pos.filter(p => p.status === 'Draft').length;
  const confirmed = pos.filter(p => p.status === 'Confirmed').length;
  const received = pos.filter(p => p.status === 'Received').length;
  const totalValue = pos.filter(p => p.status !== 'Cancelled').reduce((s, p) => s + Number(p.purchasePrice || 0), 0);
  el.innerHTML = `
    <div class="po-stat"><div class="po-stat-val">${draft}</div><div class="po-stat-label">Draft POs</div></div>
    <div class="po-stat" style="border-color:#f0a500"><div class="po-stat-val" style="color:#d97706">${confirmed}</div><div class="po-stat-label">Awaiting Receipt</div></div>
    <div class="po-stat" style="border-color:#10b981"><div class="po-stat-val" style="color:#10b981">${received}</div><div class="po-stat-label">Received → In Inventory</div></div>
    <div class="po-stat"><div class="po-stat-val">${fmtMoney(totalValue)}</div><div class="po-stat-label">Total Procurement Value</div></div>`;
}

// ===== REPORTS: VEHICLE P&L =====
function renderVehiclePL() {
  const el = document.getElementById('vehicle-pl-content');
  if (!el) return;

  const pos = DB.load('nau_purchase_orders');
  const invoices = DB.load('nau_invoices');
  const bills = DB.load('nau_bills');

  // Build rows for all non-cancelled POs
  const rows = pos.filter(p => p.status !== 'Cancelled').map(po => {
    const vehicleName = ((po.vehicleMake || '') + ' ' + (po.vehicleModel || '')).trim();

    // Find matching invoice by vehicleId or vehicle name in lineItems
    let matchedInvoice = null;
    if (po.vehicleId) {
      matchedInvoice = invoices.find(inv => inv.vehicleId === po.vehicleId);
    }
    if (!matchedInvoice && vehicleName) {
      matchedInvoice = invoices.find(inv => {
        if (inv.vehicleId && po.vehicleId && inv.vehicleId === po.vehicleId) return true;
        const items = inv.lineItems || [];
        return items.some(li => {
          const desc = (li.description || li.desc || '').toLowerCase();
          return desc.includes((po.vehicleMake || '').toLowerCase()) &&
                 desc.includes((po.vehicleModel || '').toLowerCase());
        });
      });
    }

    // Find bills tagged to this vehicleId
    const relatedBills = bills.filter(b => {
      if (po.vehicleId && b.vehicleId && b.vehicleId === po.vehicleId) return true;
      return false;
    });

    const purchaseCost = Number(po.purchasePrice || 0);
    const additionalCosts = relatedBills.reduce((s, b) => s + Number(b.amount || b.total || 0), 0);
    const totalCost = purchaseCost + additionalCosts;
    const revenue = matchedInvoice ? Number(matchedInvoice.totalAmount || matchedInvoice.total || 0) : 0;
    const grossProfit = revenue - totalCost;
    const marginPct = revenue > 0 ? (grossProfit / revenue * 100) : null;
    const isReceived = po.status === 'Received';

    return { po, vehicleName, purchaseCost, additionalCosts, totalCost, revenue, grossProfit, marginPct, isReceived, matchedInvoice };
  });

  // Totals for received POs
  const receivedRows = rows.filter(r => r.isReceived);
  const totPurchase = receivedRows.reduce((s, r) => s + r.purchaseCost, 0);
  const totAddl = receivedRows.reduce((s, r) => s + r.additionalCosts, 0);
  const totCost = receivedRows.reduce((s, r) => s + r.totalCost, 0);
  const totRevenue = receivedRows.reduce((s, r) => s + r.revenue, 0);
  const totProfit = receivedRows.reduce((s, r) => s + r.grossProfit, 0);
  const totMargin = totRevenue > 0 ? (totProfit / totRevenue * 100) : null;

  if (!rows.length) {
    el.innerHTML = '<div class="report-card"><p style="color:#9ca3af;text-align:center;padding:2rem">No purchase orders found.</p></div>';
    return;
  }

  el.innerHTML = `<div class="report-card">
    <h3 style="margin-bottom:1.25rem;font-size:1rem;font-weight:700">Vehicle Profit & Loss</h3>
    <div class="table-scroll">
      <table class="acc-table" style="width:100%">
        <thead>
          <tr>
            <th>PO #</th>
            <th>Vehicle</th>
            <th>Purchase Cost</th>
            <th>Add. Costs</th>
            <th>Total Cost</th>
            <th>Revenue</th>
            <th>Gross Profit</th>
            <th>Margin</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => {
            const statusLabel = r.isReceived
              ? (r.matchedInvoice ? 'Sold' : 'In Stock')
              : r.po.status;
            const profitClass = r.isReceived
              ? (r.grossProfit >= 0 ? 'pl-profit' : 'pl-loss')
              : '';
            const rowStyle = !r.isReceived ? 'color:#9ca3af' : '';
            return `<tr style="${rowStyle}">
              <td>${r.po.poNo || r.po.id}</td>
              <td>${r.vehicleName || '-'}</td>
              <td>${fmtMoney(r.purchaseCost, r.po.currency || 'USD')}</td>
              <td>${r.additionalCosts ? fmtMoney(r.additionalCosts, r.po.currency || 'USD') : '-'}</td>
              <td>${fmtMoney(r.totalCost, r.po.currency || 'USD')}</td>
              <td>${r.revenue ? fmtMoney(r.revenue) : '-'}</td>
              <td class="${profitClass}">${r.isReceived ? fmtMoney(r.grossProfit) : '-'}</td>
              <td class="${profitClass}">${r.marginPct !== null ? r.marginPct.toFixed(1) + '%' : '-'}</td>
              <td>${statusLabel}</td>
            </tr>`;
          }).join('')}
        </tbody>
        ${receivedRows.length ? `<tfoot>
          <tr class="pl-summary-row">
            <td colspan="2">Totals (Received POs)</td>
            <td>${fmtMoney(totPurchase)}</td>
            <td>${fmtMoney(totAddl)}</td>
            <td>${fmtMoney(totCost)}</td>
            <td>${fmtMoney(totRevenue)}</td>
            <td class="${totProfit >= 0 ? 'pl-profit' : 'pl-loss'}">${fmtMoney(totProfit)}</td>
            <td class="${totProfit >= 0 ? 'pl-profit' : 'pl-loss'}">${totMargin !== null ? totMargin.toFixed(1) + '%' : '-'}</td>
            <td></td>
          </tr>
        </tfoot>` : ''}
      </table>
    </div>
  </div>`;
}

// ===== P&L DRILL-DOWN TOGGLE =====
function togglePNLDetail(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
}

// ===== CASH FLOW STATEMENT =====
function renderCashFlow() {
  const invoices = DB.load('nau_invoices');
  const bills = DB.load('nau_bills');
  const payments = DB.load('nau_payments');
  const pos = DB.load('nau_purchase_orders');

  // Operating Activities
  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.totalAmount||0), 0);
  const totalExpenses = bills.filter(b => b.status === 'Paid' && b.category !== 'Vehicle Purchase').reduce((s, b) => s + Number(b.amount||0), 0);
  const netProfit = totalRevenue - totalExpenses;

  // Changes in working capital
  const outstandingAR = invoices.filter(i => !['Paid','Cancelled'].includes(i.status)).reduce((s, i) => s + (Number(i.totalAmount||0) - Number(i.paidAmount||0)), 0);
  const outstandingAP = bills.filter(b => !['Paid','Cancelled'].includes(b.status)).reduce((s, b) => s + Number(b.amount||0), 0);

  // Investing Activities
  const vehiclePurchases = bills.filter(b => b.category === 'Vehicle Purchase' && b.status === 'Paid').reduce((s, b) => s + Number(b.amount||0), 0);
  const poReceived = pos.filter(p => p.status === 'Received').reduce((s, p) => s + Number(p.purchasePrice||0), 0);
  const totalInvesting = -(vehiclePurchases || poReceived);

  const netCashOps = netProfit - outstandingAR + outstandingAP;

  // Cash positions from GL
  const glBal = getGLBalances();
  const cashAccts = DB.load('nau_accounts');
  const closingCash = cashAccts.reduce((s, a) => {
    const code = a.glAccountCode || '1001';
    const b = glBal[code] || { debit: 0, credit: 0 };
    return s + (b.debit - b.credit);
  }, 0);
  const openingCash = closingCash - netCashOps - totalInvesting;

  const el = document.getElementById('cashflow-content');
  if (!el) return;
  el.innerHTML = `
    <div class="report-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
        <h3 style="margin:0;color:#0a1628;">Cash Flow Statement</h3>
        <button onclick="window.print()" class="btn-create" style="background:#6c757d;font-size:.8rem;padding:.4rem .9rem;">🖨️ Print</button>
      </div>

      <div class="cf-section">
        <div class="cf-section-title">Operating Activities</div>
        <div class="cf-row"><span>Net Profit</span><span class="${netProfit>=0?'cf-pos':'cf-neg'}">${fmtMoney(netProfit)}</span></div>
        <div class="cf-row cf-adj"><span>Increase in Accounts Receivable</span><span class="cf-neg">(${fmtMoney(outstandingAR)})</span></div>
        <div class="cf-row cf-adj"><span>Increase in Accounts Payable</span><span class="cf-pos">${fmtMoney(outstandingAP)}</span></div>
        <div class="cf-row cf-subtotal"><span>Net Cash from Operating Activities</span><span class="${netCashOps>=0?'cf-pos':'cf-neg'}">${fmtMoney(netCashOps)}</span></div>
      </div>

      <div class="cf-section">
        <div class="cf-section-title">Investing Activities</div>
        <div class="cf-row"><span>Vehicle Purchases (POs + Bills)</span><span class="cf-neg">(${fmtMoney(Math.abs(totalInvesting))})</span></div>
        <div class="cf-row cf-subtotal"><span>Net Cash from Investing Activities</span><span class="${totalInvesting>=0?'cf-pos':'cf-neg'}">${fmtMoney(totalInvesting)}</span></div>
      </div>

      <div class="cf-section">
        <div class="cf-section-title">Financing Activities</div>
        <div class="cf-row cf-adj"><span>Owner contributions / withdrawals</span><span>$0.00</span></div>
        <div class="cf-row cf-subtotal"><span>Net Cash from Financing Activities</span><span>$0.00</span></div>
      </div>

      <div class="cf-summary">
        <div class="cf-row"><span>Net Change in Cash</span><span class="${(netCashOps+totalInvesting)>=0?'cf-pos':'cf-neg'}">${fmtMoney(netCashOps + totalInvesting)}</span></div>
        <div class="cf-row"><span>Opening Cash Balance (derived)</span><span>${fmtMoney(Math.max(0, openingCash))}</span></div>
        <div class="cf-row cf-grand"><span><strong>Closing Cash Balance</strong></span><span><strong>${fmtMoney(closingCash)}</strong></span></div>
      </div>
    </div>
  `;
}

// ===== CUSTOMER STATEMENT OF ACCOUNT =====
function openCustomerStatement(identifier) {
  const allInvoices = DB.load('nau_invoices').filter(i =>
    (i.customerEmail || '').toLowerCase() === identifier.toLowerCase() ||
    (i.customerName || '').toLowerCase() === identifier.toLowerCase()
  ).sort((a, b) => (a.createdAt||'').localeCompare(b.createdAt||''));

  let balance = 0;
  const rows = [];
  allInvoices.forEach(inv => {
    balance += Number(inv.totalAmount || 0);
    rows.push({ date: (inv.createdAt||'').split('T')[0]||'', ref: inv.invoiceNo, desc: 'Invoice — ' + (inv.vehicleName||''), charge: Number(inv.totalAmount||0), payment: 0, balance });
    // Payments for this invoice
    const invPayments = DB.load('nau_payments').filter(p => p.invoiceId === inv.id);
    invPayments.forEach(p => {
      balance -= Number(p.amount || 0);
      rows.push({ date: p.date||(p.createdAt||'').split('T')[0]||'', ref: p.paymentNo, desc: 'Payment received', charge: 0, payment: Number(p.amount||0), balance });
    });
  });

  const customerName = allInvoices[0]?.customerName || identifier;
  const modal = document.getElementById('statementModal');
  document.getElementById('statementContent').innerHTML = `
    <div class="stmt-header">
      <div>
        <div style="font-size:1.4rem;font-weight:900;color:#0a1628;">🚗 NipponAuto Uganda</div>
        <div style="color:#666;font-size:.85rem;">Plot 45, Nakawa Industrial Road, Kampala</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:1.1rem;font-weight:700;">STATEMENT OF ACCOUNT</div>
        <div style="color:#666;font-size:.85rem;">As at ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</div>
      </div>
    </div>
    <div style="margin:1rem 0;padding:.75rem;background:#f4f6fa;border-radius:6px;">
      <div style="font-weight:700;">Customer: ${customerName}</div>
      <div style="color:#666;font-size:.85rem;">${identifier.includes('@') ? identifier : ''}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:.85rem;margin-top:1rem;">
      <thead><tr style="background:#0a1628;color:#fff;">
        <th style="padding:.5rem .75rem;text-align:left;">Date</th>
        <th style="padding:.5rem .75rem;text-align:left;">Reference</th>
        <th style="padding:.5rem .75rem;text-align:left;">Description</th>
        <th style="padding:.5rem .75rem;text-align:right;">Charges</th>
        <th style="padding:.5rem .75rem;text-align:right;">Payments</th>
        <th style="padding:.5rem .75rem;text-align:right;">Balance</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => `<tr style="border-bottom:1px solid #eee;">
          <td style="padding:.45rem .75rem;">${r.date}</td>
          <td style="padding:.45rem .75rem;">${r.ref||''}</td>
          <td style="padding:.45rem .75rem;">${r.desc}</td>
          <td style="padding:.45rem .75rem;text-align:right;">${r.charge ? fmtMoney(r.charge) : ''}</td>
          <td style="padding:.45rem .75rem;text-align:right;color:#27ae60;">${r.payment ? fmtMoney(r.payment) : ''}</td>
          <td style="padding:.45rem .75rem;text-align:right;font-weight:600;">${fmtMoney(r.balance)}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot><tr style="background:#f4f6fa;border-top:2px solid #0a1628;">
        <td colspan="5" style="padding:.65rem .75rem;font-weight:800;text-align:right;">BALANCE DUE</td>
        <td style="padding:.65rem .75rem;font-weight:800;text-align:right;color:${balance>0?'#c0392b':'#27ae60'};">${fmtMoney(balance)}</td>
      </tr></tfoot>
    </table>
    ${rows.length === 0 ? '<div style="text-align:center;padding:2rem;color:#999;">No transactions found.</div>' : ''}
    <div style="margin-top:2rem;padding-top:1rem;border-top:1px solid #ddd;text-align:center;color:#888;font-size:.78rem;">
      NipponAuto Uganda | info@nipponauto.ug | +256 700 123 456
    </div>
  `;
  if (modal) modal.style.display = 'flex';
}

// ===== VENDOR STATEMENT OF ACCOUNT =====
function openVendorStatement(vendorName) {
  const bills = DB.load('nau_bills').filter(b => (b.vendor||'').toLowerCase() === vendorName.toLowerCase())
    .sort((a, b) => (a.createdAt||'').localeCompare(b.createdAt||''));

  let balance = 0;
  const rows = [];
  bills.forEach(bill => {
    balance += Number(bill.amount || 0);
    rows.push({ date: (bill.createdAt||'').split('T')[0]||'', ref: bill.billNo, desc: (bill.category||'Bill') + (bill.description?' — '+bill.description:''), charge: Number(bill.amount||0), payment: 0, balance });
    DB.load('nau_payments').filter(p => p.billId === bill.id).forEach(p => {
      balance -= Number(p.amount || 0);
      rows.push({ date: p.date||(p.createdAt||'').split('T')[0]||'', ref: p.paymentNo, desc: 'Payment made', charge: 0, payment: Number(p.amount||0), balance });
    });
  });

  document.getElementById('statementContent').innerHTML = `
    <div class="stmt-header">
      <div>
        <div style="font-size:1.4rem;font-weight:900;color:#0a1628;">🚗 NipponAuto Uganda</div>
        <div style="color:#666;font-size:.85rem;">Plot 45, Nakawa Industrial Road, Kampala</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:1.1rem;font-weight:700;">VENDOR STATEMENT</div>
        <div style="color:#666;font-size:.85rem;">As at ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</div>
      </div>
    </div>
    <div style="margin:1rem 0;padding:.75rem;background:#f4f6fa;border-radius:6px;"><div style="font-weight:700;">Vendor: ${vendorName}</div></div>
    <table style="width:100%;border-collapse:collapse;font-size:.85rem;margin-top:1rem;">
      <thead><tr style="background:#0a1628;color:#fff;">
        <th style="padding:.5rem .75rem;text-align:left;">Date</th>
        <th style="padding:.5rem .75rem;text-align:left;">Ref</th>
        <th style="padding:.5rem .75rem;text-align:left;">Description</th>
        <th style="padding:.5rem .75rem;text-align:right;">Bills</th>
        <th style="padding:.5rem .75rem;text-align:right;">Payments</th>
        <th style="padding:.5rem .75rem;text-align:right;">Balance</th>
      </tr></thead>
      <tbody>${rows.map(r => `<tr style="border-bottom:1px solid #eee;">
        <td style="padding:.45rem .75rem;">${r.date}</td>
        <td style="padding:.45rem .75rem;">${r.ref||''}</td>
        <td style="padding:.45rem .75rem;">${r.desc}</td>
        <td style="padding:.45rem .75rem;text-align:right;">${r.charge?fmtMoney(r.charge):''}</td>
        <td style="padding:.45rem .75rem;text-align:right;color:#27ae60;">${r.payment?fmtMoney(r.payment):''}</td>
        <td style="padding:.45rem .75rem;text-align:right;font-weight:600;">${fmtMoney(r.balance)}</td>
      </tr>`).join('')}</tbody>
      <tfoot><tr style="background:#f4f6fa;border-top:2px solid #0a1628;">
        <td colspan="5" style="padding:.65rem .75rem;font-weight:800;text-align:right;">AMOUNT OWED</td>
        <td style="padding:.65rem .75rem;font-weight:800;text-align:right;">${fmtMoney(balance)}</td>
      </tr></tfoot>
    </table>
    ${rows.length === 0 ? '<div style="text-align:center;padding:2rem;color:#999;">No transactions found.</div>' : ''}
    <div style="margin-top:2rem;padding-top:1rem;border-top:1px solid #ddd;text-align:center;color:#888;font-size:.78rem;">NipponAuto Uganda | info@nipponauto.ug</div>
  `;
  const modal = document.getElementById('statementModal');
  if (modal) modal.style.display = 'flex';
}

// ===== BANK RECONCILIATION =====
let _matchSel = { pmt: null, stl: null, stlIdx: null, stmtId: null };

function openReconciliation(stmtId) {
  const stmts = DB.load('nau_bank_statements');
  const stmt = stmts.find(s => s.id === stmtId);
  if (!stmt) return;

  // Close detail panel if open
  const detailPanel = document.getElementById('bs-detail-panel');
  if (detailPanel) detailPanel.style.display = 'none';

  // Get the payment account linked to this statement
  const acct = DB.load('nau_payment_accounts').find(a => a.id === stmt.accountId || a.name === stmt.accountId) || {};
  const glCode = acct.glAccountCode || '1001';

  // GL book balance for this account
  const glBal = getGLBalances();
  const acctBal = glBal[glCode] || { debit: 0, credit: 0 };
  const bookBalance = acctBal.debit - acctBal.credit;
  const stmtBalance = Number(stmt.closingBalance || stmt.balance || 0);
  const diff = stmtBalance - bookBalance;

  // Unreconciled payments (those with no reconciled flag)
  const payments = DB.load('nau_payments').filter(p =>
    !p.reconciled && (p.accountId === acct.id || p.method === acct.name || p.method === stmt.accountId)
  );

  // Statement lines that are not yet reconciled
  const lines = (stmt.lines || []).filter(l => !l.reconciled);

  const panel = document.getElementById('reconcile-panel');
  if (!panel) return;

  _matchSel = { pmt: null, stl: null, stlIdx: null, stmtId: null };

  panel.style.display = 'block';
  panel.innerHTML = `
    <div class="reconcile-wrap">
      <div class="reconcile-header">
        <div>
          <h3 style="margin:0;color:#0a1628;">🔗 Bank Reconciliation — ${stmt.accountId || 'Account'}</h3>
          <div style="font-size:.85rem;color:#666;margin-top:.25rem;">Statement date: ${stmt.statementDate||''}</div>
        </div>
        <button onclick="closeReconciliation()" class="btn-create" style="background:#6c757d;">✕ Close</button>
      </div>

      <div class="reconcile-summary">
        <div class="reconcile-bal-card">
          <div class="rbc-label">Statement Balance</div>
          <div class="rbc-value">${fmtMoney(stmtBalance)}</div>
        </div>
        <div class="reconcile-bal-card">
          <div class="rbc-label">GL Book Balance</div>
          <div class="rbc-value">${fmtMoney(bookBalance)}</div>
        </div>
        <div class="reconcile-bal-card ${Math.abs(diff) < 0.01 ? 'rbc-ok' : 'rbc-warn'}">
          <div class="rbc-label">Difference</div>
          <div class="rbc-value">${Math.abs(diff) < 0.01 ? '✓ Balanced' : fmtMoney(diff)}</div>
        </div>
      </div>

      <div class="reconcile-columns">
        <div class="reconcile-col">
          <h4>Unmatched System Payments</h4>
          <table class="acc-table" style="font-size:.82rem;">
            <thead><tr><th>Ref</th><th>Date</th><th>Amount</th><th>Match</th></tr></thead>
            <tbody>
              ${payments.length ? payments.map(p => `
                <tr id="pmt-row-${p.id}">
                  <td>${p.paymentNo||p.receiptNo||p.id}</td>
                  <td>${p.date||(p.createdAt||'').split('T')[0]||''}</td>
                  <td>${fmtMoney(p.amount)}</td>
                  <td><button class="btn-row" onclick="selectForMatch('pmt',${p.id})" title="Select to match">↔</button></td>
                </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:#999;padding:1rem;">All matched ✓</td></tr>'}
            </tbody>
          </table>
        </div>
        <div class="reconcile-col">
          <h4>Unmatched Statement Lines</h4>
          <table class="acc-table" style="font-size:.82rem;">
            <thead><tr><th>Date</th><th>Ref</th><th>Description</th><th>Amount</th><th>Match</th></tr></thead>
            <tbody>
              ${lines.length ? lines.map((l, i) => {
                const origIdx = (stmt.lines||[]).indexOf(l);
                return `<tr id="stl-row-${stmtId}-${origIdx}">
                  <td>${l.date||''}</td>
                  <td>${l.ref||''}</td>
                  <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;">${l.description||''}</td>
                  <td>${fmtMoney(l.debit||l.credit||0)}</td>
                  <td><button class="btn-row" onclick="selectForMatch('stl',${stmtId},${origIdx})" title="Select to match">↔</button></td>
                </tr>`;
              }).join('') : '<tr><td colspan="5" style="text-align:center;color:#999;padding:1rem;">All matched ✓</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div id="reconcile-match-bar" style="display:none;background:#e8f5e9;border:1px solid #27ae60;border-radius:8px;padding:.75rem 1rem;margin-top:1rem;align-items:center;justify-content:space-between;">
        <span id="reconcile-match-text">Select a payment and a statement line to match them.</span>
        <button id="reconcile-match-btn" onclick="confirmMatch(${stmtId})" style="display:none;" class="btn-create">✓ Confirm Match</button>
      </div>

      <div style="margin-top:1.5rem;display:flex;gap:1rem;flex-wrap:wrap;">
        <button onclick="autoMatch(${stmtId})" class="btn-create">⚡ Auto-Match by Amount</button>
        <button onclick="saveReconciliation(${stmtId})" class="btn-create" style="background:#27ae60;">✅ Save & Close</button>
      </div>
    </div>
  `;

  panel.scrollIntoView({ behavior: 'smooth' });
}

function selectForMatch(type, idOrStmtId, idx) {
  if (type === 'pmt') {
    _matchSel.pmt = idOrStmtId;
    document.querySelectorAll('[id^="pmt-row-"]').forEach(r => r.style.background = '');
    const row = document.getElementById('pmt-row-' + idOrStmtId);
    if (row) row.style.background = '#e8f5e9';
  } else {
    _matchSel.stmtId = idOrStmtId;
    _matchSel.stlIdx = idx;
    document.querySelectorAll('[id^="stl-row-"]').forEach(r => r.style.background = '');
    const row = document.getElementById('stl-row-' + idOrStmtId + '-' + idx);
    if (row) row.style.background = '#e8f5e9';
  }
  const bar = document.getElementById('reconcile-match-bar');
  const btn = document.getElementById('reconcile-match-btn');
  if (bar) bar.style.display = 'flex';
  if (_matchSel.pmt !== null && _matchSel.stlIdx !== null) {
    if (btn) btn.style.display = 'inline-block';
    const matchText = document.getElementById('reconcile-match-text');
    if (matchText) matchText.textContent = 'Ready to match — click Confirm Match.';
  }
}

function confirmMatch(stmtId) {
  if (_matchSel.pmt === null || _matchSel.stlIdx === null) return;
  // Mark payment as reconciled
  const payments = DB.load('nau_payments');
  const pmtIdx = payments.findIndex(p => p.id === _matchSel.pmt);
  if (pmtIdx !== -1) { payments[pmtIdx].reconciled = true; DB.save('nau_payments', payments); }
  // Mark statement line as reconciled
  const stmts = DB.load('nau_bank_statements');
  const sIdx = stmts.findIndex(s => s.id === stmtId);
  if (sIdx !== -1 && stmts[sIdx].lines && stmts[sIdx].lines[_matchSel.stlIdx] !== undefined) {
    stmts[sIdx].lines[_matchSel.stlIdx].reconciled = true;
    DB.save('nau_bank_statements', stmts);
  }
  _matchSel = { pmt: null, stl: null, stlIdx: null, stmtId: null };
  toast('✓ Match confirmed.');
  openReconciliation(stmtId); // re-render
}

function autoMatch(stmtId) {
  const stmts = DB.load('nau_bank_statements');
  const sIdx = stmts.findIndex(s => s.id === stmtId);
  if (sIdx === -1) return;
  const stmt = stmts[sIdx];
  const payments = DB.load('nau_payments');
  let matchCount = 0;

  (stmt.lines || []).forEach((line, li) => {
    if (line.reconciled) return;
    const lineAmt = Number(line.debit || line.credit || 0);
    const lineDate = line.date || '';
    // Find unreconciled payment with matching amount (±1) and date within 2 days
    const pmtIdx = payments.findIndex(p => {
      if (p.reconciled) return false;
      const amtMatch = Math.abs(Number(p.amount) - lineAmt) <= 1;
      const dateMatch = !lineDate || !p.date || Math.abs(new Date(p.date) - new Date(lineDate)) <= 2 * 86400000;
      return amtMatch && dateMatch;
    });
    if (pmtIdx !== -1) {
      payments[pmtIdx].reconciled = true;
      stmt.lines[li].reconciled = true;
      matchCount++;
    }
  });

  DB.save('nau_payments', payments);
  DB.save('nau_bank_statements', stmts);
  toast(`⚡ Auto-matched ${matchCount} transaction${matchCount !== 1 ? 's' : ''}.`);
  openReconciliation(stmtId);
}

function saveReconciliation(stmtId) {
  const stmts = DB.load('nau_bank_statements');
  const sIdx = stmts.findIndex(s => s.id === stmtId);
  if (sIdx !== -1) {
    stmts[sIdx].lastReconciledAt = nowISO();
    DB.save('nau_bank_statements', stmts);
  }
  closeReconciliation();
  toast('Reconciliation saved.');
}

function closeReconciliation() {
  const panel = document.getElementById('reconcile-panel');
  if (panel) panel.style.display = 'none';
  _matchSel = { pmt: null, stl: null, stlIdx: null, stmtId: null };
}

// ===== PAYROLL MODULE =====

function renderEmployees() {
  var el = document.getElementById('employees-content');
  if (!el) return;
  var emps = DB.load('nau_employees');
  var html = '<div class="page-header"><h2 class="page-title">Employees</h2><button class="btn-create" onclick="openModal(\'employee\')">+ Add Employee</button></div>' +
    '<div class="report-card"><div class="table-scroll"><table class="acc-table"><thead><tr>' +
    '<th>Name</th><th>Department</th><th>Role</th><th>Basic Salary</th><th>PAYE %</th><th>Status</th><th>Actions</th>' +
    '</tr></thead><tbody>';
  if (!emps.length) {
    html += '<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:2rem">No employees yet. Click &quot;+ Add Employee&quot; to get started.</td></tr>';
  } else {
    emps.forEach(function(e) {
      html += '<tr>' +
        '<td><strong>' + esc(e.name) + '</strong><br><small style="color:#9ca3af">' + esc(e.email||'') + '</small></td>' +
        '<td>' + esc(e.dept||'—') + '</td>' +
        '<td>' + esc(e.role||'—') + '</td>' +
        '<td>$' + Number(e.salary||0).toLocaleString() + (e.allowances ? ' + $' + Number(e.allowances).toLocaleString() + ' allowance' : '') + '</td>' +
        '<td>' + (e.payeRate||30) + '%</td>' +
        '<td><span class="badge ' + (e.status==='Active' ? 'badge-paid' : 'badge-draft') + '">' + esc(e.status||'Active') + '</span></td>' +
        '<td><button class="btn-icon" onclick="openModal(\'employee\',' + e.id + ')" title="Edit">✏️</button>' +
        '<button class="btn-icon btn-danger" onclick="deleteItem(\'nau_employees\',' + e.id + ',renderEmployees)" title="Delete">🗑️</button></td>' +
        '</tr>';
    });
  }
  html += '</tbody></table></div></div>';
  el.innerHTML = html;
}

function genPayrunNo() {
  var p = DB.load('nau_payruns');
  return 'PR-' + new Date().getFullYear() + '-' + String(p.length + 1).padStart(2,'0');
}

function renderPayruns() {
  var el = document.getElementById('payruns-content');
  if (!el) return;
  var payruns = DB.load('nau_payruns').slice().reverse();
  var html = '<div class="page-header"><h2 class="page-title">Payruns</h2><button class="btn-create" onclick="openNewPayrun()">+ New Payrun</button></div>';
  if (!payruns.length) {
    html += '<div class="report-card"><p style="color:#9ca3af;text-align:center;padding:2rem">No payruns yet. Click &quot;+ New Payrun&quot; to process your first payroll.</p></div>';
  } else {
    html += '<div class="report-card"><div class="table-scroll"><table class="acc-table"><thead><tr><th>Payrun #</th><th>Period</th><th>Employees</th><th>Total Gross</th><th>Total PAYE</th><th>Total Net</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    payruns.forEach(function(p) {
      var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var period = (monthNames[p.month-1]||p.month) + ' ' + p.year;
      html += '<tr>' +
        '<td><strong>' + esc(p.payrunNo) + '</strong></td>' +
        '<td>' + period + '</td>' +
        '<td>' + (p.lines||[]).length + '</td>' +
        '<td>' + fmtMoney(p.totalGross) + '</td>' +
        '<td>' + fmtMoney(p.totalPAYE) + '</td>' +
        '<td>' + fmtMoney(p.totalNet) + '</td>' +
        '<td><span class="badge ' + (p.status==='Posted'?'badge-paid':'badge-pending') + '">' + esc(p.status) + '</span></td>' +
        '<td><button class="btn-icon" onclick="viewPayrun(' + p.id + ')" title="View">👁️</button></td>' +
        '</tr>';
    });
    html += '</tbody></table></div></div>';
  }
  el.innerHTML = html;
}

function openNewPayrun() {
  var emps = DB.load('nau_employees').filter(function(e){ return e.status === 'Active'; });
  if (!emps.length) { toast('No active employees. Add employees first.'); return; }
  var today = new Date();
  var month = today.getMonth() + 1;
  var year = today.getFullYear();
  var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  var rows = emps.map(function(e) {
    var gross = (e.salary||0) + (e.allowances||0);
    var paye = gross * ((e.payeRate||30)/100);
    var nssfEmp = gross * ((e.nssfEmp||5)/100);
    var nssfEmployer = gross * ((e.nssfEmployer||10)/100);
    var net = gross - paye - nssfEmp;
    return { empId: e.id, empName: e.name, role: e.role, gross: gross, paye: paye, nssfEmp: nssfEmp, nssfEmployer: nssfEmployer, net: net, otherDed: 0 };
  });

  var modalHtml = '<div style="margin-bottom:1rem;">' +
    '<label style="font-weight:600;display:block;margin-bottom:.4rem;">Payroll Period</label>' +
    '<div style="display:flex;gap:1rem;">' +
    '<select id="prMonth" style="flex:1;padding:.5rem;border:1px solid #ddd;border-radius:6px;">' +
    monthNames.map(function(m,i){ return '<option value="'+(i+1)+'"'+(i+1===month?' selected':'')+'>'+m+'</option>'; }).join('') +
    '</select>' +
    '<input type="number" id="prYear" value="'+year+'" style="width:90px;padding:.5rem;border:1px solid #ddd;border-radius:6px;">' +
    '</div></div>' +
    '<div class="table-scroll"><table class="acc-table" style="font-size:.85rem"><thead><tr><th>Employee</th><th>Gross</th><th>PAYE</th><th>NSSF(Emp)</th><th>NSSF(Emplyr)</th><th>Other Ded.</th><th>Net Pay</th></tr></thead><tbody id="prRows">';
  rows.forEach(function(r, i) {
    modalHtml += '<tr>' +
      '<td>' + esc(r.empName) + '<br><small style="color:#9ca3af">'+esc(r.role||'')+'</small></td>' +
      '<td>$' + r.gross.toFixed(2) + '</td>' +
      '<td>$' + r.paye.toFixed(2) + '</td>' +
      '<td>$' + r.nssfEmp.toFixed(2) + '</td>' +
      '<td>$' + r.nssfEmployer.toFixed(2) + '</td>' +
      '<td><input type="number" min="0" step="0.01" value="0" id="prOtherDed'+i+'" onchange="recalcPayrunRow('+i+')" style="width:70px;padding:.25rem .4rem;border:1px solid #ddd;border-radius:4px;font-size:.82rem"></td>' +
      '<td id="prNet'+i+'">$' + r.net.toFixed(2) + '</td>' +
      '</tr>';
  });
  var totalGross = rows.reduce(function(s,r){return s+r.gross;},0);
  var totalPAYE = rows.reduce(function(s,r){return s+r.paye;},0);
  var totalNSSFEmp = rows.reduce(function(s,r){return s+r.nssfEmp;},0);
  var totalNSSFEmployer = rows.reduce(function(s,r){return s+r.nssfEmployer;},0);
  var totalNet = rows.reduce(function(s,r){return s+r.net;},0);
  modalHtml += '</tbody><tfoot><tr style="font-weight:700;background:#f8fafc"><td>TOTALS</td><td>$'+totalGross.toFixed(2)+'</td><td>$'+totalPAYE.toFixed(2)+'</td><td>$'+totalNSSFEmp.toFixed(2)+'</td><td>$'+totalNSSFEmployer.toFixed(2)+'</td><td></td><td id="prTotalNet">$'+totalNet.toFixed(2)+'</td></tr></tfoot></table></div>';

  // Store rows on window for posting
  window._payrunRows = rows;
  window._payrunEmps = emps;

  _modalType = null;
  _editId = null;
  document.getElementById('modalTitle').textContent = 'New Payrun';
  document.getElementById('modalBody').innerHTML = modalHtml;
  var saveBtn = document.getElementById('modalSaveBtn');
  saveBtn.textContent = 'Post Payrun';
  saveBtn.style.display = '';
  saveBtn.onclick = postPayrun;
  document.getElementById('modalBackdrop').classList.add('open');
}

function recalcPayrunRow(i) {
  if (!window._payrunRows) return;
  var r = window._payrunRows[i];
  var otherDed = parseFloat(document.getElementById('prOtherDed'+i).value) || 0;
  r.otherDed = otherDed;
  var newNet = r.gross - r.paye - r.nssfEmp - otherDed;
  r.net = newNet;
  document.getElementById('prNet'+i).textContent = '$' + newNet.toFixed(2);
  var totalNet = window._payrunRows.reduce(function(s,row){return s+row.net;},0);
  var tnEl = document.getElementById('prTotalNet');
  if (tnEl) tnEl.textContent = '$' + totalNet.toFixed(2);
}

function postPayrun() {
  var rows = window._payrunRows;
  if (!rows || !rows.length) return;
  var month = parseInt(document.getElementById('prMonth').value);
  var year = parseInt(document.getElementById('prYear').value);

  var totalGross = rows.reduce(function(s,r){return s+r.gross;},0);
  var totalPAYE = rows.reduce(function(s,r){return s+r.paye;},0);
  var totalNSSFEmp = rows.reduce(function(s,r){return s+r.nssfEmp;},0);
  var totalNSSFEmployer = rows.reduce(function(s,r){return s+r.nssfEmployer;},0);
  var totalNet = rows.reduce(function(s,r){return s+r.net;},0);
  var totalNSSFPayable = totalNSSFEmp + totalNSSFEmployer;

  var payrunNo = genPayrunNo();
  var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var periodLabel = (monthNames[month-1]||month) + ' ' + year;

  var accts = DB.load('nau_payment_accounts');
  var cashAcct = accts.find(function(a){ return a.currency === 'USD' && a.status === 'Active'; }) || {};
  var cashCode = cashAcct.glAccountCode || '1001';
  var cashName = cashAcct.name || 'Cash USD';

  var coaAll = DB.load('nau_coa');
  function coaName(code) { var a = coaAll.find(function(c){return c.code===code;}); return a ? a.name : code; }

  postJE([
    { accountCode: '6010', accountName: coaName('6010'), debit: totalGross, credit: 0, description: 'Gross salaries — ' + periodLabel },
    { accountCode: '6011', accountName: coaName('6011'), debit: totalNSSFEmployer, credit: 0, description: 'NSSF employer — ' + periodLabel },
    { accountCode: cashCode, accountName: cashName, debit: 0, credit: totalNet, description: 'Net pay — ' + periodLabel },
    { accountCode: '2300', accountName: coaName('2300'), debit: 0, credit: totalPAYE, description: 'PAYE payable — ' + periodLabel },
    { accountCode: '2400', accountName: coaName('2400'), debit: 0, credit: totalNSSFPayable, description: 'NSSF payable — ' + periodLabel }
  ], payrunNo, 'Payroll — ' + periodLabel, 'general');

  var payruns = DB.load('nau_payruns');
  var payrunRecord = { id: DB.nextId('nau_payruns'), payrunNo: payrunNo, month: month, year: year, status: 'Posted', lines: rows, totalGross: totalGross, totalPAYE: totalPAYE, totalNSSFEmp: totalNSSFEmp, totalNSSFEmployer: totalNSSFEmployer, totalNet: totalNet, postedAt: nowISO() };
  payruns.push(payrunRecord);
  DB.save('nau_payruns', payruns);

  closeModal();
  renderPayruns();
  toast('Payrun ' + payrunNo + ' posted successfully.');
}

function viewPayrun(id) {
  var payruns = DB.load('nau_payruns');
  var p = payruns.find(function(x){ return x.id === id; });
  if (!p) return;
  var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var period = (monthNames[p.month-1]||p.month) + ' ' + p.year;

  var html = '<div style="margin-bottom:1rem;"><strong>' + esc(p.payrunNo) + '</strong> — ' + period + ' &nbsp;<span class="badge badge-paid">Posted</span></div>' +
    '<div class="table-scroll"><table class="acc-table" style="font-size:.85rem"><thead><tr><th>Employee</th><th>Gross</th><th>PAYE</th><th>NSSF(Emp)</th><th>NSSF(Emplyr)</th><th>Net Pay</th><th>Payslip</th></tr></thead><tbody>';
  (p.lines||[]).forEach(function(r) {
    html += '<tr>' +
      '<td>' + esc(r.empName) + '<br><small style="color:#9ca3af">'+esc(r.role||'')+'</small></td>' +
      '<td>$' + Number(r.gross||0).toFixed(2) + '</td>' +
      '<td>$' + Number(r.paye||0).toFixed(2) + '</td>' +
      '<td>$' + Number(r.nssfEmp||0).toFixed(2) + '</td>' +
      '<td>$' + Number(r.nssfEmployer||0).toFixed(2) + '</td>' +
      '<td><strong>$' + Number(r.net||0).toFixed(2) + '</strong></td>' +
      '<td><button class="btn-icon" onclick="printPayslip(' + id + ',' + r.empId + ')" title="Print Payslip">📄</button></td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';

  _modalType = null;
  _editId = null;
  document.getElementById('modalTitle').textContent = 'Payrun — ' + period;
  document.getElementById('modalBody').innerHTML = html;
  var saveBtn = document.getElementById('modalSaveBtn');
  saveBtn.style.display = 'none';
  document.getElementById('modalBackdrop').classList.add('open');
}

function printPayslip(payrunId, empId) {
  var payruns = DB.load('nau_payruns');
  var p = payruns.find(function(x){ return x.id === payrunId; });
  if (!p) return;
  var line = (p.lines||[]).find(function(l){ return l.empId === empId; });
  if (!line) return;
  var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var period = (monthNames[p.month-1]||p.month) + ' ' + p.year;
  var settings = DB.loadObj('nau_settings', {});
  var companyName = settings.companyName || 'NipponAuto Uganda';

  var emps = DB.load('nau_employees');
  var emp = emps.find(function(e){ return e.id === empId; }) || {};
  var basicSalary = emp.salary || line.gross;
  var allowances = emp.allowances || (line.gross - basicSalary);

  var html = '<div id="payslipContent" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:2rem;border:1px solid #ddd;border-radius:8px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:2px solid #0a1628;">' +
    '<div><div style="font-size:1.3rem;font-weight:800;color:#0a1628">' + esc(companyName) + '</div><div style="color:#666;font-size:.85rem">Payslip</div></div>' +
    '<div style="text-align:right"><div style="font-weight:700">Month: ' + period + '</div><div style="color:#666;font-size:.85rem">Payrun: ' + esc(p.payrunNo) + '</div></div>' +
    '</div>' +
    '<div style="margin-bottom:1.5rem;"><strong>Employee:</strong> ' + esc(line.empName) + ' &nbsp;&nbsp; <strong>Role:</strong> ' + esc(line.role||'—') + '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-bottom:1.5rem;">' +
    '<div><div style="font-weight:700;margin-bottom:.75rem;padding-bottom:.4rem;border-bottom:1px solid #eee">EARNINGS</div>' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:.4rem"><span>Basic Salary</span><span>$' + Number(basicSalary).toFixed(2) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:.4rem"><span>Allowances</span><span>$' + Number(allowances).toFixed(2) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;font-weight:700;margin-top:.5rem;padding-top:.4rem;border-top:1px solid #eee"><span>Gross Pay</span><span>$' + Number(line.gross||0).toFixed(2) + '</span></div>' +
    '</div>' +
    '<div><div style="font-weight:700;margin-bottom:.75rem;padding-bottom:.4rem;border-bottom:1px solid #eee">DEDUCTIONS</div>' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:.4rem"><span>PAYE</span><span>$' + Number(line.paye||0).toFixed(2) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:.4rem"><span>NSSF (Employee)</span><span>$' + Number(line.nssfEmp||0).toFixed(2) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:.4rem"><span>Other Deductions</span><span>$' + Number(line.otherDed||0).toFixed(2) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;font-weight:700;margin-top:.5rem;padding-top:.4rem;border-top:1px solid #eee"><span>Total Deductions</span><span>$' + (Number(line.paye||0)+Number(line.nssfEmp||0)+Number(line.otherDed||0)).toFixed(2) + '</span></div>' +
    '</div></div>' +
    '<div style="background:#0a1628;color:#fff;padding:1rem 1.5rem;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">' +
    '<span style="font-size:1.1rem;font-weight:700">NET PAY</span>' +
    '<span style="font-size:1.4rem;font-weight:800;color:#f0a500">$' + Number(line.net||0).toFixed(2) + '</span>' +
    '</div></div>';

  document.getElementById('payslipBody').innerHTML = html;
  document.getElementById('payslipModal').style.display = 'flex';
}

function closePayslipModal() {
  document.getElementById('payslipModal').style.display = 'none';
}

function printPayslipDoc() {
  window.print();
}
