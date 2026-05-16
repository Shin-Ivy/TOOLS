/**
 * ipgeo.js — IP Geolocation Tool
 * Uses ipapi.co free API. No API key required.
 * Auto-detects current IP on load.
 */

const IpGeo = (() => {

  function init() {
    const panel = document.getElementById('tool-ipgeo');
    if (!panel || panel.dataset.inited) return;
    panel.dataset.inited = 'true';

    panel.innerHTML = `
      <div class="tool-header">
        <h2>◈ IP GEOLOCATION LOOKUP</h2>
        <p>Lookup location and network info for any IP address. Auto-detects your IP.</p>
      </div>

      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px;">
        <div style="flex:1;min-width:200px;">
          <label class="px-label">IP ADDRESS (BLANK = YOUR IP)</label>
          <input id="ipgeo-input" class="px-input" type="text" placeholder="8.8.8.8 or leave blank"
            onkeydown="if(event.key==='Enter') IpGeo.lookup()">
        </div>
        <button class="px-btn px-btn-blue" onclick="IpGeo.lookup()" style="height:44px;">LOOKUP</button>
        <button class="px-btn px-btn-sm" onclick="IpGeo.lookupMine()" style="height:44px;">MY IP</button>
      </div>

      <div id="ipgeo-loading" class="hidden" style="font-family:var(--font-pixel);font-size:8px;color:var(--blue);">
        ▶ QUERYING DATABASE...
        <span class="blink">_</span>
      </div>
      <div id="ipgeo-error" class="px-box-red hidden mt-8">
        <span style="font-family:var(--font-pixel);font-size:8px;"></span>
      </div>

      <div id="ipgeo-results" class="hidden">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:16px;" id="ipgeo-cards"></div>

        <div class="px-box" id="ipgeo-map-box">
          <div class="px-label">COORDINATES</div>
          <div id="ipgeo-coords" style="font-family:var(--font-vt);font-size:20px;"></div>
          <div id="ipgeo-map-link" style="margin-top:8px;"></div>
        </div>

        <div class="px-box mt-16" style="border-color:var(--gray);">
          <div class="px-label">RAW RESPONSE</div>
          <pre id="ipgeo-raw" class="px-code" style="font-size:14px;max-height:200px;overflow-y:auto;"></pre>
        </div>
      </div>
    `;

    // Auto lookup own IP on init
    lookupMine();
  }

  async function lookup() {
    const val = document.getElementById('ipgeo-input').value.trim();
    const url = val
      ? `https://ipapi.co/${encodeURIComponent(val)}/json/`
      : `https://ipapi.co/json/`;
    await fetchAndDisplay(url);
  }

  async function lookupMine() {
    document.getElementById('ipgeo-input').value = '';
    await fetchAndDisplay('https://ipapi.co/json/');
  }

  async function fetchAndDisplay(url) {
    const loading = document.getElementById('ipgeo-loading');
    const errBox  = document.getElementById('ipgeo-error');
    const results = document.getElementById('ipgeo-results');

    loading.classList.remove('hidden');
    errBox.classList.add('hidden');
    results.classList.add('hidden');

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      if (data.error) throw new Error(data.reason || data.error);

      loading.classList.add('hidden');

      // Cards
      const cards = [
        { label: 'IP ADDRESS',  val: data.ip,              color: 'green' },
        { label: 'CITY',        val: data.city || '—',     color: 'blue'  },
        { label: 'REGION',      val: data.region || '—',   color: 'blue'  },
        { label: 'COUNTRY',     val: (data.country_name || '—') + ' ' + (data.country || ''), color: 'pink' },
        { label: 'ISP / ORG',  val: data.org || '—',       color: 'yellow'},
        { label: 'TIMEZONE',    val: data.timezone || '—', color: 'green' },
        { label: 'ASN',         val: data.asn || '—',      color: 'gray'  },
        { label: 'POSTAL',      val: data.postal || '—',   color: 'gray'  },
      ];

      const cardsEl = document.getElementById('ipgeo-cards');
      cardsEl.innerHTML = cards.map(c => `
        <div class="px-box${c.color === 'pink' ? '-pink' : c.color === 'blue' ? '-blue' : c.color === 'yellow' ? '-yellow' : ''}">
          <div class="px-label">${c.label}</div>
          <div style="font-family:var(--font-vt);font-size:22px;color:var(--${c.color === 'gray' ? 'gray-light' : c.color});word-break:break-all;">${c.val}</div>
        </div>
      `).join('');

      // Coords + map link
      const lat = data.latitude, lon = data.longitude;
      document.getElementById('ipgeo-coords').textContent =
        lat && lon ? `LAT: ${lat}  LON: ${lon}` : 'COORDINATES UNAVAILABLE';
      document.getElementById('ipgeo-map-link').innerHTML = lat && lon
        ? `<a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=10" target="_blank" class="px-btn px-btn-sm px-btn-blue">OPEN MAP ↗</a>`
        : '';

      // Raw JSON
      document.getElementById('ipgeo-raw').textContent = JSON.stringify(data, null, 2);

      results.classList.remove('hidden');
      PixelAudio.success();

    } catch (e) {
      loading.classList.add('hidden');
      errBox.classList.remove('hidden');
      errBox.querySelector('span').textContent = '✖ LOOKUP FAILED: ' + e.message;
      PixelAudio.error();
    }
  }

  return { init, lookup, lookupMine };
})();
