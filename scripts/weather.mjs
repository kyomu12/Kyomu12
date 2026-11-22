import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { C, PAD, W, frame, heading, svgFile, text, textWidth } from './svg.mjs';

const LAT = 55.0084;
const LON = 82.9357;
const FORECAST = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`;

const H = 104;
const ICON_CELL = 5;

const ICONS = {
    sun: {
        color: C.lamp,
        rows: ['...#...', '..###..', '.#####.', '#######', '.#####.', '..###..', '...#...'],
    },
    cloud: {
        color: C.moon,
        rows: ['..###..', '.#####.', '#######', '#######', '.#####.', '..###..', '.......'],
    },
    rain: {
        color: C.sky,
        rows: ['..###..', '.#####.', '#######', '#######', '.......', '.#.#.#.', '.#.#.#.'],
    },
    snow: {
        color: C.moon,
        rows: ['..###..', '.#####.', '#######', '#######', '.......', '#.#.#.#', '.#.#.#.'],
    },
    storm: {
        color: C.blue,
        rows: ['..###..', '.#####.', '#######', '###.###', '.#####.', '..###..', '...#...'],
    },
    fog: {
        color: C.sky,
        rows: ['.......', '.#####.', '.......', '#######', '.......', '.#####.', '.......'],
    },
};

function wmo(code) {
    if (code === 0) return ['ясно', 'sun'];
    if (code === 1) return ['преимущественно ясно', 'sun'];
    if (code === 2) return ['переменная облачность', 'cloud'];
    if (code === 3) return ['пасмурно', 'cloud'];
    if (code === 45 || code === 48) return ['туман', 'fog'];
    if ([51, 53, 55, 56, 57].includes(code)) return ['морось', 'rain'];
    if ([61, 63, 65, 66, 67].includes(code)) return ['дождь', 'rain'];
    if ([71, 73, 75, 77].includes(code)) return ['снег', 'snow'];
    if ([80, 81, 82].includes(code)) return ['ливень', 'rain'];
    if ([85, 86].includes(code)) return ['снегопад', 'snow'];
    if (code === 95) return ['гроза', 'storm'];
    if (code === 96 || code === 99) return ['гроза с градом', 'storm'];
    return ['неизвестно', 'cloud'];
}

function icon(key, x, y) {
    const { color, rows } = ICONS[key];
    return rows
        .flatMap((row, r) =>
            [...row].map((b, c) =>
                b === '#'
                    ? `<rect x="${x + c * ICON_CELL}" y="${y + r * ICON_CELL}" width="${ICON_CELL - 1}" height="${ICON_CELL - 1}" fill="${color}"/>`
                    : '',
            ),
        )
        .filter(Boolean)
        .join('\n');
}

export function render(current) {
    const [label, iconKey] = wmo(current.weather_code);
    const temp = Math.round(current.temperature_2m);
    const feels = Math.round(current.apparent_temperature);
    const wind = Math.round(current.wind_speed_10m);
    const rh = Math.round(current.relative_humidity_2m);
    const sign = (n) => (n > 0 ? `+${n}°` : `${n}°`);

    const updated = new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Novosibirsk',
    });
    const updatedText = `обновлено ${updated}`;
    const updatedX = W - PAD - textWidth(updatedText, 10);

    return svgFile({
        height: H,
        title: `Погода в Новосибирске: ${sign(temp)}, ${label}`,
        body: [
            frame(W, H),
            heading('// погода · новосибирск', 30),
            icon(iconKey, ICON_X, 36),
            text(`${sign(temp)}`, { x: PAD, y: 66, size: 26 }),
            text(`${label} · ощущается как ${sign(feels)}`, { x: PAD + 74, y: 50, size: 12, fill: C.sky }),
            text(`ветер ${wind} м/с · влажность ${rh}%`, { x: PAD + 74, y: 68, size: 11, fill: C.moon }),
            text(updatedText, { x: updatedX, y: 92, size: 10, fill: '#5b7290' }),
        ].join('\n'),
    });
}

const ICON_X = W - PAD - 7 * ICON_CELL - 5;

function fallback() {
    return svgFile({
        height: H,
        title: 'Погода в Новосибирске: нет данных',
        body: [
            frame(W, H),
            heading('// погода · новосибирск', 30),
            icon('cloud', ICON_X, 36),
            text('нет данных', { x: PAD, y: 66, size: 26 }),
            text('карточка обновится при следующем запуске', { x: PAD, y: 92, size: 11, fill: C.sky }),
        ].join('\n'),
    });
}

async function load() {
    let lastErr;
    for (let i = 0; i < 3; i++) {
        try {
            const res = await fetch(FORECAST, { signal: AbortSignal.timeout(20000) });
            if (res.ok) return (await res.json()).current;
            lastErr = new Error(`Open-Meteo: ${res.status}`);
        } catch (e) {
            lastErr = e;
        }
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
    throw lastErr;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const out = process.argv[2] ?? 'dist/weather.svg';
    await mkdir(dirname(out), { recursive: true });
    let svg;
    try {
        svg = render(await load());
    } catch (e) {
        console.error(`weather: ${e.message} — рендерю fallback`);
        svg = fallback();
    }
    await writeFile(out, svg);
    console.log(out);
}
