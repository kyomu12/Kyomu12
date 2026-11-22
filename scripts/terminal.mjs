import { writeFile } from 'node:fs/promises';
import { C, PAD, W, svgFile, text, textWidth } from './svg.mjs';

const ROW = 22;
const TOP = 56;
const H = 216;
const PROMPT_X = PAD;
const BODY_X = PAD + 16;

const CMDS = [
    { cmd: 'whoami', out: 'kyomu12' },
    { cmd: 'cat now.md', out: 'frontend · новосибирск · utc+7' },
    { cmd: 'ls ~/skills', out: 'typescript  react  next.js  drizzle  postgres' },
];

let clipId = 0;
function typed(s, x, y, begin) {
    const id = `clip${clipId++}`;
    const size = 12;
    const w = textWidth(s, size);
    const dur = Math.max(0.35, s.length * 0.05).toFixed(2);
    return [
        `<clipPath id="${id}"><rect x="${x - 1}" y="${y - size - 3}" width="0" height="${size + 7}"><animate attributeName="width" from="0" to="${w + 3}" dur="${dur}s" begin="${begin}s" fill="freeze"/></rect></clipPath>`,
        `<g clip-path="url(#${id})">${text(s, { x, y, size, fill: C.moon })}</g>`,
    ].join('\n');
}

const lines = [];
CMDS.forEach(({ cmd, out }, i) => {
    const y = TOP + i * 2 * ROW;
    const begin = (0.5 + i * 2.1).toFixed(2);
    lines.push(
        text('$ ', { x: PROMPT_X, y, size: 12, fill: C.lamp, cls: 'ln', style: `animation-delay:${begin}s` }),
        typed(cmd, BODY_X, y, Number(begin) + 0.15),
    );
    const typeDur = Math.max(0.35, cmd.length * 0.05);
    const outDelay = (Number(begin) + 0.15 + typeDur + 0.3).toFixed(2);
    lines.push(text(out, { x: BODY_X, y: y + ROW, size: 12, fill: C.sky, cls: 'ln', style: `animation-delay:${outDelay}s` }));
});

const finalY = TOP + CMDS.length * 2 * ROW;
const cursorX = BODY_X + textWidth('$ ', 12);
lines.push(
    text('$ ', { x: PROMPT_X, y: finalY, size: 12, fill: C.lamp, cls: 'ln', style: `animation-delay:${(0.5 + CMDS.length * 2.1).toFixed(2)}s` }),
    `<rect class="cursor" x="${cursorX}" y="${finalY - 11}" width="8" height="15" fill="${C.lamp}"/>`,
);

const out = new URL('../assets/', import.meta.url);
const svg = svgFile({
    height: H,
    title: 'kyomu12 — терминал: whoami, now.md, skills',
    style: `
.ln { opacity: 0; animation: lnshow .01s linear forwards; }
.cursor { animation: blink 1.1s steps(1) infinite; }
@keyframes lnshow { to { opacity: 1; } }
@keyframes blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .ln { opacity: 1; animation: none; } .cursor { animation: none; } }`,
    body: [
        `<rect width="${W}" height="${H}" rx="10" fill="#050b14"/>`,
        `<rect x="10" y="10" width="${W - 20}" height="30" rx="6" fill="#0e1f3a"/>`,
        `<circle cx="24" cy="25" r="3.5" fill="#ff5f57" opacity="0.85"/>`,
        `<circle cx="38" cy="25" r="3.5" fill="#febc2e" opacity="0.85"/>`,
        `<circle cx="52" cy="25" r="3.5" fill="#28c840" opacity="0.85"/>`,
        text('kyomu@novosibirsk: ~', { x: 68, y: 29, size: 11, fill: C.sky }),
        ...lines,
    ].join('\n'),
});
await writeFile(new URL('terminal.svg', out), svg);
console.log('assets: terminal.svg');
