/* ===== NipponAuto Uganda Admin Panel — admin.js ===== */
'use strict';

// ===== AUTH =====
const AUTH = {
  USER: 'admin',
  PASS: 'nippon2025',
  KEY: 'nau_session',
  login(u, p) {
    if (u === this.USER && p === this.PASS) { sessionStorage.setItem(this.KEY, '1'); return true; }
    return false;
  },
  logout() { sessionStorage.removeItem(this.KEY); },
  isLoggedIn() { return !!sessionStorage.getItem(this.KEY); }
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

// ===== TOAST =====
function toast(msg, dur = 2800) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, dur);
}

// ===== SLUGIFY =====
function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ===== DATE HELPERS =====
function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US') + ', ' + d.toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'});
}
function fmtDateShort(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US');
}
function nowISO() { return new Date().toISOString(); }

// ===== SKU GENERATOR =====
function genSKU() {
  const d = new Date();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  const vehs = DB.load('nau_vehicles');
  const seq = String(100000 + vehs.length + 1).slice(1);
  return `${mm}-${yyyy}-1${seq}`;
}

// ===== ROUTER =====
let currentPage = 'dashboard';
let currentModal = null;

function navigate(page) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  currentPage = page;
  updateBreadcrumb(page);
  updateNavActive(page);
  // Render page data
  const renders = {
    'dashboard': () => renderDash('overview'),
    'inv-manufacturers': renderManufacturers,
    'inv-models': renderModels,
    'inv-vehicles': renderVehicles,
    'inv-variables': () => renderVariables(),
    'inv-model-codes': renderModelCodes,
    'inv-reviews': renderReviews,
    'inv-service-plans': renderServicePlans,
    'auctions': renderAuctions,
    'quotes': renderQuotes,
    'orders': renderOrders,
    'inquiries': renderInquiries,
    'inquiries-new': renderInquiries,
    'content-slider': renderSlides,
    'content-topic': renderTopicPages,
    'content-blogs': renderBlogs,
    'content-faqs': renderFAQs,
    'marketing-promos': renderPromos,
    'marketing-newsletter': renderNewsletter,
    'marketing-campaigns': renderCampaigns,
    'support': renderSupport,
    'careers': renderCareers,
    'user-management': renderUsers,
    'appointments': renderAppointments,
    'customers': renderCustomers,
    'stock-alerts': renderAlerts,
    'reports': renderReports,
    'settings': () => showSettingsTab('company', document.querySelector('#page-settings .sub-tab')),
    'acc-invoices': renderInvoices,
    'acc-bills': renderBills,
    'acc-payments': renderPayments,
    'acc-receipts': renderReceipts,
    'acc-summary': renderAccSummary,
    'acc-accounts': renderPaymentAccounts
  };
  if (renders[page]) renders[page]();
}

function updateBreadcrumb(page) {
  const map = {
    'dashboard': ['Dashboard'],
    'inv-manufacturers': ['Inventory', 'Manufacturers'],
    'inv-models': ['Inventory', 'Models'],
    'inv-model-codes': ['Inventory', 'Model Codes'],
    'inv-vehicles': ['Inventory', 'Vehicles'],
    'inv-variables': ['Inventory', 'Variables', 'Body Types'],
    'inv-reviews': ['Inventory', 'Reviews'],
    'inv-service-plans': ['Inventory', 'Service Plans'],
    'auctions': ['Auctions'],
    'quotes': ['Quotes', 'Standard Quotes'],
    'orders': ['Orders'],
    'inquiries': ['Inquiries'],
    'inquiries-new': ['Inquiries', 'New'],
    'appointments': ['Appointments'],
    'customers': ['Customers'],
    'stock-alerts': ['Stock Alerts'],
    'content-slider': ['Content Management', 'Homepage Slider'],
    'content-topic': ['Content Management', 'Topic Pages'],
    'content-blogs': ['Content Management', 'Blogs'],
    'content-faqs': ['Content Management', 'FAQs'],
    'marketing-promos': ['Marketing', 'Promotions'],
    'marketing-newsletter': ['Marketing', 'Newsletter'],
    'marketing-campaigns': ['Marketing', 'Campaigns'],
    'support': ['Support'],
    'careers': ['Careers'],
    'user-management': ['User Management'],
    'reports': ['Reports'],
    'settings': ['Settings', 'Company Info'],
    'acc-invoices': ['Accounting', 'Invoices'],
    'acc-bills': ['Accounting', 'Bills & Expenses'],
    'acc-payments': ['Accounting', 'Payments'],
    'acc-receipts': ['Accounting', 'Receipts'],
    'acc-summary': ['Accounting', 'Financial Summary'],
    'acc-accounts': ['Accounting', 'Payment Accounts']
  };
  const parts = map[page] || [page];
  const bc = document.getElementById('adminBreadcrumb');
  let html = '<a href="#" data-nav="dashboard">Home</a>';
  parts.forEach((p, i) => {
    html += ' <span class="bc-sep">&rsaquo;</span> ';
    if (i === parts.length - 1) html += `<span class="bc-current">${p}</span>`;
    else html += `<span>${p}</span>`;
  });
  bc.innerHTML = html;
  bc.querySelectorAll('[data-nav]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); navigate(a.dataset.nav); }));
}

function updateNavActive(page) {
  document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
  const base = page.split('-')[0];
  document.querySelectorAll('.nav-link').forEach(b => {
    const nav = b.dataset.nav || '';
    if (nav === page || nav === base || (page.startsWith('inv') && nav === 'inv-vehicles') ||
        (page.startsWith('content') && nav === 'content-slider') ||
        (page.startsWith('marketing') && nav === 'marketing') ||
        (page.startsWith('acc') && nav === 'acc-invoices') ||
        (page === 'stock-alerts' && nav === 'stock-alerts')) {
      b.classList.add('active');
    }
  });
}

// ===== MODAL =====
let _modalType = null;
let _editId = null;

function openModal(type, id) {
  _modalType = type;
  _editId = id || null;
  const cfg = modalConfigs[type];
  if (!cfg) return;
  document.getElementById('modalTitle').textContent = (id ? 'Edit ' : 'Add ') + cfg.label;
  document.getElementById('modalBody').innerHTML = cfg.form(id ? cfg.getData(id) : null);
  document.getElementById('modalBackdrop').classList.add('open');
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('open');
  const saveBtn = document.getElementById('modalSaveBtn');
  saveBtn.onclick = submitModal;
  saveBtn.textContent = 'Save';
  saveBtn.style.display = '';
  _modalType = null;
  _editId = null;
}

function submitModal() {
  const cfg = modalConfigs[_modalType];
  if (!cfg) return;
  const data = cfg.collect();
  if (!data) return;
  if (_editId) {
    cfg.update(_editId, data);
    toast('✅ Updated successfully');
  } else {
    cfg.create(data);
    toast('✅ Created successfully');
  }
  closeModal();
  if (cfg.refresh) cfg.refresh();
}

// ===== MANUFACTURERS CRUD =====
function getMFRs() { return DB.load('nau_manufacturers'); }
function saveMFRs(d) { DB.save('nau_manufacturers', d); }
function getMFRName(id) { return (getMFRs().find(m=>m.id===id)||{}).name||'-'; }

function renderManufacturers() {
  const q = (document.getElementById('mfr-search')||{}).value||'';
  let data = getMFRs().filter(m => !q || m.name.toLowerCase().includes(q.toLowerCase()));
  document.getElementById('mfr-count').textContent = `${data.length} manufacturer${data.length!==1?'s':''}`;
  const LOGOS = {Toyota:'🚙',Nissan:'🚗',Honda:'🚗',Subaru:'🚘',Mitsubishi:'🚙',Isuzu:'🚚','Land Rover':'🚙',Lexus:'🏎️',BMW:'🏎️',Volkswagen:'🚗',Mazda:'🚗',Mercedes:'🏎️',Daihatsu:'🚗',Suzuki:'🚗'};
  document.getElementById('mfr-tbody').innerHTML = data.length ? data.map(m => `
    <tr>
      <td><div class="table-logo">${LOGOS[m.name]||'🚗'}</div></td>
      <td><strong>${m.name}</strong></td>
      <td><span class="td-muted">${m.route}</span></td>
      <td>${getModelCount(m.id)}</td>
      <td>${m.position||'-'}</td>
      <td><span class="td-muted">${m.description||'-'}</span></td>
      <td><div class="td-two-line"><span class="line1">Super Admin</span><span class="line2">info@nipponauto.ug</span></div></td>
      <td><div class="row-actions">
        <button class="btn-row" title="Edit" onclick="openModal('manufacturer',${m.id})">✏️</button>
        <button class="btn-row btn-row-delete" title="Delete" onclick="deleteMFR(${m.id})">🗑️</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="8" class="table-empty"><span class="empty-icon">🏭</span>No manufacturers found.</td></tr>';
}

function deleteMFR(id) {
  if (!confirm('Delete this manufacturer?')) return;
  saveMFRs(getMFRs().filter(m=>m.id!==id));
  renderManufacturers();
  toast('🗑️ Manufacturer deleted');
}

function getModelCount(mfrId) { return DB.load('nau_models').filter(m=>m.manufacturerId===mfrId).length; }

// ===== MODELS CRUD =====
function getModels() { return DB.load('nau_models'); }
function saveModels(d) { DB.save('nau_models', d); }
function getModelName(id) { return (getModels().find(m=>m.id===id)||{}).name||'-'; }

function renderModels() {
  const q = (document.getElementById('mdl-search')||{}).value||'';
  const mf = (document.getElementById('mdl-mfr-filter')||{}).value||'';
  // Populate filter dropdown
  const sel = document.getElementById('mdl-mfr-filter');
  if (sel) {
    const cur = sel.value;
    sel.innerHTML = '<option value="">All Manufacturers</option>' + getMFRs().map(m=>`<option value="${m.id}" ${cur==m.id?'selected':''}>${m.name}</option>`).join('');
  }
  let data = getModels().filter(m => {
    const matchQ = !q || m.name.toLowerCase().includes(q.toLowerCase());
    const matchMfr = !mf || m.manufacturerId == mf;
    return matchQ && matchMfr;
  });
  document.getElementById('mdl-count').textContent = `${data.length} model${data.length!==1?'s':''}`;
  document.getElementById('mdl-tbody').innerHTML = data.length ? data.map(m => `
    <tr>
      <td><strong>${m.name}</strong></td>
      <td>${getMFRName(m.manufacturerId)}</td>
      <td><span class="td-muted">${m.description||'-'}</span></td>
      <td>${getVehicleCountForModel(m.id)}</td>
      <td><span class="badge ${m.status?'badge-active':'badge-inactive'}">${m.status?'Active':'Inactive'}</span></td>
      <td><div class="td-two-line"><span class="line1">Super Admin</span><span class="line2">info@nipponauto.ug</span></div></td>
      <td>${fmtDateShort(m.createdAt)}</td>
      <td><div class="row-actions">
        <button class="btn-row" onclick="openModal('model',${m.id})">✏️</button>
        <button class="btn-row btn-row-delete" onclick="deleteModel(${m.id})">🗑️</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="8" class="table-empty"><span class="empty-icon">🚗</span>No models found.</td></tr>';
}

function deleteModel(id) {
  if (!confirm('Delete this model?')) return;
  saveModels(getModels().filter(m=>m.id!==id));
  renderModels();
  toast('🗑️ Model deleted');
}

function getVehicleCountForModel(modelId) { return DB.load('nau_vehicles').filter(v=>v.modelId===modelId).length; }

// ===== VEHICLES CRUD =====
function getVehicles() { return DB.load('nau_vehicles'); }
function saveVehicles(d) { DB.save('nau_vehicles', d); }

function renderVehicles() {
  const q = (document.getElementById('veh-search')||{}).value||'';
  const mf = (document.getElementById('veh-mfr-filter')||{}).value||'';
  const sel = document.getElementById('veh-mfr-filter');
  if (sel) {
    const cur = sel.value;
    sel.innerHTML = '<option value="">All Manufacturers</option>' + getMFRs().map(m=>`<option value="${m.id}" ${cur==m.id?'selected':''}>${m.name}</option>`).join('');
  }
  let data = getVehicles().filter(v => {
    const searchStr = (v.sku+v.make+v.model+v.chassis).toLowerCase();
    const matchQ = !q || searchStr.includes(q.toLowerCase());
    const matchMfr = !mf || v.manufacturerId == mf;
    return matchQ && matchMfr;
  });
  document.getElementById('veh-count').textContent = `${data.length} vehicle${data.length!==1?'s':''}`;
  document.getElementById('veh-tbody').innerHTML = data.length ? data.map(v => `
    <tr>
      <td>${v.imageUrl ? `<img src="${v.imageUrl}" class="table-img" alt="${v.make}" onerror="this.style.display='none'">` : '<div class="table-img-placeholder">🚗</div>'}</td>
      <td><strong style="font-size:.78rem">${v.sku}</strong></td>
      <td>${v.make} – ${v.model}</td>
      <td>${v.color||'-'}</td>
      <td>${v.year}</td>
      <td><span class="td-muted" style="font-size:.75rem">${v.chassis||'-'}</span></td>
      <td>${v.engineCC||'-'}</td>
      <td>${v.bodyType||'-'}${v.subBodyType?' / '+v.subBodyType:''}</td>
      <td>${v.fuelType||'-'}</td>
      <td><strong>$${Number(v.priceUSD||0).toLocaleString()}</strong></td>
      <td>
        <span class="badge badge-${(v.status||'draft').toLowerCase()}">${v.status||'Draft'}</span>
        ${v.journey ? `<div style="font-size:.7rem;color:#8a9ab5;margin-top:.2rem">${v.journey.filter(s=>s.completed).length}/6 stages</div>` : ''}
      </td>
      <td>${fmtDateShort(v.createdAt)}</td>
      <td><div class="row-actions">
        <button class="btn-row" title="Share">📤</button>
        <button class="btn-row" title="Edit" onclick="openModal('vehicle',${v.id})">✏️</button>
        <button class="btn-row btn-row-delete" title="Delete" onclick="deleteVehicle(${v.id})">🗑️</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="13" class="table-empty"><span class="empty-icon">🚗</span>No vehicles found.</td></tr>';
}

function deleteVehicle(id) {
  if (!confirm('Delete this vehicle?')) return;
  saveVehicles(getVehicles().filter(v=>v.id!==id));
  renderVehicles();
  toast('🗑️ Vehicle deleted');
}

function exportVehiclesCSV() {
  const vehs = getVehicles();
  const cols = ['sku','make','model','color','year','chassis','engineCC','bodyType','subBodyType','fuelType','transmission','priceUSD','priceUGX','status','createdAt'];
  const rows = [cols.join(','), ...vehs.map(v => cols.map(c => `"${(v[c]||'').toString().replace(/"/g,'""')}"`).join(','))];
  const blob = new Blob([rows.join('\n')], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'nipponauto-vehicles.csv';
  a.click();
  toast('📤 CSV exported');
}

function downloadCSVTemplate() {
  const cols = ['sku','make','model','color','year','chassis','engineCC','bodyType','subBodyType','fuelType','transmission','priceUSD','priceUGX','status'];
  const blob = new Blob([cols.join(',')+'\n'], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'vehicle-import-template.csv';
  a.click();
}

// ===== VARIABLES =====
const VAR_TYPES = [
  {key:'nau_var_body_types', label:'Body Types'},
  {key:'nau_var_sub_body_types', label:'Sub Body Types'},
  {key:'nau_var_fuel_types', label:'Fuel Types'},
  {key:'nau_var_colours', label:'Colours'},
  {key:'nau_var_transmissions', label:'Transmissions'},
  {key:'nau_var_drivetrains', label:'Drivetrains'},
  {key:'nau_var_steering_types', label:'Steering Types'},
  {key:'nau_var_steering_assist', label:'Steering Assist Types'},
  {key:'nau_var_steering_control', label:'Steering Control Types'},
  {key:'nau_var_steering_positions', label:'Steering Positions'},
  {key:'nau_var_vehicle_grades', label:'Vehicle Grades'},
  {key:'nau_var_condition_grades', label:'Condition Grades'},
  {key:'nau_var_feature_groups', label:'Feature Groups'},
  {key:'nau_var_features', label:'Features'},
  {key:'nau_var_tags', label:'Tags'}
];
let currentVarKey = 'nau_var_body_types';

function initVarTabs() {
  const wrap = document.getElementById('varTabs');
  if (!wrap) return;
  wrap.innerHTML = VAR_TYPES.map((v,i) =>
    `<button class="var-tab ${i===0?'active':''}" onclick="switchVarTab('${v.key}',this)">${v.label}</button>`
  ).join('');
}

function switchVarTab(key, el) {
  currentVarKey = key;
  document.querySelectorAll('.var-tab').forEach(t=>t.classList.remove('active'));
  if (el) el.classList.add('active');
  const type = VAR_TYPES.find(v=>v.key===key);
  if (type) document.getElementById('var-create-btn').textContent = '+ Create ' + type.label.replace(/s$/,'');
  renderVariables();
}

function renderVariables() {
  const q = (document.getElementById('var-search')||{}).value||'';
  const st = (document.getElementById('var-status-filter')||{}).value||'';
  let data = DB.load(currentVarKey).filter(v => {
    const matchQ = !q || v.name.toLowerCase().includes(q.toLowerCase());
    const matchSt = st===''||String(v.status?1:0)===st;
    return matchQ && matchSt;
  });
  document.getElementById('var-tbody').innerHTML = data.length ? data.map(v => `
    <tr>
      <td><div class="table-img-placeholder" style="width:36px;height:36px;font-size:.9rem">🚗</div></td>
      <td><strong>${v.name}</strong></td>
      <td><span class="td-muted">${v.route}</span></td>
      <td><div class="td-two-line"><span class="line1">Super Admin</span><span class="line2">info@nipponauto.ug</span></div></td>
      <td><label class="toggle-switch"><input type="checkbox" ${v.status?'checked':''} onchange="toggleVarStatus('${currentVarKey}',${v.id},this.checked)"><span class="toggle-slider"></span></label></td>
      <td>${fmtDate(v.createdAt)}</td>
      <td>${fmtDate(v.updatedAt)}</td>
      <td><div class="row-actions">
        <button class="btn-row" onclick="openModal('variable',${v.id})">✏️</button>
        <button class="btn-row btn-row-delete" onclick="deleteVar(${v.id})">🗑️</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="8" class="table-empty"><span class="empty-icon">⚙️</span>No items found.</td></tr>';
}

function toggleVarStatus(key, id, val) {
  const data = DB.load(key);
  const item = data.find(v=>v.id===id);
  if (item) { item.status = val; item.updatedAt = nowISO(); DB.save(key, data); }
}

function deleteVar(id) {
  if (!confirm('Delete this item?')) return;
  DB.save(currentVarKey, DB.load(currentVarKey).filter(v=>v.id!==id));
  renderVariables();
  toast('🗑️ Deleted');
}

// ===== QUOTES =====
function renderQuotes() {
  const q = (document.getElementById('qt-search')||{}).value||'';
  let data = DB.load('nau_quotes').filter(qt => !q || (qt.vehicleName+qt.customerName+qt.sku).toLowerCase().includes(q.toLowerCase()));
  const mfrSel = document.getElementById('qt-mfr');
  if (mfrSel && mfrSel.options.length < 2) getMFRs().forEach(m => { const o = new Option(m.name, m.id); mfrSel.add(o); });
  document.getElementById('qt-tbody').innerHTML = data.length ? data.map(q => `
    <tr>
      <td><strong>${q.quoteNo}</strong></td>
      <td><span style="font-size:.75rem">${q.sku||'-'}</span></td>
      <td>${q.vehicleName}</td>
      <td>${q.year||'-'}</td>
      <td><span class="td-muted" style="font-size:.75rem">${q.chassis||'-'}</span></td>
      <td><div class="td-two-line"><span class="line1">${q.customerName}</span><span class="line2">${q.customerEmail}</span></div></td>
      <td>$${Number(q.webPrice||0).toLocaleString()}.00</td>
      <td>$${Number(q.quotedPrice||0).toLocaleString()}.00</td>
      <td>${q.downPayment||70}%</td>
      <td><div class="td-two-line"><span class="line2">Req: ${q.reqDate||'-'}</span><span class="line2">Iss: ${q.issDate||'-'}</span></div></td>
      <td><span class="badge badge-${(q.status||'quoted').toLowerCase()}">${q.status||'Quoted'}</span></td>
      <td>${q.orderId ? `<span style="font-size:.75rem;background:#e8f5e9;color:#27ae60;padding:.2rem .5rem;border-radius:4px;font-weight:600;">✅ ${q.orderNo||'Order'}</span>` : '—'}</td>
      <td><div class="row-actions">
        <button class="btn-row" title="Edit" onclick="openModal('quote',${q.id})">✏️</button>
        <button class="btn-row" title="WhatsApp" onclick="openWhatsAppModal('quote',${q.id})" style="background:#25d366;color:#fff">📱</button>
        ${(q.status==='Quoted'||q.status==='Accepted'||q.status==='Pending')&&!q.orderId?`<button class="btn-row" title="Convert to Order" onclick="convertQuoteToOrder(${q.id})" style="background:#27ae60;color:#fff;font-size:.75rem;padding:.2rem .5rem;">🛒 Order</button>`:''}
      </div></td>
    </tr>`).join('') : '<tr><td colspan="13" class="table-empty"><span class="empty-icon">📋</span>No quotes found.</td></tr>';
}

function showQuoteTab(tab, el) {
  document.querySelectorAll('#page-quotes .sub-tab').forEach(t=>t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderQuotes();
}

// ===== ORDERS =====
function renderOrders() {
  const data = DB.load('nau_orders');
  document.getElementById('ord-tbody').innerHTML = data.length ? data.map(o => `
    <tr>
      <td><strong>${o.orderNo}</strong></td>
      <td>${o.customerName}</td>
      <td>${o.vehicleName||'-'}</td>
      <td>$${Number(o.amount||0).toLocaleString()}</td>
      <td>${fmtDateShort(o.date)}</td>
      <td><span class="badge badge-${(o.status||'pending').toLowerCase()}">${o.status||'Pending'}</span></td>
      <td>${o.quoteNo?`<span style="font-size:.75rem;color:#555;">${o.quoteNo}</span>`:'—'}</td>
      <td>${o.invoiceId?`<span style="font-size:.75rem;background:#e3f2fd;color:#0a1628;padding:.2rem .5rem;border-radius:4px;font-weight:600;">📄 ${o.invoiceNo||'INV'}</span>`:'—'}</td>
      <td><div class="row-actions">
        <button class="btn-row" onclick="openModal('order',${o.id})">✏️</button>
        ${!o.invoiceId?`<button class="btn-row" title="Generate Invoice" onclick="createInvoiceFromOrder(${o.id})" style="background:#0a1628;color:#fff;font-size:.75rem;padding:.2rem .5rem;">📄 Invoice</button>`:''}
        <button class="btn-row btn-row-delete" onclick="deletePage('nau_orders',${o.id},renderOrders)">🗑️</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="9" class="table-empty"><span class="empty-icon">📦</span>No orders yet.</td></tr>';
}

// ===== QUOTE → ORDER → INVOICE CONVERSIONS =====
function convertQuoteToOrder(quoteId) {
  const quotes = DB.load('nau_quotes');
  const q = quotes.find(x => x.id === quoteId);
  if (!q) return;
  if (q.orderId) {
    const existing = DB.load('nau_orders').find(o => o.id === q.orderId);
    if (existing) { toast('Already converted → ' + existing.orderNo); navigate('orders'); return; }
  }
  const orders = DB.load('nau_orders');
  const year = new Date().getFullYear();
  const seq = String(DB.nextId('nau_orders')).padStart(3, '0');
  const newOrder = {
    id: DB.nextId('nau_orders'),
    orderNo: 'ORD-' + year + '-' + seq,
    quoteId: q.id,
    quoteNo: q.quoteNo,
    customerName: q.customerName,
    customerEmail: q.customerEmail || '',
    vehicleName: q.vehicleName || q.sku || '',
    vehicleId: q.vehicleId || null,
    amount: q.quotedPrice || q.webPrice || 0,
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
    status: 'Pending',
    notes: 'Converted from ' + q.quoteNo,
    invoiceId: null,
    invoiceNo: null,
    createdAt: new Date().toISOString()
  };
  orders.push(newOrder);
  DB.save('nau_orders', orders);
  const qi = quotes.findIndex(x => x.id === quoteId);
  if (qi !== -1) {
    quotes[qi].status = 'Accepted';
    quotes[qi].orderId = newOrder.id;
    quotes[qi].orderNo = newOrder.orderNo;
    DB.save('nau_quotes', quotes);
  }
  toast('✅ ' + newOrder.orderNo + ' created from ' + q.quoteNo);
  navigate('orders');
}

function createInvoiceFromOrder(orderId) {
  const orders = DB.load('nau_orders');
  const order = orders.find(x => x.id === orderId);
  if (!order) return;
  if (order.invoiceId) {
    const existing = DB.load('nau_invoices').find(i => i.id === order.invoiceId);
    if (existing) { toast('Invoice ' + existing.invoiceNo + ' already exists.'); return; }
  }
  const invoices = DB.load('nau_invoices');
  const year = new Date().getFullYear();
  const seq = String(DB.nextId('nau_invoices')).padStart(3, '0');
  const newInv = {
    id: DB.nextId('nau_invoices'),
    invoiceNo: 'INV-' + year + '-' + seq,
    orderId: order.id,
    orderNo: order.orderNo,
    quoteId: order.quoteId || null,
    quoteNo: order.quoteNo || null,
    vehicleId: order.vehicleId || null,
    vehicleName: order.vehicleName || '',
    vehicleSKU: order.vehicleSKU || '',
    customerName: order.customerName || '',
    customerEmail: order.customerEmail || '',
    customerPhone: order.customerPhone || '',
    customerAddress: '',
    salePrice: order.amount || 0,
    discount: 0,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: order.amount || 0,
    paidAmount: 0,
    currency: order.currency || 'USD',
    paymentMethod: '',
    status: 'Draft',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: 'Generated from ' + order.orderNo,
    createdAt: new Date().toISOString()
  };
  invoices.push(newInv);
  DB.save('nau_invoices', invoices);
  const oi = orders.findIndex(x => x.id === orderId);
  if (oi !== -1) {
    orders[oi].invoiceId = newInv.id;
    orders[oi].invoiceNo = newInv.invoiceNo;
    DB.save('nau_orders', orders);
  }
  toast('📄 ' + newInv.invoiceNo + ' created. Open Accounting → Invoices to send it.');
  renderOrders();
}

// ===== INQUIRIES =====
function renderInquiries() {
  const q = (document.getElementById('inq-search')||{}).value||'';
  const st = (document.getElementById('inq-status')||{}).value||'';
  const isNewOnly = currentPage === 'inquiries-new';
  let data = DB.load('nau_inquiries').filter(i => {
    const matchQ = !q || (i.name+i.email+i.vehicleInterest).toLowerCase().includes(q.toLowerCase());
    const matchSt = st ? i.status===st : true;
    const matchNew = isNewOnly ? i.status==='new' : true;
    return matchQ && matchSt && matchNew;
  });
  document.getElementById('inq-tbody').innerHTML = data.length ? data.map(i => `
    <tr>
      <td><strong>${i.name}</strong></td>
      <td><span class="td-muted">${i.email}</span></td>
      <td>${i.phone||'-'}</td>
      <td>${i.vehicleInterest||'-'}</td>
      <td><span class="td-muted" style="font-size:.75rem">${(i.message||'').substring(0,60)}${i.message&&i.message.length>60?'...':''}</span></td>
      <td>${fmtDateShort(i.date)}</td>
      <td><span class="badge badge-${i.status||'new'}">${(i.status||'new').charAt(0).toUpperCase()+(i.status||'new').slice(1)}</span></td>
      <td><div class="row-actions">
        <button class="btn-row" title="Next Status" onclick="cycleInqStatus(${i.id})">🔄</button>
        <button class="btn-row" title="WhatsApp" onclick="openWhatsAppModal('inquiry',${i.id})" style="background:#25d366;color:#fff">📱</button>
        <button class="btn-row btn-row-delete" onclick="deleteInquiry(${i.id})">🗑️</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="8" class="table-empty"><span class="empty-icon">💬</span>No inquiries found.</td></tr>';
}

function cycleInqStatus(id) {
  const data = DB.load('nau_inquiries');
  const item = data.find(i=>i.id===id);
  if (!item) return;
  const cycle = {new:'contacted', contacted:'closed', closed:'new'};
  item.status = cycle[item.status||'new']||'new';
  DB.save('nau_inquiries', data);
  renderInquiries();
  toast(`Status → ${item.status}`);
}

function deleteInquiry(id) {
  if (!confirm('Delete this inquiry?')) return;
  DB.save('nau_inquiries', DB.load('nau_inquiries').filter(i=>i.id!==id));
  renderInquiries();
  toast('🗑️ Deleted');
}

// ===== CONTENT =====
function renderSlides() {
  const data = DB.load('nau_slides');
  document.getElementById('slide-tbody').innerHTML = data.length ? data.map(s=>`
    <tr>
      <td>${s.imageUrl?`<img src="${s.imageUrl}" class="table-img" onerror="this.style.display='none'">` : '<div class="table-img-placeholder">🖼️</div>'}</td>
      <td><strong>${s.title}</strong></td>
      <td><span class="td-muted">${s.subtitle||'-'}</span></td>
      <td>${s.ctaText||'-'}</td>
      <td>${s.sortOrder||0}</td>
      <td><label class="toggle-switch"><input type="checkbox" ${s.status?'checked':''} onchange="toggleSlide(${s.id},this.checked)"><span class="toggle-slider"></span></label></td>
      <td><div class="row-actions"><button class="btn-row" onclick="openModal('slide',${s.id})">✏️</button><button class="btn-row btn-row-delete" onclick="deleteSlide(${s.id})">🗑️</button></div></td>
    </tr>`).join('') : '<tr><td colspan="7" class="table-empty"><span class="empty-icon">🖼️</span>No slides yet.</td></tr>';
}
function toggleSlide(id, val) {
  const data = DB.load('nau_slides');
  const s = data.find(x=>x.id===id); if(s) { s.status=val; DB.save('nau_slides', data); }
}
function deleteSlide(id) {
  if (!confirm('Delete this slide?')) return;
  DB.save('nau_slides', DB.load('nau_slides').filter(s=>s.id!==id));
  renderSlides(); toast('🗑️ Deleted');
}

function renderTopicPages() {
  const data = DB.load('nau_topic_pages');
  document.getElementById('topic-tbody').innerHTML = data.length ? data.map(t=>`
    <tr><td><strong>${t.title}</strong></td><td><span class="td-muted">${t.slug}</span></td><td><span class="td-muted">${(t.content||'').substring(0,60)}...</span></td>
    <td><span class="badge ${t.status?'badge-active':'badge-inactive'}">${t.status?'Active':'Inactive'}</span></td>
    <td>${fmtDateShort(t.createdAt)}</td>
    <td><div class="row-actions"><button class="btn-row" onclick="openModal('topicPage',${t.id})">✏️</button><button class="btn-row btn-row-delete" onclick="deletePage('nau_topic_pages',${t.id},renderTopicPages)">🗑️</button></div></td></tr>`).join('')
    : '<tr><td colspan="6" class="table-empty"><span class="empty-icon">📄</span>No topic pages yet.</td></tr>';
}
function renderBlogs() {
  const data = DB.load('nau_blogs');
  document.getElementById('blog-tbody').innerHTML = data.length ? data.map(b=>`
    <tr><td><strong>${b.title}</strong></td><td>${b.author||'Admin'}</td><td>${b.category||'-'}</td>
    <td><span class="badge ${b.status?'badge-active':'badge-inactive'}">${b.status?'Published':'Draft'}</span></td>
    <td>${fmtDateShort(b.createdAt)}</td>
    <td><div class="row-actions"><button class="btn-row" onclick="openModal('blog',${b.id})">✏️</button><button class="btn-row btn-row-delete" onclick="deletePage('nau_blogs',${b.id},renderBlogs)">🗑️</button></div></td></tr>`).join('')
    : '<tr><td colspan="6" class="table-empty"><span class="empty-icon">📝</span>No blog posts yet.</td></tr>';
}
function renderFAQs() {
  const data = DB.load('nau_faqs');
  document.getElementById('faq-tbody').innerHTML = data.length ? data.map(f=>`
    <tr><td><strong>${f.question}</strong></td><td><span class="td-muted">${(f.answer||'').substring(0,80)}...</span></td>
    <td>${f.category||'-'}</td>
    <td><span class="badge ${f.status?'badge-active':'badge-inactive'}">${f.status?'Active':'Inactive'}</span></td>
    <td><div class="row-actions"><button class="btn-row" onclick="openModal('faq',${f.id})">✏️</button><button class="btn-row btn-row-delete" onclick="deletePage('nau_faqs',${f.id},renderFAQs)">🗑️</button></div></td></tr>`).join('')
    : '<tr><td colspan="5" class="table-empty"><span class="empty-icon">❓</span>No FAQs yet.</td></tr>';
}
function deletePage(key, id, refreshFn) {
  if (!confirm('Delete?')) return;
  DB.save(key, DB.load(key).filter(x=>x.id!==id));
  refreshFn(); toast('🗑️ Deleted');
}

// ===== MARKETING =====
function renderPromos() {
  const data = DB.load('nau_promos');
  document.getElementById('promo-tbody').innerHTML = data.length ? data.map(p=>`
    <tr><td><strong>${p.title}</strong></td><td>${p.discount?p.discount+'%':'-'}</td><td>${p.startDate||'-'}</td><td>${p.endDate||'-'}</td>
    <td><span class="badge ${p.status?'badge-active':'badge-inactive'}">${p.status?'Active':'Inactive'}</span></td>
    <td><div class="row-actions"><button class="btn-row" onclick="openModal('promo',${p.id})">✏️</button><button class="btn-row btn-row-delete" onclick="deletePage('nau_promos',${p.id},renderPromos)">🗑️</button></div></td></tr>`).join('')
    : '<tr><td colspan="6" class="table-empty"><span class="empty-icon">🎁</span>No promotions yet.</td></tr>';
}
function renderNewsletter() {
  const data = DB.load('nau_newsletter');
  document.getElementById('nl-tbody').innerHTML = data.length ? data.map(n=>`
    <tr><td>${n.name||'-'}</td><td>${n.email}</td><td>${fmtDateShort(n.subscribedAt)}</td>
    <td><span class="badge ${n.status?'badge-active':'badge-inactive'}">${n.status?'Subscribed':'Unsubscribed'}</span></td>
    <td><div class="row-actions"><button class="btn-row" onclick="openModal('subscriber',${n.id})">✏️</button><button class="btn-row btn-row-delete" onclick="deletePage('nau_newsletter',${n.id},renderNewsletter)">🗑️</button></div></td></tr>`).join('')
    : '<tr><td colspan="5" class="table-empty"><span class="empty-icon">📧</span>No subscribers yet.</td></tr>';
}
function renderCampaigns() {
  const data = DB.load('nau_campaigns');
  document.getElementById('camp-tbody').innerHTML = data.length ? data.map(c=>`
    <tr><td><strong>${c.name}</strong></td><td>${c.channel||'-'}</td><td>${c.target||'-'}</td><td>${c.scheduledDate||'-'}</td>
    <td><span class="badge ${c.status==='Sent'?'badge-accepted':c.status==='Active'?'badge-active':'badge-draft'}">${c.status||'Draft'}</span></td>
    <td><div class="row-actions"><button class="btn-row" onclick="openModal('campaign',${c.id})">✏️</button><button class="btn-row btn-row-delete" onclick="deletePage('nau_campaigns',${c.id},renderCampaigns)">🗑️</button></div></td></tr>`).join('')
    : '<tr><td colspan="6" class="table-empty"><span class="empty-icon">📣</span>No campaigns yet.</td></tr>';
}

// ===== SUPPORT / CAREERS / USERS =====
function renderSupport() {
  const data = DB.load('nau_support');
  document.getElementById('sup-tbody').innerHTML = data.length ? data.map(s=>`
    <tr><td><strong>#${s.id}</strong></td><td>${s.customer||s.customerName||'-'}</td><td>${s.subject}</td>
    <td><span class="badge badge-${(s.priority||'').toLowerCase()==='high'?'sold':(s.priority||'').toLowerCase()==='medium'?'quoted':'draft'}">${s.priority||'Low'}</span></td>
    <td>${fmtDateShort(s.date||s.createdAt)}</td>
    <td><span class="badge badge-${s.status==='Resolved'?'accepted':s.status==='In Progress'?'quoted':'pending'}">${s.status||'Open'}</span></td>
    <td><div class="row-actions"><button class="btn-row" onclick="openModal('ticket',${s.id})">✏️</button><button class="btn-row btn-row-delete" onclick="deletePage('nau_support',${s.id},renderSupport)">🗑️</button></div></td></tr>`).join('')
    : '<tr><td colspan="7" class="table-empty"><span class="empty-icon">🎫</span>No support tickets.</td></tr>';
}
function renderCareers() {
  const data = DB.load('nau_careers');
  document.getElementById('job-tbody').innerHTML = data.length ? data.map(j=>`
    <tr><td><strong>${j.title}</strong></td><td>${j.department||'-'}</td><td>${j.location||'-'}</td><td>${j.type||'-'}</td>
    <td>${j.applications||0}</td>
    <td><span class="badge ${j.status==='Open'?'badge-active':'badge-inactive'}">${j.status||'Open'}</span></td>
    <td><div class="row-actions"><button class="btn-row" onclick="openModal('job',${j.id})">✏️</button><button class="btn-row btn-row-delete" onclick="deletePage('nau_careers',${j.id},renderCareers)">🗑️</button></div></td></tr>`).join('')
    : '<tr><td colspan="7" class="table-empty"><span class="empty-icon">💼</span>No job listings yet.</td></tr>';
}
function renderUsers() {
  const data = DB.load('nau_users');
  const users = data.length ? data : [{id:1,name:'Super Admin',email:'info@nipponauto.ug',role:'Super Admin',lastLogin:nowISO(),status:true}];
  document.getElementById('usr-tbody').innerHTML = users.map(u=>`
    <tr><td><strong>${u.name}</strong></td><td>${u.email}</td><td>${u.role||'Staff'}</td>
    <td>${fmtDate(u.lastLogin||nowISO())}</td>
    <td><span class="badge ${u.status?'badge-active':'badge-inactive'}">${u.status?'Active':'Inactive'}</span></td>
    <td><div class="row-actions"><button class="btn-row" onclick="openModal('user',${u.id})">✏️</button><button class="btn-row btn-row-delete" onclick="deletePage('nau_users',${u.id},renderUsers)">🗑️</button></div></td></tr>`).join('');
}

// ===== MISC RENDERS =====
function renderModelCodes() {
  const data = DB.load('nau_model_codes');
  document.getElementById('mc-tbody').innerHTML = data.length ? data.map(c=>`
    <tr>
      <td><strong style="font-family:monospace">${c.code}</strong></td>
      <td>${getMFRName(c.mfrId)}</td>
      <td>${getModelName(c.modelId)}</td>
      <td style="font-family:monospace;font-size:.82rem">${c.engineCode||'-'}</td>
      <td>${c.engineCC ? c.engineCC+'cc' : '-'}</td>
      <td>${c.fuelType||'-'}</td>
      <td>${c.drivetrain||'-'}</td>
      <td>${c.description||'-'}</td>
      <td><div class="row-actions"><button class="btn-row" onclick="openModal('modelCode',${c.id})">✏️</button><button class="btn-row btn-row-delete" onclick="deletePage('nau_model_codes',${c.id},renderModelCodes)">🗑️</button></div></td>
    </tr>`).join('')
    : '<tr><td colspan="9" class="table-empty"><span class="empty-icon">🔢</span>No model codes yet.</td></tr>';
}
function onMCMfrChange() {
  const mfrId = Number(document.getElementById('mc-mfr').value);
  const models = getModels().filter(m => m.manufacturerId === mfrId);
  const sel = document.getElementById('mc-mdl');
  if (sel) sel.innerHTML = models.map(m=>`<option value="${m.id}">${m.name}</option>`).join('') || '<option value="">-- No models --</option>';
}
function renderReviews() {
  const data = DB.load('nau_reviews');
  document.getElementById('rev-tbody').innerHTML = data.length ? data.map(r=>`
    <tr><td><strong>${r.customer}</strong></td><td>${r.vehicle||'-'}</td><td>${'★'.repeat(Number(r.rating)||5)}</td>
    <td><span class="td-muted">${(r.text||'').substring(0,80)}</span></td><td>${fmtDateShort(r.date||r.createdAt)}</td>
    <td><span class="badge ${r.approved?'badge-accepted':'badge-pending'}">${r.approved?'Approved':'Pending'}</span></td>
    <td><div class="row-actions"><button class="btn-row" onclick="openModal('review',${r.id})">✏️</button><button class="btn-row btn-row-delete" onclick="deletePage('nau_reviews',${r.id},renderReviews)">🗑️</button></div></td></tr>`).join('')
    : '<tr><td colspan="7" class="table-empty"><span class="empty-icon">⭐</span>No reviews yet.</td></tr>';
}
function renderServicePlans() {
  const data = DB.load('nau_service_plans');
  document.getElementById('sp-tbody').innerHTML = data.length ? data.map(p=>`
    <tr><td><strong>${p.name}</strong></td><td>$${p.price}/mo</td><td>${p.duration} months</td>
    <td><span class="td-muted">${Array.isArray(p.features)?p.features.join(', '):(p.features||'-')}</span></td>
    <td><span class="badge badge-active">Active</span></td>
    <td><div class="row-actions"><button class="btn-row" onclick="openModal('servicePlan',${p.id})">✏️</button><button class="btn-row btn-row-delete" onclick="deletePage('nau_service_plans',${p.id},renderServicePlans)">🗑️</button></div></td></tr>`).join('')
    : '<tr><td colspan="6" class="table-empty"><span class="empty-icon">🛠️</span>No service plans yet.</td></tr>';
}
function renderAuctions() {
  const data = DB.load('nau_auctions');
  document.getElementById('auc-tbody').innerHTML = data.length ? data.map(a=>`
    <tr><td><strong>AUC-${String(a.id).padStart(4,'0')}</strong></td><td>${a.vehicle}</td><td>${a.startDate||'-'}</td><td>${a.endDate||'-'}</td>
    <td>$${Number(a.startingBid||0).toLocaleString()}</td><td>$${Number(a.currentBid||a.startingBid||0).toLocaleString()}</td>
    <td><span class="badge ${a.status==='Active'?'badge-active':a.status==='Ended'?'badge-sold':'badge-draft'}">${a.status||'Upcoming'}</span></td>
    <td><div class="row-actions"><button class="btn-row" onclick="openModal('auction',${a.id})">✏️</button><button class="btn-row btn-row-delete" onclick="deletePage('nau_auctions',${a.id},renderAuctions)">🗑️</button></div></td></tr>`).join('')
    : '<tr><td colspan="8" class="table-empty"><span class="empty-icon">🔨</span>No auctions yet.</td></tr>';
}

// ===== REPORTS =====
function showReportTab(tab, el) {
  document.querySelectorAll('#reportTabs .sub-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  const overviewPanel = document.getElementById('rpt-overview-panel');
  const staffPanel = document.getElementById('rpt-staff-panel');
  if (overviewPanel) overviewPanel.style.display = tab === 'overview' ? '' : 'none';
  if (staffPanel) staffPanel.style.display = tab === 'staff' ? '' : 'none';
  if (tab === 'staff') renderStaffPerformance();
}

function renderReports() {
  const vehs = getVehicles();
  const inqs = DB.load('nau_inquiries');
  const qts = DB.load('nau_quotes');
  const published = vehs.filter(v=>v.status==='published'||v.status==='Published').length;
  const sold = vehs.filter(v=>v.status==='sold'||v.status==='Sold').length;
  // Reset to overview tab
  document.querySelectorAll('#reportTabs .sub-tab').forEach((t,i) => t.classList.toggle('active', i===0));
  const overviewPanel = document.getElementById('rpt-overview-panel');
  const staffPanel = document.getElementById('rpt-staff-panel');
  if (overviewPanel) overviewPanel.style.display = '';
  if (staffPanel) staffPanel.style.display = 'none';
  document.getElementById('reports-stats').innerHTML = [
    {label:'Total Vehicles', value: vehs.length, trend:'neutral'},
    {label:'Published', value: published, trend:'up'},
    {label:'Sold', value: sold, trend:'up'},
    {label:'Total Inquiries', value: inqs.length, trend:'neutral'},
    {label:'Total Quotes', value: qts.length, trend:'neutral'},
    {label:'New Inquiries', value: inqs.filter(i=>i.status==='new').length, trend:'up'}
  ].map(s=>`<div class="stat-card">
    <div class="stat-card-label">${s.label}</div>
    <div class="stat-card-value">${s.value}</div>
    <div class="stat-card-trend trend-${s.trend}">── This month</div>
  </div>`).join('');
  // Charts
  const mfrCounts = {};
  vehs.forEach(v => { mfrCounts[v.make] = (mfrCounts[v.make]||0)+1; });
  const max = Math.max(...Object.values(mfrCounts), 1);
  document.getElementById('rpt-mfr-chart').innerHTML = Object.entries(mfrCounts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>`
    <div class="bar-row"><div class="bar-label">${k}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(v/max*100)}%"></div></div><div class="bar-value">${v}</div></div>`).join('');
  const fuelCounts = {};
  vehs.forEach(v => { fuelCounts[v.fuelType||'Unknown'] = (fuelCounts[v.fuelType||'Unknown']||0)+1; });
  const maxF = Math.max(...Object.values(fuelCounts), 1);
  document.getElementById('rpt-fuel-chart').innerHTML = Object.entries(fuelCounts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`
    <div class="bar-row"><div class="bar-label">${k}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(v/maxF*100)}%"></div></div><div class="bar-value">${v}</div></div>`).join('');
}

// ===== STAFF PERFORMANCE =====
function renderStaffPerformance() {
  const invoices = DB.load('nau_invoices');
  const staffMap = {};
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  invoices.forEach(inv => {
    const staff = inv.createdBy || 'Super Admin';
    if (!staffMap[staff]) staffMap[staff] = { count: 0, revenue: 0, thisMonth: 0 };
    staffMap[staff].count++;
    staffMap[staff].revenue += Number(inv.totalAmount || 0);
    const d = new Date(inv.createdAt);
    if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
      staffMap[staff].thisMonth += Number(inv.totalAmount || 0);
    }
  });
  if (!Object.keys(staffMap).length) staffMap['Super Admin'] = { count: 0, revenue: 0, thisMonth: 0 };
  const rows = Object.entries(staffMap).sort((a, b) => b[1].revenue - a[1].revenue);
  const maxRev = Math.max(...rows.map(r => r[1].revenue), 1);
  const contentEl = document.getElementById('rpt-staff-content');
  if (!contentEl) return;
  contentEl.innerHTML = `
    <div class="dash-section" style="margin-bottom:1.5rem">
      <h3>Staff Revenue Performance</h3>
      <div class="bar-chart" style="margin-top:1rem">
        ${rows.map(([name, s]) => `
          <div class="bar-row">
            <div class="bar-label">${name}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round(s.revenue/maxRev*100)}%"></div></div>
            <div class="bar-value">$${Math.round(s.revenue/1000)}K</div>
          </div>`).join('')}
      </div>
    </div>
    <div class="table-wrap">
      <table class="admin-table">
        <thead><tr><th>Staff Name</th><th>Invoices Created</th><th>Total Revenue (USD)</th><th>Avg Deal Size</th><th>This Month</th></tr></thead>
        <tbody>
          ${rows.map(([name, s]) => `
            <tr>
              <td><strong>${name}</strong></td>
              <td>${s.count}</td>
              <td><strong>$${Number(s.revenue).toLocaleString()}</strong></td>
              <td>$${s.count ? Math.round(s.revenue / s.count).toLocaleString() : '0'}</td>
              <td>$${Number(s.thisMonth).toLocaleString()}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ===== DASHBOARD =====
function renderDash(tab) {
  document.querySelectorAll('.sub-tab[data-dash]').forEach(t => t.classList.toggle('active', t.dataset.dash===tab));
  const vehs = getVehicles();
  const inqs = DB.load('nau_inquiries');
  const qts = DB.load('nau_quotes');
  const mfrs = getMFRs();
  const totalVal = vehs.reduce((s,v)=>s+Number(v.priceUSD||0),0);
  if (tab==='overview') {
    const pendingAppts = DB.load('nau_appointments').filter(a => a.status === 'Pending').length;
    const today = new Date().toISOString().split('T')[0];
    const upcomingAppts = DB.load('nau_appointments')
      .filter(a => (a.status === 'Pending' || a.status === 'Confirmed') && a.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time||'').localeCompare(b.time||''))
      .slice(0, 5);

    const apptTableHtml = `
      <div class="dash-widget" style="margin-top:1.5rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <h3 style="margin:0;font-size:1rem;color:#0a1628;">&#128197; Upcoming Appointments</h3>
          <button onclick="navigate('appointments')" style="background:none;border:none;color:#c0392b;font-size:.83rem;font-weight:700;cursor:pointer;">View All &#8594;</button>
        </div>
        ${upcomingAppts.length === 0
          ? '<p style="color:#999;text-align:center;padding:1rem;">No upcoming appointments.</p>'
          : `<table style="width:100%;border-collapse:collapse;font-size:.85rem;">
              <thead>
                <tr style="background:#f4f6fa;">
                  <th style="padding:.5rem .75rem;text-align:left;font-weight:600;color:#555;">Date &amp; Time</th>
                  <th style="padding:.5rem .75rem;text-align:left;font-weight:600;color:#555;">Customer</th>
                  <th style="padding:.5rem .75rem;text-align:left;font-weight:600;color:#555;">Vehicle Interest</th>
                  <th style="padding:.5rem .75rem;text-align:left;font-weight:600;color:#555;">Status</th>
                  <th style="padding:.5rem .75rem;text-align:left;font-weight:600;color:#555;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${upcomingAppts.map(a => `
                  <tr style="border-top:1px solid #f0f0f0;">
                    <td style="padding:.5rem .75rem;">${a.date}${a.time ? ' ' + a.time : ''}</td>
                    <td style="padding:.5rem .75rem;">${a.customerName || a.name || '—'}<br><span style="color:#999;font-size:.78rem;">${a.email||''}</span></td>
                    <td style="padding:.5rem .75rem;">${a.vehicleInterest || a.vehicle || '—'}</td>
                    <td style="padding:.5rem .75rem;"><span style="background:${a.status==='Confirmed'?'#27ae60':'#999'};color:#fff;padding:.2rem .6rem;border-radius:20px;font-size:.75rem;">${a.status}</span></td>
                    <td style="padding:.5rem .75rem;">
                      ${a.status === 'Pending' ? `<button onclick="dashConfirmAppt(${a.id})" style="background:#27ae60;color:#fff;border:none;border-radius:4px;padding:.25rem .5rem;font-size:.75rem;cursor:pointer;margin-right:.3rem;">Confirm</button>` : ''}
                      <button onclick="dashCancelAppt(${a.id})" style="background:#c0392b;color:#fff;border:none;border-radius:4px;padding:.25rem .5rem;font-size:.75rem;cursor:pointer;">Cancel</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>`
        }
      </div>
    `;

    document.getElementById('dashContent').innerHTML = `
      <div class="stats-grid-admin">
        <div class="stat-card"><div class="stat-card-label">Total Vehicles in Stock</div><div class="stat-card-value">${vehs.length}</div><div class="stat-card-trend trend-neutral">&#8599; All inventory</div></div>
        <div class="stat-card"><div class="stat-card-label">Total Sales (est.)</div><div class="stat-card-value">$${Math.round(totalVal/1000)}K</div><div class="stat-card-trend trend-up">&#8599; +0% vs last month</div></div>
        <div class="stat-card"><div class="stat-card-label">Pending Inquiries</div><div class="stat-card-value">${inqs.filter(i=>i.status==='new').length}</div><div class="stat-card-trend trend-up">&#8599; New</div></div>
        <div class="stat-card stat-card-orange"><div class="stat-card-label">&#128197; Pending Appointments</div><div class="stat-card-value">${pendingAppts}</div><div class="stat-card-trend trend-neutral" style="cursor:pointer;" onclick="navigate('appointments')">View Appointments &#8594;</div></div>
      </div>
      <div class="dash-grid">
        <div class="dash-section"><h3>Recent Inquiries <a href="#" data-nav="inquiries">View All</a></h3>
          ${inqs.slice(0,5).map(i=>`<div style="display:flex;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid #f1f4f9;font-size:.82rem">
            <div><strong>${i.name}</strong><div class="td-muted">${i.vehicleInterest||'General'}</div></div>
            <span class="badge badge-${i.status||'new'}">${i.status||'new'}</span></div>`).join('') || '<p style="color:#8a9ab5;font-size:.82rem">No inquiries yet.</p>'}
        </div>
        <div class="dash-section"><h3>Stock by Manufacturer</h3>
          <div class="bar-chart">${(()=>{
            const mc = {}; vehs.forEach(v=>{mc[v.make]=(mc[v.make]||0)+1;});
            const mx = Math.max(...Object.values(mc),1);
            return Object.entries(mc).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>`
              <div class="bar-row"><div class="bar-label">${k}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(v/mx*100)}%"></div></div><div class="bar-value">${v}</div></div>`).join('');
          })()}</div>
        </div>
      </div>
      ${apptTableHtml}`;
    document.querySelectorAll('#dashContent [data-nav]').forEach(a => a.addEventListener('click', e=>{e.preventDefault();navigate(a.dataset.nav);}));
  } else if (tab==='vehicles') {
    document.getElementById('dashContent').innerHTML = `<div class="dash-section"><h3>Vehicle Overview</h3>
      <div class="stats-grid-admin" style="margin-bottom:1rem">
        ${['Published','Sold','Draft'].map(s=>`<div class="stat-card"><div class="stat-card-label">${s}</div><div class="stat-card-value">${vehs.filter(v=>(v.status||'').toLowerCase()===s.toLowerCase()).length}</div></div>`).join('')}
      </div></div>`;
  } else if (tab==='manufacturers') {
    const mc = {}; vehs.forEach(v=>{mc[v.make]=(mc[v.make]||0)+1;});
    const topMfr = Object.entries(mc).sort((a,b)=>b[1]-a[1])[0]||['—',0];
    document.getElementById('dashContent').innerHTML = `
      <div class="stats-grid-admin">
        <div class="stat-card"><div class="stat-card-label">Total Manufacturers</div><div class="stat-card-value">${mfrs.length}</div></div>
        <div class="stat-card"><div class="stat-card-label">Top Manufacturer</div><div class="stat-card-value" style="font-size:1.3rem">${topMfr[0]}</div><div class="stat-card-trend trend-up">${topMfr[1]} vehicles in stock</div></div>
        <div class="stat-card"><div class="stat-card-label">Most Listed Model</div><div class="stat-card-value" style="font-size:1.3rem">${(()=>{const mc={}; vehs.forEach(v=>{mc[v.model]=(mc[v.model]||0)+1;}); return (Object.entries(mc).sort((a,b)=>b[1]-a[1])[0]||['—'])[0];})()}</div></div>
      </div>`;
  } else if (tab==='inquiries') {
    document.getElementById('dashContent').innerHTML = `<div class="stats-grid-admin">
      ${['new','contacted','closed'].map(s=>`<div class="stat-card"><div class="stat-card-label">${s.charAt(0).toUpperCase()+s.slice(1)}</div><div class="stat-card-value">${inqs.filter(i=>i.status===s).length}</div></div>`).join('')}
    </div>`;
  } else if (tab==='finance') {
    document.getElementById('dashContent').innerHTML = `<div class="stats-grid-admin">
      <div class="stat-card"><div class="stat-card-label">Est. Stock Value</div><div class="stat-card-value">$${Math.round(totalVal/1000)}K</div></div>
      <div class="stat-card"><div class="stat-card-label">Total Quotes Value</div><div class="stat-card-value">$${Math.round(qts.reduce((s,q)=>s+Number(q.quotedPrice||0),0)/1000)}K</div></div>
    </div>`;
  }
}

function dashConfirmAppt(id) {
  const appts = DB.load('nau_appointments');
  const idx = appts.findIndex(a => a.id === id);
  if (idx === -1) return;
  appts[idx].status = 'Confirmed';
  DB.save('nau_appointments', appts);
  renderDash('overview');
  toast('Appointment confirmed.');
}

function dashCancelAppt(id) {
  const appts = DB.load('nau_appointments');
  const idx = appts.findIndex(a => a.id === id);
  if (idx === -1) return;
  appts[idx].status = 'Cancelled';
  DB.save('nau_appointments', appts);
  renderDash('overview');
  toast('Appointment cancelled.');
}

// ===== SETTINGS =====
function showSettingsTab(tab, el) {
  document.querySelectorAll('#page-settings .sub-tab').forEach(t=>t.classList.remove('active'));
  if (el) el.classList.add('active');
  ['company','freights','locations','email','seo','api','translation','currency','finance-partners'].forEach(t => {
    const el2 = document.getElementById('settings-'+t);
    if (el2) el2.style.display = t===tab ? 'block' : 'none';
  });
  if (tab==='api') renderAPITable();
  if (tab==='translation') renderLangTable();
  if (tab==='currency') renderCurrencyTable();
  if (tab==='freights') renderFreights();
  if (tab==='locations') renderLocations();
  if (tab==='finance-partners') renderFinancePartners();
  loadSettings();
}

function loadSettings() {
  const s = DB.loadObj('nau_settings', {});
  const fields = ['name','email','phone','whatsapp','address','hours','fb','tw','yt','li','tt','ig',
    'smtp-host','smtp-port','smtp-user','smtp-pass','sender-name','sender-email','email-footer',
    'seo-title','seo-desc','seo-kw','og-img','ga','gtm','fb-pixel','canonical','robots'];
  fields.forEach(f => { const el = document.getElementById('s-'+f); if(el && s[f]) el.value = s[f]; });
}

function saveSettings(section) {
  const s = DB.loadObj('nau_settings', {});
  const fields = {
    company: ['name','email','phone','whatsapp','address','hours','fb','tw','yt','li','tt','ig'],
    email: ['smtp-host','smtp-port','smtp-user','smtp-pass','sender-name','sender-email','email-footer'],
    seo: ['seo-title','seo-desc','seo-kw','og-img','ga','gtm','fb-pixel','canonical','robots']
  };
  (fields[section]||[]).forEach(f => { const el = document.getElementById('s-'+f); if(el) s[f] = el.value; });
  DB.save('nau_settings', s);
  toast('✅ Settings saved');
}

function testEmail() { toast('📧 Test email sent (mock)'); }
function updateRates() { toast('🔄 Rates updated (mock)'); }

function renderAPITable() {
  const apis = [
    {name:'WhatsApp Business API', key:'', status:false},
    {name:'Google Maps API', key:'', status:false},
    {name:'Facebook Graph API', key:'', status:false},
    {name:'Currency API', key:'', status:false},
    {name:'SendGrid (Email)', key:'', status:false}
  ];
  document.getElementById('api-tbody').innerHTML = apis.map((a,i)=>`
    <tr><td><strong>${a.name}</strong></td>
    <td><input class="filter-input" style="width:280px" placeholder="Enter API key..." /></td>
    <td><label class="toggle-switch"><input type="checkbox"><span class="toggle-slider"></span></label></td>
    <td><span class="td-muted">Never</span></td>
    <td><div class="row-actions"><button class="btn-row">💾</button></div></td></tr>`).join('');
}

function renderLangTable() {
  const langs = [
    {lang:'English', code:'en', status:true},
    {lang:'Luganda', code:'lg', status:false},
    {lang:'Swahili', code:'sw', status:false},
    {lang:'French', code:'fr', status:false},
    {lang:'Arabic', code:'ar', status:false}
  ];
  document.getElementById('lang-tbody').innerHTML = langs.map(l=>`
    <tr><td>${l.lang}</td><td>${l.code}</td>
    <td><label class="toggle-switch"><input type="checkbox" ${l.status?'checked':''}><span class="toggle-slider"></span></label></td>
    <td><div class="row-actions"><button class="btn-row">✏️</button></div></td></tr>`).join('');
}

function renderCurrencyTable() {
  const currencies = [
    {currency:'Ugandan Shilling', symbol:'UGX', rate:3700, auto:true, status:true},
    {currency:'Japanese Yen', symbol:'JPY', rate:149, auto:true, status:true},
    {currency:'Kenyan Shilling', symbol:'KES', rate:130, auto:false, status:true},
    {currency:'Euro', symbol:'EUR', rate:0.92, auto:false, status:false}
  ];
  document.getElementById('curr-tbody').innerHTML = currencies.map(c=>`
    <tr><td><strong>${c.currency}</strong></td><td>${c.symbol}</td>
    <td><input class="filter-input" style="width:100px" value="${c.rate}" /></td>
    <td><label class="toggle-switch"><input type="checkbox" ${c.auto?'checked':''}><span class="toggle-slider"></span></label></td>
    <td><label class="toggle-switch"><input type="checkbox" ${c.status?'checked':''}><span class="toggle-slider"></span></label></td>
    <td><div class="row-actions"><button class="btn-row">💾</button></div></td></tr>`).join('');
}

function renderFreights() {
  const data = DB.load('nau_freights');
  document.getElementById('freight-tbody').innerHTML = data.length ? data.map(f=>`
    <tr><td>${f.region}</td><td>${f.method}</td><td>$${f.cost}</td><td>${f.days} days</td><td>${f.notes||'-'}</td>
    <td><div class="row-actions"><button class="btn-row" onclick="openModal('freight',${f.id})">✏️</button><button class="btn-row btn-row-delete">🗑️</button></div></td></tr>`).join('')
    : '<tr><td colspan="6" class="table-empty"><span class="empty-icon">🚢</span>No freight rates yet.</td></tr>';
}

function renderLocations() {
  const data = DB.load('nau_locations');
  document.getElementById('loc-tbody').innerHTML = data.length ? data.map(l=>`
    <tr><td><strong>${l.name}</strong></td><td>${l.address}</td><td>${l.city}</td><td>${l.phone||'-'}</td>
    <td>${l.primary?'<span class="badge badge-active">Primary</span>':'-'}</td>
    <td><span class="badge badge-active">Active</span></td>
    <td><div class="row-actions"><button class="btn-row">✏️</button><button class="btn-row btn-row-delete">🗑️</button></div></td></tr>`).join('')
    : '<tr><td colspan="7" class="table-empty"><span class="empty-icon">📍</span>No locations yet.</td></tr>';
}

// ===== MODAL CONFIGS =====
const modalConfigs = {
  quote: {
    label: 'Quote',
    getData: id => DB.load('nau_quotes').find(q => q.id === id),
    form: d => `
      <div class="form-row"><div class="form-group"><label>Quote No</label><input class="form-control" id="q-no" value="${d?d.quoteNo:''}" readonly style="background:#f4f6fa;" /></div>
      <div class="form-group"><label>Status</label><select class="form-control" id="q-status">
        ${['Pending','Quoted','Accepted','Declined','Cancelled'].map(s=>`<option ${d&&d.status===s?'selected':''}>${s}</option>`).join('')}
      </select></div></div>
      <div class="form-row"><div class="form-group"><label>Customer Name</label><input class="form-control" id="q-cust" value="${d?d.customerName:''}" readonly style="background:#f4f6fa;" /></div>
      <div class="form-group"><label>Customer Email</label><input class="form-control" id="q-email" value="${d?d.customerEmail:''}" readonly style="background:#f4f6fa;" /></div></div>
      <div class="form-row"><div class="form-group"><label>Vehicle</label><input class="form-control" id="q-vehicle" value="${d?d.vehicleName:''}" /></div>
      <div class="form-group"><label>Web Price (USD)</label><input class="form-control" type="number" id="q-web-price" value="${d?d.webPrice:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Quoted Price (USD)</label><input class="form-control" type="number" id="q-quoted-price" value="${d?d.quotedPrice:''}" /></div>
      <div class="form-group"><label>Down Payment (%)</label><input class="form-control" type="number" id="q-down-pct" value="${d?d.downPayment:70}" /></div></div>
      <div class="form-group"><label>Expiry Date</label><input class="form-control" type="date" id="q-expires" value="${d&&d.expiresAt?d.expiresAt:''}" /></div>
      <div class="form-row full"><div class="form-group"><label>Notes</label><textarea class="form-control" id="q-notes">${d?d.notes||'':''}</textarea></div></div>`,
    collect: () => {
      return {
        vehicleName: document.getElementById('q-vehicle').value,
        webPrice: Number(document.getElementById('q-web-price').value) || 0,
        quotedPrice: Number(document.getElementById('q-quoted-price').value) || 0,
        downPayment: Number(document.getElementById('q-down-pct').value) || 70,
        status: document.getElementById('q-status').value,
        expiresAt: document.getElementById('q-expires').value || '',
        notes: document.getElementById('q-notes').value
      };
    },
    create: d => { const all = DB.load('nau_quotes'); const no = 'QT-' + new Date().getFullYear() + '-' + String(DB.nextId('nau_quotes')).padStart(2,'0'); all.push({id:DB.nextId('nau_quotes'),...d,quoteNo:no,reqDate:nowISO().split('T')[0],createdAt:nowISO()}); DB.save('nau_quotes',all); },
    update: (id,d) => { const all = DB.load('nau_quotes'); const i = all.findIndex(q=>q.id===id); if(i>-1){all[i]={...all[i],...d};DB.save('nau_quotes',all);} },
    refresh: renderQuotes
  },
  manufacturer: {
    label: 'Manufacturer',
    getData: id => getMFRs().find(m=>m.id===id),
    form: d => `
      <div class="form-row"><div class="form-group"><label>Name<span class="required">*</span></label><input class="form-control" id="mf-name" value="${d?d.name:''}" /></div>
      <div class="form-group"><label>Route (slug)</label><input class="form-control" id="mf-route" value="${d?d.route:''}" placeholder="auto-generated" /></div></div>
      <div class="form-row"><div class="form-group"><label>Position</label><input class="form-control" type="number" id="mf-pos" value="${d?d.position:''}" /></div>
      <div class="form-group"><label>Logo URL</label><input class="form-control" id="mf-logo" value="${d?d.logoUrl:''}" placeholder="https://..." /></div></div>
      <div class="form-row full"><div class="form-group"><label>Description</label><textarea class="form-control" id="mf-desc">${d?d.description:''}</textarea></div></div>`,
    collect: () => {
      const name = document.getElementById('mf-name').value.trim();
      if (!name) { toast('⚠️ Name is required'); return null; }
      return { name, route: document.getElementById('mf-route').value || slugify(name), position: Number(document.getElementById('mf-pos').value)||0, logoUrl: document.getElementById('mf-logo').value, description: document.getElementById('mf-desc').value };
    },
    create: d => { const all = getMFRs(); all.push({id:DB.nextId('nau_manufacturers'), ...d, updatedAt:nowISO()}); saveMFRs(all); },
    update: (id, d) => { const all = getMFRs(); const i = all.findIndex(m=>m.id===id); if(i>-1){all[i]={...all[i],...d,updatedAt:nowISO()};saveMFRs(all);} },
    refresh: renderManufacturers
  },
  model: {
    label: 'Model',
    getData: id => getModels().find(m=>m.id===id),
    form: d => `
      <div class="form-row"><div class="form-group"><label>Name<span class="required">*</span></label><input class="form-control" id="mdl-name" value="${d?d.name:''}" /></div>
      <div class="form-group"><label>Manufacturer<span class="required">*</span></label><select class="form-control" id="mdl-mfr">${getMFRs().map(m=>`<option value="${m.id}" ${d&&d.manufacturerId===m.id?'selected':''}>${m.name}</option>`).join('')}</select></div></div>
      <div class="form-row full"><div class="form-group"><label>Description</label><textarea class="form-control" id="mdl-desc">${d?d.description:''}</textarea></div></div>
      <div class="form-group"><label>Status</label><select class="form-control" id="mdl-status"><option value="1" ${d&&d.status?'selected':''}>Active</option><option value="0" ${d&&!d.status?'selected':''}>Inactive</option></select></div>`,
    collect: () => {
      const name = document.getElementById('mdl-name').value.trim();
      if (!name) { toast('⚠️ Name is required'); return null; }
      return { name, manufacturerId: Number(document.getElementById('mdl-mfr').value), description: document.getElementById('mdl-desc').value, status: document.getElementById('mdl-status').value==='1' };
    },
    create: d => { const all = getModels(); all.push({id:DB.nextId('nau_models'),...d,createdAt:nowISO(),updatedAt:nowISO()}); saveModels(all); },
    update: (id, d) => { const all = getModels(); const i = all.findIndex(m=>m.id===id); if(i>-1){all[i]={...all[i],...d,updatedAt:nowISO()};saveModels(all);} },
    refresh: renderModels
  },
  vehicle: {
    label: 'Vehicle',
    getData: id => getVehicles().find(v=>v.id===id),
    form: d => `
      <div class="form-row"><div class="form-group"><label>Manufacturer<span class="required">*</span></label><select class="form-control" id="v-mfr">${getMFRs().map(m=>`<option value="${m.id}" ${d&&d.manufacturerId===m.id?'selected':''}>${m.name}</option>`).join('')}</select></div>
      <div class="form-group"><label>Model Name<span class="required">*</span></label><input class="form-control" id="v-model" value="${d?d.model:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Make</label><input class="form-control" id="v-make" value="${d?d.make:''}" placeholder="e.g. Toyota" /></div>
      <div class="form-group"><label>Color</label><input class="form-control" id="v-color" value="${d?d.color:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Year<span class="required">*</span></label><input class="form-control" type="number" id="v-year" value="${d?d.year:new Date().getFullYear()}" /></div>
      <div class="form-group"><label>Chassis</label><input class="form-control" id="v-chassis" value="${d?d.chassis:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Engine (cc)</label><input class="form-control" id="v-engine" value="${d?d.engineCC:''}" /></div>
      <div class="form-group"><label>Mileage (km)</label><input class="form-control" id="v-mileage" value="${d?d.mileage:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Body Type</label><select class="form-control" id="v-body"><option>SUV</option><option>Sedan</option><option>Pickup / D-Cabin</option><option>Van</option><option>Wagon</option><option>Hatchback</option><option>Saloon</option></select></div>
      <div class="form-group"><label>Fuel Type</label><select class="form-control" id="v-fuel"><option>Diesel</option><option>Petrol</option><option>Hybrid</option><option>Electric</option><option>Petrol/Gasoline</option></select></div></div>
      <div class="form-row"><div class="form-group"><label>Transmission</label><select class="form-control" id="v-trans"><option>Automatic</option><option>Manual</option></select></div>
      <div class="form-group"><label>Steering</label><select class="form-control" id="v-steer"><option>RHD</option><option>LHD</option></select></div></div>
      <div class="form-row"><div class="form-group"><label>Price (USD)<span class="required">*</span></label><input class="form-control" type="number" id="v-price" value="${d?d.priceUSD:''}" /></div>
      <div class="form-group"><label>Price (UGX)</label><input class="form-control" type="number" id="v-ugx" value="${d?d.priceUGX:''}" placeholder="Auto from USD×3700" /></div></div>
      <div class="form-row"><div class="form-group"><label>Status</label><select class="form-control" id="v-status"><option value="Published" ${d&&d.status==='Published'?'selected':''}>Published</option><option value="Draft" ${!d||d.status==='Draft'?'selected':''}>Draft</option><option value="Sold" ${d&&d.status==='Sold'?'selected':''}>Sold</option></select></div>
      <div class="form-group"><label>Showroom</label><select class="form-control" id="v-showroom"><option>Nakawa, Kampala</option></select></div></div>
      <div class="form-row"><div class="form-group"><label>Badge</label><select class="form-control" id="v-badge"><option value="">None</option><option value="hot-deal" ${d&&d.badge==='hot-deal'?'selected':''}>🔥 Hot Deal</option><option value="new-arrival" ${d&&d.badge==='new-arrival'?'selected':''}>⭐ New Arrival</option><option value="price-drop" ${d&&d.badge==='price-drop'?'selected':''}>💰 Price Drop</option><option value="featured" ${d&&d.badge==='featured'?'selected':''}>🏆 Featured</option></select></div></div>
      <div class="form-row full"><div class="form-group"><label>Image URL</label><input class="form-control" id="v-img" value="${d?d.imageUrl:''}" placeholder="https://..." /></div></div>
      <div class="form-row full"><div class="form-group"><label>Description</label><textarea class="form-control" id="v-desc">${d?d.description:''}</textarea></div></div>
      <div class="form-row full"><div class="form-group"><label>YouTube Video URL</label><input class="form-control" type="text" id="v-video-url" value="${d?d.videoUrl||'':''}" placeholder="https://www.youtube.com/watch?v=..." /><small style="color:#888;">Optional — paste a YouTube link for a video tour of this vehicle.</small></div></div>
      <div class="form-row full"><div class="form-group"><label style="font-weight:700;font-size:.92rem;margin-bottom:.5rem;display:block">📎 Documents</label>
        <div class="form-row"><div class="form-group"><label>Auction Sheet URL</label><input class="form-control" id="v-doc-auction" value="${d&&d.documents?d.documents.auctionSheet||'':''}" placeholder="https://..." /></div>
        <div class="form-group"><label>Inspection Report URL</label><input class="form-control" id="v-doc-inspect" value="${d&&d.documents?d.documents.inspectionReport||'':''}" placeholder="https://..." /></div></div>
        <div class="form-row"><div class="form-group"><label>Import Declaration URL</label><input class="form-control" id="v-doc-import" value="${d&&d.documents?d.documents.importDecl||'':''}" placeholder="https://..." /></div>
        <div class="form-group"><label>Logbook URL</label><input class="form-control" id="v-doc-logbook" value="${d&&d.documents?d.documents.logbook||'':''}" placeholder="https://..." /></div></div>
      </div></div>
      <div class="form-row full"><div class="form-group"><label style="font-weight:700;font-size:.92rem;margin-bottom:.75rem;display:block">🚢 Import Journey</label>
        <div style="display:flex;flex-direction:column;gap:.75rem">
          ${(()=>{const stages=['Auctioned in Japan','Shipped','Mombasa Port','Uganda Clearing','In Showroom','Sold'];return stages.map((stage,i)=>{const sKey='stage_'+i;const jrn=d&&d.journey?d.journey[i]:null;return `<div style="display:grid;grid-template-columns:1.5rem 140px 140px 1fr;gap:.5rem;align-items:center"><input type="checkbox" id="v-j-done-${i}" ${jrn&&jrn.completed?'checked':''}><label style="font-size:.82rem;margin:0">${stage}</label><input type="date" class="form-control" id="v-j-date-${i}" value="${jrn&&jrn.date?jrn.date:''}" style="font-size:.78rem;padding:.3rem .5rem"><input class="form-control" id="v-j-notes-${i}" placeholder="Notes" value="${jrn&&jrn.notes?jrn.notes:''}" style="font-size:.78rem;padding:.3rem .5rem" /></div>`;}).join('');})()}
        </div>
      </div></div>`,
    collect: () => {
      const model = document.getElementById('v-model').value.trim();
      const year = document.getElementById('v-year').value;
      const price = document.getElementById('v-price').value;
      if (!model || !year || !price) { toast('⚠️ Model, Year and Price are required'); return null; }
      const usd = Number(price);
      const journeyStages = ['Auctioned in Japan','Shipped','Mombasa Port','Uganda Clearing','In Showroom','Sold'];
      const journey = journeyStages.map((stage,i) => ({
        stage,
        completed: (document.getElementById('v-j-done-'+i)||{}).checked || false,
        date: (document.getElementById('v-j-date-'+i)||{}).value || '',
        notes: (document.getElementById('v-j-notes-'+i)||{}).value || ''
      }));
      const documents = {
        auctionSheet: (document.getElementById('v-doc-auction')||{}).value || '',
        inspectionReport: (document.getElementById('v-doc-inspect')||{}).value || '',
        importDecl: (document.getElementById('v-doc-import')||{}).value || '',
        logbook: (document.getElementById('v-doc-logbook')||{}).value || ''
      };
      return { manufacturerId: Number(document.getElementById('v-mfr').value), make: document.getElementById('v-make').value || getMFRName(Number(document.getElementById('v-mfr').value)), model, color: document.getElementById('v-color').value, year: Number(year), chassis: document.getElementById('v-chassis').value, engineCC: document.getElementById('v-engine').value, mileage: document.getElementById('v-mileage').value, bodyType: document.getElementById('v-body').value, fuelType: document.getElementById('v-fuel').value, transmission: document.getElementById('v-trans').value, steering: document.getElementById('v-steer').value, priceUSD: usd, priceUGX: document.getElementById('v-ugx').value || usd*3700, status: document.getElementById('v-status').value, showroom: document.getElementById('v-showroom').value, imageUrl: document.getElementById('v-img').value, description: document.getElementById('v-desc').value, videoUrl: (document.getElementById('v-video-url')||{}).value || '', badge: (document.getElementById('v-badge')||{}).value || '', documents, journey };
    },
    create: d => { const all = getVehicles(); all.push({id:DB.nextId('nau_vehicles'), sku:genSKU(), ...d, createdAt:nowISO()}); saveVehicles(all); },
    update: (id, d) => { const all = getVehicles(); const i = all.findIndex(v=>v.id===id); if(i>-1){all[i]={...all[i],...d};saveVehicles(all);} },
    refresh: renderVehicles
  },
  variable: {
    label: 'Variable',
    getData: id => DB.load(currentVarKey).find(v=>v.id===id),
    form: d => `
      <div class="form-row"><div class="form-group"><label>Name<span class="required">*</span></label><input class="form-control" id="var-name" value="${d?d.name:''}" /></div>
      <div class="form-group"><label>Route</label><input class="form-control" id="var-route" value="${d?d.route:''}" placeholder="auto-generated" /></div></div>
      <div class="form-group"><label>Status</label><label class="toggle-switch" style="margin-top:.4rem"><input type="checkbox" id="var-status" ${d&&d.status?'checked':''}><span class="toggle-slider"></span></label></div>`,
    collect: () => {
      const name = document.getElementById('var-name').value.trim();
      if (!name) { toast('⚠️ Name is required'); return null; }
      return { name, route: document.getElementById('var-route').value || slugify(name), status: document.getElementById('var-status').checked };
    },
    create: d => { const all = DB.load(currentVarKey); all.push({id:DB.nextId(currentVarKey),...d,createdAt:nowISO(),updatedAt:nowISO()}); DB.save(currentVarKey,all); },
    update: (id, d) => { const all = DB.load(currentVarKey); const i = all.findIndex(v=>v.id===id); if(i>-1){all[i]={...all[i],...d,updatedAt:nowISO()};DB.save(currentVarKey,all);} },
    refresh: renderVariables
  },
  modelCode: {
    label: 'Model Code',
    getData: id => DB.load('nau_model_codes').find(c=>c.id===id),
    form: d => {
      const mfrs = getMFRs();
      const models = getModels();
      const selMfrId = d ? d.mfrId : (mfrs[0] ? mfrs[0].id : '');
      const filteredModels = models.filter(m => m.manufacturerId === Number(selMfrId));
      return `
      <div class="form-row">
        <div class="form-group">
          <label>Code <span class="required">*</span></label>
          <input class="form-control" id="mc-code" value="${d?d.code:''}" placeholder="e.g. GDJ150" style="font-family:monospace;font-weight:700" />
        </div>
        <div class="form-group">
          <label>Manufacturer</label>
          <select class="form-control" id="mc-mfr" onchange="onMCMfrChange()">
            ${mfrs.map(m=>`<option value="${m.id}" ${d && d.mfrId===m.id?'selected':''}>${m.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Model</label>
          <select class="form-control" id="mc-mdl">
            ${filteredModels.map(m=>`<option value="${m.id}" ${d && d.modelId===m.id?'selected':''}>${m.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Engine Code</label>
          <input class="form-control" id="mc-eng-code" value="${d?d.engineCode||'':''}" placeholder="e.g. 1GD-FTV" style="font-family:monospace" />
        </div>
        <div class="form-group">
          <label>Engine CC</label>
          <input class="form-control" type="number" id="mc-eng-cc" value="${d?d.engineCC||'':''}" placeholder="e.g. 2755" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Fuel Type</label>
          <select class="form-control" id="mc-fuel">
            ${['Diesel','Petrol','Hybrid','Electric','Other'].map(f=>`<option ${d&&d.fuelType===f?'selected':''}>${f}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Drivetrain</label>
          <select class="form-control" id="mc-drive">
            ${['4WD','2WD','AWD','RWD'].map(dr=>`<option ${d&&d.drivetrain===dr?'selected':''}>${dr}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Steering Position</label>
          <select class="form-control" id="mc-steer">
            ${['RHD','LHD'].map(s=>`<option ${d&&d.steeringPosition===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row full">
        <div class="form-group">
          <label>Description</label>
          <textarea class="form-control" id="mc-desc">${d?d.description||'':''}</textarea>
        </div>
      </div>`;
    },
    collect: () => {
      const code = document.getElementById('mc-code').value.trim();
      if (!code) { toast('⚠️ Code required'); return null; }
      return {
        code,
        mfrId: Number(document.getElementById('mc-mfr').value),
        modelId: Number(document.getElementById('mc-mdl').value),
        engineCode: document.getElementById('mc-eng-code').value.trim(),
        engineCC: Number(document.getElementById('mc-eng-cc').value) || null,
        fuelType: document.getElementById('mc-fuel').value,
        drivetrain: document.getElementById('mc-drive').value,
        steeringPosition: document.getElementById('mc-steer').value,
        description: document.getElementById('mc-desc').value
      };
    },
    create: d => { const all=DB.load('nau_model_codes'); all.push({id:DB.nextId('nau_model_codes'),...d,createdAt:nowISO()}); DB.save('nau_model_codes',all); },
    update: (id,d) => { const all=DB.load('nau_model_codes'); const i=all.findIndex(c=>c.id===id); if(i>-1){all[i]={...all[i],...d};DB.save('nau_model_codes',all);} },
    refresh: renderModelCodes
  },
  slide: {
    label: 'Slide',
    getData: id => DB.load('nau_slides').find(s=>s.id===id),
    form: d => `
      <div class="form-row full"><div class="form-group"><label>Title<span class="required">*</span></label><input class="form-control" id="sl-title" value="${d?d.title:''}" /></div></div>
      <div class="form-row full"><div class="form-group"><label>Subtitle</label><input class="form-control" id="sl-sub" value="${d?d.subtitle:''}" /></div></div>
      <div class="form-row full"><div class="form-group"><label>Image URL</label><input class="form-control" id="sl-img" value="${d?d.imageUrl:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>CTA Text</label><input class="form-control" id="sl-cta" value="${d?d.ctaText:'Browse Cars'}" /></div>
      <div class="form-group"><label>CTA Link</label><input class="form-control" id="sl-link" value="${d?d.ctaLink:'../inventory.html'}" /></div></div>
      <div class="form-group"><label>Sort Order</label><input class="form-control" type="number" id="sl-order" value="${d?d.sortOrder:0}" /></div>`,
    collect: () => { const title=document.getElementById('sl-title').value.trim(); if(!title){toast('⚠️ Title required');return null;} return {title,subtitle:document.getElementById('sl-sub').value,imageUrl:document.getElementById('sl-img').value,ctaText:document.getElementById('sl-cta').value,ctaLink:document.getElementById('sl-link').value,sortOrder:Number(document.getElementById('sl-order').value),status:true}; },
    create: d => { const all=DB.load('nau_slides'); all.push({id:DB.nextId('nau_slides'),...d,createdAt:nowISO()}); DB.save('nau_slides',all); },
    update: (id,d) => { const all=DB.load('nau_slides'); const i=all.findIndex(s=>s.id===id); if(i>-1){all[i]={...all[i],...d};DB.save('nau_slides',all);} },
    refresh: renderSlides
  },
  topicPage: {
    label:'Topic Page', getData:id=>DB.load('nau_topic_pages').find(t=>t.id===id),
    form:d=>`<div class="form-row full"><div class="form-group"><label>Title<span class="required">*</span></label><input class="form-control" id="tp-title" value="${d?d.title:''}" /></div></div>
      <div class="form-row full"><div class="form-group"><label>Slug</label><input class="form-control" id="tp-slug" value="${d?d.slug:''}" /></div></div>
      <div class="form-row full"><div class="form-group"><label>Content</label><textarea class="form-control" style="min-height:120px" id="tp-content">${d?d.content:''}</textarea></div></div>`,
    collect:()=>{const t=document.getElementById('tp-title').value.trim();if(!t){toast('⚠️ Title required');return null;}return{title:t,slug:document.getElementById('tp-slug').value||slugify(t),content:document.getElementById('tp-content').value,status:true};},
    create:d=>{const all=DB.load('nau_topic_pages');all.push({id:DB.nextId('nau_topic_pages'),...d,createdAt:nowISO()});DB.save('nau_topic_pages',all);},
    update:(id,d)=>{const all=DB.load('nau_topic_pages');const i=all.findIndex(t=>t.id===id);if(i>-1){all[i]={...all[i],...d};DB.save('nau_topic_pages',all);}},
    refresh:renderTopicPages
  },
  blog: {
    label:'Blog Post', getData:id=>DB.load('nau_blogs').find(b=>b.id===id),
    form:d=>`<div class="form-row full"><div class="form-group"><label>Title<span class="required">*</span></label><input class="form-control" id="bl-title" value="${d?d.title:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Author</label><input class="form-control" id="bl-author" value="${d?d.author:'Admin'}" /></div>
      <div class="form-group"><label>Category</label><input class="form-control" id="bl-cat" value="${d?d.category:''}" /></div></div>
      <div class="form-row full"><div class="form-group"><label>Content</label><textarea class="form-control" style="min-height:120px" id="bl-content">${d?d.content:''}</textarea></div></div>`,
    collect:()=>{const t=document.getElementById('bl-title').value.trim();if(!t){toast('⚠️ Title required');return null;}return{title:t,author:document.getElementById('bl-author').value,category:document.getElementById('bl-cat').value,content:document.getElementById('bl-content').value,status:true};},
    create:d=>{const all=DB.load('nau_blogs');all.push({id:DB.nextId('nau_blogs'),...d,createdAt:nowISO()});DB.save('nau_blogs',all);},
    update:(id,d)=>{const all=DB.load('nau_blogs');const i=all.findIndex(b=>b.id===id);if(i>-1){all[i]={...all[i],...d};DB.save('nau_blogs',all);}},
    refresh:renderBlogs
  },
  faq: {
    label:'FAQ', getData:id=>DB.load('nau_faqs').find(f=>f.id===id),
    form:d=>`<div class="form-row full"><div class="form-group"><label>Question<span class="required">*</span></label><input class="form-control" id="fq-q" value="${d?d.question:''}" /></div></div>
      <div class="form-row full"><div class="form-group"><label>Answer</label><textarea class="form-control" id="fq-a">${d?d.answer:''}</textarea></div></div>
      <div class="form-group"><label>Category</label><input class="form-control" id="fq-cat" value="${d?d.category:''}" /></div>`,
    collect:()=>{const q=document.getElementById('fq-q').value.trim();if(!q){toast('⚠️ Question required');return null;}return{question:q,answer:document.getElementById('fq-a').value,category:document.getElementById('fq-cat').value,status:true};},
    create:d=>{const all=DB.load('nau_faqs');all.push({id:DB.nextId('nau_faqs'),...d,createdAt:nowISO()});DB.save('nau_faqs',all);},
    update:(id,d)=>{const all=DB.load('nau_faqs');const i=all.findIndex(f=>f.id===id);if(i>-1){all[i]={...all[i],...d};DB.save('nau_faqs',all);}},
    refresh:renderFAQs
  },
  freight: {
    label:'Freight Rate', getData:id=>DB.load('nau_freights').find(f=>f.id===id),
    form:d=>`<div class="form-row"><div class="form-group"><label>Region<span class="required">*</span></label><input class="form-control" id="fr-region" value="${d?d.region:''}" /></div>
      <div class="form-group"><label>Method</label><select class="form-control" id="fr-method"><option>RORO</option><option>Container 20ft</option><option>Container 40ft</option></select></div></div>
      <div class="form-row"><div class="form-group"><label>Est. Cost (USD)</label><input class="form-control" id="fr-cost" value="${d?d.cost:''}" /></div>
      <div class="form-group"><label>Transit Days</label><input class="form-control" id="fr-days" value="${d?d.days:''}" /></div></div>
      <div class="form-row full"><div class="form-group"><label>Notes</label><input class="form-control" id="fr-notes" value="${d?d.notes:''}" /></div></div>`,
    collect:()=>{const r=document.getElementById('fr-region').value.trim();if(!r){toast('⚠️ Region required');return null;}return{region:r,method:document.getElementById('fr-method').value,cost:document.getElementById('fr-cost').value,days:document.getElementById('fr-days').value,notes:document.getElementById('fr-notes').value};},
    create:d=>{const all=DB.load('nau_freights');all.push({id:DB.nextId('nau_freights'),...d});DB.save('nau_freights',all);},
    update:(id,d)=>{const all=DB.load('nau_freights');const i=all.findIndex(f=>f.id===id);if(i>-1){all[i]={...all[i],...d};DB.save('nau_freights',all);}},
    refresh:()=>renderFreights()
  },
  promo: {
    label:'Promotion', getData:id=>DB.load('nau_promos').find(p=>p.id===id),
    form:d=>`<div class="form-row full"><div class="form-group"><label>Title<span class="required">*</span></label><input class="form-control" id="pr-title" value="${d?d.title:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Discount (%)</label><input class="form-control" type="number" id="pr-disc" value="${d?d.discount:''}" /></div>
      <div class="form-group"><label>Status</label><select class="form-control" id="pr-status"><option value="1" ${d&&d.status?'selected':''}>Active</option><option value="0" ${d&&!d.status?'selected':''}>Inactive</option></select></div></div>
      <div class="form-row"><div class="form-group"><label>Start Date</label><input class="form-control" type="date" id="pr-start" value="${d?d.startDate:''}" /></div>
      <div class="form-group"><label>End Date</label><input class="form-control" type="date" id="pr-end" value="${d?d.endDate:''}" /></div></div>`,
    collect:()=>{const t=document.getElementById('pr-title').value.trim();if(!t){toast('⚠️ Title required');return null;}return{title:t,discount:document.getElementById('pr-disc').value,startDate:document.getElementById('pr-start').value,endDate:document.getElementById('pr-end').value,status:document.getElementById('pr-status').value==='1'};},
    create:d=>{const all=DB.load('nau_promos');all.push({id:DB.nextId('nau_promos'),...d,createdAt:nowISO()});DB.save('nau_promos',all);},
    update:(id,d)=>{const all=DB.load('nau_promos');const i=all.findIndex(p=>p.id===id);if(i>-1){all[i]={...all[i],...d};DB.save('nau_promos',all);}},
    refresh:renderPromos
  },
  order: {
    label:'Order', getData:id=>DB.load('nau_orders').find(o=>o.id===id),
    form:d=>`<div class="form-row"><div class="form-group"><label>Customer Name<span class="required">*</span></label><input class="form-control" id="od-cust" value="${d?d.customerName:''}" /></div>
      <div class="form-group"><label>Vehicle</label><input class="form-control" id="od-veh" value="${d?d.vehicleName:''}" placeholder="e.g. Toyota Hilux 2025" /></div></div>
      <div class="form-row"><div class="form-group"><label>Amount (USD)<span class="required">*</span></label><input class="form-control" type="number" id="od-amt" value="${d?d.amount:''}" /></div>
      <div class="form-group"><label>Date</label><input class="form-control" type="date" id="od-date" value="${d?d.date:new Date().toISOString().split('T')[0]}" /></div></div>
      <div class="form-group"><label>Status</label><select class="form-control" id="od-status"><option>Pending</option><option>Confirmed</option><option>Shipped</option><option>Completed</option></select></div>`,
    collect:()=>{const c=document.getElementById('od-cust').value.trim();const a=document.getElementById('od-amt').value;if(!c||!a){toast('⚠️ Customer and Amount required');return null;}const all=DB.load('nau_orders');const num=all.length+1;return{orderNo:'ORD-2026-'+String(num).padStart(2,'0'),customerName:c,vehicleName:document.getElementById('od-veh').value,amount:Number(a),date:document.getElementById('od-date').value,status:document.getElementById('od-status').value};},
    create:d=>{const all=DB.load('nau_orders');all.push({id:DB.nextId('nau_orders'),...d,createdAt:nowISO()});DB.save('nau_orders',all);},
    update:(id,d)=>{const all=DB.load('nau_orders');const i=all.findIndex(o=>o.id===id);if(i>-1){all[i]={...all[i],...d};DB.save('nau_orders',all);}},
    refresh:renderOrders
  },
  review: {
    label:'Review', getData:id=>DB.load('nau_reviews').find(r=>r.id===id),
    form:d=>`<div class="form-row"><div class="form-group"><label>Customer Name<span class="required">*</span></label><input class="form-control" id="rv-cust" value="${d?d.customer:''}" /></div>
      <div class="form-group"><label>Vehicle</label><input class="form-control" id="rv-veh" value="${d?d.vehicle:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Rating</label><select class="form-control" id="rv-rate"><option value="5" ${!d||d.rating==5?'selected':''}>★★★★★ (5)</option><option value="4" ${d&&d.rating==4?'selected':''}>★★★★☆ (4)</option><option value="3" ${d&&d.rating==3?'selected':''}>★★★☆☆ (3)</option><option value="2" ${d&&d.rating==2?'selected':''}>★★☆☆☆ (2)</option><option value="1" ${d&&d.rating==1?'selected':''}>★☆☆☆☆ (1)</option></select></div>
      <div class="form-group"><label>Status</label><select class="form-control" id="rv-status"><option value="1" ${d&&d.approved?'selected':''}>Approved</option><option value="0" ${d&&!d.approved?'selected':''}>Pending</option></select></div></div>
      <div class="form-row full"><div class="form-group"><label>Review Text</label><textarea class="form-control" id="rv-text">${d?d.text:''}</textarea></div></div>`,
    collect:()=>{const c=document.getElementById('rv-cust').value.trim();if(!c){toast('⚠️ Customer name required');return null;}return{customer:c,vehicle:document.getElementById('rv-veh').value,rating:Number(document.getElementById('rv-rate').value),text:document.getElementById('rv-text').value,approved:document.getElementById('rv-status').value==='1',date:new Date().toISOString()};},
    create:d=>{const all=DB.load('nau_reviews');all.push({id:DB.nextId('nau_reviews'),...d,createdAt:nowISO()});DB.save('nau_reviews',all);},
    update:(id,d)=>{const all=DB.load('nau_reviews');const i=all.findIndex(r=>r.id===id);if(i>-1){all[i]={...all[i],...d};DB.save('nau_reviews',all);}},
    refresh:renderReviews
  },
  servicePlan: {
    label:'Service Plan', getData:id=>DB.load('nau_service_plans').find(p=>p.id===id),
    form:d=>`<div class="form-row"><div class="form-group"><label>Plan Name<span class="required">*</span></label><input class="form-control" id="sp-name" value="${d?d.name:''}" /></div>
      <div class="form-group"><label>Price (USD/mo)<span class="required">*</span></label><input class="form-control" type="number" id="sp-price" value="${d?d.price:''}" /></div></div>
      <div class="form-group"><label>Duration (months)</label><input class="form-control" type="number" id="sp-dur" value="${d?d.duration:12}" /></div>
      <div class="form-row full"><div class="form-group"><label>Features (one per line)</label><textarea class="form-control" style="min-height:100px" id="sp-feat">${d?Array.isArray(d.features)?d.features.join('\n'):(d.features||''):''}</textarea></div></div>`,
    collect:()=>{const n=document.getElementById('sp-name').value.trim();const p=document.getElementById('sp-price').value;if(!n||!p){toast('⚠️ Name and price required');return null;}return{name:n,price:Number(p),duration:Number(document.getElementById('sp-dur').value)||12,features:document.getElementById('sp-feat').value.split('\n').map(s=>s.trim()).filter(Boolean)};},
    create:d=>{const all=DB.load('nau_service_plans');all.push({id:DB.nextId('nau_service_plans'),...d,createdAt:nowISO()});DB.save('nau_service_plans',all);},
    update:(id,d)=>{const all=DB.load('nau_service_plans');const i=all.findIndex(p=>p.id===id);if(i>-1){all[i]={...all[i],...d};DB.save('nau_service_plans',all);}},
    refresh:renderServicePlans
  },
  auction: {
    label:'Auction', getData:id=>DB.load('nau_auctions').find(a=>a.id===id),
    form:d=>`<div class="form-row full"><div class="form-group"><label>Vehicle<span class="required">*</span></label><input class="form-control" id="au-veh" value="${d?d.vehicle:''}" placeholder="e.g. Toyota Land Cruiser Prado 2022" /></div></div>
      <div class="form-row"><div class="form-group"><label>Start Date</label><input class="form-control" type="date" id="au-start" value="${d?d.startDate:''}" /></div>
      <div class="form-group"><label>End Date</label><input class="form-control" type="date" id="au-end" value="${d?d.endDate:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Starting Bid (USD)<span class="required">*</span></label><input class="form-control" type="number" id="au-bid" value="${d?d.startingBid:''}" /></div>
      <div class="form-group"><label>Status</label><select class="form-control" id="au-status"><option>Upcoming</option><option>Active</option><option>Ended</option></select></div></div>`,
    collect:()=>{const v=document.getElementById('au-veh').value.trim();const b=document.getElementById('au-bid').value;if(!v||!b){toast('⚠️ Vehicle and Starting Bid required');return null;}return{vehicle:v,startDate:document.getElementById('au-start').value,endDate:document.getElementById('au-end').value,startingBid:Number(b),currentBid:Number(b),status:document.getElementById('au-status').value};},
    create:d=>{const all=DB.load('nau_auctions');all.push({id:DB.nextId('nau_auctions'),...d,createdAt:nowISO()});DB.save('nau_auctions',all);},
    update:(id,d)=>{const all=DB.load('nau_auctions');const i=all.findIndex(a=>a.id===id);if(i>-1){all[i]={...all[i],...d};DB.save('nau_auctions',all);}},
    refresh:renderAuctions
  },
  job: {
    label:'Job Listing', getData:id=>DB.load('nau_careers').find(j=>j.id===id),
    form:d=>`<div class="form-row"><div class="form-group"><label>Job Title<span class="required">*</span></label><input class="form-control" id="jb-title" value="${d?d.title:''}" /></div>
      <div class="form-group"><label>Department</label><input class="form-control" id="jb-dept" value="${d?d.department:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Location</label><input class="form-control" id="jb-loc" value="${d?d.location:'Kampala, Uganda'}" /></div>
      <div class="form-group"><label>Type</label><select class="form-control" id="jb-type"><option>Full-time</option><option>Part-time</option><option>Contract</option></select></div></div>
      <div class="form-row full"><div class="form-group"><label>Description</label><textarea class="form-control" id="jb-desc">${d?d.description:''}</textarea></div></div>
      <div class="form-group"><label>Status</label><select class="form-control" id="jb-status"><option value="Open" ${!d||d.status==='Open'?'selected':''}>Open</option><option value="Closed" ${d&&d.status==='Closed'?'selected':''}>Closed</option></select></div>`,
    collect:()=>{const t=document.getElementById('jb-title').value.trim();if(!t){toast('⚠️ Job title required');return null;}return{title:t,department:document.getElementById('jb-dept').value,location:document.getElementById('jb-loc').value,type:document.getElementById('jb-type').value,description:document.getElementById('jb-desc').value,status:document.getElementById('jb-status').value,applications:0,postedAt:nowISO()};},
    create:d=>{const all=DB.load('nau_careers');all.push({id:DB.nextId('nau_careers'),...d});DB.save('nau_careers',all);},
    update:(id,d)=>{const all=DB.load('nau_careers');const i=all.findIndex(j=>j.id===id);if(i>-1){all[i]={...all[i],...d};DB.save('nau_careers',all);}},
    refresh:renderCareers
  },
  subscriber: {
    label:'Subscriber', getData:id=>DB.load('nau_newsletter').find(n=>n.id===id),
    form:d=>`<div class="form-row"><div class="form-group"><label>Name</label><input class="form-control" id="nl-name" value="${d?d.name:''}" /></div>
      <div class="form-group"><label>Email<span class="required">*</span></label><input class="form-control" id="nl-email" value="${d?d.email:''}" /></div></div>
      <div class="form-group"><label>Status</label><select class="form-control" id="nl-status"><option value="1" ${!d||d.status?'selected':''}>Subscribed</option><option value="0" ${d&&!d.status?'selected':''}>Unsubscribed</option></select></div>`,
    collect:()=>{const e=document.getElementById('nl-email').value.trim();if(!e){toast('⚠️ Email required');return null;}return{name:document.getElementById('nl-name').value,email:e,status:document.getElementById('nl-status').value==='1',subscribedAt:nowISO()};},
    create:d=>{const all=DB.load('nau_newsletter');all.push({id:DB.nextId('nau_newsletter'),...d});DB.save('nau_newsletter',all);},
    update:(id,d)=>{const all=DB.load('nau_newsletter');const i=all.findIndex(n=>n.id===id);if(i>-1){all[i]={...all[i],...d};DB.save('nau_newsletter',all);}},
    refresh:renderNewsletter
  },
  campaign: {
    label:'Campaign', getData:id=>DB.load('nau_campaigns').find(c=>c.id===id),
    form:d=>`<div class="form-row full"><div class="form-group"><label>Campaign Name<span class="required">*</span></label><input class="form-control" id="ca-name" value="${d?d.name:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Channel</label><select class="form-control" id="ca-chan"><option>Email</option><option>SMS</option><option>Social Media</option></select></div>
      <div class="form-group"><label>Scheduled Date</label><input class="form-control" type="date" id="ca-date" value="${d?d.scheduledDate:''}" /></div></div>
      <div class="form-group"><label>Target Audience</label><input class="form-control" id="ca-target" value="${d?d.target:''}" placeholder="e.g. All subscribers, Kampala region" /></div>
      <div class="form-group"><label>Status</label><select class="form-control" id="ca-status"><option>Draft</option><option>Active</option><option>Sent</option></select></div>`,
    collect:()=>{const n=document.getElementById('ca-name').value.trim();if(!n){toast('⚠️ Campaign name required');return null;}return{name:n,channel:document.getElementById('ca-chan').value,scheduledDate:document.getElementById('ca-date').value,target:document.getElementById('ca-target').value,status:document.getElementById('ca-status').value};},
    create:d=>{const all=DB.load('nau_campaigns');all.push({id:DB.nextId('nau_campaigns'),...d,createdAt:nowISO()});DB.save('nau_campaigns',all);},
    update:(id,d)=>{const all=DB.load('nau_campaigns');const i=all.findIndex(c=>c.id===id);if(i>-1){all[i]={...all[i],...d};DB.save('nau_campaigns',all);}},
    refresh:renderCampaigns
  },
  ticket: {
    label:'Support Ticket', getData:id=>DB.load('nau_support').find(s=>s.id===id),
    form:d=>`<div class="form-row"><div class="form-group"><label>Customer Name<span class="required">*</span></label><input class="form-control" id="tk-cust" value="${d?d.customer||d.customerName:''}" /></div>
      <div class="form-group"><label>Email</label><input class="form-control" id="tk-email" value="${d?d.email:''}" /></div></div>
      <div class="form-row full"><div class="form-group"><label>Subject<span class="required">*</span></label><input class="form-control" id="tk-subj" value="${d?d.subject:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Priority</label><select class="form-control" id="tk-pri"><option>Low</option><option>Medium</option><option>High</option></select></div>
      <div class="form-group"><label>Status</label><select class="form-control" id="tk-status"><option>Open</option><option>In Progress</option><option>Resolved</option></select></div></div>
      <div class="form-row full"><div class="form-group"><label>Message</label><textarea class="form-control" id="tk-msg">${d?d.message:''}</textarea></div></div>`,
    collect:()=>{const c=document.getElementById('tk-cust').value.trim();const s=document.getElementById('tk-subj').value.trim();if(!c||!s){toast('⚠️ Customer and Subject required');return null;}return{customer:c,email:document.getElementById('tk-email').value,subject:s,priority:document.getElementById('tk-pri').value,status:document.getElementById('tk-status').value,message:document.getElementById('tk-msg').value,date:nowISO()};},
    create:d=>{const all=DB.load('nau_support');all.push({id:DB.nextId('nau_support'),...d,createdAt:nowISO()});DB.save('nau_support',all);},
    update:(id,d)=>{const all=DB.load('nau_support');const i=all.findIndex(s=>s.id===id);if(i>-1){all[i]={...all[i],...d};DB.save('nau_support',all);}},
    refresh:renderSupport
  },
  user: {
    label:'Admin User', getData:id=>DB.load('nau_users').find(u=>u.id===id),
    form:d=>`<div class="form-row"><div class="form-group"><label>Full Name<span class="required">*</span></label><input class="form-control" id="us-name" value="${d?d.name:''}" /></div>
      <div class="form-group"><label>Email<span class="required">*</span></label><input class="form-control" id="us-email" value="${d?d.email:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Role</label><select class="form-control" id="us-role"><option value="Super Admin" ${d&&d.role==='Super Admin'?'selected':''}>Super Admin</option><option value="Manager" ${d&&d.role==='Manager'?'selected':''}>Manager</option><option value="Staff" ${!d||d.role==='Staff'?'selected':''}>Staff</option></select></div>
      <div class="form-group"><label>Status</label><select class="form-control" id="us-status"><option value="1" ${!d||d.status?'selected':''}>Active</option><option value="0" ${d&&!d.status?'selected':''}>Inactive</option></select></div></div>
      <div class="form-row full"><div class="form-group"><label>Password${d?' (leave blank to keep)':''}</label><input class="form-control" type="password" id="us-pass" placeholder="${d?'Leave blank to keep current':'Set password'}" /></div></div>`,
    collect:()=>{const n=document.getElementById('us-name').value.trim();const e=document.getElementById('us-email').value.trim();if(!n||!e){toast('⚠️ Name and Email required');return null;}const p=document.getElementById('us-pass').value;const obj={name:n,email:e,role:document.getElementById('us-role').value,status:document.getElementById('us-status').value==='1',lastLogin:nowISO()};if(p)obj.password=p;return obj;},
    create:d=>{const all=DB.load('nau_users');all.push({id:DB.nextId('nau_users'),...d,createdAt:nowISO()});DB.save('nau_users',all);},
    update:(id,d)=>{const all=DB.load('nau_users');const i=all.findIndex(u=>u.id===id);if(i>-1){all[i]={...all[i],...d};DB.save('nau_users',all);}},
    refresh:renderUsers
  },
  invoice: {
    label: 'Invoice',
    getData: id => DB.load('nau_invoices').find(i => i.id === id),
    form: d => {
      const vehs = DB.load('nau_vehicles').filter(v => v.status === 'Published' || (d && d.vehicleId === v.id));
      return `
      <div class="form-row full"><div class="form-group"><label>Vehicle<span class="required">*</span></label>
        <select class="form-control" id="inv-veh" onchange="(function(){const v=document.querySelector('#inv-veh option:checked');const p=v?v.dataset.price:'';if(p)document.getElementById('inv-sale-price').value=p;})()">
          <option value="">-- Select Vehicle --</option>
          ${vehs.map(v=>`<option value="${v.id}" data-price="${v.priceUSD}" ${d&&d.vehicleId===v.id?'selected':''}>${v.make} ${v.model} ${v.year} — $${Number(v.priceUSD||0).toLocaleString()}</option>`).join('')}
        </select></div></div>
      <div class="form-row"><div class="form-group"><label>Customer Name<span class="required">*</span></label><input class="form-control" id="inv-cust-name" value="${d?d.customerName:''}" /></div>
        <div class="form-group"><label>Customer Email</label><input class="form-control" id="inv-cust-email" value="${d?d.customerEmail:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Customer Phone</label><input class="form-control" id="inv-cust-phone" value="${d?d.customerPhone:''}" /></div>
        <div class="form-group"><label>Due Date</label><input class="form-control" type="date" id="inv-due" value="${d?d.dueDate:''}" /></div></div>
      <div class="form-row full"><div class="form-group"><label>Customer Address</label><textarea class="form-control" id="inv-cust-addr" rows="2">${d?d.customerAddress:''}</textarea></div></div>
      <div class="form-row"><div class="form-group"><label>Sale Price (USD)<span class="required">*</span></label><input class="form-control" type="number" id="inv-sale-price" value="${d?d.salePrice:''}" step="0.01" min="0" /></div>
        <div class="form-group"><label>Discount (USD)</label><input class="form-control" type="number" id="inv-discount" value="${d?d.discount:0}" step="0.01" min="0" /></div></div>
      <div class="form-row"><div class="form-group"><label>Include Tax (18% VAT)</label><br/><label class="toggle-switch" style="margin-top:.4rem"><input type="checkbox" id="inv-tax" ${d&&d.taxRate?'checked':''}><span class="toggle-slider"></span></label></div>
        <div class="form-group"><label>Payment Account</label><select class="form-control" id="inv-pay-method">
          ${accountOptions(d&&d.paymentMethod)}
        </select></div></div>
      <div class="form-group"><label>Status</label><select class="form-control" id="inv-status">
        <option value="Draft" ${!d||d.status==='Draft'?'selected':''}>Draft</option>
        <option value="Sent" ${d&&d.status==='Sent'?'selected':''}>Sent</option>
      </select></div>
      <div class="form-row full"><div class="form-group"><label>Notes</label><textarea class="form-control" id="inv-notes" rows="2">${d?d.notes:''}</textarea></div></div>`;
    },
    collect: () => {
      const vehicleId = Number(document.getElementById('inv-veh').value);
      const customerName = document.getElementById('inv-cust-name').value.trim();
      const salePrice = parseFloat(document.getElementById('inv-sale-price').value) || 0;
      if (!vehicleId) { toast('⚠️ Vehicle is required'); return null; }
      if (!customerName) { toast('⚠️ Customer Name is required'); return null; }
      if (!salePrice) { toast('⚠️ Sale Price is required'); return null; }
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
        currency: 'USD', paymentMethod: document.getElementById('inv-pay-method').value,
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
    getData: id => DB.load('nau_bills').find(b => b.id === id),
    form: d => {
      const vehs = DB.load('nau_vehicles');
      return `
      <div class="form-row"><div class="form-group"><label>Vendor / Supplier<span class="required">*</span></label><input class="form-control" id="bill-vendor" value="${d?d.vendor:''}" /></div>
        <div class="form-group"><label>Category<span class="required">*</span></label><select class="form-control" id="bill-category">
          ${['Vehicle Purchase','Freight','Insurance','Maintenance','Salaries','Utilities','Office Supplies','Other'].map(c=>`<option ${d&&d.category===c?'selected':''}>${c}</option>`).join('')}
        </select></div></div>
      <div class="form-row full"><div class="form-group"><label>Related Vehicle (optional)</label>
        <select class="form-control" id="bill-veh-id">
          <option value="">-- None --</option>
          ${vehs.map(v=>`<option value="${v.id}" ${d&&d.vehicleId===v.id?'selected':''}>${v.make} ${v.model} ${v.year}</option>`).join('')}
        </select></div></div>
      <div class="form-row full"><div class="form-group"><label>Description</label><textarea class="form-control" id="bill-desc" rows="2">${d?d.description:''}</textarea></div></div>
      <div class="form-row"><div class="form-group"><label>Amount (USD)<span class="required">*</span></label><input class="form-control" type="number" id="bill-amount" value="${d?d.amount:''}" step="0.01" min="0" /></div>
        <div class="form-group"><label>Due Date</label><input class="form-control" type="date" id="bill-due" value="${d?d.dueDate:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Status</label><select class="form-control" id="bill-status-sel">
          <option value="Pending" ${!d||d.status==='Pending'?'selected':''}>Pending</option>
          <option value="Paid" ${d&&d.status==='Paid'?'selected':''}>Paid</option>
        </select></div>
        <div class="form-group"><label>Payment Account</label><select class="form-control" id="bill-pay-method">
          ${accountOptions(d&&d.paymentMethod)}
        </select></div></div>
      <div class="form-row full"><div class="form-group"><label>Notes</label><textarea class="form-control" id="bill-notes" rows="2">${d?d.notes:''}</textarea></div></div>`;
    },
    collect: () => {
      const vendor = document.getElementById('bill-vendor').value.trim();
      const amount = parseFloat(document.getElementById('bill-amount').value) || 0;
      if (!vendor) { toast('⚠️ Vendor is required'); return null; }
      if (!amount) { toast('⚠️ Amount is required'); return null; }
      const vehId = Number(document.getElementById('bill-veh-id').value) || null;
      const vehs = DB.load('nau_vehicles');
      const veh = vehId ? vehs.find(v => v.id === vehId) : null;
      return {
        vendor, category: document.getElementById('bill-category').value,
        vehicleId: vehId, vehicleName: veh ? `${veh.make} ${veh.model} ${veh.year}` : null,
        description: document.getElementById('bill-desc').value,
        amount, currency: 'USD', dueDate: document.getElementById('bill-due').value,
        status: document.getElementById('bill-status-sel').value,
        paymentMethod: document.getElementById('bill-pay-method').value,
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

  appointment: {
    label: 'Appointment',
    getData: id => DB.load('nau_appointments').find(a => a.id === id),
    form: d => `
      <div class="form-row"><div class="form-group"><label>Customer Name<span class="required">*</span></label><input class="form-control" id="ap-name" value="${d?d.customerName:''}" /></div>
      <div class="form-group"><label>Phone</label><input class="form-control" id="ap-phone" value="${d?d.customerPhone:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Email</label><input class="form-control" id="ap-email" value="${d?d.customerEmail:''}" /></div>
      <div class="form-group"><label>Vehicle Interest</label><input class="form-control" id="ap-veh" value="${d?d.vehicleName:''}" placeholder="e.g. Toyota Land Cruiser Prado 2022" /></div></div>
      <div class="form-row"><div class="form-group"><label>Date<span class="required">*</span></label><input class="form-control" type="date" id="ap-date" value="${d?d.date:''}" /></div>
      <div class="form-group"><label>Time</label><select class="form-control" id="ap-time">
        ${['9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM'].map(t=>`<option ${d&&d.time===t?'selected':''}>${t}</option>`).join('')}
      </select></div></div>
      <div class="form-row"><div class="form-group"><label>Type</label><select class="form-control" id="ap-type">
        ${['Test Drive','Viewing','Collection'].map(t=>`<option ${d&&d.type===t?'selected':''}>${t}</option>`).join('')}
      </select></div>
      <div class="form-group"><label>Status</label><select class="form-control" id="ap-status">
        ${['Pending','Confirmed','Completed','Cancelled'].map(s=>`<option ${d&&d.status===s?'selected':''}>${s}</option>`).join('')}
      </select></div></div>
      <div class="form-row full"><div class="form-group"><label>Notes</label><textarea class="form-control" id="ap-notes">${d?d.notes:''}</textarea></div></div>`,
    collect: () => {
      const name = document.getElementById('ap-name').value.trim();
      const date = document.getElementById('ap-date').value;
      if (!name || !date) { toast('⚠️ Customer Name and Date are required'); return null; }
      return { customerName: name, customerPhone: document.getElementById('ap-phone').value, customerEmail: document.getElementById('ap-email').value, vehicleName: document.getElementById('ap-veh').value, date, time: document.getElementById('ap-time').value, type: document.getElementById('ap-type').value, status: document.getElementById('ap-status').value, notes: document.getElementById('ap-notes').value };
    },
    create: d => { const all = DB.load('nau_appointments'); all.push({id:DB.nextId('nau_appointments'),...d,createdAt:nowISO()}); DB.save('nau_appointments',all); },
    update: (id,d) => { const all = DB.load('nau_appointments'); const i=all.findIndex(a=>a.id===id); if(i>-1){all[i]={...all[i],...d};DB.save('nau_appointments',all);} },
    refresh: renderAppointments
  },
  financePartner: {
    label: 'Finance Partner',
    getData: id => DB.load('nau_finance_partners').find(fp => fp.id === id),
    form: d => `
      <div class="form-row full"><div class="form-group"><label>Partner Name<span class="required">*</span></label><input class="form-control" id="fp-name" value="${d?d.name:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Interest Rate (%)</label><input class="form-control" type="number" step="0.1" id="fp-rate" value="${d?d.interestRate:''}" /></div>
      <div class="form-group"><label>Max Tenure (months)</label><input class="form-control" type="number" id="fp-tenure" value="${d?d.maxTenure:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Min Amount (USD)</label><input class="form-control" type="number" id="fp-min" value="${d?d.minAmountUSD:''}" /></div>
      <div class="form-group"><label>Max Amount (USD)</label><input class="form-control" type="number" id="fp-max" value="${d?d.maxAmountUSD:''}" /></div></div>
      <div class="form-row full"><div class="form-group"><label>Description</label><textarea class="form-control" id="fp-desc">${d?d.description:''}</textarea></div></div>
      <div class="form-row"><div class="form-group"><label>Apply URL</label><input class="form-control" id="fp-url" value="${d?d.applyUrl:''}" placeholder="https://..." /></div>
      <div class="form-group"><label>Logo URL</label><input class="form-control" id="fp-logo" value="${d?d.logoUrl:''}" placeholder="https://..." /></div></div>
      <div class="form-group"><label>Status</label><label class="toggle-switch" style="margin-top:.4rem"><input type="checkbox" id="fp-status" ${!d||d.status?'checked':''}><span class="toggle-slider"></span></label></div>`,
    collect: () => {
      const name = document.getElementById('fp-name').value.trim();
      if (!name) { toast('⚠️ Partner name required'); return null; }
      return { name, interestRate: parseFloat(document.getElementById('fp-rate').value)||0, maxTenure: parseInt(document.getElementById('fp-tenure').value)||0, minAmountUSD: parseInt(document.getElementById('fp-min').value)||0, maxAmountUSD: parseInt(document.getElementById('fp-max').value)||0, description: document.getElementById('fp-desc').value, applyUrl: document.getElementById('fp-url').value, logoUrl: document.getElementById('fp-logo').value, status: document.getElementById('fp-status').checked };
    },
    create: d => { const all = DB.load('nau_finance_partners'); all.push({id:DB.nextId('nau_finance_partners'),...d}); DB.save('nau_finance_partners',all); },
    update: (id,d) => { const all = DB.load('nau_finance_partners'); const i=all.findIndex(fp=>fp.id===id); if(i>-1){all[i]={...all[i],...d};DB.save('nau_finance_partners',all);} },
    refresh: renderFinancePartners
  },
  stockAlert: {
    label: 'Stock Alert',
    getData: id => DB.load('nau_alerts').find(a => a.id === id),
    form: d => `
      <div class="form-row"><div class="form-group"><label>Customer Name<span class="required">*</span></label><input class="form-control" id="sa-name" value="${d?d.customerName:''}" /></div>
      <div class="form-group"><label>Email</label><input class="form-control" id="sa-email" value="${d?d.customerEmail:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Phone</label><input class="form-control" id="sa-phone" value="${d?d.customerPhone:''}" /></div>
      <div class="form-group"><label>Max Price (USD)</label><input class="form-control" type="number" id="sa-price" value="${d?d.maxPriceUSD:''}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Make</label><input class="form-control" id="sa-make" value="${d?d.make:''}" placeholder="e.g. Toyota" /></div>
      <div class="form-group"><label>Model</label><input class="form-control" id="sa-model" value="${d?d.model:''}" placeholder="e.g. Land Cruiser Prado" /></div></div>
      <div class="form-row"><div class="form-group"><label>Fuel Type</label><select class="form-control" id="sa-fuel">
        <option value="">Any</option>
        ${['Diesel','Petrol','Hybrid','Electric'].map(f=>`<option ${d&&d.fuelType===f?'selected':''}>${f}</option>`).join('')}
      </select></div>
      <div class="form-group"><label>Body Type</label><input class="form-control" id="sa-body" value="${d?d.bodyType:''}" placeholder="e.g. SUV" /></div></div>
      <div class="form-group"><label>Status</label><select class="form-control" id="sa-status">
        ${['Active','Matched','Cancelled'].map(s=>`<option ${d&&d.status===s?'selected':''}>${s}</option>`).join('')}
      </select></div>
      <div class="form-row full"><div class="form-group"><label>Notes</label><textarea class="form-control" id="sa-notes">${d?d.notes:''}</textarea></div></div>`,
    collect: () => {
      const name = document.getElementById('sa-name').value.trim();
      if (!name) { toast('⚠️ Customer name required'); return null; }
      return { customerName: name, customerEmail: document.getElementById('sa-email').value, customerPhone: document.getElementById('sa-phone').value, maxPriceUSD: parseInt(document.getElementById('sa-price').value)||0, make: document.getElementById('sa-make').value, model: document.getElementById('sa-model').value, fuelType: document.getElementById('sa-fuel').value, bodyType: document.getElementById('sa-body').value, status: document.getElementById('sa-status').value, notes: document.getElementById('sa-notes').value };
    },
    create: d => { const all = DB.load('nau_alerts'); all.push({id:DB.nextId('nau_alerts'),...d,createdAt:nowISO()}); DB.save('nau_alerts',all); },
    update: (id,d) => { const all = DB.load('nau_alerts'); const i=all.findIndex(a=>a.id===id); if(i>-1){all[i]={...all[i],...d};DB.save('nau_alerts',all);} },
    refresh: renderAlerts
  },
  payAccount: {
    label: 'Payment Account',
    getData: id => DB.load('nau_payment_accounts').find(a => a.id === id),
    form: d => `
      <div class="form-row">
        <div class="form-group"><label>Account Name *</label><input class="form-control" id="pa-name" value="${d?d.name:''}" placeholder="e.g. Stanbic USD" /></div>
        <div class="form-group"><label>Type *</label><select class="form-control" id="pa-type">
          ${['Bank','Cash','Mobile Money','Cheque'].map(t=>`<option ${d&&d.type===t?'selected':''}>${t}</option>`).join('')}
        </select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Currency *</label><select class="form-control" id="pa-currency">
          <option value="USD" ${d&&d.currency==='USD'?'selected':''}>USD — US Dollar</option>
          <option value="UGX" ${d&&d.currency==='UGX'?'selected':''}>UGX — Uganda Shilling</option>
          <option value="KES" ${d&&d.currency==='KES'?'selected':''}>KES — Kenya Shilling</option>
          <option value="EUR" ${d&&d.currency==='EUR'?'selected':''}>EUR — Euro</option>
        </select></div>
        <div class="form-group"><label>Status</label><select class="form-control" id="pa-status">
          <option value="Active" ${!d||d.status==='Active'?'selected':''}>Active</option>
          <option value="Inactive" ${d&&d.status==='Inactive'?'selected':''}>Inactive</option>
        </select></div>
      </div>
      <div class="form-group"><label>Bank / Provider Name</label><input class="form-control" id="pa-bank" value="${d?d.bankName||'':''}" placeholder="e.g. Stanbic Bank Uganda" /></div>
      <div class="form-row">
        <div class="form-group"><label>Account Number</label><input class="form-control" id="pa-acctno" value="${d?d.accountNumber||'':''}" placeholder="e.g. 9030005754211" /></div>
        <div class="form-group"><label>Account Holder</label><input class="form-control" id="pa-holder" value="${d?d.accountHolder||'':''}" placeholder="e.g. NipponAuto Uganda Ltd" /></div>
      </div>`,
    collect: () => {
      const name = document.getElementById('pa-name').value.trim();
      if (!name) { toast('❌ Account name is required'); return null; }
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
    refresh: renderPaymentAccounts
  }
};

// ===== CLEAR FILTERS =====
function clearFilters(section) {
  const map = {
    manufacturers:[['mfr-search','']],
    models:[['mdl-search',''],['mdl-mfr-filter','']],
    vehicles:[['veh-search',''],['veh-mfr-filter',''],['veh-location','']],
    variables:[['var-search',''],['var-status-filter','']],
    quotes:[['qt-search',''],['qt-mfr',''],['qt-mdl','']],
    inquiries:[['inq-search',''],['inq-status','']],
    appointments:[['apt-search',''],['apt-status-filter','']],
    customers:[['cust-search','']],
    alerts:[['alert-status-filter','']],
    invoices:[['inv-search',''],['inv-status-filter',''],['inv-date-from',''],['inv-date-to','']],
    bills:[['bill-search',''],['bill-cat-filter',''],['bill-status-filter','']],
    payments:[['pay-search',''],['pay-type-filter',''],['pay-method-filter','']],
    receipts:[['rec-search','']],
    accounts:[['acct-search',''],['acct-type-filter',''],['acct-currency-filter','']]
  };
  (map[section]||[]).forEach(([id,val])=>{ const el=document.getElementById(id); if(el) el.value=val; });
  const renderMap = {manufacturers:renderManufacturers,models:renderModels,vehicles:renderVehicles,variables:renderVariables,quotes:renderQuotes,inquiries:renderInquiries,
    appointments:renderAppointments,customers:renderCustomers,alerts:renderAlerts,
    invoices:renderInvoices,bills:renderBills,payments:renderPayments,receipts:renderReceipts,accounts:renderPaymentAccounts};
  if(renderMap[section]) renderMap[section]();
}

// ===== ACCOUNTING: NUMBER GENERATORS =====
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

// ===== ACCOUNTING: BADGE HELPERS =====
function invStatusBadge(status) {
  const map = {
    'Draft': 'badge-draft',
    'Sent': 'badge-quoted',
    'Partially Paid': 'badge-sold',
    'Paid': 'badge-published',
    'Cancelled': 'badge-draft'
  };
  return `<span class="badge ${map[status]||'badge-draft'}">${status}</span>`;
}
function billStatusBadge(status) {
  const map = { 'Pending': 'badge-quoted', 'Paid': 'badge-published', 'Overdue': 'badge-overdue', 'Cancelled': 'badge-draft' };
  return `<span class="badge ${map[status]||'badge-draft'}">${status}</span>`;
}

// ===== ACCOUNTING: MARK VEHICLE SOLD =====
function markVehicleSold(vehicleId) {
  const vehs = DB.load('nau_vehicles');
  const v = vehs.find(v => v.id === vehicleId);
  if (v) {
    v.status = 'SOLD';
    v.soldAt = nowISO();
    DB.save('nau_vehicles', vehs);
  }
}

// ===== ACCOUNTING: ARCHIVE OLD SOLD VEHICLES =====
function archiveOldSoldVehicles() {
  const vehs = DB.load('nau_vehicles');
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  let count = 0;
  vehs.forEach(v => {
    if ((v.status === 'SOLD' || v.status === 'Sold') && v.soldAt) {
      if (now - new Date(v.soldAt).getTime() > thirtyDays) {
        v.status = 'ARCHIVED';
        count++;
      }
    }
  });
  if (count) {
    DB.save('nau_vehicles', vehs);
    toast(`📦 ${count} sold vehicle${count !== 1 ? 's' : ''} archived.`);
  }
}

// ===== ACCOUNTING: RENDER INVOICES =====
function renderInvoices() {
  const q = (document.getElementById('inv-search')||{}).value||'';
  const st = (document.getElementById('inv-status-filter')||{}).value||'';
  const from = (document.getElementById('inv-date-from')||{}).value||'';
  const to = (document.getElementById('inv-date-to')||{}).value||'';
  let data = DB.load('nau_invoices').filter(inv => {
    const matchQ = !q || (inv.invoiceNo+inv.customerName+inv.vehicleName).toLowerCase().includes(q.toLowerCase());
    const matchSt = !st || inv.status === st;
    const matchFrom = !from || inv.createdAt >= from;
    const matchTo = !to || inv.createdAt <= to + 'T23:59:59Z';
    return matchQ && matchSt && matchFrom && matchTo;
  });
  const countEl = document.getElementById('inv-acc-count');
  if (countEl) countEl.textContent = `${data.length} invoice${data.length !== 1 ? 's' : ''}`;
  document.getElementById('inv-acc-tbody').innerHTML = data.length ? data.map(inv => `
    <tr>
      <td><strong>${inv.invoiceNo}</strong></td>
      <td><span style="font-size:.78rem">${inv.vehicleName||'-'}</span></td>
      <td><div class="td-two-line"><span class="line1">${inv.customerName}</span><span class="line2 td-muted">${inv.customerEmail||''}</span></div></td>
      <td>$${Number(inv.salePrice||0).toLocaleString()}</td>
      <td>$${Number(inv.taxAmount||0).toLocaleString()}</td>
      <td><strong>$${Number(inv.totalAmount||0).toLocaleString()}</strong></td>
      <td>${invStatusBadge(inv.status)}</td>
      <td>${inv.dueDate||'-'}</td>
      <td>${fmtDateShort(inv.createdAt)}</td>
      <td><div class="row-actions">
        <button class="btn-row" title="View/Print" onclick="printInvoice(${inv.id})">👁️</button>
        <button class="btn-row" title="Edit" onclick="openModal('invoice',${inv.id})">✏️</button>
        ${inv.status !== 'Paid' && inv.status !== 'Cancelled' ? `<button class="btn-row" title="Record Payment" onclick="openPaymentModal('invoice',${inv.id})">💳</button>` : ''}
        <button class="btn-row btn-row-delete" title="Delete" onclick="deletePage('nau_invoices',${inv.id},renderInvoices)">🗑️</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="10" class="table-empty"><span class="empty-icon">🧾</span>No invoices found.</td></tr>';
}

// ===== ACCOUNTING: RENDER BILLS =====
function renderBills() {
  const q = (document.getElementById('bill-search')||{}).value||'';
  const cat = (document.getElementById('bill-cat-filter')||{}).value||'';
  const st = (document.getElementById('bill-status-filter')||{}).value||'';
  let data = DB.load('nau_bills').filter(b => {
    const matchQ = !q || (b.billNo+b.vendor+(b.category||'')).toLowerCase().includes(q.toLowerCase());
    const matchCat = !cat || b.category === cat;
    const matchSt = !st || b.status === st;
    return matchQ && matchCat && matchSt;
  });
  document.getElementById('bill-acc-tbody').innerHTML = data.length ? data.map(b => `
    <tr>
      <td><strong>${b.billNo}</strong></td>
      <td>${b.vendor}</td>
      <td><span class="badge badge-draft" style="font-size:.72rem">${b.category||'-'}</span></td>
      <td><span class="td-muted" style="font-size:.78rem">${b.vehicleName||'-'}</span></td>
      <td><strong>$${Number(b.amount||0).toLocaleString()}</strong></td>
      <td>${b.dueDate||'-'}</td>
      <td>${billStatusBadge(b.status)}</td>
      <td><div class="row-actions">
        <button class="btn-row" title="Edit" onclick="openModal('bill',${b.id})">✏️</button>
        ${b.status !== 'Paid' && b.status !== 'Cancelled' ? `<button class="btn-row" title="Record Payment" onclick="openPaymentModal('bill',${b.id})">💳</button>` : ''}
        <button class="btn-row btn-row-delete" title="Delete" onclick="deletePage('nau_bills',${b.id},renderBills)">🗑️</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="8" class="table-empty"><span class="empty-icon">📋</span>No bills found.</td></tr>';
}

// ===== ACCOUNTING: RENDER PAYMENTS =====
function renderPayments() {
  const q = (document.getElementById('pay-search')||{}).value||'';
  const type = (document.getElementById('pay-type-filter')||{}).value||'';
  const method = (document.getElementById('pay-method-filter')||{}).value||'';
  let data = DB.load('nau_payments').filter(p => {
    const matchQ = !q || (p.paymentNo+p.referenceNo).toLowerCase().includes(q.toLowerCase());
    const matchType = !type || p.type === type;
    const matchMethod = !method || p.method === method;
    return matchQ && matchType && matchMethod;
  });
  document.getElementById('pay-acc-tbody').innerHTML = data.length ? data.map(p => `
    <tr>
      <td><strong>${p.paymentNo}</strong></td>
      <td><span class="badge ${p.type==='invoice'?'badge-published':'badge-quoted'}">${p.type}</span></td>
      <td><span class="td-muted">${p.referenceNo||'-'}</span></td>
      <td><strong>$${Number(p.amount||0).toLocaleString()}</strong> <span class="td-muted">${p.currency||'USD'}</span></td>
      <td>${p.method||'-'}</td>
      <td>${p.date||'-'}</td>
      <td>${p.receiptId ? `<span class="badge badge-active" style="cursor:pointer" onclick="printReceipt(${p.receiptId})">REC-${String(p.receiptId).padStart(3,'0')}</span>` : '-'}</td>
      <td><div class="row-actions">
        ${p.receiptId ? `<button class="btn-row" title="Print Receipt" onclick="printReceipt(${p.receiptId})">🖨️</button>` : ''}
        <button class="btn-row btn-row-delete" title="Delete" onclick="deletePage('nau_payments',${p.id},renderPayments)">🗑️</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="8" class="table-empty"><span class="empty-icon">💳</span>No payments recorded yet.</td></tr>';
}

// ===== ACCOUNTING: RENDER RECEIPTS =====
function renderReceipts() {
  const q = (document.getElementById('rec-search')||{}).value||'';
  let data = DB.load('nau_receipts').filter(r => {
    return !q || (r.receiptNo+r.issuedTo+r.referenceNo).toLowerCase().includes(q.toLowerCase());
  });
  document.getElementById('rec-acc-tbody').innerHTML = data.length ? data.map(r => `
    <tr>
      <td><strong>${r.receiptNo}</strong></td>
      <td><span class="td-muted">${r.paymentNo||'-'}</span></td>
      <td>${r.issuedTo}</td>
      <td><strong>$${Number(r.amount||0).toLocaleString()}</strong> <span class="td-muted">${r.currency||'USD'}</span></td>
      <td>${r.method||'-'}</td>
      <td>${r.issuedAt ? fmtDateShort(r.issuedAt) : '-'}</td>
      <td><div class="row-actions">
        <button class="btn-row" title="Print Receipt" onclick="printReceipt(${r.id})">🖨️</button>
        <button class="btn-row btn-row-delete" title="Delete" onclick="deletePage('nau_receipts',${r.id},renderReceipts)">🗑️</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="7" class="table-empty"><span class="empty-icon">🧾</span>No receipts yet.</td></tr>';
}

// ===== ACCOUNTING: RENDER FINANCIAL SUMMARY =====
function renderAccSummary() {
  const invoices = DB.load('nau_invoices');
  const bills = DB.load('nau_bills');
  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.totalAmount||0), 0);
  const totalExpenses = bills.filter(b => b.status === 'Paid').reduce((s, b) => s + Number(b.amount||0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const outstanding = invoices.filter(i => ['Draft','Sent','Partially Paid'].includes(i.status))
    .reduce((s, i) => s + (Number(i.totalAmount||0) - Number(i.paidAmount||0)), 0);

  const statsEl = document.getElementById('acc-summary-stats');
  if (statsEl) statsEl.innerHTML = [
    { label: 'Total Revenue', value: '$' + totalRevenue.toLocaleString(), trend: 'up' },
    { label: 'Total Expenses', value: '$' + totalExpenses.toLocaleString(), trend: 'neutral' },
    { label: 'Net Profit', value: '$' + netProfit.toLocaleString(), trend: netProfit >= 0 ? 'up' : 'down' },
    { label: 'Outstanding Receivables', value: '$' + outstanding.toLocaleString(), trend: 'neutral' }
  ].map(s => `<div class="stat-card">
    <div class="stat-card-label">${s.label}</div>
    <div class="stat-card-value">${s.value}</div>
    <div class="stat-card-trend trend-${s.trend}">── Accounting overview</div>
  </div>`).join('');

  const tablesEl = document.getElementById('acc-summary-tables');
  if (tablesEl) tablesEl.innerHTML = `
    <div class="dash-section"><h3>Recent Invoices</h3>
      <table class="admin-table"><thead><tr><th>Invoice No</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
      <tbody>${invoices.slice(-5).reverse().map(i => `<tr><td>${i.invoiceNo}</td><td>${i.customerName}</td><td>$${Number(i.totalAmount||0).toLocaleString()}</td><td>${invStatusBadge(i.status)}</td></tr>`).join('') || '<tr><td colspan="4" class="table-empty">No invoices</td></tr>'}</tbody>
      </table>
    </div>
    <div class="dash-section"><h3>Recent Bills</h3>
      <table class="admin-table"><thead><tr><th>Bill No</th><th>Vendor</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>${bills.slice(-5).reverse().map(b => `<tr><td>${b.billNo}</td><td>${b.vendor}</td><td>$${Number(b.amount||0).toLocaleString()}</td><td>${billStatusBadge(b.status)}</td></tr>`).join('') || '<tr><td colspan="4" class="table-empty">No bills</td></tr>'}</tbody>
      </table>
    </div>`;

  // Monthly bar chart (last 6 months)
  const chartEl = document.getElementById('acc-monthly-chart');
  if (chartEl) {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({ label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }), year: d.getFullYear(), month: d.getMonth() });
    }
    const rows = months.map(m => {
      const rev = invoices.filter(i => i.status === 'Paid' && i.paidAt && new Date(i.paidAt).getFullYear() === m.year && new Date(i.paidAt).getMonth() === m.month)
        .reduce((s, i) => s + Number(i.totalAmount||0), 0);
      const exp = bills.filter(b => b.status === 'Paid' && b.paidAt && new Date(b.paidAt).getFullYear() === m.year && new Date(b.paidAt).getMonth() === m.month)
        .reduce((s, b) => s + Number(b.amount||0), 0);
      return { label: m.label, rev, exp };
    });
    const maxVal = Math.max(...rows.map(r => Math.max(r.rev, r.exp)), 1);
    chartEl.innerHTML = rows.map(r => `
      <div class="bar-row">
        <div class="bar-label" style="width:70px">${r.label}</div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.2rem">
            <div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${Math.round(r.rev/maxVal*100)}%;background:#10b981"></div></div>
            <div class="bar-value" style="width:60px;font-size:.75rem;color:#10b981">$${Math.round(r.rev/1000)}K</div>
          </div>
          <div style="display:flex;align-items:center;gap:.5rem">
            <div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${Math.round(r.exp/maxVal*100)}%;background:#c0392b"></div></div>
            <div class="bar-value" style="width:60px;font-size:.75rem;color:#c0392b">$${Math.round(r.exp/1000)}K</div>
          </div>
        </div>
      </div>`).join('');
  }
}

// ===== ACCOUNTING: PRINT INVOICE =====
function printInvoice(id) {
  const inv = DB.load('nau_invoices').find(i => i.id === id);
  if (!inv) { toast('Invoice not found'); return; }
  const isPaid = inv.status === 'Paid';
  document.getElementById('invoicePrintContent').innerHTML = `
    <div class="invoice-doc">
      <div class="inv-header">
        <div class="inv-logo">
          <h2>NipponAuto Uganda</h2>
          <p>Plot 45, Nakawa Industrial Road, Kampala, Uganda</p>
          <p>📞 +256 700 123 456 &nbsp;|&nbsp; ✉️ info@nipponauto.ug</p>
        </div>
        <div class="inv-meta">
          <h1>INVOICE</h1>
          <p><strong>${inv.invoiceNo}</strong></p>
          <p>Date: ${fmtDateShort(inv.createdAt)}</p>
          <p>Due: ${inv.dueDate||'-'}</p>
        </div>
      </div>
      <div class="inv-parties">
        <div class="inv-party">
          <h4>From</h4>
          <strong>NipponAuto Uganda</strong>
          <p>Plot 45, Nakawa Industrial Road</p>
          <p>Kampala, Uganda</p>
          <p>TIN: 1234567890</p>
        </div>
        <div class="inv-party">
          <h4>Bill To</h4>
          <strong>${inv.customerName}</strong>
          <p>${inv.customerEmail||''}</p>
          <p>${inv.customerPhone||''}</p>
          <p>${inv.customerAddress||''}</p>
        </div>
      </div>
      <table class="inv-table">
        <thead><tr><th>SKU</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
        <tbody>
          <tr>
            <td>${inv.vehicleSKU||'-'}</td>
            <td>${inv.vehicleName||'-'}</td>
            <td>1</td>
            <td>$${Number(inv.salePrice||0).toLocaleString()}</td>
            <td>$${Number(inv.salePrice||0).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      <div class="inv-totals">
        <div class="tot-row"><span>Subtotal</span><span>$${Number(inv.salePrice||0).toLocaleString()}</span></div>
        ${inv.discount ? `<div class="tot-row discount"><span>Discount</span><span>- $${Number(inv.discount||0).toLocaleString()}</span></div>` : ''}
        ${inv.taxRate ? `<div class="tot-row"><span>VAT (${inv.taxRate}%)</span><span>$${Number(inv.taxAmount||0).toLocaleString()}</span></div>` : ''}
        <div class="tot-row"><span>Total</span><span>$${Number(inv.totalAmount||0).toLocaleString()}</span></div>
      </div>
      <div class="inv-status-bar ${isPaid ? 'paid' : 'unpaid'}">
        ${isPaid ? '✅ PAID — Payment received on ' + fmtDateShort(inv.paidAt) : '⏳ Payment Pending — Due ' + (inv.dueDate||'—')}
        ${inv.paidAmount && !isPaid ? ' | Paid so far: $' + Number(inv.paidAmount||0).toLocaleString() : ''}
      </div>
      ${inv.notes ? `<p style="margin-top:1rem;font-size:.85rem;color:#374151"><strong>Notes:</strong> ${inv.notes}</p>` : ''}
      <div class="inv-footer">
        <p>Payment Method: ${inv.paymentMethod||'-'}</p>
        <p style="margin-top:.5rem">Thank you for your business. For queries, contact info@nipponauto.ug or +256 700 123 456.</p>
        <p>NipponAuto Uganda — Kampala's #1 Source for Genuine Japanese Cars</p>
      </div>
    </div>`;
  document.getElementById('invoicePrintModal').style.display = 'block';
}

// ===== ACCOUNTING: PRINT RECEIPT =====
function printReceipt(id) {
  const rec = DB.load('nau_receipts').find(r => r.id === id);
  if (!rec) { toast('Receipt not found'); return; }
  document.getElementById('invoicePrintContent').innerHTML = `
    <div class="receipt-doc">
      <div class="rec-header">
        <h2>NipponAuto Uganda</h2>
        <div style="color:#6b7280;font-size:.82rem">Plot 45, Nakawa Industrial Road, Kampala</div>
        <div class="rec-no">${rec.receiptNo}</div>
        <div style="color:#6b7280;font-size:.82rem;margin-top:.25rem">${fmtDateShort(rec.issuedAt)}</div>
      </div>
      <div class="rec-row"><span>Issued To</span><span><strong>${rec.issuedTo}</strong></span></div>
      <div class="rec-row"><span>Reference</span><span>${rec.referenceNo||'-'}</span></div>
      <div class="rec-row"><span>Payment Method</span><span>${rec.method||'-'}</span></div>
      <div class="rec-row"><span>Currency</span><span>${rec.currency||'USD'}</span></div>
      ${rec.notes ? `<div class="rec-row"><span>Notes</span><span>${rec.notes}</span></div>` : ''}
      <div class="rec-total"><span>Amount Paid</span><span>$${Number(rec.amount||0).toLocaleString()}</span></div>
      <div class="rec-stamp">✅ PAYMENT CONFIRMED</div>
      <div class="rec-footer">
        <p>This is an official receipt issued by NipponAuto Uganda.</p>
        <p>info@nipponauto.ug | +256 700 123 456</p>
      </div>
    </div>`;
  document.getElementById('invoicePrintModal').style.display = 'block';
}

// ===== PAYMENT ACCOUNTS =====
function getActiveAccounts() {
  return DB.load('nau_payment_accounts').filter(a => a.status === 'Active');
}

function accountOptions(selectedName) {
  const accts = getActiveAccounts();
  if (!accts.length) {
    return '<option value="Cash USD">Cash USD</option><option value="Cash UGX">Cash UGX</option>';
  }
  return accts.map(a =>
    `<option value="${a.name}" ${a.name === selectedName ? 'selected' : ''}>${a.name} (${a.currency})</option>`
  ).join('');
}

function renderPaymentAccounts() {
  const search = (document.getElementById('acct-search')||{}).value||'';
  const typeF = (document.getElementById('acct-type-filter')||{}).value||'';
  const currF = (document.getElementById('acct-currency-filter')||{}).value||'';

  let rows = DB.load('nau_payment_accounts');
  if (search) rows = rows.filter(a => (a.name+a.bankName+a.accountHolder).toLowerCase().includes(search.toLowerCase()));
  if (typeF) rows = rows.filter(a => a.type === typeF);
  if (currF) rows = rows.filter(a => a.currency === currF);

  const el = document.getElementById('acct-count');
  if (el) el.textContent = `${rows.length} account${rows.length !== 1 ? 's' : ''}`;

  const typeIcon = { Bank:'🏦', Cash:'💵', 'Mobile Money':'📱', Cheque:'📝' };

  document.getElementById('acct-tbody').innerHTML = rows.length ? rows.map(a => `
    <tr>
      <td><strong>${a.name}</strong></td>
      <td>${typeIcon[a.type]||''} ${a.type}</td>
      <td><span class="badge ${a.currency==='USD'?'badge-published':'badge-active'}">${a.currency}</span></td>
      <td>${a.bankName||'—'}</td>
      <td style="font-family:monospace;font-size:.83rem">${a.accountNumber||'—'}</td>
      <td>${a.accountHolder||'—'}</td>
      <td>
        <label class="toggle-switch" title="${a.status}">
          <input type="checkbox" ${a.status==='Active'?'checked':''} onchange="toggleAccountStatus(${a.id},this.checked)" />
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td>
        <button class="btn-row" title="Edit" onclick="openModal('payAccount',${a.id})">✏️</button>
        <button class="btn-row btn-danger" title="Delete" onclick="deletePayAccount(${a.id})">🗑️</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="8" style="text-align:center;color:#8a9ab5;padding:2rem">No accounts found. Add your first account above.</td></tr>';
}

function toggleAccountStatus(id, active) {
  const accts = DB.load('nau_payment_accounts');
  const a = accts.find(x => x.id === id);
  if (a) { a.status = active ? 'Active' : 'Inactive'; DB.save('nau_payment_accounts', accts); toast('✅ Status updated'); }
}

function deletePayAccount(id) {
  if (!confirm('Delete this payment account?')) return;
  DB.save('nau_payment_accounts', DB.load('nau_payment_accounts').filter(a => a.id !== id));
  toast('🗑️ Account deleted');
  renderPaymentAccounts();
}

// ===== ACCOUNTING: OPEN PAYMENT MODAL =====
function openPaymentModal(type, refId) {
  let refNo, amount, issuedTo;
  if (type === 'invoice') {
    const inv = DB.load('nau_invoices').find(i => i.id === refId);
    if (!inv) return;
    refNo = inv.invoiceNo;
    amount = inv.totalAmount - (inv.paidAmount || 0);
    issuedTo = inv.customerName;
  } else {
    const bill = DB.load('nau_bills').find(b => b.id === refId);
    if (!bill) return;
    refNo = bill.billNo;
    amount = bill.amount;
    issuedTo = bill.vendor;
  }

  document.getElementById('modalTitle').textContent = 'Record Payment';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group"><label>Reference</label><input class="form-control" value="${refNo}" readonly /></div>
    <div class="form-group"><label>Issued To</label><input class="form-control" value="${issuedTo}" readonly /></div>
    <div class="form-row">
      <div class="form-group"><label>Amount (USD)</label><input class="form-control" type="number" id="pmt-amount" value="${amount}" step="0.01" min="0" /></div>
      <div class="form-group"><label>Currency</label><select class="form-control" id="pmt-currency"><option value="USD">USD</option><option value="UGX">UGX</option></select></div>
    </div>
    <div class="form-group"><label>Payment Account</label><select class="form-control" id="pmt-method">
      ${accountOptions()}
    </select></div>
    <div class="form-group"><label>Payment Date</label><input class="form-control" type="date" id="pmt-date" value="${new Date().toISOString().split('T')[0]}" /></div>
    <div class="form-group"><label>Notes</label><textarea class="form-control" id="pmt-notes" rows="2"></textarea></div>`;
  document.getElementById('modalBackdrop').classList.add('open');

  document.getElementById('modalSaveBtn').onclick = () => {
    const pmtAmount = parseFloat(document.getElementById('pmt-amount').value) || 0;
    if (!pmtAmount) { toast('❌ Enter payment amount'); return; }

    const pmt = {
      id: DB.nextId('nau_payments'),
      paymentNo: genPaymentNo(),
      type, referenceId: refId, referenceNo: refNo,
      amount: pmtAmount, currency: document.getElementById('pmt-currency').value,
      method: document.getElementById('pmt-method').value,
      date: document.getElementById('pmt-date').value,
      notes: document.getElementById('pmt-notes').value,
      receiptId: null
    };

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
    document.getElementById('modalSaveBtn').onclick = submitModal;
    toast('✅ Payment recorded. Receipt generated.');
    if (currentPage === 'acc-invoices') renderInvoices();
    else if (currentPage === 'acc-bills') renderBills();
    else if (currentPage === 'acc-payments') renderPayments();
  };
}

// ===== APPOINTMENTS =====
function renderAppointments() {
  const q = (document.getElementById('apt-search')||{}).value||'';
  const st = (document.getElementById('apt-status-filter')||{}).value||'';
  let data = DB.load('nau_appointments').filter(a => {
    const matchQ = !q || (a.customerName+a.vehicleName).toLowerCase().includes(q.toLowerCase());
    const matchSt = !st || a.status === st;
    return matchQ && matchSt;
  });
  const statusBadge = s => {
    const map = { Pending:'background:#f0a500;color:#fff', Confirmed:'background:#10b981;color:#fff', Completed:'background:#0a1628;color:#fff', Cancelled:'background:#9ca3af;color:#fff' };
    return `<span style="display:inline-block;padding:.2rem .55rem;border-radius:999px;font-size:.75rem;font-weight:600;${map[s]||''}">${s}</span>`;
  };
  document.getElementById('apt-tbody').innerHTML = data.length ? data.map(a => `
    <tr>
      <td><div class="td-two-line"><span class="line1"><strong>${a.customerName}</strong></span><span class="line2 td-muted">${a.customerEmail||''}</span></div></td>
      <td>${a.customerPhone||'-'}</td>
      <td>${a.vehicleName||'-'}</td>
      <td><div class="td-two-line"><span class="line1">${a.date||'-'}</span><span class="line2 td-muted">${a.time||'-'}</span></div></td>
      <td><span class="badge badge-draft" style="font-size:.72rem">${a.type||'-'}</span></td>
      <td>${statusBadge(a.status||'Pending')}</td>
      <td><div class="row-actions">
        <button class="btn-row" title="Edit" onclick="openModal('appointment',${a.id})">✏️</button>
        <button class="btn-row btn-row-delete" title="Delete" onclick="deletePage('nau_appointments',${a.id},renderAppointments)">🗑️</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="7" class="table-empty"><span class="empty-icon">📅</span>No appointments found.</td></tr>';
}

// ===== CUSTOMERS CRM =====
function renderCustomers() {
  const q = (document.getElementById('cust-search')||{}).value||'';
  let data = DB.load('nau_customers').filter(c => {
    return !q || (c.name+c.email+(c.phone||'')).toLowerCase().includes(q.toLowerCase());
  });
  const inqs = DB.load('nau_inquiries');
  const quotes = DB.load('nau_quotes');
  const orders = DB.load('nau_orders');
  const invoices = DB.load('nau_invoices');
  document.getElementById('cust-tbody').innerHTML = data.length ? data.map(c => {
    const cInqs = inqs.filter(i => i.email === c.email).length;
    const cQuotes = quotes.filter(q => q.customerEmail === c.email).length;
    const cOrders = orders.filter(o => o.customerName && c.name && o.customerName.toLowerCase() === c.name.toLowerCase()).length;
    const cInvoices = invoices.filter(i => i.customerEmail === c.email || (i.customerName && c.name && i.customerName.toLowerCase() === c.name.toLowerCase())).length;
    return `
    <tr style="cursor:pointer" onclick="openCustomerHistory(${c.id})">
      <td><strong>${c.name}</strong></td>
      <td><span class="td-muted">${c.email}</span></td>
      <td>${c.phone||'-'}</td>
      <td>${fmtDateShort(c.joinedAt||c.createdAt||'')}</td>
      <td><span style="font-size:.78rem;color:#4b5563">${cInqs} inq · ${cQuotes} qt · ${cOrders} ord · ${cInvoices} inv</span></td>
      <td><div class="row-actions"><button class="btn-row" title="View History" onclick="event.stopPropagation();openCustomerHistory(${c.id})">👁️</button></div></td>
    </tr>`;
  }).join('') : '<tr><td colspan="6" class="table-empty"><span class="empty-icon">👥</span>No customers found.</td></tr>';
}

function openCustomerHistory(id) {
  const customers = DB.load('nau_customers');
  const c = customers.find(x => x.id === id);
  if (!c) return;
  const inqs = DB.load('nau_inquiries').filter(i => i.email === c.email);
  const quotes = DB.load('nau_quotes').filter(q => q.customerEmail === c.email);
  const orders = DB.load('nau_orders').filter(o => o.customerName && c.name && o.customerName.toLowerCase() === c.name.toLowerCase());
  const invoices = DB.load('nau_invoices').filter(i => i.customerEmail === c.email || (i.customerName && c.name && i.customerName.toLowerCase() === c.name.toLowerCase()));
  document.getElementById('modalTitle').textContent = 'Customer History — ' + c.name;
  document.getElementById('modalBody').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:.75rem;margin-bottom:1.25rem">
      <div style="background:#f0f4ff;border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:1.4rem;font-weight:700;color:#0a1628">${inqs.length}</div><div style="font-size:.75rem;color:#6b7280">Inquiries</div></div>
      <div style="background:#f0fdf4;border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:1.4rem;font-weight:700;color:#10b981">${quotes.length}</div><div style="font-size:.75rem;color:#6b7280">Quotes</div></div>
      <div style="background:#fffbeb;border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:1.4rem;font-weight:700;color:#f0a500">${orders.length}</div><div style="font-size:.75rem;color:#6b7280">Orders</div></div>
      <div style="background:#fef2f2;border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:1.4rem;font-weight:700;color:#c0392b">${invoices.length}</div><div style="font-size:.75rem;color:#6b7280">Invoices</div></div>
    </div>
    <div style="margin-bottom:.75rem;padding:.75rem;background:#f8fafc;border-radius:8px;font-size:.84rem">
      <strong>${c.name}</strong> &nbsp;|&nbsp; ${c.email} &nbsp;|&nbsp; ${c.phone||'-'} &nbsp;|&nbsp; Joined: ${fmtDateShort(c.joinedAt||c.createdAt||'')}
    </div>
    ${inqs.length ? `<div style="margin-bottom:1rem"><strong style="font-size:.85rem">Inquiries</strong><div class="table-wrap" style="margin-top:.4rem"><table class="admin-table"><thead><tr><th>Vehicle</th><th>Date</th><th>Status</th></tr></thead><tbody>${inqs.map(i=>`<tr><td>${i.vehicleInterest||'-'}</td><td>${fmtDateShort(i.date)}</td><td><span class="badge badge-${i.status||'new'}">${i.status||'new'}</span></td></tr>`).join('')}</tbody></table></div></div>` : ''}
    ${quotes.length ? `<div style="margin-bottom:1rem"><strong style="font-size:.85rem">Quotes</strong><div class="table-wrap" style="margin-top:.4rem"><table class="admin-table"><thead><tr><th>Quote No</th><th>Vehicle</th><th>Price</th><th>Status</th></tr></thead><tbody>${quotes.map(q=>`<tr><td>${q.quoteNo}</td><td>${q.vehicleName||'-'}</td><td>$${Number(q.quotedPrice||0).toLocaleString()}</td><td><span class="badge badge-${(q.status||'quoted').toLowerCase()}">${q.status||'Quoted'}</span></td></tr>`).join('')}</tbody></table></div></div>` : ''}
    ${orders.length ? `<div style="margin-bottom:1rem"><strong style="font-size:.85rem">Orders</strong><div class="table-wrap" style="margin-top:.4rem"><table class="admin-table"><thead><tr><th>Order No</th><th>Vehicle</th><th>Amount</th><th>Status</th></tr></thead><tbody>${orders.map(o=>`<tr><td>${o.orderNo}</td><td>${o.vehicleName||'-'}</td><td>$${Number(o.amount||0).toLocaleString()}</td><td><span class="badge badge-${(o.status||'pending').toLowerCase()}">${o.status}</span></td></tr>`).join('')}</tbody></table></div></div>` : ''}
    ${invoices.length ? `<div style="margin-bottom:1rem"><strong style="font-size:.85rem">Invoices</strong><div class="table-wrap" style="margin-top:.4rem"><table class="admin-table"><thead><tr><th>Invoice No</th><th>Vehicle</th><th>Total</th><th>Status</th></tr></thead><tbody>${invoices.map(i=>`<tr><td>${i.invoiceNo}</td><td>${i.vehicleName||'-'}</td><td>$${Number(i.totalAmount||0).toLocaleString()}</td><td>${invStatusBadge(i.status)}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
    ${!inqs.length && !quotes.length && !orders.length && !invoices.length ? '<p style="color:#8a9ab5;text-align:center;padding:1rem">No interaction history found for this customer.</p>' : ''}
  `;
  document.getElementById('modalSaveBtn').style.display = 'none';
  document.getElementById('modalBackdrop').classList.add('open');
}

// ===== BULK UGX RECALCULATION =====
function openBulkUGXModal() {
  const vehs = getVehicles().filter(v => v.status === 'Published');
  document.getElementById('modalTitle').textContent = 'Recalculate UGX Prices';
  const defaultRate = 3700;
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group" style="margin-bottom:1rem">
      <label><strong>New USD → UGX Rate</strong></label>
      <input class="form-control" type="number" id="ugx-rate" value="${defaultRate}" min="1" oninput="previewUGXCalc()" />
    </div>
    <div style="font-size:.82rem;color:#6b7280;margin-bottom:.75rem">${vehs.length} published vehicles will be updated.</div>
    <div class="table-wrap" style="max-height:280px;overflow-y:auto">
      <table class="admin-table" id="ugx-preview-table">
        <thead><tr><th>SKU</th><th>Make/Model</th><th>Current UGX</th><th id="ugx-new-header">New UGX @ ${defaultRate}</th><th>Change</th></tr></thead>
        <tbody id="ugx-preview-tbody">
          ${vehs.map(v => {
            const newUGX = v.priceUSD * defaultRate;
            const diff = newUGX - Number(v.priceUGX||0);
            return `<tr>
              <td style="font-size:.72rem">${v.sku}</td>
              <td>${v.make} ${v.model}</td>
              <td>${Number(v.priceUGX||0).toLocaleString()}</td>
              <td class="ugx-new-val">${newUGX.toLocaleString()}</td>
              <td style="color:${diff>0?'#10b981':diff<0?'#c0392b':'#6b7280'}">${diff>0?'+':''}${Math.round(diff/1000000*10)/10}M</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
  document.getElementById('modalSaveBtn').textContent = 'Apply to All Published';
  document.getElementById('modalSaveBtn').style.display = '';
  document.getElementById('modalSaveBtn').onclick = () => {
    const rate = Number(document.getElementById('ugx-rate').value) || 3700;
    const all = getVehicles();
    all.forEach(v => { if (v.status === 'Published') v.priceUGX = Math.round(v.priceUSD * rate); });
    saveVehicles(all);
    closeModal();
    document.getElementById('modalSaveBtn').onclick = submitModal;
    document.getElementById('modalSaveBtn').textContent = 'Save';
    toast('✅ UGX prices recalculated at ' + rate.toLocaleString() + ' UGX/USD');
    renderVehicles();
  };
  document.getElementById('modalBackdrop').classList.add('open');
}

function previewUGXCalc() {
  const rate = Number((document.getElementById('ugx-rate')||{}).value) || 3700;
  const header = document.getElementById('ugx-new-header');
  if (header) header.textContent = 'New UGX @ ' + rate.toLocaleString();
  const vehs = getVehicles().filter(v => v.status === 'Published');
  const tbody = document.getElementById('ugx-preview-tbody');
  if (!tbody) return;
  tbody.querySelectorAll('tr').forEach((row, i) => {
    if (vehs[i]) {
      const newVal = row.querySelector('.ugx-new-val');
      if (newVal) newVal.textContent = (vehs[i].priceUSD * rate).toLocaleString();
    }
  });
}

// ===== WHATSAPP TEMPLATES =====
function openWhatsAppModal(type, id) {
  let name, phone, vehicle, status;
  if (type === 'inquiry') {
    const item = DB.load('nau_inquiries').find(i => i.id === id);
    if (!item) return;
    name = item.name; phone = item.phone; vehicle = item.vehicleInterest; status = item.status;
  } else if (type === 'quote') {
    const item = DB.load('nau_quotes').find(q => q.id === id);
    if (!item) return;
    name = item.customerName; phone = item.customerPhone || ''; vehicle = item.vehicleName; status = 'quote';
  }
  let message = '';
  if (type === 'inquiry') {
    if (status === 'new') {
      message = `Hi ${name}, thank you for your inquiry about ${vehicle}. We'd love to help you find your perfect vehicle. Can we schedule a viewing? — NipponAuto Uganda`;
    } else if (status === 'contacted') {
      message = `Hi ${name}, following up on your inquiry about ${vehicle}. Do you have any questions we can answer? — NipponAuto Uganda`;
    } else {
      message = `Hi ${name}, thank you for your interest in ${vehicle} at NipponAuto Uganda. Please let us know how we can assist you further. — NipponAuto Uganda`;
    }
  } else if (type === 'quote') {
    message = `Hi ${name}, your quote for the ${vehicle} is ready. Please visit our showroom or contact us to review the full pricing details including all fees. — NipponAuto Uganda`;
  }
  const cleanPhone = (phone||'').replace(/[\s\-\+]/g, '').replace(/^0/, '256');
  document.getElementById('modalTitle').textContent = '📱 WhatsApp Message';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group" style="margin-bottom:1rem">
      <label><strong>Message Template</strong></label>
      <textarea class="form-control" id="wa-msg" rows="5" style="min-height:100px">${message}</textarea>
    </div>
    <div class="form-group" style="margin-bottom:1rem">
      <label>Phone Number</label>
      <input class="form-control" id="wa-phone" value="${phone||''}" placeholder="+256 700 123 456" />
    </div>
    <div style="font-size:.8rem;color:#6b7280">Tip: Edit the message before sending. The number should include country code.</div>
  `;
  document.getElementById('modalSaveBtn').textContent = '📱 Copy & Open WhatsApp';
  document.getElementById('modalSaveBtn').style.display = '';
  document.getElementById('modalSaveBtn').onclick = () => {
    const msg = document.getElementById('wa-msg').value;
    const ph = (document.getElementById('wa-phone').value||'').replace(/[\s\-\+]/g,'').replace(/^0/,'256');
    navigator.clipboard.writeText(msg).catch(()=>{});
    const url = 'https://wa.me/' + ph + '?text=' + encodeURIComponent(msg);
    window.open(url, '_blank');
    closeModal();
    document.getElementById('modalSaveBtn').onclick = submitModal;
    document.getElementById('modalSaveBtn').textContent = 'Save';
    toast('✅ Message copied & WhatsApp opened');
  };
  document.getElementById('modalBackdrop').classList.add('open');
}

// ===== FINANCE PARTNERS =====
function renderFinancePartners() {
  const data = DB.load('nau_finance_partners');
  const tbody = document.getElementById('fp-tbody');
  if (!tbody) return;
  tbody.innerHTML = data.length ? data.map(fp => `
    <tr>
      <td><strong>${fp.name}</strong></td>
      <td>${fp.interestRate}% p.a.</td>
      <td>${fp.maxTenure} months</td>
      <td>$${Number(fp.minAmountUSD||0).toLocaleString()} – $${Number(fp.maxAmountUSD||0).toLocaleString()}</td>
      <td><label class="toggle-switch"><input type="checkbox" ${fp.status?'checked':''} onchange="toggleFP(${fp.id},this.checked)"><span class="toggle-slider"></span></label></td>
      <td><div class="row-actions">
        <button class="btn-row" title="Edit" onclick="openModal('financePartner',${fp.id})">✏️</button>
        <button class="btn-row btn-row-delete" title="Delete" onclick="deletePage('nau_finance_partners',${fp.id},renderFinancePartners)">🗑️</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="6" class="table-empty"><span class="empty-icon">🏦</span>No finance partners yet.</td></tr>';
}

function toggleFP(id, val) {
  const data = DB.load('nau_finance_partners');
  const item = data.find(x => x.id === id);
  if (item) { item.status = val; DB.save('nau_finance_partners', data); toast('✅ Status updated'); }
}

// ===== STOCK ALERTS =====
function renderAlerts() {
  const st = (document.getElementById('alert-status-filter')||{}).value||'';
  let data = DB.load('nau_alerts').filter(a => !st || a.status === st);
  const statusColors = { Active:'background:#10b981;color:#fff', Matched:'background:#0a1628;color:#fff', Cancelled:'background:#9ca3af;color:#fff' };
  document.getElementById('alert-tbody').innerHTML = data.length ? data.map(a => `
    <tr>
      <td><strong>${a.customerName}</strong></td>
      <td><div class="td-two-line"><span class="line1">${a.customerEmail||'-'}</span><span class="line2 td-muted">${a.customerPhone||'-'}</span></div></td>
      <td><div class="td-two-line"><span class="line1">${a.make||''} ${a.model||''}</span><span class="line2 td-muted">${a.fuelType||''} ${a.bodyType||''}</span></div></td>
      <td>$${Number(a.maxPriceUSD||0).toLocaleString()}</td>
      <td><span style="display:inline-block;padding:.2rem .55rem;border-radius:999px;font-size:.75rem;font-weight:600;${statusColors[a.status]||''}">${a.status||'Active'}</span></td>
      <td>${fmtDateShort(a.createdAt)}</td>
      <td><div class="row-actions">
        ${a.status!=='Matched'?`<button class="btn-row" title="Mark Matched" onclick="setAlertStatus(${a.id},'Matched')" style="background:#0a1628;color:#fff;font-size:.78rem">✅</button>`:''}
        ${a.status==='Active'?`<button class="btn-row" title="Cancel" onclick="setAlertStatus(${a.id},'Cancelled')" style="background:#c0392b;color:#fff;font-size:.78rem">❌</button>`:''}
        <button class="btn-row" title="Edit" onclick="openModal('stockAlert',${a.id})">✏️</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="7" class="table-empty"><span class="empty-icon">🔔</span>No stock alerts found.</td></tr>';
}

function setAlertStatus(id, status) {
  const data = DB.load('nau_alerts');
  const item = data.find(a => a.id === id);
  if (item) { item.status = status; DB.save('nau_alerts', data); renderAlerts(); toast('✅ Alert status updated to ' + status); }
}

// ===== SEED DATA =====
function seedData() {
  if (localStorage.getItem('nau_seeded')) return;

  // Manufacturers
  const mfrs = [
    {id:1,name:'Toyota',route:'toyota',position:1,description:'Japan\'s most reliable brand',logoUrl:''},
    {id:2,name:'Nissan',route:'nissan',position:2,description:'',logoUrl:''},
    {id:3,name:'Honda',route:'honda',position:3,description:'',logoUrl:''},
    {id:4,name:'Subaru',route:'subaru',position:4,description:'',logoUrl:''},
    {id:5,name:'Mitsubishi',route:'mitsubishi',position:5,description:'',logoUrl:''},
    {id:6,name:'Isuzu',route:'isuzu',position:6,description:'',logoUrl:''},
    {id:7,name:'Land Rover',route:'land-rover',position:7,description:'',logoUrl:''},
    {id:8,name:'Lexus',route:'lexus',position:8,description:'',logoUrl:''}
  ];
  saveMFRs(mfrs);

  // Models
  const models = [
    {id:1,name:'Land Cruiser Prado',manufacturerId:1,description:'',status:true,createdAt:'2026-03-16T09:00:00Z'},
    {id:2,name:'Fortuner',manufacturerId:1,description:'',status:true,createdAt:'2026-03-16T09:00:00Z'},
    {id:3,name:'Hilux D-Cabin',manufacturerId:1,description:'',status:true,createdAt:'2026-03-16T09:00:00Z'},
    {id:4,name:'Alphard',manufacturerId:1,description:'',status:true,createdAt:'2026-03-16T09:00:00Z'},
    {id:5,name:'Hiace Super GL',manufacturerId:1,description:'',status:true,createdAt:'2026-03-16T09:00:00Z'},
    {id:6,name:'RAV4',manufacturerId:1,description:'',status:true,createdAt:'2026-03-16T09:00:00Z'},
    {id:7,name:'Voxy',manufacturerId:1,description:'',status:true,createdAt:'2026-03-16T09:00:00Z'},
    {id:8,name:'Crown',manufacturerId:1,description:'',status:true,createdAt:'2026-03-16T09:00:00Z'},
    {id:9,name:'Patrol Y62',manufacturerId:2,description:'',status:true,createdAt:'2026-03-16T09:00:00Z'},
    {id:10,name:'X-Trail',manufacturerId:2,description:'',status:true,createdAt:'2026-03-16T09:00:00Z'},
    {id:11,name:'CRV',manufacturerId:3,description:'',status:true,createdAt:'2026-03-16T09:00:00Z'},
    {id:12,name:'Fit',manufacturerId:3,description:'',status:true,createdAt:'2026-03-16T09:00:00Z'},
    {id:13,name:'Forester',manufacturerId:4,description:'',status:true,createdAt:'2026-03-16T09:00:00Z'},
    {id:14,name:'Outback',manufacturerId:4,description:'',status:true,createdAt:'2026-03-16T09:00:00Z'},
    {id:15,name:'Pajero',manufacturerId:5,description:'',status:true,createdAt:'2026-03-16T09:00:00Z'},
    {id:16,name:'D-Max',manufacturerId:6,description:'',status:true,createdAt:'2026-03-16T09:00:00Z'},
    {id:17,name:'Range Rover Vogue',manufacturerId:7,description:'',status:true,createdAt:'2026-03-16T09:00:00Z'},
    {id:18,name:'Defender 110',manufacturerId:7,description:'',status:true,createdAt:'2026-03-16T09:00:00Z'},
    {id:19,name:'RX350',manufacturerId:8,description:'',status:true,createdAt:'2026-03-16T09:00:00Z'},
    {id:20,name:'LX570',manufacturerId:8,description:'',status:true,createdAt:'2026-03-16T09:00:00Z'}
  ];
  saveModels(models);

  // Model Codes
  DB.save('nau_model_codes', [
    {id:1,  code:'GDJ150',   mfrId:1, modelId:1,  engineCode:'1GD-FTV', engineCC:2755, fuelType:'Diesel',  drivetrain:'4WD', steeringPosition:'RHD', description:'Land Cruiser Prado 2.8D 4WD (2015+)', createdAt:'2026-03-16T09:00:00Z'},
    {id:2,  code:'KDJ150',   mfrId:1, modelId:1,  engineCode:'1KD-FTV', engineCC:3000, fuelType:'Diesel',  drivetrain:'4WD', steeringPosition:'RHD', description:'Land Cruiser Prado 3.0D 4WD (pre-2015)', createdAt:'2026-03-16T09:00:00Z'},
    {id:3,  code:'GUN156',   mfrId:1, modelId:2,  engineCode:'1GD-FTV', engineCC:2755, fuelType:'Diesel',  drivetrain:'4WD', steeringPosition:'RHD', description:'Fortuner 2.8D 4WD (2016+)', createdAt:'2026-03-16T09:00:00Z'},
    {id:4,  code:'GUN125',   mfrId:1, modelId:3,  engineCode:'1GD-FTV', engineCC:2755, fuelType:'Diesel',  drivetrain:'4WD', steeringPosition:'RHD', description:'Hilux D-Cab 2.8D 4WD (2016+)', createdAt:'2026-03-16T09:00:00Z'},
    {id:5,  code:'GUN135',   mfrId:1, modelId:3,  engineCode:'1GD-FTV', engineCC:2755, fuelType:'Diesel',  drivetrain:'4WD', steeringPosition:'RHD', description:'Hilux D-Cab 2.8D 4x4 Extra Cab', createdAt:'2026-03-16T09:00:00Z'},
    {id:6,  code:'KDH201',   mfrId:1, modelId:5,  engineCode:'2KD-FTV', engineCC:2694, fuelType:'Diesel',  drivetrain:'2WD', steeringPosition:'RHD', description:'Hiace 2.7D 2WD (standard)', createdAt:'2026-03-16T09:00:00Z'},
    {id:7,  code:'GGL25',    mfrId:8, modelId:19, engineCode:'2GR-FE',  engineCC:3456, fuelType:'Petrol',  drivetrain:'AWD', steeringPosition:'RHD', description:'Lexus RX350 AWD 3.5V6', createdAt:'2026-03-16T09:00:00Z'},
    {id:8,  code:'Y62',      mfrId:2, modelId:9,  engineCode:'VK56VD',  engineCC:5552, fuelType:'Petrol',  drivetrain:'4WD', steeringPosition:'RHD', description:'Nissan Patrol Y62 5.6V8 4WD', createdAt:'2026-03-16T09:00:00Z'},
    {id:9,  code:'NT32',     mfrId:2, modelId:10, engineCode:'QR25DE',  engineCC:2500, fuelType:'Petrol',  drivetrain:'AWD', steeringPosition:'RHD', description:'Nissan X-Trail 2.5 AWD', createdAt:'2026-03-16T09:00:00Z'},
    {id:10, code:'GK5',      mfrId:3, modelId:12, engineCode:'L15B',    engineCC:1496, fuelType:'Petrol',  drivetrain:'2WD', steeringPosition:'RHD', description:'Honda Fit 1.5 2WD', createdAt:'2026-03-16T09:00:00Z'},
    {id:11, code:'V93W',     mfrId:5, modelId:15, engineCode:'4M41',    engineCC:3200, fuelType:'Diesel',  drivetrain:'4WD', steeringPosition:'RHD', description:'Mitsubishi Pajero 3.2D 4WD', createdAt:'2026-03-16T09:00:00Z'},
    {id:12, code:'TFR86',    mfrId:6, modelId:16, engineCode:'4JJ1',    engineCC:2999, fuelType:'Diesel',  drivetrain:'4WD', steeringPosition:'RHD', description:'Isuzu D-Max 3.0D 4WD', createdAt:'2026-03-16T09:00:00Z'},
    {id:13, code:'AGH35',    mfrId:1, modelId:4,  engineCode:'2AR-FE',  engineCC:2494, fuelType:'Petrol',  drivetrain:'2WD', steeringPosition:'RHD', description:'Toyota Alphard 2.5 2WD', createdAt:'2026-03-16T09:00:00Z'},
    {id:14, code:'AYH30',    mfrId:1, modelId:4,  engineCode:'2AZ-FXE', engineCC:2362, fuelType:'Hybrid',  drivetrain:'AWD', steeringPosition:'RHD', description:'Toyota Alphard Hybrid AWD', createdAt:'2026-03-16T09:00:00Z'}
  ]);

  // Vehicles
  const vehicles = [
    {id:1,sku:'05-2026-106001',manufacturerId:1,make:'Toyota',model:'Hilux D-Cabin',color:'Silver',year:2020,chassis:'MROKB8CD-901211127',engineCC:2800,bodyType:'Pickup / D-Cabin',subBodyType:'D/Cabin',fuelType:'Diesel',transmission:'Manual',steering:'RHD',priceUSD:39000,priceUGX:144300000,imageUrl:'https://picsum.photos/seed/hilux-ug1/600/380',status:'Published',createdAt:'2026-05-11T00:00:00Z',mileage:35000,features:['ABS','Airbags','Air Conditioning','Power Windows','Reverse Camera','Alloy Wheels']},
    {id:2,sku:'05-2026-106002',manufacturerId:1,make:'Toyota',model:'Hilux D-Cabin',color:'Black',year:2025,chassis:'MROYA3AV-703070476',engineCC:2800,bodyType:'Pickup / D-Cabin',subBodyType:'D/Cabin',fuelType:'Diesel',transmission:'Manual',steering:'RHD',priceUSD:49000,priceUGX:181300000,imageUrl:'https://picsum.photos/seed/hilux-ug2/600/380',status:'Published',createdAt:'2026-05-11T00:00:00Z',mileage:0,features:['ABS','Airbags','Air Conditioning','Power Windows','Reverse Camera','Diff Lock','4WD','Alloy Wheels']},
    {id:3,sku:'05-2026-106003',manufacturerId:1,make:'Toyota',model:'Hilux D-Cabin',color:'White',year:2025,chassis:'MROYA3AV-703071210',engineCC:2800,bodyType:'Pickup / D-Cabin',subBodyType:'D/Cabin',fuelType:'Diesel',transmission:'Manual',steering:'RHD',priceUSD:49000,priceUGX:181300000,imageUrl:'https://picsum.photos/seed/hilux-ug3/600/380',status:'Published',createdAt:'2026-05-11T00:00:00Z',mileage:0,features:['ABS','Airbags','Air Conditioning','Power Windows','Reverse Camera','Diff Lock','4WD','Alloy Wheels']},
    {id:4,sku:'04-2026-106004',manufacturerId:1,make:'Toyota',model:'Alphard',color:'Silver',year:2017,chassis:'AGH35-0021143',engineCC:2500,bodyType:'Wagon',subBodyType:'',fuelType:'Petrol',transmission:'Automatic',steering:'RHD',priceUSD:16000,priceUGX:59200000,imageUrl:'https://picsum.photos/seed/alphard-ug1/600/380',status:'Sold',createdAt:'2026-04-20T00:00:00Z',mileage:62000,features:['ABS','Airbags','Air Conditioning','Power Windows','Electric Seats','Sunroof','Navigation','Rear Entertainment']},
    {id:5,sku:'04-2026-105001',manufacturerId:1,make:'Toyota',model:'Land Cruiser Prado',color:'White',year:2022,chassis:'GDJ150-0185234',engineCC:2800,bodyType:'SUV',subBodyType:'',fuelType:'Diesel',transmission:'Automatic',steering:'RHD',priceUSD:42000,priceUGX:155400000,imageUrl:'https://picsum.photos/seed/prado-ug1/600/380',status:'Published',createdAt:'2026-04-15T00:00:00Z',mileage:28000,features:['ABS','Airbags','Air Conditioning','Power Windows','Reverse Camera','Sunroof','Leather Seats','Navigation','4WD']},
    {id:6,sku:'04-2026-105002',manufacturerId:1,make:'Toyota',model:'Fortuner',color:'Black',year:2023,chassis:'GUN156-3012456',engineCC:2800,bodyType:'SUV',subBodyType:'',fuelType:'Diesel',transmission:'Automatic',steering:'RHD',priceUSD:34000,priceUGX:125800000,imageUrl:'https://picsum.photos/seed/fortuner-ug1/600/380',status:'Published',createdAt:'2026-04-12T00:00:00Z',mileage:12500,features:['ABS','Airbags','Air Conditioning','Power Windows','Reverse Camera','4WD']},
    {id:7,sku:'04-2026-105003',manufacturerId:1,make:'Toyota',model:'Hiace Super GL',color:'White',year:2022,chassis:'KDH201-1234567',engineCC:2700,bodyType:'Van',subBodyType:'',fuelType:'Diesel',transmission:'Manual',steering:'RHD',priceUSD:22000,priceUGX:81400000,imageUrl:'https://picsum.photos/seed/hiace-ug1/600/380',status:'Published',createdAt:'2026-04-10T00:00:00Z',mileage:41000,features:['ABS','Airbags','Air Conditioning','Power Windows','Reverse Camera']},
    {id:8,sku:'04-2026-105004',manufacturerId:1,make:'Toyota',model:'RAV4',color:'Blue',year:2021,chassis:'JTMW1234567890123',engineCC:2500,bodyType:'SUV',subBodyType:'',fuelType:'Hybrid',transmission:'Automatic',steering:'RHD',priceUSD:28000,priceUGX:103600000,imageUrl:'https://picsum.photos/seed/rav4-ug1/600/380',status:'Published',createdAt:'2026-04-08T00:00:00Z',mileage:22000,features:['ABS','Airbags','Air Conditioning','Power Windows','Hybrid','Reverse Camera']},
    {id:9,sku:'04-2026-105005',manufacturerId:1,make:'Toyota',model:'Voxy',color:'Silver',year:2022,chassis:'ZRR80-1234567',engineCC:2000,bodyType:'Van',subBodyType:'',fuelType:'Petrol',transmission:'Automatic',steering:'RHD',priceUSD:19000,priceUGX:70300000,imageUrl:'https://picsum.photos/seed/voxy-ug1/600/380',status:'Published',createdAt:'2026-04-06T00:00:00Z',mileage:32000,features:['ABS','Airbags','Air Conditioning','Power Windows','Reverse Camera']},
    {id:10,sku:'03-2026-104001',manufacturerId:2,make:'Nissan',model:'Patrol Y62',color:'White',year:2022,chassis:'Y62-0234567',engineCC:5600,bodyType:'SUV',subBodyType:'',fuelType:'Petrol',transmission:'Automatic',steering:'RHD',priceUSD:36500,priceUGX:135050000,imageUrl:'https://picsum.photos/seed/patrol-ug1/600/380',status:'Published',createdAt:'2026-03-28T00:00:00Z',mileage:28500,features:['ABS','Airbags','Air Conditioning','Power Windows','Reverse Camera','Leather Seats','Navigation','4WD','Sunroof']},
    {id:11,sku:'03-2026-104002',manufacturerId:2,make:'Nissan',model:'X-Trail',color:'Gray',year:2021,chassis:'NT32-1234567',engineCC:2500,bodyType:'SUV',subBodyType:'',fuelType:'Petrol',transmission:'Automatic',steering:'RHD',priceUSD:21000,priceUGX:77700000,imageUrl:'https://picsum.photos/seed/xtrail-ug1/600/380',status:'Published',createdAt:'2026-03-25T00:00:00Z',mileage:38000,features:['ABS','Airbags','Air Conditioning','Power Windows','Reverse Camera']},
    {id:12,sku:'03-2026-104003',manufacturerId:3,make:'Honda',model:'CRV',color:'White',year:2021,chassis:'RW1-1234567',engineCC:2000,bodyType:'SUV',subBodyType:'',fuelType:'Hybrid',transmission:'Automatic',steering:'RHD',priceUSD:23000,priceUGX:85100000,imageUrl:'https://picsum.photos/seed/crv-ug1/600/380',status:'Published',createdAt:'2026-03-22T00:00:00Z',mileage:31000,features:['ABS','Airbags','Air Conditioning','Power Windows','Reverse Camera']},
    {id:13,sku:'03-2026-104004',manufacturerId:3,make:'Honda',model:'Fit',color:'Red',year:2020,chassis:'GK5-1234567',engineCC:1500,bodyType:'Hatchback',subBodyType:'',fuelType:'Petrol',transmission:'Automatic',steering:'RHD',priceUSD:11000,priceUGX:40700000,imageUrl:'https://picsum.photos/seed/fit-ug1/600/380',status:'Published',createdAt:'2026-03-20T00:00:00Z',mileage:44000,features:['ABS','Airbags','Air Conditioning','Power Windows','Reverse Camera']},
    {id:14,sku:'03-2026-104005',manufacturerId:4,make:'Subaru',model:'Forester',color:'White',year:2023,chassis:'SKE-1234567',engineCC:2000,bodyType:'SUV',subBodyType:'',fuelType:'Hybrid',transmission:'Automatic',steering:'RHD',priceUSD:25000,priceUGX:92500000,imageUrl:'https://picsum.photos/seed/forester-ug1/600/380',status:'Published',createdAt:'2026-03-18T00:00:00Z',mileage:9500,features:['ABS','Airbags','Air Conditioning','Power Windows','Reverse Camera']},
    {id:15,sku:'03-2026-104006',manufacturerId:8,make:'Lexus',model:'RX350',color:'Black',year:2022,chassis:'GGL25-1234567',engineCC:3500,bodyType:'SUV',subBodyType:'',fuelType:'Petrol',transmission:'Automatic',steering:'RHD',priceUSD:38000,priceUGX:140600000,imageUrl:'https://picsum.photos/seed/lexusrx-ug1/600/380',status:'Published',createdAt:'2026-03-16T00:00:00Z',mileage:19000,features:['ABS','Airbags','Air Conditioning','Power Windows','Reverse Camera']},
    {id:16,sku:'02-2026-103001',manufacturerId:5,make:'Mitsubishi',model:'Pajero',color:'Silver',year:2020,chassis:'V93W-1234567',engineCC:3200,bodyType:'SUV',subBodyType:'',fuelType:'Diesel',transmission:'Automatic',steering:'RHD',priceUSD:24000,priceUGX:88800000,imageUrl:'https://picsum.photos/seed/pajero-ug1/600/380',status:'Sold',createdAt:'2026-02-20T00:00:00Z',mileage:55000,features:['ABS','Airbags','Air Conditioning','Power Windows','Reverse Camera']},
    {id:17,sku:'02-2026-103002',manufacturerId:6,make:'Isuzu',model:'D-Max',color:'White',year:2022,chassis:'TFR86-1234567',engineCC:3000,bodyType:'Pickup / D-Cabin',subBodyType:'D/Cabin',fuelType:'Diesel',transmission:'Manual',steering:'RHD',priceUSD:27000,priceUGX:99900000,imageUrl:'https://picsum.photos/seed/dmax-ug1/600/380',status:'Published',createdAt:'2026-02-18T00:00:00Z',mileage:33000,features:['ABS','Airbags','Air Conditioning','Power Windows','Reverse Camera']},
    {id:18,sku:'02-2026-103003',manufacturerId:7,make:'Land Rover',model:'Range Rover Vogue',color:'Black',year:2022,chassis:'L460-1234567',engineCC:3000,bodyType:'SUV',subBodyType:'',fuelType:'Petrol',transmission:'Automatic',steering:'RHD',priceUSD:85000,priceUGX:314500000,imageUrl:'https://picsum.photos/seed/rangerover-ug1/600/380',status:'Published',createdAt:'2026-02-15T00:00:00Z',mileage:21000,features:['ABS','Airbags','Air Conditioning','Power Windows','Reverse Camera']},
    {id:19,sku:'01-2026-102001',manufacturerId:7,make:'Land Rover',model:'Defender 110',color:'Gray',year:2021,chassis:'L663-1234567',engineCC:3000,bodyType:'SUV',subBodyType:'',fuelType:'Diesel',transmission:'Automatic',steering:'RHD',priceUSD:68000,priceUGX:251600000,imageUrl:'https://picsum.photos/seed/defender-ug1/600/380',status:'Draft',createdAt:'2026-01-20T00:00:00Z',mileage:18000,features:['ABS','Airbags','Air Conditioning','Power Windows','Reverse Camera']},
    {id:20,sku:'01-2026-102002',manufacturerId:1,make:'Toyota',model:'Crown',color:'White',year:2023,chassis:'JTZW1234567890123',engineCC:2500,bodyType:'Sedan',subBodyType:'Saloon',fuelType:'Hybrid',transmission:'Automatic',steering:'RHD',priceUSD:52000,priceUGX:192400000,imageUrl:'https://picsum.photos/seed/crownhybrid/600/380',status:'Published',createdAt:'2026-01-15T00:00:00Z',mileage:12000,features:['ABS','Airbags','Air Conditioning','Power Windows','Reverse Camera']}
  ];
  saveVehicles(vehicles);

  // Inquiries
  const inquiries = [
    {id:1,name:'Robert Ssekandi',email:'r.ssekandi@gmail.com',phone:'+256 701 234 567',vehicleInterest:'Toyota Land Cruiser Prado 2022',message:'I am interested in the Prado TX. Can you send me more details on pricing and availability?',date:'2026-05-10T00:00:00Z',status:'new'},
    {id:2,name:'Grace Nakato',email:'grace.nakato@yahoo.com',phone:'+256 772 345 678',vehicleInterest:'Toyota Fortuner GD6 2023',message:'Please send me the full cost including clearance fees to Kampala.',date:'2026-05-09T00:00:00Z',status:'contacted'},
    {id:3,name:'John Mugisha',email:'j.mugisha@hotmail.com',phone:'+256 782 456 789',vehicleInterest:'Toyota Hiace Super GL',message:'I need a Hiace for transporting staff. What are the payment terms?',date:'2026-05-08T00:00:00Z',status:'new'},
    {id:4,name:'Sarah Apio',email:'sarah.apio@gmail.com',phone:'+256 700 567 890',vehicleInterest:'Nissan Patrol Y62',message:'Is the Patrol still available? What is the CIF Kampala price?',date:'2026-05-07T00:00:00Z',status:'contacted'},
    {id:5,name:'Moses Kato',email:'moses.kato@gmail.com',phone:'+256 753 678 901',vehicleInterest:'Subaru Forester e-Boxer',message:'Looking for a hybrid SUV. Can you arrange a test drive?',date:'2026-05-06T00:00:00Z',status:'closed'},
    {id:6,name:'Fatima Hassan',email:'fatima.h@outlook.com',phone:'+256 712 789 012',vehicleInterest:'Lexus RX350 F-Sport',message:'What is the final price including URA duties?',date:'2026-05-05T00:00:00Z',status:'new'},
    {id:7,name:'David Otieno',email:'d.otieno@gmail.com',phone:'+256 701 890 123',vehicleInterest:'Honda CRV Hybrid 2021',message:'I need a family car with good fuel economy. Is this available?',date:'2026-05-04T00:00:00Z',status:'contacted'},
    {id:8,name:'Brenda Akello',email:'b.akello@gmail.com',phone:'+256 772 901 234',vehicleInterest:'Toyota RAV4 Hybrid',message:'Can I get financing options for this vehicle?',date:'2026-05-03T00:00:00Z',status:'closed'}
  ];
  DB.save('nau_inquiries', inquiries);

  // Quotes
  const quotes = [
    {id:1,quoteNo:'QT-2026-01',sku:'05-2026-106002',vehicleName:'Toyota Hilux D-Cabin 2025',year:2025,chassis:'MROYA3AV-703070476',customerName:'Musab Khalid',customerEmail:'khalid.musab@gmail.com',webPrice:49000,quotedPrice:49000,downPayment:70,reqDate:'2026-05-11',issDate:'2026-05-11',status:'Quoted'},
    {id:2,quoteNo:'QT-2026-02',sku:'03-2026-126183',vehicleName:'Mazda CX-5 2013',year:2013,chassis:'KE2AW-113678',customerName:'Timothy Kabangira',customerEmail:'timothykabangira@gmail.com',webPrice:8900,quotedPrice:8900,downPayment:70,reqDate:'2026-05-15',issDate:'2026-05-11',status:'Quoted'},
    {id:3,quoteNo:'QT-2026-03',sku:'04-2026-105001',vehicleName:'Toyota Land Cruiser Prado',year:2022,chassis:'GDJ150-0185234',customerName:'Grace Nakato',customerEmail:'grace.nakato@yahoo.com',webPrice:42000,quotedPrice:41500,downPayment:70,reqDate:'2026-05-09',issDate:'2026-05-09',status:'Accepted'},
    {id:4,quoteNo:'QT-2026-04',sku:'03-2026-104001',vehicleName:'Nissan Patrol Y62',year:2022,chassis:'Y62-0234567',customerName:'John Mugisha',customerEmail:'j.mugisha@hotmail.com',webPrice:36500,quotedPrice:36500,downPayment:70,reqDate:'2026-05-08',issDate:'2026-05-08',status:'Quoted'},
    {id:5,quoteNo:'QT-2026-05',sku:'03-2026-104006',vehicleName:'Mitsubishi Pajero 2020',year:2020,chassis:'V93W-1234567',customerName:'Muhammad Riaz',customerEmail:'m.riaz@email.com',webPrice:7000,quotedPrice:7000,downPayment:70,reqDate:'2026-05-09',issDate:'2026-05-09',status:'Quoted'},
    {id:6,quoteNo:'QT-2026-06',sku:'02-2026-103003',vehicleName:'Land Rover Range Rover Vogue',year:2022,chassis:'L460-1234567',customerName:'Robert Ssekandi',customerEmail:'r.ssekandi@gmail.com',webPrice:85000,quotedPrice:84000,downPayment:70,reqDate:'2026-05-08',issDate:'2026-05-08',status:'Accepted'}
  ];
  DB.save('nau_quotes', quotes);

  // Variables — Body Types
  DB.save('nau_var_body_types', [
    {id:1,name:'Saloon',route:'saloon',status:true,createdAt:'2026-03-16T03:15:00Z',updatedAt:'2026-03-16T03:15:00Z'},
    {id:2,name:'S/Cabin',route:'scabin',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:3,name:'Mini SUV',route:'mini-suv',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:4,name:'D/Cabin',route:'dcabin',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:5,name:'SUV',route:'suv',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:6,name:'Wagon',route:'wagon',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:7,name:'Van',route:'van',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:8,name:'Hatchback',route:'hatchback',status:false,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'}
  ]);
  DB.save('nau_var_fuel_types', [
    {id:1,name:'Diesel',route:'diesel',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:2,name:'Petrol',route:'petrol',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:3,name:'Hybrid',route:'hybrid',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:4,name:'Electric',route:'electric',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:5,name:'Petrol/Gasoline',route:'petrol-gasoline',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'}
  ]);
  DB.save('nau_var_transmissions', [
    {id:1,name:'Automatic',route:'automatic',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:2,name:'Manual',route:'manual',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'}
  ]);
  DB.save('nau_var_steering_positions', [
    {id:1,name:'Right Hand Drive',route:'rhd',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:2,name:'Left Hand Drive',route:'lhd',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'}
  ]);
  DB.save('nau_var_vehicle_grades', [
    {id:1,name:'Grade 5',route:'grade-5',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:2,name:'Grade 4.5',route:'grade-4-5',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:3,name:'Grade 4',route:'grade-4',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:4,name:'Grade 3.5',route:'grade-3-5',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'}
  ]);
  DB.save('nau_var_sub_body_types', [
    {id:1,name:'Standard Cab',route:'standard-cab',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:2,name:'Extra Cab',route:'extra-cab',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:3,name:'Double Cab',route:'double-cab',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:4,name:'Minivan',route:'minivan',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:5,name:'Crossover',route:'crossover',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'}
  ]);
  DB.save('nau_var_colours', [
    {id:1,name:'White',route:'white',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:2,name:'Black',route:'black',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:3,name:'Silver',route:'silver',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:4,name:'Red',route:'red',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:5,name:'Blue',route:'blue',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:6,name:'Grey',route:'grey',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:7,name:'Pearl White',route:'pearl-white',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:8,name:'Champagne Gold',route:'champagne-gold',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'}
  ]);
  DB.save('nau_var_drivetrains', [
    {id:1,name:'2WD',route:'2wd',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:2,name:'4WD',route:'4wd',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:3,name:'AWD',route:'awd',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'}
  ]);
  DB.save('nau_var_steering_types', [
    {id:1,name:'Power Steering',route:'power-steering',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:2,name:'Electric Power Steering',route:'eps',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:3,name:'Manual Steering',route:'manual-steering',status:false,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'}
  ]);
  DB.save('nau_var_steering_assist', [
    {id:1,name:'Hydraulic',route:'hydraulic',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:2,name:'Electric',route:'electric',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:3,name:'None',route:'none',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'}
  ]);
  DB.save('nau_var_steering_control', [
    {id:1,name:'Standard',route:'standard',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:2,name:'Sport',route:'sport',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:3,name:'Off-Road',route:'off-road',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'}
  ]);
  DB.save('nau_var_condition_grades', [
    {id:1,name:'Excellent',route:'excellent',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:2,name:'Good',route:'good',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:3,name:'Fair',route:'fair',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:4,name:'Poor',route:'poor',status:false,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'}
  ]);
  DB.save('nau_var_feature_groups', [
    {id:1,name:'Safety',route:'safety',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:2,name:'Comfort',route:'comfort',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:3,name:'Technology',route:'technology',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:4,name:'Performance',route:'performance',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:5,name:'Exterior',route:'exterior',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'}
  ]);
  DB.save('nau_var_features', [
    {id:1,name:'ABS',route:'abs',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:2,name:'Airbags',route:'airbags',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:3,name:'Sunroof',route:'sunroof',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:4,name:'Leather Seats',route:'leather-seats',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:5,name:'Reverse Camera',route:'reverse-camera',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:6,name:'Cruise Control',route:'cruise-control',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:7,name:'Navigation System',route:'navigation',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'}
  ]);
  DB.save('nau_var_tags', [
    {id:1,name:'New Arrival',route:'new-arrival',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:2,name:'Hot Deal',route:'hot-deal',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:3,name:'Low Mileage',route:'low-mileage',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:4,name:'One Owner',route:'one-owner',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'},
    {id:5,name:'Japanese Import',route:'japanese-import',status:true,createdAt:'2026-03-16T03:14:00Z',updatedAt:'2026-03-16T03:14:00Z'}
  ]);

  // Reviews
  DB.save('nau_reviews', [
    {id:1,customer:'Robert Ssekandi',vehicle:'Toyota Land Cruiser Prado 2022',rating:5,text:'Excellent service from start to finish. The Prado arrived in perfect condition. NipponAuto handled all the paperwork seamlessly.',approved:true,date:'2026-04-15T00:00:00Z',createdAt:'2026-04-15T00:00:00Z'},
    {id:2,customer:'Grace Nakato',vehicle:'Toyota Fortuner GD6 2023',rating:5,text:'My Fortuner is exactly as described. Only 12,500km and in showroom condition. Will definitely buy from NipponAuto again!',approved:true,date:'2026-04-10T00:00:00Z',createdAt:'2026-04-10T00:00:00Z'},
    {id:3,customer:'John Mugisha',vehicle:'Nissan Patrol Y62 2022',rating:4,text:'Good experience overall. The car is fantastic. The import process took a bit longer than expected but the team kept me updated throughout.',approved:true,date:'2026-03-28T00:00:00Z',createdAt:'2026-03-28T00:00:00Z'},
    {id:4,customer:'Sarah Apio',vehicle:'Toyota RAV4 Hybrid 2021',rating:5,text:'Best hybrid SUV for Kampala traffic. Fuel savings are real! NipponAuto gave me the best price.',approved:false,date:'2026-05-02T00:00:00Z',createdAt:'2026-05-02T00:00:00Z'}
  ]);

  // Service Plans
  DB.save('nau_service_plans', [
    {id:1,name:'Basic',price:199,duration:6,features:['Engine oil change (every 5,000km)','Tyre rotation','Basic inspection report'],createdAt:'2026-03-16T00:00:00Z'},
    {id:2,name:'Standard',price:349,duration:12,features:['Everything in Basic','Air filter replacement','Brake inspection','Battery check','Full inspection report'],createdAt:'2026-03-16T00:00:00Z'},
    {id:3,name:'Premium',price:599,duration:12,features:['Everything in Standard','Transmission fluid change','Coolant flush','Wiper blades','Priority scheduling','Free roadside assistance'],createdAt:'2026-03-16T00:00:00Z'}
  ]);

  // Auctions
  DB.save('nau_auctions', [
    {id:1,vehicle:'Toyota Land Cruiser 200 Series 2019',startDate:'2026-06-01',endDate:'2026-06-07',startingBid:35000,currentBid:35000,status:'Upcoming',createdAt:'2026-05-15T00:00:00Z'},
    {id:2,vehicle:'Lexus LX570 2018',startDate:'2026-05-20',endDate:'2026-05-27',startingBid:55000,currentBid:58500,status:'Active',createdAt:'2026-05-10T00:00:00Z'}
  ]);

  // Careers
  DB.save('nau_careers', [
    {id:1,title:'Sales Executive',department:'Sales',location:'Kampala, Uganda',type:'Full-time',description:'We are looking for an experienced Sales Executive to join our growing team. You will manage client relationships and drive vehicle sales.',status:'Open',applications:8,postedAt:'2026-05-01T00:00:00Z'},
    {id:2,title:'Vehicle Inspector',department:'Operations',location:'Nakawa, Kampala',type:'Full-time',description:'Responsible for inspecting imported vehicles upon arrival and preparing condition reports for clients.',status:'Open',applications:3,postedAt:'2026-05-05T00:00:00Z'},
    {id:3,title:'Finance Officer',department:'Finance',location:'Kampala, Uganda',type:'Full-time',description:'Manage vehicle financing applications, liaise with banks, and support customers with import cost calculations.',status:'Closed',applications:12,postedAt:'2026-04-10T00:00:00Z'}
  ]);

  // Newsletter Subscribers
  DB.save('nau_newsletter', [
    {id:1,name:'Robert Ssekandi',email:'r.ssekandi@gmail.com',status:true,subscribedAt:'2026-03-10T00:00:00Z'},
    {id:2,name:'Grace Nakato',email:'grace.nakato@yahoo.com',status:true,subscribedAt:'2026-03-15T00:00:00Z'},
    {id:3,name:'John Mugisha',email:'j.mugisha@hotmail.com',status:true,subscribedAt:'2026-04-01T00:00:00Z'},
    {id:4,name:'Sarah Apio',email:'sarah.apio@gmail.com',status:false,subscribedAt:'2026-04-10T00:00:00Z'},
    {id:5,name:'Moses Kato',email:'moses.kato@gmail.com',status:true,subscribedAt:'2026-05-01T00:00:00Z'}
  ]);

  // Campaigns
  DB.save('nau_campaigns', [
    {id:1,name:'May Eid Promotion',channel:'Email',target:'All subscribers',scheduledDate:'2026-05-01',status:'Sent',createdAt:'2026-04-28T00:00:00Z'},
    {id:2,name:'Hilux D-Cabin Launch',channel:'Social Media',target:'Kampala region',scheduledDate:'2026-06-01',status:'Draft',createdAt:'2026-05-10T00:00:00Z'}
  ]);

  // Support Tickets
  DB.save('nau_support', [
    {id:1,customer:'Robert Ssekandi',email:'r.ssekandi@gmail.com',subject:'Delivery timeline for Prado',priority:'High',message:'I paid the deposit 3 weeks ago. When should I expect the Prado to arrive in Kampala?',status:'In Progress',date:'2026-05-10T00:00:00Z',createdAt:'2026-05-10T00:00:00Z'},
    {id:2,customer:'Grace Nakato',email:'grace.nakato@yahoo.com',subject:'Need invoice for URA',priority:'Medium',message:'Please send me a formal invoice so I can process customs at URA.',status:'Resolved',date:'2026-05-08T00:00:00Z',createdAt:'2026-05-08T00:00:00Z'},
    {id:3,customer:'Moses Kato',email:'moses.kato@gmail.com',subject:'Query about hybrid fuel consumption',priority:'Low',message:'I am considering the RAV4 Hybrid. Can you tell me the average fuel consumption in Kampala traffic?',status:'Open',date:'2026-05-12T00:00:00Z',createdAt:'2026-05-12T00:00:00Z'}
  ]);

  // Promotions
  DB.save('nau_promos', [
    {id:1,title:'Eid Special — 10% Off Hilux',discount:10,startDate:'2026-05-01',endDate:'2026-05-31',status:true,createdAt:'2026-04-28T00:00:00Z'},
    {id:2,title:'New Arrival Flash Sale — 5% Off',discount:5,startDate:'2026-06-01',endDate:'2026-06-15',status:false,createdAt:'2026-05-10T00:00:00Z'}
  ]);

  // Orders
  DB.save('nau_orders', [
    {id:1,orderNo:'ORD-2026-01',customerName:'Grace Nakato',vehicleName:'Toyota Land Cruiser Prado 2022',amount:42000,date:'2026-05-09',status:'Confirmed',createdAt:'2026-05-09T00:00:00Z'},
    {id:2,orderNo:'ORD-2026-02',customerName:'Robert Ssekandi',vehicleName:'Land Rover Range Rover Vogue 2022',amount:84000,date:'2026-05-08',status:'Shipped',createdAt:'2026-05-08T00:00:00Z'},
    {id:3,orderNo:'ORD-2026-03',customerName:'John Mugisha',vehicleName:'Toyota Hilux D-Cabin 2025',amount:49000,date:'2026-05-12',status:'Pending',createdAt:'2026-05-12T00:00:00Z'}
  ]);

  // Admin Users
  DB.save('nau_users', [
    {id:1,name:'Super Admin',email:'info@nipponauto.ug',role:'Super Admin',status:true,lastLogin:nowISO(),createdAt:'2026-01-01T00:00:00Z'},
    {id:2,name:'David Otieno',email:'d.otieno@nipponauto.ug',role:'Manager',status:true,lastLogin:'2026-05-15T08:30:00Z',createdAt:'2026-02-01T00:00:00Z'},
    {id:3,name:'Brenda Akello',email:'b.akello@nipponauto.ug',role:'Staff',status:true,lastLogin:'2026-05-16T09:00:00Z',createdAt:'2026-03-01T00:00:00Z'}
  ]);

  // Customers
  if (!localStorage.getItem('nau_customers')) {
    localStorage.setItem('nau_customers', JSON.stringify([
      {id:1,name:'John Mugisha',email:'customer@nipponauto.ug',phone:'+256 700 100 200',password:'customer123',joinedAt:'2026-01-15T00:00:00Z'},
      {id:2,name:'Grace Nakato',email:'grace@nipponauto.ug',phone:'+256 700 300 400',password:'grace456',joinedAt:'2026-02-10T00:00:00Z'}
    ]));
  }

  // Slides
  DB.save('nau_slides', [
    {id:1,title:'Kampala\'s #1 Source for Genuine Japanese Cars',subtitle:'Uganda\'s Most Trusted Japanese Car Importer Since 2012',imageUrl:'https://picsum.photos/seed/kampala-hero1/1600/900',ctaText:'Browse Cars',ctaLink:'../inventory.html',sortOrder:1,status:true,createdAt:nowISO()},
    {id:2,title:'The Best SUVs for Uganda\'s Roads',subtitle:'Built for Kampala traffic and upcountry terrain',imageUrl:'https://picsum.photos/seed/kampala-hero2/1600/900',ctaText:'View SUVs',ctaLink:'../inventory.html?body=suv',sortOrder:2,status:true,createdAt:nowISO()},
    {id:3,title:'Trusted by Over 2,000 Ugandan Families',subtitle:'We handle everything — sourcing, shipping, customs, delivery',imageUrl:'https://picsum.photos/seed/kampala-hero3/1600/900',ctaText:'Our Story',ctaLink:'../about.html',sortOrder:3,status:true,createdAt:nowISO()}
  ]);

  // FAQs
  DB.save('nau_faqs', [
    {id:1,question:'How long does it take to import a car from Japan to Uganda?',answer:'Typically 6–8 weeks from purchase to delivery in Kampala, including shipping (4–5 weeks) and customs clearing at Mombasa (1–2 weeks).',category:'Shipping',status:true,createdAt:nowISO()},
    {id:2,question:'Do you handle URA customs clearance?',answer:'Yes, we handle all customs clearing at Mombasa port, URA duties, SGR transit to Kampala, and Uganda registration paperwork.',category:'Customs',status:true,createdAt:nowISO()},
    {id:3,question:'What is the minimum deposit to reserve a vehicle?',answer:'We require a 30% deposit to reserve your vehicle while we arrange shipping from Japan.',category:'Payment',status:true,createdAt:nowISO()}
  ]);

  // Freights
  DB.save('nau_freights', [
    {id:1,region:'East Africa (via Mombasa)',method:'RORO',cost:'1,800',days:'35',notes:'Standard route for Uganda'},
    {id:2,region:'East Africa (via Mombasa)',method:'Container 20ft',cost:'2,200',days:'40',notes:'Single vehicle container'},
    {id:3,region:'West Africa',method:'RORO',cost:'2,400',days:'45',notes:''}
  ]);

  // Locations
  DB.save('nau_locations', [
    {id:1,name:'Nakawa Showroom',address:'Plot 45, Nakawa Industrial Road',city:'Kampala',phone:'+256 700 123 456',primary:true}
  ]);

  // Seed invoices (3)
  if (!DB.load('nau_invoices').length) {
    const invSeed = [
      { id:1, invoiceNo:'INV-2026-001', vehicleId:1, vehicleName:'Toyota Hilux D-Cabin Silver 2020', vehicleSKU:'05-2026-106001',
        customerName:'Musab Khalid', customerEmail:'musab@email.com', customerPhone:'+256700111222', customerAddress:'Kampala, Uganda',
        salePrice:39000, discount:0, taxRate:18, taxAmount:7020, totalAmount:46020, currency:'USD', paidAmount:46020,
        paymentMethod:'Bank Transfer', status:'Paid', dueDate:'2026-03-15', notes:'Full payment received.',
        createdAt:'2026-03-01T09:00:00Z', paidAt:'2026-03-10T14:00:00Z' },
      { id:2, invoiceNo:'INV-2026-002', vehicleId:5, vehicleName:'Toyota Land Cruiser Prado White 2022', vehicleSKU:'04-2026-105001',
        customerName:'Grace Nakato', customerEmail:'grace@email.com', customerPhone:'+256701333444', customerAddress:'Entebbe, Uganda',
        salePrice:42000, discount:1000, taxRate:18, taxAmount:7380, totalAmount:48380, currency:'USD', paidAmount:25000,
        paymentMethod:'MTN Mobile Money', status:'Partially Paid', dueDate:'2026-04-30', notes:'Installment payment agreed.',
        createdAt:'2026-04-01T10:00:00Z', paidAt:null },
      { id:3, invoiceNo:'INV-2026-003', vehicleId:10, vehicleName:'Nissan Patrol Y62 White 2022', vehicleSKU:'03-2026-104001',
        customerName:'Robert Ssekandi', customerEmail:'robert@email.com', customerPhone:'+256702555666', customerAddress:'Jinja, Uganda',
        salePrice:36500, discount:0, taxRate:0, taxAmount:0, totalAmount:36500, currency:'USD', paidAmount:0,
        paymentMethod:'Cash', status:'Sent', dueDate:'2026-05-30', notes:'Invoice sent, awaiting payment.',
        createdAt:'2026-05-01T08:00:00Z', paidAt:null }
    ];
    DB.save('nau_invoices', invSeed);
  }

  // Seed bills (3)
  if (!DB.load('nau_bills').length) {
    const billSeed = [
      { id:1, billNo:'BILL-2026-001', vendor:'Japan Auto Exports Ltd', category:'Vehicle Purchase',
        vehicleId:1, vehicleName:'Toyota Hilux D-Cabin Silver 2020',
        description:'Purchase price for Toyota Hilux D-Cabin Silver 2020 from Japan auction',
        amount:22000, currency:'USD', dueDate:'2026-02-28', status:'Paid',
        paymentMethod:'Bank Transfer', notes:'Wire transfer to Japan.', createdAt:'2026-02-01T09:00:00Z', paidAt:'2026-02-20T12:00:00Z' },
      { id:2, billNo:'BILL-2026-002', vendor:'Kampala Freight Services', category:'Freight',
        vehicleId:5, vehicleName:'Toyota Land Cruiser Prado White 2022',
        description:'Sea freight + customs clearance for Prado from Mombasa',
        amount:3500, currency:'USD', dueDate:'2026-04-15', status:'Paid',
        paymentMethod:'Bank Transfer', notes:'', createdAt:'2026-04-01T09:00:00Z', paidAt:'2026-04-10T10:00:00Z' },
      { id:3, billNo:'BILL-2026-003', vendor:'Nakawa Office Supplies', category:'Office Supplies',
        vehicleId:null, vehicleName:null,
        description:'Monthly office stationery and supplies',
        amount:250, currency:'USD', dueDate:'2026-05-31', status:'Pending',
        paymentMethod:'Cash', notes:'', createdAt:'2026-05-01T09:00:00Z', paidAt:null }
    ];
    DB.save('nau_bills', billSeed);
  }

  // Seed payments (2)
  if (!DB.load('nau_payments').length) {
    const pmtSeed = [
      { id:1, paymentNo:'PMT-2026-001', type:'invoice', referenceId:1, referenceNo:'INV-2026-001',
        amount:46020, currency:'USD', method:'Bank Transfer', date:'2026-03-10', notes:'Full payment', receiptId:1 },
      { id:2, paymentNo:'PMT-2026-002', type:'invoice', referenceId:2, referenceNo:'INV-2026-002',
        amount:25000, currency:'USD', method:'MTN Mobile Money', date:'2026-04-05', notes:'First installment', receiptId:2 }
    ];
    DB.save('nau_payments', pmtSeed);
  }

  // Seed receipts (2)
  if (!DB.load('nau_receipts').length) {
    const recSeed = [
      { id:1, receiptNo:'REC-2026-001', paymentId:1, paymentNo:'PMT-2026-001', type:'invoice', referenceId:1, referenceNo:'INV-2026-001',
        issuedTo:'Musab Khalid', amount:46020, currency:'USD', method:'Bank Transfer', issuedAt:'2026-03-10T14:00:00Z', notes:'Full payment' },
      { id:2, receiptNo:'REC-2026-002', paymentId:2, paymentNo:'PMT-2026-002', type:'invoice', referenceId:2, referenceNo:'INV-2026-002',
        issuedTo:'Grace Nakato', amount:25000, currency:'USD', method:'MTN Mobile Money', issuedAt:'2026-04-05T11:00:00Z', notes:'First installment' }
    ];
    DB.save('nau_receipts', recSeed);
  }

  if (!DB.load('nau_payment_accounts').length) {
    DB.save('nau_payment_accounts', [
      { id:1, name:'Stanbic USD', type:'Bank', currency:'USD', bankName:'Stanbic Bank Uganda', accountNumber:'9030005754211', accountHolder:'NipponAuto Uganda Ltd', status:'Active', createdAt:nowISO() },
      { id:2, name:'Stanbic UGX', type:'Bank', currency:'UGX', bankName:'Stanbic Bank Uganda', accountNumber:'9030005754228', accountHolder:'NipponAuto Uganda Ltd', status:'Active', createdAt:nowISO() },
      { id:3, name:'Cash USD', type:'Cash', currency:'USD', bankName:'', accountNumber:'', accountHolder:'NipponAuto Uganda Ltd', status:'Active', createdAt:nowISO() },
      { id:4, name:'Cash UGX', type:'Cash', currency:'UGX', bankName:'', accountNumber:'', accountHolder:'NipponAuto Uganda Ltd', status:'Active', createdAt:nowISO() },
      { id:5, name:'MTN Mobile Money', type:'Mobile Money', currency:'UGX', bankName:'MTN Uganda', accountNumber:'+256700123456', accountHolder:'NipponAuto Uganda', status:'Active', createdAt:nowISO() },
      { id:6, name:'Airtel Money', type:'Mobile Money', currency:'UGX', bankName:'Airtel Uganda', accountNumber:'+256701123456', accountHolder:'NipponAuto Uganda', status:'Active', createdAt:nowISO() }
    ]);
  }

  // Appointments
  if (!DB.load('nau_appointments').length) {
    DB.save('nau_appointments', [
      {id:1, customerName:'Timothy Kabangira', customerPhone:'+256 701 234 567', customerEmail:'timothy@gmail.com', vehicleName:'Toyota Hilux D-Cab 2025', date:'2026-06-01', time:'10:00 AM', type:'Test Drive', status:'Confirmed', notes:'Interested in financing', createdAt:'2026-05-18T09:00:00Z'},
      {id:2, customerName:'Grace Nakato', customerPhone:'+256 702 345 678', customerEmail:'grace.nakato@yahoo.com', vehicleName:'Toyota Land Cruiser Prado 2022', date:'2026-06-02', time:'2:00 PM', type:'Viewing', status:'Pending', notes:'', createdAt:'2026-05-18T10:00:00Z'},
      {id:3, customerName:'Robert Ssekandi', customerPhone:'+256 703 456 789', customerEmail:'robert@email.com', vehicleName:'Lexus RX350 2022', date:'2026-05-28', time:'11:00 AM', type:'Test Drive', status:'Completed', notes:'Very interested, requested quote', createdAt:'2026-05-17T08:00:00Z'}
    ]);
  }

  // Finance Partners
  if (!DB.load('nau_finance_partners').length) {
    DB.save('nau_finance_partners', [
      {id:1, name:'Stanbic Bank Uganda', logoUrl:'', interestRate:18, maxTenure:60, minAmountUSD:5000, maxAmountUSD:100000, description:'Leading bank for vehicle financing in Uganda', applyUrl:'https://stanbicbank.co.ug', status:true},
      {id:2, name:'Centenary Bank', logoUrl:'', interestRate:20, maxTenure:48, minAmountUSD:3000, maxAmountUSD:50000, description:'Trusted community bank with flexible terms', applyUrl:'https://centenarybank.co.ug', status:true},
      {id:3, name:'DFCU Bank', logoUrl:'', interestRate:19, maxTenure:60, minAmountUSD:5000, maxAmountUSD:80000, description:'Development Finance Company of Uganda', applyUrl:'https://dfcugroup.com', status:true}
    ]);
  }

  // Stock Alerts
  if (!DB.load('nau_alerts').length) {
    DB.save('nau_alerts', [
      {id:1, customerName:'James Opolot', customerEmail:'james.opolot@gmail.com', customerPhone:'+256 704 111 222', make:'Toyota', model:'Land Cruiser Prado', maxPriceUSD:40000, fuelType:'Diesel', bodyType:'SUV', status:'Active', notes:'Prefers white or silver, 2020+', createdAt:'2026-05-10T09:00:00Z'},
      {id:2, customerName:'Fatima Hassan', customerEmail:'fatima.hassan@outlook.com', customerPhone:'+256 705 333 444', make:'Nissan', model:'Patrol', maxPriceUSD:35000, fuelType:'Petrol', bodyType:'SUV', status:'Active', notes:'V8 preferred', createdAt:'2026-05-12T10:00:00Z'}
    ]);
  }

  localStorage.setItem('nau_seeded', '1');
}

// ===== SEED EXTRAS (blogs, appointments — guarded independently) =====
function seedExtras() {
  if (!DB.load('nau_blogs').length) {
    DB.save('nau_blogs', [
      {
        id: 1, title: 'How to Import a Japanese Car to Uganda', slug: 'how-to-import-japanese-car-uganda',
        excerpt: 'Everything you need to know about importing directly from Japan — auction grades, shipping, Mombasa clearing, and Uganda customs duties explained step by step.',
        content: `Importing a Japanese vehicle to Uganda involves several stages, each with its own costs and timelines.\n\n**Step 1: Purchase at Auction**\nVehicles are sourced from Japanese auto auctions (USS, JAA, TAA). Our agents bid on your behalf. Auction grades of 4 and above ensure you get a quality vehicle.\n\n**Step 2: Shipping**\nVehicles are shipped via RORO (Roll-On Roll-Off) or container from ports like Yokohama or Osaka. Transit to Mombasa takes 3–5 weeks.\n\n**Step 3: Mombasa Clearing**\nOn arrival at Mombasa, the vehicle is cleared through Kenya customs. This involves paying import duties, VAT, and IDF fees. Our clearing agents handle all paperwork.\n\n**Step 4: Road Transport to Uganda**\nVehicles are transported by truck from Mombasa to Kampala (typically 3–5 days). We handle all transit documentation.\n\n**Step 5: Uganda Registration**\nFinally, the vehicle is registered with URA. You receive number plates and a logbook in your name.\n\nTotal timeline from auction to your driveway: 8–12 weeks. Contact us for a personalised import quote.`,
        category: 'Import Tips', status: 'Published', author: 'NipponAuto Team',
        imageUrl: 'https://picsum.photos/seed/blog1/800/400',
        createdAt: '2026-04-10T09:00:00.000Z'
      },
      {
        id: 2, title: 'Understanding Japanese Auction Grades', slug: 'understanding-japanese-auction-grades',
        excerpt: 'Grade 4, Grade 4.5, Grade 5 — what do they mean and why does NipponAuto only import Grade 4 and above? We explain the full grading system.',
        content: `Japanese auto auctions use a standardised grading system to rate vehicle condition. Understanding these grades helps you make confident buying decisions.\n\n**Grade 5 — Excellent**\nNearly new condition. May be ex-dealer demo or very low mileage. Exterior and interior near-perfect.\n\n**Grade 4.5 — Very Good Plus**\nMinor blemishes only. Typically under 30,000km with very light use.\n\n**Grade 4 — Very Good**\nNipponAuto's minimum standard. Small scratches or minor dents acceptable. Interior clean and fresh.\n\n**Grade 3.5 — Good Plus**\nVisible scratches or dents. May require minor bodywork. NipponAuto does not import below Grade 4.\n\n**Auction Sheet Marks**\nEach vehicle comes with an auction sheet showing exact faults. Common marks: A (scratch), U (dent), W (warp), C (crack). Numbers indicate severity (1–3).\n\nAlways ask to see the auction sheet before purchasing. NipponAuto provides this for every vehicle we import.`,
        category: 'Guides', status: 'Published', author: 'NipponAuto Team',
        imageUrl: 'https://picsum.photos/seed/blog2/800/400',
        createdAt: '2026-04-20T10:00:00.000Z'
      },
      {
        id: 3, title: 'Top 5 Family SUVs Available in Uganda 2026', slug: 'top-5-family-suvs-uganda-2026',
        excerpt: 'Looking for the perfect family SUV? We rank the top 5 models available in Uganda right now — from the legendary Prado to the practical Fortuner.',
        content: `Uganda's roads demand a capable, comfortable SUV. Here are our top 5 picks for families in 2026.\n\n**1. Toyota Land Cruiser Prado (Grade 4+)**\nThe undisputed king of Uganda's roads. The 150 series Prado combines luxury, reliability, and off-road capability. Available in diesel (2.8L) and petrol (4.0L). Prices from UGX 145M.\n\n**2. Toyota Fortuner GD6**\nBuilt on a truck chassis for serious off-road use. The 2.8L diesel engine delivers excellent torque. 7-seater option available. Prices from UGX 115M.\n\n**3. Nissan Patrol Y62**\nV8 5.6L petrol luxury cruiser. Best for highway driving and urban comfort. Unmatched cabin space. Prices from UGX 130M.\n\n**4. Subaru Forester e-Boxer**\nThe most fuel-efficient option. Hybrid technology reduces running costs significantly. Perfect for school runs and city use. Prices from UGX 90M.\n\n**5. Toyota RAV4 Hybrid**\nCompact, economical, and surprisingly capable. The hybrid system gives excellent fuel economy. Ideal for the family that doesn't need heavy off-road performance. Prices from UGX 95M.\n\nAll models above are available in our current stock. Visit our showroom or browse online.`,
        category: 'Market News', status: 'Published', author: 'NipponAuto Team',
        imageUrl: 'https://picsum.photos/seed/blog3/800/400',
        createdAt: '2026-05-01T08:00:00.000Z'
      }
    ]);
  }

  if (!DB.load('nau_appointments').length) {
    DB.save('nau_appointments', [
      { id: 1, customerName: 'David Ssekandi', email: 'david@example.com', phone: '+256 772 111 222', vehicleInterest: 'Toyota Prado 2022', date: '2026-05-22', time: '10:00', notes: '', status: 'Confirmed', createdAt: '2026-05-18T08:00:00.000Z' },
      { id: 2, customerName: 'Fatuma Nakato', email: 'fatuma@example.com', phone: '+256 700 333 444', vehicleInterest: 'Nissan Patrol V8', date: '2026-05-24', time: '14:00', notes: 'Interested in financing options', status: 'Pending', createdAt: '2026-05-18T10:00:00.000Z' },
      { id: 3, customerName: 'Robert Mukasa', email: 'robert@example.com', phone: '+256 782 555 666', vehicleInterest: 'Toyota Hilux D-Cab', date: '2026-05-20', time: '09:00', notes: '', status: 'Completed', createdAt: '2026-05-15T11:00:00.000Z' }
    ]);
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Auth check
  if (AUTH.isLoggedIn()) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminShell').classList.add('visible');
    seedData();
    seedExtras();
    archiveOldSoldVehicles();
    initVarTabs();
    navigate('dashboard');
  }

  // Login
  document.getElementById('loginBtn').addEventListener('click', () => {
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value;
    if (AUTH.login(u, p)) {
      document.getElementById('loginError').style.display = 'none';
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('adminShell').classList.add('visible');
      seedData();
      seedExtras();
      archiveOldSoldVehicles();
      initVarTabs();
      navigate('dashboard');
    } else {
      document.getElementById('loginError').style.display = 'block';
    }
  });

  document.getElementById('loginPass').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    AUTH.logout();
    document.getElementById('adminShell').classList.remove('visible');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
  });

  // Nav clicks
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      navigate(el.dataset.nav);
    });
  });

  // Dashboard sub-tabs
  document.querySelectorAll('.sub-tab[data-dash]').forEach(btn => {
    btn.addEventListener('click', () => renderDash(btn.dataset.dash));
  });

  // Modal backdrop click
  document.getElementById('modalBackdrop').addEventListener('click', e => {
    if (e.target === document.getElementById('modalBackdrop')) closeModal();
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // ===== MOBILE NAV =====
  const adminHamburger = document.getElementById('adminHamburger');
  const adminMobileNav = document.getElementById('adminMobileNav');
  const adminNavOverlay = document.getElementById('adminNavOverlay');
  const adminNavClose = document.getElementById('adminNavClose');

  function openAdminNav() {
    adminMobileNav.classList.add('open');
    adminNavOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeAdminNav() {
    adminMobileNav.classList.remove('open');
    adminNavOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  adminHamburger.addEventListener('click', openAdminNav);
  adminNavClose.addEventListener('click', closeAdminNav);
  adminNavOverlay.addEventListener('click', closeAdminNav);

  // Accordion groups in mobile nav
  document.querySelectorAll('.amn-group-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const sub = btn.nextElementSibling;
      sub.classList.toggle('open');
      btn.classList.toggle('expanded');
    });
  });

  // Nav links in mobile drawer
  document.querySelectorAll('.admin-mobile-nav [data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      navigate(el.dataset.nav);
      closeAdminNav();
    });
  });

  // Mobile nav logout
  document.getElementById('adminNavLogout').addEventListener('click', () => {
    AUTH.logout();
    closeAdminNav();
    document.getElementById('adminShell').classList.remove('visible');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
  });
});
