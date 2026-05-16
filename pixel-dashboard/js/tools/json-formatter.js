/**
 * json-formatter.js — JSON Formatter/Validator with collapsible tree.
 * Collapsible nodes styled as a pixel dungeon map.
 */

const JsonFmt = (() => {

  function init() {
    const panel = document.getElementById('tool-jsonformat');
    if (!panel || panel.dataset.inited) return;
    panel.dataset.inited = 'true';

    panel.innerHTML = `
      <div class="tool-header">
        <h2>{} JSON FORMATTER</h2>
        <p>Validate, format, and explore JSON with a collapsible pixel dungeon tree.</p>
      </div>

      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <!-- Input -->
        <div style="flex:1;min-width:280px;">
          <label class="px-label">RAW JSON INPUT</label>
          <textarea id="jf-input" class="px-textarea" rows="14"
            placeholder='{"hero":"PlayerOne","level":99}'
            oninput="JsonFmt.liveValidate()"></textarea>
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
            <button class="px-btn px-btn-yellow" onclick="JsonFmt.format()">FORMAT ▶</button>
            <button class="px-btn px-btn-sm" onclick="JsonFmt.minify()">MINIFY</button>
            <button class="px-btn px-btn-sm px-btn-blue" onclick="JsonFmt.copyFormatted()">COPY</button>
            <button class="px-btn px-btn-sm px-btn-red" onclick="JsonFmt.clear()">CLEAR</button>
            <button class="px-btn px-btn-sm" onclick="JsonFmt.loadSample()">SAMPLE</button>
          </div>
          <div id="jf-status" style="font-family:var(--font-pixel);font-size:7px;margin-top:8px;min-height:16px;"></div>
        </div>

        <!-- Tree output -->
        <div style="flex:1;min-width:280px;">
          <label class="px-label">DUNGEON MAP TREE</label>
          <div class="px-box" style="border-color:var(--yellow);box-shadow:4px 4px 0 var(--yellow-dim);min-height:200px;max-height:480px;overflow-y:auto;padding:12px;">
            <div id="jf-tree" style="font-family:var(--font-vt);font-size:18px;line-height:1.8;"></div>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
            <button class="px-btn px-btn-sm" onclick="JsonFmt.expandAll()">EXPAND ALL</button>
            <button class="px-btn px-btn-sm" onclick="JsonFmt.collapseAll()">COLLAPSE ALL</button>
          </div>
        </div>
      </div>

      <div id="jf-error" class="px-box-red hidden mt-12">
        <div class="px-label">PARSE ERROR</div>
        <div id="jf-error-msg" style="font-family:var(--font-vt);font-size:18px;"></div>
      </div>

      <!-- Stats -->
      <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap;" id="jf-stats" style="display:none;">
        <div class="px-box" style="flex:1;min-width:100px;text-align:center;border-color:var(--gray);">
          <div class="px-label">KEYS</div>
          <div id="jf-stat-keys" style="font-family:var(--font-pixel);font-size:14px;color:var(--yellow);">0</div>
        </div>
        <div class="px-box" style="flex:1;min-width:100px;text-align:center;border-color:var(--gray);">
          <div class="px-label">DEPTH</div>
          <div id="jf-stat-depth" style="font-family:var(--font-pixel);font-size:14px;color:var(--blue);">0</div>
        </div>
        <div class="px-box" style="flex:1;min-width:100px;text-align:center;border-color:var(--gray);">
          <div class="px-label">SIZE</div>
          <div id="jf-stat-size" style="font-family:var(--font-pixel);font-size:14px;color:var(--green);">0B</div>
        </div>
        <div class="px-box" style="flex:1;min-width:100px;text-align:center;border-color:var(--gray);">
          <div class="px-label">TYPE</div>
          <div id="jf-stat-type" style="font-family:var(--font-pixel);font-size:10px;color:var(--pink);">—</div>
        </div>
      </div>
    `;
  }

  let parsedData = null;
  let nodeCounter = 0;

  function liveValidate() {
    const raw = document.getElementById('jf-input').value.trim();
    const statusEl = document.getElementById('jf-status');
    const errEl    = document.getElementById('jf-error');

    if (!raw) {
      statusEl.textContent = '';
      statusEl.style.color = '';
      errEl.classList.add('hidden');
      return;
    }

    try {
      JSON.parse(raw);
      statusEl.textContent = '✓ VALID JSON';
      statusEl.style.color = 'var(--green)';
      errEl.classList.add('hidden');
    } catch (e) {
      statusEl.textContent = '✖ INVALID JSON';
      statusEl.style.color = 'var(--red)';
    }
  }

  function format() {
    const raw = document.getElementById('jf-input').value.trim();
    const errEl = document.getElementById('jf-error');
    errEl.classList.add('hidden');

    try {
      parsedData = JSON.parse(raw);
      const formatted = JSON.stringify(parsedData, null, 2);
      document.getElementById('jf-input').value = formatted;

      nodeCounter = 0;
      document.getElementById('jf-tree').innerHTML = buildTree(parsedData, '', true);
      updateStats(parsedData, formatted);
      liveValidate();
      PixelAudio.success();
    } catch(e) {
      errEl.classList.remove('hidden');
      document.getElementById('jf-error-msg').textContent = e.message;
      document.getElementById('jf-tree').innerHTML = '';
      PixelAudio.error();
    }
  }

  function minify() {
    const raw = document.getElementById('jf-input').value.trim();
    try {
      const data = JSON.parse(raw);
      document.getElementById('jf-input').value = JSON.stringify(data);
      liveValidate();
      PixelAudio.click();
      Toast.show('JSON MINIFIED', 'success');
    } catch(e) {
      Toast.show('INVALID JSON', 'error');
    }
  }

  function copyFormatted() {
    const val = document.getElementById('jf-input').value;
    if (!val) return;
    navigator.clipboard.writeText(val).then(() => {
      Toast.show('JSON COPIED', 'success');
      PixelAudio.copy();
    });
  }

  function clear() {
    document.getElementById('jf-input').value = '';
    document.getElementById('jf-tree').innerHTML = '';
    document.getElementById('jf-error').classList.add('hidden');
    document.getElementById('jf-status').textContent = '';
    parsedData = null;
    PixelAudio.click();
  }

  function loadSample() {
    const sample = {
      "hero": "PlayerOne",
      "level": 99,
      "stats": { "hp": 500, "mp": 300, "atk": 95, "def": 80 },
      "inventory": [
        { "id": 1, "name": "Pixel Sword", "dmg": 120 },
        { "id": 2, "name": "Retro Shield", "def": 85 },
        { "id": 3, "name": "8-Bit Potion", "heal": 200 }
      ],
      "achievements": ["First Blood", "Speed Runner", "Completionist"],
      "active": true,
      "score": null
    };
    document.getElementById('jf-input').value = JSON.stringify(sample, null, 2);
    format();
    PixelAudio.click();
  }

  /* ── Recursive tree builder ── */
  function buildTree(data, key, isRoot) {
    const id = 'jn-' + (++nodeCounter);
    const type = Array.isArray(data) ? 'array' : typeof data;
    const keyLabel = key !== '' ? `<span style="color:var(--blue);">"${escHtml(key)}"</span><span style="color:var(--gray)">: </span>` : '';

    if (data === null) {
      return `<div>${keyLabel}<span style="color:var(--red);">null</span></div>`;
    }

    if (type === 'object' || type === 'array') {
      const isArr = Array.isArray(data);
      const entries = isArr ? data : Object.entries(data);
      const count   = isArr ? data.length : Object.keys(data).length;
      const open    = isArr ? '[' : '{';
      const close   = isArr ? ']' : '}';

      if (count === 0) {
        return `<div>${keyLabel}<span style="color:var(--gray);">${open}${close}</span> <span style="color:var(--gray);font-size:14px;">(empty)</span></div>`;
      }

      const children = isArr
        ? data.map((v, i) => `<div style="padding-left:20px;border-left:2px solid var(--dark3);">${buildTree(v, i, false)}</div>`).join('')
        : Object.entries(data).map(([k, v]) => `<div style="padding-left:20px;border-left:2px solid var(--dark3);">${buildTree(v, k, false)}</div>`).join('');

      const collapseIcon = isRoot ? '▼' : '▼';
      return `
        <div>
          <span onclick="JsonFmt.toggleNode('${id}')" style="cursor:pointer;user-select:none;">
            ${keyLabel}<span style="color:var(--yellow);" id="${id}-icon">${collapseIcon}</span>
            <span style="color:var(--gray);">${open}</span>
            <span style="color:var(--gray);font-size:14px;" id="${id}-count">${count} ${isArr ? 'items' : 'keys'}</span>
          </span>
          <div id="${id}-body">
            ${children}
            <span style="color:var(--gray);">${close}</span>
          </div>
        </div>
      `;
    }

    // Primitives
    let valHtml;
    if (type === 'string') {
      valHtml = `<span style="color:var(--green);">"${escHtml(String(data))}"</span>`;
    } else if (type === 'number') {
      valHtml = `<span style="color:var(--pink);">${data}</span>`;
    } else if (type === 'boolean') {
      valHtml = `<span style="color:var(--orange);">${data}</span>`;
    } else {
      valHtml = `<span style="color:var(--gray);">${escHtml(String(data))}</span>`;
    }
    return `<div>${keyLabel}${valHtml}</div>`;
  }

  function toggleNode(id) {
    const body = document.getElementById(id + '-body');
    const icon = document.getElementById(id + '-icon');
    const count = document.getElementById(id + '-count');
    if (!body) return;
    const hidden = body.style.display === 'none';
    body.style.display = hidden ? '' : 'none';
    if (icon) icon.textContent = hidden ? '▼' : '▶';
    if (count) count.style.display = hidden ? 'none' : '';
    PixelAudio.click();
  }

  function expandAll() {
    document.querySelectorAll('[id^="jn-"][id$="-body"]').forEach(el => { el.style.display = ''; });
    document.querySelectorAll('[id^="jn-"][id$="-icon"]').forEach(el => { el.textContent = '▼'; });
    document.querySelectorAll('[id^="jn-"][id$="-count"]').forEach(el => { el.style.display = 'none'; });
    PixelAudio.click();
  }

  function collapseAll() {
    document.querySelectorAll('[id^="jn-"][id$="-body"]').forEach(el => { el.style.display = 'none'; });
    document.querySelectorAll('[id^="jn-"][id$="-icon"]').forEach(el => { el.textContent = '▶'; });
    document.querySelectorAll('[id^="jn-"][id$="-count"]').forEach(el => { el.style.display = ''; });
    PixelAudio.click();
  }

  function countKeys(obj, depth) {
    if (typeof obj !== 'object' || obj === null) return { keys: 0, depth };
    let keys = 0, maxDepth = depth;
    const entries = Array.isArray(obj) ? obj : Object.values(obj);
    keys += Array.isArray(obj) ? obj.length : Object.keys(obj).length;
    entries.forEach(v => {
      if (typeof v === 'object' && v !== null) {
        const sub = countKeys(v, depth + 1);
        keys += sub.keys;
        maxDepth = Math.max(maxDepth, sub.depth);
      }
    });
    return { keys, depth: maxDepth };
  }

  function updateStats(data, formatted) {
    const { keys, depth } = countKeys(data, 1);
    const size = new TextEncoder().encode(formatted).length;
    const type = Array.isArray(data) ? 'ARRAY' : typeof data === 'object' ? 'OBJECT' : typeof data;

    document.getElementById('jf-stat-keys').textContent = keys;
    document.getElementById('jf-stat-depth').textContent = depth;
    document.getElementById('jf-stat-size').textContent = size >= 1024 ? Math.round(size/1024) + 'KB' : size + 'B';
    document.getElementById('jf-stat-type').textContent = type.toUpperCase();
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, format, minify, liveValidate, copyFormatted, clear, loadSample, toggleNode, expandAll, collapseAll };
})();
