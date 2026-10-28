'use strict';
/* Turbo Gol Arena · Base: almacenamiento, configuración, eventos de temporada y calidad gráfica. Se carga primero: el resto de archivos usa lo que define.
   Los archivos de js/ se cargan en orden y comparten el ámbito global (antes eran un solo game.js). */
const T = window.TG, CARS = window.CARS;
const { W, H, GD, GH, GF, TR, CAR_R } = T;
const TAU = Math.PI * 2;
const GOLD = '#ffd23f';
const PAL = { blue: [61, 184, 255], orange: [255, 138, 43], gold: [255, 210, 63], white: [255, 255, 255], red: [255, 70, 60], grey: [170, 180, 215],
    cyan: [120, 225, 255], yellow: [255, 238, 70], green: [90, 255, 110], pink: [255, 90, 220], purple: [150, 100, 255], smoke: [60, 62, 82], heart: [255, 70, 110], heart2: [255, 150, 190] };
const RAINBOW = ['red', 'orange', 'yellow', 'green', 'cyan', 'purple', 'pink'];
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const app = $('app'), cv = $('view'); let ctx = cv.getContext('2d');

// ---------- Almacenamiento (opcional, con try/catch) ----------
const store = {
    get(k, d) { try { const v = localStorage.getItem('tga_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    lock: false,      // se activa justo antes de recargar tras importar una copia, para que nada la pise
    set(k, v) { if (store.lock) return; try { localStorage.setItem('tga_' + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
};
const cfg = {
    diff: store.get('diff', 1), dorsal: store.get('dorsal', ''), decal: store.get('decal', 'none'), cupSize: store.get('cupSize', 8), replay: store.get('replay', true), sky: store.get('sky', true), hap: store.get('hap', {}), hapI: store.get('hapI', 'mid'), lay: store.get('lay', {}), mut: store.get('mut', {}), time: store.get('time', 120), mute: store.get('mute', false),
    car: store.get('car', 'fenix'), size: store.get('size', 'm'), hand: store.get('hand', 'l'),
    haptic: store.get('haptic', true), alpha: store.get('alpha', 'soft'),
    stick: store.get('stick', 'float'), gfx: store.get('gfx', 'high'),
    flick: store.get('flick', true), hit: store.get('hit', false), music: store.get('music', true), roll: store.get('roll', true), padHide: store.get('padHide', true), dev: store.get('dev', null), combo: store.get('combo', false), comm: store.get('comm', true),
    fps: store.get('fps', false), paint: store.get('paint', 'team'), wheel: store.get('wheel', 'auto'), trail: store.get('trail', 'auto'), boom: store.get('boom', 'classic'), ball: store.get('ball', 'classic'), stad: store.get('stad', 'snow'), evt: store.get('evt', 'auto'), crt: store.get('crt', true), cam: store.get('cam', !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches))
};
// estadio: stadSel es lo elegido en Controles ('random' o uno fijo) y cfg.stad el que se está viendo.
// Quien ya había elegido uno a mano lo conserva; si no, cada partida se juega en un estadio al azar.
const STADS = ['snow', 'neon', 'desierto', 'ciudad', 'volcan', 'retro'];
cfg.stadSel = store.get('stadSel', store.get('stad', 'random'));
if (cfg.stadSel !== 'random' && STADS.indexOf(cfg.stadSel) < 0) cfg.stadSel = 'random';
const pickStad = () => { const o = STADS.filter(s => s !== cfg.stad); return o[Math.floor(Math.random() * o.length)]; };
cfg.stad = cfg.stadSel === 'random' ? STADS[Math.floor(Math.random() * STADS.length)] : cfg.stadSel;
// cámara: 'dinamica' (zoom ligero en jugadas, por defecto), 'seguir' (sigue la jugada de cerca) o 'fija' (todo el estadio).
// Quien había quitado la cámara dinámica, o pide menos movimiento al sistema, empieza con la fija.
const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
cfg.camMode = store.get('camMode', store.get('cam', true) === false || REDUCED ? 'fija' : 'dinamica');
if (['seguir', 'dinamica', 'fija'].indexOf(cfg.camMode) < 0) cfg.camMode = 'dinamica';
let hapMark = null;
// ---------- eventos de temporada según la fecha del dispositivo ----------
const EVENTS = {
    halloween: { n: 'Halloween', ic: '🎃', col: '#ff8a2b', col2: '#a45cff', ball: 'calabaza', from: [10, 15], to: [11, 2] },
    navidad: { n: 'Navidad', ic: '🎄', col: '#ff4a4a', col2: '#3dd47a', ball: 'ev_navidad', from: [12, 1], to: [1, 6] },
    sanvalentin: { n: 'San Valentín', ic: '💘', col: '#ff4fb0', col2: '#ff9ad8', ball: 'ev_corazon', from: [2, 7], to: [2, 15] },
    primavera: { n: 'Primavera', ic: '🌸', col: '#ff9ad8', col2: '#8dff3d', ball: 'ev_flor', from: [3, 20], to: [4, 20] },
    verano: { n: 'Verano', ic: '☀️', col: '#ffd23f', col2: '#3dafff', ball: 'playa', from: [6, 21], to: [8, 31] }
};
const EV_GOALS = 10, EV_COINS = 300;
function evAt(d) {
    const v = (d.getMonth() + 1) * 100 + d.getDate();
    for (const k in EVENTS) { const e = EVENTS[k], a = e.from[0] * 100 + e.from[1], b = e.to[0] * 100 + e.to[1]; if (a <= b ? (v >= a && v <= b) : (v >= a || v <= b)) return k; }
    return null;
}
let EV = null;
function evRefresh() { EV = cfg.evt === 'off' ? null : (cfg.evt && cfg.evt !== 'auto' && EVENTS[cfg.evt]) ? cfg.evt : evAt(new Date()); }
evRefresh();
const evReal = () => !!EV && evAt(new Date()) === EV;      // el reto y lo gratis solo cuentan en las fechas de verdad
const evNewYear = () => { const d = new Date(); return (d.getMonth() === 11 && d.getDate() === 31) || (d.getMonth() === 0 && d.getDate() === 1); };
function evKey() { const d = new Date(), e = EVENTS[EV]; let y = d.getFullYear(); if (e.from[0] > e.to[0] && d.getMonth() + 1 <= e.to[0]) y--; return EV + y; }
function evDaysLeft() { const d = new Date(), e = EVENTS[EV]; let y = d.getFullYear(); if (e.from[0] > e.to[0] && d.getMonth() + 1 >= e.from[0]) y++; return Math.max(1, Math.ceil((new Date(y, e.to[0] - 1, e.to[1], 23, 59, 59) - d) / 864e5)); }
function evProg() { const all = store.get('evp', {}), k = evKey(); return all[k] || { g: 0, done: false }; }
function evUI() {
    const el = $('evCard'); if (!el) return;
    if (!EV) { el.hidden = true; return; }
    const e = EVENTS[EV], real = evReal(), p = evProg();
    el.hidden = false; el.style.setProperty('--ec', e.col); el.style.setProperty('--ec2', e.col2);
    $('evName').textContent = e.ic + ' ' + e.n + (EV === 'navidad' && evNewYear() ? ' · ¡Feliz Año Nuevo!' : '');
    const d = real ? evDaysLeft() : 0;
    $('evDays').textContent = real ? (d <= 1 ? 'Último día' : 'Quedan ' + d + ' días') : 'Vista previa';
    $('evBar').style.width = Math.min(100, p.g / EV_GOALS * 100).toFixed(0) + '%';
    $('evCnt').textContent = p.done ? '✓' : Math.min(p.g, EV_GOALS) + '/' + EV_GOALS + ' goles';
    const tn = (CARS.TRAILS.find(t => t.id === 'ev_' + EV) || {}).name || '';
    $('evTask').textContent = p.done ? 'Reto completado: estela «' + tn + '» conseguida' : real ? 'Premio: ' + EV_COINS + ' monedas + estela «' + tn + '»' : 'El reto solo cuenta en las fechas del evento';
    $('evGift').textContent = '🎁 Balón del evento gratis en el Taller' + (real ? '' : ' (en sus fechas)');
}
const record = store.get('record', { w: 0, l: 0 });
const CAR_IDS = CARS.LIST.map(c => c.id);
if (CAR_IDS.indexOf(cfg.car) < 0) cfg.car = 'fenix';
// desbloqueo: coches secretos (cromática)
let chromaUnlocked = !!store.get('chroma', false);
const isLocked = id => id === 'prisma' && !chromaUnlocked;
if (isLocked(cfg.car)) cfg.car = 'fenix';
const AI_CARS = ['chispa', 'bisonte', 'cuna', 'kaze', 'mula', 'titan'];     // la IA no usa legendarios ni cromáticos
const pickAI = () => AI_CARS[Math.floor(Math.random() * AI_CARS.length)];

// Niveles de calidad gráfica
const GFX = {
    ultra: { dpr: 3, minDpr: 1.5, bloom: true, bloom2: true, ultra: true, beams: true, crowd: true, maxP: 1500, pm: 1.6 },
    high: { dpr: 2, bloom: true, beams: true, crowd: true, maxP: 520 },
    mid: { dpr: 1.75, bloom: false, beams: true, crowd: true, maxP: 320 },
    low: { dpr: 1.25, bloom: false, beams: false, crowd: false, maxP: 160 }
};
const PC = !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);      // ultra solo en PC (ratón/teclado)
if (!GFX[cfg.gfx] || (cfg.gfx === 'ultra' && !PC)) cfg.gfx = 'high';
let Q = GFX[cfg.gfx];

