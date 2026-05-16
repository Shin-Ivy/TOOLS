/**
 * palette.js — 8-bit Color Palette Generator
 * Seeded RNG, preset palettes, cohesive random mode, CSS/JS export.
 */

const PaletteGen = (() => {

  let currentPalette = [];

  function init() {
    const panel = document.getElementById('tool-palette');
    if (!panel || panel.dataset.inited) return;
    panel.dataset.inited = 'true';

    panel.innerHTML = `
      <div class="tool-header">
        <h2>▣ PALETTE GENERATOR</h2>
        <p>Generate cohesive 8-bit retro color palettes. Click a swatch to copy its hex code.</p>
      </div>
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:20px;">
        <div style="flex:1;min-width:160px;">
          <label class="px-label">PALETTE MODE</label>
          <select id="pal-mode" class="px-select" style="width:100%;" onchange="PaletteGen.generate()">
            <option value="arcade">ARCADE RETRO</option>
            <option value="gameboy">GAME BOY</option>
            <option value="synthwave">SYNTHWAVE</option>
            <option value="terminal">TERMINAL</option>
            <option value="random">RANDOM COHESIVE</option>
          </select>
        </div>
        <div style="flex:1;min-width:100px;">
          <label class="px-label">COUNT</label>
          <select id="pal-count" class="px-select" style="width:100%;" onchange="PaletteGen.generate()">
            <option value="4">4</option>
            <option value="8" selected>8</option>
            <option value="12">12</option>
            <option value="16">16</option>
          </select>
        </div>
        <div style="flex:1;min-width:120px;">
          <label class="px-label">SEED (OPT.)</label>
          <input id="pal-seed" class="px-input" type="text" placeholder="any text" maxlength="20">
        </div>
        <button class="px-btn px-btn-pink" onclick="PaletteGen.generate()">GENERATE</button>
      </div>

      <div id="pal-swatches" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;"></div>

      <div id="pal-export" class="hidden">
        <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
          <button class="px-btn px-btn-sm px-btn-blue" onclick="PaletteGen.copyAll('hex')">COPY HEX LIST</button>
          <button class="px-btn px-btn-sm px-btn-blue" onclick="PaletteGen.copyAll('css')">COPY CSS VARS</button>
          <button class="px-btn px-btn-sm px-btn-blue" onclick="PaletteGen.copyAll('js')">COPY JS ARRAY</button>
        </div>
        <div class="px-box" style="border-color:var(--gray);">
          <div class="px-label">EXPORT PREVIEW</div>
          <pre id="pal-code" class="px-code" style="font-size:14px;max-height:160px;overflow-y:auto;"></pre>
        </div>
      </div>
    `;
    generate();
  }

  function seededRng(seed) {
    let h = seed >>> 0;
    return () => {
      h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
      h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
      h ^= h >>> 16;
      return (h >>> 0) / 0xFFFFFFFF;
    };
  }

  function strToSeed(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    return Math.abs(hash) || 9999;
  }

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const hex = x => Math.round(x * 255).toString(16).padStart(2, '0');
    return '#' + hex(f(0)) + hex(f(8)) + hex(f(4));
  }

  function hexToRgb(hex) {
    return {
      r: parseInt(hex.slice(1,3), 16),
      g: parseInt(hex.slice(3,5), 16),
      b: parseInt(hex.slice(5,7), 16)
    };
  }

  const PRESETS = {
    arcade:   ['#39ff14','#ff2079','#0ff0fc','#ffe600','#ff8c00','#bf00ff','#ff3030','#00ff99','#ff69b4','#00bfff','#adff2f','#dc143c','#ffd700','#7b68ee','#00fa9a','#ff6347'],
    gameboy:  ['#0f380f','#306230','#8bac0f','#9bbc0f'],
    synthwave:['#2d1b69','#ff2d78','#e040fb','#00e5ff','#69ffdb','#ffd600','#ff6d00','#b388ff','#18ffff','#f50057','#651fff','#1de9b6'],
    terminal: ['#000000','#003b00','#006400','#00a800','#00d000','#39ff14','#74ff4a','#aaff88','#ccffbb','#f0fff0','#00ff00','#7cfc00'],
  };

  function generate() {
    const mode  = document.getElementById('pal-mode').value;
    const count = parseInt(document.getElementById('pal-count').value);
    const seedStr = document.getElementById('pal-seed').value.trim();
    const seed  = seedStr ? strToSeed(seedStr) : Math.floor(Math.random() * 0xFFFFFF);
    const rng   = seededRng(seed);
    let colors  = [];

    if (mode === 'random') {
      const baseHue = Math.floor(rng() * 360);
      const sat = 70 + Math.floor(rng() * 30);
      for (let i = 0; i < count; i++) {
        const hue = (baseHue + i * (360 / count)) % 360;
        const lit = 35 + Math.floor(rng() * 25);
        colors.push(hslToHex(hue, sat, lit));
      }
    } else {
      const preset = PRESETS[mode] || PRESETS.arcade;
      const pool = [...preset];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      for (let i = 0; i < count; i++) colors.push(pool[i % pool.length]);
    }

    currentPalette = colors;
    renderSwatches(colors);
    renderCode(colors, 'hex');
    document.getElementById('pal-export').classList.remove('hidden');
    PixelAudio.powerUp();
  }

  function renderSwatches(colors) {
    document.getElementById('pal-swatches').innerHTML = colors.map(hex => {
      const rgb = hexToRgb(hex);
      const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
      const txt = lum > 0.5 ? '#000' : '#fff';
      return `<div onclick="PaletteGen.copySwatch('${hex}',this)" title="Click to copy"
        style="width:96px;height:96px;background:${hex};border:3px solid #333;box-shadow:4px 4px 0 #111;
        cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <span style="font-family:var(--font-pixel);font-size:7px;color:${txt};pointer-events:none;">${hex.toUpperCase()}</span>
        <span style="font-family:var(--font-vt);font-size:13px;color:${txt};pointer-events:none;">${rgb.r},${rgb.g},${rgb.b}</span>
      </div>`;
    }).join('');
  }

  function renderCode(colors, fmt) {
    let code = '';
    if (fmt === 'css') {
      code = ':root {\n' + colors.map((h,i) => `  --color-${i+1}: ${h};`).join('\n') + '\n}';
    } else if (fmt === 'js') {
      code = 'const palette = [\n' + colors.map(h => `  '${h}',`).join('\n') + '\n];';
    } else {
      code = colors.join('\n');
    }
    document.getElementById('pal-code').textContent = code;
  }

  function copySwatch(hex, el) {
    navigator.clipboard.writeText(hex).then(() => {
      el.style.outline = '3px solid var(--yellow)';
      PixelAudio.copy();
      Toast.show('COPIED: ' + hex, 'success', 1500);
      setTimeout(() => { el.style.outline = ''; }, 700);
    });
  }

  function copyAll(fmt) {
    renderCode(currentPalette, fmt);
    const text = document.getElementById('pal-code').textContent;
    navigator.clipboard.writeText(text).then(() => {
      Toast.show('PALETTE COPIED (' + fmt.toUpperCase() + ')', 'success');
      PixelAudio.copy();
    });
  }

  return { init, generate, copySwatch, copyAll };
})();
