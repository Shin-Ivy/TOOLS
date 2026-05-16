/**
 * subnet.js — Subnet / CIDR Calculator
 * Pure math — no external libraries.
 * Calculates network address, broadcast, subnet mask,
 * wildcard mask, first/last usable host, total & usable hosts,
 * IP class, private range detection, and binary representation.
 */

const SubnetCalc = (() => {

  function init() {
    const panel = document.getElementById('tool-subnet');
    if (!panel || panel.dataset.inited) return;
    panel.dataset.inited = 'true';

    panel.innerHTML = `
      <div class="tool-header">
        <h2>⊞ SUBNET CALCULATOR</h2>
        <p>Enter an IP address with CIDR prefix (e.g. 192.168.1.0/24)</p>
      </div>

      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;">
        <div style="flex:1;min-width:200px;">
          <label class="px-label">CIDR NOTATION</label>
          <input id="subnet-input" class="px-input" type="text"
            placeholder="192.168.1.0/24" maxlength="20"
            onkeydown="if(event.key==='Enter') SubnetCalc.calculate()">
        </div>
        <button class="px-btn px-btn-blue" onclick="SubnetCalc.calculate()" style="height:44px;">CALCULATE</button>
        <button class="px-btn px-btn-sm" onclick="SubnetCalc.loadExample()" style="height:44px;">EXAMPLE</button>
      </div>

      <div id="subnet-error" class="px-box-red mt-16 hidden">
        <span style="font-family:var(--font-pixel);font-size:8px;"></span>
      </div>

      <div id="subnet-results" class="hidden mt-16">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:16px;">
          <div class="px-box-blue" id="sr-network">
            <div class="px-label">NETWORK ADDRESS</div>
            <div class="res-val text-blue"></div>
          </div>
          <div class="px-box-blue" id="sr-broadcast">
            <div class="px-label">BROADCAST ADDRESS</div>
            <div class="res-val text-blue"></div>
          </div>
          <div class="px-box" id="sr-mask">
            <div class="px-label">SUBNET MASK</div>
            <div class="res-val text-green"></div>
          </div>
          <div class="px-box" id="sr-wildcard">
            <div class="px-label">WILDCARD MASK</div>
            <div class="res-val text-green"></div>
          </div>
          <div class="px-box-pink" id="sr-first">
            <div class="px-label">FIRST HOST</div>
            <div class="res-val text-pink"></div>
          </div>
          <div class="px-box-pink" id="sr-last">
            <div class="px-label">LAST HOST</div>
            <div class="res-val text-pink"></div>
          </div>
          <div class="px-box-yellow" id="sr-total">
            <div class="px-label">TOTAL ADDRESSES</div>
            <div class="res-val text-yellow"></div>
          </div>
          <div class="px-box-yellow" id="sr-usable">
            <div class="px-label">USABLE HOSTS</div>
            <div class="res-val text-yellow"></div>
          </div>
        </div>

        <div class="px-box">
          <div class="px-label">IP CLASS &amp; DETAILS</div>
          <table class="px-table">
            <thead><tr><th>PROPERTY</th><th>VALUE</th></tr></thead>
            <tbody id="subnet-table-body"></tbody>
          </table>
        </div>

        <div class="px-box mt-16">
          <div class="px-label">BINARY REPRESENTATION</div>
          <div id="subnet-binary" style="font-family:var(--font-vt);font-size:18px;line-height:2.2;"></div>
        </div>

        <div class="px-box mt-16">
          <div class="px-label">VISUAL RANGE</div>
          <div id="subnet-visual" style="font-family:var(--font-vt);font-size:20px;line-height:2;"></div>
        </div>

        <div class="px-box mt-16" style="border-color:var(--gray);">
          <div class="px-label">QUICK ACTIONS</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="px-btn px-btn-sm px-btn-blue" onclick="SubnetCalc.copyResult()">COPY RESULTS</button>
            <button class="px-btn px-btn-sm" onclick="SubnetCalc.splitSubnet()">SPLIT INTO /25 & /26</button>
          </div>
          <div id="subnet-split" style="font-family:var(--font-vt);font-size:18px;color:var(--gray-light);margin-top:8px;"></div>
        </div>
      </div>
    `;

    // Inject result-val style once
    if (!document.getElementById('subnet-res-style')) {
      const s = document.createElement('style');
      s.id = 'subnet-res-style';
      s.textContent = `.res-val{font-family:var(--font-pixel);font-size:10px;margin-top:6px;word-break:break-all;}`;
      document.head.appendChild(s);
    }
  }

  /* ── Bit helpers ── */
  function ipToInt(ip) {
    const p = ip.trim().split('.').map(Number);
    if (p.length !== 4 || p.some(x => isNaN(x) || x < 0 || x > 255))
      throw new Error('INVALID IP ADDRESS: ' + ip);
    return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
  }

  function intToIp(n) {
    return [(n>>>24)&0xFF,(n>>>16)&0xFF,(n>>>8)&0xFF,n&0xFF].join('.');
  }

  function intToBin32(n) {
    return (n>>>0).toString(2).padStart(32,'0');
  }

  function formatBin(b) {
    return b.match(/.{8}/g).join('.');
  }

  /* ── IP class detection ── */
  function getIpClass(ip) {
    const f = parseInt(ip.split('.')[0]);
    if (f === 0)                          return { cls:'RESERVED (0.x.x.x)',  def:'/8'  };
    if (f < 127)                          return { cls:'CLASS A',              def:'/8'  };
    if (f === 127)                        return { cls:'LOOPBACK (127.x.x.x)', def:'/8'  };
    if (f <= 191)                         return { cls:'CLASS B',              def:'/16' };
    if (f <= 223)                         return { cls:'CLASS C',              def:'/24' };
    if (f <= 239)                         return { cls:'CLASS D MULTICAST',    def:'N/A' };
    return                                       { cls:'CLASS E RESERVED',     def:'N/A' };
  }

  /* ── Private range check ── */
  function isPrivate(n) {
    return (
      (n >>> 24) === 10 ||
      ((n >>> 16) & 0xFFF0) === 0xAC10 ||   // 172.16–31
      (n >>> 16) === 0xC0A8                  // 192.168
    );
  }

  /* ── Main calculation ── */
  function calculate() {
    const raw    = document.getElementById('subnet-input').value.trim();
    const errBox = document.getElementById('subnet-error');
    const resBox = document.getElementById('subnet-results');
    errBox.classList.add('hidden');
    resBox.classList.add('hidden');

    try {
      if (!raw.includes('/')) throw new Error('USE CIDR FORMAT: e.g. 192.168.1.0/24');
      const [ipStr, pfxStr] = raw.split('/');
      const prefix = parseInt(pfxStr, 10);
      if (isNaN(prefix) || prefix < 0 || prefix > 32)
        throw new Error('PREFIX MUST BE 0–32');

      const ipInt  = ipToInt(ipStr);
      const mask   = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
      const wild   = (~mask) >>> 0;
      const net    = (ipInt & mask) >>> 0;
      const bcast  = (net | wild) >>> 0;

      let first, last;
      if (prefix >= 31) {
        // /31 point-to-point, /32 host route
        first = net;
        last  = bcast;
      } else {
        first = (net + 1) >>> 0;
        last  = (bcast - 1) >>> 0;
      }

      const totalAddr  = prefix === 0 ? 4294967296 : Math.pow(2, 32 - prefix);
      const usableHost = prefix >= 31 ? totalAddr : Math.max(0, totalAddr - 2);

      const cls  = getIpClass(intToIp(net));
      const priv = isPrivate(net);

      // Result cards
      setCard('sr-network',   intToIp(net));
      setCard('sr-broadcast', intToIp(bcast));
      setCard('sr-mask',      intToIp(mask));
      setCard('sr-wildcard',  intToIp(wild));
      setCard('sr-first',     prefix === 32 ? 'HOST ROUTE' : prefix === 31 ? intToIp(first) + ' (P2P)' : intToIp(first));
      setCard('sr-last',      prefix === 32 ? intToIp(net) : prefix === 31 ? intToIp(last) + ' (P2P)' : intToIp(last));
      setCard('sr-total',     totalAddr >= 1e9 ? (totalAddr/1e9).toFixed(2) + 'B' : totalAddr.toLocaleString());
      setCard('sr-usable',    usableHost >= 1e9 ? (usableHost/1e9).toFixed(2)+'B' : usableHost.toLocaleString());

      // Detail table
      document.getElementById('subnet-table-body').innerHTML = `
        <tr><td>IP CLASS</td><td class="text-yellow">${cls.cls}</td></tr>
        <tr><td>DEFAULT PREFIX</td><td>${cls.def}</td></tr>
        <tr><td>SCOPE</td><td class="${priv ? 'text-blue' : 'text-pink'}">${priv ? 'PRIVATE (RFC 1918)' : 'PUBLIC'}</td></tr>
        <tr><td>FULL CIDR</td><td class="text-green">${intToIp(net)}/${prefix}</td></tr>
        <tr><td>PREFIX LENGTH</td><td>/${prefix}</td></tr>
        <tr><td>NETWORK BITS</td><td>${prefix}</td></tr>
        <tr><td>HOST BITS</td><td>${32 - prefix}</td></tr>
        <tr><td>POINT-TO-POINT?</td><td>${prefix === 31 ? 'YES (/31)' : 'NO'}</td></tr>
        <tr><td>HOST ROUTE?</td><td>${prefix === 32 ? 'YES (/32)' : 'NO'}</td></tr>
        <tr><td>LOOPBACK?</td><td>${intToIp(net).startsWith('127.') ? 'YES' : 'NO'}</td></tr>
      `;

      // Binary
      const ipBin   = intToBin32(ipInt);
      const maskBin = intToBin32(mask);
      const netBin  = intToBin32(net);
      document.getElementById('subnet-binary').innerHTML =
        `<span class="text-gray">IP ADDRESS&nbsp;&nbsp; </span><span style="color:var(--green);">${formatBin(ipBin)}</span><br>` +
        `<span class="text-gray">SUBNET MASK&nbsp; </span><span style="color:var(--blue);">${formatBin(maskBin)}</span><br>` +
        `<span class="text-gray">NETWORK ADDR </span><span style="color:var(--pink);">${formatBin(netBin)}</span><br>` +
        `<span class="text-gray" style="font-size:14px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ` +
        `<span style="color:var(--blue);">${'N'.repeat(prefix)}</span><span style="color:var(--pink);">${'H'.repeat(32-prefix)}</span>` +
        `&nbsp;(N=Network H=Host)</span>`;

      // Visual range
      document.getElementById('subnet-visual').innerHTML =
        `<span class="text-gray">NETWORK BITS&nbsp;&nbsp; </span>` +
        `<span style="color:var(--blue);">${'█'.repeat(prefix)}</span>` +
        `<span style="color:var(--gray);">${'░'.repeat(32-prefix)}</span><br>` +
        `<span class="text-gray">RANGE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span>` +
        `<span class="text-green">${intToIp(net)}</span>` +
        `<span class="text-gray"> ──────► </span>` +
        `<span class="text-pink">${intToIp(bcast)}</span>`;

      document.getElementById('subnet-split').innerHTML = '';
      resBox.classList.remove('hidden');
      PixelAudio.success();

    } catch(e) {
      errBox.classList.remove('hidden');
      errBox.querySelector('span').textContent = '✖ ERROR: ' + e.message;
      PixelAudio.error();
    }
  }

  function setCard(id, val) {
    const el = document.querySelector('#' + id + ' .res-val');
    if (el) el.textContent = val;
  }

  function loadExample() {
    document.getElementById('subnet-input').value = '192.168.10.0/26';
    calculate();
  }

  function copyResult() {
    const rows = [...document.querySelectorAll('#subnet-table-body tr')]
      .map(r => r.cells[0].textContent + ': ' + r.cells[1].textContent).join('\n');
    const cards = ['sr-network','sr-broadcast','sr-mask','sr-wildcard','sr-first','sr-last','sr-total','sr-usable']
      .map(id => {
        const label = document.querySelector('#'+id+' .px-label').textContent;
        const val   = document.querySelector('#'+id+' .res-val').textContent;
        return label + ': ' + val;
      }).join('\n');
    navigator.clipboard.writeText(cards + '\n\n' + rows).then(() => {
      Toast.show('RESULTS COPIED', 'success');
      PixelAudio.copy();
    });
  }

  /* ── Split subnet helper ── */
  function splitSubnet() {
    const raw = document.getElementById('subnet-input').value.trim();
    try {
      const [ipStr, pfxStr] = raw.split('/');
      const prefix = parseInt(pfxStr, 10);
      if (prefix > 30) throw new Error('PREFIX TOO LARGE TO SPLIT');
      const ipInt = ipToInt(ipStr);
      const mask  = (0xFFFFFFFF << (32 - prefix)) >>> 0;
      const net   = (ipInt & mask) >>> 0;
      const size  = Math.pow(2, 32 - prefix - 1);

      const sub1Net = net;
      const sub2Net = (net + size) >>> 0;
      const sub1    = `${intToIp(sub1Net)}/${prefix+1}`;
      const sub2    = `${intToIp(sub2Net)}/${prefix+1}`;

      document.getElementById('subnet-split').innerHTML =
        `<span class="text-green">SUBNET A: ${sub1}</span><br>` +
        `<span class="text-blue">SUBNET B: ${sub2}</span>`;
      PixelAudio.click();
    } catch(e) {
      document.getElementById('subnet-split').textContent = 'ERROR: ' + e.message;
    }
  }

  return { init, calculate, loadExample, copyResult, splitSubnet };
})();
