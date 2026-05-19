'use strict';
(function(){
  var session=null;
  try{session=JSON.parse(sessionStorage.getItem('nau_customer_session'));}catch(e){}
  if(!session){window.location.href='../login.html';return;}
  document.getElementById('cUserBadge').textContent='👤 '+session.name;
  function load(key){try{return JSON.parse(localStorage.getItem(key)||'[]');}catch(e){return[];}}
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function navigate(page){
    document.querySelectorAll('.c-page').forEach(function(p){p.classList.remove('active');});
    document.querySelectorAll('.cs-nav-item').forEach(function(b){b.classList.remove('active');});
    var t=document.getElementById('cpage-'+page);
    if(t)t.classList.add('active');
    var btn=document.querySelector('[data-page="'+page+'"]');
    if(btn)btn.classList.add('active');
    var titles={dashboard:'Dashboard',inquiries:'My Inquiries',quotes:'My Quotes',saved:'Saved Vehicles',profile:'My Profile',journey:'Vehicle Journey',alerts:'Stock Alerts','book-appointment':'Book Appointment','my-invoices':'My Invoices'};
    document.getElementById('cPageTitle').textContent=titles[page]||page;
    if(page==='dashboard')renderDash();
    if(page==='inquiries')renderInquiries();
    if(page==='quotes')renderQuotes();
    if(page==='saved')renderSaved();
    if(page==='profile')renderProfile();
    if(page==='journey')renderJourney();
    if(page==='alerts')renderAlerts();
    if(page==='book-appointment')renderBookAppointment();
    if(page==='my-invoices')renderMyInvoices();
  }
  document.querySelectorAll('.cs-nav-item').forEach(function(btn){btn.addEventListener('click',function(){navigate(this.dataset.page);});});
  document.getElementById('logoutBtn').addEventListener('click',function(){sessionStorage.removeItem('nau_customer_session');window.location.href='../login.html';});
  function renderDash(){
    initNotifications();
    var inqs=load('nau_inquiries').filter(function(i){return i.email&&i.email.toLowerCase()===session.email.toLowerCase();});
    var qts=load('nau_quotes').filter(function(q){return q.customerEmail&&q.customerEmail.toLowerCase()===session.email.toLowerCase();});
    var saved=load('nau_saved_'+session.id);
    document.getElementById('cWelcome').innerHTML='<h2>Welcome back, '+esc(session.name)+'! 👋</h2><p>Here\'s a summary of your account activity.</p>';
    document.getElementById('cStatsGrid').innerHTML='<div class="c-stat-card"><div class="c-stat-label">My Inquiries</div><div class="c-stat-val">'+inqs.length+'</div></div><div class="c-stat-card"><div class="c-stat-label">My Quotes</div><div class="c-stat-val">'+qts.length+'</div></div><div class="c-stat-card"><div class="c-stat-label">Saved Vehicles</div><div class="c-stat-val">'+saved.length+'</div></div>';
    var recent=inqs.slice(-3).reverse();
    if(!recent.length){document.getElementById('cRecentInq').innerHTML='<p style="color:#8a9ab5;font-size:.85rem">No inquiries yet.</p>';return;}
    var html='<div class="c-table-wrap"><table class="c-table"><thead><tr><th>Vehicle</th><th>Date</th><th>Status</th></tr></thead><tbody>';
    recent.forEach(function(i){html+='<tr><td>'+esc(i.vehicleInterest||'General')+'</td><td>'+esc(i.date||'')+'</td><td><span class="c-badge c-badge-'+esc(i.status||'new')+'">'+esc(i.status||'new')+'</span></td></tr>';});
    html+='</tbody></table></div>';
    document.getElementById('cRecentInq').innerHTML=html;
  }
  function renderInquiries(){
    var inqs=load('nau_inquiries').filter(function(i){return i.email&&i.email.toLowerCase()===session.email.toLowerCase();}).reverse();
    var tbody=document.getElementById('cInqTbody');
    if(!inqs.length){tbody.innerHTML='<tr><td colspan="4" class="c-empty">No inquiries found.</td></tr>';return;}
    tbody.innerHTML=inqs.map(function(i){return'<tr><td>'+esc(i.vehicleInterest||'General')+'</td><td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(i.message||'')+'</td><td>'+esc(i.date||'')+'</td><td><span class="c-badge c-badge-'+esc(i.status||'new')+'">'+esc(i.status||'new')+'</span></td></tr>';}).join('');
  }
  function renderQuotes(){
    var qts=load('nau_quotes').filter(function(q){return q.customerEmail&&q.customerEmail.toLowerCase()===session.email.toLowerCase();}).reverse();
    var tbody=document.getElementById('cQtTbody');
    if(!qts.length){tbody.innerHTML='<tr><td colspan="7" class="c-empty">No quotes found. <a href="../inventory.html">Browse vehicles</a> to request a quote.</td></tr>';return;}
    tbody.innerHTML=qts.map(function(q){
      var s=(q.status||'quoted').toLowerCase();
      var expiryHtml='';
      if(q.expiresAt){
        var expired=new Date(q.expiresAt)<new Date();
        expiryHtml='<div style="font-size:.78rem;color:'+(expired?'#c0392b':'#888')+';margin-top:.2rem;">⏳ Expires: '+new Date(q.expiresAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})+'</div>';
      }
      var canDecline=(q.status==='Pending'||q.status==='Quoted');
      var declineBtn=canDecline?'<td><button onclick="declineQuote('+q.id+')" style="background:none;border:1px solid #c0392b;color:#c0392b;border-radius:6px;padding:.3rem .75rem;font-size:.8rem;cursor:pointer;">❌ Decline</button></td>':'<td></td>';
      return'<tr><td><strong>'+esc(q.quoteNo||('QT-'+q.id))+'</strong></td><td>'+esc(q.vehicleName||'')+'</td><td>$'+Number(q.webPrice||0).toLocaleString()+'</td><td>$'+Number(q.quotedPrice||0).toLocaleString()+'</td><td>'+esc(q.issDate||q.reqDate||'')+expiryHtml+'</td><td><span class="c-badge c-badge-'+s+'">'+esc(q.status||'Quoted')+'</span></td>'+declineBtn+'</tr>';
    }).join('');
  }
  function renderSaved(){
    var saved=load('nau_saved_'+session.id);
    var vehicles=load('nau_vehicles');
    var manufacturers=load('nau_manufacturers');
    var grid=document.getElementById('cSavedGrid');
    if(!saved.length){grid.innerHTML='<div class="c-empty-saved"><div class="big">❤️</div><p>No saved vehicles yet.<br><a href="../inventory.html">Browse inventory</a> to save vehicles.</p></div>';return;}
    var html='';
    saved.forEach(function(id){
      var v=vehicles.find(function(x){return String(x.id)===String(id);});
      if(!v)return;
      var mfr=manufacturers.find(function(m){return m.id===v.manufacturerId;});
      html+='<div class="c-vehicle-card"><img src="'+(v.imageUrl||'https://picsum.photos/seed/'+v.id+'/400/280')+'" alt="" onerror="this.src=\'https://picsum.photos/seed/'+v.id+'/400/280\'" /><div class="c-vehicle-info"><div class="c-vehicle-name">'+(mfr?esc(mfr.name)+' ':'')+esc(String(v.year||''))+'</div><div class="c-vehicle-price">$'+Number(v.priceUSD||0).toLocaleString()+'</div></div></div>';
    });
    grid.innerHTML=html||'<div class="c-empty-saved"><div class="big">❤️</div><p>No saved vehicles found.</p></div>';
  }
  function renderProfile(){
    document.getElementById('pName').value=session.name;
    document.getElementById('pEmail').value=session.email;
    document.getElementById('pPhone').value=session.phone||'Not provided';
    var customers=load('nau_customers');
    var me=customers.find(function(c){return c.id===session.id;});
    document.getElementById('pSince').value=me&&me.createdAt?me.createdAt:'N/A';
  }
  var DEFAULT_STAGES=['Auctioned in Japan','Shipped','Mombasa Port','Uganda Clearing','In Showroom','Delivered'];
  function renderJourney(){
    var el=document.getElementById('journeyContent');
    if(!el)return;
    var orders=load('nau_orders').filter(function(o){
      return o.customerName&&o.customerName.toLowerCase()===session.name.toLowerCase()||
             o.customerId===session.id||
             (o.customerEmail&&o.customerEmail.toLowerCase()===session.email.toLowerCase());
    });
    if(!orders.length){
      el.innerHTML='<p style="color:#8a9ab5;font-size:.9rem">You don\'t have any active vehicle orders. <a href="../inventory.html">Browse our inventory</a> to find your perfect vehicle.</p>';
      return;
    }
    var vehicles=load('nau_vehicles');
    var html='';
    orders.forEach(function(order){
      var vehicle=null;
      if(order.vehicleId)vehicle=vehicles.find(function(v){return String(v.id)===String(order.vehicleId);});
      if(!vehicle&&order.vehicleName)vehicle=vehicles.find(function(v){return(v.make+' '+v.model).toLowerCase()===String(order.vehicleName).toLowerCase();});
      var stages=vehicle&&vehicle.journey&&vehicle.journey.length?vehicle.journey:DEFAULT_STAGES.map(function(s,i){return{stage:s,completed:i===4,date:'',notes:''};});
      var foundCurrent=false;
      var vName=vehicle?(esc(vehicle.make||'')+' '+esc(vehicle.model||'')).trim():esc(order.vehicleName||('Order #'+order.id));
      html+='<div style="margin-bottom:2rem"><h4 style="font-size:.95rem;font-weight:700;color:#0a1628;margin-bottom:.75rem">'+vName+'</h4>';
      html+='<div class="journey-timeline">';
      stages.forEach(function(step){
        var dotClass='pending';
        if(step.completed){dotClass='done';}
        else if(!foundCurrent){dotClass='current';foundCurrent=true;}
        var icon=step.completed?'✅':dotClass==='current'?'⏳':'○';
        html+='<div class="journey-step">';
        html+='<div class="journey-dot '+dotClass+'"></div>';
        html+='<div><div class="journey-stage">'+icon+' '+esc(step.stage||'')+'</div>';
        if(step.date)html+='<div class="journey-date">'+esc(step.date)+'</div>';
        if(step.notes)html+='<div class="journey-notes">'+esc(step.notes)+'</div>';
        html+='</div></div>';
      });
      html+='</div></div>';
    });
    el.innerHTML=html;
  }

  function renderAlerts(){
    var el=document.getElementById('alertsList');
    if(!el)return;
    var alerts=load('nau_alerts').filter(function(a){return a.customerEmail&&a.customerEmail.toLowerCase()===session.email.toLowerCase();});
    if(!alerts.length){el.innerHTML='<p style="color:#8a9ab5;font-size:.85rem">No active alerts. Click "+ Set New Alert" to create one.</p>';return;}
    var html='<div class="c-table-wrap"><table class="c-table"><thead><tr><th>Make</th><th>Model</th><th>Max Price</th><th>Fuel</th><th>Body</th><th>Status</th><th></th></tr></thead><tbody>';
    alerts.forEach(function(a){
      html+='<tr><td>'+esc(a.make||'Any')+'</td><td>'+esc(a.model||'Any')+'</td><td>'+(a.maxPrice?'$'+Number(a.maxPrice).toLocaleString():'Any')+'</td><td>'+esc(a.fuelType||'Any')+'</td><td>'+esc(a.bodyType||'Any')+'</td><td><span class="c-badge c-badge-'+esc((a.status||'Active').toLowerCase())+'">'+esc(a.status||'Active')+'</span></td>';
      html+='<td><button class="c-btn" style="background:#fee2e2;color:#dc2626;font-size:.78rem;padding:.25rem .6rem" onclick="cancelAlert('+a.id+')">Cancel</button></td></tr>';
    });
    html+='</tbody></table></div>';
    el.innerHTML=html;
  }

  // ===== NOTIFICATION BELL =====
  function getCustomerEmail() {
    return (session && session.email ? session.email : '').toLowerCase();
  }

  function generateNotifications() {
    var email = getCustomerEmail();
    if (!email) return [];
    var notifs = [];

    // Quotes that have been responded to
    var quotes = load('nau_quotes');
    quotes.filter(function(q){return (q.customerEmail||'').toLowerCase()===email && q.status==='Quoted';}).forEach(function(q){
      notifs.push({id:'q_'+q.id,type:'quote',text:'Your quote for '+(q.vehicleName||q.sku||'a vehicle')+' has been responded to.',time:q.issDate||q.reqDate||''});
    });

    // Confirmed appointments
    var appts = load('nau_appointments');
    appts.filter(function(a){return (a.email||'').toLowerCase()===email && a.status==='Confirmed';}).forEach(function(a){
      notifs.push({id:'a_'+a.id,type:'appointment',text:'Your appointment on '+(a.date||'')+' has been confirmed.',time:a.date||''});
    });

    // Matched stock alerts
    var alerts = load('nau_alerts');
    alerts.filter(function(al){return (al.email||al.customerEmail||'').toLowerCase()===email && al.status==='Matched';}).forEach(function(al){
      notifs.push({id:'al_'+al.id,type:'alert',text:'A vehicle matching your alert ('+(al.make||'')+' '+(al.model||'')+') is now available.',time:al.updatedAt||''});
    });

    return notifs;
  }

  function initNotifications() {
    var readKey = 'nau_notif_read_' + getCustomerEmail();
    var readIds = [];
    try { readIds = JSON.parse(localStorage.getItem(readKey) || '[]'); } catch(e) {}
    var notifs = generateNotifications();
    var unread = notifs.filter(function(n){ return readIds.indexOf(n.id) === -1; });

    var badge = document.getElementById('notifBadge');
    if (badge) {
      if (unread.length > 0) { badge.textContent = unread.length; badge.style.display = 'inline-flex'; }
      else { badge.style.display = 'none'; }
    }

    var list = document.getElementById('notifList');
    if (list) {
      if (notifs.length === 0) {
        list.innerHTML = '<div class="notif-empty">No notifications</div>';
      } else {
        list.innerHTML = notifs.map(function(n){
          return '<div class="notif-item ' + (readIds.indexOf(n.id) !== -1 ? 'notif-read' : 'notif-unread') + '" onclick="markNotifRead(\'' + n.id + '\')">' +
            '<div class="notif-text">' + esc(n.text) + '</div>' +
            (n.time ? '<div class="notif-time">' + esc(n.time) + '</div>' : '') +
            '</div>';
        }).join('');
      }
    }
  }

  window.toggleNotifDropdown = function() {
    var dd = document.getElementById('notifDropdown');
    if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
  };

  window.markNotifRead = function(id) {
    var readKey = 'nau_notif_read_' + getCustomerEmail();
    var readIds = [];
    try { readIds = JSON.parse(localStorage.getItem(readKey) || '[]'); } catch(e) {}
    if (readIds.indexOf(id) === -1) { readIds.push(id); localStorage.setItem(readKey, JSON.stringify(readIds)); }
    initNotifications();
  };

  window.markAllNotifsRead = function() {
    var notifs = generateNotifications();
    var readKey = 'nau_notif_read_' + getCustomerEmail();
    var readIds = notifs.map(function(n){ return n.id; });
    localStorage.setItem(readKey, JSON.stringify(readIds));
    var dd = document.getElementById('notifDropdown');
    if (dd) dd.style.display = 'none';
    initNotifications();
  };

  document.addEventListener('click', function(e) {
    var wrap = document.getElementById('notifBellWrap');
    if (wrap && !wrap.contains(e.target)) {
      var dd = document.getElementById('notifDropdown');
      if (dd) dd.style.display = 'none';
    }
  });

  window.toggleAlertForm=function(){
    var wrap=document.getElementById('alertFormWrap');
    if(wrap)wrap.style.display=wrap.style.display==='none'?'block':'none';
  };

  window.saveAlert=function(){
    var make=(document.getElementById('alMake')||{}).value||'';
    var model=(document.getElementById('alModel')||{}).value||'';
    var maxPrice=(document.getElementById('alPrice')||{}).value||'';
    var fuelType=(document.getElementById('alFuel')||{}).value||'';
    var bodyType=(document.getElementById('alBody')||{}).value||'';
    var alerts=load('nau_alerts');
    var newId=alerts.length?Math.max.apply(null,alerts.map(function(a){return a.id||0;}))+1:1;
    alerts.push({id:newId,customerName:session.name,customerEmail:session.email,customerId:session.id,make:make,model:model,maxPrice:maxPrice,fuelType:fuelType,bodyType:bodyType,status:'Active',createdAt:new Date().toISOString()});
    try{localStorage.setItem('nau_alerts',JSON.stringify(alerts));}catch(e){}
    window.toggleAlertForm();
    var form=['alMake','alModel','alPrice','alFuel','alBody'];
    form.forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
    renderAlerts();
  };

  window.cancelAlert=function(id){
    var alerts=load('nau_alerts');
    var idx=alerts.findIndex(function(a){return a.id===id;});
    if(idx>-1){alerts[idx].status='Cancelled';try{localStorage.setItem('nau_alerts',JSON.stringify(alerts));}catch(e){}}
    renderAlerts();
  };

  // ===== TOAST =====
  function showCToast(msg) {
    var existing = document.getElementById('cToast');
    if (existing) existing.remove();
    var t = document.createElement('div');
    t.id = 'cToast';
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;background:#0a1628;color:#fff;padding:.75rem 1.25rem;border-radius:10px;font-size:.88rem;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.25);opacity:0;transition:opacity .3s;';
    document.body.appendChild(t);
    requestAnimationFrame(function(){ t.style.opacity='1'; });
    setTimeout(function(){ t.style.opacity='0'; setTimeout(function(){ t.remove(); }, 350); }, 3000);
  }
  window.showCToast = showCToast;

  // ===== BOOK APPOINTMENT =====
  function renderBookAppointment() {
    var nameEl = document.getElementById('appt-name');
    var phoneEl = document.getElementById('appt-phone');
    if (nameEl) nameEl.value = session.name || '';
    if (phoneEl) phoneEl.value = session.phone || '';
    var dateEl = document.getElementById('appt-date');
    if (dateEl) dateEl.min = new Date().toISOString().split('T')[0];
    renderMyAppointments();
  }

  function renderMyAppointments() {
    var el = document.getElementById('myApptsList');
    if (!el) return;
    var email = (session.email || '').toLowerCase();
    var appts = load('nau_appointments')
      .filter(function(a){ return (a.email || '').toLowerCase() === email; })
      .sort(function(a, b){ return new Date(b.createdAt) - new Date(a.createdAt); });
    if (!appts.length) {
      el.innerHTML = '<p style="color:#999;text-align:center;padding:2rem;">No appointments yet.</p>';
      return;
    }
    var statusColors = { Pending:'#999', Confirmed:'#27ae60', Completed:'#0a1628', Cancelled:'#c0392b' };
    el.innerHTML = appts.map(function(a){
      return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1rem 1.25rem;margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.75rem;">' +
        '<div>' +
          '<div style="font-weight:700;color:#0a1628;">' + esc(a.date) + ' at ' + esc(a.time) + '</div>' +
          '<div style="font-size:.88rem;color:#555;margin-top:.2rem;">' + esc(a.vehicleInterest || 'General visit') + '</div>' +
          (a.notes ? '<div style="font-size:.82rem;color:#888;margin-top:.2rem;">' + esc(a.notes) + '</div>' : '') +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:.75rem;">' +
          '<span style="background:' + (statusColors[a.status] || '#999') + ';color:#fff;padding:.25rem .75rem;border-radius:20px;font-size:.78rem;font-weight:700;">' + esc(a.status) + '</span>' +
          (a.status === 'Pending' ? '<button onclick="cancelAppointment(' + a.id + ')" style="background:none;border:1px solid #c0392b;color:#c0392b;border-radius:6px;padding:.3rem .7rem;font-size:.8rem;cursor:pointer;">Cancel</button>' : '') +
        '</div>' +
      '</div>';
    }).join('');
  }

  window.submitAppointment = function(e) {
    e.preventDefault();
    var date = document.getElementById('appt-date').value;
    var time = document.getElementById('appt-time').value;
    if (!date || !time) return;
    var appts = load('nau_appointments');
    var newAppt = {
      id: Date.now(),
      customerName: session.name || '',
      email: (session.email || '').toLowerCase(),
      phone: session.phone || '',
      vehicleInterest: document.getElementById('appt-vehicle').value,
      date: date,
      time: time,
      notes: document.getElementById('appt-notes').value,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };
    appts.push(newAppt);
    try { localStorage.setItem('nau_appointments', JSON.stringify(appts)); } catch(e) {}
    document.getElementById('bookApptForm').reset();
    document.getElementById('appt-name').value = session.name || '';
    document.getElementById('appt-phone').value = session.phone || '';
    showCToast('Appointment requested! We\'ll confirm within 24 hours.');
    renderMyAppointments();
  };

  window.cancelAppointment = function(id) {
    var appts = load('nau_appointments');
    var idx = appts.findIndex(function(a){ return a.id === id; });
    if (idx === -1) return;
    appts[idx].status = 'Cancelled';
    try { localStorage.setItem('nau_appointments', JSON.stringify(appts)); } catch(e) {}
    renderMyAppointments();
    showCToast('Appointment cancelled.');
  };

  // ===== MY INVOICES =====
  function renderMyInvoices() {
    var el = document.getElementById('myInvoicesList');
    if (!el) return;
    var email = (session.email || '').toLowerCase();
    var invoices = load('nau_invoices')
      .filter(function(inv){ return (inv.customerEmail || '').toLowerCase() === email; })
      .sort(function(a, b){ return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date); });
    if (!invoices.length) {
      el.innerHTML = '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1.5rem;text-align:center;padding:2rem;color:#999;">No invoices yet. Once you purchase a vehicle, your invoice will appear here.</div>';
      return;
    }
    var statusColors = { Paid:'#27ae60', Unpaid:'#c0392b', Partial:'#f0a500' };
    el.innerHTML = '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">' +
      '<table style="width:100%;border-collapse:collapse;">' +
        '<thead><tr style="background:#f4f6fa;">' +
          '<th style="padding:.75rem 1rem;text-align:left;font-size:.82rem;color:#666;">Invoice No</th>' +
          '<th style="padding:.75rem 1rem;text-align:left;font-size:.82rem;color:#666;">Vehicle</th>' +
          '<th style="padding:.75rem 1rem;text-align:left;font-size:.82rem;color:#666;">Amount</th>' +
          '<th style="padding:.75rem 1rem;text-align:left;font-size:.82rem;color:#666;">Date</th>' +
          '<th style="padding:.75rem 1rem;text-align:left;font-size:.82rem;color:#666;">Status</th>' +
          '<th style="padding:.75rem 1rem;text-align:left;font-size:.82rem;color:#666;"></th>' +
        '</tr></thead>' +
        '<tbody>' +
          invoices.map(function(inv){
            var s = inv.status || 'Unpaid';
            var bg = statusColors[s] || '#999';
            var dateStr = (inv.date || inv.createdAt || '').split('T')[0];
            return '<tr style="border-top:1px solid #f0f0f0;">' +
              '<td style="padding:.7rem 1rem;font-weight:700;color:#0a1628;">' + esc(inv.invoiceNo || String(inv.id)) + '</td>' +
              '<td style="padding:.7rem 1rem;font-size:.88rem;">' + esc(inv.vehicleName || inv.description || '—') + '</td>' +
              '<td style="padding:.7rem 1rem;font-weight:600;">$' + Number(inv.total || inv.totalAmount || inv.amount || 0).toLocaleString() + '</td>' +
              '<td style="padding:.7rem 1rem;font-size:.85rem;color:#666;">' + esc(dateStr) + '</td>' +
              '<td style="padding:.7rem 1rem;"><span style="background:' + bg + ';color:#fff;padding:.2rem .65rem;border-radius:20px;font-size:.75rem;font-weight:700;">' + esc(s) + '</span></td>' +
              '<td style="padding:.7rem 1rem;"><button onclick="openCustomerInvoice(' + inv.id + ')" style="background:none;border:1px solid #0a1628;color:#0a1628;border-radius:6px;padding:.3rem .7rem;font-size:.8rem;cursor:pointer;">🖨️ View</button></td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table>' +
    '</div>';
  }

  window.openCustomerInvoice = function(id) {
    var invoices = load('nau_invoices');
    var inv = invoices.find(function(i){ return i.id === id; });
    if (!inv) return;
    var lines = inv.lines || inv.items || [];
    var subtotal = inv.subtotal || inv.amount || 0;
    var tax = inv.tax || inv.vatAmount || 0;
    var total = inv.total || inv.totalAmount || (Number(subtotal) + Number(tax));
    document.getElementById('customerInvoiceContent').innerHTML =
      '<div style="border-bottom:2px solid #0a1628;padding-bottom:1rem;margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:flex-start;">' +
        '<div>' +
          '<div style="font-size:1.5rem;font-weight:900;color:#0a1628;">🚗 NipponAuto Uganda</div>' +
          '<div style="font-size:.85rem;color:#666;">Uganda\'s Premier Japanese Car Importer</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:1.2rem;font-weight:800;color:#c0392b;">' + esc(inv.invoiceNo || String(inv.id)) + '</div>' +
          '<div style="font-size:.82rem;color:#666;">Date: ' + esc((inv.date || inv.createdAt || '').split('T')[0]) + '</div>' +
          (inv.dueDate ? '<div style="font-size:.82rem;color:#666;">Due: ' + esc(inv.dueDate) + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:1.5rem;gap:2rem;">' +
        '<div>' +
          '<div style="font-weight:700;margin-bottom:.4rem;color:#0a1628;">FROM</div>' +
          '<div>NipponAuto Uganda</div>' +
          '<div style="font-size:.85rem;color:#666;">Plot 45, Nakawa Industrial Road, Kampala</div>' +
          '<div style="font-size:.85rem;color:#666;">+256 700 123 456</div>' +
        '</div>' +
        '<div>' +
          '<div style="font-weight:700;margin-bottom:.4rem;color:#0a1628;">TO</div>' +
          '<div>' + esc(inv.customerName || '') + '</div>' +
          '<div style="font-size:.85rem;color:#666;">' + esc(inv.customerEmail || '') + '</div>' +
          '<div style="font-size:.85rem;color:#666;">' + esc(inv.customerPhone || '') + '</div>' +
        '</div>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;margin-bottom:1rem;">' +
        '<thead><tr style="background:#0a1628;color:#fff;">' +
          '<th style="padding:.5rem .75rem;text-align:left;font-size:.82rem;">#</th>' +
          '<th style="padding:.5rem .75rem;text-align:left;font-size:.82rem;">Description</th>' +
          '<th style="padding:.5rem .75rem;text-align:right;font-size:.82rem;">Amount</th>' +
        '</tr></thead>' +
        '<tbody>' +
          (lines.length ? lines.map(function(l, i){
            return '<tr style="border-bottom:1px solid #eee;">' +
              '<td style="padding:.5rem .75rem;font-size:.85rem;">' + (i+1) + '</td>' +
              '<td style="padding:.5rem .75rem;font-size:.85rem;">' + esc(l.description || l.desc || '') + '</td>' +
              '<td style="padding:.5rem .75rem;font-size:.85rem;text-align:right;">$' + Number(l.amount || l.unitPrice || 0).toLocaleString() + '</td>' +
            '</tr>';
          }).join('') : '<tr><td colspan="3" style="padding:.5rem .75rem;font-size:.85rem;">' + esc(inv.vehicleName || inv.description || 'Vehicle Purchase') + '</td></tr>') +
        '</tbody>' +
        '<tfoot>' +
          '<tr><td colspan="2" style="padding:.4rem .75rem;text-align:right;font-size:.85rem;font-weight:600;">Subtotal</td><td style="padding:.4rem .75rem;text-align:right;font-size:.85rem;">$' + Number(subtotal).toLocaleString() + '</td></tr>' +
          '<tr><td colspan="2" style="padding:.4rem .75rem;text-align:right;font-size:.85rem;font-weight:600;">Tax</td><td style="padding:.4rem .75rem;text-align:right;font-size:.85rem;">$' + Number(tax).toLocaleString() + '</td></tr>' +
          '<tr style="border-top:2px solid #0a1628;"><td colspan="2" style="padding:.5rem .75rem;text-align:right;font-weight:800;color:#0a1628;">TOTAL</td><td style="padding:.5rem .75rem;text-align:right;font-weight:800;color:#0a1628;font-size:1.05rem;">$' + Number(total).toLocaleString() + '</td></tr>' +
        '</tfoot>' +
      '</table>' +
      (inv.notes ? '<div style="font-size:.83rem;color:#555;">Notes: ' + esc(inv.notes) + '</div>' : '') +
      '<div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid #eee;text-align:center;font-size:.82rem;color:#999;">Thank you for choosing NipponAuto Uganda • Plot 45, Nakawa Industrial Road, Kampala</div>';
    document.getElementById('customerInvoiceOverlay').style.display = 'block';
  };

  window.closeCustomerInvoice = function() {
    document.getElementById('customerInvoiceOverlay').style.display = 'none';
  };

  // ===== DECLINE QUOTE =====
  window.declineQuote = function(id) {
    if (!confirm('Are you sure you want to decline this quote?')) return;
    var quotes = load('nau_quotes');
    var idx = quotes.findIndex(function(q){ return q.id === id; });
    if (idx === -1) return;
    quotes[idx].status = 'Declined';
    try { localStorage.setItem('nau_quotes', JSON.stringify(quotes)); } catch(e) {}
    renderQuotes();
    showCToast('Quote declined.');
  };

  navigate('dashboard');
})();