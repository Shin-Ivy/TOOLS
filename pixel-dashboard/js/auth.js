/**
 * auth.js — Google Identity Services (GIS) Authentication
 * Uses OAuth2 Token Client (popup flow) + Google userinfo endpoint.
 * ✅ Pure client-side — no backend required.
 * ✅ Custom retro button preserved — no renderButton override.
 *
 * SETUP: Edit js/config.js → set GOOGLE_CLIENT_ID to your OAuth 2.0 Client ID.
 * The Client SECRET is NOT needed — this is a client-side implicit/token flow.
 */

// Read Client ID from js/config.js (APP_CONFIG loaded before this script)
const GOOGLE_CLIENT_ID = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.GOOGLE_CLIENT_ID)
  ? APP_CONFIG.GOOGLE_CLIENT_ID
  : 'YOUR_GOOGLE_CLIENT_ID';

const SESSION_KEY = 'pixel_tools_user';

// Internal state — do not use externally
let _tokenClient = null;   // google.accounts.oauth2 token client
let _gisReady    = false;  // SDK fully initialized


/* ═══════════════════════════════════════════════════════════════
   UTILITY: Client ID check
═══════════════════════════════════════════════════════════════ */
function isClientIdConfigured() {
  return typeof GOOGLE_CLIENT_ID === 'string'
    && GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID'
    && GOOGLE_CLIENT_ID.length > 30;
}


/* ═══════════════════════════════════════════════════════════════
   SESSION: Store / retrieve / expire user info
═══════════════════════════════════════════════════════════════ */
function storeUser(profile) {
  const user = {
    name:    profile.name        || profile.given_name || 'Player One',
    email:   profile.email       || '',
    picture: profile.picture     || '',
    sub:     profile.sub         || profile.id || String(Date.now()),
    iat:     Date.now()
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

function getCurrentUser() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    // Hard-expire after 8 hours
    if (Date.now() - user.iat > 8 * 60 * 60 * 1000) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return user;
  } catch (e) {
    return null;
  }
}

function signOut() {
  sessionStorage.removeItem(SESSION_KEY);
  try { window.google?.accounts?.id?.disableAutoSelect(); } catch (_) {}
  window.location.href = 'index.html';
}


/* ═══════════════════════════════════════════════════════════════
   UI HELPERS: loading message + SYSTEM STATUS bar
═══════════════════════════════════════════════════════════════ */
function showLoadingMsg(msg, isError = false) {
  const el = document.getElementById('loading-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? 'var(--red)' : 'var(--blue)';
}

function animateHpBar(targetPct, durationMs = 400) {
  const bar = document.getElementById('hp-bar');
  if (!bar) return;

  // Read current width as percentage of parent
  const parent = bar.parentElement;
  const parentW = parent ? parent.offsetWidth : 400;
  const currentPct = (bar.offsetWidth / parentW) * 100;
  const startTime = performance.now();

  // Temporarily override the stripes so we see a solid fill
  bar.style.transition  = 'none';
  bar.style.background  = targetPct >= 100
    ? 'var(--green)'
    : targetPct === 0
      ? 'var(--red)'
      : 'var(--blue)';
  bar.style.height      = '100%';
  bar.style.border      = 'none';
  bar.style.animation   = 'none';

  function step(now) {
    const t   = Math.min((now - startTime) / durationMs, 1);
    const pct = currentPct + (targetPct - currentPct) * t;
    bar.style.width = pct + '%';
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}


/* ═══════════════════════════════════════════════════════════════
   OAUTH CALLBACK: receives access token → fetches user profile
═══════════════════════════════════════════════════════════════ */
async function handleTokenResponse(tokenResp) {
  // ── Error / cancelled ──────────────────────────────────────
  if (!tokenResp.access_token || tokenResp.error) {
    const code = tokenResp.error || 'UNKNOWN_ERROR';

    // User closed the popup → not fatal, just inform
    if (code === 'access_denied' || code === 'user_cancel') {
      showLoadingMsg('▶ LOGIN CANCELLED — PRESS START TO RETRY');
      animateHpBar(0);
      console.info('[PIXEL.AUTH] User cancelled login.');
      return;
    }

    showLoadingMsg(`✖ AUTH ERROR: ${code.toUpperCase()}`, true);
    animateHpBar(0);
    console.error('[PIXEL.AUTH] Token error:', code, tokenResp);
    return;
  }

  // ── Success — fetch profile ────────────────────────────────
  showLoadingMsg('TOKEN RECEIVED — LOADING PROFILE...');
  animateHpBar(40);

  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenResp.access_token}` }
    });

    if (!res.ok) {
      throw new Error(`USERINFO FETCH FAILED [HTTP ${res.status}]`);
    }

    const profile = await res.json();

    if (!profile.email) {
      throw new Error('PROFILE MISSING EMAIL — CHECK OAUTH SCOPE');
    }

    storeUser(profile);
    animateHpBar(100, 300);
    showLoadingMsg(`ACCESS GRANTED — WELCOME, ${(profile.name || 'PLAYER').toUpperCase()}!`);

    // Short pause so user sees the success message, then redirect
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);

  } catch (err) {
    showLoadingMsg(`✖ ${err.message}`, true);
    animateHpBar(0);
    console.error('[PIXEL.AUTH] Profile fetch error:', err);
  }
}


/* ═══════════════════════════════════════════════════════════════
   BUTTON CLICK: invoked by onclick="handleGoogleSignIn()" on
   the retro pixel button in index.html
═══════════════════════════════════════════════════════════════ */
function handleGoogleSignIn() {
  // ── Guard: client ID not configured ───────────────────────
  if (!isClientIdConfigured()) {
    const warn = document.getElementById('setup-warning');
    if (warn) warn.classList.remove('hidden');
    showLoadingMsg('✖ CLIENT ID NOT SET — EDIT js/config.js', true);
    return;
  }

  // ── Guard: SDK not yet initialised ────────────────────────
  if (!_gisReady || !_tokenClient) {
    showLoadingMsg('⏳ GOOGLE SDK LOADING — PLEASE WAIT...');
    // Retry once after 1.5 s to handle slow SDK loads
    setTimeout(() => {
      if (_gisReady && _tokenClient) {
        _tokenClient.requestAccessToken({ prompt: 'select_account' });
      } else {
        showLoadingMsg('✖ GOOGLE SDK FAILED TO LOAD. CHECK NETWORK.', true);
      }
    }, 1500);
    return;
  }

  showLoadingMsg('OPENING GOOGLE SIGN-IN...');
  animateHpBar(10);

  // requestAccessToken() opens the real Google account-picker popup
  // prompt:'select_account' always shows the account chooser even if
  // one account is already known — prevents invisible auto-login.
  try {
    _tokenClient.requestAccessToken({ prompt: 'select_account' });
  } catch (e) {
    showLoadingMsg('✖ POPUP BLOCKED — ALLOW POPUPS AND RETRY', true);
    animateHpBar(0);
    console.error('[PIXEL.AUTH] requestAccessToken error:', e);
  }
}


/* ═══════════════════════════════════════════════════════════════
   INITIALISE GIS on login page load
═══════════════════════════════════════════════════════════════ */
window.addEventListener('load', () => {
  // Skip entirely if we're on the dashboard — dashboard.js guards itself
  if (window.location.pathname.toLowerCase().includes('dashboard')) return;

  // Already authenticated — bounce straight to dashboard
  if (getCurrentUser()) {
    window.location.href = 'dashboard.html';
    return;
  }

  // Client ID not configured → show setup warning, stop
  if (!isClientIdConfigured()) {
    const warn = document.getElementById('setup-warning');
    if (warn) warn.classList.remove('hidden');
    showLoadingMsg('⚠ GOOGLE CLIENT ID NOT SET — EDIT js/config.js', true);
    animateHpBar(0);
    return;
  }

  showLoadingMsg('LOADING GOOGLE SDK...');
  animateHpBar(20);

  /* Poll for GIS SDK (loaded async) ─────────────────────────── */
  let pollAttempts = 0;
  const MAX_POLLS  = 30; // 30 × 300ms = 9 seconds timeout

  const tryInitGIS = () => {
    pollAttempts++;

    if (!window.google?.accounts?.oauth2) {
      if (pollAttempts >= MAX_POLLS) {
        showLoadingMsg('✖ GOOGLE SDK TIMED OUT — CHECK INTERNET', true);
        animateHpBar(0);
        console.error('[PIXEL.AUTH] GIS SDK did not load within 9 seconds.');
        return;
      }
      setTimeout(tryInitGIS, 300);
      return;
    }

    // ── SDK ready — initialise Token Client ─────────────────
    try {
      _tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id:      GOOGLE_CLIENT_ID,
        scope:          'openid email profile',
        callback:       handleTokenResponse,  // success + error
        error_callback: (err) => {
          // Handles popup_closed / popup_failed_to_open etc.
          const isCancelled = err.type === 'popup_closed'
                           || err.type === 'popup_failed_to_open';
          if (isCancelled) {
            showLoadingMsg('POPUP CLOSED — PRESS START TO TRY AGAIN');
          } else {
            showLoadingMsg(`✖ SDK ERROR: ${(err.type || 'UNKNOWN').toUpperCase()}`, true);
            console.error('[PIXEL.AUTH] SDK error_callback:', err);
          }
          animateHpBar(0);
        }
      });

      _gisReady = true;
      animateHpBar(100);
      showLoadingMsg('READY — PRESS START ▶');
      console.info('[PIXEL.AUTH] GIS token client initialised.');

    } catch (initErr) {
      showLoadingMsg(`✖ GIS INIT FAILED: ${initErr.message}`, true);
      animateHpBar(0);
      console.error('[PIXEL.AUTH] initTokenClient threw:', initErr);
    }
  };

  // Small initial delay so the SDK script has time to parse
  setTimeout(tryInitGIS, 500);
});
