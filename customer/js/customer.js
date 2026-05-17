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
    var titles={dashboard:'Dashboard',inquiries:'My Inquiries',quotes:'My Quotes',saved:'Saved Vehicles',profile:'My Profile'};
    document.getElementById('cPageTitle').textContent=titles[page]||page;
    if(page==='dashboard')renderDash();
    if(page==='inquiries')renderInquiries();
    if(page==='quotes')renderQuotes();
    if(page==='saved')renderSaved();
    if(page==='profile')renderProfile();
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
  navigate('dashboard');
})();