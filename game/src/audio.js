// All sound is synthesised with WebAudio: an engine hum that follows the
// throttle, wind that follows speed, and short chimes for rings and
// deliveries. No audio files, no network, and nothing plays until the
// player has pressed a key or clicked (the browser's rule, not ours).

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let windGain = null;
  let windSource = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (started) return;
    started = true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioContext();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 70;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();

      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      windSource = ctx.createBufferSource();
      windSource.buffer = buffer;
      windSource.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 500;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(ctx.destination);
      windSource.start();
    } catch {
      ctx = null;
    }
  }

  /** Called every frame with the flight state; silent when muted. */
  function update(flight) {
    if (!ctx || muted) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const rpm = 55 + flight.throttle * 75 + flight.speed * 0.4;
    engineOsc.frequency.setTargetAtTime(rpm, ctx.currentTime, 0.1);
    engineGain.gain.setTargetAtTime(flight.onGround ? 0.015 : 0.045, ctx.currentTime, 0.1);
    windGain.gain.setTargetAtTime(Math.min(0.06, flight.speed * 0.0006), ctx.currentTime, 0.2);
  }

  function chime(notes) {
    if (!ctx || muted) return;
    let t = ctx.currentTime;
    for (const freq of notes) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
      t += 0.09;
    }
  }

  function ring() {
    chime([660, 880, 1320]);
  }

  function delivery() {
    chime([523, 659, 784, 1047]);
  }

  function thud() {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.25);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  }

  function toggleMute() {
    muted = !muted;
    if (ctx) {
      if (muted) {
        engineGain.gain.value = 0;
        windGain.gain.value = 0;
      }
    }
    return muted;
  }

  return { ensure, update, ring, delivery, thud, toggleMute, get muted() { return muted; } };
}
