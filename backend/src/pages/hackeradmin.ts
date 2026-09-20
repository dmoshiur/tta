/**
 * The /hackeradmin operations console — a single self-contained page
 * (no React, no build step) so the emergency console stays reachable even if
 * the frontend build is broken. Dark operator theme, vanilla JS.
 */
export const HACKERADMIN_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/>
<title>HACKER ADMIN // ThinkTank Academia</title>
<style>
  :root{
    --bg:#070d16;--panel:#0c1524;--panel2:#101c30;--line:#1d2f47;
    --txt:#d7e3f4;--dim:#7e93ad;--cyan:#38e1ff;--green:#3ddc84;--red:#ff5d5d;
    --amber:#ffc24b;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--txt);font-family:var(--mono);font-size:14px;line-height:1.5}
  a{color:var(--cyan);text-decoration:none}
  a:hover{text-decoration:underline}
  .wrap{max-width:1180px;margin:0 auto;padding:24px 18px 80px}
  .topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 0;border-bottom:1px solid var(--line);margin-bottom:20px}
  .brand{font-size:15px;letter-spacing:.22em;color:var(--cyan);font-weight:700}
  .brand small{display:block;letter-spacing:.14em;color:var(--dim);font-size:10px;font-weight:400;margin-top:3px}
  .pill{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:3px 12px;font-size:11px;letter-spacing:.12em;color:var(--dim)}
  .pill.on{color:var(--green);border-color:rgba(61,220,132,.4)}
  .pill.off{color:var(--red);border-color:rgba(255,93,93,.5)}
  .grid{display:grid;gap:14px}
  .g2{grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}
  .g3{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px}
  .card h3{margin:0 0 12px;font-size:12px;letter-spacing:.2em;color:var(--dim);text-transform:uppercase}
  .stat{font-size:30px;font-weight:700;color:var(--txt)}
  .stat small{display:block;font-size:11px;color:var(--dim);font-weight:400;margin-top:2px;letter-spacing:.08em}
  table{width:100%;border-collapse:collapse;font-size:12.5px}
  th{ text-align:left;color:var(--dim);font-weight:400;letter-spacing:.1em;text-transform:uppercase;font-size:10.5px;padding:8px 10px;border-bottom:1px solid var(--line)}
  td{padding:8px 10px;border-bottom:1px solid rgba(29,47,71,.55);vertical-align:top;word-break:break-word}
  tr:last-child td{border-bottom:none}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .tag{display:inline-block;padding:1px 8px;border-radius:4px;font-size:11px}
  .tag.ok{background:rgba(61,220,132,.12);color:var(--green)}
  .tag.warn{background:rgba(255,194,75,.12);color:var(--amber)}
  .tag.err{background:rgba(255,93,93,.12);color:var(--red)}
  .tag.info{background:rgba(56,225,255,.1);color:var(--cyan)}
  .bar{height:14px;background:var(--panel2);border:1px solid var(--line);border-radius:4px;overflow:hidden;min-width:120px}
  .bar i{display:block;height:100%;background:linear-gradient(90deg,#137089,var(--cyan))}
  .bar-row{display:grid;grid-template-columns:110px 1fr 52px;gap:10px;align-items:center;margin-bottom:7px;font-size:12px}
  .bar-row .lbl{color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .big-switch{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
  .switch-state{font-size:34px;font-weight:800;letter-spacing:.06em}
  .switch-state.on{color:var(--green)}
  .switch-state.off{color:var(--red)}
  button{font-family:var(--mono);cursor:pointer;border-radius:8px;border:1px solid var(--line);background:var(--panel2);color:var(--txt);padding:10px 16px;font-size:13px;letter-spacing:.06em}
  button:hover{border-color:var(--cyan)}
  button.danger{border-color:rgba(255,93,93,.55);color:var(--red)}
  button.primary{border-color:rgba(56,225,255,.55);color:var(--cyan)}
  button:disabled{opacity:.5;cursor:default}
  input[type=password],input[type=text]{font-family:var(--mono);background:var(--bg);border:1px solid var(--line);color:var(--txt);border-radius:8px;padding:12px 14px;font-size:16px;letter-spacing:.2em;width:100%;max-width:340px}
  input:focus{outline:none;border-color:var(--cyan)}
  .login-box{max-width:420px;margin:9vh auto 0;text-align:center}
  .login-box h1{font-size:19px;letter-spacing:.3em;color:var(--cyan);margin:18px 0 6px}
  .login-box p{color:var(--dim);font-size:12.5px;margin:8px 0 22px;line-height:1.7}
  .tabs{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}
  .tab{padding:8px 14px;border-radius:8px;border:1px solid var(--line);color:var(--dim);font-size:12px;letter-spacing:.1em;cursor:pointer;background:transparent;font-family:var(--mono)}
  .tab.active{color:var(--cyan);border-color:rgba(56,225,255,.5)}
  .muted{color:var(--dim)}
  .kv{display:grid;grid-template-columns:190px 1fr;gap:6px 14px;font-size:12.5px}
  .kv .k{color:var(--dim)}
  .flash{position:fixed;top:16px;right:16px;z-index:50;background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:12px 18px;font-size:13px;max-width:340px;box-shadow:0 12px 40px rgba(0,0,0,.5);display:none}
  .flash.show{display:block}
  .flash.err{border-color:rgba(255,93,93,.6);color:var(--red)}
  .flash.ok{border-color:rgba(61,220,132,.5);color:var(--green)}
  .countdown{font-size:12px;color:var(--amber)}
  .path{max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:bottom}
  @media(max-width:640px){.kv{grid-template-columns:1fr}.stat{font-size:24px}}
</style>
</head>
<body>
<div class="wrap">
  <div class="topbar">
    <div class="brand">HACKER ADMIN<small>THINKTANK ACADEMIA // EMERGENCY OPERATIONS CONSOLE</small></div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <span class="pill" id="site-pill">SITE …</span>
      <span class="pill" id="mail-pill">SMTP …</span>
      <button id="logout-btn" style="display:none">LOG OUT</button>
    </div>
  </div>

  <!-- ══ LOGIN ══ -->
  <section id="login-view">
    <div class="card login-box">
      <h1>ACCESS CONTROL</h1>
      <p>Enter the operations passcode. A fresh code is generated <strong>every hour</strong> and e-mailed to the configured operator address. Only a hash of the code is stored.</p>
      <form id="login-form" autocomplete="off">
        <input type="password" id="passcode" placeholder="XXXX-XXXX" maxlength="12" required style="margin:0 auto;display:block;letter-spacing:.35em"/>
        <button class="primary" type="submit" style="width:100%;max-width:340px;margin-top:14px">AUTHENTICATE</button>
      </form>
      <p class="countdown" id="window-info" style="margin-top:18px"></p>
    </div>
  </section>

  <!-- ══ CONSOLE ══ -->
  <section id="console-view" style="display:none">
    <div class="tabs" id="tabs">
      <button class="tab active" data-tab="overview">OVERVIEW</button>
      <button class="tab" data-tab="traffic">TRAFFIC</button>
      <button class="tab" data-tab="visitors">VISITORS</button>
      <button class="tab" data-tab="admins">ADMINS</button>
      <button class="tab" data-tab="superadmin">SUPER ADMIN</button>
      <button class="tab" data-tab="management">MANAGEMENT</button>
    </div>

    <div id="tab-overview">
      <div class="grid g2">
        <div class="card">
          <h3>Site power switch</h3>
          <div class="big-switch">
            <div class="switch-state" id="switch-state">…</div>
            <div style="flex:1;min-width:200px">
              <div class="muted" id="switch-meta" style="font-size:12px;margin-bottom:12px"></div>
              <div style="display:flex;gap:10px;flex-wrap:wrap">
                <button class="danger" id="btn-off">⏻ SWITCH SITE OFF</button>
                <button class="primary" id="btn-on">⏻ SWITCH SITE ON</button>
              </div>
            </div>
          </div>
        </div>
        <div class="card">
          <h3>Passcode window</h3>
          <div class="kv" id="hacker-kv"></div>
        </div>
      </div>
      <div class="grid g3" style="margin-top:14px" id="stat-cards"></div>
    </div>

    <div id="tab-traffic" style="display:none">
      <div class="grid g3" style="margin-bottom:14px" id="traffic-totals"></div>
      <div class="grid g2">
        <div class="card"><h3>Requests — last 14 days</h3><div id="traffic-byday"></div></div>
        <div class="card"><h3>Status codes — last 24 h</h3><div id="traffic-status" style="margin-bottom:16px"></div><h3>API vs pages — 24 h</h3><div id="traffic-kinds"></div></div>
      </div>
      <div class="card" style="margin-top:14px"><h3>Top paths — last 24 h</h3><div style="overflow-x:auto"><table id="traffic-paths"></table></div></div>
      <div class="card" style="margin-top:14px"><h3>Latest requests</h3><div style="overflow-x:auto"><table id="traffic-recent"></table></div></div>
    </div>

    <div id="tab-visitors" style="display:none">
      <div class="grid g3" style="margin-bottom:14px" id="visitor-totals"></div>
      <div class="grid g2">
        <div class="card"><h3>Unique visitors — last 14 days</h3><div id="visitor-byday"></div></div>
        <div class="card"><h3>Top user agents — 24 h</h3><table id="visitor-ua"></table></div>
      </div>
      <div class="grid g2" style="margin-top:14px">
        <div class="card"><h3>Top referrers — 7 days</h3><table id="visitor-ref"></table></div>
        <div class="card"><h3>Most active IPs — 24 h</h3><table id="visitor-ips"></table></div>
      </div>
    </div>

    <div id="tab-admins" style="display:none">
      <div class="card"><h3>Administrator accounts (level ≥ 2)</h3><div style="overflow-x:auto"><table id="admins-table"></table></div></div>
    </div>

    <div id="tab-superadmin" style="display:none">
      <div class="grid g2">
        <div class="card"><h3>Super admin — .env configuration</h3><div class="kv" id="super-kv"></div></div>
        <div class="card"><h3>SUPER_ADMIN accounts in database</h3><div style="overflow-x:auto"><table id="super-table"></table></div></div>
      </div>
    </div>

    <div id="tab-management" style="display:none">
      <div class="grid g2">
        <div class="card">
          <h3>Operations</h3>
          <div style="display:flex;flex-direction:column;gap:10px">
            <button class="primary" id="btn-rotate">⟳ Force new passcode now (e-mail it)</button>
            <button id="btn-mail-test">✉ Send SMTP test e-mail</button>
            <a href="/admin" target="_blank" style="display:inline-block;text-align:center;border:1px solid var(--line);border-radius:8px;padding:10px 16px;font-size:13px;letter-spacing:.06em">Open the full admin console → /admin</a>
            <a href="/api/v1/meta" target="_blank" style="display:inline-block;text-align:center;border:1px solid var(--line);border-radius:8px;padding:10px 16px;font-size:13px;letter-spacing:.06em">API meta → /api/v1/meta</a>
          </div>
        </div>
        <div class="card">
          <h3>Session</h3>
          <div class="kv" id="session-kv"></div>
        </div>
      </div>
      <div class="card" style="margin-top:14px"><h3>Recent admin activity</h3><div style="overflow-x:auto"><table id="activity-table"></table></div></div>
    </div>
  </section>
</div>
<div class="flash" id="flash"></div>

<script>
(function(){
  "use strict";
  var API = '/api/v1/hackeradmin';
  var token = sessionStorage.getItem('tta_hacker_token') || null;
  var tokenExp = sessionStorage.getItem('tta_hacker_token_exp') || null;
  var currentTab = 'overview';
  var refreshTimer = null;
  var clockTimer = null;

  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s ?? '').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function fmtTime(iso){ if(!iso) return '—'; var d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleString(); }
  function fmtAgo(iso){ if(!iso) return '—'; var s = Math.max(0,(Date.now()-new Date(iso))/1000); if(s<60) return Math.floor(s)+'s ago'; if(s<3600) return Math.floor(s/60)+'m ago'; if(s<86400) return Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago'; }

  function flash(msg, kind){
    var f = $('flash'); f.textContent = msg; f.className = 'flash show ' + (kind||'ok');
    clearTimeout(flash._t); flash._t = setTimeout(function(){ f.className='flash'; }, 4200);
  }

  function api(path, opts){
    opts = opts || {};
    var headers = opts.headers || {};
    if(token) headers['Authorization'] = 'Bearer ' + token;
    if(opts.body) headers['Content-Type'] = 'application/json';
    return fetch(API + path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function(r){ return r.json().then(function(j){ return { status: r.status, body: j }; }); })
      .catch(function(){ return { status: 0, body: { error: { message: 'Network error' } } }; });
  }

  function failSession(err){
    if(err && (err.status === 401 || err.status === 403)){
      clearToken();
    }
  }

  // ── views ───────────────────────────────────────────────────────────────
  function showLogin(){
    $('login-view').style.display = '';
    $('console-view').style.display = 'none';
    $('logout-btn').style.display = 'none';
    clearInterval(refreshTimer); refreshTimer = null;
    loadStatus();
  }
  function showConsole(){
    $('login-view').style.display = 'none';
    $('console-view').style.display = '';
    $('logout-btn').style.display = '';
    loadAll();
    if(!refreshTimer) refreshTimer = setInterval(loadAll, 30000);
  }
  function clearToken(){
    sessionStorage.removeItem('tta_hacker_token');
    sessionStorage.removeItem('tta_hacker_token_exp');
    token = null; tokenExp = null;
    showLogin();
  }
  function setTab(name){
    currentTab = name;
    document.querySelectorAll('.tab').forEach(function(t){ t.classList.toggle('active', t.dataset.tab === name); });
    ['overview','traffic','visitors','admins','superadmin','management'].forEach(function(n){
      $('tab-'+n).style.display = n === name ? '' : 'none';
    });
    loadAll();
  }

  // ── status (login screen) ───────────────────────────────────────────────
  function loadStatus(){
    api('/status').then(function(res){
      var s = res.body && res.body.data;
      if(!s) return;
      $('mail-pill').textContent = s.mailConfigured ? 'SMTP ✓ ' + s.mailTo : 'SMTP NOT SET';
      $('mail-pill').className = 'pill ' + (s.mailConfigured ? 'on' : 'off');
      $('window-info').textContent = s.expiresAt
        ? 'Current code issued ' + fmtAgo(s.issuedAt) + ' · next code in ' + s.nextRotationInMinutes + ' min · rotation #' + s.rotations
        : 'No active passcode window.';
    });
  }

  // ── console data ────────────────────────────────────────────────────────
  function statCard(label, value, sub){
    return '<div class="card"><div class="stat">' + esc(value) + '<small>' + esc(label) + (sub ? ' · ' + esc(sub) : '') + '</small></div></div>';
  }
  function bars(rows, keyFn, valFn){
    if(!rows.length) return '<div class="muted">No traffic recorded yet.</div>';
    var max = Math.max.apply(null, rows.map(valFn));
    return rows.map(function(r){
      var v = valFn(r);
      var pct = max ? Math.round(100*v/max) : 0;
      return '<div class="bar-row"><span class="lbl" title="' + esc(keyFn(r)) + '">' + esc(keyFn(r)) + '</span><div class="bar"><i style="width:' + pct + '%"></i></div><span class="num">' + v + '</span></div>';
    }).join('');
  }
  function statusTag(code){
    if(code >= 500) return '<span class="tag err">' + code + '</span>';
    if(code >= 400) return '<span class="tag warn">' + code + '</span>';
    return '<span class="tag ok">' + code + '</span>';
  }

  function loadAll(){
    loadOverview().then(function(){
      if(currentTab === 'traffic') loadTraffic();
      if(currentTab === 'visitors') loadVisitors();
      if(currentTab === 'admins') loadAdmins();
      if(currentTab === 'superadmin') loadSuper();
      if(currentTab === 'management') loadManagement();
    }).catch(function(){ failSession({status:401}); });
  }

  function loadOverview(){
    return api('/overview').then(function(res){
      var d = res.body && res.body.data;
      if(!d) { failSession(res); return; }
      // pills
      var site = d.site;
      $('site-pill').textContent = site.enabled ? 'SITE ONLINE' : 'SITE OFFLINE';
      $('site-pill').className = 'pill ' + (site.enabled ? 'on' : 'off');
      $('mail-pill').textContent = d.hacker.mailConfigured ? 'SMTP ✓ ' + d.hacker.mailTo : 'SMTP NOT SET';
      $('mail-pill').className = 'pill ' + (d.hacker.mailConfigured ? 'on' : 'off');
      // switch
      var st = $('switch-state');
      st.textContent = site.enabled ? 'ONLINE' : 'OFFLINE';
      st.className = 'switch-state ' + (site.enabled ? 'on' : 'off');
      $('switch-meta').textContent = 'Last changed ' + fmtAgo(site.updatedAt) + ' by ' + esc(site.updatedBy) + (site.note ? ' — ' + esc(site.note) : '');
      // hacker kv
      $('hacker-kv').innerHTML =
        kv('Rotations', d.hacker.rotations) +
        kv('Window TTL', d.hacker.ttlMinutes + ' min') +
        kv('Issued', fmtTime(d.hacker.issuedAt)) +
        kv('Expires', fmtTime(d.hacker.expiresAt) + ' (' + fmtAgo(d.hacker.expiresAt) + ')') +
        kv('Next code', d.hacker.nextRotationInMinutes != null ? 'in ' + d.hacker.nextRotationInMinutes + ' min' : '—') +
        kv('Last e-mail', esc(d.hacker.lastMailStatus || '—')) +
        kv('Uptime', Math.floor(d.uptime_seconds/3600) + 'h ' + Math.floor(d.uptime_seconds%3600/60) + 'm') +
        kv('Runtime', esc(d.node) + ' · ' + esc(d.env));
      // stat cards
      var s = d.stats;
      $('stat-cards').innerHTML =
        statCard('Users', s.users, s.admins + ' admins · ' + s.super_admins + ' super') +
        statCard('Courses', s.courses, s.published_courses + ' published') +
        statCard('Content', s.content, s.books + ' books') +
        statCard('Quizzes', s.quizzes, s.attempts + ' submissions') +
        statCard('Enrollments', s.enrollments) +
        statCard('New messages', s.new_messages, s.subscribers + ' subscribers');
    });
  }

  function kv(k, v){ return '<div class="k">' + esc(k) + '</div><div>' + v + '</div>'; }

  function loadTraffic(){
    return api('/traffic').then(function(res){
      var d = res.body && res.body.data;
      if(!d) { failSession(res); return; }
      $('traffic-totals').innerHTML =
        statCard('Requests · 1 h', d.totals.last_hour) +
        statCard('Requests · 24 h', d.totals.last_24h) +
        statCard('Requests · 7 d', d.totals.last_7d, 'all-time ' + d.totals.total);
      $('traffic-byday').innerHTML = bars(d.by_day, function(r){ return r.day; }, function(r){ return r.total; });
      $('traffic-status').innerHTML = bars(d.status_24h, function(r){ return r.bucket; }, function(r){ return r.total; });
      $('traffic-kinds').innerHTML = bars(d.api_vs_pages_24h, function(r){ return r.kind; }, function(r){ return r.total; });
      $('traffic-paths').innerHTML =
        '<tr><th>Path</th><th class="num">Hits</th><th class="num">Avg ms</th><th class="num">≥400</th></tr>' +
        (d.top_paths_24h.length ? d.top_paths_24h.map(function(r){
          return '<tr><td><span class="path" title="' + esc(r.path) + '">' + esc(r.path) + '</span></td><td class="num">' + r.total + '</td><td class="num">' + r.avg_ms + '</td><td class="num">' + r.errors + '</td></tr>';
        }).join('') : '<tr><td colspan="4" class="muted">No traffic yet.</td></tr>');
      $('traffic-recent').innerHTML =
        '<tr><th>Time</th><th>Method</th><th>Path</th><th class="num">Status</th><th>IP</th><th class="num">ms</th></tr>' +
        (d.recent.length ? d.recent.map(function(r){
          return '<tr><td>' + fmtAgo(r.created_at) + '</td><td>' + esc(r.method) + '</td><td><span class="path" title="' + esc(r.path) + '">' + esc(r.path) + '</span></td><td class="num">' + statusTag(r.status) + '</td><td>' + esc(r.ip) + '</td><td class="num">' + r.duration_ms + '</td></tr>';
        }).join('') : '<tr><td colspan="6" class="muted">No requests logged yet.</td></tr>');
    });
  }

  function loadVisitors(){
    return api('/visitors').then(function(res){
      var d = res.body && res.body.data;
      if(!d) { failSession(res); return; }
      $('visitor-totals').innerHTML = d.unique_visitors.map(function(v){ return statCard('Unique IPs · ' + v.label, v.total); }).join('');
      $('visitor-byday').innerHTML = bars(d.by_day, function(r){ return r.day; }, function(r){ return r.visitors; });
      $('visitor-ua').innerHTML =
        '<tr><th>User agent</th><th class="num">Hits</th></tr>' +
        (d.top_user_agents_24h.length ? d.top_user_agents_24h.map(function(r){
          return '<tr><td><span class="path" title="' + esc(r.user_agent) + '">' + esc(r.user_agent) + '</span></td><td class="num">' + r.total + '</td></tr>';
        }).join('') : '<tr><td colspan="2" class="muted">No traffic yet.</td></tr>');
      $('visitor-ref').innerHTML =
        '<tr><th>Referrer</th><th class="num">Visits</th></tr>' +
        (d.top_referrers_7d.length ? d.top_referrers_7d.map(function(r){
          return '<tr><td><span class="path" title="' + esc(r.referrer) + '">' + esc(r.referrer) + '</span></td><td class="num">' + r.total + '</td></tr>';
        }).join('') : '<tr><td colspan="2" class="muted">No referrer traffic.</td></tr>');
      $('visitor-ips').innerHTML =
        '<tr><th>IP</th><th class="num">Requests</th><th>Last seen</th></tr>' +
        (d.top_ips_24h.length ? d.top_ips_24h.map(function(r){
          return '<tr><td>' + esc(r.ip) + '</td><td class="num">' + r.requests + '</td><td>' + fmtAgo(r.last_seen) + '</td></tr>';
        }).join('') : '<tr><td colspan="3" class="muted">No traffic yet.</td></tr>');
    });
  }

  function loadAdmins(){
    return api('/admins').then(function(res){
      var rows = res.body && res.body.data;
      if(!rows) { failSession(res); return; }
      $('admins-table').innerHTML =
        '<tr><th>Name</th><th>Email</th><th>Role</th><th>Level</th><th>Status</th><th>Last login</th><th>Created</th></tr>' +
        (rows.length ? rows.map(function(r){
          return '<tr><td>' + esc(r.name) + '</td><td>' + esc(r.email) + '</td><td>' + esc(r.role_label) + '</td><td class="num">' + r.role_level + '</td><td>' + (r.is_active ? '<span class="tag ok">ACTIVE</span>' : '<span class="tag err">SUSPENDED</span>') + '</td><td>' + fmtTime(r.last_login_at) + '</td><td>' + fmtTime(r.created_at) + '</td></tr>';
        }).join('') : '<tr><td colspan="7" class="muted">No administrator accounts.</td></tr>');
    });
  }

  function loadSuper(){
    return api('/superadmin').then(function(res){
      var d = res.body && res.body.data;
      if(!d) { failSession(res); return; }
      var c = d.configured;
      $('super-kv').innerHTML =
        kv('SUPER_ADMIN_EMAIL', esc(c.email || '(not set)')) +
        kv('Credential in .env', c.configuredInEnv ? '<span class="tag ok">SET</span>' : '<span class="tag err">MISSING</span>') +
        kv('Account in database', c.presentInDatabase ? '<span class="tag ok">FOUND</span>' : '<span class="tag warn">NOT SEEDABLE</span>') +
        kv('How it works', 'The address in <code>SUPER_ADMIN_EMAIL</code> is created with the SUPER_ADMIN role on first boot (SUPER_ADMIN_PASSWORD sets its password). It is managed from /admin/users.');
      $('super-table').innerHTML =
        '<tr><th>Name</th><th>Email</th><th>Status</th><th>Last login</th><th>Created</th></tr>' +
        (d.super_admins.length ? d.super_admins.map(function(r){
          return '<tr><td>' + esc(r.name) + '</td><td>' + esc(r.email) + (r.email === c.email ? ' <span class="tag info">.env</span>' : '') + '</td><td>' + (r.is_active ? '<span class="tag ok">ACTIVE</span>' : '<span class="tag err">SUSPENDED</span>') + '</td><td>' + fmtTime(r.last_login_at) + '</td><td>' + fmtTime(r.created_at) + '</td></tr>';
        }).join('') : '<tr><td colspan="5" class="muted">No SUPER_ADMIN accounts yet.</td></tr>');
    });
  }

  function loadManagement(){
    api('/activity?limit=30').then(function(res){
      var rows = res.body && res.body.data;
      if(!rows) { failSession(res); return; }
      $('activity-table').innerHTML =
        '<tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th></tr>' +
        (rows.length ? rows.map(function(r){
          return '<tr><td>' + fmtAgo(r.created_at) + '</td><td>' + esc(r.actor_name) + '</td><td><span class="tag info">' + esc(r.action) + '</span></td><td>' + esc(r.entity_type) + (r.entity_label ? ' · ' + esc(r.entity_label) : '') + '</td></tr>';
        }).join('') : '<tr><td colspan="4" class="muted">No admin activity recorded.</td></tr>');
    });
    if(tokenExp) {
      $('session-kv').innerHTML =
        kv('Session token', 'expires ' + fmtAgo(tokenExp)) +
        kv('Passcode window', 'see OVERVIEW tab') +
        kv('Tip', 'Rotate the passcode after every incident. Old sessions stay valid until their token expires (≤ 60 min).');
    }
  }

  // ── actions ─────────────────────────────────────────────────────────────
  $('login-form').addEventListener('submit', function(e){
    e.preventDefault();
    var code = $('passcode').value.trim();
    var btn = e.target.querySelector('button');
    btn.disabled = true;
    api('/login', { method: 'POST', body: { passcode: code } }).then(function(res){
      btn.disabled = false;
      var d = res.body && res.body.data;
      if(!d) {
        flash((res.body && res.body.error && res.body.error.message) || 'Login failed', 'err');
        return;
      }
      token = d.token; tokenExp = d.expiresAt;
      sessionStorage.setItem('tta_hacker_token', token);
      sessionStorage.setItem('tta_hacker_token_exp', tokenExp);
      $('passcode').value = '';
      showConsole();
      flash('Authenticated. Session expires ' + fmtAgo(tokenExp) + '.', 'ok');
    });
  });

  $('logout-btn').addEventListener('click', function(){ flash('Logged out.', 'ok'); clearToken(); });

  $('btn-off').addEventListener('click', function(){ toggleSite(false); });
  $('btn-on').addEventListener('click', function(){ toggleSite(true); });
  function toggleSite(enabled){
    if(!confirm(enabled ? 'Switch the site back ON for everyone?' : 'Switch the ENTIRE site OFF? Visitors will see an offline screen until you switch it back on.')) return;
    api('/site/toggle', { method: 'POST', body: { enabled: enabled } }).then(function(res){
      var d = res.body && res.body.data;
      if(d) flash(enabled ? 'Site switched ON.' : 'Site switched OFF.', 'ok');
      else flash((res.body && res.body.error && res.body.error.message) || 'Failed', 'err');
      loadOverview();
    });
  }

  $('btn-rotate').addEventListener('click', function(){
    var b = $('btn-rotate'); b.disabled = true;
    api('/passcode/regenerate', { method: 'POST' }).then(function(res){
      b.disabled = false;
      var d = res.body && res.body.data;
      if(d) flash('New passcode issued — e-mail ' + (d.mailDelivered ? 'delivered' : 'NOT delivered (check SMTP)') + ' to ' + d.mailTo, d.mailDelivered ? 'ok' : 'err');
      else flash('Rotation failed', 'err');
      loadOverview();
    });
  });

  $('btn-mail-test').addEventListener('click', function(){
    var b = $('btn-mail-test'); b.disabled = true;
    api('/mail/test', { method: 'POST' }).then(function(res){
      b.disabled = false;
      var d = res.body && res.body.data;
      if(d && d.delivered) flash('Test e-mail delivered to ' + d.to, 'ok');
      else flash('Not delivered: ' + ((d && d.reason) || 'SMTP not configured'), 'err');
    });
  });

  document.querySelectorAll('.tab').forEach(function(t){
    t.addEventListener('click', function(){ setTab(t.dataset.tab); });
  });

  // ── boot ────────────────────────────────────────────────────────────────
  function tokenValid(){
    if(!token) return false;
    if(tokenExp && new Date(tokenExp).getTime() < Date.now()) return false;
    return true;
  }
  if(tokenValid()) showConsole(); else showLogin();
})();
</script>
</body>
</html>`;
