/**
 * ping.js — HTTP Latency / Ping Simulator
 * Uses fetch() timing to measure HTTP endpoint latency.
 * (True ICMP ping is not possible from a browser.)
 */

const PingSim = (() => {

  let activeAbort = null;

  function init() {
    const panel = document.getElementById('tool-ping');
    if (!panel || panel.dataset.inited) return;
    panel.dataset.inited = 'true';

    panel.innerHTML = `
      <div class="tool-header">
        <h2>◎ PING / LATENCY SIMULATOR</h2>
        <p>Measures HTTP fetch latency to a URL. <span class="text-yellow">⚠ Not ICMP ping — browser limitation.</span></p>
      </div>

      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px;">
        <div style="flex:1;min-width:240px;">
          <label class="px-label">TARGET URL</label>
          <input id="ping-input" class="px-input" type="text" placeholder="https://example.com"
            onkeydown="if(event.key==='Enter') PingSim.start()">
        </div>
        <div style="min-width:80px;">
          <label class="px-label">PINGS</label>
          <select id="ping-count" class="px-select">
            <option value="4">4</option>
            <option value="8" selected>8</option>
            <option value="16">16</option>
          </select>
        </div>
        <button class="px-btn px-btn-blue" id="ping-btn" onclick="PingSim.start()" style="height:44px;">▶ PING</button>
        <button class="px-btn px-btn-sm px-btn-red" onclick="PingSim.stop()" style="height:44px;">■ STOP</button>
      </div>

      <!-- Quick targets -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
        <span class="px-label" style="width:100%;margin:0 0 4px;">QUICK TARGETS:</span>
        ${['https://www.google.com','https://www.cloudflare.com','https://www.github.com','https://httpbin.org/get'].map(u =>
          `<button class="px-btn px-btn-sm" onclick="PingSim.setUrl('${u}')">${u.replace('https://','')}</button>`
        ).join('')}
      </div>

      <div id="ping-error" class="px-box-red hidden mb-8">
        <span style="font-family:var(--font-pixel);font-size:8px;"></span>
      </div>

      <div id="ping-results" class="hidden">
        <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;" id="ping-stats-cards"></div>

        <div class="px-box" style="margin-bottom:12px;">
          <div class="px-label">LATENCY CHART (ms)</div>
          <div id="ping-chart" style="display:flex;align-items:flex-end;gap:4px;height:100px;padding:8px 0;"></div>
        </div>

        <div class="px-box" style="border-color:var(--gray);">
          <div class="px-label">PING LOG</div>
          <div id="ping-log" style="font-family:var(--font-vt);font-size:18px;max-height:180px;overflow-y:auto;"></div>
        </div>
      </div>
    `;
  }

  function setUrl(url) {
    document.getElementById('ping-input').value = url;
  }

  async function start() {
    const url   = document.getElementById('ping-input').value.trim();
    const count = parseInt(document.getElementById('ping-count').value);

    if (!url) {
      Toast.show('ENTER A URL FIRST', 'warning');
      return;
    }
    if (!url.startsWith('http')) {
      Toast.show('URL MUST START WITH http:// or https://', 'error');
      return;
    }

    document.getElementById('ping-error').classList.add('hidden');
    document.getElementById('ping-results').classList.remove('hidden');
    document.getElementById('ping-log').innerHTML = '';
    document.getElementById('ping-chart').innerHTML = '';
    document.getElementById('ping-stats-cards').innerHTML = '';

    const latencies = [];
    activeAbort = new AbortController();

    for (let i = 1; i <= count; i++) {
      if (activeAbort.signal.aborted) break;

      const log = document.getElementById('ping-log');
      const entry = document.createElement('div');
      entry.style.color = 'var(--gray-light)';
      entry.textContent = `PING #${i} → ${url} ...`;
      log.insertBefore(entry, log.firstChild);

      const t0 = performance.now();
      let latency = null;
      let success = false;

      try {
        // Use no-cors to avoid CORS errors; we only need timing
        await fetch(url, {
          mode: 'no-cors',
          cache: 'no-store',
          signal: activeAbort.signal
        });
        latency = Math.round(performance.now() - t0);
        success = true;
      } catch (e) {
        if (e.name === 'AbortError') break;
        latency = null;
      }

      if (success && latency !== null) {
        latencies.push(latency);
        const color = latency < 100 ? 'var(--green)' : latency < 300 ? 'var(--yellow)' : 'var(--red)';
        entry.innerHTML = `<span style="color:var(--gray-light)">PING #${i} → ${url} — </span><span style="color:${color}">${latency}ms</span> <span style="color:var(--gray)">TTL=64</span>`;
        PixelAudio.tick();
      } else {
        entry.innerHTML = `<span style="color:var(--gray-light)">PING #${i} → ${url} — </span><span style="color:var(--red)">TIMEOUT / FAILED</span>`;
      }

      // Update chart
      updateChart(latencies, count);
      updateStats(latencies, count, i);

      // Wait 500ms between pings
      await new Promise(r => setTimeout(r, 500));
    }

    activeAbort = null;
    PixelAudio.success();
  }

  function stop() {
    if (activeAbort) {
      activeAbort.abort();
      activeAbort = null;
      Toast.show('PING STOPPED', 'warning');
    }
  }

  function updateChart(latencies, total) {
    const chart = document.getElementById('ping-chart');
    if (!chart) return;
    const maxVal = Math.max(...latencies, 1);
    chart.innerHTML = latencies.map((ms, i) => {
      const h = Math.round((ms / maxVal) * 88) + 4;
      const color = ms < 100 ? 'var(--green)' : ms < 300 ? 'var(--yellow)' : 'var(--red)';
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;max-width:40px;">
        <span style="font-family:var(--font-vt);font-size:12px;color:${color}">${ms}</span>
        <div style="width:100%;height:${h}px;background:${color};border:2px solid ${color};"></div>
        <span style="font-family:var(--font-vt);font-size:12px;color:var(--gray-light)">#${i+1}</span>
      </div>`;
    }).join('');
  }

  function updateStats(latencies, total, done) {
    if (!latencies.length) return;
    const min  = Math.min(...latencies);
    const max  = Math.max(...latencies);
    const avg  = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    const loss = Math.round(((done - latencies.length) / done) * 100);

    const cards = document.getElementById('ping-stats-cards');
    cards.innerHTML = `
      <div class="px-box" style="flex:1;min-width:100px;text-align:center;">
        <div class="px-label">MIN</div>
        <div style="font-family:var(--font-pixel);font-size:14px;color:var(--green);">${min}ms</div>
      </div>
      <div class="px-box" style="flex:1;min-width:100px;text-align:center;">
        <div class="px-label">AVG</div>
        <div style="font-family:var(--font-pixel);font-size:14px;color:var(--yellow);">${avg}ms</div>
      </div>
      <div class="px-box" style="flex:1;min-width:100px;text-align:center;">
        <div class="px-label">MAX</div>
        <div style="font-family:var(--font-pixel);font-size:14px;color:var(--red);">${max}ms</div>
      </div>
      <div class="px-box" style="flex:1;min-width:100px;text-align:center;">
        <div class="px-label">LOSS</div>
        <div style="font-family:var(--font-pixel);font-size:14px;color:${loss > 0 ? 'var(--red)' : 'var(--green)'};">${loss}%</div>
      </div>
      <div class="px-box" style="flex:1;min-width:100px;text-align:center;">
        <div class="px-label">SENT</div>
        <div style="font-family:var(--font-pixel);font-size:14px;color:var(--blue);">${done}/${total}</div>
      </div>
    `;
  }

  return { init, start, stop, setUrl };
})();
