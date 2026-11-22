import { writeFile } from 'node:fs/promises';
import { C, PAD, W, svgFile } from './svg.mjs';

const CELL = 4;
const H = 148;
const GROUND_Y = H - 16;

const BLD = ['#0f1e3d', '#0c1930'];
const EDGE = '#24406e';
const CURB = '#16304f';
const WIN_LIT = [C.lamp, C.sky, C.moon];

function mulberry32(a) {
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const rand = mulberry32(20261122);
const ri = (min, max) => min + Math.floor(rand() * (max - min + 1));

const stars = Array.from({ length: 36 }, (_, i) => ({
    x: PAD + ri(0, Math.floor((W - 2 * PAD) / CELL) - 1) * CELL,
    y: ri(10, 62),
    c: i % 3 ? C.sky : C.moon,
    tw: i % 4 === 0,
}));

const MOON = ['.###.', '#####', '#####', '#####', '.###.'];
const MOON_CELL = 5;
const moonX = W - PAD - MOON[0].length * MOON_CELL - 6;
const moonY = 16;
const moon = MOON.flatMap((row, r) =>
    [...row].map((b, c) =>
        b === '#'
            ? `<rect x="${moonX + c * MOON_CELL}" y="${moonY + r * MOON_CELL}" width="${MOON_CELL - 1}" height="${MOON_CELL - 1}" fill="${C.lamp}"/>`
            : '',
    ),
)
    .filter(Boolean)
    .join('\n');

const buildings = [];
let bx = PAD - CELL;
while (bx < W - PAD) {
    const bw = ri(7, 17) * CELL;
    const bh = ri(9, 25) * CELL;
    buildings.push({ x: bx, w: bw, h: bh, c: BLD[buildings.length % 2] });
    bx += bw + ri(1, 3) * CELL;
}

const windows = [];
for (const b of buildings) {
    const cols = Math.floor((b.w - 10) / 8);
    const rows = Math.floor((b.h - 14) / 8);
    const top = GROUND_Y - b.h;
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
            const lit = rand();
            const fill = lit < 0.34 ? WIN_LIT[ri(0, 2)] : lit < 0.52 ? CURB : '#0d1b31';
            windows.push(`<rect x="${b.x + 5 + c * 8}" y="${top + 8 + r * 8}" width="4" height="4" fill="${fill}"/>`);
        }
}

const tallest = buildings.reduce((a, b) => (b.h > a.h ? b : a));
const antX = tallest.x + tallest.w / 2;
const antTop = GROUND_Y - tallest.h;
const antenna = [
    `<rect x="${antX - 1}" y="${antTop - 14}" width="2" height="14" fill="${EDGE}"/>`,
    `<circle class="blink" cx="${antX}" cy="${antTop - 17}" r="2.5" fill="${C.lamp}"/>`,
].join('\n');

const city = buildings
    .map(
        (b) =>
            `<rect x="${b.x}" y="${GROUND_Y - b.h}" width="${b.w}" height="${b.h}" fill="${b.c}"/>\n` +
            `<rect x="${b.x}" y="${GROUND_Y - b.h}" width="${b.w}" height="2" fill="${EDGE}"/>`,
    )
    .join('\n');

const out = new URL('../assets/', import.meta.url);
const svg = svgFile({
    height: H,
    title: 'новосибирск — ночной горизонт',
    style: `
.star { animation: twinkle 3.2s ease-in-out infinite; }
.blink { animation: blink 1.6s steps(1) infinite; }
@keyframes twinkle { 50% { opacity: .2; } }
@keyframes blink { 50% { opacity: .15; } }
@media (prefers-reduced-motion: reduce) { .star, .blink { animation: none; } }`,
    body: [
        `<rect width="${W}" height="${H}" rx="10" fill="${C.page}"/>`,
        stars
            .map((s, i) =>
                s.tw
                    ? `<rect class="star" x="${s.x}" y="${s.y}" width="3" height="3" fill="${s.c}" style="animation-delay:${-((i * 0.61) % 3.2).toFixed(2)}s"/>`
                    : `<rect x="${s.x}" y="${s.y}" width="3" height="3" fill="${s.c}" opacity="0.7"/>`,
            )
            .join('\n'),
        moon,
        `<rect x="0" y="${GROUND_Y}" width="${W}" height="${H - GROUND_Y}" fill="#0a1526"/>`,
        `<rect x="0" y="${GROUND_Y}" width="${W}" height="2" fill="${EDGE}"/>`,
        city,
        windows.join('\n'),
        antenna,
    ].join('\n'),
});
await writeFile(new URL('city.svg', out), svg);
console.log('assets: city.svg');
