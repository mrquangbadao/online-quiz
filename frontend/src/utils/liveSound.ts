/**
 * Pure Web Audio API sound synthesizer for Live Stage Arena.
 * Works 100% offline without external audio files.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const liveSound = {
  // Beep when timer ticks down (last 5s)
  playTick: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      // Audio autoplay policy
    }
  },

  // Mechanical rhythmic tick-tock for countdown timer (every second)
  playTickTock: (isTok: boolean = false) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      // "tik" higher pitch (880Hz), "tok" lower pitch (660Hz)
      osc.frequency.setValueAtTime(isTok ? 660 : 880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  },

  // Urgent intense tension heartbeat & countdown tick (accelerating in last 10 seconds)
  playUrgentCountdown: (secondsLeft: number) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const urgency = Math.max(1, Math.min(10, 11 - secondsLeft)); // 1 to 10
      const baseFreq = 500 + urgency * 45; // 545Hz -> 950Hz
      const volume = 0.15 + (urgency / 10) * 0.18; // 0.16 -> 0.33

      // Primary sharp tick
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = secondsLeft <= 5 ? 'triangle' : 'sine';
      osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      gain1.gain.setValueAtTime(volume, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.08);

      // Secondary tension echo (double-beat "tum-tum" heartbeat effect)
      const echoDelay = secondsLeft <= 4 ? 0.12 : secondsLeft <= 7 ? 0.16 : 0.22;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(baseFreq * 1.2, ctx.currentTime + echoDelay);
      gain2.gain.setValueAtTime(volume * 0.7, ctx.currentTime + echoDelay);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + echoDelay + 0.07);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + echoDelay);
      osc2.stop(ctx.currentTime + echoDelay + 0.07);

      // Low tension sub-bass thump in last 5 seconds
      if (secondsLeft <= 5) {
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(80, ctx.currentTime);
        subOsc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.15);
        subGain.gain.setValueAtTime(volume * 0.9, ctx.currentTime);
        subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        subOsc.connect(subGain);
        subGain.connect(ctx.destination);
        subOsc.start(ctx.currentTime);
        subOsc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {}
  },

  // Urgent buzzer for timer expiry
  playBuzzer: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(160, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  },

  // Hope Star activation magical chime
  playHopeStarChime: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
      });
    } catch (e) {}
  },

  // Correct answer fanfare
  playCorrect: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.07);
        osc.stop(ctx.currentTime + idx * 0.07 + 0.35);
      });
    } catch (e) {}
  },

  // Roulette spinning click
  playRouletteTick: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600 + Math.random() * 300, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {}
  },

  // Grand fanfare for winners
  playGrandFanfare: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const chord = [261.63, 329.63, 392.0, 523.25];
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.5);
      });
    } catch (e) {}
  },
};
