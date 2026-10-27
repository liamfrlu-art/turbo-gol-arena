'use strict';
/* Turbo Gol Arena · Controles: joystick táctil, mando (Gamepad API), elección de dispositivo, botones y teclado.
   Los archivos de js/ se cargan en orden y comparten el ámbito global (antes eran un solo game.js). */
// ---------- Joystick flotante ----------
const stickZone = $('stickZone'), stickBase = $('stickBase'), stickKnob = $('stickKnob');
const stick = { id: null, cx: 0, cy: 0, size: 120, R: 46, sign: 0, roll: false, downT: 0, tapT: 0 };
function stickMetrics() { stick.size = stickBase.offsetWidth || 120; stick.R = stick.size * 0.5 * 0.8; }
function defaultCenter() {
    const r = app.getBoundingClientRect(); stickMetrics();
    const m = stick.size / 2 + 26;
    const o = cfg.lay.stick || { x: 0, y: 0 };
    return { x: clamp((cfg.hand === 'l' ? m : r.width - m) + o.x, stick.size / 2, r.width - stick.size / 2), y: clamp(r.height - stick.size / 2 - 18 + o.y, stick.size / 2, r.height - stick.size / 2) };
}
function placeStick(cx, cy, kx, ky) {
    stickBase.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px)';
    stickKnob.style.transform = 'translate(' + (cx + kx).toFixed(1) + 'px,' + (cy + ky).toFixed(1) + 'px)';
}
function restStick() {
    const c = defaultCenter(); stick.cx = c.x; stick.cy = c.y; placeStick(c.x, c.y, 0, 0);
    stickBase.classList.remove('on'); stickKnob.classList.remove('on');
}
function releaseStick() { stick.id = null; stick.sign = 0; stick.roll = false; stickBase.classList.remove('roll'); touch.dir = 0; touch.pitch = 0; restStick(); }
function moveStick(px, py) {
    let vx = px - stick.cx, vy = py - stick.cy, len = Math.hypot(vx, vy);
    if (cfg.stick === 'float' && len > stick.R * 1.3) {      // la base sigue al dedo si se aleja demasiado
        const k = (len - stick.R * 1.3) / len; stick.cx += vx * k; stick.cy += vy * k;
        vx = px - stick.cx; vy = py - stick.cy; len = Math.hypot(vx, vy);
    }
    if (len > stick.R) { vx *= stick.R / len; vy *= stick.R / len; }
    const m = vx / stick.R, dead = 0.14, a = clamp((Math.abs(m) - dead) / (1 - dead), 0, 1);
    const sign = a > 0 ? (m > 0 ? 1 : -1) : 0;
    touch.dir = sign * Math.min(1, a * 1.15);
    const m2 = -vy / stick.R, a2 = clamp((Math.abs(m2) - dead) / (1 - dead), 0, 1);
    touch.pitch = a2 > 0 ? (m2 > 0 ? 1 : -1) * Math.min(1, a2 * 1.15) : 0;
    if (sign !== stick.sign) { if (sign !== 0) buzz(5, 'btn'); stick.sign = sign; }
    placeStick(stick.cx, stick.cy, vx, vy);
}
stickZone.addEventListener('pointerdown', e => {
    if (stick.id !== null) return;
    e.preventDefault(); audio();
    try { stickZone.setPointerCapture(e.pointerId); } catch (x) { /* sin captura */ }
    stick.id = e.pointerId; stickMetrics();
    const nowT = performance.now();
    stick.roll = !!cfg.roll && nowT - stick.tapT < 450;       // segundo toque rápido: giro aéreo mientras lo mantengas
    stick.downT = nowT;
    if (stick.roll) { stickBase.classList.add('roll'); buzz(14, 'btn'); sfx('tap', 2); }
    const r = app.getBoundingClientRect(), zr = stickZone.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    if (cfg.stick === 'float') {
        const m = stick.size / 2 + 8;
        stick.cx = clamp(px, zr.left - r.left + m, zr.right - r.left - m);
        stick.cy = clamp(py, zr.top - r.top + m, r.height - m);
    } else { const c = defaultCenter(); stick.cx = c.x; stick.cy = c.y; }
    stickBase.classList.add('on'); stickKnob.classList.add('on');
    buzz(6, 'btn'); moveStick(px, py);
});
stickZone.addEventListener('pointermove', e => {
    if (e.pointerId !== stick.id) return;
    const r = app.getBoundingClientRect(); moveStick(e.clientX - r.left, e.clientY - r.top);
});
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => stickZone.addEventListener(ev, e => {
    if (e.pointerId === stick.id) { stick.tapT = (ev === 'pointerup' && performance.now() - stick.downT < 400 && !stick.roll) ? performance.now() : 0; releaseStick(); }
}));

// ---------- Mando (Gamepad API, mapeo estándar de Xbox) ----------
// Juego: stick izq. conduce y apunta, A salta, B (o RT) turbo, LB giro aéreo, ☰ pausa.
// Menús: cruceta o stick mueven, A acepta, B vuelve, LB/RB cambian de pestaña en el Taller.
const pad = { on: false, mode: false, dir: 0, pitch: 0, boost: false, roll: false, jumpEdge: false, prev: [], focus: null, scr: '', navT: 0, navDir: '', boostT: 0, wasBoost: false };
function padGet() {
    try { const l = navigator.getGamepads ? navigator.getGamepads() : []; for (const g of l) if (g && g.connected) return g; } catch (e) { /* sin mandos */ }
    return null;
}
function padMode(on) {
    pad.mode = on; app.dataset.pad = on ? '1' : '0'; app.dataset.padhide = cfg.padHide ? '1' : '0';
    $('padHint').innerHTML = pad.on ? 'A aceptar &nbsp;·&nbsp; B atr\u00e1s &nbsp;·&nbsp; Cruceta mover &nbsp;·&nbsp; \u2630 pausa' : 'Flechas mover &nbsp;·&nbsp; Intro aceptar &nbsp;·&nbsp; Retroceso atr\u00e1s';
    if (!on) padSetFocus(null);
}
function padSetFocus(el) {
    if (pad.focus) pad.focus.classList.remove('padf');
    pad.focus = el;
    if (el) { el.classList.add('padf'); try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* sin scroll */ } }
}
function topScreen() { const l = document.querySelectorAll('.screen.show'); return l.length ? l[l.length - 1] : null; }
function padFocusables(root) { return [...root.querySelectorAll('button')].filter(b => !b.disabled && b.offsetParent !== null && b.getBoundingClientRect().width > 0); }
function padDefault(scr) {
    const by = id => $(id), list = padFocusables(scr);
    const pref = { menu: 'playBtn', pause: 'resumeBtn', end: S.cup ? 'cupNext' : 'againBtn', ctrls: 'ctrlOk', cup: 'cupGo' }[scr.id];
    if (pref && by(pref) && by(pref).offsetParent) return by(pref);
    if (scr.id === 'setup') return list.find(b => b.getAttribute('aria-pressed') === 'true') || list[0] || null;
    if (scr.id === 'shop') return list.find(b => b.classList.contains('chip-o') && b.getAttribute('aria-pressed') === 'true') || list.find(b => b.classList.contains('chip-o')) || list[0] || null;
    return list.find(b => b.getAttribute('aria-pressed') === 'true' && scr.id === 'garage') || list[0] || null;
}
function padMove(dx, dy) {
    const scr = topScreen(); if (!scr || !pad.focus) return;
    const r0 = pad.focus.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    let best = null, bs = 1e9;
    for (const b of padFocusables(scr)) {
        if (b === pad.focus) continue;
        const r = b.getBoundingClientRect(), vx = r.left + r.width / 2 - cx, vy = r.top + r.height / 2 - cy;
        const along = vx * dx + vy * dy, perp = Math.abs(vx * dy) + Math.abs(vy * dx);
        if (along < 4) continue;
        const s = along + perp * 2.2; if (s < bs) { bs = s; best = b; }
    }
    if (best) { padSetFocus(best); sfx('tick'); hk = 'ui'; padRumble(25, 0, .25); }
}
function padBack(scr) {
    const m = { garage: 'garageOk', shop: 'shopOk', ctrls: 'ctrlOk', cup: 'cupOk', end: 'menuBtn', ach: 'achOk', setup: 'setupOk', train: 'trOk' }[scr.id];
    if (m) { $(m).click(); return; }
    if (scr.id === 'pause') resume();
}
function padMenu(g, dt, E, sx, sy) {
    const scr = topScreen(); if (!scr) return;
    if (scr.id !== pad.scr || !pad.focus || !pad.focus.isConnected || pad.focus.offsetParent === null) { pad.scr = scr.id; padSetFocus(padDefault(scr)); }
    if (E(9) && scr.id === 'pause') { resume(); return; }
    const B = i => !!(g.buttons[i] && g.buttons[i].pressed);
    let dx = (B(15) ? 1 : 0) - (B(14) ? 1 : 0), dy = (B(13) ? 1 : 0) - (B(12) ? 1 : 0);
    if (!dx && !dy) { if (Math.abs(sx) > .6) dx = sx > 0 ? 1 : -1; else if (Math.abs(sy) > .6) dy = sy > 0 ? -1 : 1; }
    const key = dx + ',' + dy;
    if (!dx && !dy) { pad.navDir = ''; pad.navT = 0; }
    else { pad.navT -= dt; if (key !== pad.navDir) { pad.navDir = key; pad.navT = .36; padMove(dx, dy); } else if (pad.navT <= 0) { pad.navT = .13; padMove(dx, dy); } }
    if (scr.id === 'shop' && (E(4) || E(5))) {
        const tabs = [...$('shopTabs').querySelectorAll('button')], i = tabs.findIndex(b => b.getAttribute('aria-pressed') === 'true');
        const n = tabs[(i + (E(5) ? 1 : tabs.length - 1)) % tabs.length]; n.click(); padSetFocus(padDefault(scr));
    }
    if (scr.id === 'garage' && (E(4) || E(5))) stepCar(E(5) ? 1 : -1);
    if (scr.id === 'ctrls' && (E(4) || E(5))) { ctrlTabs(E(5) ? 1 : -1); padSetFocus(padDefault(scr)); }
    if (E(0) && pad.focus) { const f = pad.focus; f.click(); if (f.isConnected && f.offsetParent !== null) padSetFocus(f); }
    else if (E(1)) padBack(scr);
}
function padPoll(dt) {
    const g = padGet();
    if (!g) { if (pad.on) { pad.on = false; padMode(false); toast('Mando desconectado', '#ff8a2b'); } pad.dir = pad.pitch = 0; pad.boost = pad.roll = false; return; }
    const B = i => !!(g.buttons[i] && g.buttons[i].pressed), E = i => B(i) && !pad.prev[i];
    const ax = g.axes[0] || 0, ay = -(g.axes[1] || 0), mag = Math.hypot(ax, ay);
    let sx = 0, sy = 0;
    if (mag > .18) { const k = Math.min(1, (mag - .18) / .82) / mag; sx = ax * k; sy = ay * k; }
    const act = mag > .35 || g.buttons.some(b => b.pressed);
    if (!pad.on) { pad.on = true; audio(); toast('Mando conectado', '#3dffb0'); sfx('unlock'); }
    if (act && !pad.mode) padMode(true);
    const ingame = S.state === 'play' || S.state === 'count' || S.state === 'goal';
    if (S.state === 'replay') { pad.dir = pad.pitch = 0; pad.boost = pad.roll = false; if (E(0) || E(1) || E(9)) skipReplay(); }
    else if (ingame) {
        pad.dir = sx; pad.pitch = sy; pad.boost = B(1) || B(7); pad.roll = B(4);
        if (E(0)) pad.jumpEdge = true;
        if (E(9)) pause();
    } else {
        pad.dir = pad.pitch = 0; pad.boost = pad.roll = false;
        if (pad.mode) padMenu(g, dt, E, sx, sy);
    }
    pad.prev = g.buttons.map(b => b.pressed);
}
// al tocar la pantalla vuelven los controles táctiles
window.addEventListener('pointerdown', e => { if (e.pointerType !== 'gamepad' && pad.mode) padMode(false); }, true);
window.addEventListener('mousemove', () => { if (pad.mode && !pad.on && pad.focus) padMode(false); });

// ---------- Dispositivo: móvil/mando o PC ----------
function applyDev(full) {
    app.dataset.dev = cfg.dev === 'pc' ? 'pc' : 'touch';
    if (full && cfg.dev === 'pc') goFull();
    if (stick.id !== null) releaseStick();
}
function chooseDev(v) {
    cfg.dev = v; store.set('dev', v); applyDev(true);
    $('device').classList.remove('show'); padSetFocus(null); pad.scr = '';
    sfx('click');
}
$('devTouch').addEventListener('click', () => { audio(); chooseDev('touch'); });
$('devPc').addEventListener('click', () => { audio(); chooseDev('pc'); });
if (cfg.dev !== 'pc' && cfg.dev !== 'touch') {
    $('device').classList.add('show');
    const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    $(coarse ? 'devTouch' : 'devPc').classList.add('reco');
} else applyDev(false);

// ---------- Botones de salto y turbo ----------
const boostEl = $('boostBtn'), jumpEl = $('jumpBtn');
function holdBtn(el, down, up) {
    const ids = new Set();
    el.addEventListener('pointerdown', e => { if (app.dataset.edit) return; e.preventDefault(); audio(); buzz(8, 'btn'); try { el.setPointerCapture(e.pointerId); } catch (x) { /* sin captura */ } ids.add(e.pointerId); el.classList.add('on'); down(); });
    const release = e => { if (!ids.delete(e.pointerId)) return; if (!ids.size) { el.classList.remove('on'); up(); } };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, release));
}
holdBtn(jumpEl, () => { if (S.state === 'play' || S.state === 'goal') pInp.jump = true; }, () => { });
holdBtn($('comboBtn'), () => { touch.b2 = true; if (S.state === 'play' || S.state === 'goal') pInp.jump = true; }, () => { touch.b2 = false; });
holdBtn(boostEl, () => { touch.b = true; }, () => { touch.b = false; });


// ---------- Disposición personalizable de los botones táctiles ----------
// cfg.lay[clave] = { x, y, s }: desplazamiento en px respecto a su sitio por defecto y escala (1 = tamaño normal)
const LAY_EL = { jump: jumpEl, boost: boostEl, combo: $('comboBtn'), stick: stickBase };
const LAY_N = { jump: 'Salto', boost: 'Turbo', combo: 'Salto + turbo', stick: 'Joystick' };
const lay = k => cfg.lay[k] || { x: 0, y: 0, s: 1 };
function applyLay() {
    for (const k of ['jump', 'boost', 'combo']) { const l = lay(k), el = LAY_EL[k]; el.style.translate = l.x + 'px ' + l.y + 'px'; el.style.scale = l.s; }
    app.style.setProperty('--stkk', lay('stick').s);
    if (stick.id === null) requestAnimationFrame(restStick);
    requestAnimationFrame(() => { if (typeof updatePv === 'function') updatePv(); });
}
const edit = { sel: 'jump', k: null, sx: 0, sy: 0, ox: 0, oy: 0 };
function edSelect(k) {
    edit.sel = k; for (const q in LAY_EL) LAY_EL[q].classList.toggle('sel', q === k);
    $('edSize').value = Math.round(lay(k).s * 100); $('edTxt').textContent = LAY_N[k];
}
function edSave() { store.set('lay', cfg.lay); }
function edKeepIn(k) {
    const l = lay(k), el = LAY_EL[k], r = el.getBoundingClientRect(), a = app.getBoundingClientRect();
    let dx = 0, dy = 0;
    if (r.left < a.left + 4) dx = a.left + 4 - r.left; else if (r.right > a.right - 4) dx = a.right - 4 - r.right;
    if (r.top < a.top + 4) dy = a.top + 4 - r.top; else if (r.bottom > a.bottom - 4) dy = a.bottom - 4 - r.bottom;
    if (dx || dy) { cfg.lay[k] = { x: l.x + dx, y: l.y + dy, s: l.s }; applyLay(); }
}
function edStart(on) {
    if (on) {
        $('ctrls').classList.remove('show'); app.dataset.edit = '1'; $('editBar').hidden = false; edSelect(edit.sel); applyLay();
    } else {
        delete app.dataset.edit; $('editBar').hidden = true; $('ctrls').classList.add('show'); for (const q in LAY_EL) LAY_EL[q].classList.remove('sel'); edSave(); requestAnimationFrame(updatePv);
    }
}
for (const k in LAY_EL) {
    const el = LAY_EL[k];
    el.addEventListener('pointerdown', e => {
        if (!app.dataset.edit) return; e.preventDefault(); e.stopPropagation(); edSelect(k);
        try { el.setPointerCapture(e.pointerId); } catch (x) { /* sin captura */ }
        const l = lay(k); edit.k = k; edit.sx = e.clientX; edit.sy = e.clientY; edit.ox = l.x; edit.oy = l.y; edit.id = e.pointerId;
    });
    el.addEventListener('pointermove', e => {
        if (edit.k !== k || e.pointerId !== edit.id) return;
        const l = lay(k); cfg.lay[k] = { x: edit.ox + e.clientX - edit.sx, y: edit.oy + e.clientY - edit.sy, s: l.s }; applyLay();
    });
    ['pointerup', 'pointercancel'].forEach(ev => el.addEventListener(ev, e => { if (edit.k === k && e.pointerId === edit.id) { edit.k = null; edKeepIn(k); edSave(); } }));
}
$('edSize').addEventListener('input', e => { const l = lay(edit.sel); cfg.lay[edit.sel] = { x: l.x, y: l.y, s: Number(e.target.value) / 100 }; applyLay(); });
$('edSize').addEventListener('change', () => { edKeepIn(edit.sel); edSave(); });
$('edReset').addEventListener('click', () => { cfg.lay = {}; edSave(); applyLay(); edSelect(edit.sel); sfx('click'); });
$('edReset0').addEventListener('click', () => { cfg.lay = {}; edSave(); applyLay(); sfx('click'); toast('Botones restablecidos', '#3dffb0'); });
$('edDone').addEventListener('click', () => { edStart(false); sfx('click'); });
$('edBtn').addEventListener('click', () => { audio(); sfx('click'); edStart(true); });
// vibración por evento
{ const root = $('segHap'), mark = () => root.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(cfg.hap[b.dataset.m] !== false)));
  hapMark = mark;
  root.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; cfg.hap[b.dataset.m] = cfg.hap[b.dataset.m] === false; store.set('hap', cfg.hap); mark(); if (cfg.hap[b.dataset.m] !== false) buzz(30, b.dataset.m); });
  mark(); }
applyLay();


// ---------- Controles por pestañas ----------
const CTABS = ['tactil', 'mando', 'vibra', 'pantalla', 'copia', 'ayuda'];
function ctrlTab(t) {
    if (!CTABS.includes(t)) t = 'tactil';
    document.querySelector('.ctrlcard').dataset.tab = t; store.set('ctab', t);
    $('ctabs').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === t)));
    $('cResetMsg').textContent = ''; ctrlResetArm = false; $('cReset').textContent = 'Restablecer esta pestaña';
    $('cReset').style.display = t === 'ayuda' || t === 'copia' ? 'none' : '';
    if (t === 'tactil') requestAnimationFrame(updatePv);
    const cb = document.querySelector('.cbody'); if (cb) cb.scrollTop = 0;
}
$('ctabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { ctrlTab(b.dataset.t); sfx('tick'); } });
// vista previa de los botones: copia a escala la posición real de cada control
function updatePv() {
    const pv = $('pv'); if (!pv || !pv.offsetParent) return;
    const A = app.getBoundingClientRect(); if (!A.width) return;
    for (const k of ['stick', 'jump', 'boost', 'combo']) {
        const el = LAY_EL[k], d = pv.querySelector('[data-k="' + k + '"]'); if (!el || !d) continue;
        if (k === 'combo' && !cfg.combo) { d.style.display = 'none'; continue; }
        const r = el.getBoundingClientRect(); d.style.display = 'grid';
        d.style.left = ((r.left - A.left) / A.width * 100).toFixed(2) + '%'; d.style.top = ((r.top - A.top) / A.height * 100).toFixed(2) + '%';
        d.style.width = (r.width / A.width * 100).toFixed(2) + '%'; d.style.height = (r.height / A.height * 100).toFixed(2) + '%';
    }
}
let ctrlResetArm = false, ctrlResetT = 0;
const CDEF = {
    tactil: { size: 'm', hand: 'l', stick: 'float', alpha: 'soft', flick: true, roll: true, combo: false, lay: {} },
    mando: { padHide: true },
    vibra: { haptic: true, hap: {}, hapI: 'mid' },
    pantalla: { gfx: 'high', fps: false, stadSel: 'random', sky: true, music: true, comm: true, replay: true, hit: false }
};
$('cReset').addEventListener('click', () => {
    const tab = document.querySelector('.ctrlcard').dataset.tab, def = CDEF[tab]; if (!def) return;
    if (!ctrlResetArm) { ctrlResetArm = true; $('cReset').textContent = '¿Seguro? Pulsa otra vez'; clearTimeout(ctrlResetT); ctrlResetT = setTimeout(() => { ctrlResetArm = false; $('cReset').textContent = 'Restablecer esta pestaña'; }, 3000); sfx('click'); return; }
    ctrlResetArm = false; clearTimeout(ctrlResetT); $('cReset').textContent = 'Restablecer esta pestaña';
    for (const k in def) { cfg[k] = typeof def[k] === 'object' ? JSON.parse(JSON.stringify(def[k])) : def[k]; store.set(k, cfg[k]); if (segs[k]) segs[k](); }
    if ('stadSel' in def) applyStad();
    if (hapMark) hapMark();
    applyPrefs(); applyGfx(); applyLay(); if (fpsBox) fpsBox.style.display = cfg.fps ? 'block' : 'none'; app.dataset.padhide = cfg.padHide ? '1' : '0';
    requestAnimationFrame(updatePv); sfx('unlock'); $('cResetMsg').textContent = 'Restablecido';
});
$('hapTest').addEventListener('click', () => { audio(); buzz([30, 40, 60, 40, 90], 'test'); sfx('click'); });
const ctrlTabs = dir => { const i = CTABS.indexOf(document.querySelector('.ctrlcard').dataset.tab); ctrlTab(CTABS[(i + dir + CTABS.length) % CTABS.length]); sfx('tick'); };
ctrlTab(store.get('ctab', 'tactil'));

// Teclado. En modo PC: A/D o flechas conducen, W/S o flechas arriba/abajo apuntan el morro en el aire (S frena en el suelo),
// Espacio salta, Mayús o K turbo, Q o Ctrl giro aéreo, P pausa, F pantalla completa. En los menús: flechas, Intro, Retroceso.
const inGameNow = () => S.state === 'play' || S.state === 'count' || S.state === 'goal';
function navKey(k) {
    const scr = topScreen(); if (!scr) return false;
    if (scr.id !== pad.scr || !pad.focus || !pad.focus.isConnected || pad.focus.offsetParent === null) { pad.scr = scr.id; padSetFocus(padDefault(scr)); padMode(true); if (k.indexOf('Arrow') === 0) return true; }
    if (!pad.mode) padMode(true);
    if (k === 'ArrowLeft') padMove(-1, 0); else if (k === 'ArrowRight') padMove(1, 0); else if (k === 'ArrowUp') padMove(0, -1); else if (k === 'ArrowDown') padMove(0, 1);
    else if (k === 'Enter' || k === ' ') { if (pad.focus) { const f = pad.focus; f.click(); if (f.isConnected && f.offsetParent !== null) padSetFocus(f); } }
    else if (k === 'Escape' || k === 'Backspace') padBack(scr);
    else if (k === 'Tab') padMove(1, 0);
    else if ((k === 'p' || k === 'P') && scr.id === 'pause') resume();
    else return false;
    return true;
}
function goFull() {
    try { if (!document.fullscreenElement) document.documentElement.requestFullscreen().then(() => { try { screen.orientation.lock('landscape').catch(() => { }); } catch (e) { /* sin bloqueo */ } }).catch(() => { }); } catch (e) { /* sin pantalla completa */ }
}
window.addEventListener('keydown', e => {
    const k = e.key;
    if (e.target && e.target.tagName === 'INPUT') { if (k === 'Enter') e.target.blur(); return; }
    if (e.target && e.target.tagName === 'TEXTAREA') { if (k === 'Escape') e.target.blur(); return; }
    if (e.ctrlKey && k !== 'Control') return;
    if (cfg.dev === 'pc') {
        if (k === 'f' || k === 'F') { e.preventDefault(); try { document.fullscreenElement ? document.exitFullscreen() : goFull(); } catch (x) { /* sin pantalla completa */ } return; }
        if (S.state === 'replay') { if (k === 'Enter' || k === ' ' || k === 'Escape' || k === 'p' || k === 'P') { e.preventDefault(); skipReplay(); } return; }
        if (!inGameNow()) { if (navKey(k)) e.preventDefault(); return; }
        let used = true;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') kb.l = true;
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') kb.r = true;
        else if (k === 'ArrowUp' || k === 'w' || k === 'W') kb.u = true;
        else if (k === 'ArrowDown' || k === 's' || k === 'S') kb.d = true;
        else if (k === 'Shift' || k === 'k' || k === 'K') kb.b = true;
        else if (k === 'q' || k === 'Q' || k === 'Control') kb.roll = true;
        else if (k === ' ' || k === 'j' || k === 'J') { if (!e.repeat && (S.state === 'play' || S.state === 'goal')) pInp.jump = true; }
        else if (k === 'p' || k === 'P' || k === 'Escape') pause();
        else used = false;
        if (used) e.preventDefault();
        return;
    }
    if (S.state === 'replay') { if (k === 'Enter' || k === ' ' || k === 'Escape') { e.preventDefault(); skipReplay(); } return; }
    let used = true;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') kb.l = true;
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') kb.r = true;
    else if (k === 'Shift' || k === 'ArrowDown' || k === 's' || k === 'S' || k === 'k' || k === 'K') kb.b = true;
    else if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') { if (!e.repeat && (S.state === 'play' || S.state === 'goal')) pInp.jump = true; }
    else if (k === 'Escape' || k === 'p' || k === 'P') { if (!overlayFrom) { S.state === 'pause' ? resume() : pause(); } }
    else used = false;
    if (used) e.preventDefault();
});
window.addEventListener('keyup', e => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') kb.l = false;
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') kb.r = false;
    else if (cfg.dev === 'pc') {
        if (k === 'ArrowUp' || k === 'w' || k === 'W') kb.u = false;
        else if (k === 'ArrowDown' || k === 's' || k === 'S') kb.d = false;
        else if (k === 'Shift' || k === 'k' || k === 'K') kb.b = false;
        else if (k === 'q' || k === 'Q' || k === 'Control') kb.roll = false;
    }
    else if (k === 'Shift' || k === 'ArrowDown' || k === 's' || k === 'S' || k === 'k' || k === 'K') kb.b = false;
});
window.addEventListener('blur', () => { kb.l = kb.r = kb.b = kb.u = kb.d = kb.roll = false; pause(); });

