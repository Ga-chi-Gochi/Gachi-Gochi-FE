// game/dist/index.html → assets/game/island.html
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const from = path.join(here, 'dist', 'index.html');
const to = path.join(here, '..', 'assets', 'game', 'island.html');
fs.mkdirSync(path.dirname(to), { recursive: true });
fs.copyFileSync(from, to);
console.log(`-> assets/game/island.html (${Math.round(fs.statSync(to).size / 1024)} KB)`);
