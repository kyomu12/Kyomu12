import { writeFile } from 'node:fs/promises';
import { C, PAD, PILL_HEIGHT, W, frame, heading, pill, pillWidth, svgFile, text, textWidth } from './svg.mjs';

const ICONS = 'https://cdn.jsdelivr.net/npm/simple-icons@16.34.0/icons';

const STACK = [
    ['TypeScript', 'typescript'],
    ['React', 'react'],
    ['Next.js', 'nextdotjs'],
    ['TanStack Query', 'reactquery'],
    ['PostgreSQL', 'postgresql'],
    ['Drizzle', 'drizzle'],
];

const SOCIALS = [
    ['github', 'kyomu12'],
    ['telegram', '@kyomudannis'],
    ['gmail', 'danyadannis@gmail.com'],
];

const SUBTITLE = 'frontend · novosibirsk · utc+7';

const STARS = [
    [70, 26], [150, 14], [235, 44], [330, 20], [410, 38], [495, 16],
    [575, 34], [660, 18], [740, 42], [800, 24], [40, 66], [185, 74],
    [300, 88], [470, 70], [585, 84], [705, 66], [790, 92], [120, 110],
    [365, 118], [520, 108], [640, 122], [760, 116],
];

const GLYPHS = {
    K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
    Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
    1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    2: ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
};

async function icon(slug) {
    const res = await fetch(`${ICONS}/${slug}.svg`);
    if (!res.ok) throw new Error(`simple-icons: ${slug} → ${res.status}`);
    return (await res.text()).match(/ d="([^"]+)"/)[1];
}

function wordmark(word, y, cell = 9) {
    const advance = 7 * cell;
    const width = word.length * advance - 2 * cell;
    const x0 = (W - width) / 2;
    const d = [];
    [...word].forEach((ch, i) =>
        GLYPHS[ch].forEach((row, r) =>
            [...row].forEach((bit, c) => {
                if (bit === '1') d.push(`M${x0 + i * advance + c * cell} ${y + r * cell}h${cell - 1}v${cell - 1}h-${cell - 1}z`);
            }),
        ),
    );
    return { svg: `<path fill="${C.moon}" d="${d.join('')}"/>`, height: 7 * cell };
}

function pillRow(items, y) {
    const out = [];
    let x = PAD;
    let row = y;
    for (const item of items) {
        const width = pillWidth(item.label);
        if (x + width > W - PAD) {
            x = PAD;
            row += PILL_HEIGHT + 8;
        }
        out.push(pill({ x, y: row, ...item }));
        x += width + 8;
    }
    return { svg: out.join('\n'), bottom: row + PILL_HEIGHT };
}

function stars() {
    return STARS.map(([x, y], i) =>
        `<rect class="star" x="${x}" y="${y}" width="3" height="3" fill="${i % 3 ? C.sky : C.moon}" style="animation-delay:${-((i * 0.53) % 3.2).toFixed(2)}s"/>`,
    ).join('\n');
}

async function header() {
    const name = wordmark('KYOMU12', 62, 11);
    const subY = 62 + name.height + 30;
    const subWidth = textWidth(SUBTITLE, 13);
    const subX = (W - (subWidth + 6 + 8)) / 2;
    const stackTop = subY + 56;
    const stack = pillRow(
        await Promise.all(STACK.map(async ([label, slug]) => ({ label, icon: await icon(slug) }))),
        stackTop,
    );
    const socialsTop = stack.bottom + 36;
    const socials = pillRow(
        await Promise.all(SOCIALS.map(async ([slug, label]) => ({ label, icon: await icon(slug) }))),
        socialsTop,
    );
    const height = socials.bottom + 28;
    return svgFile({
        height,
        title: `KYOMU12 — ${SUBTITLE}. Стек: ${STACK.map(([label]) => label).join(', ')}. Контакты: ${SOCIALS.map(([, label]) => label).join(', ')}`,
        style: `
.cursor { animation: blink 1.1s steps(1) infinite; }
.star { animation: twinkle 3.2s ease-in-out infinite; }
@keyframes blink { 50% { opacity: 0; } }
@keyframes twinkle { 50% { opacity: .2; } }
@media (prefers-reduced-motion: reduce) { .cursor, .star { animation: none; } }`,
        body: [
            frame(W, height),
            stars(),
            name.svg,
            text(SUBTITLE, { x: subX, y: subY, size: 13, fill: C.lamp }),
            `<rect class="cursor" x="${subX + subWidth + 6}" y="${subY - 11}" width="8" height="15" fill="${C.lamp}"/>`,
            heading('// стек', stackTop - 14),
            stack.svg,
            heading('// связь', socialsTop - 14),
            socials.svg,
        ].join('\n'),
    });
}

const out = new URL('../assets/', import.meta.url);
await writeFile(new URL('header.svg', out), await header());
console.log('assets: header.svg');
