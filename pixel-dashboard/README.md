# PIXEL.TOOLS — Everyday Web Utilities Dashboard

A retro 8-bit styled developer utilities dashboard. Pure HTML/CSS/JavaScript — no build step, no Node.js required.

---

## 🎮 SETUP (5 minutes)

### Step 1 — Get a Google Client ID

You need a **Google OAuth Client ID** to enable login. No secret needed — this is client-side only.

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add **Authorized JavaScript Origins**:
   - `http://localhost:5500` (if using VS Code Live Server)
   - `http://127.0.0.1:5500` (also add this)
   - Your actual domain if deploying
7. **No Redirect URI needed** — GIS handles this client-side
8. Copy your **Client ID** (looks like `123456789-abc...apps.googleusercontent.com`)

### Step 2 — Configure the Client ID

Open `js/auth.js` and replace line 9:

```js
// BEFORE
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';

// AFTER
const GOOGLE_CLIENT_ID = '123456789-youractualid.apps.googleusercontent.com';
```

### Step 3 — Serve the files

> ⚠️ You **cannot** open `index.html` directly as a `file://` URL — Google OAuth requires an HTTP origin.

**Option A — VS Code Live Server (recommended):**
1. Install the "Live Server" extension in VS Code
2. Right-click `index.html` → **Open with Live Server**
3. It opens at `http://127.0.0.1:5500`

**Option B — Python (if installed):**
```bash
cd c:\WTF\pixel-dashboard
python -m http.server 5500
# Then open http://localhost:5500
```

**Option C — Node.js (if installed):**
```bash
npx serve c:\WTF\pixel-dashboard
```

---

## 📁 File Structure

```
pixel-dashboard/
├── index.html              ← Login page (INSERT COIN gateway)
├── dashboard.html          ← Main dashboard (auth-protected)
├── css/
│   └── pixel.css           ← All retro styles (no frameworks)
├── js/
│   ├── auth.js             ← Google OAuth via GIS
│   ├── audio.js            ← Web Audio API synthesizer
│   ├── store.js            ← State management + Toast system
│   ├── dashboard.js        ← Dashboard controller
│   └── tools/
│       ├── subnet.js       ← CIDR subnet calculator
│       ├── pomodoro.js     ← Pomodoro timer
│       ├── ipgeo.js        ← IP geolocation
│       ├── base64.js       ← Base64 + URL encoder
│       ├── palette.js      ← 8-bit palette generator
│       ├── texttools.js    ← Case converter + regex tester
│       ├── todo.js         ← Todo list + streak counter
│       ├── json-formatter.js ← JSON tree formatter
│       └── ping.js         ← HTTP latency simulator
└── README.md
```

---

## 🛠️ Tools

| Tool | Description |
|---|---|
| **IP Geolocation** | Lookup any IP — city, ISP, coords, timezone |
| **Subnet Calculator** | Full CIDR parser with binary representation |
| **Ping Simulator** | HTTP fetch latency with retro bar chart |
| **Base64 / URL Encoder** | Encode/decode with live output + byte stats |
| **Palette Generator** | Arcade/GameBoy/Synthwave + random cohesive palettes |
| **Text Tools** | 12 case conversions + live regex tester |
| **Todo List** | Tasks with streak counter (localStorage) |
| **Pomodoro Timer** | 25/5/15 min with Web Audio bleeps |
| **JSON Formatter** | Collapsible dungeon-map tree + minify |

---

## 🔒 Security Notes

- Authentication is handled by **Google Identity Services (GIS)** — a Google-signed JWT is decoded client-side
- Session is stored in `sessionStorage` (expires when tab closes) with an 8-hour hard expiry
- The dashboard page checks for a valid session on every load and redirects to login if absent
- **No backend server is involved** — ideal for local personal use
- For a production deployment, add a server-side session validation layer

---

## 🎨 Aesthetic Rules

- Font: **Press Start 2P** (headings), **VT323** (body)
- Colors: Neon green `#39ff14`, Hot pink `#ff2079`, Retro blue `#0ff0fc`, Yellow `#ffe600`
- **Zero** `border-radius` — all corners are sharp pixels
- **Zero** smooth transitions — all hover states are instant
- CRT scanline overlay applied to the entire app
- Pixel box-shadows: `4px 4px 0 [color]` (hard offset, no blur)

---

## 📝 LocalStorage Keys

| Key | Tool | Data |
|---|---|---|
| `pixel_todo_items` | Todo List | Array of task objects |
| `pixel_todo_streak` | Todo List | Current streak count (number) |
| `pixel_todo_last_done` | Todo List | Last completion date string |
| `pomo_sessions` | Pomodoro | Today's session count |
| `pomo_total` | Pomodoro | All-time pomodoro count |
| `pomo_tick` | Pomodoro | Tick sound enabled (boolean) |
