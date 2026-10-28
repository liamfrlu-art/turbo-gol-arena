'use strict';
/* Turbo Gol Arena · Interfaz: ajustes, garaje, monedas y logros, taller y Copa Turbo.
   Los archivos de js/ se cargan en orden y comparten el ámbito global (antes eran un solo game.js). */
// ---------- Interfaz ----------
const segs = {};
function segment(id, key, parse, cb) {
    const root = $(id);
    const mark = () => root.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(parse(b.dataset.v) === cfg[key])));
    root.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        cfg[key] = parse(b.dataset.v); store.set(key, cfg[key]); mark(); if (cb) cb();
    });
    mark(); segs[key] = mark;
}
function applyPrefs() {
    app.dataset.size = cfg.size; app.dataset.hand = cfg.hand; app.dataset.alpha = cfg.alpha; app.dataset.combo = cfg.combo ? '1' : '0';
    if (stick.id === null) requestAnimationFrame(restStick);
    if (typeof applyLay === 'function') applyLay();
    requestAnimationFrame(() => { if (typeof updatePv === 'function') updatePv(); });
}
function applyGfx() { Q = GFX[cfg.gfx] || GFX.high; resize(); }
function applyStad() { cfg.stad = cfg.stadSel === 'random' ? pickStad() : cfg.stadSel; resize(); }
{ const root = $('segMut'), mark = () => root.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(!!cfg.mut[b.dataset.m])));
  root.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; cfg.mut[b.dataset.m] = !cfg.mut[b.dataset.m]; store.set('mut', cfg.mut); mark(); });
  mark(); segs.mut = mark; }
segment('segDiff', 'diff', Number); segment('segTime', 'time', Number);
segment('segSize', 'size', String, applyPrefs); segment('segHand', 'hand', String, applyPrefs);
segment('segAlpha', 'alpha', String, applyPrefs); segment('segStick', 'stick', String);
segment('segGfx', 'gfx', String, applyGfx); segment('segCup', 'cupSize', Number, () => renderCup()); segment('segReplay', 'replay', v => v === '1', null); segment('segSky', 'sky', v => v === '1', null); segment('segHapI', 'hapI', String, () => buzz(40, 'test')); $('rpSkip').addEventListener('click', skipReplay); segment('segFps', 'fps', v => v === '1', () => { if (fpsBox) fpsBox.style.display = cfg.fps ? 'block' : 'none'; }); segment('segStad', 'stadSel', String, applyStad); segment('segEvt', 'evt', String, () => { evRefresh(); resize(); evUI(); }); segment('segCam', 'camMode', String, null); segment('segCrt', 'crt', v => v === '1', null);
segment('segHaptic', 'haptic', v => v === '1', () => buzz(25, 'test'));
segment('segFlick', 'flick', v => v === '1'); segment('segDev', 'dev', String, () => applyDev(true)); segment('segPadHide', 'padHide', v => v === '1', () => { app.dataset.padhide = cfg.padHide ? '1' : '0'; }); segment('segRoll', 'roll', v => v === '1'); segment('segCombo', 'combo', v => v === '1', applyPrefs); segment('segComm', 'comm', v => v === '1', () => { if (!cfg.comm) stopSpeech(); else say('Comentarista activado.', 2); }); segment('segMusic', 'music', v => v === '1'); segment('segHit', 'hit', v => v === '1');
{ const ub = $('gfxUltra'); if (ub && PC) ub.hidden = false; const fb = $('fpsBox'); if (fb) fb.style.display = cfg.fps ? 'block' : 'none'; }
applyPrefs();

// Garaje y controles
let overlayFrom = null, demoBoostT = 0;
function openOverlay(id, from) {
    overlayFrom = from; if (from) $(from).classList.remove('show');
    $(id).classList.add('show');
    if (id === 'ctrls') { app.dataset.ctrl = '1'; requestAnimationFrame(restStick); requestAnimationFrame(() => requestAnimationFrame(() => { if (typeof updatePv === 'function') updatePv(); })); }
}
function closeOverlay(id) {
    $(id).classList.remove('show'); delete app.dataset.ctrl;
    if (overlayFrom) $(overlayFrom).classList.add('show');
    overlayFrom = null; stopGarage(); if (typeof stopShop === 'function') stopShop();
}
const cards = [];
let garageRaf = 0;
const STAT_DEFS = [
    ['Velocidad', t => t.top, .95, 1.15],
    ['Aceleración', t => t.acc, .9, 1.16],
    ['Salto', t => t.jump, .88, 1.12],
    ['Giro aéreo', t => t.air, .82, 1.2],
    ['Potencia', t => t.power, .9, 1.2],
    ['Turbo', t => t.boostMax / 100 * t.boostAcc / t.drain, .95, 1.75]
];
// iconos de las estadísticas, en el mismo orden: velocímetro, rayo, flecha arriba, giro, impacto y llama
const STAT_IC = [
    'M12 4a9 9 0 0 0-9 9 9 9 0 0 0 1.5 5h15A9 9 0 0 0 21 13a9 9 0 0 0-9-9zm4.2 4.4-3.1 5.4a1.6 1.6 0 1 1-1.5-.9l3.6-5.2z',
    'M13 2 4 14h6l-1 8 9-12h-6z',
    'M12 3 5 11h4v10h6V11h4z',
    'M12 4a8 8 0 1 0 8 8h-2.5A5.5 5.5 0 1 1 12 6.5V9l4-3.5L12 2z',
    'M12 2l2.2 6.3L21 9l-5 4.3 1.6 6.7L12 16.5 6.4 20 8 13.3 3 9l6.8-.7z',
    'M12 2c1 4 5 5.5 5 10.5A5 5 0 0 1 7 12.5c0-2.2 1.2-3.5 2.4-4.6-.1 2 1 3.2 2.1 3.6C11.2 8.4 11 5 12 2z'
];
let sel = cfg.car, gShowHit = false;
function showInfo(id) {
    const info = CARS.LIST.find(c => c.id === id), t = T.TYPES[id], rar = CARS.RARITY[info.rarity], te = T.TYPES[cfg.car], lk = isLocked(id);
    if (!info || !t) return;
    $('carInfo').style.setProperty('--rc', rar.color); $('gStage').style.setProperty('--rc', rar.color);
    $('ciName').textContent = lk ? '???' : info.name; $('ciRar').textContent = rar.name; $('ciTag').textContent = lk ? '' : info.tag;
    $('ciDesc').textContent = lk ? 'Rareza cromática, la más difícil de conseguir. ' + chromaHint() : info.desc;
    { const gh = $('gHint'); gh.hidden = !lk; if (lk) gh.querySelector('span').textContent = chromaHint(); }
    $('ciHit').textContent = lk ? 'Bloqueado' : 'Hitbox ' + hbSize(t) + '  ·  Peso ' + t.mass.toFixed(2) + '  ·  Turbo máx. ' + t.boostMax;
    // cada estadística con su icono, el número grande y, si no es tu coche, la diferencia con el tuyo (+ verde, − rojo)
    $('ciStats').innerHTML = lk ? '' : STAT_DEFS.map((d, i) => {
        const f = ty => clamp((d[1](ty) - d[2]) / (d[3] - d[2]), .05, 1), p = f(t), v = Math.max(1, Math.round(p * 10)), ve = Math.max(1, Math.round(f(te) * 10));
        const cmp = id !== cfg.car, dl = v - ve;
        return '<div class="srow"><svg class="sic" viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAT_IC[i] + '"/></svg><span>' + d[0] + '</span><div class="bar"><i style="width:' + Math.round(p * 100) + '%"></i>' + (cmp ? '<u style="left:' + Math.round(f(te) * 100) + '%"></u>' : '') + '</div><em>' + v + '</em><small class="' + (cmp && dl ? (dl > 0 ? 'up' : 'dn') : '') + '">' + (cmp && dl ? (dl > 0 ? '+' : '−') + Math.abs(dl) : '') + '</small></div>';
    }).join('');
    const eq = $('gEquip'); eq.className = 'btn' + (id === cfg.car ? ' eqd' : ''); eq.textContent = lk ? 'Bloqueado' : id === cfg.car ? 'Equipado ✓' : 'Equipar';
    $('gTest').style.display = lk ? 'none' : '';
}
let tapN = 0, tapT = 0, tapId = '', toastTm = 0, tapsTm = 0;
// pistas del coche secreto: se van aclarando según los partidos jugados
function chromaHint() {
    const m = (store.get('stats', {}) || {}).matches || 0;
    if (m >= 15) return 'Toca 5 veces seguidas el Kaze GT aquí en el Garaje.';
    if (m >= 5) return 'El épico que lleva el nombre del viento.';
    return 'Hay un coche que no aparece en ninguna tienda. Dicen que despierta si llamas a su puerta… muchas veces.';
}
function showTaps() {       // puntitos que se encienden al tocar el Kaze GT seguido
    const el = $('gTaps'); clearTimeout(tapsTm);
    if (chromaUnlocked || tapId !== 'kaze' || tapN < 2 || sel !== 'kaze') { el.hidden = true; return; }
    el.innerHTML = ''; for (let i = 0; i < 5; i++) { const d = document.createElement('i'); if (i < tapN) d.className = 'on'; el.appendChild(d); }
    el.hidden = false; tapsTm = setTimeout(() => { el.hidden = true; }, 2000);
}
function toast(msg, col) {
    let el = $('toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg; el.style.setProperty('--rc', col || '#ff4fd8'); el.classList.add('show');
    clearTimeout(toastTm); toastTm = setTimeout(() => el.classList.remove('show'), 2600);
}
function unlockChroma() {
    chromaUnlocked = true; store.set('chroma', true); tapN = 0;
    cards.forEach(k => { if (k.id === 'prisma') { k.el.classList.remove('locked'); k.el.querySelector('b').textContent = 'Prisma Volt'; } });
    sfx('unlock'); buzz([30, 40, 30, 40, 90], 'ui'); toast('¡DESBLOQUEADO!  Prisma Volt · Cromática', '#ff4fd8');
    selCar('prisma', true);
}
function selCar(id, quiet) {
    sel = id; cards.forEach(k => { k.el.setAttribute('aria-pressed', String(k.id === id)); k.el.classList.toggle('eq', k.id === cfg.car); });
    // la tira de coches se desliza sola hasta dejar el elegido a la vista
    const k = cards.find(c => c.id === id), strip = $('carGrid');
    if (k && strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: k.el.offsetLeft - (strip.clientWidth - k.el.offsetWidth) / 2, behavior: quiet ? 'auto' : 'smooth' });
    showInfo(id); if (!quiet) { sfx('click'); buzz(10, 'ui'); }
}
function equipCar(id) {
    if (isLocked(id)) return;
    cfg.car = id; store.set('car', id);
    T.applyType(S.world.cars[0], id); T.kickoff(S.world); S.world.cars[0].spd = 1;
    selCar(id, true); sfx('unlock'); buzz([15, 20, 25], 'ui'); renderStats();      // también el nombre de la vitrina del menú
}
function stepCar(d) {
    const ids = CARS.LIST.filter(c => !isLocked(c.id)).map(c => c.id);
    const i = ids.indexOf(sel); const n = ids[(i < 0 ? 0 : i + d + ids.length) % ids.length];
    selCar(n);
}
function buildGarage() {
    const grid = $('carGrid');
    CARS.LIST.forEach(c => {
        const rar = CARS.RARITY[c.rarity];
        const b = document.createElement('button');
        b.className = 'car-card ' + c.rarity + (isLocked(c.id) ? ' locked' : '');
        b.style.setProperty('--rc', rar.color);
        b.innerHTML = '<canvas></canvas><b></b><span class="rar"></span><span class="tag"></span>';
        b.querySelector('b').textContent = c.name; b.querySelector('.rar').textContent = rar.name; b.querySelector('.tag').textContent = c.tag;
        if (isLocked(c.id)) { b.querySelector('b').textContent = '???'; }
        b.addEventListener('click', () => {
            // secreto: 5 toques seguidos al Kaze GT desbloquean la cromática (el Titán, el otro épico, solo da una pista)
            if (!chromaUnlocked && (c.id === 'kaze' || c.id === 'titan')) {
                const n = performance.now();
                tapN = (n - tapT < 2000 && tapId === c.id) ? tapN + 1 : 1; tapT = n; tapId = c.id;
                if (c.id === 'kaze') { if (tapN >= 5) { unlockChroma(); showTaps(); return; } else if (tapN > 1) sfx('tap', tapN - 1); }
                else if (tapN >= 5) { tapN = 0; toast('Frío, frío… prueba con el otro épico', '#7fd4ff'); sfx('click'); }
            } else { tapN = 0; tapId = c.id; }
            selCar(c.id, (c.id === 'kaze' || c.id === 'titan') && tapN > 1); showTaps();
        });
        grid.appendChild(b); cards.push({ id: c.id, el: b, cv: b.querySelector('canvas') });
    });
    $('gPrev').addEventListener('click', () => stepCar(-1)); $('gNext').addEventListener('click', () => stepCar(1));
    { // deslizar el dedo (o el ratón) sobre el coche pasa al siguiente o al anterior
        const stg = $('gStage'); let sx = null, sy = 0;
        stg.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; sx = e.clientX; sy = e.clientY; });
        stg.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (Math.abs(dx) > 45 && Math.abs(dy) < 70) stepCar(dx < 0 ? 1 : -1); });
        stg.addEventListener('pointercancel', () => { sx = null; });
        stg.style.touchAction = 'pan-y';
    }
    $('gEquip').addEventListener('click', () => equipCar(sel));
    $('gHit').addEventListener('click', () => { gShowHit = !gShowHit; $('gHit').setAttribute('aria-pressed', String(gShowHit)); sfx('click'); });
    $('gShop').addEventListener('click', () => { $('garage').classList.remove('show'); stopGarage(); openOverlay('shop', 'menu'); renderShop(); });
    $('gTest').addEventListener('click', () => { if (isLocked(sel)) return; S.tryCar = sel; closeOverlay('garage'); startMatch('free'); });
    const di = $('dorInp'); di.value = cfg.dorsal;
    di.addEventListener('input', () => { di.value = di.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3); cfg.dorsal = di.value; store.set('dorsal', cfg.dorsal); });
    selCar(cfg.car, true);
}
function garageLoop() {
    const t = performance.now() / 1000;
    const hue = 'hsl(' + ((t * 70) % 360).toFixed(0) + ',95%,66%)';
    for (const k of cards) {
        const lk = isLocked(k.id);
        if (k.id === 'prisma') k.el.style.setProperty('--rc', hue);
        CARS.preview(k.cv, k.id, t, k.id === sel, false, lk, { paint: k.id === cfg.car ? cfg.paint : null, wheelStyle: k.id === cfg.car ? cfg.wheel : null, dorsal: k.id === cfg.car ? cfg.dorsal : null, decal: k.id === cfg.car ? cfg.decal : null });
    }
    CARS.preview($('gBig'), sel, t, true, gShowHit, isLocked(sel), { zoom: .68, paint: cfg.paint, wheelStyle: cfg.wheel, trail: cfg.trail, dorsal: cfg.dorsal, decal: cfg.decal });
    if (sel === 'prisma' && !isLocked('prisma')) { $('gStage').style.setProperty('--rc', hue); $('carInfo').style.setProperty('--rc', hue); }
    garageRaf = requestAnimationFrame(garageLoop);
}
function startGarage() { if (!garageRaf) garageLoop(); }
function stopGarage() { if (garageRaf) { cancelAnimationFrame(garageRaf); garageRaf = 0; } }
buildGarage();
// ---------- Monedas, nivel, estadísticas y logros ----------
const wallet = {
    coins: store.get('coins', 0), xp: store.get('xp', 0), ach: store.get('ach', {}),
    st: Object.assign({ goals: 0, conc: 0, matches: 0, wins: 0, draws: 0, losses: 0, streak: 0, best: 0, secs: 0, cups: 0, cups16: 0, aerial: 0, half: 0, fastaer: 0, resets: 0, bought: 0, earned: 0 }, store.get('stats', {})),
    owned: store.get('owned', null)
};
{ // los objetos gratuitos de siempre y lo que ya llevabas puesto quedan como tuyos
    const free = { paint: ['team'], wheel: ['auto'], trail: ['auto'], boom: ['classic'], ball: ['classic'], decal: ['none'] };
    if (!wallet.owned) { wallet.owned = {}; for (const k in free) wallet.owned[k] = [...new Set([...free[k], cfg[k]])]; }
    for (const k in free) if (!wallet.owned[k]) wallet.owned[k] = free[k].slice();
    store.set('owned', wallet.owned);
}
if (!wallet.owned.ball.includes(cfg.ball) && !(evReal() && EVENTS[EV].ball === cfg.ball)) { cfg.ball = 'classic'; store.set('ball', 'classic'); }     // el balón gratis del evento se devuelve al acabar
const saveWallet = () => { store.set('coins', wallet.coins); store.set('xp', wallet.xp); store.set('ach', wallet.ach); store.set('stats', wallet.st); store.set('owned', wallet.owned); };
const lvlOf = xp => { let L = 1; while (60 * (L + 1) * L <= xp) L++; return L; };
const lvlStart = L => 60 * L * (L - 1);
const LV_ITEMS = { 3: ['paint', 'rosa'], 5: ['trail', 'rayo'], 7: ['wheel', 'neon'], 10: ['ball', 'galaxia'], 12: ['boom', 'supernova'], 15: ['paint', 'cromo'] };
const tq = []; let tqRun = false;
function qToast(msg, col) { tq.push([msg, col]); if (!tqRun) { tqRun = true; const next = () => { const t = tq.shift(); if (!t) { tqRun = false; return; } toast(t[0], t[1]); setTimeout(next, 2300); }; next(); } }
const ACH = [
    { id: 'g1', n: 'Primer gol', d: 'Marca un gol en partido', t: s => s.goals >= 1 },
    { id: 'g25', n: 'Goleador', d: 'Marca 25 goles', t: s => s.goals >= 25 },
    { id: 'g100', n: 'Pichichi', d: 'Marca 100 goles', t: s => s.goals >= 100 },
    { id: 'w1', n: 'Primera victoria', d: 'Gana un partido', t: s => s.wins >= 1 },
    { id: 'w10', n: 'Imparable', d: 'Gana 10 partidos', t: s => s.wins >= 10 },
    { id: 'str3', n: 'Racha', d: 'Gana 3 partidos seguidos', t: s => s.best >= 3 },
    { id: 'air', n: 'Gol aéreo', d: 'Marca con el coche en el aire', t: s => s.aerial >= 1 },
    { id: 'half', n: 'Media vuelta', d: 'Haz una media vuelta en partido', t: s => s.half >= 1 },
    { id: 'fast', n: 'Aéreo rápido', d: 'Haz un aéreo rápido', t: s => s.fastaer >= 1 },
    { id: 'reset', n: 'Reinicio de voltereta', d: 'Toca el balón con las ruedas en el aire para recuperar el salto', t: s => s.resets >= 1 },
    { id: 'clean', n: 'Portería a cero', d: 'Gana sin encajar goles', t: (s, c) => c.clean },
    { id: 'big', n: 'Goleada', d: 'Gana por 5 goles o más', t: (s, c) => c.big },
    { id: 'legend', n: 'Domador de leyendas', d: 'Gana a la IA Leyenda', t: (s, c) => c.legend },
    { id: 'mut', n: 'Caos controlado', d: 'Gana con un mutador activo', t: (s, c) => c.mut },
    { id: 'come', n: 'Remontada', d: 'Gana habiendo ido perdiendo por 2 goles', t: (s, c) => c.comeback },
    { id: 'gold', n: 'Gol de oro', d: 'Gana en la prórroga', t: (s, c) => c.gold },
    { id: 'cup', n: 'Campeón', d: 'Gana la Copa Turbo', t: s => s.cups >= 1 },
    { id: 'cup16', n: 'Gran campeón', d: 'Gana la Copa de 16 equipos', t: s => s.cups16 >= 1 },
    { id: 'shop5', n: 'Coleccionista', d: 'Compra 5 objetos en el Taller', t: s => s.bought >= 5 },
    { id: 'drill1', n: 'Alumno aplicado', d: 'Consigue 3 estrellas en un reto de entrenamiento', t: () => Object.values(drillBest).some(v => v >= 3) },
    { id: 'drill4', n: 'Maestro del entrenamiento', d: 'Consigue 3 estrellas en los cuatro retos', t: () => ['shoot', 'air', 'save', 'prec'].every(k => (drillBest[k] || 0) >= 3) },
    { id: 'lv5', n: 'Veterano', d: 'Llega al nivel 5', t: () => lvlOf(wallet.xp) >= 5 }
];
function achCheck(ctx) {
    for (const a of ACH) if (!wallet.ach[a.id] && a.t(wallet.st, ctx || {})) {
        wallet.ach[a.id] = 1; wallet.coins += 40; wallet.st.earned += 40;
        qToast('Logro: ' + a.n + '  +40 monedas', '#ffd23f'); sfx('unlock');
        if (S.rw) S.rw.push('Logro «' + a.n + '» +40');
    }
}
function award(coins, xp) {
    const l0 = lvlOf(wallet.xp);
    wallet.coins += coins; wallet.st.earned += coins; wallet.xp += xp;
    const l1 = lvlOf(wallet.xp);
    for (let L = l0 + 1; L <= l1; L++) {
        const bonus = 40 + 10 * L; wallet.coins += bonus; wallet.st.earned += bonus;
        let txt = 'Nivel ' + L + '  +' + bonus + ' monedas';
        const it = LV_ITEMS[L];
        if (it) { if (!wallet.owned[it[0]].includes(it[1])) wallet.owned[it[0]].push(it[1]); txt += ' y un objeto nuevo en el Taller'; }
        qToast(txt, '#3dffb0'); if (S.rw) S.rw.push('Nivel ' + L + '!');
    }
    achCheck();
}
function matchRewards(b, o) {
    const st = wallet.st, win = b > o, draw = b === o, lvl = S.cup ? S.cup.lvl : S.net ? 1 : cfg.diff;      // online premia como un partido Normal
    st.matches++;
    if (win) { st.wins++; st.streak++; st.best = Math.max(st.best, st.streak); } else { st.streak = 0; if (draw) st.draws++; else st.losses++; }
    const mult = [0.6, 1, 1.3, 1.6][lvl] * (S.cup ? 1.2 : 1);
    const coins = Math.round(((win ? 60 : draw ? 25 : 20) + 8 * Math.min(b, 10)) * mult), xp = (win ? 120 : draw ? 70 : 50) + 10 * b;
    S.rw = ['+' + coins + ' monedas', '+' + xp + ' XP'];
    award(coins, xp);
    const ctx = { clean: win && o === 0, big: win && b - o >= 5, legend: win && lvl === 3, mut: win && Object.keys(MUT_N).some(k => T.MUT[k]) && !S.cup, comeback: win && S.minDiff <= -2, gold: win && S.ot };
    achCheck(ctx); saveWallet();
}
function renderStatsScreen() {
    const L = lvlOf(wallet.xp), a = lvlStart(L), bnd = lvlStart(L + 1), p = clamp((wallet.xp - a) / (bnd - a), 0, 1), st = wallet.st;
    $('lvlBox').innerHTML = '<b>Nivel ' + L + '</b><span>' + wallet.coins + ' monedas</span><div class="bar"><i style="width:' + (p * 100).toFixed(0) + '%"></i></div><small>' + (wallet.xp - a) + ' / ' + (bnd - a) + ' XP para el nivel ' + (L + 1) + '</small>';
    const rows = [['Partidos', st.matches], ['Victorias', st.wins], ['Empates', st.draws], ['Derrotas', st.losses], ['Mejor racha', st.best], ['Goles', st.goals], ['Goles encajados', st.conc], ['Goles aéreos', st.aerial],
        ['Medias vueltas', st.half], ['Aéreos rápidos', st.fastaer], ['Reinicios de voltereta', st.resets], ['Copas ganadas', st.cups], ['Tiempo jugado', Math.floor(st.secs / 60) + ' min'], ['Monedas ganadas', st.earned]];
    $('statGrid').innerHTML = rows.map(r => '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>').join('');
    const got = ACH.filter(x => wallet.ach[x.id]).length;
    $('achList').innerHTML = '<h4>Logros ' + got + ' / ' + ACH.length + '</h4>' + ACH.map(x => '<div class="ach' + (wallet.ach[x.id] ? ' got' : '') + '"><b>' + x.n + '</b><span>' + x.d + '</span></div>').join('');
}
$('cfgBtn').addEventListener('click', () => { audio(); openOverlay('setup', 'menu'); });
$('setupOk').addEventListener('click', () => { closeOverlay('setup'); renderStats(); });
$('achBtn').addEventListener('click', () => { audio(); openOverlay('ach', 'menu'); renderStatsScreen(); });
$('achOk').addEventListener('click', () => closeOverlay('ach'));
// ---------- Taller ----------
const SHOP = {
    paint: { list: CARS.PAINTS, note: 'La pintura se aplica a tu coche. La Cromática ya tiene su propio acabado.' },
    decal: { list: CARS.DECALS, note: 'Pegatinas para la puerta de tu coche. Se ven en el campo y en el garaje.' },
    wheel: { list: CARS.WHEELS, note: 'Ruedas nuevas para tu coche (el patín lleva las suyas).' },
    trail: { list: CARS.TRAILS, note: 'Estela del turbo: míralo arriba, tu coche usa turbo de prueba.' },
    boom: { list: [
        { id: 'classic', name: 'Clásica', sw: 'radial-gradient(circle,#fff,#3db8ff 50%,#ffd23f)' },
        { id: 'fuegos', name: 'Fuegos', sw: 'conic-gradient(#f33,#ff0,#3f3,#3ff,#a4f,#f33)' },
        { id: 'rayos', name: 'Rayos', sw: 'linear-gradient(135deg,#12206a,#7cc8ff 45%,#fff 50%,#12206a 55%)' },
        { id: 'confeti', name: 'Confeti', sw: 'repeating-conic-gradient(#ff4a4a 0 15%,#ffe23a 0 30%,#3dafff 0 45%,#4aff7a 0 60%)' },
        { id: 'corazones', name: 'Corazones', sw: 'radial-gradient(circle,#ff6a90,#c01040)' },
        { id: 'supernova', name: 'Supernova', sw: 'radial-gradient(circle,#fff 0 25%,#ffd23f 40%,#ff6a1a 70%,#300)' },
        { id: 'baile', name: 'Piloto bailarín', sw: 'radial-gradient(circle at 50% 30%,#ffd9b0 0 18%,#3db8ff 20% 60%,#0a1040 62%)' },
        { id: 'disco', name: 'Discoteca', sw: 'conic-gradient(#ff3df0,#3dfff0,#ffee3d,#ff3df0)' },
        { id: 'monedas', name: 'Lluvia de oro', sw: 'radial-gradient(circle at 40% 35%,#fff6a0,#ffc61a 55%,#9a6a00)' },
        { id: 'meteoros', name: 'Meteoritos', sw: 'linear-gradient(135deg,#fff 0,#ff9a3d 35%,#2a0a00 70%)' },
        { id: 'neon', name: 'Neón', sw: 'repeating-radial-gradient(circle,#0a0f2a 0 4px,#ff3dd0 4px 6px,#3dfff0 6px 8px)' },
        { id: 'hielo', name: 'Tormenta de hielo', sw: 'radial-gradient(circle,#fff 0 18%,#9fe8ff 40%,#2a78b8 80%)' },
        { id: 'anillos', name: 'Anillos de energía', sw: 'repeating-radial-gradient(circle,#0a0f2a 0 3px,#ffd23f 3px 5px,#3dfff0 5px 7px)' }
    ], note: 'Se ve al marcar tú. Toca una para probarla en la portería.' },
    ball: { list: null, note: 'Solo cambia el aspecto: todos pesan y rebotan igual.' }
};
let shopTab = 'paint';
const PRICE = i => i === 0 ? 0 : i <= 2 ? 100 : i <= 5 ? 200 : i <= 8 ? 350 : 500;
const evVisible = (tab, o) => !o.ev || o.ev === EV || wallet.owned[tab].includes(o.id);
const evFree = (tab, o) => tab === 'ball' && evReal() && EVENTS[EV].ball === o.id;
const priceOf = (o, i) => o.reward ? Infinity : o.price != null ? o.price : PRICE(i);
function shopList() { const l = shopTab === 'ball' ? BALLS : SHOP[shopTab].list; return l.filter(o => evVisible(shopTab, o)); }
// estado del taller: objeto seleccionado por pestaña, filtro y orden
const shopS = { sel: {}, filt: 'all', sort: 'std', raf: 0 };
const shopOwn = (tab, o) => wallet.owned[tab].includes(o.id) || evFree(tab, o);
function shopItem() { const l = shopList(); return l.find(o => o.id === (shopS.sel[shopTab] || cfg[shopTab])) || l[0]; }
function shopProgress() {
    let have = 0, all = 0;
    for (const t of ['paint', 'wheel', 'decal', 'trail', 'boom', 'ball']) { const l = (t === 'ball' ? BALLS : SHOP[t].list).filter(o => !o.ev || wallet.owned[t].includes(o.id)); all += l.length; have += l.filter(o => wallet.owned[t].includes(o.id)).length; }
    return have + ' / ' + all;
}
function shopPreview() {
    const o = shopItem(), tab = shopTab, car = tab === 'boom';
    $('shopBig').style.display = car ? 'none' : 'block'; $('shopSw').style.display = car ? 'block' : 'none';
    if (car) $('shopSw').style.background = o.sw;
}
// balón real en la vista previa: usa el mismo dibujo del campo sobre el lienzo del taller
function shopBall(t) {
    const cvs = $('shopBig'), w = cvs.clientWidth, h = cvs.clientHeight; if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cvs.width !== Math.round(w * dpr) || cvs.height !== Math.round(h * dpr)) { cvs.width = Math.round(w * dpr); cvs.height = Math.round(h * dpr); }
    const c2 = cvs.getContext('2d'), id = shopItem().id, keep = ctx, keepBall = cfg.ball, R = T.BALL_R, s = Math.min(w, h) * .3 / R;
    const gy = h * .86, hop = Math.abs(Math.sin(t * 2.2)), by = gy - R * s - hop * h * .13;
    c2.setTransform(dpr, 0, 0, dpr, 0, 0); c2.clearRect(0, 0, w, h);
    c2.fillStyle = 'rgba(160,180,255,.16)'; c2.fillRect(0, gy + 1, w, 1.5);
    c2.fillStyle = 'rgba(0,0,0,' + (.38 - .18 * hop) + ')'; c2.beginPath(); c2.ellipse(w / 2, gy + 2, R * s * (1 - .3 * hop), 5, 0, 0, TAU); c2.fill();
    const pal = BALL_PAL[id] || 'gold'; c2.save(); c2.globalCompositeOperation = 'lighter'; c2.globalAlpha = .5; c2.drawImage(glow(pal), w / 2 - R * s * 2.2, by - R * s * 2.2, R * s * 4.4, R * s * 4.4); c2.restore();
    try {
        ctx = c2; cfg.ball = id;
        c2.save(); c2.translate(w / 2, by); c2.scale(s, s);
        ballBody({ rot: t * 1.4, vx: 0, vy: 0, x: 0, y: 0 }, t);
        c2.restore();
    } finally { ctx = keep; cfg.ball = keepBall; }
}
function shopLoop(now) {
    if (!$('shop').classList.contains('show')) { shopS.raf = 0; return; }
    if (shopTab === 'ball') shopBall(now / 1000);
    else if (shopTab !== 'boom') {
        const t = now / 1000, o = shopItem(), ex = { zoom: .85, paint: cfg.paint, wheelStyle: cfg.wheel, trail: cfg.trail, dorsal: cfg.dorsal, decal: cfg.decal };
        if (shopTab === 'paint') ex.paint = o.id; else if (shopTab === 'wheel') ex.wheelStyle = o.id; else if (shopTab === 'decal') ex.decal = o.id; else if (shopTab === 'trail') ex.trail = o.id;
        CARS.preview($('shopBig'), cfg.car, t, shopTab === 'trail', false, false, ex);
    }
    shopS.raf = requestAnimationFrame(shopLoop);
}
function stopShop() { if (shopS.raf) { cancelAnimationFrame(shopS.raf); shopS.raf = 0; } }
function shopDemo(o) {
    if (shopTab === 'trail') demoBoostT = 2.2;
    if (shopTab === 'boom') {
        goalFx(0, o.id); sfx('goal');
        const sh = $('shop'); sh.classList.add('peek'); clearTimeout(S.peekT); S.peekT = setTimeout(() => sh.classList.remove('peek'), 2000);   // el panel se aparta para ver la explosión
    }
}
function shopAction() {
    const tab = shopTab, o = shopItem(), idx = shopList().indexOf(o), price = priceOf(o, idx), own = shopOwn(tab, o);
    if (!own && o.reward) { toast('Se consigue completando el reto del evento', '#ffd23f'); sfx('click'); return; }
    if (!own && o.ev && !evReal()) { toast('Solo se puede comprar en las fechas de ' + EVENTS[o.ev].n, '#ffd23f'); sfx('click'); return; }
    if (!own) {
        if (wallet.coins < price) { toast('Te faltan ' + (price - wallet.coins) + ' monedas para ' + o.name, '#ff8a2b'); sfx('click'); return; }
        wallet.coins -= price; wallet.owned[tab].push(o.id); wallet.st.bought++; achCheck(); saveWallet(); sfx('unlock'); toast('Comprado: ' + o.name, '#3dffb0');
    }
    cfg[tab] = o.id; store.set(tab, o.id); sfx('click'); buzz(10, 'ui');
    renderShop(true);
}
// miniaturas del taller: dibujan el objeto de verdad (coche, rueda, pegatina, estela, balón) sobre un lienzo pequeño
function shopThumb(tab, o, own) {
    const W = 76, H = 50, dpr = 2, cv = document.createElement('canvas'); cv.width = W * dpr; cv.height = H * dpr; cv.className = 'thumb';
    const c2 = cv.getContext('2d'); c2.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = c2.createRadialGradient(W / 2, H * .62, 4, W / 2, H / 2, W * .65); bg.addColorStop(0, 'rgba(70,96,190,.55)'); bg.addColorStop(1, 'rgba(10,16,48,.2)');
    c2.fillStyle = bg; c2.fillRect(0, 0, W, H);
    c2.fillStyle = 'rgba(160,180,255,.18)'; c2.fillRect(0, H - 7, W, 1);
    try {
        if (tab === 'ball') {
            const keep = ctx, kb = cfg.ball, R = T.BALL_R, s = 19 / R; ctx = c2; cfg.ball = o.id;
            try {
                c2.save(); c2.globalCompositeOperation = 'lighter'; c2.globalAlpha = .4; const gp = glow(BALL_PAL[o.id] || 'gold'); c2.drawImage(gp, W / 2 - 34, H / 2 - 34, 68, 68); c2.restore();
                c2.save(); c2.translate(W / 2, H / 2 - 1); c2.scale(s, s); ballBody({ rot: .7, vx: 0, vy: 0, x: 0, y: 0 }, 0); c2.restore();
            } finally { ctx = keep; cfg.ball = kb; }
        } else {
            const model = (tab === 'paint' && (cfg.car === 'fenix' || cfg.car === 'prisma')) ? 'chispa' : cfg.car, ex = { boosting: tab === 'trail', wheel: .4, t: 0, spin: 0, brake: false, paint: cfg.paint, wheelStyle: cfg.wheel, trail: cfg.trail, dorsal: null, decal: cfg.decal };
            if (tab === 'paint') ex.paint = o.id; else if (tab === 'wheel') ex.wheelStyle = o.id; else if (tab === 'decal') ex.decal = o.id; else if (tab === 'trail') ex.trail = o.id;
            let s = .62, ox = 0, oy = 1;
            if (tab === 'wheel' && model !== 'prisma') { s = 1.55; ox = -29 * 1.55 + W * .02; oy = -6 * 1.55 + 2; }
            else if (tab === 'decal' && model !== 'prisma') { s = 1.05; ox = -9 * 1.05; oy = 0; }
            else if (tab === 'trail') { s = .5; ox = 9; }
            c2.save(); c2.translate(W / 2 + ox, H / 2 + oy); c2.scale(s, s); CARS.paint(c2, model, 0, ex); c2.restore();
        }
    } catch (e) { /* una miniatura nunca debe romper el taller */ }
    if (!own) {                                                       // candado
        c2.fillStyle = 'rgba(8,12,34,.34)'; c2.fillRect(0, 0, W, H);
        c2.fillStyle = '#ffd23f'; c2.beginPath(); c2.roundRect ? c2.roundRect(W - 19, H - 17, 13, 10, 2) : c2.rect(W - 19, H - 17, 13, 10); c2.fill();
        c2.strokeStyle = '#ffd23f'; c2.lineWidth = 1.7; c2.beginPath(); c2.arc(W - 12.5, H - 17, 3.6, Math.PI, 0); c2.stroke();
        c2.fillStyle = '#5a3a00'; c2.fillRect(W - 13.3, H - 13.5, 1.6, 3.4);
    }
    return cv;
}
function renderShop(keep) {
    const box = $('shopChips'), tab = shopTab, prevScroll = box.scrollTop;
    box.innerHTML = '';
    $('shopCoins').textContent = wallet.coins + ' monedas';
    $('shopProg').textContent = 'Conseguidos ' + shopProgress();
    if (!shopS.sel[tab]) shopS.sel[tab] = cfg[tab];
    let items = shopList().map((o, idx) => ({ o, idx, own: shopOwn(tab, o), price: priceOf(o, idx) }));
    const F = shopS.filt;
    items = items.filter(x => F === 'all' || (F === 'own' && x.own) || (F === 'can' && !x.own && wallet.coins >= x.price) || (F === 'lock' && !x.own));
    if (shopS.sort === 'price') items.sort((a, b) => a.price - b.price || a.idx - b.idx);
    items.forEach(({ o, own, price }) => {
        const eq = own && cfg[tab] === o.id, can = !own && wallet.coins >= price;
        const b = document.createElement('button'); b.className = 'chip-o' + (own ? '' : ' lock') + (can ? ' can' : '');
        b.dataset.id = o.id; b.setAttribute('aria-pressed', String(shopS.sel[tab] === o.id));
        b.innerHTML = '<i></i><span></span><small></small>'; b.querySelector('span').textContent = o.name;
        if (tab === 'boom') { const ii = b.querySelector('i'); ii.style.background = o.sw; ii.classList.add('big'); } else b.replaceChild(shopThumb(tab, o, own), b.querySelector('i'));
        b.querySelector('small').textContent = eq ? 'Equipado' : own ? (evFree(tab, o) && !wallet.owned[tab].includes(o.id) ? 'Gratis en el evento' : 'Tuyo') : o.reward ? 'Premio del reto' : (o.ev ? '⏳ ' : '') + price + ' monedas';
        if (eq) b.classList.add('eq');
        b.addEventListener('click', () => {
            shopS.sel[tab] = o.id; box.querySelectorAll('.chip-o').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
            sfx('tick'); shopInfo(); shopPreview(); shopDemo(o);
        });
        box.appendChild(b);
    });
    if (!items.length) box.innerHTML = '<p class="shopempty">No hay objetos con este filtro.</p>';
    box.scrollTop = keep ? prevScroll : 0;
    $('shopNote').textContent = SHOP[tab].note;
    shopInfo(); shopPreview();
    if (!shopS.raf) shopS.raf = requestAnimationFrame(shopLoop);
}
function shopInfo() {
    const tab = shopTab, o = shopItem(), idx = shopList().indexOf(o), price = priceOf(o, idx), own = shopOwn(tab, o), eq = own && cfg[tab] === o.id;
    $('shopName').textContent = o.name;
    $('shopPrice').textContent = (own ? (eq ? 'Equipado ahora' : evFree(tab, o) && !wallet.owned[tab].includes(o.id) ? 'Gratis durante el evento' : 'Ya es tuyo') : o.reward ? 'Premio del reto de ' + EVENTS[o.ev].n : price + ' monedas') + (o.ev && !own && !o.reward ? ' · Solo durante ' + EVENTS[o.ev].n : '');
    if (!own && (o.reward || (o.ev && !evReal()))) { const a0 = $('shopAct'); a0.disabled = true; a0.classList.remove('short'); a0.textContent = o.reward ? 'Completa el reto' : 'Solo en sus fechas'; return; }
    const a = $('shopAct'); a.disabled = eq; a.classList.toggle('short', !own && wallet.coins < price);
    a.textContent = eq ? 'Equipado' : own ? 'Equipar' : wallet.coins >= price ? 'Comprar y equipar' : 'Faltan ' + (price - wallet.coins);
}
$('shopAct').addEventListener('click', shopAction);
$('shopFilt').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.f) shopS.filt = b.dataset.f; else if (b.dataset.s) shopS.sort = shopS.sort === 'std' ? 'price' : 'std';
    $('shopFilt').querySelectorAll('button[data-f]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.f === shopS.filt)));
    const sb = $('shopFilt').querySelector('button[data-s]'); sb.textContent = shopS.sort === 'price' ? 'Orden: precio' : 'Orden: normal'; sb.setAttribute('aria-pressed', String(shopS.sort === 'price'));
    sfx('tick'); renderShop();
});
$('shopTabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    shopTab = b.dataset.t; $('shopTabs').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    renderShop(); shopDemo(shopItem());
});
$('shopBtn').addEventListener('click', () => { audio(); openOverlay('shop', 'menu'); renderShop(); });
$('shopOk').addEventListener('click', () => { stopShop(); closeOverlay('shop'); });
$('garageBtn').addEventListener('click', () => { audio(); openOverlay('garage', 'menu'); selCar(cfg.car, true); startGarage(); });
$('mShow').addEventListener('click', () => $('garageBtn').click());      // la vitrina del menú también abre el garaje
// vitrina del menú: tu coche equipado, con su pintura y ruedas; solo se dibuja con el menú a la vista (unos 30 fps)
{ let lastV = 0; const vit = ts => {
    requestAnimationFrame(vit);
    if (ts - lastV < 33 || !$('menu').classList.contains('show') || document.hidden) return;
    lastV = ts;
    CARS.preview($('mCar'), cfg.car, ts / 1000, false, false, isLocked(cfg.car), { zoom: .95, paint: cfg.paint, wheelStyle: cfg.wheel, dorsal: cfg.dorsal, decal: cfg.decal });
}; requestAnimationFrame(vit); }
$('garageOk').addEventListener('click', () => closeOverlay('garage'));
$('ctrlBtn').addEventListener('click', () => { audio(); openOverlay('ctrls', 'menu'); });
$('ctrlBtn2').addEventListener('click', () => openOverlay('ctrls', 'pause'));
$('ctrlOk').addEventListener('click', () => closeOverlay('ctrls'));


// ---------- Torneo: Copa Turbo (8 equipos, eliminatoria directa) ----------
const TEAMS = {
    me: { n: 'Tú', p: 1 },
    rayo: { n: 'Rayo Norte', car: 'chispa', p: 1.0 }, toros: { n: 'Toros FC', car: 'bisonte', p: 1.05 },
    cuna: { n: 'Cuna United', car: 'cuna', p: .95 }, kaze: { n: 'Kaze Racing', car: 'kaze', p: 1.1 },
    volt: { n: 'Volt City', car: 'chispa', p: 1.0 }, dragon: { n: 'Dragones', car: 'mula', p: 1.15 },
    orbita: { n: 'Órbita', car: 'kaze', p: .9 },
    lobos: { n: 'Lobos Grises', car: 'fenix', p: 1.05 }, halcon: { n: 'Halcones', car: 'kaze', p: 1.12 },
    titan: { n: 'Titanes', car: 'titan', p: 1.2 }, aurora: { n: 'Aurora FC', car: 'cuna', p: .98 },
    cobra: { n: 'Cobras', car: 'chispa', p: 1.08 }, fantasma: { n: 'Fantasmas', car: 'prisma', p: 1.1 },
    tormenta: { n: 'Tormenta', car: 'formula', p: 1.18 }, inferno: { n: 'Inferno', car: 'fenix', p: 1.22 }
};
// estilo de juego de cada rival (modifica a la IA del nivel de la Copa)
const STYLES = { eq: 'equilibrado', agr: 'ofensivo', def: 'defensivo', aer: 'especialista en aéreos', tec: 'técnico, conduce el balón', vel: 'veloz' };
const TSTYLE = { rayo: 'eq', toros: 'agr', cuna: 'def', kaze: 'aer', volt: 'vel', dragon: 'agr', orbita: 'tec', lobos: 'def', halcon: 'aer', titan: 'agr', aurora: 'tec', cobra: 'vel', fantasma: 'aer', tormenta: 'vel', inferno: 'agr' };
function styled(c0, tag, lvl) {
    const c = Object.assign({}, c0);
    if (tag === 'agr') { if (c.bAtk) c.bAtk *= .7; c.spd *= 1.03; c.agg = (c.agg || 0) + .14; c.flipP = Math.min(1, (c.flipP || 0) + .2); }       // atacante: va a todo
    else if (tag === 'def') { if (c.bAtk) c.bAtk *= 1.5; c.react *= .85; c.agg = (c.agg || 0) - .1; c.shadow = true; }       // defensivo: espera atrás
    else if (tag === 'aer') { if (lvl >= 1) { c.aerial = true; c.aimErr = (c.aimErr || .1) * .6; } }       // aéreo
    else if (tag === 'tec') { if (lvl >= 2) { c.dribble = true; c.reset = true; c.carry = true; } c.mist = (c.mist || 0) * .6; }       // técnico: conduce el balón
    else if (tag === 'vel') { c.spd *= 1.05; c.react *= .85; }       // veloz
    return c;
}
const RIVALS = Object.keys(TEAMS).filter(k => k !== 'me');
const RN8 = ['Cuartos', 'Semifinales', 'Final'], RN16 = ['Octavos', 'Cuartos', 'Semifinales', 'Final'];
const rnA = () => (TN && TN.size === 16) ? RN16 : RN8;
const DN = ['Fácil', 'Normal', 'Difícil', 'Leyenda'];
let cups = store.get('cups', 0);
let TN = store.get('cup', null);
const tnOk = t => t && Array.isArray(t.rounds) && t.rounds.length === t.r + 1 && t.rounds[t.r].length === ((t.size || 8) / 2) >> t.r &&
    t.rounds.every(r => r.every(m => TEAMS[m.a] && TEAMS[m.b]));
if (!tnOk(TN)) TN = null;
const cupSave = () => store.set('cup', TN);
function cupPairs(ids) { const m = []; for (let i = 0; i < ids.length; i += 2) m.push({ a: ids[i], b: ids[i + 1], sa: null, sb: null, w: null }); return m; }
function cupMake() {
    const size = cfg.cupSize === 16 ? 16 : 8;
    const ids = RIVALS.slice().sort(() => Math.random() - .5).slice(0, size - 1); ids.splice(Math.floor(Math.random() * size), 0, 'me');
    TN = { size, diff: cfg.diff, r: 0, rounds: [cupPairs(ids)], out: false, champ: false, lost: -1 }; cupSave();
}
const cupLast = () => (TN.size === 16 ? 3 : 2);
const cupLevel = () => clamp(TN.diff + (TN.r === cupLast() ? 1 : TN.r === 0 ? -1 : 0), 0, TN.diff === 3 ? 3 : 2);
const cupMy = () => TN.rounds[TN.r].find(m => m.w === null && (m.a === 'me' || m.b === 'me'));
function cupSim(m) {
    const pa = TEAMS[m.a].p, pb = TEAMS[m.b].p, g = p => { let n = 0; for (let i = 0; i < 6; i++) if (Math.random() < .25 * p) n++; return n; };
    let a = g(pa), b = g(pb);
    if (a === b) { if (Math.random() < pa / (pa + pb)) a++; else b++; }
    m.sa = a; m.sb = b; m.w = a > b ? m.a : m.b;
}
function cupAdvance() {
    const R = TN.rounds[TN.r]; R.forEach(m => { if (m.w === null) cupSim(m); });
    const alive = R.some(m => m.w === 'me');
    if (!alive && !TN.out) { TN.out = true; TN.lost = TN.r; }
    if (TN.r === cupLast()) { if (alive) { TN.champ = true; cups++; store.set('cups', cups); wallet.st.cups++; if (TN.size === 16) wallet.st.cups16++; const bn = TN.size === 16 ? 500 : 250; award(bn, TN.size === 16 ? 600 : 300); if (S.rw) S.rw.push('Campeón +' + bn + ' monedas'); achCheck(); saveWallet(); } }
    else { TN.rounds.push(cupPairs(R.map(m => m.w))); TN.r++; if (TN.out) cupAdvance(); }
}
function cupResult(b, o) {
    const m = cupMy(), rival = S.cup.rival; if (!m) return;
    if (m.a === 'me') { m.sa = b; m.sb = o; } else { m.sa = o; m.sb = b; }
    m.w = b > o ? 'me' : rival;
    const rd = TN.r; cupAdvance(); cupSave();
    let title, stat;
    if (TN.champ) { title = '¡CAMPEÓN!'; stat = 'Has ganado la Copa Turbo · Copas: ' + cups; goalFx(0, cfg.boom); later(.5, () => goalFx(0, cfg.boom)); say('¡Campeón! ¡El equipo azul gana la Copa Turbo! ¡Enhorabuena, campeón!', 2, 1.1, 1.25); }
    else if (b > o) { title = 'Victoria'; stat = 'Pasas a ' + rnA()[TN.r].toLowerCase(); }
    else { title = 'Eliminado'; stat = 'Caes en ' + rnA()[rd].toLowerCase() + ' ante ' + TEAMS[rival].n; }
    $('endTitle').textContent = title; $('endStat').textContent = stat;
    $('cupNext').textContent = (TN.champ || TN.out) ? 'Ver resultado' : 'Siguiente ronda';
}
function renderCup() {
    const box = $('bracket'); box.innerHTML = '';
    const my = TN && !TN.out && !TN.champ ? cupMy() : null;
    const names = rnA(), nr = names.length, sz = TN ? TN.size || 8 : cfg.cupSize === 16 ? 16 : 8;
    box.classList.toggle('big16', (TN ? TN.size === 16 : sz === 16));
    for (let r = 0; r < (TN ? nr : (sz === 16 ? 4 : 3)); r++) {
        const col = document.createElement('div'); col.className = 'bcol';
        const h = document.createElement('h4'); h.textContent = (TN ? names : (sz === 16 ? RN16 : RN8))[r]; col.appendChild(h);
        const R = TN && TN.rounds[r];
        for (let i = 0; i < ((sz / 2) >> r); i++) {
            const m = R && R[i], el = document.createElement('div'); el.className = 'cm' + (m && m === my ? ' next' : '');
            [['a', 'sa'], ['b', 'sb']].forEach(([k, sk]) => {
                const row = document.createElement('div'), id = m && m[k];
                row.className = 'ct' + (!id ? ' tbd' : id === 'me' ? ' me' : '') + (m && m.w ? (m.w === id ? ' win' : ' lose') : '') + ((TN ? r === cupLast() : r === (sz === 16 ? 3 : 2)) && m && m.w === id && id ? ' champ' : '');
                const n = document.createElement('span'); n.textContent = id ? TEAMS[id].n : 'Por decidir';
                const sc = document.createElement('span'); sc.textContent = m && m[sk] !== null ? m[sk] : '';
                row.append(n, sc); el.appendChild(row);
            });
            col.appendChild(el);
        }
        box.appendChild(col);
    }
    const over = !TN || TN.out || TN.champ;
    $('cupGo').style.display = over ? 'none' : '';
    $('cupNew').className = over ? 'btn' : 'btn ghost';
    $('cupNew').textContent = TN ? 'Nuevo torneo' : 'Empezar torneo';
    $('cupSub').textContent = TN ? 'Dificultad ' + DN[TN.diff] + ' · ' + (TN.size || 8) + ' equipos · Copas ganadas: ' + cups : 'Copas ganadas: ' + cups;
    $('segCupBox').style.display = over ? '' : 'none'; if (segs.cupSize) segs.cupSize();
    if (!TN) $('cupNote').textContent = (cfg.cupSize === 16 ? 'Dieciséis equipos' : 'Ocho equipos') + ', eliminatoria directa. Si hay empate, gol de oro. Los rivales se endurecen en cada ronda.';
    else if (TN.champ) $('cupNote').textContent = '¡Eres el campeón de la Copa Turbo!';
    else if (TN.out) $('cupNote').textContent = 'Has caído en ' + rnA()[TN.lost].toLowerCase() + '. Empieza un torneo nuevo para intentarlo otra vez.';
    else { const rv = my.a === 'me' ? my.b : my.a; $('cupGo').textContent = 'Jugar ' + rnA()[TN.r].toLowerCase(); $('cupNote').textContent = rnA()[TN.r] + ': tu rival es ' + TEAMS[rv].n + ' (juego ' + STYLES[TSTYLE[rv] || 'eq'] + ')' + '. El torneo se guarda solo; puedes salir y seguir luego.'; }
}
function openCup() { audio(); openOverlay('cup', 'menu'); renderCup(); }
$('cupBtn').addEventListener('click', openCup);
$('cupOk').addEventListener('click', () => closeOverlay('cup'));
$('cupNew').addEventListener('click', () => { audio(); cupMake(); renderCup(); sfx('click'); const f = $('cupGo'); if (f.offsetParent) padSetFocus(f); });
$('cupGo').addEventListener('click', () => {
    const m = TN && cupMy(); if (!m) return;
    $('cup').classList.remove('show'); overlayFrom = null;
    startMatch('match', { rival: m.a === 'me' ? m.b : m.a, lvl: cupLevel(), round: TN.r });
});
$('cupNext').addEventListener('click', () => { toMenu(); openCup(); });

$('playBtn').addEventListener('click', () => startMatch('match'));
$('v2Btn').addEventListener('click', () => startMatch('match', null, true));
$('freeBtn').addEventListener('click', () => { audio(); openOverlay('train', 'menu'); renderTrain(); });
$('trOk').addEventListener('click', () => closeOverlay('train'));
$('train').addEventListener('click', e => {
    const b = e.target.closest('.trc'); if (!b) return;
    $('train').classList.remove('show'); overlayFrom = null;
    if (b.dataset.d === 'free') startMatch('free'); else startDrill(b.dataset.d);
});
$('pauseBtn').addEventListener('click', () => { audio(); pause(); });
$('resumeBtn').addEventListener('click', resume);
$('restartBtn').addEventListener('click', () => S.mode === 'drill' ? startDrill(S.drill.type) : startMatch(S.mode, S.cup));
$('quitBtn').addEventListener('click', toMenu);
$('againBtn').addEventListener('click', () => S.net ? netAgain() : S.mode === 'drill' ? startDrill(S.drill.type) : startMatch(S.mode, null, S.v2));
$('menuBtn').addEventListener('click', toMenu);

const muteBtn = $('muteBtn');
const paintMute = () => { muteBtn.setAttribute('aria-pressed', String(cfg.mute)); muteBtn.style.opacity = cfg.mute ? 0.5 : 1; };
muteBtn.addEventListener('click', () => { audio(); cfg.mute = !cfg.mute; if (cfg.mute) stopSpeech(); store.set('mute', cfg.mute); paintMute(); });
paintMute();
$('fsBtn').addEventListener('click', () => {
    try {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen().then(() => { try { screen.orientation.lock('landscape').catch(() => { }); } catch (e) { /* sin bloqueo */ } }).catch(() => { });
    } catch (e) { /* sin pantalla completa */ }
});

