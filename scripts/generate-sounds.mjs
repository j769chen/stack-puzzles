import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RATE = 22050;
const OUT = join(import.meta.dirname, '..', 'assets', 'sounds');

function tone(freq, start, duration, { volume = 0.5, decay = 8, harmonic = 0 } = {}) {
  return (t) => {
    const local = t - start;
    if (local < 0 || local > duration) return 0;
    const attack = Math.min(local / 0.004, 1);
    const envelope = attack * Math.exp(-decay * local);
    const wave = Math.sin(2 * Math.PI * freq * local) + harmonic * Math.sin(4 * Math.PI * freq * local);
    return volume * envelope * wave;
  };
}

function writeWav(name, duration, voices) {
  const samples = Math.round(RATE * duration);
  const data = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) {
    const t = i / RATE;
    const value = Math.max(-1, Math.min(1, voices.reduce((sum, voice) => sum + voice(t), 0)));
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

writeWav('pick', 0.06, [tone(1320, 0, 0.06, { volume: 0.35, decay: 60 })]);
writeWav('drop', 0.12, [tone(330, 0, 0.12, { volume: 0.5, decay: 35, harmonic: 0.3 })]);
writeWav('complete', 0.35, [
  tone(1319, 0, 0.35, { volume: 0.35, decay: 9 }),
  tone(1976, 0.09, 0.26, { volume: 0.3, decay: 9 }),
]);
writeWav(
  'win',
  0.9,
  [523, 659, 784, 1047].map((freq, i) => tone(freq, i * 0.11, 0.9 - i * 0.11, { volume: 0.3, decay: 4, harmonic: 0.15 })),
);
