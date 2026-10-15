import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const OUT = join(import.meta.dirname, '..', 'assets');
const SIZE = 1024;

const BG = '#F4EFE6';
const POLE = '#8A6F52';
const BASE = '#5C4A38';
const DISKS = ['#E63946', '#F4A261', '#2A9D8F', '#457B9D'];

function stack(box) {
  const scale = box / 100;
  const offset = (SIZE - box) / 2;
  const rect = (x, y, w, h, fill) =>
    `<rect x="${offset + x * scale}" y="${offset + y * scale}" width="${w * scale}" height="${h * scale}" rx="${(Math.min(w, h) / 2) * scale}" fill="${fill}"/>`;
  const disks = DISKS.map((fill, i) => {
    const width = 76 - i * 16;
    return rect(50 - width / 2, 67 - i * 15, width, 14, fill);
  });
  return [rect(46, 10, 8, 76, POLE), rect(8, 82, 84, 8, BASE), ...disks].join('');
}

function render(name, { box, background }) {
  const fill = background ? `<rect width="${SIZE}" height="${SIZE}" fill="${background}"/>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">${fill}${stack(box)}</svg>`;
  const flatten = background ? ['-alpha', 'off'] : [];
  execFileSync('magick', ['-background', 'none', 'svg:-', ...flatten, '-depth', '8', join(OUT, name)], { input: svg });
}

render('icon.png', { box: 720, background: BG });
render('adaptive-icon.png', { box: 560 });
render('splash-icon.png', { box: SIZE });
