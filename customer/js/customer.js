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
    var titles={dashboard:'Dashboard',inquiries:'My Inquiries',quotes:'My Quotes',saved:'Saved Vehicles',profile:'My Profile',journey:'Vehicle Journey',alerts:'Stock Alerts'};
    document.getElementById('cPageTitle').textContent=titles[page]||page;
    if(page==='dashboard')renderDash();
    if(page==='inquiries')renderInquiries();
    if(page==='quotes')renderQuotes();
    if(page==='saved')renderSaved();
    if(page==='profile')renderProfile();
    if(page==='journey')renderJourney();
    if(page==='alerts')renderAlerts();
  }
  document.querySelectorAll('.cs-nav-item').forEach(function(btn){btn.addEventListener('click',function(){navigate(this.dataset.page);});});
  document.getElementById('logoutBtn').addEventListener('click',function(){sessionStorage.removeItem('nau_customer_session');window.location.href='../login.html';});
  function renderDash(){
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
    if(!qts.length){tbody.innerHTML='<tr><td colspan="6" class="c-empty">No quotes found. <a href="../inventory.html">Browse vehicles</a> to request a quote.</td></tr>';return;}
    tbody.innerHTML=qts.map(function(q){var s=(q.status||'quoted').toLowerCase();return'<tr><td><strong>'+esc(q.quoteNo||('QT-'+q.id))+'</strong></td><td>'+esc(q.vehicleName||'')+'</td><td>$'+Number(q.webPrice||0).toLocaleString()+'</td><td>$'+Number(q.quotedPrice||0).toLocaleString()+'</td><td>'+esc(q.issDate||q.reqDate||'')+'</td><td><span class="c-badge c-badge-'+s+'">'+esc(q.status||'Quoted')+'</span></td></tr>';}).join('');
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

  navigate('dashboard');
})();