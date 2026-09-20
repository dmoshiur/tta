/**
 * The /hackeradmin secure admin portal — a single self-contained page
 * (no React, no build step) so the access gate stays reachable even if the
 * frontend build is broken.
 *
 * The page deliberately exposes NOTHING but a premium sign-in: no system,
 * mail, database, environment, API or debug information. Authentication is
 * handled by /api/v1/hackeradmin/login (rotating passcode, rate limited,
 * audit logged) — the login system itself is unchanged.
 */
export const HACKERADMIN_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/>
<meta name="theme-color" content="#081527"/>
<title>Admin Access — ThinkTank Academia</title>
<link rel="icon" href="/icons/favicon-32.png" sizes="32x32" type="image/png"/>
<link rel="icon" href="/icons/favicon-16.png" sizes="16x16" type="image/png"/>
<link rel="icon" href="/icon.svg" type="image/svg+xml"/>
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"/>
<style>
  :root{
    --ink-950:#050d18; --ink-900:#081527; --ink-700:#173354;
    --gold:#c29a3b; --gold-deep:#9c7826; --gold-soft:#e4c97e;
    --bg:#faf8f3; --surface:#ffffff; --surface-warm:#fcfaf6;
    --text:#1b2430; --text-soft:#3c4858; --muted:#5f6d80; --muted-2:#8a94a4;
    --line:#e7e2d6; --line-strong:#d5cebe;
    --error:#b3352f; --error-bg:#fbeeed; --success:#1e7a4c;
    --serif:'Fraunces',Georgia,'Times New Roman',serif;
    --sans:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
    --ease-luxe:cubic-bezier(.16,1,.3,1);
  }
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{
    margin:0; min-height:100vh; font-family:var(--sans); color:var(--text);
    background:var(--bg);
    -webkit-font-smoothing:antialiased; -webkit-tap-highlight-color:transparent;
    overflow-x:hidden;
  }

  /* ── ambient backdrop: two slow-drifting light fields + faint dot grid ── */
  .ambient{position:fixed; inset:0; z-index:-2; pointer-events:none}
  .ambient::before{
    content:''; position:absolute; inset:-20%;
    background:
      radial-gradient(46rem 30rem at 78% -6%, rgba(29,91,191,.10), transparent 60%),
      radial-gradient(40rem 28rem at 8% 96%, rgba(194,154,59,.12), transparent 58%);
    animation:drift 26s ease-in-out infinite alternate;
  }
  .ambient::after{
    content:''; position:absolute; inset:0;
    background-image:radial-gradient(rgba(27,36,48,.10) .8px, transparent 1.2px);
    background-size:26px 26px;
    -webkit-mask-image:radial-gradient(60rem 44rem at 50% 38%, #000, transparent 78%);
    mask-image:radial-gradient(60rem 44rem at 50% 38%, #000, transparent 78%);
    opacity:.5;
  }
  @keyframes drift{
    from{transform:translate3d(0,0,0) scale(1)}
    to{transform:translate3d(-2.5%,2%,1.04) scale(1.04)}
  }

  main{
    min-height:100vh; min-height:100dvh;
    display:grid; place-items:center;
    padding:clamp(1.2rem,4vw,3rem);
  }

  /* ── entrance choreography: card slide, inner elements fade up ── */
  .portal{
    width:min(432px,100%);
    background:var(--surface);
    border:1px solid var(--line-strong);
    border-radius:14px;
    box-shadow:0 6px 18px rgba(8,21,39,.08), 0 28px 70px rgba(8,21,39,.14);
    padding:clamp(2rem,5vw,2.9rem) clamp(1.6rem,5vw,2.6rem) clamp(1.7rem,4vw,2.2rem);
    text-align:center;
    position:relative;
    overflow:hidden;
    animation:card-in .9s var(--ease-luxe) both;
  }
  .portal::before{
    content:''; position:absolute; top:0; left:0; right:0; height:3px;
    background:linear-gradient(90deg, transparent, var(--gold), transparent);
  }
  @keyframes card-in{
    from{opacity:0; transform:translateY(26px) scale(.985)}
    to{opacity:1; transform:none}
  }
  .rise{opacity:0; animation:rise .85s var(--ease-luxe) forwards}
  @keyframes rise{from{opacity:0; transform:translateY(14px)} to{opacity:1; transform:none}}
  .d1{animation-delay:.12s}.d2{animation-delay:.24s}.d3{animation-delay:.36s}
  .d4{animation-delay:.48s}.d5{animation-delay:.60s}

  .logo{height:clamp(88px,20vw,116px); width:auto; margin:0 auto 1.3rem; display:block}

  .eyebrow{
    display:inline-flex; align-items:center; gap:.65rem;
    font-size:.66rem; font-weight:800; letter-spacing:.3em; text-transform:uppercase;
    color:var(--gold-deep); margin:0 0 .35rem;
  }
  .eyebrow::before,.eyebrow::after{content:''; width:1.4rem; height:1px; background:var(--gold)}
  h1{
    font-family:var(--serif); font-weight:500; letter-spacing:-.01em;
    font-size:1.65rem; color:var(--ink-900); margin:.2rem 0 .4rem;
  }
  .sub{color:var(--muted); font-size:.86rem; margin:0 auto 1.7rem; max-width:30ch; line-height:1.6}

  form{display:flex; flex-direction:column; gap:1rem; text-align:left}
  label{font-size:.72rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--text-soft)}
  .field{position:relative; margin-top:.45rem}
  input{
    width:100%; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    font-size:1.02rem; letter-spacing:.32em; color:var(--ink-900);
    background:var(--surface-warm);
    border:1px solid var(--line-strong); border-radius:8px;
    padding:.95rem 1rem .95rem 3rem; min-height:54px;
    transition:border-color .3s var(--ease-luxe), box-shadow .3s var(--ease-luxe), background .3s, transform .3s var(--ease-luxe);
  }
  input:focus{
    outline:none; border-color:var(--ink-900); background:#fff;
    box-shadow:0 0 0 4px rgba(8,21,39,.08), 0 8px 24px rgba(8,21,39,.07);
    transform:translateY(-1px);
  }
  input::placeholder{color:var(--muted-2); letter-spacing:.32em}
  .field svg{
    position:absolute; left:1rem; top:50%; transform:translateY(-50%);
    width:17px; height:17px; color:var(--muted); transition:color .3s;
  }
  .field:focus-within svg{color:var(--gold-deep)}

  button[type=submit]{
    margin-top:.35rem; position:relative; overflow:hidden;
    display:inline-flex; align-items:center; justify-content:center; gap:.55rem;
    font-family:inherit; font-size:.92rem; font-weight:650; letter-spacing:.04em;
    color:#f5efe1; background:var(--ink-900); border:1px solid var(--ink-900);
    border-radius:8px; padding:.95rem 1rem; min-height:54px; cursor:pointer;
    transition:background .3s, transform .3s var(--ease-luxe), box-shadow .3s;
  }
  button[type=submit]::before{
    content:''; position:absolute; inset:0;
    background:linear-gradient(105deg, transparent 30%, rgba(228,201,126,.32) 50%, transparent 68%);
    transform:translateX(-110%); transition:transform .8s var(--ease-luxe);
  }
  button[type=submit]:hover:not(:disabled){background:var(--ink-700); transform:translateY(-2px); box-shadow:0 12px 30px rgba(8,21,39,.18)}
  button[type=submit]:hover:not(:disabled)::before{transform:translateX(110%)}
  button[type=submit]:disabled{opacity:.6; cursor:default}
  .btn-spinner{
    width:16px; height:16px; border-radius:50%;
    border:2px solid rgba(245,239,225,.35); border-top-color:#e4c97e;
    animation:spin .75s linear infinite; display:none;
  }
  button.loading .btn-spinner{display:inline-block}
  button.loading .btn-label{opacity:.75}
  @keyframes spin{to{transform:rotate(360deg)}}

  .form-error{
    display:none; align-items:center; gap:.55rem;
    background:var(--error-bg); border:1px solid #ecc5c2; border-radius:8px;
    color:var(--error); font-size:.84rem; font-weight:550;
    padding:.7rem .9rem; text-align:left;
    animation:rise .35s var(--ease-luxe);
  }
  .form-error.show{display:flex}

  .secure-note{
    display:flex; align-items:center; justify-content:center; gap:.5rem;
    margin:1.5rem 0 0; padding-top:1.3rem; border-top:1px solid var(--line);
    font-size:.74rem; color:var(--muted); letter-spacing:.02em;
  }
  .secure-note svg{width:13px; height:13px; color:var(--gold-deep); flex:0 0 auto}

  .back-link{
    display:inline-block; margin-top:1rem;
    font-size:.72rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
    color:var(--muted); text-decoration:none;
    transition:color .25s;
  }
  .back-link:hover{color:var(--gold-deep)}

  /* ── granted (post-login) view — confirms the session, nothing else ── */
  #granted-view{display:none}
  .granted-mark{
    width:64px; height:64px; margin:0 auto 1.3rem; border-radius:50%;
    display:grid; place-items:center;
    background:#ecf6f0; border:1px solid #bfe0cd; color:var(--success);
    animation:rise .5s var(--ease-luxe) both .1s;
  }
  .granted-mark svg{width:26px; height:26px}
  .session-meta{
    font-size:.74rem; color:var(--muted-2); letter-spacing:.1em; text-transform:uppercase;
    margin:.4rem 0 1.7rem;
  }
  #signout-btn{
    width:100%; background:transparent; color:var(--ink-900);
    border:1px solid var(--line-strong); border-radius:8px;
    font-family:inherit; font-size:.88rem; font-weight:650;
    padding:.9rem 1rem; min-height:52px; cursor:pointer;
    transition:border-color .3s, background .3s, transform .3s var(--ease-luxe);
  }
  #signout-btn:hover{border-color:var(--ink-900); background:var(--surface-warm); transform:translateY(-1px)}

  :focus-visible{outline:2px solid #1d5bbf; outline-offset:3px; border-radius:4px}

  @media (prefers-reduced-motion: reduce){
    *,*::before,*::after{animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important}
  }
</style>
</head>
<body>
<div class="ambient" aria-hidden="true"></div>
<main>
  <div class="portal" role="main">
    <!-- ══ SECURE LOGIN ══ -->
    <section id="login-view">
      <img class="logo rise d1" src="/brand/logo.png" alt="ThinkTank Academia" width="1408" height="768"/>
      <p class="eyebrow rise d2">ThinkTank Academia</p>
      <h1 class="rise d2">Admin Access</h1>
      <p class="sub rise d3">Enter your access code to continue.</p>

      <form id="login-form" autocomplete="off" class="rise d4" novalidate>
        <div class="form-error" id="form-error" role="alert"></div>
        <div>
          <label for="passcode">Access Code</label>
          <div class="field">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>
            </svg>
            <input type="password" id="passcode" name="passcode" placeholder="••••••••"
                   maxlength="12" required aria-label="Access code" autofocus/>
          </div>
        </div>
        <button type="submit" id="submit-btn">
          <span class="btn-spinner" aria-hidden="true"></span>
          <span class="btn-label">Sign In</span>
        </button>
      </form>

      <p class="secure-note rise d5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6z"/><path d="m9 12 2 2 4-4"/>
        </svg>
        Restricted area — authorized access only
      </p>
      <a class="back-link rise d5" href="/">← Back to site</a>
    </section>

    <!-- ══ SESSION CONFIRMED (post-login; intentionally minimal) ══ -->
    <section id="granted-view" aria-live="polite">
      <div class="granted-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m4.5 12.5 5 5 10-11"/>
        </svg>
      </div>
      <p class="eyebrow rise d2">ThinkTank Academia</p>
      <h1 class="rise d2">Access Granted</h1>
      <p class="sub rise d3">Your administrative session is active.</p>
      <p class="session-meta rise d3" id="session-meta"></p>
      <button id="signout-btn" class="rise d4" type="button">Sign Out</button>
      <p class="secure-note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6z"/><path d="m9 12 2 2 4-4"/>
        </svg>
        Restricted area — authorized access only
      </p>
      <a class="back-link" href="/">← Back to site</a>
    </section>
  </div>
</main>

<script>
(function(){
  "use strict";
  var API = '/api/v1/hackeradmin';
  var token = sessionStorage.getItem('tta_hacker_token') || null;
  var tokenExp = sessionStorage.getItem('tta_hacker_token_exp') || null;

  function $(id){ return document.getElementById(id); }

  function showLogin(){
    $('login-view').style.display = '';
    $('granted-view').style.display = 'none';
  }
  function showGranted(){
    $('login-view').style.display = 'none';
    $('granted-view').style.display = '';
    if(tokenExp){
      var d = new Date(tokenExp);
      if(!isNaN(d)) $('session-meta').textContent = 'Session valid until ' + d.toLocaleTimeString();
    }
  }
  function clearToken(){
    sessionStorage.removeItem('tta_hacker_token');
    sessionStorage.removeItem('tta_hacker_token_exp');
    token = null; tokenExp = null;
  }
  function setBusy(busy){
    var b = $('submit-btn');
    b.disabled = busy;
    b.classList.toggle('loading', busy);
    b.querySelector('.btn-label').textContent = busy ? 'Verifying…' : 'Sign In';
  }
  function showError(msg){
    var e = $('form-error');
    e.textContent = msg;
    e.className = 'form-error show';
  }

  $('login-form').addEventListener('submit', function(ev){
    ev.preventDefault();
    $('form-error').className = 'form-error';
    var code = $('passcode').value.trim();
    if(!code) return;
    setBusy(true);
    fetch(API + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: code })
    })
      .then(function(r){ return r.json().then(function(j){ return { status: r.status, body: j }; }); })
      .then(function(res){
        setBusy(false);
        var d = res.body && res.body.data;
        if(!d){
          showError('Invalid access code. Please try again.');
          $('passcode').select();
          return;
        }
        token = d.token; tokenExp = d.expiresAt;
        sessionStorage.setItem('tta_hacker_token', token);
        sessionStorage.setItem('tta_hacker_token_exp', tokenExp);
        $('passcode').value = '';
        showGranted();
      })
      .catch(function(){
        setBusy(false);
        showError('Something went wrong. Please try again.');
      });
  });

  $('signout-btn').addEventListener('click', function(){
    clearToken();
    showLogin();
  });

  // ── boot: restore an unexpired session, otherwise show the gate ──
  if(token && tokenExp && new Date(tokenExp).getTime() > Date.now()){
    showGranted();
  } else {
    clearToken();
    showLogin();
  }
})();
</script>
</body>
</html>`;
