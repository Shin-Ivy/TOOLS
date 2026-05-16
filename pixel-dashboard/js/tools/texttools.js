/**
 * texttools.js — Text Case Converter & Regex Tester
 * All case conversions + live regex matching with highlight blocks.
 */

const TextTools = (() => {

  function init() {
    const panel = document.getElementById('tool-texttools');
    if (!panel || panel.dataset.inited) return;
    panel.dataset.inited = 'true';

    panel.innerHTML = `
      <div class="tool-header">
        <h2>Aa TEXT TOOLS</h2>
        <p>Case converter and regex tester with live visual match highlighting.</p>
      </div>

      <!-- TABS -->
      <div style="display:flex;gap:8px;margin-bottom:20px;">
        <button class="px-btn px-btn-pink" id="tt-tab-case" onclick="TextTools.showTab('case')">CASE CONVERTER</button>
        <button class="px-btn" id="tt-tab-regex" onclick="TextTools.showTab('regex')">REGEX TESTER</button>
      </div>

      <!-- CASE CONVERTER -->
      <div id="tt-case-panel">
        <div style="margin-bottom:12px;">
          <label class="px-label">INPUT TEXT</label>
          <textarea id="tt-input" class="px-textarea" rows="5"
            placeholder="Type or paste text here..."
            oninput="TextTools.convertAll()"></textarea>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
          <button class="px-btn px-btn-sm" onclick="TextTools.loadSample()">LOAD SAMPLE</button>
          <button class="px-btn px-btn-sm px-btn-red" onclick="document.getElementById('tt-input').value='';TextTools.convertAll()">CLEAR</button>
        </div>

        <div id="tt-cases" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;"></div>
      </div>

      <!-- REGEX TESTER -->
      <div id="tt-regex-panel" class="hidden">
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
          <div style="flex:2;min-width:200px;">
            <label class="px-label">REGEX PATTERN</label>
            <input id="tt-regex" class="px-input" type="text" placeholder="e.g. \\b\\w+\\b"
              oninput="TextTools.runRegex()">
          </div>
          <div style="flex:1;min-width:100px;">
            <label class="px-label">FLAGS</label>
            <input id="tt-flags" class="px-input" type="text" placeholder="gim" value="g" maxlength="8"
              oninput="TextTools.runRegex()">
          </div>
        </div>
        <div style="margin-bottom:12px;">
          <label class="px-label">TEST STRING</label>
          <textarea id="tt-regex-input" class="px-textarea" rows="5"
            placeholder="Paste text to test against..."
            oninput="TextTools.runRegex()"></textarea>
        </div>

        <div id="tt-regex-error" class="px-box-red hidden mb-8">
          <span style="font-family:var(--font-pixel);font-size:8px;"></span>
        </div>

        <div id="tt-regex-stats" style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;"></div>

        <div class="px-box" style="margin-bottom:12px;">
          <div class="px-label">MATCH VISUALIZATION</div>
          <div id="tt-regex-visual" style="font-family:var(--font-vt);font-size:20px;line-height:2;word-break:break-all;white-space:pre-wrap;"></div>
        </div>

        <div class="px-box" style="border-color:var(--gray);">
          <div class="px-label">MATCH LIST</div>
          <div id="tt-regex-matches" style="font-family:var(--font-vt);font-size:18px;max-height:160px;overflow-y:auto;"></div>
        </div>

        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
          <button class="px-btn px-btn-sm" onclick="TextTools.regexSample('email')">EMAIL</button>
          <button class="px-btn px-btn-sm" onclick="TextTools.regexSample('url')">URL</button>
          <button class="px-btn px-btn-sm" onclick="TextTools.regexSample('ip')">IP ADDR</button>
          <button class="px-btn px-btn-sm" onclick="TextTools.regexSample('hex')">HEX COLOR</button>
          <button class="px-btn px-btn-sm" onclick="TextTools.regexSample('word')">WORDS</button>
        </div>
      </div>
    `;
    convertAll();
  }

  /* ── Case conversions ── */
  const CASES = [
    { id: 'upper',    label: 'UPPERCASE',       fn: s => s.toUpperCase() },
    { id: 'lower',    label: 'lowercase',       fn: s => s.toLowerCase() },
    { id: 'title',    label: 'Title Case',      fn: s => s.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()) },
    { id: 'camel',    label: 'camelCase',       fn: s => s.replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/^./, c => c.toLowerCase()) },
    { id: 'pascal',   label: 'PascalCase',      fn: s => s.replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/^./, c => c.toUpperCase()) },
    { id: 'snake',    label: 'snake_case',      fn: s => s.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() },
    { id: 'kebab',    label: 'kebab-case',      fn: s => s.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase() },
    { id: 'constant', label: 'CONSTANT_CASE',   fn: s => s.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toUpperCase() },
    { id: 'dot',      label: 'dot.case',        fn: s => s.replace(/\s+/g, '.').replace(/[^a-zA-Z0-9.]/g, '').toLowerCase() },
    { id: 'reverse',  label: 'esreveR',         fn: s => s.split('').reverse().join('') },
    { id: 'alternate',label: 'aLtErNaTiNg',     fn: s => [...s].map((c,i) => i%2===0 ? c.toLowerCase() : c.toUpperCase()).join('') },
    { id: 'word-count',label: 'WORD COUNT',     fn: s => s.trim() ? s.trim().split(/\s+/).length + ' words, ' + s.length + ' chars' : '0 words' },
  ];

  function convertAll() {
    const input = document.getElementById('tt-input').value;
    const container = document.getElementById('tt-cases');
    if (!container) return;

    container.innerHTML = CASES.map(c => {
      const result = input ? c.fn(input) : '—';
      return `
        <div class="px-box" style="border-color:var(--gray);">
          <div class="px-label">${c.label}</div>
          <div style="font-family:var(--font-vt);font-size:20px;color:var(--green);word-break:break-all;margin:4px 0 8px;">${escHtml(result)}</div>
          <button class="px-btn px-btn-sm" onclick="TextTools.copyCase('${c.id}')">COPY</button>
        </div>
      `;
    }).join('');
  }

  function copyCase(id) {
    const input = document.getElementById('tt-input').value;
    const c = CASES.find(x => x.id === id);
    if (!c || !input) return;
    navigator.clipboard.writeText(c.fn(input)).then(() => {
      Toast.show('COPIED: ' + c.label.toUpperCase(), 'success', 1400);
      PixelAudio.copy();
    });
  }

  function loadSample() {
    document.getElementById('tt-input').value = 'The Quick Brown Fox Jumps Over The Lazy Dog';
    convertAll();
    PixelAudio.click();
  }

  /* ── Regex tester ── */
  function runRegex() {
    const pattern = document.getElementById('tt-regex').value;
    const flags   = document.getElementById('tt-flags').value.replace(/[^gimsuy]/g, '');
    const text    = document.getElementById('tt-regex-input').value;
    const errEl   = document.getElementById('tt-regex-error');

    errEl.classList.add('hidden');
    document.getElementById('tt-regex-visual').innerHTML = escHtml(text);
    document.getElementById('tt-regex-matches').innerHTML = '';
    document.getElementById('tt-regex-stats').innerHTML = '';

    if (!pattern || !text) return;

    let regex;
    try {
      regex = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
    } catch (e) {
      errEl.classList.remove('hidden');
      errEl.querySelector('span').textContent = '✖ INVALID REGEX: ' + e.message;
      PixelAudio.error();
      return;
    }

    const matches = [...text.matchAll(regex)];
    const count   = matches.length;

    // Stats
    document.getElementById('tt-regex-stats').innerHTML = `
      <div class="px-box" style="flex:1;min-width:100px;text-align:center;border-color:var(--gray);">
        <div class="px-label">MATCHES</div>
        <div style="font-family:var(--font-pixel);font-size:16px;color:var(--yellow);">${count}</div>
      </div>
      <div class="px-box" style="flex:1;min-width:100px;text-align:center;border-color:var(--gray);">
        <div class="px-label">GROUPS</div>
        <div style="font-family:var(--font-pixel);font-size:16px;color:var(--blue);">${matches[0]?.length - 1 || 0}</div>
      </div>
      <div class="px-box" style="flex:1;min-width:100px;text-align:center;border-color:var(--gray);">
        <div class="px-label">STATUS</div>
        <div style="font-family:var(--font-pixel);font-size:10px;color:${count > 0 ? 'var(--green)' : 'var(--red)'};">${count > 0 ? 'MATCH' : 'NO MATCH'}</div>
      </div>
    `;

    if (count === 0) return;

    // Visual highlighting
    let highlighted = '';
    let lastIdx = 0;
    matches.forEach(m => {
      highlighted += escHtml(text.slice(lastIdx, m.index));
      highlighted += `<mark class="match-highlight">${escHtml(m[0])}</mark>`;
      lastIdx = m.index + m[0].length;
    });
    highlighted += escHtml(text.slice(lastIdx));
    document.getElementById('tt-regex-visual').innerHTML = highlighted;

    // Match list
    const list = document.getElementById('tt-regex-matches');
    list.innerHTML = matches.slice(0, 50).map((m, i) =>
      `<div style="color:var(--gray-light);">[${i}] <span style="color:var(--yellow);">"${escHtml(m[0])}"</span> at index <span style="color:var(--blue);">${m.index}</span></div>`
    ).join('');
    if (count > 50) list.innerHTML += `<div style="color:var(--gray);">... and ${count - 50} more</div>`;
  }

  function regexSample(type) {
    const samples = {
      email: { p: '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}', t: 'Contact us at hello@example.com or support@pixel.tools for help.' },
      url:   { p: 'https?://[^\\s]+', t: 'Visit https://pixel.tools or http://example.com/path?q=1 for info.' },
      ip:    { p: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', t: 'Servers: 192.168.1.1, 10.0.0.254, 8.8.8.8, 255.255.255.0' },
      hex:   { p: '#[0-9a-fA-F]{3,6}\\b', t: 'Colors: #ff2079, #39ff14, #0ff0fc, #ffe600, #fff, #000' },
      word:  { p: '\\b\\w+\\b', t: 'The Quick Brown Fox Jumps Over The Lazy Dog' },
    };
    const s = samples[type];
    if (!s) return;
    document.getElementById('tt-regex').value = s.p;
    document.getElementById('tt-regex-input').value = s.t;
    document.getElementById('tt-flags').value = 'g';
    runRegex();
    PixelAudio.click();
  }

  function showTab(tab) {
    const isCase = tab === 'case';
    document.getElementById('tt-case-panel').classList.toggle('hidden', !isCase);
    document.getElementById('tt-regex-panel').classList.toggle('hidden', isCase);
    document.getElementById('tt-tab-case').className  = `px-btn ${isCase ? 'px-btn-pink' : ''}`;
    document.getElementById('tt-tab-regex').className = `px-btn ${!isCase ? 'px-btn-blue' : ''}`;
    PixelAudio.click();
  }

  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, convertAll, copyCase, loadSample, runRegex, regexSample, showTab };
})();
