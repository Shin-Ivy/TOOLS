/**
 * config.js — Konfigurasi PIXEL.TOOLS
 * ======================================
 * ISI FILE INI dengan Client ID dari Google Cloud Console.
 *
 * CARA MENDAPATKAN CLIENT ID:
 * 1. Buka https://console.cloud.google.com
 * 2. APIs & Services → Credentials
 * 3. Create Credentials → OAuth 2.0 Client ID
 * 4. Application type: Web application
 * 5. Authorized JavaScript Origins: http://localhost:5500
 * 6. Salin Client ID → paste di bawah
 *
 * ⚠️  Client SECRET tidak dibutuhkan — ini client-side only (GIS).
 * ⚠️  Jangan commit file ini ke GitHub jika repo kamu PUBLIC.
 *     Tambahkan "js/config.js" ke .gitignore
 */

const APP_CONFIG = {
  // ← GANTI INI dengan Client ID kamu
  GOOGLE_CLIENT_ID: '776587796650-05ih700lu0vtp211f860r90e7rhgr6es.apps.googleusercontent.com',

  // Versi aplikasi (tidak perlu diubah)
  VERSION: '1.0.0',
};
