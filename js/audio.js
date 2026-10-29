'use strict';
/* Turbo Gol Arena · Audio sintetizado (motor, turbo, multitud, efectos y música) y comentarista con voz del navegador.
   Los archivos de js/ se cargan en orden y comparten el ámbito global (antes eran un solo game.js). */
// ---------- Audio ----------
// Síntesis propia con WebAudio: motor por coche, turbo, multitud, reverb, efectos por capas y música procedural.
let ac = null, master = null, sfxBus = null, musicBus = null, crowdG = null, crowdF = null, rev = null, noiseBuf = null, eng = null, musicTimer = 0;
const mus = { step: 0, next: 0 };
let cheer = 0, duck = 0;
function audio() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); initAudio(); } catch (e) { ac = null; } }
    if (ac && ac.state === 'suspended') ac.resume();
}
const mk = (type, f) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; return o; };
const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
function loopNoise(type, f, q) {
    const n = ac.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    n.connect(fl); n.start(); return { n, fl };
}
function initAudio() {
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = .004; comp.release.value = .22;
    master = ac.createGain(); master.gain.value = cfg.mute ? 0 : 0.9; master.connect(comp); comp.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const len = Math.floor(ac.sampleRate * 1.5), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
    rev = ac.createConvolver(); rev.buffer = ir;
    const rg = ac.createGain(); rg.gain.value = .5; rev.connect(rg); rg.connect(master);
    sfxBus = ac.createGain(); sfxBus.connect(master);
    const send = ac.createGain(); send.gain.value = .2; sfxBus.connect(send); send.connect(rev);
    musicBus = ac.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
    const ms = ac.createGain(); ms.gain.value = .25; musicBus.connect(ms); ms.connect(rev);
    // multitud: ruido filtrado, siempre sonando y modulado por la acción
    const cr = loopNoise('bandpass', 700, .5); crowdF = cr.fl;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    crowdG = ac.createGain(); crowdG.gain.value = 0; cr.fl.connect(lp); lp.connect(crowdG); crowdG.connect(master); crowdG.connect(send);
    // motores: uno por coche
    eng = [0, 1].map(() => {
        const bus = ac.createGain(); bus.gain.value = 0;
        const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; f.Q.value = 3;
        const o1 = mk('sawtooth', 50), o2 = mk('sawtooth', 50.8), o3 = mk('square', 25), g3 = ac.createGain(); g3.gain.value = .45;
        o1.connect(f); o2.connect(f); o3.connect(g3); g3.connect(f); f.connect(bus);
        const nz = loopNoise('bandpass', 900, .9), ng = ac.createGain(); ng.gain.value = 0; nz.fl.connect(ng); ng.connect(bus);
        let out = bus;
        if (ac.createStereoPanner) { const p = ac.createStereoPanner(); bus.connect(p); out = p; }
        const o = { bus, f, o1, o2, o3, g3, ng, nf: nz.fl, pan: out === bus ? null : out, elec: false, boosting: false };
        out.connect(master); o1.start(); o2.start(); o3.start(); return o;
    });
    musicTimer = setInterval(musicTick, 50);
}
function tone(f, d, type, v, slide, delay, a, dest) {
    if (cfg.mute || !ac) return;
    const r8 = cfg.stad === 'retro' && cfg.r8 !== false && dest !== musicBus;      // estadio retro: pitidos de consola de 8 bits (onda cuadrada y notas exactas)
    if (r8) { f = mtof(Math.round(69 + 12 * Math.log2(Math.max(30, f) / 440))); if (slide) slide = mtof(Math.round(69 + 12 * Math.log2(Math.max(30, f + slide) / 440))) - f; }
    const t = ac.currentTime + (delay || 0), o = mk(r8 ? (type === 'sine' || type === 'triangle' || !type ? 'square' : type === 'sawtooth' ? 'square' : type) : (type || 'sine'), f), g = ac.createGain(), at = a || .004;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, v || 0.1), t + at); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(dest || sfxBus); o.start(t); o.stop(t + d + 0.03);
}
function noise(d, type, f, q, v, f2, delay, a) {
    if (cfg.mute || !ac) return;
    const t = ac.currentTime + (delay || 0), n = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(), at = a || .004;
    n.buffer = noiseBuf; fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q || 1;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, v), t + at); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    n.connect(fl); fl.connect(g); g.connect(sfxBus); n.start(t, Math.random()); n.stop(t + d + .03);
}
const lastSnd = {};
function sfx(name, v) {
    if (!ac) return;
    const now = performance.now();
    if (lastSnd[name] && now - lastSnd[name] < (name === 'tap' ? 0 : 70)) return;
    lastSnd[name] = now;
    const k = clamp((v || 0) / 1500, 0, 1);
    switch (name) {
        case 'jump': tone(300, .16, 'triangle', .1, 380); noise(.12, 'bandpass', 500, 1, .05, 1800); break;
        case 'walljump': tone(240, .2, 'triangle', .12, 620); tone(480, .12, 'square', .04, 520); noise(.16, 'bandpass', 900, 1.2, .1, 2600); break;
        case 'dodge': noise(.32, 'bandpass', 500, 1.4, .14, 3200); tone(260, .22, 'sawtooth', .05, 700); break;
        case 'hit':
            tone(210, .2, 'sine', .22 + .3 * k, -150); noise(.07, 'highpass', 2200, .7, .06 + .14 * k);
            if (k > .35) { tone(95, .3, 'sine', .3 * k, -40); tone(1200, .09, 'triangle', .05 * k, -700); }
            break;
        case 'wall': tone(85, .16, 'sine', Math.min(.2, (v || 0) / 6000 + .03), -35); noise(.1, 'lowpass', 900, .7, Math.min(.12, (v || 0) / 9000), 220); break;
        case 'door': tone(68, .16, 'sine', .17, -24); noise(.09, 'lowpass', 650, .7, .11, 180); tone(1400, .03, 'square', .025, 0, .02); break;      // portazo con el clic del cierre
        case 'latch': tone(1250, .03, 'square', .03); tone(700, .05, 'triangle', .03, -200, .03); break;      // tirador de la puerta
        case 'land': tone(70, .12, 'sine', .12, -25); noise(.08, 'lowpass', 600, .7, .07, 180); break;
        case 'pad': [880, 1175, 1568].forEach((f, i) => tone(f, .16, 'sine', .07, 0, i * .05)); tone(440, .25, 'triangle', .05, 440); break;
        case 'ignite': noise(.45, 'bandpass', 400, 1, .17, 3200, 0, .03); tone(110, .35, 'sawtooth', .07, 260); tone(60, .4, 'sine', .12, -25); noise(.2, 'highpass', 3000, .7, .06, 800, .05, .01); break;
        case 'click': tone(1000, .05, 'square', .04); tone(1500, .06, 'triangle', .03, 0, .02); break;
        case 'tap': tone(420 + (v || 0) * 130, .12, 'triangle', .11, 0, 0); tone(840 + (v || 0) * 260, .1, 'sine', .05, 0, .03); break;
        case 'unlock': [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => { tone(f, .5, 'triangle', .1, 0, i * .07, .01); tone(f * 2, .35, 'sine', .035, 0, i * .07 + .02); });
            noise(.9, 'bandpass', 800, 1.2, .09, 6000, 0, .05); break;
        case 'firework': tone(1500 + Math.random() * 900, .5, 'sine', .04, -1100); noise(.35, 'highpass', 3000, .6, .09, 800, .22, .01); tone(90, .25, 'sine', .12, -40, .22); break;
        case 'thunder': noise(.7, 'lowpass', 2400, .8, .26, 140, 0, .005); tone(60, .6, 'sawtooth', .1, -25); break;
        case 'pop': for (let i = 0; i < 4; i++) { noise(.12, 'bandpass', 1800 + i * 500, 1.5, .1, 400, i * .06, .002); } tone(300, .15, 'sine', .15, -200); break;
        case 'boom': tone(80, 1.4, 'sine', .5, -50, 0, .005); noise(1.6, 'lowpass', 1800, .7, .35, 80, 0, .01); tone(40, 1.8, 'sawtooth', .18, -10); break;
        case 'cling': [1760, 2349, 3136].forEach((f, i) => tone(f, .35, 'sine', .08, 0, i * .05)); tone(880, .25, 'triangle', .06, 600); noise(.2, 'highpass', 5000, .6, .05); break;
        case 'cd': { const f = 520 + (4 - (v || 3)) * 170; tone(f, .16, 'square', .08); tone(f * 2, .1, 'sine', .04); noise(.08, 'highpass', 4000, .6, .05, 800, 0, .005); break; }
        case 'tick': tone(660, .1, 'square', .07); tone(1320, .05, 'sine', .03); break;
        case 'go': tone(1320, .45, 'square', .08); tone(990, .45, 'sine', .08); whistle(.25); break;
        case 'goal': {
            cheer = 1;
            [196, 247, 294].forEach(f => { tone(f, 1.9, 'sawtooth', .07, -f * .08, 0, .05); tone(f * 2.005, 1.9, 'sawtooth', .04, 0, 0, .05); });
            [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .5, 'triangle', .09, 0, .15 + i * .09));
            noise(2.2, 'bandpass', 500, .6, .2, 2600, 0, .25); noise(1.6, 'highpass', 4000, .5, .04, 0, .1, .2);
            duck = 2.2; break;
        }
        case 'end': whistle(.5); setTimeout(() => whistle(.5), 650); tone(392, 1.2, 'triangle', .08, -90, .2); break;
        case 'lose': [392, 349, 311, 262].forEach((f, i) => tone(f, .45, 'triangle', .09, 0, i * .16)); break;
        default: break;
    }
}
function whistle(d) {
    if (cfg.mute || !ac) return;
    const t = ac.currentTime, o = mk('sine', 2900), l = mk('sine', 28), lg = ac.createGain(), g = ac.createGain();
    lg.gain.value = 140; l.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.09, t + .02); g.gain.setValueAtTime(.09, t + d - .05); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(sfxBus); o.start(t); l.start(t); o.stop(t + d + .03); l.stop(t + d + .03);
    noise(d, 'bandpass', 3000, 3, .03);
}
// música: Am - F - C - G, a 112 bpm; en el menú suena suave y en juego añade batería y bajo
const PROG = [[45, [57, 60, 64]], [41, [57, 60, 65]], [48, [55, 60, 64]], [43, [55, 59, 62]]];
// cada estadio tiene su tema: tempo, acordes y timbre del arpegio
const MUS = {
    neon: { bpm: 112, prog: PROG, wave: 'triangle' },
    snow: { bpm: 96, prog: [[48, [60, 64, 67]], [45, [57, 60, 64]], [41, [57, 60, 65]], [43, [55, 59, 62]]], wave: 'sine' },
    desierto: { bpm: 104, prog: [[38, [53, 57, 62]], [39, [55, 58, 62]], [38, [53, 57, 62]], [33, [57, 61, 64]]], wave: 'square' },
    ciudad: { bpm: 122, prog: [[40, [55, 59, 64]], [36, [55, 60, 64]], [43, [55, 59, 62]], [38, [57, 62, 66]]], wave: 'sawtooth' },
    volcan: { bpm: 100, prog: [[36, [51, 55, 60]], [32, [51, 56, 60]], [34, [53, 58, 62]], [31, [50, 55, 58]]], wave: 'sawtooth' },
    retro: { bpm: 138, prog: [[48, [60, 64, 67]], [45, [57, 60, 64]], [41, [57, 60, 65]], [43, [55, 59, 62]]], wave: 'square', chip: true }
};
const mus_ = () => MUS[cfg.stad] || MUS.neon;
function musicStep(st, t, play) {
    const M = mus_(), bar = Math.floor(st / 16) % 4, s = st % 16, ch = M.prog[bar], sd = 60 / M.bpm / 4;
    const nt = (f, d, type, v, dst, fc) => {
        const o = mk(type, f), g = ac.createGain(); let out = g;
        if (fc) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = fc; g.connect(fl); out = fl; }
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); out.connect(dst || musicBus); o.start(t); o.stop(t + d + .03);
    };
    if (M.chip) {      // chiptune: arpegio rápido de onda cuadrada, bajo de pulso y ruido como batería
        const n = ch[1][s % 3] + (s % 6 < 3 ? 12 : 24);
        nt(mtof(n), sd * .9, 'square', play ? .045 : .032, null, 5200);
        if (play && s % 2 === 0) nt(mtof(ch[0] + (s % 8 === 6 ? 12 : 0)), sd * 1.7, 'square', .055, null, 900);
        if (play && (s === 4 || s === 12)) { const nb = ac.createBufferSource(), g2 = ac.createGain(); nb.buffer = noiseBuf; g2.gain.setValueAtTime(.12, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + .09); nb.connect(g2); g2.connect(musicBus); nb.start(t); nb.stop(t + .1); }
        if (play && s % 4 === 0) nt(70, sd * 1.2, 'triangle', .14, null, 400);
        return;
    }
    if (s === 0) ch[1].forEach(n => { nt(mtof(n), sd * 15, 'sawtooth', .035, null, 1100); nt(mtof(n) * 1.004, sd * 15, 'sawtooth', .025, null, 900); });
    const arp = [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 2, 1, 2, 1][s];
    if (s % 2 === 0 || play) nt(mtof(ch[1][arp] + 12), sd * 1.6, M.wave, play ? .06 : .045, null, 3000);
    if (play) {
        if ([0, 3, 6, 8, 11, 14].includes(s)) nt(mtof(ch[0] + (s === 14 ? 7 : 0)), sd * 2.2, 'sawtooth', .1, null, 420);
        if (s % 4 === 0) { const o = mk('sine', 140), g = ac.createGain(); o.frequency.exponentialRampToValueAtTime(42, t + .14); g.gain.setValueAtTime(.32, t); g.gain.exponentialRampToValueAtTime(0.0001, t + .18); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + .2); }
        if (s === 4 || s === 12) { const n = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); n.buffer = noiseBuf; fl.type = 'bandpass'; fl.frequency.value = 1900; g.gain.setValueAtTime(.16, t); g.gain.exponentialRampToValueAtTime(0.0001, t + .14); n.connect(fl); fl.connect(g); g.connect(musicBus); n.start(t, Math.random()); n.stop(t + .16); }
    }
    if (s % 2 === 0 || (play && s % 2 === 1 && Math.random() < .3)) { const n = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); n.buffer = noiseBuf; fl.type = 'highpass'; fl.frequency.value = 7500; g.gain.setValueAtTime(play ? .05 : .022, t); g.gain.exponentialRampToValueAtTime(0.0001, t + .04); n.connect(fl); fl.connect(g); g.connect(musicBus); n.start(t, Math.random()); n.stop(t + .05); }
}
function musicTick() {
    if (!ac || ac.state !== 'running') return;
    if (mus.next < ac.currentTime) mus.next = ac.currentTime + .05;
    const play = S.state === 'play' || S.state === 'goal' || S.state === 'count';
    while (mus.next < ac.currentTime + .2) {
        if (cfg.music && !cfg.mute) musicStep(mus.step, mus.next, play);
        mus.next += 60 / mus_().bpm / 4; mus.step++;
    }
}
// se llama cada fotograma: motores, turbo, multitud y volumen de la música
function audioUpdate(dt) {
    if (!ac || !eng) return;
    const t = ac.currentTime, w = S.world, st = S.state, active = st === 'play' || st === 'goal' || st === 'count';
    master.gain.setTargetAtTime(cfg.mute ? 0 : .9, t, .05);
    for (let i = 0; i < 2; i++) {
        const c = w.cars[i], e = eng[i], sp = Math.hypot(c.vx, c.vy), thr = Math.abs(i === 0 ? pInp.dir : S.ai.inp.dir);
        const elec = c.model === 'prisma', MP = { mula: .78, titan: .66, formula: 1.55 }[c.model] || 1;      // tono del motor de cada coche
        const r8 = cfg.stad === 'retro' && cfg.r8 !== false;      // en el estadio retro el motor suena a consola antigua
        if (elec !== e.elec || r8 !== e.r8) { e.elec = elec; e.r8 = r8; e.o1.type = r8 ? 'square' : elec ? 'triangle' : 'sawtooth'; e.o2.type = r8 ? 'square' : elec ? 'sine' : 'sawtooth'; e.o3.type = r8 ? 'triangle' : elec ? 'sine' : 'square'; }
        const fr = elec ? 190 + sp * .22 + thr * 20 + (c.boosting ? 60 : 0) : (46 + sp * .06 + thr * 7 + (c.boosting ? 16 + Math.min(c.bt || 0, 1.5) * 14 : 0)) * MP;
        e.o1.frequency.setTargetAtTime(fr, t, .07); e.o2.frequency.setTargetAtTime(fr * (elec ? 2.01 : 1.016), t, .07); e.o3.frequency.setTargetAtTime(fr * (elec ? .5 : .5), t, .07);
        const vol = (i === 0 ? .1 : .055) * (c.grounded ? 1 : .5) * (.3 + Math.min(1, sp / 900) * .7 + thr * .15) * (elec ? .7 : 1);
        e.bus.gain.setTargetAtTime(active && !cfg.mute && !c.ghost ? vol : 0, t, .08);      // el coche quitado no suena
        e.f.frequency.setTargetAtTime((elec ? 900 : 320) + sp * 1.2 + (c.boosting ? 700 : 0), t, .08);
        e.ng.gain.setTargetAtTime(c.boosting && active ? .55 : 0, t, .05);
        e.nf.frequency.setTargetAtTime(700 + sp * .9, t, .1);
        if (e.pan) e.pan.pan.setTargetAtTime(clamp((c.x - W / 2) / (W / 2), -1, 1) * .7, t, .05);
        if (c.boosting && !e.boosting && active) sfx(i === 0 ? 'ignite' : 'none');
        e.boosting = !!c.boosting;
    }
    const b = w.ball, bs = Math.hypot(b.vx, b.vy), near = Math.abs(b.x - W / 2) / (W / 2);
    cheer = Math.max(0, cheer - dt * .38); duck = Math.max(0, duck - dt);
    const lvl = st === 'menu' ? .012 : active ? .03 + .04 * Math.min(1, bs / 1600) + .03 * near * near : .01;
    crowdG.gain.setTargetAtTime(cfg.mute ? 0 : lvl + cheer * .28, t, .1);
    crowdF.frequency.setTargetAtTime(600 + cheer * 900 + bs * .15, t, .1);
    const mv = (Cm.busy ? .45 : 1) * (!cfg.music || cfg.mute ? 0 : st === 'menu' ? .2 : st === 'pause' ? .06 : duck > 0 ? .03 : st === 'end' ? .1 : .15);
    musicBus.gain.setTargetAtTime(mv, t, .15);
}
// vibración configurable por evento (goal, hit, boost, jump, btn, ui) e intensidad (suave / normal / fuerte)
let hk = 'ui';
const hapK = () => cfg.hapI === 'low' ? .6 : cfg.hapI === 'high' ? 1.5 : 1;
const hapOn = k => cfg.haptic && cfg.hap[k] !== false;
const buzz = (ms, kind) => {
    hk = kind || 'ui';
    if (!hapOn(hk)) return;
    const m = hapK(), v = Array.isArray(ms) ? ms.map(x => Math.round(x * m)) : Math.round(ms * m);
    try { if (navigator.vibrate) navigator.vibrate(v); } catch (e) { /* sin vibración */ }
    const tot = Array.isArray(v) ? v.reduce((a, b) => a + b, 0) : v;
    padRumble(Math.min(900, tot * 3), .45, .45);
};
// vibración del mando (dual-rumble); strong = motor grande, weak = motor pequeño
let rumbleT = 0;
function padRumble(ms, strong, weak) {
    if (!hapOn(hk) || !pad.on) return;
    strong = Math.min(1, strong * hapK()); weak = Math.min(1, weak * hapK());
    const now = performance.now(); if (now - rumbleT < 40) return; rumbleT = now;
    try {
        const g = padGet(), a = g && (g.vibrationActuator || (g.hapticActuators && g.hapticActuators[0]));
        if (!a) return;
        if (a.playEffect) a.playEffect('dual-rumble', { startDelay: 0, duration: Math.max(30, ms), weakMagnitude: Math.min(1, weak), strongMagnitude: Math.min(1, strong) });
        else if (a.pulse) a.pulse(Math.min(1, Math.max(strong, weak)), ms);
    } catch (e) { /* sin vibración en el mando */ }
}

// ---------- Comentarista (voz sintetizada del navegador) ----------
const Cm = { voice: null, last: 0, busy: false, said10: false };
const pickVoice = () => {
    try {
        const vs = speechSynthesis.getVoices();
        Cm.voice = vs.find(v => /^es[-_]ES/i.test(v.lang)) || vs.find(v => /^es/i.test(v.lang)) || null;
    } catch (e) { Cm.voice = null; }
};
try { if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } } catch (e) { /* sin voz */ }
const NUM = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
const pick = a => a[Math.floor(Math.random() * a.length)];
// prio 2 corta lo que se esté diciendo; prio 1 solo habla si hay silencio
function say(txt, prio, rate, pitch) {
    if (!cfg.comm || cfg.mute || !window.speechSynthesis) return;
    const now = performance.now();
    if (prio < 2 && (Cm.busy || now - Cm.last < 3200)) return;
    try {
        if (prio >= 2) speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(txt);
        u.lang = 'es-ES'; if (Cm.voice) u.voice = Cm.voice; u.rate = rate || 1.08; u.pitch = pitch || 1.05; u.volume = 1;
        u.onstart = () => { Cm.busy = true; };
        u.onend = u.onerror = () => { Cm.busy = false; Cm.last = performance.now(); };
        if (prio >= 2) setTimeout(() => { try { speechSynthesis.speak(u); } catch (e) { /* sin voz */ } }, 40); else speechSynthesis.speak(u);
    } catch (e) { Cm.busy = false; }
}
function stopSpeech() { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* sin voz */ } Cm.busy = false; }
function scoreWords() { const a = S.score[0], b = S.score[1], n = x => x <= 10 ? NUM[x] : String(x); return a === b ? n(a) + ' iguales' : n(a) + ' a ' + n(b); }
function commentGoal(scorer) {
    if (S.mode === 'free') { say(pick(['¡Goooool! ¡Qué golazo!', '¡Gol! ¡Así se hace!', '¡Qué definición!']), 2, 1.12, 1.3); return; }
    const a = S.score[0], b = S.score[1];
    let t;
    if (scorer === 0) t = pick(['¡Goooool del equipo azul!', '¡Gol, gol, gol! ¡Qué jugada!', '¡Goooool! ¡Qué definición, amigos!', '¡Golazo! ¡Espectacular!', '¡Madre mía, qué gol!', '¡Al fondo de la red! ¡Gol del azul!', '¡Qué manera de marcar! ¡Gooool!', '¡Se lo ha merecido! ¡Gol azul!']);
    else t = pick(['¡Gol del naranja! ¡Cuidado con la defensa!', '¡Ay! ¡Han marcado! ¡Hay que reaccionar!', '¡Gol de la IA! ¡Qué contra!', '¡Les ha pillado a contrapié! Gol naranja.', '¡Gol del rival! Toca levantar la cabeza.', '¡Uf, qué mala suerte! Marca el naranja.']);
    let extra = '';
    if (scorer === 0 && S.lastAerial) extra += ' ¡Y en el aire!';
    if (S.streak >= 3) extra += scorer === 0 ? ' ¡Es el tercero seguido! ¡Estás on fire!' : ' ¡Tercero seguido del rival! ¡Hay que parar esto!';
    else if (Math.abs(a - b) >= 4) extra += ' ¡Esto ya es una goleada!';
    if (S.ot) extra += ' ¡Y en el gol de oro!';
    else if (a === b) extra += ' ¡Empatan el partido!';
    else if (scorer === 0 && a - b === 1 && a + b > 1) extra += ' ¡Pasa a ponerse por delante!';
    else if (scorer === 1 && b - a === 1 && a + b > 1) extra += ' ¡Se adelanta el rival!';
    say(t + extra + ' ' + scoreWords() + '.', 2, 1.14, 1.3);
}
function commentEnd(b, o) {
    const n = x => x <= 10 ? NUM[x] : String(x);
    if (b > o) say('¡Final del partido! ¡Victoria del equipo azul por ' + n(b) + ' a ' + n(o) + '! ¡Enhorabuena!', 2, 1.05, 1.15);
    else if (b < o) say('¡Final del partido! Gana el naranja por ' + n(o) + ' a ' + n(b) + '. ¡Otra vez será!', 2, 1.0, .95);
    else say('¡Final del partido! Empate a ' + n(b) + '.', 2, 1.0, 1);
}
const reactT = {};
function react(key, txt, cd, rate, pitch) {
    const n = performance.now();
    if (S.mode !== 'match' || S.state !== 'play' || Cm.busy || n - Cm.last < 4500 || (reactT[key] && n - reactT[key] < (cd || 30) * 1000)) return;
    reactT[key] = n; say(txt, 1, rate || 1.1, pitch || 1.12);
}
function commentTick(dt, st) {
    if (st === 'play' && S.mode === 'match' && !S.ot) {
        const el = cfg.time - S.time;
        if (!Cm.half && S.time <= cfg.time / 2 && S.time > 12) { Cm.half = true; say('¡Mitad del partido! Va ' + scoreWords() + '.', 1, 1.05, 1.1); }
        else if (!Cm.s30 && S.time <= 30 && S.time > 12 && cfg.time > 60) { Cm.s30 = true; say('Quedan treinta segundos. ' + scoreWords() + '.', 1, 1.1, 1.15); }
        else if (!Cm.nil && el >= 50 && S.score[0] + S.score[1] === 0) { Cm.nil = true; say(pick(['Partido muy igualado, nadie perfora la red todavía.', 'Seguimos sin goles. ¡Qué tensión!']), 1, 1.05, 1.05); }
    }
    if (st === 'play' && S.mode === 'match' && !S.ot && S.time <= 10 && S.time > 0 && !Cm.said10) {
        Cm.said10 = true;
        say(S.score[0] === S.score[1] ? '¡Diez segundos! ¡Todo empatado!' : S.score[0] > S.score[1] ? '¡Diez segundos! ¡Aguanta, azul!' : '¡Diez segundos! ¡Todavía hay tiempo para remontar!', 2, 1.15, 1.2);
    }
}

