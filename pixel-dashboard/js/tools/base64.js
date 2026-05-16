/**
 * base64.js — Base64 Encoder/Decoder + URL Percent Encoder
 */

const Base64Tool = (() => {

  function init() {
    const panel = document.getElementById('tool-base64');
    if (!panel || panel.dataset.inited) return;
    panel.dataset.inited = 'true';

    panel.innerHTML = `
      <div class="tool-header">
        <h2>⇄ BASE64 / URL ENCODER</h2>
        <p>Encode or decode Base64 strings and URL percent-encoded text.</p>
      </div>

      <!-- Mode tabs -->
      <div style="display:flex;gap:8px;margin-bottom:20px;">
        <button class="px-btn px-btn-pink" id="b64-tab-b64" onclick="Base64Tool.setMode('base64')">BASE64</button>
        <button class="px-btn" id="b64-tab-url" onclick="Base64Tool.setMode('url')">URL ENCODE</button>
      </div>

      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <!-- Input -->
        <div style="flex:1;min-width:240px;">
          <label class="px-label" id="b64-input-label">INPUT TEXT</label>
          <textarea id="b64-input" class="px-textarea" rows="8"
            placeholder="Type or paste text here..."
            oninput="Base64Tool.liveEncode()"></textarea>
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
            <button class="px-btn px-btn-sm px-btn-pink" onclick="Base64Tool.encode()">ENCODE ▶</button>
            <button class="px-btn px-btn-sm" onclick="Base64Tool.decode()">◀ DECODE</button>
            <button class="px-btn px-btn-sm" onclick="Base64Tool.clearAll()">CLEAR</button>
            <button class="px-btn px-btn-sm" onclick="Base64Tool.swapFields()">⇅ SWAP</button>
          </div>
        </div>

        <!-- Output -->
        <div style="flex:1;min-width:240px;">
          <label class="px-label" id="b64-output-label">ENCODED OUTPUT</label>
          <textarea id="b64-output" class="px-textarea" rows="8"
            placeholder="Output appears here..." readonly></textarea>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button class="px-btn px-btn-sm px-btn-blue" id="b64-copy-btn" onclick="Base64Tool.copyOutput()">COPY OUTPUT</button>
            <span id="b64-char-count" style="font-family:var(--font-vt);font-size:16px;color:var(--gray-light);align-self:center;"></span>
          </div>
        </div>
      </div>

      <div id="b64-error" class="px-box-red hidden mt-12">
        <span style="font-family:var(--font-pixel);font-size:8px;"></span>
      </div>

      <!-- Stats row -->
      <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap;" id="b64-stats">
        <div class="px-box" style="flex:1;min-width:120px;text-align:center;border-color:var(--gray);">
          <div class="px-label">INPUT BYTES</div>
          <div id="b64-stat-in" style="font-family:var(--font-pixel);font-size:14px;color:var(--green);">0</div>
        </div>
        <div class="px-box" style="flex:1;min-width:120px;text-align:center;border-color:var(--gray);">
          <div class="px-label">OUTPUT BYTES</div>
          <div id="b64-stat-out" style="font-family:var(--font-pixel);font-size:14px;color:var(--pink);">0</div>
        </div>
        <div class="px-box" style="flex:1;min-width:120px;text-align:center;border-color:var(--gray);">
          <div class="px-label">OVERHEAD</div>
          <div id="b64-stat-ovr" style="font-family:var(--font-pixel);font-size:14px;color:var(--yellow);">0%</div>
        </div>
        <div class="px-box" style="flex:1;min-width:120px;text-align:center;border-color:var(--gray);">
          <div class="px-label">MODE</div>
          <div id="b64-stat-mode" style="font-family:var(--font-pixel);font-size:10px;color:var(--blue);">BASE64</div>
        </div>
      </div>

      <!-- Quick test -->
      <div class="px-box mt-16" style="border-color:var(--gray);">
        <div class="px-label">QUICK TEST SAMPLES</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="px-btn px-btn-sm" onclick="Base64Tool.loadSample('hello')">HELLO WORLD</button>
          <button class="px-btn px-btn-sm" onclick="Base64Tool.loadSample('json')">JSON OBJECT</button>
          <button class="px-btn px-btn-sm" onclick="Base64Tool.loadSample('url')">URL SAMPLE</button>
        </div>
      </div>
    `;
  }

  let currentMode = 'base64';

  function setMode(mode) {
    currentMode = mode;
    const isBase64 = mode === 'base64';

    document.getElementById('b64-tab-b64').className = `px-btn ${isBase64 ? 'px-btn-pink' : ''}`;
    document.getElementById('b64-tab-url').className = `px-btn ${!isBase64 ? 'px-btn-blue' : ''}`;
    document.getElementById('b64-input-label').textContent  = isBase64 ? 'INPUT TEXT' : 'INPUT TEXT';
    document.getElementById('b64-output-label').textContent = isBase64 ? 'BASE64 OUTPUT' : 'URL ENCODED OUTPUT';
    document.getElementById('b64-stat-mode').textContent    = isBase64 ? 'BASE64' : 'URL ENC';

    clearAll();
  }

  function encode() {
    const input = document.getElementById('b64-input').value;
    hideError();
    try {
      let out;
      if (currentMode === 'base64') {
        out = btoa(unescape(encodeURIComponent(input)));
      } else {
        out = encodeURIComponent(input);
      }
      document.getElementById('b64-output').value = out;
      updateStats(input, out);
      PixelAudio.success();
    } catch (e) {
      showError('ENCODE FAILED: ' + e.message);
    }
  }

  function decode() {
    const input = document.getElementById('b64-input').value.trim();
    hideError();
    try {
      let out;
      if (currentMode === 'base64') {
        out = decodeURIComponent(escape(atob(input)));
      } else {
        out = decodeURIComponent(input);
      }
      document.getElementById('b64-output').value = out;
      updateStats(input, out);
      PixelAudio.success();
    } catch (e) {
      showError('DECODE FAILED: Invalid ' + (currentMode === 'base64' ? 'Base64' : 'URL-encoded') + ' string');
    }
  }

  function liveEncode() {
    const val = document.getElementById('b64-input').value;
    if (!val) {
      document.getElementById('b64-output').value = '';
      updateStats('', '');
      return;
    }
    try {
      let out;
      if (currentMode === 'base64') {
        out = btoa(unescape(encodeURIComponent(val)));
      } else {
        out = encodeURIComponent(val);
      }
      document.getElementById('b64-output').value = out;
      updateStats(val, out);
      hideError();
    } catch(e) {}
  }

  function updateStats(inp, out) {
    const inLen  = new TextEncoder().encode(inp).length;
    const outLen = new TextEncoder().encode(out).length;
    const ovr    = inLen > 0 ? Math.round(((outLen - inLen) / inLen) * 100) : 0;
    document.getElementById('b64-stat-in').textContent  = inLen;
    document.getElementById('b64-stat-out').textContent = outLen;
    document.getElementById('b64-stat-ovr').textContent = (ovr >= 0 ? '+' : '') + ovr + '%';
    document.getElementById('b64-char-count').textContent = outLen + ' chars';
  }

  function copyOutput() {
    const val = document.getElementById('b64-output').value;
    if (!val) return;
    navigator.clipboard.writeText(val).then(() => {
      const btn = document.getElementById('b64-copy-btn');
      btn.textContent = '✓ COPIED!';
      btn.classList.add('copy-success');
      PixelAudio.copy();
      setTimeout(() => {
        btn.textContent = 'COPY OUTPUT';
        btn.classList.remove('copy-success');
      }, 1500);
    });
  }

  function swapFields() {
    const inp = document.getElementById('b64-input');
    const out = document.getElementById('b64-output');
    const tmp = inp.value;
    inp.value = out.value;
    out.value = tmp;
    updateStats(inp.value, out.value);
    PixelAudio.click();
  }

  function clearAll() {
    document.getElementById('b64-input').value  = '';
    document.getElementById('b64-output').value = '';
    updateStats('', '');
    hideError();
  }

  function showError(msg) {
    const el = document.getElementById('b64-error');
    el.querySelector('span').textContent = '✖ ' + msg;
    el.classList.remove('hidden');
    PixelAudio.error();
  }

  function hideError() {
    document.getElementById('b64-error').classList.add('hidden');
  }

  function loadSample(type) {
    const samples = {
      hello: 'Hello, World! This is a Base64 encoding test.',
      json:  '{"user":"PlayerOne","level":99,"score":9999,"items":["sword","shield","potion"]}',
      url:   'https://example.com/search?q=pixel tools&lang=en&filter=retro 8-bit',
    };
    document.getElementById('b64-input').value = samples[type] || '';
    liveEncode();
    PixelAudio.click();
  }

  return { init, setMode, encode, decode, liveEncode, copyOutput, swapFields, clearAll, loadSample };
})();
