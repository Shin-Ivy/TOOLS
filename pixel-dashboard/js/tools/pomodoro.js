/**
 * pomodoro.js — Pomodoro Timer
 * Work/break state machine with Web Audio API bleeps.
 * LocalStorage persistence for settings and session count.
 * Retro 7-segment style display.
 */

const Pomodoro = (() => {
  let timer = null;
  let secondsLeft = 25 * 60;
  let isRunning = false;
  let mode = 'work'; // 'work' | 'short' | 'long'
  let sessionCount = 0;
  let totalPomos = 0;
  let tickEnabled = false;

  const MODES = {
    work:  { label: 'WORK SESSION', seconds: 25 * 60, color: 'var(--pink)' },
    short: { label: 'SHORT BREAK',  seconds:  5 * 60, color: 'var(--blue)' },
    long:  { label: 'LONG BREAK',   seconds: 15 * 60, color: 'var(--green)' },
  };

  function loadState() {
    try {
      sessionCount = parseInt(localStorage.getItem('pomo_sessions') || '0');
      totalPomos   = parseInt(localStorage.getItem('pomo_total')    || '0');
      tickEnabled  = localStorage.getItem('pomo_tick') !== 'false';
    } catch(e) {}
  }

  function saveState() {
    localStorage.setItem('pomo_sessions', sessionCount);
    localStorage.setItem('pomo_total', totalPomos);
    localStorage.setItem('pomo_tick', tickEnabled);
  }

  function init() {
    const panel = document.getElementById('tool-pomodoro');
    if (!panel || panel.dataset.inited) return;
    panel.dataset.inited = 'true';
    loadState();

    panel.innerHTML = `
      <div class="tool-header">
        <h2>◷ POMODORO TIMER</h2>
        <p>25-min focus sessions with 5/15 min breaks. Web Audio bleeps included.</p>
      </div>

      <div style="display:flex;gap:16px;flex-wrap:wrap;">

        <!-- Timer display -->
        <div style="flex:1;min-width:280px;">
          <div class="px-box" id="pomo-main-box" style="text-align:center;padding:32px 24px;border-color:var(--pink);box-shadow:6px 6px 0 var(--pink-dim);">
            <div class="px-label" id="pomo-mode-label">WORK SESSION</div>
            <div id="pomo-display" style="font-family:var(--font-pixel);font-size:clamp(32px,8vw,64px);color:var(--pink);letter-spacing:8px;margin:16px 0;text-shadow:0 0 20px var(--pink);">25:00</div>
            <div class="px-progress-wrap pink" style="margin:12px 0 24px;">
              <div class="px-progress-fill" id="pomo-progress" style="width:100%;animation:none;"></div>
            </div>
            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
              <button class="px-btn px-btn-pink px-btn-lg" id="pomo-start-btn" onclick="Pomodoro.toggle()">▶ START</button>
              <button class="px-btn px-btn-sm" onclick="Pomodoro.reset()">↺ RESET</button>
              <button class="px-btn px-btn-sm px-btn-blue" onclick="Pomodoro.skip()">▷▷ SKIP</button>
            </div>
          </div>

          <!-- Mode selector -->
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button class="px-btn px-btn-sm px-btn-pink" style="flex:1" onclick="Pomodoro.setMode('work')">WORK</button>
            <button class="px-btn px-btn-sm px-btn-blue" style="flex:1" onclick="Pomodoro.setMode('short')">SHORT BRK</button>
            <button class="px-btn px-btn-sm" style="flex:1" onclick="Pomodoro.setMode('long')">LONG BRK</button>
          </div>
        </div>

        <!-- Stats + settings -->
        <div style="flex:1;min-width:200px;display:flex;flex-direction:column;gap:12px;">
          <div class="px-box-yellow" style="text-align:center;">
            <div class="px-label">TODAY'S SESSIONS</div>
            <div id="pomo-sessions" style="font-family:var(--font-pixel);font-size:36px;color:var(--yellow);">0</div>
          </div>
          <div class="px-box">
            <div class="px-label">ALL-TIME POMODOROS</div>
            <div id="pomo-total" style="font-family:var(--font-pixel);font-size:24px;color:var(--green);">0</div>
          </div>
          <div class="px-box" style="border-color:var(--gray);">
            <div class="px-label">CURRENT SESSION</div>
            <div id="pomo-session-dots" style="font-family:var(--font-vt);font-size:24px;color:var(--pink);">○ ○ ○ ○</div>
            <div style="font-family:var(--font-vt);font-size:14px;color:var(--gray-light);margin-top:4px;">4 pomodoros = long break</div>
          </div>
          <div class="px-box" style="border-color:var(--gray);">
            <div class="px-label">SETTINGS</div>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-family:var(--font-vt);font-size:18px;color:var(--gray-light);">
              <input type="checkbox" id="pomo-tick-check" onchange="Pomodoro.toggleTick(this.checked)" style="width:14px;height:14px;accent-color:var(--green);">
              TICK SOUND
            </label>
          </div>
        </div>

      </div>

      <div class="px-box mt-16" id="pomo-log-box" style="border-color:var(--gray);">
        <div class="px-label">SESSION LOG</div>
        <div id="pomo-log" style="font-family:var(--font-vt);font-size:17px;color:var(--gray-light);max-height:120px;overflow-y:auto;"></div>
      </div>
    `;

    updateDisplay();
    updateStats();
    document.getElementById('pomo-tick-check').checked = tickEnabled;
  }

  function formatTime(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return m + ':' + s;
  }

  function updateDisplay() {
    const cfg = MODES[mode];
    const el = document.getElementById('pomo-display');
    if (el) el.textContent = formatTime(secondsLeft);

    const box = document.getElementById('pomo-main-box');
    if (box) {
      box.style.borderColor = cfg.color;
      box.style.boxShadow = `6px 6px 0 ${mode === 'work' ? 'var(--pink-dim)' : mode === 'short' ? 'var(--blue-dim)' : 'var(--green-dim)'}`;
    }

    const modeLabel = document.getElementById('pomo-mode-label');
    if (modeLabel) modeLabel.textContent = cfg.label;

    const displayEl = document.getElementById('pomo-display');
    if (displayEl) displayEl.style.color = cfg.color;

    const totalSecs = cfg.seconds;
    const pct = (secondsLeft / totalSecs) * 100;
    const prog = document.getElementById('pomo-progress');
    if (prog) {
      prog.style.width = pct + '%';
      prog.style.background = cfg.color;
    }

    // Update sidebar mini
    const mini = document.getElementById('pomo-sidebar-time');
    if (mini) mini.textContent = formatTime(secondsLeft);

    // Update page title
    if (isRunning) {
      document.title = `[${formatTime(secondsLeft)}] PIXEL.TOOLS`;
    } else {
      document.title = 'PIXEL.TOOLS — Dashboard';
    }
  }

  function updateStats() {
    const sesEl = document.getElementById('pomo-sessions');
    if (sesEl) sesEl.textContent = sessionCount;
    const totEl = document.getElementById('pomo-total');
    if (totEl) totEl.textContent = totalPomos;

    // Session dots (up to 4)
    const dotsEl = document.getElementById('pomo-session-dots');
    if (dotsEl) {
      const pos = totalPomos % 4;
      dotsEl.textContent = Array.from({length: 4}, (_, i) => i < pos ? '●' : '○').join(' ');
    }
  }

  function addLog(msg) {
    const log = document.getElementById('pomo-log');
    if (!log) return;
    const now = new Date();
    const t = [now.getHours(), now.getMinutes(), now.getSeconds()].map(n => String(n).padStart(2,'0')).join(':');
    const entry = document.createElement('div');
    entry.textContent = `[${t}] ${msg}`;
    log.insertBefore(entry, log.firstChild);
    if (log.children.length > 20) log.lastChild.remove();
  }

  function tick() {
    secondsLeft--;
    if (tickEnabled && secondsLeft > 0) PixelAudio.tick();

    if (secondsLeft <= 0) {
      secondsLeft = 0;
      updateDisplay();
      complete();
      return;
    }
    updateDisplay();
  }

  function complete() {
    clearInterval(timer);
    timer = null;
    isRunning = false;

    const btn = document.getElementById('pomo-start-btn');
    if (btn) btn.textContent = '▶ START';

    const sidebarMini = document.getElementById('sidebar-pomodoro-mini');

    if (mode === 'work') {
      sessionCount++;
      totalPomos++;
      saveState();
      updateStats();
      PixelAudio.pomodoroEnd();
      addLog('✓ WORK SESSION COMPLETE!');
      Toast.show('WORK SESSION COMPLETE! TAKE A BREAK!', 'success', 4000);

      // Every 4 pomodoros, suggest long break
      if (totalPomos % 4 === 0) {
        setMode('long', false);
        addLog('→ LONG BREAK TIME (4 pomodoros done)');
      } else {
        setMode('short', false);
        addLog('→ SHORT BREAK TIME');
      }
      if (sidebarMini) sidebarMini.style.display = 'none';
    } else {
      PixelAudio.breakStart();
      addLog('✓ BREAK COMPLETE — BACK TO WORK!');
      Toast.show('BREAK OVER! START YOUR NEXT SESSION.', 'info', 3000);
      setMode('work', false);
      if (sidebarMini) sidebarMini.style.display = 'none';
    }
  }

  function toggle() {
    if (isRunning) {
      clearInterval(timer);
      timer = null;
      isRunning = false;
      const btn = document.getElementById('pomo-start-btn');
      if (btn) btn.textContent = '▶ RESUME';
      addLog('⏸ PAUSED at ' + formatTime(secondsLeft));
      const sidebarMini = document.getElementById('sidebar-pomodoro-mini');
      if (sidebarMini) sidebarMini.style.display = 'none';
    } else {
      isRunning = true;
      timer = setInterval(tick, 1000);
      const btn = document.getElementById('pomo-start-btn');
      if (btn) btn.textContent = '⏸ PAUSE';
      addLog('▶ STARTED ' + MODES[mode].label);
      PixelAudio.click();
      const sidebarMini = document.getElementById('sidebar-pomodoro-mini');
      if (sidebarMini) sidebarMini.style.display = 'block';
    }
  }

  function reset() {
    clearInterval(timer);
    timer = null;
    isRunning = false;
    secondsLeft = MODES[mode].seconds;
    updateDisplay();
    const btn = document.getElementById('pomo-start-btn');
    if (btn) btn.textContent = '▶ START';
    addLog('↺ RESET');
    PixelAudio.click();
  }

  function skip() {
    clearInterval(timer);
    timer = null;
    isRunning = false;
    secondsLeft = 0;
    complete();
  }

  function setMode(m, doReset = true) {
    mode = m;
    if (doReset) {
      clearInterval(timer);
      timer = null;
      isRunning = false;
      secondsLeft = MODES[m].seconds;
      const btn = document.getElementById('pomo-start-btn');
      if (btn) btn.textContent = '▶ START';
    } else {
      secondsLeft = MODES[m].seconds;
    }
    updateDisplay();
  }

  function toggleTick(val) {
    tickEnabled = val;
    saveState();
  }

  return { init, toggle, reset, skip, setMode, toggleTick };
})();
