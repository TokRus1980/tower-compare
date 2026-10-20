// scripts/fetch-icons.mjs
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public/icons');
mkdirSync(OUT, { recursive: true });

const items = JSON.parse(readFileSync(join(ROOT, 'data/items.json'), 'utf8'));
const tools = JSON.parse(readFileSync(join(ROOT, 'data/tools.json'), 'utf8'));
const materials = JSON.parse(readFileSync(join(ROOT, 'data/materials.json'), 'utf8'));

const names = new Set();
for (const x of [...items, ...tools, ...materials]) names.add(x.name);

const BASES = [
  'https://tower-ton.com/items/',
  'https://tower-ton.com/',
  'https://enapi.tower-ton.com/uploads/items/',
  'https://enapi.tower-ton.com/uploads/hero-items/',
];

async function tryFetch(name) {
  const file = join(OUT, `${name}.png`);
  if (existsSync(file)) return 'skip';
  const encoded = encodeURIComponent(name);
  for (const base of BASES) {
    const url = base + encoded + '.png';
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        writeFileSync(file, buf);
        return `ok ${url}`;
      }
    } catch {}
  }
  return 'fail';
}

let ok = 0, skip = 0, fail = 0;
const fails = [];
for (const name of names) {
  const r = await tryFetch(name);
  if (r === 'skip') skip++;
  else if (r === 'fail') { fail++; fails.push(name); }
  else { ok++; console.log(r); }
}
console.log(`\nOK: ${ok}, skip: ${skip}, fail: ${fail}`);
if (fails.length) {
  console.log('\nНе удалось скачать (положите вручную в public/icons/):');
  for (const f of fails) console.log('  ' + f);
}