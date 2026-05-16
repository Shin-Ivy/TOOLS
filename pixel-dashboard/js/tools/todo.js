/**
 * todo.js — Retro To-Do List with LocalStorage persistence and streak counter.
 * Tracks consecutive days with at least one completed task.
 */

const TodoList = (() => {

  const STORAGE_KEY   = 'pixel_todo_items';
  const STREAK_KEY    = 'pixel_todo_streak';
  const LAST_DONE_KEY = 'pixel_todo_last_done';

  let items = [];

  function loadItems() {
    try { items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e) { items = []; }
  }

  function saveItems() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function getStreak() {
    try { return parseInt(localStorage.getItem(STREAK_KEY) || '0'); } catch(e) { return 0; }
  }

  function updateStreak() {
    const today    = new Date().toDateString();
    const lastDone = localStorage.getItem(LAST_DONE_KEY) || '';
    const streak   = getStreak();

    if (lastDone === today) return streak; // already updated today

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    let newStreak;
    if (lastDone === yesterday) {
      newStreak = streak + 1; // continuing streak
    } else if (!lastDone) {
      newStreak = 1; // first ever completion
    } else {
      newStreak = 1; // streak broken, restart
    }

    localStorage.setItem(STREAK_KEY, newStreak);
    localStorage.setItem(LAST_DONE_KEY, today);

    // Update home widget
    const homeStreak = document.getElementById('home-streak');
    if (homeStreak) homeStreak.textContent = newStreak;

    return newStreak;
  }

  function init() {
    const panel = document.getElementById('tool-todo');
    if (!panel || panel.dataset.inited) return;
    panel.dataset.inited = 'true';
    loadItems();

    panel.innerHTML = `
      <div class="tool-header">
        <h2>☑ RETRO TODO LIST</h2>
        <p>Tasks saved to local storage. Streak counts consecutive days with completions.</p>
      </div>

      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <!-- Main list area -->
        <div style="flex:2;min-width:280px;">
          <div style="display:flex;gap:8px;margin-bottom:16px;">
            <input id="todo-input" class="px-input" type="text" placeholder="ADD NEW TASK..."
              maxlength="120" style="flex:1;"
              onkeydown="if(event.key==='Enter') TodoList.addItem()">
            <button class="px-btn px-btn-yellow" onclick="TodoList.addItem()">+ ADD</button>
          </div>

          <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
            <button class="px-btn px-btn-sm" id="todo-filter-all"    onclick="TodoList.setFilter('all')">ALL</button>
            <button class="px-btn px-btn-sm" id="todo-filter-active" onclick="TodoList.setFilter('active')">ACTIVE</button>
            <button class="px-btn px-btn-sm" id="todo-filter-done"   onclick="TodoList.setFilter('done')">DONE</button>
            <button class="px-btn px-btn-sm px-btn-red" onclick="TodoList.clearDone()">CLEAR DONE</button>
          </div>

          <div id="todo-list" style="display:flex;flex-direction:column;gap:6px;min-height:60px;"></div>
          <div id="todo-empty" class="hidden" style="font-family:var(--font-pixel);font-size:8px;color:var(--gray);padding:20px;text-align:center;">
            NO TASKS FOUND. INSERT QUEST!
          </div>
        </div>

        <!-- Stats sidebar -->
        <div style="flex:1;min-width:160px;display:flex;flex-direction:column;gap:12px;">
          <div class="px-box-yellow" style="text-align:center;">
            <div class="px-label">🔥 STREAK</div>
            <div id="todo-streak" style="font-family:var(--font-pixel);font-size:36px;color:var(--yellow);">0</div>
            <div style="font-family:var(--font-vt);font-size:16px;color:var(--gray-light);">DAYS</div>
          </div>
          <div class="px-box" style="text-align:center;">
            <div class="px-label">TOTAL TASKS</div>
            <div id="todo-stat-total" style="font-family:var(--font-pixel);font-size:20px;color:var(--green);">0</div>
          </div>
          <div class="px-box" style="text-align:center;border-color:var(--gray);">
            <div class="px-label">COMPLETED</div>
            <div id="todo-stat-done" style="font-family:var(--font-pixel);font-size:20px;color:var(--pink);">0</div>
          </div>
          <div class="px-box" style="text-align:center;border-color:var(--gray);">
            <div class="px-label">PROGRESS</div>
            <div class="px-progress-wrap yellow" style="margin-top:6px;">
              <div class="px-progress-fill" id="todo-progress" style="width:0%;background:var(--yellow);animation:none;"></div>
            </div>
            <div id="todo-pct" style="font-family:var(--font-pixel);font-size:9px;color:var(--yellow);margin-top:4px;">0%</div>
          </div>
        </div>
      </div>
    `;

    setFilter('all');
    renderStreak();
  }

  let currentFilter = 'all';

  function setFilter(f) {
    currentFilter = f;
    ['all','active','done'].forEach(id => {
      const btn = document.getElementById('todo-filter-' + id);
      if (btn) btn.className = `px-btn px-btn-sm ${f === id ? 'px-btn-yellow' : ''}`;
    });
    render();
  }

  function addItem() {
    const input = document.getElementById('todo-input');
    const text  = input.value.trim();
    if (!text) { Toast.show('TYPE A TASK FIRST!', 'warning'); return; }

    items.unshift({ id: Date.now(), text, done: false, created: new Date().toISOString() });
    saveItems();
    input.value = '';
    render();
    PixelAudio.success();
    Toast.show('TASK ADDED!', 'success', 1200);
  }

  function toggleItem(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    item.done = !item.done;
    saveItems();

    if (item.done) {
      const streak = updateStreak();
      renderStreak(streak);
      PixelAudio.taskDone();
      Toast.show('QUEST COMPLETE! 🎉', 'success', 1800);
    } else {
      PixelAudio.click();
    }
    render();
  }

  function deleteItem(id) {
    items = items.filter(i => i.id !== id);
    saveItems();
    render();
    PixelAudio.click();
  }

  function clearDone() {
    items = items.filter(i => !i.done);
    saveItems();
    render();
    PixelAudio.click();
    Toast.show('CLEARED COMPLETED TASKS', 'info');
  }

  function render() {
    const list  = document.getElementById('todo-list');
    const empty = document.getElementById('todo-empty');
    if (!list) return;

    const visible = items.filter(i => {
      if (currentFilter === 'active') return !i.done;
      if (currentFilter === 'done')   return i.done;
      return true;
    });

    if (visible.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      list.innerHTML = visible.map(item => `
        <div style="display:flex;align-items:center;gap:8px;border:2px solid ${item.done ? 'var(--gray)' : 'var(--green)'};
          background:var(--dark);padding:10px 12px;${item.done ? 'opacity:0.6;' : ''}">
          <button onclick="TodoList.toggleItem(${item.id})"
            style="width:22px;height:22px;border:2px solid ${item.done ? 'var(--yellow)' : 'var(--green)'};
            background:${item.done ? 'var(--yellow)' : 'transparent'};cursor:pointer;flex-shrink:0;font-size:14px;
            color:var(--black);line-height:1;">
            ${item.done ? '✓' : ''}
          </button>
          <span style="flex:1;font-family:var(--font-vt);font-size:20px;
            color:${item.done ? 'var(--gray-light)' : 'var(--white)'};
            ${item.done ? 'text-decoration:line-through;' : ''}
            word-break:break-word;">
            ${escHtml(item.text)}
          </span>
          <button onclick="TodoList.deleteItem(${item.id})"
            class="px-btn px-btn-sm px-btn-red" style="flex-shrink:0;">✖</button>
        </div>
      `).join('');
    }

    // Stats
    const total = items.length;
    const done  = items.filter(i => i.done).length;
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
    const statT = document.getElementById('todo-stat-total');
    const statD = document.getElementById('todo-stat-done');
    const prog  = document.getElementById('todo-progress');
    const pctEl = document.getElementById('todo-pct');
    if (statT) statT.textContent = total;
    if (statD) statD.textContent = done;
    if (prog)  prog.style.width  = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
  }

  function renderStreak(streak) {
    const s = streak !== undefined ? streak : getStreak();
    const el = document.getElementById('todo-streak');
    if (el) el.textContent = s;
    const homeEl = document.getElementById('home-streak');
    if (homeEl) homeEl.textContent = s;
  }

  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { init, addItem, toggleItem, deleteItem, clearDone, setFilter };
})();
