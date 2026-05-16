/**
 * audio.js — Web Audio API Synthesizer
 * Generates retro 8-bit bleeps/bloops with no audio files.
 * All sounds are synthesized in real-time via AudioContext.
 */

const PixelAudio = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browsers require user interaction first)
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /**
   * Play a synthesized tone
   * @param {number} freq - Frequency in Hz
   * @param {number} duration - Duration in seconds
   * @param {'square'|'sawtooth'|'triangle'|'sine'} type - Waveform
   * @param {number} volume - 0 to 1
   * @param {number} [delay=0] - Start delay in seconds
   */
  function tone(freq, duration, type = 'square', volume = 0.3, delay = 0) {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
    gain.gain.setValueAtTime(volume, ac.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + duration + 0.01);
  }

  /**
   * Play a sequence of [freq, duration] pairs
   */
  function sequence(notes, type = 'square', volume = 0.25) {
    let time = 0;
    notes.forEach(([freq, dur]) => {
      tone(freq, dur, type, volume, time);
      time += dur;
    });
  }

  /* ── Preset sounds ── */

  /** Short UI click bleep */
  function click() {
    tone(880, 0.04, 'square', 0.2);
  }

  /** Success / item added */
  function success() {
    sequence([[523, 0.08], [659, 0.08], [784, 0.15]], 'square', 0.25);
  }

  /** Error bleep */
  function error() {
    sequence([[200, 0.1], [150, 0.15]], 'sawtooth', 0.3);
  }

  /** Timer tick (every second) */
  function tick() {
    tone(440, 0.025, 'square', 0.1);
  }

  /** Pomodoro session complete — victory fanfare */
  function pomodoroEnd() {
    sequence([
      [523, 0.1], [523, 0.1], [523, 0.1], [415, 0.075], [466, 0.075],
      [523, 0.1], [466, 0.075], [523, 0.3]
    ], 'square', 0.3);
  }

  /** Short break start */
  function breakStart() {
    sequence([[659, 0.1], [523, 0.1], [392, 0.2]], 'triangle', 0.25);
  }

  /** Power-up sound — coin collected */
  function powerUp() {
    sequence([
      [130, 0.05], [165, 0.05], [196, 0.05], [261, 0.05],
      [330, 0.05], [392, 0.05], [523, 0.05], [1046, 0.15]
    ], 'square', 0.2);
  }

  /** Copy to clipboard bleep */
  function copy() {
    sequence([[1046, 0.04], [1318, 0.08]], 'square', 0.15);
  }

  /** Task completed */
  function taskDone() {
    sequence([[392, 0.06], [523, 0.06], [659, 0.12]], 'square', 0.2);
  }

  /** Alert / notification */
  function alert() {
    sequence([[880, 0.08], [880, 0.08], [880, 0.08]], 'square', 0.25);
  }

  return {
    tone, sequence,
    click, success, error, tick,
    pomodoroEnd, breakStart, powerUp, copy, taskDone, alert
  };
})();
