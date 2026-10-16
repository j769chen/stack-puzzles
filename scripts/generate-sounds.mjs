import { Buffer } from 'node:buffer';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RATE = 22050;
const OUT = join(import.meta.dirname, '..', 'assets', 'sounds');

function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296 - 0.5;
  };
}

function partials(freq, start, duration, { ratios, amps, decay, volume }) {
  return (t) => {
    const local = t - start;
    if (local < 0 || local > duration) return 0;
    const attack = Math.min(local / 0.001, 1);
    return ratios.reduce(
      (sum, ratio, i) =>
        sum + amps[i] * Math.exp(-decay * (1 + ratio * 0.6) * local) * Math.sin(2 * Math.PI * freq * ratio * local),
      0,
    ) * volume * attack;
  };
}

function knock(freq, start, { volume = 0.5, decay = 45, click = 0.35, seed = 1 } = {}) {
  const body = partials(freq, start, 0.25, { ratios: [1, 2.76, 5.4], amps: [1, 0.45, 0.2], decay, volume });
  const samples = Math.round(RATE * 0.02);
  const burst = new Float32Array(samples);
  const rand = random(seed);
  let low = 0;
  for (let i = 0; i < samples; i++) {
    const white = rand();
    low += 0.35 * (white - low);
    burst[i] = (white - low) * Math.exp(-i / RATE / 0.003);
  }
  return (t) => {
    const index = Math.round((t - start) * RATE);
    const contact = index >= 0 && index < samples ? click * burst[index] : 0;
    return body(t) + contact;
  };
}

function marimba(freq, start, duration, { volume = 0.35 } = {}) {
  const bar = partials(freq, start, duration, { ratios: [1, 4, 10], amps: [1, 0.3, 0.08], decay: 5, volume });
  const mallet = knock(freq * 2, start, { volume: 0.06, decay: 90, click: 0.12, seed: Math.round(freq) });
  return (t) => bar(t) + mallet(t);
}

function writeWav(name, duration, voices) {
  const samples = Math.round(RATE * duration);
  const data = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) {
    const t = i / RATE;
    const fade = Math.min((duration - t) / 0.01, 1);
    const value = Math.max(-1, Math.min(1, fade * voices.reduce((sum, voice) => sum + voice(t), 0)));
    data.writeInt16LE(Math.round(value * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(join(OUT, `${name}.wav`), Buffer.concat([header, data]));
}

writeWav('pick', 0.06, [knock(1500, 0, { volume: 0.22, decay: 110, click: 0.2, seed: 7 })]);
[520, 580, 470].forEach((freq, i) =>
  writeWav(`drop${i + 1}`, 0.2, [
    knock(freq, 0, { seed: 11 + i }),
    knock(freq * 1.04, 0.032, { volume: 0.14, decay: 60, click: 0.1, seed: 21 + i }),
  ]),
);
writeWav('complete', 0.6, [knock(500, 0, { seed: 31 }), marimba(784, 0, 0.6), marimba(1047, 0.09, 0.51)]);
writeWav(
  'win',
  1.2,
  [523, 659, 784, 1047].map((freq, i) => marimba(freq, i * 0.11, 1.2 - i * 0.11, { volume: 0.3 })),
);
