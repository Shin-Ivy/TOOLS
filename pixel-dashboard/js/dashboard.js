/**
 * dashboard.js — Dashboard Controller
 * Handles routing, session guard, clock, and tool initialization.
 */

/* ── AUTH GUARD ── */
(function() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  // Populate header user info
  document.getElementById('user-name').textContent = user.name.toUpperCase();
  document.getElementById('user-email').textContent = user.email;
  document.getElementById('home-username').textContent = user.name.toUpperCase();
  document.getElementById('home-email').textContent = user.email;

  if (user.picture) {
    const img = document.getElementById('user-avatar');
    img.src = user.picture;
    img.onerror = () => {
      img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%231a1a1a'/%3E%3Ctext x='50%25' y='55%25' text-anchor='middle' dominant-baseline='middle' font-size='20' fill='%2339ff14'%3E" + encodeURIComponent(user.name[0]) + "%3C/text%3E%3C/svg%3E";
    };
  }

  Store.set('user', user);
})();

/* ── SIGN OUT ── */
function handleSignOut() {
  PixelAudio.click();
  signOut();
}

/* ── CLOCK ── */
function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('clock').textContent = `${hh}:${mm}:${ss}`;
}
setInterval(updateClock, 1000);
updateClock();

/* ── DATE ── */
(function() {
  const now = new Date();
  const d = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  document.getElementById('home-date').textContent = d;
})();

/* ── HOME STREAK ── */
(function() {
  try {
    const streak = JSON.parse(localStorage.getItem('pixel_todo_streak') || '0');
    document.getElementById('home-streak').textContent = streak;
  } catch (e) {}
})();

/* ── TOOL REGISTRY ── */
const TOOL_NAMES = {
  home:       'HOME',
  ipgeo:      'IP GEOLOCATE',
  subnet:     'SUBNET CALC',
  ping:       'PING SIM',
  base64:     'BASE64 / URL',
  palette:    'PALETTE GEN',
  texttools:  'TEXT TOOLS',
  todo:       'TODO LIST',
  pomodoro:   'POMODORO',
  jsonformat: 'JSON FORMAT'
};

const TOOL_INITS = {
  ipgeo:      () => typeof IpGeo !== 'undefined'      && IpGeo.init(),
  subnet:     () => typeof SubnetCalc !== 'undefined'  && SubnetCalc.init(),
  ping:       () => typeof PingSim !== 'undefined'     && PingSim.init(),
  base64:     () => typeof Base64Tool !== 'undefined'  && Base64Tool.init(),
  palette:    () => typeof PaletteGen !== 'undefined'  && PaletteGen.init(),
  texttools:  () => typeof TextTools !== 'undefined'   && TextTools.init(),
  todo:       () => typeof TodoList !== 'undefined'    && TodoList.init(),
  pomodoro:   () => typeof Pomodoro !== 'undefined'    && Pomodoro.init(),
  jsonformat: () => typeof JsonFmt !== 'undefined'     && JsonFmt.init(),
};

const initializedTools = new Set(['home']);

/* ── SWITCH TOOL ── */
function switchTool(toolId) {
  const prev = Store.get('activeTool');
  if (prev === toolId) return;

  // Hide all panels
  document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#nav-list li[data-tool]').forEach(li => li.classList.remove('active'));

  // Show selected
  const panel = document.getElementById('tool-' + toolId);
  if (panel) panel.classList.add('active');

  const navItem = document.querySelector(`#nav-list li[data-tool="${toolId}"]`);
  if (navItem) navItem.classList.add('active');

  // Update breadcrumb & status
  const name = TOOL_NAMES[toolId] || toolId.toUpperCase();
  document.getElementById('breadcrumb-tool').textContent = name;
  document.getElementById('status-tool').textContent = 'TOOL: ' + name;

  // Initialize tool on first visit
  if (!initializedTools.has(toolId) && TOOL_INITS[toolId]) {
    TOOL_INITS[toolId]();
    initializedTools.add(toolId);
  }

  Store.set('activeTool', toolId);
  PixelAudio.click();

  // Close mobile sidebar if open
  document.getElementById('sidebar').classList.remove('open');
}

/* ── SIDEBAR TOGGLE (mobile) ── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ── STATUS BAR MEM ── */
setInterval(() => {
  if (performance.memory) {
    const mb = Math.round(performance.memory.usedJSHeapSize / 1048576);
    document.getElementById('status-mem').textContent = 'MEM: ' + mb + 'MB';
  }
}, 5000);
