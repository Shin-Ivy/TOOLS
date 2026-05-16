/**
 * store.js — Lightweight State Management
 * A minimal reactive store pattern (no dependencies).
 * Prevents cross-tool re-renders by using targeted event dispatch.
 */

const Store = (() => {
  const state = {
    activeTool: 'home',
    user: null,
    pomodoroRunning: false,
    pomodoroSeconds: 0,
  };

  const listeners = {};

  /**
   * Subscribe to a state key change
   * @param {string} key
   * @param {function} callback
   * @returns {function} Unsubscribe function
   */
  function subscribe(key, callback) {
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(callback);
    return () => {
      listeners[key] = listeners[key].filter(fn => fn !== callback);
    };
  }

  /**
   * Set a state value and notify subscribers
   * @param {string} key
   * @param {*} value
   */
  function set(key, value) {
    const prev = state[key];
    if (prev === value) return;
    state[key] = value;
    (listeners[key] || []).forEach(fn => fn(value, prev));
  }

  /**
   * Get current state value
   * @param {string} key
   */
  function get(key) {
    return state[key];
  }

  return { subscribe, set, get };
})();

/* ── Toast Notification System ── */
const Toast = (() => {
  function ensureContainer() {
    let c = document.getElementById('px-toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'px-toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  /**
   * Show a toast notification
   * @param {string} msg
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {number} duration ms
   */
  function show(msg, type = 'success', duration = 2800) {
    const container = ensureContainer();
    const toast = document.createElement('div');
    toast.className = `px-toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : type === 'info' ? 'info' : ''}`;
    toast.textContent = msg;
    container.appendChild(toast);

    if (window.PixelAudio) {
      if (type === 'error') PixelAudio.error();
      else if (type === 'success') PixelAudio.click();
    }

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }

  return { show };
})();
