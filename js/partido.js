'use strict';
/* Turbo Gol Arena · Partido: estado, inicio y final, efectos, marcador, simulación, repetición de goles, retos de entrenamiento y sucesos del motor.
   Los archivos de js/ se cargan en orden y comparten el ámbito global (antes eran un solo game.js). */
// ---------- Estado de partida ----------
const S = {
    state: 'menu', prev: 'menu', mode: 'match', world: T.makeWorld(), ai: null, ai0: null,
    score: [0, 0], time: 120, ot: false, cd: 0, goalT: 0, slow: 1, acc: 0, endAfterGoal: false, goHold: 0,
    lastTouch: -1, punch: 0, flash: 0, goalX: 0, goalCol: 'blue'
};
const pInp = { dir: 0, pitch: 0, jump: false, boost: false };
const touch = { dir: 0, pitch: 0, b: false, b2: false };
const kb = { l: false, r: false, b: false, u: false, d: false, roll: false };

function setState(s) {
    S.state = s; if (s === 'count' || s === 'menu') RC.n = 0; document.body.dataset.st = s;
    app.dataset.state = (s === 'count' || s === 'play' || s === 'goal') ? 'play' : s;
    $('menu').classList.toggle('show', s === 'menu');
    $('pause').classList.toggle('show', s === 'pause');
    $('end').classList.toggle('show', s === 'end');
    if (s !== 'play' && s !== 'goal' && s !== 'count') releaseStick();
}

const MUT_N = { giant: 'balón gigante', lowG: 'gravedad baja', inf: 'turbo infinito', fast: 'balón rápido', two: 'dos balones' };
function applyMut(m) {
    T.setMut(m);
    const w = S.world;
    w.ball2 = T.MUT.two ? { x: W / 2, y: H - 460, vx: 0, vy: 0, rot: 0, w: 0, cAge: 99, cx: 0, cy: 0 } : null;
}
// mundo de 2 coches (1 contra 1) o 4 coches (2 contra 2)
function setWorld(n) { if (S.world.cars.length !== n) { S.world = T.makeWorld(n); RC.n = 0; } }
function startMatch(mode, cup, v2) {
    S.tuto = null; $('drillBar').classList.remove('tuto');
    audio();
    if (S.net && S.net.stad) { cfg.stad = S.net.stad; resize(); }      // online: el estadio que ha elegido (o sorteado) el anfitrión
    else if (cfg.stadSel === 'random') { cfg.stad = pickStad(); resize(); }      // estadio nuevo en cada partida
    S.v2 = !!v2 && !cup && mode === 'match'; setWorld(S.v2 ? 4 : 2);
    S.mode = mode; S.cup = cup || null; S.world.cars[1].ghost = false;
    S.score = [0, 0]; S.time = cfg.time; S.ot = false; S.endAfterGoal = false; S.slow = 1; S.acc = 0;
    S.lastTouch = -1; S.flash = 0; S.punch = 0; S.minDiff = 0; S.streak = 0; S.lastScorer = -1; Cm.half = Cm.s30 = Cm.nil = false; for (const k in reactT) delete reactT[k];
    const NT = S.net;      // partido online: el coche 1 lo lleva el amigo, no la IA
    S.ai = T.makeAI(cup ? cup.lvl : cfg.diff); if (NT) S.time = NT.time;
    if (cup) S.ai.cfg = styled(S.ai.cfg, TSTYLE[cup.rival] || 'eq', cup.lvl);
    // en la Copa, el rival conoce tus costumbres de los partidos anteriores
    if (cup && TN && TN.prof && S.ai.cfg.learn) { S.ai.prof = Object.assign({}, TN.prof, { t: 0, koT: -1, lastTouch: -9, prior: true }); if (S.ai.cfg.learn >= .5) setTimeout(() => { if (S.state !== 'menu') qToast('🧠 El rival ha estudiado tus partidos anteriores', '#ffd23f'); }, 4200); }
    applyMut(cup ? {} : NT ? NT.mut : cfg.mut);
    T.applyType(S.world.cars[0], S.tryCar || cfg.car); T.applyType(S.world.cars[1], cup ? TEAMS[cup.rival].car : NT ? NT.rivalCar : pickAI());
    S.ai.watch = S.world.cars[0]; S.lastTouchPid = -1;
    if (S.v2) {      // tu compañero (azul) y el segundo rival (naranja)
        T.applyType(S.world.cars[2], pickAI()); T.applyType(S.world.cars[3], pickAI());
        S.mate = T.makeAI(Math.max(1, cfg.diff)); S.mate.mateHuman = true; S.mate.cfg = Object.assign({}, S.mate.cfg, { learn: 0, lazy: 0 });
        S.ai3 = T.makeAI(cfg.diff); S.ai3.watch = S.world.cars[0]; S.ai.prof = S.ai.prof || T.newProf(); S.ai3.prof = S.ai.prof; S.ai3.profRO = true;      // los dos rivales comparten lo que aprenden de ti
        S.bub = [];
    } else { S.mate = null; S.ai3 = null; }
    T.kickoff(S.world);
    S.world.cars[0].spd = 1; Cm.said10 = false;
    $('names').innerHTML = '<b>Tú</b><b></b>'; $('names').lastChild.textContent = cup ? TEAMS[cup.rival].n : 'IA';
    if (S.v2) $('names').innerHTML = '<b>Tú + IA</b><b>IA ×2</b>';
    if (NT) { $('names').lastChild.textContent = 'Amigo'; netReset(); }
    if (cup) say('¡' + rnA()[cup.round] + ' de la Copa Turbo! Azul contra ' + TEAMS[cup.rival].n + '. ¡Que empiece!', 2, 1.08, 1.1); else
    say(mode === 'free' ? 'Entrenamiento libre. ¡A practicar!' : pick(['¡Comienza el partido! ¡Que ruede el balón!', '¡Arranca el encuentro! ¡Suerte, azul!', '¡Bienvenidos a Turbo Gol Arena! ¡Empieza el partido!']), 2, 1.08, 1.1);
    if (mode === 'free') { S.world.cars[1].x = W * 0.9; }
    { const on = Object.keys(MUT_N).filter(k => T.MUT[k]); if (on.length) setTimeout(() => say('Mutadores activos: ' + on.map(k => MUT_N[k]).join(', ') + '.', 1, 1.05, 1.1), 1800); }
    parts.length = 0; trail.length = 0; rings.length = 0; timers.length = 0; bolts.length = 0;
    setState('count'); S.cd = 3.0; lastCd = 4;
    app.classList.remove('wipe'); void app.offsetWidth; app.classList.add('wipe');      // barrido de luz al empezar
    hideBanner(); updateHud(true); requestWake();
}

function toMenu() {
    if (S.net) netLeave();
    S.tuto = null; $('drillBar').classList.remove('tuto');
    $('pause').classList.remove('show');
    setWorld(2); S.v2 = false; S.mate = null; S.ai3 = null;
    S.cup = null; S.tryCar = null; S.world.cars[1].ghost = false; $('names').innerHTML = '<b>Tú</b><b>IA</b>';
    S.ai0 = T.makeAI(1); S.ai = T.makeAI(1); applyMut({});
    T.applyType(S.world.cars[0], cfg.car); T.applyType(S.world.cars[1], pickAI());
    T.kickoff(S.world); S.world.cars[0].spd = 1;
    hideBanner(); $('count').classList.remove('show');
    setState('menu'); renderStats(); saveWallet();
}

function endMatch() {
    const b = S.score[0], o = S.score[1];
    if (S.cup && TN && S.ai && S.ai.prof && !(b === o)) {      // guarda lo aprendido (con algo de olvido) para el siguiente partido de la Copa
        const p = S.ai.prof, k = .7, q = {};
        for (const f of ['touches', 'air', 'far', 'ko', 'koRush', 'back', 'backT', 'chal', 'chalN']) q[f] = (p[f] || 0) * k;
        q.said = p.said || {}; TN.prof = q; cupSave();
    }
    if (S.cup && b === o) {
        S.ot = true; S.time = 0; jMsg('GOL DE ORO', '#ffd23f', 3); T.kickoff(S.world); setState('count'); S.cd = 3; lastCd = 4; updateHud(true);
        say('¡Empate! ¡Gol de oro! ¡En el torneo alguien tiene que pasar!', 2, 1.12, 1.2); showBanner('GOL DE ORO<small>EL PRÓXIMO GOL GANA</small>', GOLD); sfx('go'); setTimeout(hideBanner, 2200);
        return;
    }
    if (S.net) { netEnd(); $('pause').classList.remove('show'); }
    const xp0 = wallet.xp, L0 = lvlOf(xp0);
    setState('end'); S.rw = [];
    $('againBtn').style.display = S.cup ? 'none' : ''; $('cupNext').style.display = S.cup ? '' : 'none';
    $('endB').textContent = b; $('endO').textContent = o;
    let title = 'Empate';
    if (b > o) { title = 'Victoria'; record.w++; } else if (b < o) { title = 'Derrota'; record.l++; }
    store.set('record', record);
    $('endTitle').textContent = title;
    $('endStat').textContent = 'Balance total: ' + record.w + ' victorias, ' + record.l + ' derrotas';
    sfx('end'); if (S.mode === 'match') commentEnd(b, o);
    if (S.mode === 'match') matchRewards(b, o);
    if (S.cup) cupResult(b, o);
    $('endCoins').innerHTML = S.mode === 'match' ? S.rw.map(t => '<span>' + t + '</span>').join('') : '';
    if (S.mode === 'match') {
        const L1 = lvlOf(wallet.xp), a = lvlStart(L1), bnd = lvlStart(L1 + 1), p1 = clamp((wallet.xp - a) / (bnd - a), 0, 1);
        const p0 = L1 === L0 ? clamp((xp0 - a) / (bnd - a), 0, 1) : 0;
        $('endLvl').innerHTML = '<div><span>Nivel ' + L1 + '</span><span>' + (wallet.xp - a) + ' / ' + (bnd - a) + ' XP</span></div><div class="pbar"><i style="width:' + (p0 * 100) + '%"></i></div>';
        const bar = $('endLvl').querySelector('i'); void bar.offsetWidth; setTimeout(() => { bar.style.width = (p1 * 100) + '%'; }, 250);
    } else $('endLvl').innerHTML = '';
    saveWallet();
    endFx(b > o ? 'win' : b < o ? 'lose' : 'draw', b, o);
}
// pantalla final con vida: color según el resultado, marcador que cuenta hacia arriba, premios que entran
// uno a uno y tu coche celebrando (o lamentándose) en su vitrina
let endRaf = 0;
function endFx(res, b, o) {
    const card = $('endCard'); card.dataset.res = res;
    card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
    $('endCoins').querySelectorAll('span').forEach((s, i) => { s.style.animationDelay = (.55 + i * .16) + 's'; });
    const t0 = performance.now(), cnt = (el, v) => { el.textContent = Math.round(v); };
    const tick = now => {
        const k = clamp((now - t0 - 250) / 650, 0, 1), e = 1 - Math.pow(1 - k, 3);
        cnt($('endB'), b * e); cnt($('endO'), o * e);
        if (S.state !== 'end') { cancelAnimationFrame(endRaf); endRaf = 0; return; }
        const mood = res === 'win' ? 'win' : res === 'lose' ? 'lose' : '';
        CARS.preview($('endCar'), S.tryCar || cfg.car, now / 1000, res === 'win', false, isLocked(S.tryCar || cfg.car), { zoom: .9, mood, paint: cfg.paint, wheelStyle: cfg.wheel, dorsal: cfg.dorsal, decal: cfg.decal });
        endRaf = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(endRaf); endRaf = requestAnimationFrame(tick);
}

function evGoal() {
    if (!evReal()) return;
    const all = store.get('evp', {}), k = evKey(), p = all[k] || { g: 0, done: false }, e = EVENTS[EV];
    if (p.done) return;
    p.g++; all[k] = p;
    if (p.g >= EV_GOALS) {
        p.done = true; const tid = 'ev_' + EV, tn = (CARS.TRAILS.find(t => t.id === tid) || {}).name || '';
        wallet.coins += EV_COINS; wallet.st.earned += EV_COINS; if (!wallet.owned.trail.includes(tid)) wallet.owned.trail.push(tid); saveWallet();
        qToast(e.ic + ' ¡Reto de ' + e.n + ' completado! +' + EV_COINS + ' monedas y estela «' + tn + '»', e.col); sfx('unlock');
    } else qToast(e.ic + ' Reto de ' + e.n + ': ' + p.g + '/' + EV_GOALS + ' goles', e.col);
    store.set('evp', all);
}
function renderStats() {
    const L = lvlOf(wallet.xp), a = lvlStart(L), bnd = lvlStart(L + 1);
    $('pLvl').textContent = 'Nivel ' + L; $('pCoins').textContent = wallet.coins.toLocaleString('es-ES'); $('pCoins').title = wallet.coins + ' monedas'; evUI(); dailyUI(); tutoMenu();
    { const inf = CARS.LIST.find(c => c.id === cfg.car); $('mCarName').textContent = inf ? inf.name : ''; }
    $('pBar').style.width = (clamp((wallet.xp - a) / (bnd - a), 0, 1) * 100).toFixed(0) + '%';
    $('pXp').textContent = (wallet.xp - a) + ' / ' + (bnd - a) + ' XP para el nivel ' + (L + 1);
    const mu = Object.keys(MUT_N).filter(k => cfg.mut[k]);
    $('cfgSum').innerHTML = '<span>' + DN[cfg.diff] + '</span><span>' + Math.round(cfg.time / 60) + ' min</span>' + mu.map(k => '<span class="mu">' + MUT_N[k] + '</span>').join('');
    // historial en etiquetas: victorias, derrotas y racha
    const stk = (wallet.st && wallet.st.streak) || 0;
    $('stats').innerHTML = (record.w + record.l) ? '<span class="w">' + record.w + ' victorias</span><span class="l">' + record.l + ' derrotas</span>' + (stk >= 2 ? '<span class="r">🔥 ' + stk + ' seguidas</span>' : '') : '<span>Primer partido: ¡suerte!</span>';
}

// online el partido no se puede parar: la pausa solo abre el menú encima mientras sigue el juego
function pause() { if (S.net) { if (S.state !== 'end') $('pause').classList.add('show'); return; } if (S.state === 'play' || S.state === 'count' || S.state === 'goal') { S.prev = S.state; setState('pause'); stopSpeech(); } }
function resume() { if (S.net) { $('pause').classList.remove('show'); return; } if (S.state === 'pause') { setState(S.prev); } }

// ---------- Efectos: partículas con brillo, ondas y destellos ----------
const parts = [], trail = [], rings = [], flashes = [];
const spr = {};
function glow(name) {
    if (spr[name]) return spr[name];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), p = PAL[name].join(',');
    if (name.indexOf('heart') === 0) {
        g.fillStyle = 'rgb(' + p + ')'; g.beginPath(); g.moveTo(32, 54); g.bezierCurveTo(2, 34, 6, 8, 24, 10); g.bezierCurveTo(30, 10, 32, 16, 32, 18);
        g.bezierCurveTo(32, 16, 34, 10, 40, 10); g.bezierCurveTo(58, 8, 62, 34, 32, 54); g.fill();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(21, 20, 5, 3, -.7, 0, 6.3); g.fill();
        spr[name] = c; return c;
    }
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.18, 'rgba(' + p + ',.95)');
    gr.addColorStop(.5, 'rgba(' + p + ',.34)'); gr.addColorStop(1, 'rgba(' + p + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    spr[name] = c; return c;
}
function emit(x, y, vx, vy, life, size, pal, grav, add) {
    if (parts.length >= Q.maxP) parts.shift();
    parts.push({ x, y, vx, vy, l: life, m: life, s: size, pal, g: grav || 0, add: add !== false });
}
function burst(x, y, n, speed, pal, size, life, add) {
    n = Math.round(n * (Q.pm || 1));
    for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, s = speed * (0.3 + Math.random() * 0.7);
        emit(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.4), size * (0.6 + Math.random() * 0.8), pal, 500, add);
    }
}
function ring(x, y, pal, vr, life, w) { rings.push({ x, y, r: 12, vr, l: life, m: life, pal, w: w || 6 }); }
let shake = 0, flickHeld = false;

// ---------- Combos: air dribble y flip reset ----------
const comboEl = $('combo'); let comboTm = 0;
function showCombo(txt, col) {
    comboEl.textContent = txt; comboEl.style.color = col || '#fff';
    comboEl.classList.remove('show'); void comboEl.offsetWidth; comboEl.classList.add('show');
    clearTimeout(comboTm); comboTm = setTimeout(() => comboEl.classList.remove('show'), 1500);
}
function airTouch() {
    const now = performance.now();
    S.airN = (now - (S.airTt || 0) < 1700) ? (S.airN || 0) + 1 : 1; S.airTt = now;
    if (S.airN >= 2) {
        showCombo('AIR DRIBBLE ×' + S.airN, S.airN >= 5 ? '#ff4fd8' : S.airN >= 3 ? '#ffd23f' : '#3db8ff');
        sfx('tap', Math.min(4, S.airN - 1));
        if (S.airN === 3) say(pick(['¡Air dribble!', '¡Qué control en el aire!', '¡Lo lleva por el aire!']), 1, 1.18, 1.25);
        else if (S.airN === 5) say('¡Increíble! ¡Cinco toques en el aire!', 2, 1.15, 1.3);
    }
}
// ---------- Banner y cuenta atrás ----------
const banner = $('banner'), countEl = $('count');
const CDC = { 3: '#3db8ff', 2: '#ff8a2b', 1: '#ffd23f' };
function showBanner(html, color, cls) { banner.className = cls || ''; banner.innerHTML = html; banner.style.color = color || '#fff'; banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show'); }
function hideBanner() { banner.classList.remove('show'); }
let lastCd = 4;

// ---------- Marcador ----------
const hudCache = { sb: -1, so: -1, clock: '' };
function fmt(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function updateHud(force) {
    // al cambiar el marcador (no al reiniciarlo) el número da un golpe
    const bump = el => { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };
    if (force || hudCache.sb !== S.score[0]) { $('sb').textContent = S.score[0]; if (!force && S.score[0] > hudCache.sb) bump($('sb')); hudCache.sb = S.score[0]; }
    if (force || hudCache.so !== S.score[1]) { $('so').textContent = S.score[1]; if (!force && S.score[1] > hudCache.so) bump($('so')); hudCache.so = S.score[1]; }
    const clock = $('clock');
    const txt = S.mode === 'free' ? 'LIBRE' : S.mode === 'drill' ? 'RETO' : (S.ot ? 'ORO' : fmt(S.time));
    if (force || hudCache.clock !== txt) {
        clock.textContent = txt; hudCache.clock = txt;
        clock.classList.toggle('ot', S.ot);
        clock.classList.toggle('low', S.mode === 'match' && !S.ot && S.time <= 10);
    }
    const solo = S.mode === 'free' || S.mode === 'drill';
    $('names').style.visibility = solo ? 'hidden' : 'visible';
    $('so').style.display = solo ? 'none' : '';
    $('drillBar').style.display = (S.mode === 'drill' || S.tuto) && S.state !== 'menu' ? 'block' : 'none';
}

// ---------- Simulación ----------
const STEP = 1 / 120;
// ---------- Repetición de goles ----------
// Se graba la física a 60 Hz en un buffer circular (últimos ~6 s). Tras el gol se reproduce a cámara lenta y luego se restaura el estado real.
const RC = { N: 360, K: 86, buf: new Float32Array(360 * 86), head: 0, n: 0, step: 0 };       // K: hasta 4 coches × 18 + 2 balones × 7
const CF = ['x', 'y', 'a', 'f', 'vx', 'vy', 'w', 'roll', 'grounded', 'boosting', 'flipT', 'airT', 'nx', 'ny', 'wheel', 'boost', 'used', 'rw'];
const BF = ['x', 'y', 'vx', 'vy', 'rot', 'w'];
function recSnap(w) {
    if (RC.step++ & 1) return;
    let k = RC.head * RC.K; const b = RC.buf;
    for (const c of w.cars) for (const f of CF) b[k++] = +c[f];
    for (const ball of [w.ball, w.ball2]) { if (ball) { for (const f of BF) b[k++] = ball[f]; b[k++] = 1; } else { for (let i = 0; i < 7; i++) b[k++] = 0; } }
    RC.head = (RC.head + 1) % RC.N; if (RC.n < RC.N) RC.n++;
}
function startReplay(after) {
    const w = S.world, n = Math.min(RC.n, 300);
    const rows = [];
    for (let j = 0; j < n; j++) rows.push(((RC.head - n + j) % RC.N + RC.N) % RC.N);
    S.rp = { rows, i: 0, after, save: { cars: w.cars.map(c => Object.assign({}, c)), ball: Object.assign({}, w.ball), ball2: w.ball2 ? Object.assign({}, w.ball2) : null } };
    parts.length = 0; trail.length = 0; rings.length = 0; timers.length = 0; bolts.length = 0; stopSpeech();
    setState('replay'); sfx('go');
}
function endReplay() {
    const rp = S.rp; if (!rp) return; S.rp = null;
    const w = S.world;
    w.cars.forEach((c, i) => { Object.assign(c, rp.save.cars[i]); c.px = c.x; c.py = c.y; c.pa = c.a; });
    Object.assign(w.ball, rp.save.ball); if (w.ball2 && rp.save.ball2) Object.assign(w.ball2, rp.save.ball2);
    parts.length = 0; trail.length = 0; rings.length = 0; timers.length = 0; bolts.length = 0;
    S.acc = 0; S.slow = 1; S.alpha = 1; hideBanner();
    rp.after();
}
function skipReplay() { if (S.state === 'replay') endReplay(); }
function replayStep(dt) {
    const rp = S.rp, w = S.world; if (!rp) { setState('goal'); return; }
    const n = rp.rows.length;
    if (n < 2) { endReplay(); return; }
    const sp = rp.i > n - 75 ? 0.3 : 0.7;      // el último segundo y pico (el remate) va más lento
    rp.i += dt * 60 * sp;
    if (rp.i >= n - 1) { endReplay(); return; }
    const i0 = rp.i | 0, fr = rp.i - i0, B = RC.buf, o0 = rp.rows[i0] * RC.K, o1 = rp.rows[i0 + 1] * RC.K;
    let k = 0;
    for (const c of w.cars) for (const f of CF) {
        const a = B[o0 + k], b = B[o1 + k]; k++;
        if (f === 'a') { let d = b - a; d -= TAU * Math.round(d / TAU); c[f] = a + d * fr; }
        else if (f === 'grounded' || f === 'boosting') c[f] = a > 0.5;
        else if (f === 'f' || f === 'used' || f === 'flipT') c[f] = a;
        else c[f] = a + (b - a) * fr;
        if (f === 'a') c.pa = c[f];
    }
    for (const ball of [w.ball, w.ball2]) {
        const present = B[o0 + k + 6] > 0.5;
        if (ball && present) for (let q = 0; q < 6; q++) { const a = B[o0 + k + q], b = B[o1 + k + q]; ball[BF[q]] = a + (b - a) * fr; }
        k += 7;
    }
    for (const c of w.cars) { c.px = c.x; c.py = c.y; c.spdv = Math.hypot(c.vx, c.vy); c.brake = false; }
    w.ball.px = w.ball.x; w.ball.py = w.ball.y; if (w.ball2) { w.ball2.px = w.ball2.x; w.ball2.py = w.ball2.y; }
    if (!rp.boomed) { const bb = w.ball; if (bb.x > W + T.BALL_R * .6 || bb.x < -T.BALL_R * .6) { rp.boomed = true; const sc = bb.x > W / 2 ? 0 : 1; goalFx(sc, sc === 0 ? cfg.boom : 'classic', bb.x, bb.y); } }
    S.alpha = 1;
}
// ---------- Tutorial: lo básico paso a paso en el modo libre ----------
const TUTO = [
    { id: 'move', pc: 'Conduce con A / D o las flechas ← →', pad: 'Conduce con el stick izquierdo', touch: 'Conduce con el joystick: izquierda y derecha', say: 'Primero, conduce a un lado y a otro.' },
    { id: 'jump', pc: 'Salta con Espacio', pad: 'Salta con el botón A', touch: 'Salta con el botón de salto', say: 'Ahora, salta.' },
    { id: 'boost', pc: 'Mantén Mayús para usar el turbo', pad: 'Mantén B o RT para usar el turbo', touch: 'Mantén pulsado el botón de turbo', say: 'Usa el turbo para ir más rápido.' },
    { id: 'dodge', all: 'Salta y, en el aire, vuelve a saltar con dirección: ¡voltereta!', say: 'Salta dos veces con dirección para dar una voltereta.' },
    { id: 'hit', all: 'Ve a por el balón y dale un buen golpe', say: 'Ve a por el balón y golpéalo.' },
    { id: 'goal', all: '¡Marca gol en la portería naranja, a la derecha!', say: 'Por último, ¡marca un gol!' }
];
function startTuto() {
    startMatch('free');
    S.tuto = { i: 0, acc: 0, x: S.world.cars[0].x, bt: 0, ok: 0 };
    $('drillBar').classList.add('tuto'); $('drillBar').style.display = 'block'; tutoShow();
}
function tutoShow() {
    const U = S.tuto, s = TUTO[U.i], dev = pad.on ? 'pad' : cfg.dev === 'pc' ? 'pc' : 'touch';
    $('drillBar').textContent = 'Tutorial ' + (U.i + 1) + '/' + TUTO.length + '  ·  ' + (s.all || s[dev]);
    setTimeout(() => { if (S.tuto === U) say(s.say, 2, 1.05, 1.1); }, U.i ? 700 : 1800);
}
function tutoDo(id) {
    const U = S.tuto; if (!U || U.ok > 0 || TUTO[U.i].id !== id) return;
    U.ok = 0.8; sfx('cling'); showCombo('¡BIEN!', '#3dffb0');      // pequeña pausa antes del siguiente paso
}
function tutoTick(dt) {
    const U = S.tuto, c = S.world.cars[0];
    if (U.ok > 0) {
        U.ok -= dt; if (U.ok > 0) return;
        U.ok = 0; U.i++;
        if (U.i < TUTO.length) { tutoShow(); return; }
        S.tuto = null; $('drillBar').classList.remove('tuto'); $('drillBar').style.display = 'none';
        say('¡Tutorial completado! Ya estás listo para jugar.', 2, 1.1, 1.2); jMsg('¡TUTORIAL COMPLETADO!', '#3dffb0', 2.6);
        if (!store.get('tutoDone', false)) { store.set('tutoDone', true); award(100, 60); saveWallet(); qToast('Tutorial completado  +100 monedas', '#ffd23f'); }
        return;
    }
    const s = TUTO[U.i].id;
    if (s === 'move') { U.acc += Math.abs(c.x - U.x); if (U.acc > 520) tutoDo('move'); }
    else if (s === 'boost') { if (c.boosting) U.bt += dt; if (U.bt > 0.6) tutoDo('boost'); if (c.boost < 20) c.boost = 100; }
    U.x = c.x;
}
function tutoEvents(ev) {
    for (const e of ev) {
        if (e[0] === 'jump' && e[4] === 0) tutoDo('jump');
        else if (e[0] === 'dodge' && e[4] === 0) tutoDo('dodge');
        else if (e[0] === 'hit' && e[5] === 0) tutoDo('hit');
    }
}
function tutoMenu() { const b = $('tutoBtn'); if (b) b.hidden = store.get('tutoDone', false) || wallet.st.matches >= 3; }

// ---------- Retos de entrenamiento ----------
const drillBest = store.get('drills', {});
const DRILLS = {
    shoot: { name: 'Tiros a portería', tries: 6, max: 6, secs: 7, stars: [3, 5, 6], say: 'Tiros a portería. Seis tiros, ¡marca los que puedas!', info: 'Seis tiros con el balón rodando. Marca todos los que puedas.' },
    air: { name: 'Aéreos', tries: 6, max: 6, secs: 9, stars: [1, 2, 4], say: 'Reto de aéreos. El balón sale volando, ¡salta y remata!', info: 'El balón sube por los aires. Salta, usa el turbo y remata.' },
    save: { name: 'Paradas', tries: 8, max: 8, secs: 4.5, stars: [4, 6, 8], say: 'Reto de paradas. Defiende tu portería.', info: 'Disparos a tu portería, cada vez más rápidos. Para todos los que puedas.' },
    prec: { name: 'Precisión', tries: 6, max: 12, secs: 8, stars: [5, 8, 11], say: 'Reto de precisión. Apunta al objetivo dorado.', info: 'Marca dentro del círculo dorado: 2 puntos. Gol fuera del círculo: 1 punto.' }
};
const dstars = D => D.def.stars.filter(v => D.pts >= v).length;
function drillHud() {
    const D = S.drill; if (!D) return;
    const left = Math.max(0, D.def.secs - D.t);
    const txt = D.def.name + '  ·  Intento ' + Math.min(D.n + 1, D.def.tries) + '/' + D.def.tries + '  ·  ' + (D.type === 'save' ? 'Paradas ' : D.type === 'prec' ? 'Puntos ' : 'Goles ') + D.pts + (D.wait > 0 ? '' : '  ·  ' + left.toFixed(1) + ' s');
    if (txt !== D.txt) { D.txt = txt; $('drillBar').textContent = txt; }
    if (hudCache.sb !== D.pts) { $('sb').textContent = D.pts; hudCache.sb = D.pts; }
}
function drillSetup() {
    const w = S.world, D = S.drill, c = w.cars[0], b = w.ball, R = T.BALL_R, rnd = (a, z) => a + Math.random() * (z - a);
    T.kickoff(w); c.boost = c.st.boostMax; w.cars[1].x = W * 0.5; w.cars[1].ghost = true;
    D.t = 0; D.wait = 0; D.target = null; D.touched = false;
    b.vx = b.vy = b.w = 0;
    if (D.type === 'shoot' || D.type === 'prec') {
        c.x = W * 0.2 + rnd(-40, 60); b.x = rnd(520, 920); b.y = H - R - 2; b.vx = rnd(-120, 60);
        if (D.type === 'prec') D.target = { y: rnd(H - T.GH + 70, H - 70) };
    } else if (D.type === 'air') {
        c.x = W * 0.2 + rnd(-40, 60); b.x = rnd(620, 950); b.y = H - 140; b.vy = -rnd(720, 840); b.vx = rnd(-60, 60);
    } else if (D.type === 'save') {
        c.x = W * 0.16; b.x = W * 0.62; b.y = rnd(H - 330, H - 90);
        const sp = 560 + D.n * 55, ty = rnd(H - T.GH + 40, H - 40), t = (b.x + 20) / sp;
        b.vx = -sp; b.vy = (ty - b.y - 0.5 * 720 * t * t) / t;
    }
    drillHud();
}
function startDrill(type) {
    audio();
    setWorld(2); S.v2 = false; S.mate = null; S.ai3 = null;
    S.mode = 'drill'; S.cup = null; S.tryCar = null; applyMut({});
    S.score = [0, 0]; S.time = 0; S.ot = false; S.endAfterGoal = false; S.slow = 1; S.acc = 0; S.lastTouch = -1; S.flash = 0; S.punch = 0;
    S.ai = T.makeAI(1);
    T.applyType(S.world.cars[0], cfg.car); T.applyType(S.world.cars[1], pickAI());
    S.world.cars[0].spd = 1; Cm.said10 = false;
    S.drill = { type, def: DRILLS[type], n: 0, pts: 0, ok: 0, t: 0, wait: 0, target: null, txt: '' };
    parts.length = 0; trail.length = 0; rings.length = 0; timers.length = 0; bolts.length = 0;
    drillSetup(); say(S.drill.def.say, 2, 1.05, 1.1);
    setState('count'); S.cd = 3.0; lastCd = 4; hideBanner(); updateHud(true); requestWake();
}
function drillFinish(ok, pts, msg, col) {
    const D = S.drill; D.pts += pts; if (ok) D.ok++; D.wait = 1.15;
    showBanner(msg, col || (ok ? '#3dffb0' : '#ff8a2b')); sfx(ok ? 'goal' : 'wall');
    if (ok && D.type !== 'save') { goalFx(0, cfg.boom); }
    drillHud();
}
function drillGoal(r) {
    const D = S.drill, b = S.world.ball; if (!D || D.wait > 0) return;
    if (D.type === 'save') { if (r === 1) drillFinish(false, 0, '¡Gol en contra!<small>NO LLEGASTE</small>'); return; }
    if (r === 1) { drillFinish(false, 0, 'En propia puerta'); return; }
    if (D.type === 'prec' && D.target) {
        const hit = Math.abs(b.y - D.target.y) <= 50;
        drillFinish(true, hit ? 2 : 1, hit ? '¡DIANA!<small>+2 PUNTOS</small>' : '¡Gol!<small>FUERA DEL CÍRCULO · +1</small>', hit ? '#ffd23f' : '#3db8ff');
    } else drillFinish(true, 1, '¡GOL!');
}
function drillTick(dt) {
    const D = S.drill, b = S.world.ball; if (!D) return;
    if (D.wait > 0) {
        D.wait -= dt;
        if (D.wait <= 0) { hideBanner(); D.n++; if (D.n >= D.def.tries) endDrill(); else drillSetup(); }
        return;
    }
    D.t += dt;
    if (D.type === 'save') {
        const sp = Math.hypot(b.vx, b.vy);
        if (D.t > .5 && b.vx > 120 && b.x > 140) { drillFinish(true, 1, '¡PARADA!', '#3dffb0'); return; }
        if (D.t >= D.def.secs) { drillFinish(true, 1, '¡PARADA!', '#3dffb0'); return; }
    } else if (D.t >= D.def.secs) drillFinish(false, 0, 'Se acabó el tiempo');
    drillHud();
}
function endDrill() {
    const D = S.drill, st = dstars(D), prev = drillBest[D.type] || 0;
    drillBest[D.type] = Math.max(prev, st); store.set('drills', drillBest);
    setState('end'); S.rw = [];
    $('againBtn').style.display = ''; $('cupNext').style.display = 'none';
    $('endB').textContent = D.pts; $('endO').textContent = D.def.max;
    $('endTitle').textContent = st >= 3 ? '¡Reto perfecto!' : st >= 1 ? 'Reto superado' : 'Inténtalo otra vez';
    $('endStat').textContent = D.def.name + '  ·  ' + '★'.repeat(st) + '☆'.repeat(3 - st) + (st > prev ? '  ·  ¡Nueva mejor marca!' : '');
    const coins = st * 15 + (st > prev ? (st - prev) * 30 : 0), xp = 30 + 20 * st;
    S.rw = ['+' + coins + ' monedas', '+' + xp + ' XP'];
    award(coins, xp); achCheck(); saveWallet();
    $('endCoins').innerHTML = S.rw.map(t => '<span>' + t + '</span>').join(''); $('endLvl').innerHTML = '';
    sfx('end'); hideBanner(); $('drillBar').style.display = 'none';
    endFx(st >= 1 ? 'win' : 'lose', D.pts, D.def.max);
}
function renderTrain() {
    $('train').querySelectorAll('.stars').forEach(el => { const n = drillBest[el.dataset.s] || 0; el.textContent = '★'.repeat(n) + '☆'.repeat(3 - n); });
}
function goal(scorer) {
    if (S.tuto && scorer === 0) tutoDo('goal');
    S.score[scorer]++;
    if (S.mode === 'match') {
        const st = wallet.st, w0 = S.world;
        const mine = !S.v2 || S.lastTouchPid === 0;      // en 2 contra 2 solo cuentan tus goles, no los de tu compañero
        if (scorer === 0 && mine) evGoal();
        if (scorer === 0) { if (mine) st.goals++; if (!w0.cars[0].grounded && w0.ball.y < H - 200) { st.aerial++; qToast('¡Gol aéreo!', '#3db8ff'); } } else st.conc++;
        S.minDiff = Math.min(S.minDiff || 0, S.score[0] - S.score[1]); achCheck();
        S.streak = S.lastScorer === scorer ? (S.streak || 1) + 1 : 1; S.lastScorer = scorer; S.lastAerial = scorer === 0 && !w0.cars[0].grounded && w0.ball.y < H - 200;
    }
    S.state = 'goal'; S.goalT = 2.6; S.slow = 0.4;
    const col = scorer === 0 ? 'blue' : 'orange', hex = scorer === 0 ? '#3db8ff' : '#ff8a2b';
    S.goalCol = col; S.goalX = scorer === 0 ? W + GD / 2 : -GD / 2; S.flash = 1; S.punch = 1;
    showBanner('¡GOL!', hex, 'gol' + ((S.streak || 1) > 1 ? ' big' : ''));
    { const sc0 = S.world.cars.filter(c => c.team === scorer), air = sc0.some(c => !c.grounded && c.y < H - 160) && S.world.ball.y < H - 180;
      jMsg('¡GOL!', hex, 2.6, air ? '¡GOL AÉREO!' : S.mode === 'match' && !S.v2 ? (scorer === 0 ? 'TÚ' : (S.cup ? TEAMS[S.cup.rival].n : S.net ? 'Amigo' : 'IA').toUpperCase()) : (scorer === 0 ? 'AZUL' : 'NARANJA')); }
    if (Q.crowd !== false) { const cx = W / 2, cy = H * .38, pn = scorer === 0 ? 'blue' : 'orange'; ring(cx, cy, pn, 900, .7, 10); ring(cx, cy, 'white', 600, .5, 5); burst(cx, cy, 26, 520, pn, 5, .8); burst(cx, cy, 12, 420, 'white', 4, .6); shake = Math.max(shake, 12); }
    goalFx(scorer, scorer === 0 ? cfg.boom : 'classic', S.world.ball.x, S.world.ball.y);     // el balón estalla en el punto donde entra
    S.netRip = { x: scorer === 0 ? W : 0, y: S.world.ball.y, side: scorer === 0 ? 1 : -1, t0: performance.now() };      // la red se ondula desde donde entró
    sfx('goal'); buzz([40, 40, 80], 'goal'); padRumble(scorer === 0 ? 900 : 500, scorer === 0 ? 1 : .6, scorer === 0 ? .9 : .4);
    if (S.mode === 'match' && S.ot) S.endAfterGoal = true;
    updateHud();
    commentGoal(scorer);
}
// se acaba el tiempo con empate: el próximo gol gana
function goldenGoal() {
    S.ot = true; jMsg('GOL DE ORO', '#ffd23f', 3); say('¡Empate! ¡Gol de oro! ¡El próximo gol gana el partido!', 2, 1.12, 1.2); showBanner('GOL DE ORO<small>EL PRÓXIMO GOL GANA</small>', GOLD); sfx('go'); setTimeout(hideBanner, 2200);
}
// explosión visual del gol (también se usa para probarla en el taller)
const timers = [], bolts = [];
function later(t, fn) { timers.push({ t, fn }); }
function goalFx(scorer, id, ox, oy) {
    const col = scorer === 0 ? 'blue' : 'orange', dir = scorer === 0 ? -1 : 1;
    const gx = ox != null ? clamp(ox, -GD + 14, W + GD - 14) : scorer === 0 ? W : 0, gy = oy != null ? clamp(oy, H - GH + 20, H - 20) : (H - GH + GF) / 2;
    const sc = Math.min(1, Q.maxP / 400), R = Math.random;
    S.flash = 1; S.punch = 1; shake = 16;
    for (let i = 0; i < 26; i++) flashes.push({ x: R() * W, y: 90 + R() * 220, l: .1 + R() * .3, m: .4 });
    const classic = () => {
        for (let i = 0; i < 140 * sc; i++) {
            const a = -Math.PI / 2 + (R() - 0.5) * 2.4, s = 300 + R() * 800;
            emit(gx + dir * 20, gy, Math.cos(a) * s * dir * -0.8, Math.sin(a) * s, 1.4 + R() * 1.2, 7 + R() * 9, [col, 'gold', 'white'][i % 3], 650);
        }
        ring(gx, gy, col, 1500, .8, 10); ring(gx, gy, 'white', 1000, .6, 5);
    };
    switch (id) {
        case 'fuegos': {
            classic();
            const cols = ['red', 'gold', 'cyan', 'pink', 'green', 'purple', 'orange'];
            for (let k = 0; k < 9; k++) later(.1 + k * .24, () => {
                const x = 250 + R() * (W - 500), y = 120 + R() * 260, c1 = cols[(R() * 7) | 0], c2 = cols[(R() * 7) | 0];
                for (let i = 0; i < 46 * sc; i++) { const a = R() * TAU, s = 120 + R() * 380; emit(x, y, Math.cos(a) * s, Math.sin(a) * s, 1 + R() * .7, 7 + R() * 6, i % 3 ? c1 : c2, 260); }
                for (let i = 0; i < 26 * sc; i++) { const a = R() * TAU, s = 60 + R() * 220; emit(x, y, Math.cos(a) * s, Math.sin(a) * s - 30, 1.6 + R() * .9, 4 + R() * 4, 'gold', 260, true); }
                ring(x, y, c1, 520, .45, 4); emit(x, y, 0, 0, .25, 60, 'white', 0, true); shake = Math.max(shake, 5); sfx('firework');
            });
            break;
        }
        case 'rayos': {
            for (let k = 0; k < 7; k++) later(k * .16, () => {
                const tx = k % 2 ? gx : 150 + R() * (W - 300); let x = tx + (R() - .5) * 200, y = 0; const pts = [[x, y]], ty = k % 2 ? gy : H - 40;
                while (y < ty) { y += 40 + R() * 50; x += (tx - x) * .18 + (R() - .5) * 90; pts.push([x, Math.min(y, ty)]); }
                bolts.push({ pts, l: .28, m: .28 }); ring(pts[pts.length - 1][0], pts[pts.length - 1][1], 'cyan', 700, .35, 6); burst(pts[pts.length - 1][0], pts[pts.length - 1][1], 14, 420, 'yellow', 8, .5, true);
                S.flash = Math.max(S.flash, .8); shake = Math.max(shake, 10); sfx('thunder');
            });
            ring(gx, gy, 'cyan', 1500, .8, 10);
            for (let i = 0; i < 150 * sc; i++) emit(R() * W, -20 - R() * 200, (R() - .5) * 60, 700 + R() * 500, .7 + R() * .4, 5 + R() * 4, i % 3 ? 'cyan' : 'white', 400, true);
            break;
        }
        case 'confeti': {
            const cols = ['red', 'gold', 'green', 'cyan', 'pink', 'purple', 'orange', 'white'];
            for (let i = 0; i < 260 * sc; i++) emit(R() * W, -20 - R() * 160, (R() - .5) * 260, 60 + R() * 200, 2.2 + R() * 1.6, 8 + R() * 6, cols[i % 8], 140, false);
            for (let i = 0; i < 60 * sc; i++) { const a = -Math.PI / 2 + (R() - .5) * 1.8, s = 500 + R() * 600; emit(gx + dir * 20, gy, Math.cos(a) * s * dir * -.4, Math.sin(a) * s, 1.6, 9, cols[i % 8], 700, false); }
            ring(gx, gy, 'gold', 1200, .6, 8); sfx('pop');
            later(.5, () => { for (const sx of [0, W]) for (let i = 0; i < 70 * sc; i++) { const a = -Math.PI / 2 + (sx ? .55 : -.55) + (R() - .5) * .5, s = 700 + R() * 700; emit(sx, H - 20, Math.cos(a) * s, Math.sin(a) * s, 2 + R() * 1.2, 9 + R() * 5, cols[i % 8], 700, false); } sfx('pop'); });
            break;
        }
        case 'corazones': {
            for (let i = 0; i < 90 * sc; i++) { const a = -Math.PI / 2 + (R() - .5) * 2.6, s = 120 + R() * 520; emit(gx + dir * 20, gy, Math.cos(a) * s, Math.sin(a) * s, 1.8 + R() * 1.4, 14 + R() * 14, R() < .6 ? 'heart' : 'heart2', -90, false); }
            for (let i = 0; i < 40 * sc; i++) emit(R() * W, H - 40, (R() - .5) * 60, -120 - R() * 240, 2.4 + R() * 1.6, 12 + R() * 12, i % 2 ? 'heart' : 'heart2', -40, false);
            ring(gx, gy, 'pink', 1300, .8, 10); ring(gx, gy, 'white', 900, .6, 4);
            later(.35, () => { for (let i = 0; i < 70 * sc; i++) { const a = R() * TAU, s = 80 + R() * 480; emit(W / 2, 220, Math.cos(a) * s, Math.sin(a) * s, 1.8 + R(), 12 + R() * 14, i % 2 ? 'heart' : 'heart2', 120, false); } ring(W / 2, 220, 'pink', 800, .6, 7); });
            break;
        }
        case 'baile': {
            if (S.state !== 'goal') { S.danceStart = performance.now(); S.danceUntil = S.danceStart + 3200; }
            classic();
            const cols = ['red', 'gold', 'green', 'cyan', 'pink', 'purple', 'orange', 'white'];
            for (let i = 0; i < 200 * sc; i++) emit(R() * W, -20 - R() * 140, (R() - .5) * 200, 60 + R() * 180, 2 + R() * 1.4, 8 + R() * 6, cols[i % 8], 140, false);
            sfx('pop');
            break;
        }
        case 'disco': {
            const cols = ['pink', 'cyan', 'gold', 'purple', 'green'];
            for (let k = 0; k < 8; k++) later(k * .22, () => {
                for (let i = 0; i < 40 * sc; i++) { const a = R() * TAU, s = 150 + R() * 520; emit(W * (.15 + R() * .7), 160 + R() * 220, Math.cos(a) * s, Math.sin(a) * s, .9 + R() * .7, 6 + R() * 6, cols[(k + i) % 5], 120, true); }
                ring(W * (.2 + R() * .6), 200 + R() * 180, cols[k % 5], 700, .5, 5); S.flash = Math.max(S.flash, .55);
            });
            ring(gx, gy, 'pink', 1500, .8, 10); sfx('pop');
            break;
        }
        case 'monedas': {
            for (let i = 0; i < 220 * sc; i++) emit(R() * W, -20 - R() * 260, (R() - .5) * 100, 120 + R() * 260, 2.4 + R() * 1.6, 10 + R() * 8, i % 4 ? 'gold' : 'yellow', 260, i % 3 === 0);
            for (let i = 0; i < 60 * sc; i++) { const a = -Math.PI / 2 + (R() - .5) * 1.6, s = 400 + R() * 600; emit(gx + dir * 20, gy, Math.cos(a) * s * dir * -.4, Math.sin(a) * s, 1.6, 10, 'gold', 700, true); }
            ring(gx, gy, 'gold', 1400, .7, 9); sfx('pop');
            break;
        }
        case 'meteoros': {
            for (let k = 0; k < 9; k++) later(k * .17, () => {
                const x1 = 100 + R() * (W - 300), y1 = -20, x2 = x1 + 260 + R() * 180, y2 = H - 40;
                for (let i = 0; i < 26; i++) { const f = i / 26; emit(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, (R() - .5) * 60, (R() - .5) * 60, .5 + R() * .4, 14 - f * 6, i % 3 ? 'orange' : 'white', 0, true); }
                later(.28, () => { ring(x2, y2, 'orange', 640, .4, 7); burst(x2, y2, 18, 520, 'gold', 9, .6, true); for (let i = 0; i < 16; i++) emit(x2 + (R() - .5) * 70, y2, (R() - .5) * 80, -40 - R() * 140, 1.6 + R(), 26 + R() * 24, 'smoke', -20, false); shake = Math.max(shake, 8); sfx('boom'); });
            });
            ring(gx, gy, 'orange', 1500, .8, 10);
            break;
        }
        case 'neon': {
            ['pink', 'cyan', 'purple', 'pink', 'cyan'].forEach((c1, i) => later(i * .12, () => ring(gx, gy, c1, 900 + i * 380, .75, 10 - i)));
            for (let i = 0; i < 160 * sc; i++) { const a = R() * TAU, s = 200 + R() * 900; emit(gx, gy, Math.cos(a) * s, Math.sin(a) * s, 1 + R() * .9, 6 + R() * 8, ['pink', 'cyan', 'purple'][i % 3], 120, true); }
            for (let i = 0; i < 24; i++) emit(0, 120 + i * 14, 1400 + R() * 600, 0, .6 + R() * .3, 8 + R() * 6, i % 2 ? 'cyan' : 'pink', 0, true);
            S.flash = 1; sfx('pop');
            break;
        }
        case 'supernova': {
            S.flash = 1.6; shake = 26; S.punch = 1.4;
            for (let i = 0; i < 300 * sc; i++) { const a = R() * TAU, s = 200 + R() * 1500; emit(gx, gy, Math.cos(a) * s, Math.sin(a) * s, 1 + R() * 1.6, 8 + R() * 14, ['white', 'gold', 'orange', 'cyan'][i % 4], 120); }
            [['white', 2600], ['gold', 2100], ['orange', 1700], ['cyan', 1300], ['pink', 1000]].forEach((r, i) => later(i * .1, () => ring(gx, gy, r[0], r[1], 1, 14 - i)));
            emit(gx, gy, 0, 0, .7, 520, 'white', 0, true); sfx('boom');
            for (let i = 0; i < 40 * sc; i++) later(.2 + R() * 1.2, () => { const x = R() * W, y = 40 + R() * 300; emit(x, y, 0, 0, .5, 14 + R() * 10, 'white', 0, true); });
            break;
        }
        case 'hielo': {
            S.flash = 1.2; shake = 18;
            for (let i = 0; i < 240 * sc; i++) { const a = R() * TAU, s = 150 + R() * 900; emit(gx, gy, Math.cos(a) * s, Math.sin(a) * s, 1 + R() * 1.2, 7 + R() * 9, i % 3 ? 'cyan' : 'white', 180, true); }
            for (let i = 0; i < 160 * sc; i++) emit(R() * W, -20 - R() * 220, (R() - .5) * 160, 90 + R() * 220, 2.6 + R() * 1.6, 5 + R() * 6, i % 4 ? 'white' : 'cyan', 40, true);
            [['white', 2000], ['cyan', 1500], ['blue', 1100]].forEach((r, i) => later(i * .09, () => ring(gx, gy, r[0], r[1], .9, 12 - i * 2)));
            for (let k = 0; k < 6; k++) later(.15 + k * .2, () => { const x = 160 + R() * (W - 320), y = H - 60; for (let i = 0; i < 22 * sc; i++) { const a = -Math.PI / 2 + (R() - .5) * .9, s = 300 + R() * 520; emit(x, y, Math.cos(a) * s, Math.sin(a) * s, .8 + R() * .5, 8 + R() * 6, 'white', 600, true); } ring(x, y, 'cyan', 500, .4, 5); shake = Math.max(shake, 6); sfx('pop'); });
            sfx('boom');
            break;
        }
        case 'anillos': {
            for (let i = 0; i < 9; i++) later(i * .09, () => ring(gx, gy, ['gold', 'orange', 'white', 'cyan'][i % 4], 700 + i * 260, .9, 12 - i));
            for (let i = 0; i < 14; i++) later(.2 + i * .12, () => { const x = 200 + R() * (W - 400), y = 130 + R() * 260; ring(x, y, ['pink', 'cyan', 'gold', 'purple'][i % 4], 380 + R() * 220, .55, 5); burst(x, y, 12, 380, ['pink', 'cyan', 'gold', 'purple'][i % 4], 8, .5, true); });
            for (let i = 0; i < 180 * sc; i++) { const a = R() * TAU, s = 100 + R() * 700; emit(gx, gy, Math.cos(a) * s, Math.sin(a) * s, 1.2 + R(), 6 + R() * 8, ['gold', 'white', 'cyan'][i % 3], 0, true); }
            S.flash = 1.1; sfx('pop');
            break;
        }
        default: classic();
    }
    goalExtra(id, gx, gy, dir, sc);
}
// capa común de espectáculo: columna de luz, brasas, doble onda expansiva y destellos de cámara
function goalExtra(id, gx, gy, dir, sc) {
    if (id === 'baile') { shake = Math.max(shake, 10); S.flash = Math.min(S.flash, .45); return; }
    const R = Math.random, tint = { hielo: ['cyan', 'white'], corazones: ['pink', 'heart2'], monedas: ['gold', 'yellow'], neon: ['pink', 'cyan'], rayos: ['cyan', 'white'], meteoros: ['orange', 'yellow'], supernova: ['white', 'gold'] }[id] || ['gold', 'white'];
    shake = Math.max(shake, id === 'supernova' ? 26 : 20);
    for (let i = 0; i < 46 * sc; i++) emit(gx + dir * (10 + R() * 50), gy - R() * 340, (R() - .5) * 40, -160 - R() * 380, .9 + R() * .8, 10 + R() * 16, tint[i % 2], -120, true);       // columna de luz
    for (let i = 0; i < 70 * sc; i++) emit(gx + dir * (20 + R() * 260), H - 30 - R() * 40, (R() - .5) * 90, -60 - R() * 200, 2 + R() * 1.6, 4 + R() * 5, tint[i % 2], -30, true);          // brasas
    later(.06, () => ring(gx, gy, 'white', 2400, .55, 7)); later(.16, () => ring(gx, gy, tint[0], 1800, .7, 5));
    for (let k = 0; k < 4; k++) later(.2 + k * .22, () => { S.flash = Math.max(S.flash, .35); for (let i = 0; i < 6; i++) flashes.push({ x: R() * W, y: 80 + R() * 260, l: .12 + R() * .2, m: .4 }); });
}
function updateTimers(dt) {
    for (let i = timers.length - 1; i >= 0; i--) { const t = timers[i]; t.t -= dt; if (t.t <= 0) { timers.splice(i, 1); t.fn(); } }
    for (let i = bolts.length - 1; i >= 0; i--) { bolts[i].l -= dt; if (bolts[i].l <= 0) bolts.splice(i, 1); }
}
function drawBolts() {
    if (!bolts.length) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const b of bolts) {
        const k = b.l / b.m;
        for (const [w, c] of [[16, 'rgba(90,170,255,' + (.25 * k) + ')'], [6, 'rgba(180,225,255,' + (.7 * k) + ')'], [2.4, 'rgba(255,255,255,' + k + ')']]) {
            ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(b.pts[0][0], b.pts[0][1]);
            for (let i = 1; i < b.pts.length; i++) ctx.lineTo(b.pts[i][0], b.pts[i][1]); ctx.stroke();
        }
    }
    ctx.restore();
}

function simulate(dt, mode) {
    const w = S.world;
    S.acc += dt * S.slow;
    let steps = 0;
    while (S.acc >= STEP && steps < 12) {
        S.acc -= STEP; steps++;
        for (const c of w.cars) { c.px = c.x; c.py = c.y; c.pa = c.a; }
        w.ball.px = w.ball.x; w.ball.py = w.ball.y; if (w.ball2) { w.ball2.px = w.ball2.x; w.ball2.py = w.ball2.y; }
        const inps = mode === 'demo' ? [S.ai0.inp, S.ai.inp] : S.v2 && w.cars.length === 4 ? [pInp, S.ai.inp, S.mate.inp, S.ai3.inp] : [pInp, S.ai.inp];
        if (S.net && mode === 'game') netStep();
        const r = T.stepWorld(w, STEP, inps);
        pInp.jump = false;
        if (mode === 'game' && (S.state === 'play' || (S.state === 'goal' && S.goalT > 2.0))) recSnap(w);
        if (r >= 0) {
            if (mode === 'demo') { T.kickoff(w); break; }
            if (S.mode === 'drill') { if (S.state === 'play') drillGoal(r); }
            else if (S.state === 'play' && !(S.net && S.net.guest)) goal(r);      // online los goles los decide el anfitrión
        }
    }
    if (steps === 12) S.acc = 0;
    S.alpha = clamp(S.acc / STEP, 0, 1);
}
// entre dos pasos de física se dibuja en la posición intermedia: fluido a cualquier frecuencia de pantalla (120, 144, 240 Hz...)
const interpSave = [];
function interpApply() {
    interpSave.length = 0;
    const w = S.world, al = S.alpha == null ? 1 : S.alpha, lerp = al < 1 && S.state !== 'pause';
    for (const o of w.ball2 ? [...w.cars, w.ball, w.ball2] : [...w.cars, w.ball]) {
        const off = o.vox || o.voy;      // online: desfase visual que suaviza las correcciones del anfitrión
        if (!off && !lerp) continue;
        interpSave.push([o, o.x, o.y, o.a]);
        if (lerp && o.px != null && Math.abs(o.x - o.px) <= 160 && Math.abs(o.y - o.py) <= 160) {
            o.x = o.px + (o.x - o.px) * al; o.y = o.py + (o.y - o.py) * al;
            if (o.pa != null) { let da = o.a - o.pa; da -= TAU * Math.round(da / TAU); o.a = o.pa + da * al; }
        }
        if (off) { o.x += o.vox || 0; o.y += o.voy || 0; }
    }
}
function interpRestore() { for (const r of interpSave) { r[0].x = r[1]; r[0].y = r[2]; r[0].a = r[3]; } interpSave.length = 0; }

function update(dt) {
    if (S.net) netRecv(dt);      // aplica lo último que llegó del amigo (puede cambiar el estado: gol, saque, final)
    const w = S.world, st = S.state;
    S.alpha = 1;      // solo se interpola cuando la física avanza (simulate lo recalcula)
    padPoll(dt);
    const gameIn = st === 'play' || st === 'count' || st === 'goal';
    pInp.dir = clamp(touch.dir + (kb.r ? 1 : 0) - (kb.l ? 1 : 0) + (pad.on && gameIn ? pad.dir : 0), -1, 1);
    pInp.pitch = pad.on && pad.mode && gameIn && stick.id === null ? pad.pitch : (cfg.dev === 'pc' && gameIn ? (kb.u ? 1 : 0) - (kb.d ? 1 : 0) : touch.pitch);
    pInp.aim = stick.id !== null || (pad.on && pad.mode && gameIn) || (cfg.dev === 'pc' && gameIn);
    pInp.roll = (stick.id !== null && stick.roll) || (pad.on && pad.mode && gameIn && pad.roll) || (cfg.dev === 'pc' && gameIn && kb.roll);      // con el dedo en el joystick el control aéreo apunta el morro
    if (touch.pitch > 0.8) {      // joystick arriba en el suelo: salto (solo una vez por empujón)
        if (!flickHeld && cfg.flick && (st === 'play' || st === 'goal') && w.cars[0].grounded) pInp.jump = true;
        flickHeld = true;
    } else if (touch.pitch < 0.5) flickHeld = false;
    pInp.boost = touch.b || kb.b || touch.b2 || (pad.on && gameIn && pad.boost);
    if (pad.jumpEdge) { pad.jumpEdge = false; if (st === 'play' || st === 'goal') pInp.jump = true; }
    if (pad.on && w.cars[0].boosting && st !== 'menu' && performance.now() - pad.boostT > 110) { pad.boostT = performance.now(); hk = 'boost'; padRumble(130, .08, .38); }
    if (w.cars[0].boosting && !pad.wasBoost && gameIn) { buzz(14, 'boost'); }
    pad.wasBoost = w.cars[0].boosting;
    if (st === 'menu') {
        T.aiStep(S.ai0, w.cars[0], w.ball, w, dt);
        T.aiStep(S.ai, w.cars[1], w.ball, w, dt);
        if (demoBoostT > 0) { demoBoostT -= dt; S.ai0.inp.boost = true; w.cars[0].boost = w.cars[0].st.boostMax; if (Math.abs(S.ai0.inp.dir) < .5) S.ai0.inp.dir = w.cars[0].f; }
        S.slow = 1; simulate(dt, 'demo');
    } else if (st === 'count') {
        pInp.jump = false;
        S.cd -= dt;
        const n = Math.ceil(S.cd);
        if (S.cd > 0) {
            if (n !== lastCd) { lastCd = n; countEl.textContent = n; countEl.style.color = CDC[n] || '#ffd23f'; countEl.classList.remove('show', 'pulse'); void countEl.offsetWidth; countEl.classList.add('show', 'pulse'); sfx('cd', n); ring(W / 2, H * .38, n === 3 ? 'blue' : n === 2 ? 'orange' : 'gold', 520, .5, 6); burst(W / 2, H * .38, 10, 260, n === 3 ? 'blue' : n === 2 ? 'orange' : 'gold', 4, .6); shake = Math.max(shake, 3 + (4 - n)); }
        } else {
            countEl.textContent = '¡YA!'; countEl.style.color = '#3dffb0'; countEl.classList.remove('pulse'); void countEl.offsetWidth; countEl.classList.add('show', 'pulse', 'ya'); ring(W / 2, H * .38, 'green', 1100, .7, 10); ring(W / 2, H * .38, 'white', 700, .5, 5); burst(W / 2, H * .38, 34, 620, 'green', 5, .8); burst(W / 2, H * .38, 18, 500, 'white', 4, .6); S.flash = Math.max(S.flash, .45); shake = Math.max(shake, 9); sfx('go'); setState('play'); S.goHold = 0.7; hideBanner();
        }
    } else if (st === 'replay') {
        pInp.jump = false; if (pad.jumpEdge) { pad.jumpEdge = false; }
        replayStep(dt);
    } else if (st === 'play' || st === 'goal') {
        if (S.goHold > 0) { S.goHold -= dt; if (S.goHold <= 0) countEl.classList.remove('show', 'pulse', 'ya'); }
        if (S.net) { /* el coche 1 lo mueve el amigo: su mando llega por la red en netStep */ }
        else if (S.mode === 'match') {
            S.ai.lead = S.score[1] - S.score[0]; S.ai.tleft = S.ot ? 0 : S.time; T.aiStep(S.ai, w.cars[1], w.ball, w, dt);
            if (S.ai.note) { if (st === 'play') qToast('🧠 ' + S.ai.note, '#ffd23f'); S.ai.note = null; }
            if (S.v2 && w.cars.length === 4) {
                S.ai3.lead = S.ai.lead; S.ai3.tleft = S.ai.tleft; T.aiStep(S.ai3, w.cars[3], w.ball, w, dt); S.ai3.note = null;
                S.mate.lead = -S.ai.lead; S.mate.tleft = S.ai.tleft; T.aiStep(S.mate, w.cars[2], w.ball, w, dt);
                for (const [a, pid] of [[S.mate, 2], [S.ai, 1], [S.ai3, 3]]) if (a.say) { if (st === 'play') S.bub.push({ pid, txt: a.say, t0: performance.now() }); a.say = null; }
            }
        }
        else { S.ai.inp.dir = 0; S.ai.inp.boost = false; S.ai.inp.jump = false; }
        if (st === 'goal' && S.v2 && S.mate) { for (const a of [S.mate, S.ai3]) { a.inp.jump = false; } }
        if (st === 'goal') {
            S.goalT -= dt;
            S.slow = S.goalT > 1.4 ? 0.4 : Math.min(1, S.slow + dt * 1.2);
            if (S.goalT <= 0 && S.net && S.net.guest) { /* el invitado espera a que el anfitrión saque de centro */ }
            else if (S.goalT <= 0) {
                hideBanner(); S.slow = 1;
                const after = () => {
                    if (S.endAfterGoal || (S.mode === 'match' && !S.ot && S.time <= 0)) { endMatch(); }
                    else {
                        if (S.mode === 'free') { Object.assign(w.ball, { x: W / 2, y: H - 380, vx: 0, vy: 0 }); setState('play'); }
                        else { T.kickoff(w); setState('count'); S.cd = 3; lastCd = 4; }
                    }
                };
                if (cfg.replay && S.mode === 'match' && !S.net && RC.n > 40) startReplay(after); else after();
            }
        } else if (S.mode === 'match' && !S.ot && !(S.net && S.net.guest)) {      // el reloj del invitado lo marca el anfitrión
            if (S.mode === 'match' && !S.ot && S.time > 60 && S.time - dt <= 60 && cfg.time > 60) jMsg('¡ÚLTIMO MINUTO!', '#ff6b6b', 2.4);
            S.time -= dt;
            if (S.time <= 0) {
                S.time = 0;
                if (S.score[0] !== S.score[1]) endMatch();
                else goldenGoal();
            }
        }
        if (S.state === 'play' && S.mode === 'match') wallet.st.secs += dt;
        if (S.tuto && S.state === 'play') tutoTick(dt);
        if (S.state === 'play' && S.mode === 'drill') drillTick(dt);
        if (S.state === 'play' || S.state === 'goal') simulate(dt, 'game');
        updateHud();
    }
    if (S.net) netSend();
    // luces de freno y velocidad de las ruedas
    const inpsNow = [pInp, S.ai.inp];
    for (let i = 0; i < 2; i++) {
        const c = w.cars[i];
        c.brake = c.grounded && st !== 'count' && ((Math.abs(inpsNow[i].dir) < 0.05 && !c.boosting) || (inpsNow[i].pitch || 0) < -0.6);
        c.spdv = Math.hypot(c.vx, c.vy);
    }
    if (w.cars[0].grounded || w.ball.y > H - T.BALL_R - 10) S.airN = 0;
    handleEvents();
    effects(dt, st); updateTimers(dt); audioUpdate(dt); commentTick(dt, st);
    S.punch = Math.max(0, S.punch - dt * 2.4);
    S.flash = Math.max(0, S.flash - dt * 2.2);
    shake = Math.max(0, shake - dt * 30);
    // turbo: anillo del botón táctil e indicador de PC, con aviso de casi vacío y de lleno
    const bp = w.cars[0].boost / w.cars[0].st.boostMax * 100, bLow = bp < 18 && !T.MUT.inf, bFull = bp >= 99.5;
    boostEl.style.setProperty('--p', bp.toFixed(1));
    if (bLow !== boostEl.classList.contains('low')) boostEl.classList.toggle('low', bLow);
    if (bFull !== boostEl.classList.contains('full')) boostEl.classList.toggle('full', bFull);
    const bg = $('boostGauge'); bg.style.setProperty('--p', bp.toFixed(1));
    const bt = String(Math.round(bp)); if (bg.lastChild.textContent !== bt) bg.lastChild.textContent = bt;
    if (bLow !== bg.classList.contains('low')) bg.classList.toggle('low', bLow);
    if (bFull !== bg.classList.contains('full')) bg.classList.toggle('full', bFull);
}

// estelas del turbo personalizadas
function trailFx(id, tx, ty, fx, fy) {
    const R = () => Math.random(), j = (a) => (R() - .5) * a, sp = 280 + R() * 240;
    const e = (pal, vm, life, size, grav, add) => emit(tx, ty, -fx * sp * vm + j(140), -fy * sp * vm + j(140), life, size, pal, grav || 0, add);
    switch (id) {
        case 'hielo': for (let i = 0; i < 3; i++) e(i % 2 ? 'cyan' : 'white', 1, .3 + R() * .25, 8 + R() * 8); if (R() < .4) emit(tx, ty, j(120), -50 + j(60), .8, 5, 'white', 200, true); break;
        case 'rayo': for (let i = 0; i < 4; i++) emit(tx, ty, -fx * sp * .8 + j(420), -fy * sp * .8 + j(420), .14 + R() * .12, 5 + R() * 6, i % 2 ? 'yellow' : 'white', 0, true); break;
        case 'toxico': for (let i = 0; i < 3; i++) e('green', .9, .35 + R() * .3, 9 + R() * 9); if (R() < .6) emit(tx, ty, -fx * 90 + j(80), -fy * 90 - 60, .9, 12, 'green', -80, false); break;
        case 'neon': for (let i = 0; i < 3; i++) e(i % 2 ? 'pink' : 'purple', 1, .32 + R() * .25, 9 + R() * 8); break;
        case 'galaxia': for (let i = 0; i < 3; i++) e(['purple', 'cyan', 'white'][i], .9, .4 + R() * .3, 6 + R() * 8); if (R() < .5) emit(tx, ty, j(90), j(90), 1, 4, 'white', 0, true); break;
        case 'arcoiris': for (let i = 0; i < 3; i++) e(RAINBOW[(S.rb = (S.rb || 0) + 1) % 7], 1, .35 + R() * .25, 9 + R() * 8); break;
        case 'ev_halloween': for (let i = 0; i < 3; i++) e(i % 2 ? 'green' : 'purple', 1, .35 + R() * .25, 8 + R() * 8); if (R() < .4) emit(tx, ty, -fx * 90 + j(60), -fy * 90 - 50, 1, 14, 'smoke', -60, false); break;
        case 'ev_navidad': for (let i = 0; i < 3; i++) e(['red', 'green', 'white'][i], 1, .32 + R() * .25, 7 + R() * 7); if (R() < .5) emit(tx, ty, j(120), -40 + j(60), .9, 4, 'white', 160, true); break;
        case 'ev_sanvalentin': for (let i = 0; i < 3; i++) e(i % 2 ? 'heart' : 'heart2', 1, .35 + R() * .25, 8 + R() * 8); break;
        case 'ev_primavera': for (let i = 0; i < 3; i++) e(i % 2 ? 'pink' : 'green', 1, .35 + R() * .25, 7 + R() * 7); if (R() < .4) emit(tx, ty, j(90), -30 + j(40), 1, 4, 'white', 60, true); break;
        case 'ev_verano': for (let i = 0; i < 3; i++) e(['orange', 'yellow', 'cyan'][i], 1, .32 + R() * .25, 8 + R() * 8); break;
        case 'humo': for (let i = 0; i < 2; i++) emit(tx, ty, -fx * sp * .5 + j(100), -fy * sp * .5 + j(100) - 30, .7 + R() * .4, 16 + R() * 12, 'smoke', -60, false); e('orange', 1, .14, 7, 0, true); break;
        default: break;
    }
}
let emitAcc = 0;
function effects(dt, st) {
    const w = S.world;
    emitAcc += dt; let doEmit = false;      // las partículas nuevas salen como máximo a 60 Hz: a 120 o 240 FPS no se duplican
    if (emitAcc >= 1 / 60 - 1e-4) { emitAcc = Math.min(emitAcc - 1 / 60, 1 / 60); doEmit = true; }
    if (doEmit) for (const c of w.cars) {
        const fx = c.f * Math.cos(c.a), fy = c.f * Math.sin(c.a);
        if (c.boosting && st !== 'count') {
            const tx = c.x - fx * 44 * c.sc, ty = c.y - fy * 44 * c.sc, hot = c.model === 'fenix', tpal = c.team === 0 ? 'blue' : 'orange', low = c.boost / c.st.boostMax < .22, pm = Q.pm || 1;
            if (!(c.bt > 0)) {       // arranque: destello, onda de aire y chispas
                ring(tx, ty, low ? 'red' : tpal, 420, .35, 5); emit(tx, ty, 0, 0, .18, 70, 'white', 0, true);
                for (let i = 0; i < 10 * pm; i++) emit(tx, ty, -fx * (300 + Math.random() * 500) + (Math.random() - .5) * 300, -fy * (300 + Math.random() * 500) + (Math.random() - .5) * 300 - 60, .35 + Math.random() * .3, 3 + Math.random() * 3, 'gold', 800, true);
                if (c === w.cars[0]) shake = Math.max(shake, 4);
            }
            c.bt = (c.bt || 0) + 1 / 60;
            emit(tx + (Math.random() - .5) * 4, ty + (Math.random() - .5) * 4, -fx * (200 + Math.random() * 120), -fy * (200 + Math.random() * 120), .2 + Math.random() * .1, 7 + Math.random() * 4, low ? 'red' : 'white', 0, true);     // núcleo brillante
            if (Math.random() < .55 * pm) emit(tx, ty, -fx * (380 + Math.random() * 300) + (Math.random() - .5) * 200, -fy * (380 + Math.random() * 300) + (Math.random() - .5) * 200 - 80, .4 + Math.random() * .35, 2.5 + Math.random() * 2.5, low ? 'red' : 'gold', 900, true);     // chispas que caen
            if (low && Math.random() < .5) emit(tx, ty, -fx * 160, -fy * 160 - 30, .35, 12, 'red', 0, true);
            const tid = c === w.cars[0] ? cfg.trail : 'auto';
            if (tid !== 'auto') trailFx(tid, tx, ty, fx, fy);
            else {
                for (let i = 0; i < 3; i++) {
                    emit(tx, ty, -fx * (280 + Math.random() * 240) + (Math.random() - 0.5) * 140, -fy * (280 + Math.random() * 240) + (Math.random() - 0.5) * 140,
                        0.3 + Math.random() * 0.25, 9 + Math.random() * 9, hot ? (Math.random() < .5 ? 'orange' : 'gold') : (c.team === 0 ? 'blue' : 'orange'), 0, true);
                }
                if (Math.random() < 0.8) emit(tx, ty, -fx * 120 + (Math.random() - .5) * 60, -fy * 120 - 40, .9, 14 + Math.random() * 8, 'grey', -120, false);
            }
        }
        if (!c.boosting || st === 'count') { if (c.bt > .5 && Q.crowd) emit(c.x - fx * 44 * c.sc, c.y - fy * 44 * c.sc, -fx * 60, -fy * 60 - 30, .5, 16, 'grey', -80, false); c.bt = 0; }
        // chispas al rozar paredes y techo
        if (c.grounded && c.ny > -0.8 && c.spdv > 350 && st !== 'menu' && Math.random() < .8) {
            const px = c.x - c.nx * c.r, py = c.y - c.ny * c.r;
            for (let i = 0; i < 2; i++) emit(px, py, -c.vx * .15 + (Math.random() - .5) * 260 + c.nx * 120, -c.vy * .15 + (Math.random() - .5) * 260 + c.ny * 120, .35 + Math.random() * .3, 4 + Math.random() * 3, 'gold', 900, true);
        }
    }
    const b = w.ball, sp = Math.hypot(b.vx, b.vy);
    if (doEmit) {
    if (sp > 550) { trail.push({ x: b.x, y: b.y, a: Math.min(1, (sp - 550) / 1500) }); if (trail.length > 14) trail.shift(); }
    else if (trail.length) trail.shift();
    if (sp > 380 && Math.random() < .55 && BALL_PAL[cfg.ball]) {      // partículas propias de cada balón
        const bp = BALL_PAL[cfg.ball], cs = cfg.ball === 'hielo' ? 'white' : cfg.ball === 'fuego' ? (Math.random() < .5 ? 'yellow' : 'red') : cfg.ball === 'galaxia' ? (Math.random() < .5 ? 'pink' : 'purple') : bp;
        emit(b.x + (Math.random() - .5) * 30, b.y + (Math.random() - .5) * 30, -b.vx * .06 + (Math.random() - .5) * 90, -b.vy * .06 + (Math.random() - .5) * 90 + (cfg.ball === 'fuego' ? -60 : 0), .5, 5 + Math.random() * 4, cs, 0, true);
    }
    if (sp > 900 && Math.random() < .5) emit(b.x, b.y, -b.vx * .05 + (Math.random() - .5) * 80, -b.vy * .05 + (Math.random() - .5) * 80, .4, 8, S.lastTouch === 0 ? 'blue' : S.lastTouch === 1 ? 'orange' : 'gold', 0, true);
    }
    for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.l -= dt;
        if (p.l <= 0) { parts.splice(i, 1); continue; }
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i]; r.l -= dt;
        if (r.l <= 0) { rings.splice(i, 1); continue; }
        r.r += r.vr * dt; r.vr *= 1 - 3 * dt;
    }
    if (EV === 'navidad' && evNewYear() && Q.crowd && doEmit && Math.random() < .012) {      // fuegos de Año Nuevo en el cielo
        const x = 200 + Math.random() * (W - 400), y = 70 + Math.random() * 170, pal = RAINBOW[(Math.random() * 7) | 0];
        burst(x, y, 26, 360, pal, 4, 1.1); ring(x, y, pal, 260, .6, 3); emit(x, y, 0, 0, .2, 50, 'white', 0, true);
    }
    if (Q.crowd && doEmit && S.state === 'goal' && crowdPts.length) {
        const side = S.goalCol === 'blue' ? 0 : 1, CP = [['blue', 'white', 'gold'], ['orange', 'white', 'gold']][side], n = Q.ultra ? 3 : 1;
        for (let k = 0; k < n; k++) if (Math.random() < .55) {
            const p = crowdPts[(Math.random() * crowdPts.length) | 0]; if ((p[0] < W / 2 ? 0 : 1) !== side) continue;
            const big = Math.random() < .12;
            emit(p[0], p[1] - 6, (Math.random() - .5) * 120 + (side ? -30 : 30), -(170 + Math.random() * 190), 1.6 + Math.random(), big ? 6 : 3 + Math.random() * 2, CP[(Math.random() * 3) | 0], 260, false);
        }
        if (Math.random() < .25) { const p = crowdPts[(Math.random() * crowdPts.length) | 0]; flashes.push({ x: p[0], y: p[1], l: .14, m: .14 }); }
    }
    if (Q.crowd) {
        if (doEmit && Math.random() < 0.22 * (Q.ultra ? 2.4 : 1) && crowdPts.length) { const p = crowdPts[(Math.random() * crowdPts.length) | 0]; flashes.push({ x: p[0], y: p[1], l: .14, m: .14 }); }
        for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].l -= dt; if (flashes[i].l <= 0) flashes.splice(i, 1); }
    } else flashes.length = 0;
}

function handleEvents() {
    const ev = T.events, w = S.world;
    if (S.tuto) tutoEvents(ev);
    for (const e of ev) {
        switch (e[0]) {
            case 'jump': if (S.state !== 'menu') sfx('jump'); if (S.state !== 'menu' && S.mode === 'match' && e[2] === 'fast' && e[4] === 0) { wallet.st.fastaer++; achCheck(); react('fast', pick(['¡Aéreo rápido! ¡Qué reflejos!', '¡Despega como un cohete!']), 40); } break;
            case 'walljump':
                if (S.state !== 'menu') {
                    sfx('walljump');
                    const cx = e[2] - e[4] * 16, cy = e[3] - e[5] * 16, pal = e[6] === 0 ? 'cyan' : 'orange';
                    ring(cx, cy, pal, 520, .35, 5); burst(cx, cy, 10, 300, pal, 7, .4, true);
                    if (e[7] === 0) { buzz(14, 'jump'); padRumble(120, .3, .6); showCombo('SALTO DE PARED', '#ffd23f'); }
                }
                break;
            case 'dodge': if (S.state !== 'menu' && S.mode === 'match' && e[4] === 0 && e[2] === 'half') { wallet.st.half++; achCheck(); react('half', pick(['¡Qué media vuelta!', '¡Giro de campeón!', '¡Eso es estilo!']), 40); } if (S.state !== 'menu') { sfx('dodge'); if (w.cars[0].flipT > .4) { buzz(16, 'jump'); padRumble(160, .3, .7); } } break;
            case 'wall': if (S.state !== 'menu') { S.ballSq = performance.now(); sfx('wall', e[1]); const bb = w.ball; if (S.state === 'play' && e[1] > 480 && bb.y < H - GH + 30 && (bb.x < 150 || bb.x > W - 150)) say(pick(['¡Al larguero!', '¡Uy, por poco!', '¡Qué cerca ha estado!']), 1, 1.18, 1.25); } break;
            case 'reset':
                if (e[4] === 0 && S.state !== 'menu') {
                    if (S.mode === 'match') { wallet.st.resets++; achCheck(); }
                    ring(e[2], e[3], 'cyan', 700, .5, 6); ring(e[2], e[3], 'white', 450, .35, 3); burst(e[2], e[3], 14, 420, 'cyan', 8, .5, true);
                    sfx('cling'); buzz([20, 30, 40], 'jump'); padRumble(220, .6, .9); showCombo('FLIP RESET', '#3dffe0');
                    say(pick(['¡Flip reset! ¡Qué locura!', '¡Reinicio de voltereta! ¡Impresionante!']), 2, 1.18, 1.3);
                }
                break;
            case 'land':
                if (e[5] === 0 && e[1] > 420 && S.state !== 'menu') { buzz(10, 'hit'); padRumble(100 + e[1] / 8, Math.min(1, e[1] / 900), .3); }
                for (let i = 0; i < 5; i++) emit(e[2], e[3], (Math.random() - .5) * 340, -30 - Math.random() * 90, .5 + Math.random() * .3, 10 + Math.random() * 10, 'grey', 60, false);
                break;
            case 'hit': {
                const pal = e[4] === 0 ? 'blue' : 'orange';
                S.lastTouch = e[4]; S.lastTouchPid = e[5]; S.ballSq = performance.now();
                if (e[1] > 700) ring(e[2], e[3], 'white', 1000 + e[1], .5, 8);
                for (const cc of w.cars) if (cc.pid === e[5]) { cc.hitAt = performance.now(); if (cc.team === 0 ? e[2] < 420 : e[2] > W - 420) cc.saveAt = cc.hitAt; }      // despeje cerca de su portería
                burst(e[2], e[3], Math.min(16, 4 + e[1] / 110), 380, pal, 9, .5, true);
                burst(e[2], e[3], 4, 280, 'white', 7, .3, true);
                if (e[1] > 330) ring(e[2], e[3], pal, 700 + e[1], .35, 5);
                if (S.state === 'play' && e[1] > 1000) react('shot', pick(['¡Vaya cañonazo!', '¡Qué disparo!', '¡Qué pegada tiene!', '¡Pero qué bestialidad!']), 20);
                if (S.state === 'play' && e[1] > 520) {
                    const cc = w.cars[e[5]] || w.cars[e[4]];
                    if (cc.flipT > 0 && e[5] === 0) say(pick(['¡Qué voltereta!', '¡Vaya acrobacia!', '¡Menuda volea!']), 1, 1.15, 1.2);
                    else if (e[1] > 850) say(e[4] === 0 ? pick(['¡Qué disparo!', '¡Menudo trallazo!', '¡Qué potencia!']) : pick(['¡Peligro! ¡Disparo del rival!', '¡Cuidado! ¡Tira el naranja!']), 1, 1.15, 1.15);
                }
                if (S.state === 'play' && S.pbv && S.mode === 'match') {       // parada: el balón iba rápido hacia la portería de quien lo toca
                    const dA = e[4] === 0 ? 1 : -1, toward = -S.pbv[0] * dA, near = dA > 0 ? S.pbv[1] < 520 : S.pbv[1] > W - 520;
                    if (toward > 520 && near && w.ball.vx * dA > 0) jMsg('¡PARADÓN!', e[4] === 0 ? '#3db8ff' : '#ff8a2b', 1.6);
                }
                if (S.state === 'play' && e[1] > 520) S.camKick = Math.max(S.camKick || 0, Math.min(1, (e[1] - 420) / 700));
                if (S.state !== 'menu') { sfx('hit', e[1]); shake = Math.max(shake, Math.min(10, e[1] / 150)); S.punch = Math.max(S.punch, Math.min(.5, e[1] / 2400)); if (e[5] === 0 && e[1] > 380) buzz(18, 'hit'); if (e[5] === 0 && S.state === 'play' && !w.cars[0].grounded && w.ball.y < H - 140) airTouch();
                if (e[5] === 0) { hk = 'hit'; } if (e[5] === 0) padRumble(90 + e[1] / 6, Math.min(1, e[1] / 1100), Math.min(1, e[1] / 800)); }
                break;
            }
            case 'pad': {
                const c = w.cars[e[3] == null ? e[1] : e[3]]; if (c) { ring(c.x, c.y, 'gold', 600, .4, 4); burst(c.x, H - 8, e[2] ? 18 : 9, 300, 'gold', 7, .5, true); }
                if (S.state !== 'menu' && (e[3] == null ? e[1] : e[3]) === 0) { sfx('pad'); buzz(12, 'boost'); padRumble(150, .15, .7); }
                break;
            }
            default: break;
        }
    }
    ev.length = 0;
    S.pbv = [w.ball.vx, w.ball.x];
}

