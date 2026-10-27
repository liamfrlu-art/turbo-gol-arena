'use strict';
/* Turbo Gol Arena: interfaz, joystick, render y bucle principal.
   La física vive en engine.js (window.TG) y los coches en cars.js (window.CARS). */
(() => {
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
        const tn = (CARS.TRAILS.find(t => t.id === 'ev_' + EV) || {}).name || '';
        $('evTask').textContent = p.done ? 'Reto completado: estela «' + tn + '» conseguida' : real ? 'Reto: marca ' + EV_GOALS + ' goles en partidos (' + p.g + '/' + EV_GOALS + ') · Premio: ' + EV_COINS + ' monedas y estela «' + tn + '»' : 'El reto solo cuenta en las fechas del evento';
        $('evGift').textContent = 'Balón del evento gratis en el Taller' + (real ? '' : ' (en sus fechas)');
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
        const t = ac.currentTime + (delay || 0), o = mk(type || 'sine', f), g = ac.createGain(), at = a || .004;
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
            if (elec !== e.elec) { e.elec = elec; e.o1.type = elec ? 'triangle' : 'sawtooth'; e.o2.type = elec ? 'sine' : 'sawtooth'; e.o3.type = elec ? 'sine' : 'square'; }
            const fr = elec ? 190 + sp * .22 + thr * 20 + (c.boosting ? 60 : 0) : (46 + sp * .06 + thr * 7 + (c.boosting ? 16 + Math.min(c.bt || 0, 1.5) * 14 : 0)) * MP;
            e.o1.frequency.setTargetAtTime(fr, t, .07); e.o2.frequency.setTargetAtTime(fr * (elec ? 2.01 : 1.016), t, .07); e.o3.frequency.setTargetAtTime(fr * (elec ? .5 : .5), t, .07);
            const vol = (i === 0 ? .1 : .055) * (c.grounded ? 1 : .5) * (.3 + Math.min(1, sp / 900) * .7 + thr * .15) * (elec ? .7 : 1);
            e.bus.gain.setTargetAtTime(active && !cfg.mute ? vol : 0, t, .08);
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
        audio();
        if (cfg.stadSel === 'random') { cfg.stad = pickStad(); resize(); }      // estadio nuevo en cada partida
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
        hideBanner(); updateHud(true); requestWake();
    }

    function toMenu() {
        if (S.net) netLeave();
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
        $('pLvl').textContent = 'Nivel ' + L; $('pCoins').textContent = wallet.coins + ' monedas'; evUI();
        $('pBar').style.width = (clamp((wallet.xp - a) / (bnd - a), 0, 1) * 100).toFixed(0) + '%';
        $('pXp').textContent = (wallet.xp - a) + ' / ' + (bnd - a) + ' XP para el nivel ' + (L + 1);
        const mu = Object.keys(MUT_N).filter(k => cfg.mut[k]);
        $('cfgSum').innerHTML = '<span>' + DN[cfg.diff] + '</span><span>' + Math.round(cfg.time / 60) + ' min</span>' + mu.map(k => '<span class="mu">' + MUT_N[k] + '</span>').join('');
        $('stats').textContent = (record.w + record.l) ? 'Balance: ' + record.w + ' victorias, ' + record.l + ' derrotas' : 'Aún no has jugado ningún partido.';
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
        if (force || hudCache.sb !== S.score[0]) { $('sb').textContent = S.score[0]; hudCache.sb = S.score[0]; }
        if (force || hudCache.so !== S.score[1]) { $('so').textContent = S.score[1]; hudCache.so = S.score[1]; }
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
        $('drillBar').style.display = S.mode === 'drill' && S.state !== 'menu' ? 'block' : 'none';
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
    }
    function renderTrain() {
        $('train').querySelectorAll('.stars').forEach(el => { const n = drillBest[el.dataset.s] || 0; el.textContent = '★'.repeat(n) + '☆'.repeat(3 - n); });
    }
    function goal(scorer) {
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
        const w = S.world, al = S.alpha == null ? 1 : S.alpha;
        if (al >= 1 || S.state === 'pause') return;
        for (const o of w.ball2 ? [...w.cars, w.ball, w.ball2] : [...w.cars, w.ball]) {
            if (o.px == null || Math.abs(o.x - o.px) > 160 || Math.abs(o.y - o.py) > 160) continue;
            interpSave.push([o, o.x, o.y, o.a]);
            o.x = o.px + (o.x - o.px) * al; o.y = o.py + (o.y - o.py) * al;
            if (o.pa != null) { let da = o.a - o.pa; da -= TAU * Math.round(da / TAU); o.a = o.pa + da * al; }
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
        boostEl.style.setProperty('--p', (w.cars[0].boost / w.cars[0].st.boostMax * 100).toFixed(1));
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
                    for (const cc of w.cars) if (cc.pid === e[5]) cc.hitAt = performance.now();
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

    // ---------- Render: capa estática ----------
    let dpr = 1, cw = 0, ch = 0, sc = 1, ox = 0, oy = 0;
    const staticCv = document.createElement('canvas'), sctx = staticCv.getContext('2d');
    const vigCv = document.createElement('canvas'), bloomCv = document.createElement('canvas'), bctx = bloomCv.getContext('2d'), bloom2Cv = document.createElement('canvas'), b2ctx = bloom2Cv.getContext('2d');
    const crowdPts = []; let cb = null, cbKey = -1;
    const BY = 334, BH = 34;           // pantalla LED

    function rr(c, x, y, w, h, r) {
        c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }
    function arenaPath(c) {
        const p = T.pts; c.beginPath(); c.moveTo(p[0][0], p[0][1]);
        for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]);
        c.closePath();
    }
    function pent(c, r) {
        c.beginPath();
        for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5, x = Math.cos(a) * r, y = Math.sin(a) * r; i ? c.lineTo(x, y) : c.moveTo(x, y); }
        c.closePath();
    }

    function resize() {
        dpr = Math.min(Math.max(window.devicePixelRatio || 1, Q.minDpr || 0), Q.dpr);
        cw = cv.clientWidth; ch = cv.clientHeight;
        if (!cw || !ch) return;
        cv.width = staticCv.width = vigCv.width = Math.round(cw * dpr); cv.height = staticCv.height = vigCv.height = Math.round(ch * dpr);
        bloomCv.width = Math.max(2, Math.round(cv.width / 4)); bloomCv.height = Math.max(2, Math.round(cv.height / 4));
        bloom2Cv.width = Math.max(2, Math.round(cv.width / 10)); bloom2Cv.height = Math.max(2, Math.round(cv.height / 10));
        sc = Math.min(cw / (W + 2 * GD + 40), ch / (H + 24));
        ox = (cw - (W + 2 * GD) * sc) / 2 + GD * sc; oy = (ch - H * sc) / 2;
        drawStatic(); drawEventStatic(); drawVignette();
    }

    function drawVignette() {
        const g = vigCv.getContext('2d'), w = vigCv.width, h = vigCv.height;
        g.clearRect(0, 0, w, h);
        const r = g.createRadialGradient(w / 2, h * .55, Math.min(w, h) * .38, w / 2, h * .55, Math.max(w, h) * .72);
        r.addColorStop(0, 'rgba(0,0,10,0)'); r.addColorStop(1, 'rgba(0,0,10,.62)');
        g.fillStyle = r; g.fillRect(0, 0, w, h);
    }

    // ---------- Temas nuevos: desierto, ciudad nocturna y volcán ----------
    const THEME_FLOOR = {
        snow: { a: '#cfe9ff', b: '#9cc9ee', c: '#6aa2d6', line: 'rgba(255,255,255,.28)', mark: 'rgba(255,255,255,.35)' },
        desierto: { a: '#efcf96', b: '#d9a96a', c: '#a97b45', line: 'rgba(120,70,20,.22)', mark: 'rgba(110,60,15,.3)' },
        ciudad: { a: '#56607e', b: '#38405c', c: '#1d2338', line: 'rgba(140,160,230,.22)', mark: 'rgba(180,200,255,.18)' },
        volcan: { a: '#523434', b: '#2e1b1c', c: '#170b0d', line: 'rgba(255,110,40,.3)', mark: 'rgba(255,110,40,.22)' },
        retro: { a: '#2a0f4a', b: '#1a0833', c: '#0b0420', line: 'rgba(255,60,200,.55)', mark: 'rgba(60,240,255,.16)' }
    };
    const THEME_RAMP = { snow: ['#8cb9e8', '#4a7bb8'], desierto: ['#cf9358', '#8d5a2c'], ciudad: ['#3c4766', '#1b2134'], volcan: ['#5c3a38', '#241216'], retro: ['#3a1a6a', '#140830'] };
    // grada con estructura: escalones, valla, techo, focos y aficionados variados (peinados, gorros, bufandas); distinta en cada estadio
    function stand(c, rnd, hx, hw, team, style) {
        const hy = 596, rows = 5, rh = 21, hh = rows * rh + 30, rgb = team === 0 ? '61,184,255' : '255,138,43', tc = team === 0 ? ['#2a8fd1', '#3db8ff', '#79d2ff'] : ['#d9701a', '#ff8a2b', '#ffb066'];
        const ST = {
            snow: { wall: '#3a2a22', wall2: '#241a2b', step: ['#5a4234', '#3a2a22'], roof: '#4a3427', post: '#6b4a36', hat: ['#f1f4ff', '#3db8ff', '#ff8a2b', '#7a5acb'] },
            desierto: { wall: '#7a4430', wall2: '#4a2418', step: ['#a86a48', '#6a3a28'], roof: '#c98a54', post: '#5a3322', hat: ['#f4e3c0', '#c0442c', '#3a2a22', '#ffd23f'] },
            ciudad: { wall: '#222a63', wall2: '#0e1235', step: ['#38428a', '#1a2050'], roof: '#2e3680', post: '#6e7ad0', hat: ['#ff3df0', '#3dfff0', '#ffd23f', '#f1f4ff'] },
            volcan: { wall: '#3a1c18', wall2: '#1a0a09', step: ['#5a2c22', '#2a1210'], roof: '#4a2018', post: '#2a1a14', hat: ['#1a0a09', '#ff8a2b', '#ffd23f', '#6a2a1a'] }
        }[style] || ST_DEF;
        // estructura: muro trasero con textura, escalones y valla
        const wg = c.createLinearGradient(0, hy - hh, 0, hy); wg.addColorStop(0, ST.wall); wg.addColorStop(1, ST.wall2);
        c.fillStyle = wg; c.fillRect(hx, hy - hh, hw, hh);
        c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 1;
        if (style === 'snow') for (let x = hx + 12; x < hx + hw; x += 12) { c.beginPath(); c.moveTo(x, hy - hh); c.lineTo(x, hy); c.stroke(); }
        else if (style === 'desierto') for (let y = hy - hh + 14; y < hy; y += 14) { c.beginPath(); c.moveTo(hx, y); c.lineTo(hx + hw, y); c.stroke(); }
        else if (style === 'ciudad') { c.strokeStyle = 'rgba(120,140,255,.22)'; for (let x = hx + 30; x < hx + hw; x += 30) { c.beginPath(); c.moveTo(x, hy - hh); c.lineTo(x, hy); c.stroke(); } }
        else for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(0,0,0,' + (.08 + rnd() * .16).toFixed(2) + ')'; c.beginPath(); c.ellipse(hx + rnd() * hw, hy - hh + rnd() * hh, 6 + rnd() * 10, 3 + rnd() * 5, rnd() * 3, 0, TAU); c.fill(); }
        const skin = ['#e0b896', '#b98a66', '#f0cfae', '#7a5640', '#d9a37a'], hair = ['#1a1410', '#4a2e1a', '#c9a24a', '#8a3a1a', '#d8d8d8'];
        for (let r = rows - 1; r >= 0; r--) {
            const y = hy - 30 - r * rh, dark = .08 + r * .09;
            const sg = c.createLinearGradient(0, y + 9, 0, y + rh); sg.addColorStop(0, ST.step[0]); sg.addColorStop(1, ST.step[1]); c.fillStyle = sg; c.fillRect(hx + 4 + r * 3, y + 9, hw - 8 - r * 6, rh - 3);
            c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(hx + 4 + r * 3, y + 9, hw - 8 - r * 6, 1.5);
            for (let x = hx + 16 + r * 3; x < hx + hw - 14 - r * 3; x += 11 + rnd() * 4) {
                const px = x + (rnd() - .5) * 3, big = .9 + rnd() * .25, shirt = rnd() < .22 ? '#f1f4ff' : tc[(rnd() * 3) | 0];
                c.fillStyle = shirt; rr(c, px - 4.5 * big, y + 1, 9 * big, 10 * big, 3); c.fill();
                if (rnd() < .45) { c.fillStyle = 'rgb(' + rgb + ')'; c.fillRect(px - 4 * big, y + 1.2, 8 * big, 2.2); c.fillRect(px + 1.6 * big, y + 2, 2.2, 6); }    // bufanda
                c.fillStyle = skin[(rnd() * 5) | 0]; c.beginPath(); c.arc(px, y - 2.6, 3.9 * big, 0, TAU); c.fill();
                const k = rnd();
                if (EV && k < .55) evHat(c, px, y - 2.6, big);
                else if (k < .38) { c.fillStyle = hair[(rnd() * 5) | 0]; c.beginPath(); c.arc(px, y - 3.4, 3.9 * big, Math.PI * 1.02, Math.PI * 1.98); c.fill(); }
                else if (k < .66) { c.fillStyle = ST.hat[(rnd() * 4) | 0]; c.beginPath(); c.arc(px, y - 3.6, 4.2 * big, Math.PI, TAU); c.fill(); c.fillRect(px - 4.4 * big, y - 3.8, 8.8 * big, 1.5); if (style === 'snow') { c.fillStyle = '#fff'; c.beginPath(); c.arc(px, y - 8, 1.5, 0, TAU); c.fill(); } }
                c.fillStyle = 'rgba(0,0,12,' + dark.toFixed(2) + ')'; c.beginPath(); c.arc(px, y - 2, 5.5 * big, 0, TAU); c.fill();
                if (rnd() < .5) crowdPts.push([px, y - 3]);
            }
        }
        // valla frontal con panel del equipo
        c.fillStyle = '#0d1126'; c.fillRect(hx - 2, hy - 14, hw + 4, 14);
        c.fillStyle = 'rgba(' + rgb + ',.95)'; c.fillRect(hx - 2, hy - 14, hw + 4, 3); c.fillRect(hx - 2, hy - 3, hw + 4, 3);
        c.fillStyle = 'rgba(255,255,255,.55)'; for (let x = hx + 8; x < hx + hw - 6; x += 26) c.fillRect(x, hy - 10, 14, 4);
        // techo con postes y focos
        const rg = c.createLinearGradient(0, hy - hh - 18, 0, hy - hh); rg.addColorStop(0, ST.roof); rg.addColorStop(1, ST.wall2);
        c.fillStyle = ST.post; c.fillRect(hx - 6, hy - hh - 6, 7, hh + 6); c.fillRect(hx + hw - 1, hy - hh - 6, 7, hh + 6); c.fillRect(hx + hw / 2 - 3, hy - hh - 6, 6, hh * .5);
        if (style === 'snow') {
            c.fillStyle = '#4a3427'; c.beginPath(); c.moveTo(hx - 20, hy - hh); c.lineTo(hx + hw / 2, hy - hh - 50); c.lineTo(hx + hw + 20, hy - hh); c.closePath(); c.fill();
            c.fillStyle = '#eef4ff'; c.beginPath(); c.moveTo(hx - 24, hy - hh + 2); c.lineTo(hx + hw / 2, hy - hh - 56); c.lineTo(hx + hw + 24, hy - hh + 2); c.quadraticCurveTo(hx + hw / 2, hy - hh - 34, hx - 24, hy - hh + 2); c.fill();
            for (let x = hx - 6; x < hx + hw + 8; x += 18) { c.fillStyle = 'rgba(255,225,150,.95)'; c.beginPath(); c.arc(x, hy - hh + 6 + Math.sin(x * .2) * 3, 2, 0, TAU); c.fill(); const gl = c.createRadialGradient(x, hy - hh + 6, 0, x, hy - hh + 6, 9); gl.addColorStop(0, 'rgba(255,200,100,.5)'); gl.addColorStop(1, 'rgba(255,200,100,0)'); c.fillStyle = gl; c.fillRect(x - 9, hy - hh - 3, 18, 18); }
        } else if (style === 'desierto') {
            c.fillStyle = rg; c.fillRect(hx - 14, hy - hh - 16, hw + 28, 18);
            for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? '#c0442c' : '#f4e3c0'; c.beginPath(); c.moveTo(hx - 14 + i * (hw + 28) / 9, hy - hh + 2); c.lineTo(hx - 14 + (i + 1) * (hw + 28) / 9, hy - hh + 2); c.lineTo(hx - 14 + (i + .5) * (hw + 28) / 9, hy - hh + 14); c.closePath(); c.fill(); }
        } else if (style === 'ciudad') {
            c.fillStyle = rg; c.fillRect(hx - 14, hy - hh - 18, hw + 28, 20);
            c.save(); c.shadowColor = 'rgb(' + rgb + ')'; c.shadowBlur = 12; c.fillStyle = 'rgba(' + rgb + ',.95)'; c.fillRect(hx - 14, hy - hh - 3, hw + 28, 3); c.restore();
            for (let x = hx + 20; x < hx + hw - 10; x += 60) { c.fillStyle = '#9aa8ff'; c.fillRect(x - 3, hy - hh - 26, 6, 9); const gl = c.createRadialGradient(x, hy - hh - 22, 0, x, hy - hh - 22, 20); gl.addColorStop(0, 'rgba(200,215,255,.7)'); gl.addColorStop(1, 'rgba(200,215,255,0)'); c.fillStyle = gl; c.fillRect(x - 20, hy - hh - 42, 40, 40); }
        } else {
            c.fillStyle = rg; c.fillRect(hx - 12, hy - hh - 14, hw + 24, 16);
            for (const tx of [hx - 4, hx + hw + 4, hx + hw / 2]) {
                c.fillStyle = '#2a1a14'; c.fillRect(tx - 2, hy - hh - 8, 4, 24);
                const gl = c.createRadialGradient(tx, hy - hh - 16, 1, tx, hy - hh - 16, 30); gl.addColorStop(0, 'rgba(255,230,140,.95)'); gl.addColorStop(.35, 'rgba(255,120,30,.6)'); gl.addColorStop(1, 'rgba(255,60,10,0)'); c.fillStyle = gl; c.fillRect(tx - 30, hy - hh - 46, 60, 60);
            }
        }
        c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(hx - 12, hy - hh - 14, hw + 24, 2);
    }
    const ST_DEF = { wall: '#3a2a22', wall2: '#241a2b', step: ['#5a4234', '#3a2a22'], roof: '#4a3427', post: '#6b4a36', hat: ['#f1f4ff', '#3db8ff', '#ff8a2b', '#7a5acb'] };
    // ---------- Estadio retro: pixel art de los 80 (se pinta en un lienzo pequeño y se amplía sin suavizar) ----------
    const RPX = 6;      // tamaño de cada píxel en unidades del mundo
    function retroBackdrop(c, rnd, X0, XW) {
        const pw = Math.ceil(XW / RPX), ph = Math.ceil(H / RPX), pc = document.createElement('canvas'); pc.width = pw; pc.height = ph;
        const p = pc.getContext('2d'), px = (x, y, w, h, col) => { p.fillStyle = col; p.fillRect(x | 0, y | 0, w | 0, h | 0); };
        const toPx = x => Math.round((x - X0) / RPX), HZ = 97;      // horizonte (en píxeles)
        // cielo en franjas con tramado de consola
        const SK = [[0, '#0d0828'], [30, '#170c3e'], [52, '#2a0f5a'], [66, '#4f1777'], [77, '#8a2280'], [86, '#d23c72'], [92, '#ff7a4a']];
        for (let i = 0; i < SK.length; i++) {
            const y0 = SK[i][0], y1 = i + 1 < SK.length ? SK[i + 1][0] : HZ;
            px(0, y0, pw, y1 - y0, SK[i][1]);
            if (i + 1 < SK.length) for (let x = 0; x < pw; x++) { if ((x & 1) === 0) px(x, y1 - 1, 1, 1, SK[i + 1][1]); if ((x & 1) === 1) px(x, y1, 1, 1, SK[i][1]); }
        }
        for (let i = 0; i < 90; i++) { const x = (rnd() * pw) | 0, y = (rnd() * 58) | 0; px(x, y, 1, 1, rnd() < .25 ? '#ffe98a' : rnd() < .5 ? '#9fd8ff' : '#ffffff'); if (rnd() < .08) { px(x - 1, y, 3, 1, '#ffffff'); px(x, y - 1, 1, 3, '#ffffff'); } }
        // sol de rayas
        const sx = toPx(W / 2), sy = 82, R = 24, SC = ['#ffe85a', '#ffc23a', '#ff9a3a', '#ff6a5a', '#ff3d8a'];
        for (let y = -R; y <= 0; y++) {
            const w = Math.round(Math.sqrt(R * R - y * y)), k = Math.min(4, Math.floor((y + R) / (R / 5)));
            if (y > -10 && (y + 20) % 4 < (y > -5 ? 2 : 1)) continue;          // huecos de las rayas
            px(sx - w, sy + y, w * 2, 1, SC[k]);
        }
        // montañas en dos capas con borde rosa
        for (const L of [[78, 14, .07, 1.3, '#3a1a6a', '#ff5ad8'], [88, 10, .11, 4.2, '#24104a', '#b04aff']]) {
            for (let x = 0; x < pw; x++) {
                const h = Math.round(L[1] * (.55 + .45 * Math.sin(x * L[2] + L[3])) * (.6 + .4 * Math.abs(Math.sin(x * L[2] * 2.3 + L[3]))));
                const top = L[0] - h; px(x, top, 1, HZ - top, L[4]); px(x, top, 1, 1, L[5]);
            }
        }
        // ciudad pixelada a los lados (deja libre el centro con el sol)
        for (const [a, b] of [[0, toPx(380)], [toPx(1120), pw]]) {
            for (let x = a; x < b;) {
                const bw = 4 + ((rnd() * 7) | 0), bh = 6 + ((rnd() * 18) | 0), top = HZ - bh;
                px(x, top, bw, bh, rnd() < .5 ? '#160a30' : '#1d0f3c');
                for (let wy = top + 2; wy < HZ - 1; wy += 2) for (let wx = x + 1; wx < x + bw - 1; wx += 2) if (rnd() < .3) px(wx, wy, 1, 1, rnd() < .7 ? '#ffd23f' : '#5ad8ff');
                if (rnd() < .2) { px(x + (bw >> 1), top - 3, 1, 3, '#160a30'); px(x + (bw >> 1), top - 4, 1, 1, '#ff3d3d'); }
                x += bw + ((rnd() * 2) | 0);
            }
        }
        // llanura de neón hasta el suelo
        px(0, HZ, pw, ph - HZ, '#140628');
        for (let y = HZ + 1, k = 1; y < ph; k++, y += k) px(0, y, pw, 1, '#5a1a8a');
        const cx = toPx(W / 2); for (let i = -12; i <= 12; i++) { for (let y = HZ; y < ph; y++) { const x = Math.round(cx + i * 4 * (1 + (y - HZ) * .35)); if (x >= 0 && x < pw) px(x, y, 1, 1, '#7a2ab0'); } }
        // nubes pixeladas
        for (let i = 0; i < 5; i++) { const x = (rnd() * pw) | 0, y = 12 + ((rnd() * 34) | 0), w = 8 + ((rnd() * 10) | 0); px(x, y, w, 2, '#3a2a7a'); px(x + 2, y - 1, w - 4, 1, '#4a3a8a'); px(x + 1, y + 2, w - 2, 1, '#2a1a5a'); }
        // gradas de píxeles con público
        for (const [hx, team] of [[390, 0], [860, 1]]) {
            const x0 = toPx(hx), w = Math.round(250 / RPX), base = Math.round(596 / RPX), tc = team === 0 ? ['#2a8fd1', '#3db8ff', '#79d2ff'] : ['#d9701a', '#ff8a2b', '#ffb066'];
            px(x0 - 1, base - 23, w + 2, 23, '#22224a'); px(x0 - 1, base - 23, w + 2, 1, '#6a6aaa');
            px(x0 - 2, base - 25, w + 4, 2, '#3a3a6a'); for (let i = 0; i < w + 4; i += 3) px(x0 - 2 + i, base - 26, 1, 1, (i / 3) % 2 ? '#ffd23f' : '#ffffff');
            px(x0 - 2, base - 23, 1, 23, '#4a4a7a'); px(x0 + w + 1, base - 23, 1, 23, '#4a4a7a');
            for (let r = 0; r < 5; r++) {
                const y = base - 4 - r * 4;
                px(x0 + r, y + 2, w - r * 2, 1, r % 2 ? '#2e2e5a' : '#36366a');
                for (let x = x0 + 1 + r; x < x0 + w - 1 - r; x += 3) {
                    const shirt = rnd() < .2 ? '#f1f4ff' : tc[(rnd() * 3) | 0];
                    px(x, y, 2, 2, shirt); px(x, y - 1, 2, 1, ['#f0cfae', '#b98a66', '#e0b896', '#7a5640'][(rnd() * 4) | 0]);
                    if (rnd() < .3) px(x, y - 2, 2, 1, ['#1a1410', '#4a2e1a', '#c9a24a', '#ff3d3d'][(rnd() * 4) | 0]);
                    if (rnd() < .5) crowdPts.push([X0 + (x + 1) * RPX, (y - 1) * RPX]);
                }
            }
            px(x0 - 2, base - 2, w + 4, 2, team === 0 ? '#3db8ff' : '#ff8a2b');
        }
        c.save(); c.imageSmoothingEnabled = false; c.drawImage(pc, X0, 0, pw * RPX, ph * RPX); c.restore();
    }
    function themeBackdrop(c, TH, rnd, X0, XW) {
        if (TH === 'retro') { retroBackdrop(c, rnd, X0, XW); return; }
        const band = (stops, y0, y1) => { const g = c.createLinearGradient(0, y0, 0, y1); stops.forEach(s => g.addColorStop(s[0], s[1])); c.fillStyle = g; c.fillRect(X0, y0, XW, y1 - y0); };
        const ridgeFill = (b, a, f, ph, col, step) => { c.beginPath(); c.moveTo(X0, H); for (let x = X0; x <= W + GD; x += step || 8) c.lineTo(x, b - a * (.55 + .45 * Math.sin(x * f + ph)) * (.65 + .35 * Math.sin(x * f * 2.1 + ph * 1.6))); c.lineTo(W + GD, H); c.closePath(); c.fillStyle = col; c.fill(); };
        if (TH === 'desierto') {
            band([[0, '#1c2a6e'], [.38, '#7a3f92'], [.72, '#f0805a'], [1, '#ffcf86']], 0, H);
            for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,255,255,' + (.15 + rnd() * .35).toFixed(2) + ')'; c.fillRect(X0 + rnd() * XW, rnd() * 230, 1.6, 1.6); }
            const sun = c.createRadialGradient(W * .5, 470, 6, W * .5, 470, 380); sun.addColorStop(0, 'rgba(255,245,200,1)'); sun.addColorStop(.18, 'rgba(255,205,120,.85)'); sun.addColorStop(1, 'rgba(255,150,90,0)'); c.fillStyle = sun; c.fillRect(X0, 0, XW, H);
            c.fillStyle = '#fff2c4'; c.beginPath(); c.arc(W * .5, 470, 74, Math.PI, 0); c.fill();
            for (let i = 0; i < 6; i++) { const cx = rnd() * W, cy = 100 + rnd() * 220, rw = 120 + rnd() * 160; const g = c.createRadialGradient(cx, cy, 4, cx, cy, rw); g.addColorStop(0, 'rgba(255,180,160,.3)'); g.addColorStop(1, 'rgba(255,180,160,0)'); c.save(); c.translate(cx, cy); c.scale(1, .16); c.translate(-cx, -cy); c.fillStyle = g; c.fillRect(cx - rw, cy - rw, rw * 2, rw * 2); c.restore(); }
            for (const m of [[120, 90, 160, '#8c3f55'], [560, 70, 120, '#8c3f55'], [1010, 110, 190, '#7a3350'], [1370, 80, 130, '#8c3f55']]) {      // mesetas
                c.fillStyle = m[3]; c.beginPath(); c.moveTo(m[0] - m[2] * .6, 540); c.lineTo(m[0] - m[2] * .42, 540 - m[1]); c.lineTo(m[0] + m[2] * .42, 540 - m[1]); c.lineTo(m[0] + m[2] * .6, 540); c.closePath(); c.fill();
                c.fillStyle = 'rgba(255,170,120,.25)'; c.fillRect(m[0] - m[2] * .42, 540 - m[1], m[2] * .84, 6);
            }
            ridgeFill(500, 70, .006, 1.2, '#d98a52'); ridgeFill(545, 60, .0085, 3.1, '#c4733f'); ridgeFill(590, 40, .012, 2.2, '#a85c32');
            c.strokeStyle = 'rgba(255,215,160,.35)'; c.lineWidth = 1.4; for (let i = 0; i < 18; i++) { const x = rnd() * W, y = 520 + rnd() * 70; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 25, y - 4, x + 60, y); c.stroke(); }
            const cactus = (x, y, k) => { c.fillStyle = '#2f6b3c'; rr(c, x - 6 * k, y - 70 * k, 12 * k, 70 * k, 6 * k); c.fill(); rr(c, x - 24 * k, y - 48 * k, 10 * k, 30 * k, 5 * k); c.fill(); rr(c, x - 24 * k, y - 26 * k, 22 * k, 9 * k, 4 * k); c.fill(); rr(c, x + 14 * k, y - 58 * k, 10 * k, 32 * k, 5 * k); c.fill(); rr(c, x + 2 * k, y - 34 * k, 22 * k, 9 * k, 4 * k); c.fill(); c.fillStyle = 'rgba(255,255,255,.16)'; c.fillRect(x - 2 * k, y - 66 * k, 2.6 * k, 60 * k); };
            cactus(80, 596, 1.1); cactus(300, 600, .8); cactus(1180, 598, .9); cactus(1420, 596, 1.15);
            stand(c, rnd, 390, 250, 0, 'desierto'); stand(c, rnd, 860, 250, 1, 'desierto');
        } else if (TH === 'ciudad') {
            band([[0, '#04061a'], [.45, '#141050'], [.8, '#4a2468'], [1, '#8a3a7a']], 0, H);
            for (let i = 0; i < 70; i++) { c.fillStyle = 'rgba(255,255,255,' + (.2 + rnd() * .5).toFixed(2) + ')'; c.fillRect(X0 + rnd() * XW, rnd() * 300, 1.6, 1.6); }
            const mn = c.createRadialGradient(1180, 120, 4, 1180, 120, 120); mn.addColorStop(0, 'rgba(255,255,255,.55)'); mn.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = mn; c.fillRect(1000, 0, 360, 280);
            c.fillStyle = '#f4f1e4'; c.beginPath(); c.arc(1180, 120, 34, 0, TAU); c.fill(); c.fillStyle = 'rgba(160,160,190,.45)'; c.beginPath(); c.arc(1168, 112, 7, 0, TAU); c.arc(1192, 132, 5, 0, TAU); c.arc(1180, 100, 4, 0, TAU); c.fill();
            const layers = [['#1a1f55', 220, 120, .6], ['#10143c', 280, 170, .8], ['#090b26', 330, 230, 1]];
            const signs = ['255,60,200', '60,240,255', '255,210,60', '120,255,120'];
            layers.forEach((L, k) => {
                for (let x = X0; x < W + GD; ) {
                    const bw = 44 + rnd() * 60, bh = L[2] * (.45 + rnd() * .85), top = 596 - bh;
                    c.fillStyle = L[0]; c.fillRect(x, top, bw, bh + 4);
                    if (rnd() < .25) { c.fillRect(x + bw * .45, top - 16, 3, 16); c.fillStyle = 'rgba(255,60,60,.9)'; c.fillRect(x + bw * .45 - 1, top - 18, 5, 3); c.fillStyle = L[0]; }
                    for (let wy = top + 8; wy < 586; wy += 11) for (let wx = x + 6; wx < x + bw - 8; wx += 9) if (rnd() < .34 * L[3] + .06) { c.fillStyle = rnd() < .85 ? 'rgba(255,226,140,' + (.35 + rnd() * .5).toFixed(2) + ')' : 'rgba(140,220,255,.7)'; c.fillRect(wx, wy, 4.5, 6); }
                    if (k > 0 && rnd() < .3) { const sc2 = signs[(rnd() * 4) | 0]; c.save(); c.shadowColor = 'rgb(' + sc2 + ')'; c.shadowBlur = 14; c.fillStyle = 'rgba(' + sc2 + ',.95)'; c.fillRect(x + 6, top + 14 + rnd() * 20, 7, 30 + rnd() * 40); c.restore(); }
                    x += bw + 2 + rnd() * 6;
                }
                const hz = c.createLinearGradient(0, 440 + k * 40, 0, 600); hz.addColorStop(0, 'rgba(120,60,150,0)'); hz.addColorStop(1, 'rgba(160,70,160,' + (.18 + k * .06) + ')'); c.fillStyle = hz; c.fillRect(X0, 440, XW, 160);
            });
            stand(c, rnd, 390, 250, 0, 'ciudad'); stand(c, rnd, 860, 250, 1, 'ciudad');
        } else {   // volcán
            band([[0, '#140404'], [.4, '#4a0f08'], [.75, '#b83a0c'], [1, '#ff8a2a']], 0, H);
            const gl = c.createRadialGradient(W / 2, 285, 6, W / 2, 285, 520); gl.addColorStop(0, 'rgba(255,200,90,.9)'); gl.addColorStop(.25, 'rgba(255,100,20,.5)'); gl.addColorStop(1, 'rgba(255,60,10,0)'); c.fillStyle = gl; c.fillRect(X0, 0, XW, H);
            ridgeFill(470, 120, .005, 2.4, '#3a1510'); 
            c.fillStyle = '#1f0c0a'; c.beginPath(); c.moveTo(W / 2 - 400, 600); c.lineTo(W / 2 - 78, 300); c.lineTo(W / 2 - 46, 284); c.lineTo(W / 2 + 46, 284); c.lineTo(W / 2 + 78, 300); c.lineTo(W / 2 + 400, 600); c.closePath(); c.fill();
            c.fillStyle = 'rgba(255,170,60,.95)'; c.beginPath(); c.ellipse(W / 2, 285, 50, 8, 0, 0, TAU); c.fill();
            c.save(); c.shadowColor = '#ff7a1a'; c.shadowBlur = 16; c.strokeStyle = 'rgba(255,140,40,.95)'; c.lineWidth = 5; c.lineCap = 'round';
            for (const L of [[-18, 300, -95, 440, -140, 596], [14, 300, 40, 430, 110, 596], [30, 296, 150, 400, 250, 590]]) { c.beginPath(); c.moveTo(W / 2 + L[0], L[1]); c.bezierCurveTo(W / 2 + L[2], L[3] - 40, W / 2 + L[2] * 1.2, L[3] + 40, W / 2 + L[4], L[5]); c.stroke(); }
            c.restore();
            ridgeFill(540, 60, .008, 1.1, '#2a100c'); ridgeFill(590, 40, .012, 3.3, '#190908');
            for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,' + (140 + rnd() * 80 | 0) + ',50,' + (.4 + rnd() * .5).toFixed(2) + ')'; c.fillRect(X0 + rnd() * XW, 150 + rnd() * 400, 2, 2); }
            stand(c, rnd, 390, 250, 0, 'volcan'); stand(c, rnd, 860, 250, 1, 'volcan');
        }
    }

    // ---------- Estadio nevado (diseño propio, estilo "arena de montaña") ----------
    function drawSnow() {
        const c = sctx, TRr = T.TR, TH = ['desierto', 'ciudad', 'volcan', 'retro'].indexOf(cfg.stad) >= 0 ? cfg.stad : 'snow', FP = THEME_FLOOR[TH];
        c.setTransform(1, 0, 0, 1, 0, 0);
        // exterior del marco: azul noche con estrellas
        const out = c.createLinearGradient(0, 0, 0, staticCv.height); out.addColorStop(0, '#070b24'); out.addColorStop(1, '#03050f');
        c.fillStyle = out; c.fillRect(0, 0, staticCv.width, staticCv.height);
        c.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
        let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        crowdPts.length = 0;
        const X0 = -GD, XW = W + 2 * GD;

        c.save(); arenaPath(c); c.clip();
        if (TH !== 'snow') themeBackdrop(c, TH, rnd, X0, XW); else {
        // cielo al atardecer
        const sky = c.createLinearGradient(0, 0, 0, H - 60);
        sky.addColorStop(0, '#26468f'); sky.addColorStop(.45, '#6f95d2'); sky.addColorStop(.8, '#e4b4b0'); sky.addColorStop(1, '#f3c7a4');
        c.fillStyle = sky; c.fillRect(X0, 0, XW, H);
        const sun = c.createRadialGradient(W * .62, 470, 10, W * .62, 470, 420);
        sun.addColorStop(0, 'rgba(255,225,190,.75)'); sun.addColorStop(1, 'rgba(255,200,170,0)');
        c.fillStyle = sun; c.fillRect(X0, 0, XW, H);
        for (let i = 0; i < 7; i++) {   // nubes suaves
            const cx = rnd() * W, cy = 120 + rnd() * 190, rw = 90 + rnd() * 120;
            const g = c.createRadialGradient(cx, cy, 4, cx, cy, rw); g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(1, 'rgba(255,255,255,0)');
            c.save(); c.translate(cx, cy); c.scale(1, .22); c.translate(-cx, -cy); c.fillStyle = g; c.fillRect(cx - rw, cy - rw, rw * 2, rw * 2); c.restore();
        }
        // montañas en capas con cumbres nevadas
        const ridge = (x, k) => {
            const b = [330, 410, 480][k], a = [150, 100, 62][k], f = [.0042, .0062, .0095][k], ph = [1.3, 4.1, 2.2][k];
            return b - a * (.55 + .45 * Math.sin(x * f + ph)) * (.6 + .4 * Math.sin(x * f * 2.3 + ph * 1.7)) - a * .35 * Math.abs(Math.sin(x * f * 1.7 + ph));
        };
        const mcol = ['#6a86bd', '#4d6fa4', '#35557f'], scol = ['#eef4ff', '#e2ecfb', '#d6e4f6'];
        for (let k = 0; k < 3; k++) {
            c.beginPath(); c.moveTo(X0, H); for (let x = X0; x <= W + GD; x += 8) c.lineTo(x, ridge(x, k)); c.lineTo(W + GD, H); c.closePath();
            c.fillStyle = mcol[k]; c.fill();
            const thr = [250, 360, 440][k];
            // relleno de nieve: solo donde la cumbre supera el umbral
            c.beginPath();
            let on = false;
            for (let x = X0; x <= W + GD; x += 8) {
                const r = ridge(x, k);
                if (r < thr) { if (!on) { c.moveTo(x, r); on = true; } c.lineTo(x, r); }
                else if (on) { on = false; for (let xx = x; xx >= x - 400; xx -= 8) { const rr2 = ridge(xx, k); if (rr2 >= thr) break; const d = (thr - rr2) * (.85 + .35 * Math.sin(xx * .09 + k)); c.lineTo(xx, rr2 + d); } c.closePath(); }
            }
            if (on) c.closePath();
            c.fillStyle = scol[k]; c.globalAlpha = .92; c.fill(); c.globalAlpha = 1;
            // niebla entre capas
            const fg = c.createLinearGradient(0, ridge(W / 2, k) - 20, 0, ridge(W / 2, k) + 140); fg.addColorStop(0, 'rgba(235,225,240,0)'); fg.addColorStop(1, 'rgba(240,215,225,.26)');
            c.fillStyle = fg; c.fillRect(X0, 150, XW, H);
        }
        // pinos
        const pine = (x, y, s, col) => {
            c.fillStyle = '#2a1f1a'; c.fillRect(x - 2 * s, y - 6 * s, 4 * s, 7 * s);
            for (let i = 0; i < 4; i++) {
                const w = (30 - i * 6) * s, yy = y - 6 * s - i * 15 * s;
                c.fillStyle = col; c.beginPath(); c.moveTo(x - w, yy); c.lineTo(x, yy - 24 * s); c.lineTo(x + w, yy); c.closePath(); c.fill();
                c.fillStyle = 'rgba(240,247,255,.85)'; c.beginPath(); c.moveTo(x - w * .62, yy - 9 * s); c.lineTo(x, yy - 24 * s); c.lineTo(x + w * .62, yy - 9 * s); c.quadraticCurveTo(x, yy - 12 * s, x - w * .62, yy - 9 * s); c.fill();
            }
        };
        for (let x = -100; x < W + 100; x += 38 + rnd() * 40) { if (x > 380 && x < 1120) continue; pine(x + (rnd() - .5) * 20, 585 + rnd() * 10, .7 + rnd() * .45, '#1c3d50'); }
        // muñeco de nieve gigante (figura propia, bufanda azul/naranja)
        const sx = W / 2, sy = 596;
        c.fillStyle = 'rgba(30,50,90,.22)'; c.beginPath(); c.ellipse(sx, sy + 2, 150, 14, 0, 0, TAU); c.fill();
        const body = (y, r) => { const g = c.createRadialGradient(sx - r * .3, y - r * .4, r * .1, sx, y, r); g.addColorStop(0, '#f4f8ff'); g.addColorStop(1, '#a9bcd9'); c.fillStyle = g; c.beginPath(); c.arc(sx, y, r, 0, TAU); c.fill(); };
        body(sy - 78, 96); body(sy - 205, 66);
        c.fillStyle = '#243049'; c.beginPath(); c.arc(sx - 22, sy - 218, 6, 0, TAU); c.arc(sx + 22, sy - 218, 6, 0, TAU); c.fill();
        c.fillStyle = '#ff8a2b'; c.beginPath(); c.moveTo(sx - 5, sy - 204); c.lineTo(sx + 40, sy - 198); c.lineTo(sx - 5, sy - 192); c.closePath(); c.fill();
        c.strokeStyle = '#243049'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.arc(sx, sy - 190, 24, .25 * Math.PI, .75 * Math.PI); c.stroke();
        c.fillStyle = '#3db8ff'; rr(c, sx - 70, sy - 160, 70, 18, 8); c.fill(); c.fillStyle = '#ff8a2b'; rr(c, sx, sy - 160, 70, 18, 8); c.fill();
        c.fillStyle = '#ff8a2b'; rr(c, sx + 36, sy - 146, 20, 44, 6); c.fill();
        c.fillStyle = '#3db8ff'; c.beginPath(); c.arc(sx, sy - 258, 40, Math.PI, 0); c.fill(); c.fillStyle = '#f4f8ff'; c.beginPath(); c.arc(sx, sy - 296, 13, 0, TAU); c.fill();   // gorro
        c.fillStyle = '#f4f8ff'; rr(c, sx - 48, sy - 262, 96, 14, 7); c.fill();
        // casetas con público
        const hut = (hx, hw, team) => {
            const hy = 596, hh = 82, rgb = team === 0 ? '61,184,255' : '255,138,43';
            c.fillStyle = '#3a2a22'; c.fillRect(hx, hy - hh, hw, hh);
            c.fillStyle = '#241a2b'; c.fillRect(hx + 10, hy - hh + 14, hw - 20, hh - 14);
            for (let r = 0; r < 3; r++) for (let x = hx + 18; x < hx + hw - 14; x += 14 + rnd() * 3) {
                const y = hy - 52 + r * 16, px = x + (rnd() - .5) * 3;
                const shirt = rnd() < .2 ? '#f1f4ff' : team === 0 ? ['#2a8fd1', '#3db8ff', '#79d2ff'][(rnd() * 3) | 0] : ['#d9701a', '#ff8a2b', '#ffb066'][(rnd() * 3) | 0];
                c.fillStyle = shirt; rr(c, px - 4.5, y + 1, 9, 9, 3); c.fill();
                c.fillStyle = ['#e0b896', '#b98a66', '#f0cfae', '#7a5640'][(rnd() * 4) | 0]; c.beginPath(); c.arc(px, y - 2.4, 3.8, 0, TAU); c.fill();
                if (rnd() < .5) crowdPts.push([px, y - 3]);
            }
            c.fillStyle = '#6b4a36'; c.fillRect(hx - 2, hy - hh - 3, 8, hh + 3); c.fillRect(hx + hw - 6, hy - hh - 3, 8, hh + 3);
            c.fillStyle = '#4a3427'; c.beginPath(); c.moveTo(hx - 16, hy - hh); c.lineTo(hx + hw / 2, hy - hh - 38); c.lineTo(hx + hw + 16, hy - hh); c.closePath(); c.fill();
            c.fillStyle = '#eef4ff'; c.beginPath(); c.moveTo(hx - 20, hy - hh + 2); c.lineTo(hx + hw / 2, hy - hh - 44); c.lineTo(hx + hw + 20, hy - hh + 2);
            c.quadraticCurveTo(hx + hw / 2, hy - hh - 26, hx - 20, hy - hh + 2); c.fill();
            c.fillStyle = 'rgba(' + rgb + ',.9)'; c.fillRect(hx, hy - 8, hw, 8);
        };
        stand(c, rnd, 390, 250, 0, 'snow'); stand(c, rnd, 860, 250, 1, 'snow');
        // guirnalda de banderines entre casetas y marcos
        const bunt = (x1, y1, x2, y2, n) => {
            for (let i = 0; i < n; i++) {
                const t = (i + .5) / n, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * 28;
                c.fillStyle = i % 2 ? '#ff8a2b' : '#3db8ff'; c.beginPath(); c.moveTo(x - 7, y); c.lineTo(x + 7, y); c.lineTo(x, y + 16); c.closePath(); c.fill();
            }
        };
        bunt(20, 300, 420, 515, 14); bunt(1080, 515, 1480, 300, 14);
        // globos
        for (const b of [[330, 150, '#3db8ff'], [1170, 140, '#ff8a2b']]) {
            c.strokeStyle = 'rgba(30,40,80,.6)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(b[0], b[1] + 30); c.lineTo(b[0] + 4, b[1] + 70); c.stroke();
            const g = c.createRadialGradient(b[0] - 7, b[1] - 8, 3, b[0], b[1], 30); g.addColorStop(0, '#ffffffaa'); g.addColorStop(.25, b[2]); g.addColorStop(1, b[2]);
            c.fillStyle = g; c.beginPath(); c.ellipse(b[0], b[1], 24, 30, 0, 0, TAU); c.fill();
            c.fillStyle = b[2]; c.beginPath(); c.moveTo(b[0] - 5, b[1] + 29); c.lineTo(b[0] + 5, b[1] + 29); c.lineTo(b[0] + 2, b[1] + 36); c.lineTo(b[0] - 2, b[1] + 36); c.closePath(); c.fill();
        }
        }
        // velo oscuro para que coches y balón resalten
        const dim = c.createLinearGradient(0, 0, 0, H); dim.addColorStop(0, 'rgba(8,14,44,.16)'); dim.addColorStop(.55, 'rgba(8,16,46,.08)'); dim.addColorStop(1, 'rgba(6,12,36,.34)');
        c.fillStyle = dim; c.fillRect(X0, 0, XW, H);
        // malla hexagonal del techo y las esquinas
        const HS = 27, hh = HS * Math.sqrt(3) / 2;
        const edge = (x, y) => {
            let d;
            if (x < TRr && y < TRr) d = TRr - Math.hypot(x - TRr, y - TRr);
            else if (x > W - TRr && y < TRr) d = TRr - Math.hypot(x - (W - TRr), y - TRr);
            else d = y;
            if (y < H - GH) d = Math.min(d, x, W - x);
            return d;
        };
        c.lineWidth = 1.6; c.lineJoin = 'round';
        for (let col = -1; col * HS * 1.5 < W + HS; col++) {
            for (let row = -1; row * hh * 2 < H * .7; row++) {
                const cx = col * HS * 1.5, cy = row * hh * 2 + (col & 1 ? hh : 0), d = edge(cx, cy);
                if (d > 150 || d < -HS) continue;
                const a = Math.max(0, 1 - Math.max(0, d) / 150);
                c.beginPath();
                for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3, px = cx + Math.cos(an) * (HS - 1.5), py = cy + Math.sin(an) * (HS - 1.5); i ? c.lineTo(px, py) : c.moveTo(px, py); }
                c.closePath(); c.fillStyle = 'rgba(190,225,255,' + (a * .10).toFixed(3) + ')'; c.fill();
                c.strokeStyle = 'rgba(215,238,255,' + (a * .55).toFixed(3) + ')'; c.stroke();
            }
        }
        // paneles de luz de equipo en las paredes laterales
        for (const s of [[0, 1, '61,184,255'], [W, -1, '255,138,43']]) {
            const g = c.createLinearGradient(s[0], 0, s[0] + s[1] * 70, 0); g.addColorStop(0, 'rgba(' + s[2] + ',.55)'); g.addColorStop(1, 'rgba(' + s[2] + ',0)');
            c.fillStyle = g; c.fillRect(s[1] > 0 ? 0 : W - 70, TRr * .55, 70, H - GH - TRr * .55);
            c.strokeStyle = 'rgba(' + s[2] + ',.8)'; c.lineWidth = 3;
            c.beginPath(); c.moveTo(s[0] + s[1] * 22, TRr * .9); c.lineTo(s[0] + s[1] * 22, H - GH - 12); c.stroke();
        }
        // suelo (hielo, arena, asfalto o roca volcánica)
        const fl = H - 56;
        const fg = c.createLinearGradient(0, fl, 0, H); fg.addColorStop(0, FP.a); fg.addColorStop(.5, FP.b); fg.addColorStop(1, FP.c);
        c.fillStyle = fg; c.fillRect(X0, fl, XW, 56);
        c.strokeStyle = FP.line; c.lineWidth = 1.6;
        for (let i = -2; i <= 14; i++) { const x0 = i * W / 12; c.beginPath(); c.moveTo(x0, fl); c.lineTo(x0 + (x0 - W / 2) * .3, H); c.stroke(); }
        for (const s of [[0, 1, '61,184,255'], [W, -1, '255,138,43']]) {   // zonas de equipo con copos
            c.fillStyle = 'rgba(' + s[2] + ',.38)'; c.beginPath(); c.moveTo(s[0], fl); c.lineTo(s[0] + s[1] * 760, fl); c.lineTo(s[0] + s[1] * 820, H); c.lineTo(s[0], H); c.closePath(); c.fill();
            c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 2.4; c.lineCap = 'round';
            const fx = s[0] + s[1] * 600, fy = fl + 30;
            for (let k = 0; k < (TH === 'snow' ? 6 : 0); k++) {
                const a = k * Math.PI / 3; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + Math.cos(a) * 20 * 1.6, fy + Math.sin(a) * 20 * .5);
                c.moveTo(fx + Math.cos(a) * 12 * 1.6, fy + Math.sin(a) * 12 * .5); c.lineTo(fx + Math.cos(a + .6) * 18 * 1.6, fy + Math.sin(a + .6) * 18 * .5);
                c.moveTo(fx + Math.cos(a) * 12 * 1.6, fy + Math.sin(a) * 12 * .5); c.lineTo(fx + Math.cos(a - .6) * 18 * 1.6, fy + Math.sin(a - .6) * 18 * .5); c.stroke();
            }
        }
        if (TH === 'retro') {      // cuadrícula de neón tipo recreativa
            c.strokeStyle = 'rgba(255,60,200,.6)'; c.lineWidth = 2;
            for (let y = fl + 8, k = 1; y < H; k++, y += 6 + k * 3) { c.beginPath(); c.moveTo(X0, y); c.lineTo(W + GD, y); c.stroke(); }
            c.strokeStyle = 'rgba(60,240,255,.35)'; for (let i = -10; i <= 22; i++) { const x0 = i * W / 12; c.beginPath(); c.moveTo(x0, fl); c.lineTo(W / 2 + (x0 - W / 2) * 1.5, H); c.stroke(); }
        }
        c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 3; c.beginPath(); c.moveTo(X0, fl); c.lineTo(W + GD, fl); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.85)'; c.setLineDash([16, 12]); c.beginPath(); c.moveTo(W / 2, fl); c.lineTo(W / 2, H); c.stroke(); c.setLineDash([]);
        c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 3; c.beginPath(); c.ellipse(W / 2, H - 28, 180, 24, 0, 0, TAU); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(W / 2, H - 28, 16, 4, 0, 0, TAU); c.fill();
        // áreas de portería y desgaste de la pista
        c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2.4;
        for (const sd of [0, W]) { c.beginPath(); c.ellipse(sd, H - 28, 190, 26, 0, sd ? Math.PI / 2 : -Math.PI / 2, sd ? Math.PI * 1.5 : Math.PI / 2); c.stroke(); }
        c.strokeStyle = FP.mark; c.lineWidth = 1.1; c.lineCap = 'round';
        for (let i = 0; i < 70; i++) { const x = X0 + rnd() * XW, y = fl + 6 + rnd() * 44, l = 10 + rnd() * 34; c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y + (rnd() - .5) * 3); c.stroke(); }
        if (TH === 'volcan') { c.save(); c.shadowColor = '#ff6a1a'; c.shadowBlur = 8; c.strokeStyle = 'rgba(255,120,40,.85)'; c.lineWidth = 1.8; for (let i = 0; i < 9; i++) { let x = X0 + rnd() * XW, y = fl + 4; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (rnd() - .5) * 30; y += 10 + rnd() * 6; c.lineTo(x, y); } c.stroke(); } c.restore(); }
        // porterías: panel y red
        for (const g of [[-GD, '61,184,255', 1], [W, '255,138,43', -1]]) {
            const x0 = g[0], rgb = g[1];
            const gb = c.createLinearGradient(x0, 0, x0 + GD, 0); gb.addColorStop(x0 < 0 ? 0 : 1, 'rgba(' + rgb + ',.72)'); gb.addColorStop(x0 < 0 ? 1 : 0, 'rgba(' + rgb + ',.18)');
            c.fillStyle = gb; c.fillRect(x0, H - GH, GD, GH);
            c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 1.4;
            for (let x = x0 + 14; x < x0 + GD; x += 14) { c.beginPath(); c.moveTo(x, H - GH); c.lineTo(x, H); c.stroke(); }
            for (let y = H - GH + 14; y < H; y += 14) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + GD, y); c.stroke(); }
            c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';   // galones
            const cx = x0 + GD / 2;
            for (let k = 0; k < 3; k++) { const y = GF - 130 + k * 34; c.beginPath(); c.moveTo(cx - 22, y + 14); c.lineTo(cx, y - 4); c.lineTo(cx + 22, y + 14); c.stroke(); }
        }
        c.restore();
        drawRamps(c, TH);

        // marco de neón: azul a la izquierda, naranja a la derecha
        arenaPath(c); c.lineJoin = 'round';
        const og = c.createLinearGradient(-GD, 0, W + GD, 0);
        og.addColorStop(0, '#3db8ff'); og.addColorStop(.46, '#7fd4ff'); og.addColorStop(.54, '#ffb066'); og.addColorStop(1, '#ff8a2b');
        c.strokeStyle = og; c.globalAlpha = .16; c.lineWidth = 34; c.stroke();
        c.globalAlpha = .55; c.lineWidth = 16; c.stroke();
        c.globalAlpha = 1; c.lineWidth = 5; c.stroke();
        for (const s of [[-1, '#3db8ff'], [1, '#ff8a2b']]) {
            const x0 = s[0] < 0 ? 0 : W, x1 = s[0] < 0 ? -GD : W + GD;
            c.strokeStyle = s[1]; c.lineWidth = 8; c.lineCap = 'round';
            c.beginPath(); c.moveTo(x0, H - GH); c.lineTo(x1, H - GH); c.lineTo(x1, GF); c.lineTo(x0, GF); c.stroke();
            c.fillStyle = '#fff'; c.beginPath(); c.arc(x0, H - GH, 9, 0, TAU); c.fill();
            c.fillStyle = s[1]; c.beginPath(); c.arc(x0, H - GH, 5, 0, TAU); c.fill();
        }
        // estrellas fuera del estadio
        c.setTransform(1, 0, 0, 1, 0, 0);
        for (let i = 0; i < 90; i++) { c.fillStyle = 'rgba(180,200,255,' + (0.08 + rnd() * 0.25).toFixed(2) + ')'; c.fillRect(rnd() * staticCv.width, rnd() * staticCv.height, 2 * dpr, 2 * dpr); }
    }
    // nieve cayendo (capa dinámica, barata)
    const FLAKES = Array.from({ length: 48 }, (_, i) => ({ x: (i * 197) % W, y: (i * 331) % H, s: 22 + (i * 13) % 34, r: 1.4 + (i % 3) * .7, p: i * 1.7 }));
    function drawSnowfall(t) {
        const n = Q.beams ? (Q.bloom ? 48 : 28) : 0; if (!n) return;
        const gust = Math.sin(t * .25) + .6 * Math.sin(t * .71 + 1), wind = 8 + gust * 26;      // ráfagas de viento
        for (let i = 0; i < n; i++) {
            const f = FLAKES[i], far = i % 2 === 0, k = far ? .55 : 1;
            ctx.fillStyle = far ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.78)';
            ctx.beginPath(); ctx.arc(((f.x + Math.sin(t * .6 + f.p) * 26 + t * wind * k) % (W + 40) + W + 40) % (W + 40) - 20, (f.y + t * f.s * k) % (H - 50), f.r * k, 0, TAU); ctx.fill();
        }
    }
    // ambiente de cada estadio (solo visual): brillo del hielo, ráfagas de arena, charcos con reflejos y géiseres de lava
    function drawStadiumExtra(t) {
        const th = cfg.stad;
        ctx.save();
        if (th === 'snow') {
            const x = ((t * 130) % (W + 500)) - 250, g = ctx.createLinearGradient(x - 160, 0, x + 160, 0);
            g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.42)'); g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g; ctx.fillRect(x - 160, H - 26, 320, 22);
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 12; i++) { const f = FLAKES[i], k = .5 + .5 * Math.sin(t * 2.2 + f.p * 3); if (k < .55) continue; const r = 3 + k * 6; ctx.globalAlpha = (k - .5) * 1.6; ctx.drawImage(glow('white'), (f.x * 1.3 % W) - r, H - 16 - (i % 3) * 5 - r, r * 2, r * 2); }
        } else if (th === 'desierto') {
            const gate = Math.pow(Math.max(0, Math.sin(t * .55)), 3);
            if (gate > .02) {
                ctx.lineCap = 'round'; ctx.lineWidth = 2.2;
                for (let i = 0; i < 16; i++) { const f = FLAKES[i], x = ((f.x + t * (520 + f.s * 6)) % (W + 400)) - 200, y = 120 + (f.y * 1.7 + i * 41) % (H - 190);
                    ctx.strokeStyle = 'rgba(244,212,150,' + (gate * (.16 + (i % 3) * .06)) + ')'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 120 - (i % 4) * 30, y + 6); ctx.stroke(); }
            }
        } else if (th === 'ciudad') {
            const PX = [300, 640, 990, 1300];
            for (let i = 0; i < PX.length; i++) {
                const x = PX[i], y = H - 12;
                ctx.fillStyle = 'rgba(110,140,225,.2)'; ctx.beginPath(); ctx.ellipse(x, y, 96, 8, 0, 0, TAU); ctx.fill();
                ctx.globalCompositeOperation = 'lighter';
                for (let j = -2; j <= 2; j++) { const lg = ctx.createLinearGradient(0, y - 6, 0, y + 6); const col = (i + j) % 2 ? '255,90,170' : '70,210,255';
                    ctx.fillStyle = 'rgba(' + col + ',' + (.16 + .05 * Math.sin(t * 3 + j + i)) + ')'; ctx.fillRect(x + j * 26 - 2, y - 5, 4, 10); }
                ctx.globalCompositeOperation = 'source-over';
                const k = (t * .8 + i * .37) % 1; ctx.strokeStyle = 'rgba(200,220,255,' + (.35 * (1 - k)) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x + Math.sin(i * 5 + Math.floor(t * .8 + i * .37)) * 50, y, 6 + k * 34, 1.5 + k * 4, 0, 0, TAU); ctx.stroke();
            }
        } else if (th === 'volcan') {
            ctx.globalCompositeOperation = 'lighter';
            const GX = [260, 760, 1230];
            for (let i = 0; i < GX.length; i++) {
                const per = 7.5 + i * 1.7, ph = ((t + i * 2.9) % per) / per, dur = .34; if (ph > dur) continue;
                const u = ph / dur, hgt = Math.sin(u * Math.PI), x0 = GX[i], by = H - 70;
                ctx.globalAlpha = .55 * hgt; ctx.drawImage(glow('orange'), x0 - 70, by - 50, 140, 90);
                for (let k = 0; k < 14; k++) { const q = k / 14, y = by - hgt * (70 + q * 230), r = (14 - k * .7) * (.6 + hgt * .5);
                    ctx.globalAlpha = hgt * (1 - q * .6) * .8; ctx.drawImage(glow(k % 3 ? 'orange' : 'yellow'), x0 + Math.sin(k * 1.9 + t * 4) * (6 + q * 22) - r, y - r, r * 2, r * 2); }
            }
        }
        ctx.restore();
    }
    // hora del día y clima cambiantes durante la partida (solo visual, no afecta al juego)
    const SKY_K = [[0, [0, 0, 0, 0]], [.28, [0, 0, 0, 0]], [.4, [255, 140, 60, .13]], [.52, [30, 50, 140, .2]], [.78, [20, 35, 110, .2]], [.9, [255, 150, 130, .11]], [1, [0, 0, 0, 0]]];
    function drawSky(t) {
        const th = cfg.stad, ph = (t / 220) % 1; let c = [0, 0, 0, 0];
        for (let i = 1; i < SKY_K.length; i++) if (ph <= SKY_K[i][0]) { const a = SKY_K[i - 1], b = SKY_K[i], u = (ph - a[0]) / (b[0] - a[0]); c = a[1].map((v, j) => v + (b[1][j] - v) * u); break; }
        if (c[3] > .005) { ctx.fillStyle = 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + c[3].toFixed(3) + ')'; ctx.fillRect(-GD, 0, W + 2 * GD, H); }
        const wk = t / 75, idx = Math.floor(wk) % 4, inten = Math.sin(Math.PI * (wk % 1));
        if (idx !== 1 && idx !== 2) return;
        ctx.save();
        if (idx === 1) {
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 4; i++) { const x = ((t * (14 + i * 6) + i * 480) % (W + 900)) - 450; ctx.globalAlpha = .13 * inten; ctx.drawImage(glow('white'), x, H * (.3 + i * .14), 700, 170); }
        } else {
            const wet = th === 'ciudad' || th === 'neon', col = wet ? '170,200,255' : th === 'volcan' ? '150,140,140' : th === 'desierto' ? '240,200,140' : '255,255,255';
            ctx.lineCap = 'round'; ctx.lineWidth = wet ? 1.2 : 2; const n = Q.beams ? 34 : 16;
            for (let i = 0; i < n; i++) { const f = FLAKES[i % FLAKES.length], sp = wet ? 700 : th === 'desierto' ? 420 : 90, x = (((f.x * 1.9 + i * 53 + (th === 'desierto' ? t * 420 : t * 80)) % (W + 300)) - 100), y = (f.y + i * 37 + t * sp) % (H - 30);
                ctx.strokeStyle = 'rgba(' + col + ',' + (.22 * inten) + ')'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (th === 'desierto' ? -26 : wet ? -5 : 0), y + (wet ? 16 : th === 'desierto' ? 2 : 5)); ctx.stroke(); }
        }
        ctx.restore();
    }
    // efectos en vivo de los temas nuevos: arena al viento, lluvia de neón y brasas

    // vida extra de cada estadio: láseres, aurora, helicóptero, rayos de sol y erupciones (todo animado y barato; en goles se intensifica)
    const hsh = i => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
    function drawStadiumLive(t) {
        const th = cfg.stad, hot = S.state === 'goal' ? 1.8 : 1, A = Q.bloom ? 1 : .75;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        if (th === 'neon') {
            const cols = ['255,61,240', '61,255,240', '255,210,63', '120,140,255'];
            for (let i = 0; i < 4; i++) {
                const x0 = W * (.15 + i * .23), ang = Math.sin(t * (.6 + i * .17) + i * 1.9) * (.5 * hot) + (i % 2 ? .12 : -.12), len = H * .95, x1 = x0 + Math.sin(ang) * len, y1 = 20 + Math.cos(ang) * len;
                const lg = ctx.createLinearGradient(x0, 20, x1, y1); lg.addColorStop(0, 'rgba(' + cols[i] + ',' + (.5 * A) + ')'); lg.addColorStop(1, 'rgba(' + cols[i] + ',0)');
                ctx.strokeStyle = lg; ctx.lineWidth = 13; ctx.globalAlpha = .3 * hot; ctx.beginPath(); ctx.moveTo(x0, 20); ctx.lineTo(x1, y1); ctx.stroke();
                ctx.lineWidth = 2.8; ctx.globalAlpha = .95; ctx.stroke();
                ctx.globalAlpha = .6; ctx.drawImage(glow(i % 2 ? 'cyan' : 'pink'), x0 - 14, 6, 28, 28);
            }
            const sx = ((t * 160) % (W + 400)) - 200; ctx.globalAlpha = .18 * A; const sg = ctx.createLinearGradient(sx - 120, 0, sx + 120, 0); sg.addColorStop(0, 'rgba(61,255,240,0)'); sg.addColorStop(.5, 'rgba(61,255,240,.6)'); sg.addColorStop(1, 'rgba(61,255,240,0)');
            ctx.fillStyle = sg; ctx.fillRect(sx - 120, H - 70, 240, 12);
        } else if (th === 'snow') {
            for (let k = 0; k < 3; k++) {
                const y0 = H * (.1 + k * .06), col = ['90,255,170', '90,200,255', '170,120,255'][k];
                ctx.beginPath(); ctx.moveTo(-GD, y0 + 120);
                for (let x = -GD; x <= W + GD; x += 60) ctx.lineTo(x, y0 + Math.sin(x * .004 + t * (.25 + k * .1) + k * 2) * 26 + Math.sin(x * .011 - t * .4) * 9);
                ctx.lineTo(W + GD, y0 + 140); ctx.closePath();
                const ag = ctx.createLinearGradient(0, y0 - 30, 0, y0 + 130); ag.addColorStop(0, 'rgba(' + col + ',0)'); ag.addColorStop(.35, 'rgba(' + col + ',' + (.17 * A * (.7 + .3 * Math.sin(t * .7 + k)) * hot) + ')'); ag.addColorStop(1, 'rgba(' + col + ',0)');
                ctx.fillStyle = ag; ctx.fill();
            }
            const sp = (t * .12) % 1; if (sp < .3) { const k = sp / .3, x = W * .9 - k * W * .5, y = H * .05 + k * H * .18; ctx.globalAlpha = .9 * (1 - k); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 70, y - 24); ctx.stroke(); }
            for (let i = 0; i < 16; i++) { ctx.globalAlpha = .15 + .35 * Math.max(0, Math.sin(t * 1.7 + i * 2.3)); const r = 6; ctx.drawImage(glow('gold'), W * (.12 + hsh(i) * .76) - r, H * (.64 + hsh(i + 9) * .1) - r, r * 2, r * 2); }
        } else if (th === 'ciudad') {
            const hx = ((t * 40) % (W + 600)) - 300, hy = H * .14 + Math.sin(t * .8) * 10;
            ctx.globalAlpha = .38 * A; const bm = ctx.createLinearGradient(hx, hy, hx + Math.sin(t * .9) * 220, hy + H * .55); bm.addColorStop(0, 'rgba(255,255,230,.9)'); bm.addColorStop(1, 'rgba(255,255,230,0)');
            ctx.fillStyle = bm; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.sin(t * .9) * 220 - 40, hy + H * .55); ctx.lineTo(hx + Math.sin(t * .9) * 220 + 40, hy + H * .55); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(10,14,36,.95)'; ctx.globalCompositeOperation = 'source-over'; ctx.beginPath(); ctx.ellipse(hx, hy, 20, 7, 0, 0, TAU); ctx.fill(); ctx.fillRect(hx - 34, hy - 2, 20, 4); ctx.fillRect(hx - 9, hy - 13, 18, 2); ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = .5 + .5 * Math.sin(t * 8); ctx.drawImage(glow('red'), hx - 26, hy - 8, 16, 16);
            for (let i = 0; i < 22; i++) { const x = W * (.08 + hsh(i + 3) * .84), y = H * (.5 + hsh(i + 20) * .24), on = Math.sin(t * (.4 + hsh(i) * .8) + i * 3) > .2; if (!on) continue; ctx.globalAlpha = .6; ctx.drawImage(glow(i % 3 ? 'yellow' : 'cyan'), x - 5, y - 5, 10, 10); }
            for (let i = 0; i < 9; i++) { const x = ((t * (60 + i * 11) * (i % 2 ? 1 : -1) + i * 250) % (W + 200) + W + 200) % (W + 200) - 100; ctx.globalAlpha = .75; ctx.drawImage(glow(i % 2 ? 'red' : 'white'), x - 5, H * .742 - 5, 10, 10); }
        } else if (th === 'desierto') {
            const sx = W / 2, sy = H * .56;
            for (let i = 0; i < 9; i++) { const a = -Math.PI * .96 + i * (Math.PI * .96 / 8) + Math.sin(t * .3 + i) * .05; ctx.globalAlpha = (.06 + .035 * Math.sin(t * .8 + i * 2)) * A * hot; ctx.fillStyle = 'rgb(255,205,120)'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a - .045) * W * .9, sy + Math.sin(a - .045) * W * .9); ctx.lineTo(sx + Math.cos(a + .045) * W * .9, sy + Math.sin(a + .045) * W * .9); ctx.closePath(); ctx.fill(); }
            ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = 'rgba(255,225,170,.14)'; ctx.lineWidth = 1.4;
            for (let k = 0; k < 5; k++) { const y = H * (.64 + k * .03); ctx.beginPath(); for (let x = -GD; x <= W + GD; x += 24) { const yy = y + Math.sin(x * .02 + t * 2.4 + k) * 2.2; x === -GD ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke(); }
            ctx.strokeStyle = 'rgba(40,16,10,.7)'; ctx.lineWidth = 1.7;
            for (let i = 0; i < 4; i++) { const x = ((t * (46 + i * 9) + i * 380) % (W + 300)) - 150, y = H * (.14 + i * .05) + Math.sin(t * 1.1 + i) * 10, f = Math.sin(t * 7 + i * 2) * 4; ctx.beginPath(); ctx.moveTo(x - 9, y - 3 - f); ctx.quadraticCurveTo(x - 4, y + 1, x, y); ctx.quadraticCurveTo(x + 4, y + 1, x + 9, y - 3 - f); ctx.stroke(); }
        } else if (th === 'volcan') {
            const cx = W / 2, cy = H * .39, pulse = .6 + .4 * Math.sin(t * 1.3) + (S.state === 'goal' ? .8 : 0);
            ctx.globalAlpha = Math.min(1, .5 * pulse * A); ctx.drawImage(glow('orange'), cx - 190, cy - 130, 380, 230);
            ctx.globalAlpha = Math.min(1, .35 * pulse * A); ctx.drawImage(glow('yellow'), cx - 70, cy - 50, 140, 90);
            const fr = (t * .22) % 1; if (fr < .5 || S.state === 'goal') for (let i = 0; i < 22; i++) { const u = (fr * 2 + i * .045) % 1, a = -Math.PI / 2 + (hsh(i) - .5) * 1.5, d = 40 + u * 190 * (.5 + hsh(i + 5)), x = cx + Math.sin(a) * d, y = cy - Math.cos(a) * d * 1.2 + u * u * 150, r = 6 * (1 - u) + 2; ctx.globalAlpha = (1 - u) * .85; ctx.drawImage(glow(i % 2 ? 'orange' : 'yellow'), x - r, y - r, r * 2, r * 2); }
            ctx.globalCompositeOperation = 'source-over';
            for (let i = 0; i < 26; i++) { const f = hsh(i + 40), x = (W * f + t * (10 + f * 12)) % W, y = ((t * (18 + f * 22) + f * H) % (H * .75)); ctx.globalAlpha = .28; ctx.fillStyle = 'rgb(150,140,150)'; ctx.fillRect(x, y, 2.4, 2.4); }
            const fl = Math.sin(t * .7) * Math.sin(t * 2.9); if (fl > .86) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (fl - .86) * 1.6; ctx.fillStyle = 'rgb(255,70,30)'; ctx.fillRect(-GD, 0, W + 2 * GD, H * .6); }
        }
        ctx.restore();
    }
    function drawThemeFX(t) {
        const th = cfg.stad;
        if (Q.beams && th !== 'neon') drawStadiumExtra(t);
        if (th === 'snow') { drawSnowfall(t); return; }
        const n = Q.beams ? (Q.bloom ? 48 : 28) : 0; if (!n) return;
        if (th === 'desierto') {
            const gust = 1 + .6 * Math.sin(t * .3) + .3 * Math.sin(t * 1.1);
            ctx.lineCap = 'round'; ctx.lineWidth = 1.2;
            for (let i = 0; i < n; i++) { const f = FLAKES[i], x = ((f.x + t * (110 + f.s * 4) * gust) % (W + 160)) - 80, y = (f.y * 1.1 + Math.sin(t * .7 + f.p) * 8) % (H - 60);
                ctx.strokeStyle = 'rgba(255,224,168,' + (.14 + (i % 3) * .08) + ')'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 14 - (i % 3) * 5, y + 1.5); ctx.stroke(); }
        } else if (th === 'ciudad') {
            ctx.lineCap = 'round'; ctx.lineWidth = 1.1;
            for (let i = 0; i < n; i++) { const f = FLAKES[i], x = ((f.x + t * 60) % (W + 60)) - 20, y = (f.y + t * (480 + f.s * 6)) % (H - 40);
                ctx.strokeStyle = 'rgba(170,200,255,' + (.14 + (i % 3) * .07) + ')'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 13); ctx.stroke(); }
        } else if (th === 'retro') {      // estrellas que parpadean, nubes que avanzan a saltos y un platillo de píxeles
            const P = RPX;
            for (let i = 0; i < 24; i++) { const f = FLAKES[i]; if (Math.sin(t * (1.5 + (i % 5) * .7) + f.p) < .55) continue; const x = Math.round(f.x / P) * P, y = Math.round((f.y * .45) / P) * P; ctx.fillStyle = i % 3 ? '#ffffff' : '#ffe98a'; ctx.fillRect(x, y, P, P); ctx.fillRect(x - P, y, P * 3, P * .5); }
            for (let i = 0; i < 3; i++) { const x = Math.round((((t * (8 + i * 5) + i * 600) % (W + 400)) - 200) / P) * P, y = (40 + i * 46); ctx.fillStyle = 'rgba(70,50,140,.85)'; ctx.fillRect(x, y, P * 12, P * 2); ctx.fillRect(x + P * 2, y - P, P * 7, P); ctx.fillStyle = 'rgba(40,26,90,.85)'; ctx.fillRect(x + P, y + P * 2, P * 10, P); }
            const u = (t * .05) % 1; if (u < .45) { const k = u / .45, x = Math.round((-150 + k * (W + 300)) / P) * P, y = Math.round((90 + Math.sin(k * 12) * 20) / P) * P;
                ctx.fillStyle = '#9aa7d6'; ctx.fillRect(x - P * 4, y, P * 9, P); ctx.fillRect(x - P * 3, y + P, P * 7, P); ctx.fillStyle = '#7dff6a'; ctx.fillRect(x - P * 2, y - P * 2, P * 5, P * 2);
                const bl = Math.floor(t * 6) % 3; ctx.fillStyle = '#ffd23f'; for (let j = 0; j < 3; j++) if (j !== bl) ctx.fillRect(x - P * 3 + j * P * 3, y + P * .3, P, P * .5); }
        } else if (th === 'volcan') {
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < n; i++) { const f = FLAKES[i], h = (f.y * .9 + t * (26 + f.s)) % (H - 60), a = 1 - h / (H - 60), r = (f.r + 1.2) * (4 + a * 3);
                ctx.globalAlpha = a * .8; ctx.drawImage(glow(i % 3 ? 'orange' : 'yellow'), f.x + Math.sin(t * .8 + f.p) * 30 - r, H - 40 - h - r, r * 2, r * 2); }
            ctx.restore(); ctx.globalAlpha = 1;
        }
    }
    // solo Ultra: rayos de luz por tema, polvo flotante en tres capas con paralaje y ola de destellos en el público
    const SHAFT = { snow: '255,235,210', desierto: '255,200,120', ciudad: '150,170,255', volcan: '255,120,50', retro: '255,90,220' };
    function drawUltraFX(t) {
        if (cfg.stad !== 'neon') drawBeams(t, SHAFT[cfg.stad] || '255,235,210');
        const bx = S.world.ball.x - W / 2;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let L = 0; L < 3; L++) {
            const par = -bx * (.03 + L * .05), sp = 6 + L * 9, r = 3 + L * 3.2, al = .13 + L * .05;
            for (let i = 0; i < 26; i++) {
                const f = FLAKES[(i * 3 + L * 7) % FLAKES.length], x = (((f.x * 1.7 + i * 61 + t * sp + par) % (W + 200)) + W + 200) % (W + 200) - 100, y = ((f.y * 1.2 + i * 29 + Math.sin(t * .4 + f.p + L) * 18) % (H - 90)) + 30;
                ctx.globalAlpha = al * (.6 + .4 * Math.sin(t * 1.3 + f.p)); ctx.drawImage(glow('white'), x - r, y - r, r * 2, r * 2);
            }
        }
        ctx.restore();
        if (Q.crowd && crowdPts.length && S.state !== 'menu') {
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < crowdPts.length; i += 2) { const p = crowdPts[i], w = Math.sin(p[0] * .012 - t * 2.4); if (w > .72) { ctx.globalAlpha = (w - .72) * 1.1; ctx.drawImage(glow('white'), p[0] - 5, p[1] - 5, 10, 10); } }
            ctx.restore();
        }
    }
    // ---------- marcador gigante del estadio (pantalla colgada en lo alto, detrás del juego) ----------
    function jMsg(txt, col, d, sub) { S.jm = { txt, col: col || '#ffd23f', t0: performance.now(), d: d || 2.2, sub: sub || '' }; }
    let jDots = null;
    function jumboDots() {
        if (jDots) return jDots;
        const c = document.createElement('canvas'); c.width = c.height = 4; const g2 = c.getContext('2d');
        g2.fillStyle = 'rgba(0,0,0,.3)'; g2.fillRect(0, 0, 4, 4); g2.clearRect(0, 0, 3, 3);
        jDots = ctx.createPattern(c, 'repeat'); return jDots;
    }
    const JW = 360, JH = 116, JX = W / 2 - JW / 2, JY = 150;
    // dígitos de 7 segmentos para la pantalla LCD del estadio retro
    const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
    function sevenSeg(txt, x, y, h, col) {
        const w = h * .5, th = h * .12, dw = w + h * .22, tot = [...txt].reduce((a, ch) => a + (ch === ':' ? h * .3 : dw), 0);
        let cx = x - tot / 2; ctx.fillStyle = col;
        for (const ch of txt) {
            if (ch === ':') { ctx.fillRect(cx + h * .08, y - h * .22, th, th); ctx.fillRect(cx + h * .08, y + h * .14, th, th); cx += h * .3; continue; }
            const on = SEG[ch] || '', X = cx, Y = y - h / 2, seg = { a: [X, Y, w, th], b: [X + w - th, Y, th, h / 2], c: [X + w - th, Y + h / 2, th, h / 2], d: [X, Y + h - th, w, th], e: [X, Y + h / 2, th, h / 2], f: [X, Y, th, h / 2], g: [X, Y + h / 2 - th / 2, w, th] };
            for (const k in seg) { ctx.globalAlpha = on.includes(k) ? 1 : .1; const r = seg[k]; ctx.fillRect(r[0], r[1], r[2], r[3]); }
            ctx.globalAlpha = 1; cx += dw;
        }
    }
    function jumboText(txt, x, y, size, col, glowOn) {
        if (cfg.stad === 'retro') {
            col = '#9dff7a';
            if (/^[0-9:]+$/.test(txt)) { if (glowOn && Q.beams) { ctx.shadowColor = col; ctx.shadowBlur = 8; } sevenSeg(txt, x, y, size * .78, col); ctx.shadowBlur = 0; return; }
            ctx.font = '700 ' + Math.round(size * .9) + 'px "Courier New", Courier, monospace';
            if (glowOn && Q.beams) { ctx.shadowColor = col; ctx.shadowBlur = 8; }
            ctx.fillStyle = col; ctx.fillText(txt, x, y); ctx.shadowBlur = 0; return;
        }
        ctx.font = '400 ' + size + 'px Bungee, Impact, "Arial Black", sans-serif';
        if (glowOn && Q.beams) { ctx.shadowColor = col; ctx.shadowBlur = 14; }
        ctx.fillStyle = col; ctx.fillText(txt, x, y); ctx.shadowBlur = 0;
    }
    function drawJumbo(t) {
        const st = cfg.stad, x = JX, y = JY, nowMs = performance.now();
        ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        // cables o soportes
        ctx.strokeStyle = st === 'ciudad' ? '#6e7ad0' : st === 'desierto' ? '#5a3322' : st === 'volcan' ? '#2a1a14' : st === 'snow' ? '#4a3427' : '#3a4a9a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x + 40, 0); ctx.lineTo(x + 40, y); ctx.moveTo(x + JW - 40, 0); ctx.lineTo(x + JW - 40, y); ctx.stroke();
        if (st === 'ciudad') { ctx.lineWidth = 1.5; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + 40, k * y / 4); ctx.lineTo(x + JW - 40, (k + 1) * y / 4); ctx.moveTo(x + JW - 40, k * y / 4); ctx.lineTo(x + 40, (k + 1) * y / 4); ctx.stroke(); } }
        // marco según el estadio
        const F = { neon: ['#0a0f2a', '#3dfff0'], snow: ['#5a3a26', '#8a5a3a'], ciudad: ['#3a4060', '#9aa8d0'], desierto: ['#b97a4a', '#e0a870'], volcan: ['#2a1210', '#5a2a1a'], retro: ['#5a5a6e', '#b8b8c8'] }[st] || ['#0a0f2a', '#3dfff0'];
        ctx.fillStyle = F[0]; rr(ctx, x - 10, y - 10, JW + 20, JH + 20, 12); ctx.fill();
        ctx.strokeStyle = F[1]; ctx.lineWidth = 3; rr(ctx, x - 10, y - 10, JW + 20, JH + 20, 12); ctx.stroke();
        if (st === 'neon' && Q.beams) { ctx.save(); ctx.shadowColor = '#ff3df0'; ctx.shadowBlur = 16; ctx.strokeStyle = 'rgba(255,61,240,.8)'; ctx.lineWidth = 2; rr(ctx, x - 4, y - 4, JW + 8, JH + 8, 9); ctx.stroke(); ctx.restore(); }
        else if (st === 'snow') { ctx.fillStyle = '#eef4ff'; rr(ctx, x - 16, y - 18, JW + 32, 12, 6); ctx.fill(); for (let k = 0; k < 9; k++) { ctx.fillStyle = ['#ff4a4a', '#ffd23f', '#3dd47a', '#3db8ff'][k % 4]; ctx.beginPath(); ctx.arc(x + 10 + k * (JW - 20) / 8, y + JH + 12, 3, 0, TAU); ctx.fill(); } }
        else if (st === 'desierto') { for (let k = 0; k < 10; k++) { ctx.fillStyle = k % 2 ? '#c0442c' : '#f4e3c0'; const px = x - 10 + k * (JW + 20) / 10; ctx.beginPath(); ctx.moveTo(px, y + JH + 10); ctx.lineTo(px + (JW + 20) / 10, y + JH + 10); ctx.lineTo(px + (JW + 20) / 20, y + JH + 24); ctx.closePath(); ctx.fill(); } }
        else if (st === 'volcan') { ctx.strokeStyle = 'rgba(255,' + (110 + 40 * Math.sin(t * 3)).toFixed(0) + ',30,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 6, y + 20); ctx.lineTo(x + 14, y + 40); ctx.lineTo(x + 2, y + 70); ctx.moveTo(x + JW + 6, y + 30); ctx.lineTo(x + JW - 12, y + 55); ctx.lineTo(x + JW + 2, y + 86); ctx.stroke(); }
        else if (st === 'retro') { ctx.fillStyle = '#2a2a38'; for (let k = 0; k < 6; k++) ctx.fillRect(x + 16 + k * 10, y + JH + 2, 6, 4); ctx.fillStyle = '#ff3d3d'; ctx.fillRect(x + JW - 24, y + JH + 2, 6, 4); ctx.fillStyle = '#9dff7a'; ctx.fillRect(x + JW - 14, y + JH + 2, 6, 4); }
        else if (st === 'ciudad' && Q.beams) { for (const sx of [x - 2, x + JW + 2]) { const gl = ctx.createRadialGradient(sx, y - 10, 0, sx, y - 10, 26); gl.addColorStop(0, 'rgba(220,230,255,.8)'); gl.addColorStop(1, 'rgba(220,230,255,0)'); ctx.fillStyle = gl; ctx.fillRect(sx - 26, y - 36, 52, 52); } }
        // pantalla
        const m = S.jm && (nowMs - S.jm.t0) / 1000 < S.jm.d ? S.jm : null, mt = m ? (nowMs - m.t0) / 1000 : 0;
        ctx.fillStyle = st === 'retro' ? '#0b1d0b' : '#02040e'; ctx.fillRect(x, y, JW, JH);
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, JW, JH); ctx.clip();
        const blue = '#3db8ff', orange = '#ff8a2b', two = S.mode === 'match' && S.v2;
        if (S.state === 'menu') {
            const sx = x + JW - ((t * 90) % (JW + 520));
            ctx.textAlign = 'left'; jumboText('TURBO GOL ARENA  ·  ¡A JUGAR!', sx, y + JH / 2, 30, '#ffd23f', true);
        } else if (S.state === 'count') {
            const n = Math.max(1, Math.ceil(S.cd)), f = S.cd % 1;
            ctx.fillStyle = n === 3 ? 'rgba(61,184,255,.18)' : n === 2 ? 'rgba(255,138,43,.18)' : 'rgba(255,210,63,.18)'; ctx.fillRect(x, y, JW, JH);
            jumboText(String(n), x + JW / 2, y + JH / 2 + 3, 64 + f * 26, n === 3 ? blue : n === 2 ? orange : '#ffd23f', true);
        } else if (m) {
            const fl = mt < .9 ? (Math.sin(mt * 22) > 0 ? 1 : .55) : 1;
            ctx.globalAlpha = .35 * fl; ctx.fillStyle = m.col; ctx.fillRect(x, y, JW, JH); ctx.globalAlpha = 1;
            const sz = m.txt.length > 12 ? 32 : m.txt.length > 7 ? 42 : 56, pop = 1 + Math.max(0, .35 - mt) * 1.2;
            ctx.save(); ctx.translate(x + JW / 2, y + JH / 2 - (m.sub ? 12 : 0)); ctx.scale(pop, pop); jumboText(m.txt, 0, 0, sz, '#ffffff', true); ctx.restore();
            if (m.sub) jumboText(m.sub, x + JW / 2, y + JH - 20, 20, m.col, true);
        } else if (S.state === 'replay') {
            if (Math.sin(t * 6) > -.3) jumboText('REPETICIÓN', x + JW / 2, y + JH / 2, 36, '#ff4a4a', true);
        } else {
            const nm = S.mode === 'drill' ? ['ENTRENAMIENTO', ''] : S.mode === 'free' ? ['MODO LIBRE', ''] : two ? ['AZUL', 'NARANJA'] : ['TÚ', (S.cup ? TEAMS[S.cup.rival].n : S.net ? 'Amigo' : 'IA').toUpperCase()];
            if (nm[1]) {
                ctx.font = st === 'retro' ? '700 16px "Courier New", monospace' : '400 17px Bungee, Impact, sans-serif'; ctx.fillStyle = st === 'retro' ? '#9dff7a' : blue; ctx.fillText(nm[0], x + JW * .2, y + 20); ctx.fillStyle = st === 'retro' ? '#9dff7a' : orange; ctx.fillText(nm[1].length > 12 ? nm[1].slice(0, 12) : nm[1], x + JW * .8, y + 20);
                jumboText(String(S.score[0]), x + JW * .2, y + 70, 60, blue, true); jumboText(String(S.score[1]), x + JW * .8, y + 70, 60, orange, true);
                const tm = S.ot ? 'ORO' : (Math.floor(Math.max(0, S.time) / 60) + ':' + String(Math.floor(Math.max(0, S.time) % 60)).padStart(2, '0'));
                jumboText(tm, x + JW / 2, y + 52, 34, S.ot ? '#ffd23f' : (S.time <= 30 ? '#ff6b6b' : '#ffffff'), false);
                ctx.font = '400 12px Bungee, Impact, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillText(S.ot ? 'GOL DE ORO' : 'TIEMPO', x + JW / 2, y + 82);
            } else jumboText(nm[0], x + JW / 2, y + JH / 2, 30, '#ffd23f', true);
        }
        ctx.fillStyle = jumboDots(); ctx.fillRect(x, y, JW, JH);
        if (Q.beams) { const gx = x + ((t * 60) % (JW * 2)) - JW / 2, gg = ctx.createLinearGradient(gx - 40, 0, gx + 40, 0); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(.5, 'rgba(255,255,255,.07)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gg; ctx.fillRect(x, y, JW, JH); }
        ctx.restore();
        ctx.restore();
    }
    // reflejo que recorre el cristal, redes de portería con ondas, postes con luz del equipo, marcador pequeño y público que anima
    function drawArenaLive(t) {
        if (EV && Q.beams) drawEventLive(t);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const gx = ((t * 80) % (W + 900)) - 450, gg = ctx.createLinearGradient(gx - 90, 0, gx + 90, 0);
        gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(.5, 'rgba(255,255,255,' + (.05 + S.flash * .08) + ')'); gg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(gx - 40, 0); ctx.lineTo(gx + 100, 0); ctx.lineTo(gx + 20, H * .75); ctx.lineTo(gx - 120, H * .75); ctx.closePath(); ctx.fill();
        // postes con luz del equipo
        for (const g of [[-GD, '61,184,255'], [W, '255,138,43']]) {
            const x0 = g[0], x1 = x0 < 0 ? x0 : x0 + GD, xa = x0 < 0 ? 0 : W, p = .28 + .16 * Math.sin(t * 3 + x0);
            ctx.strokeStyle = 'rgba(' + g[1] + ',' + p + ')'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(xa, H - GH); ctx.lineTo(x0 < 0 ? x0 : x1, H - GH); ctx.stroke();
        }
        ctx.restore();
        // red que ondea al marcar
        if (S.state === 'goal' && S.goalT > 0) {
            const a = clamp(S.goalT / 2.6, 0, 1), x0 = S.goalX < 0 ? -GD : W, amp = 7 * a;
            ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,' + (.55 * a) + ')'; ctx.lineWidth = 1.6;
            for (let i = 0; i <= 8; i++) { const bx = x0 + i * GD / 8; ctx.beginPath(); for (let y = H - GH; y <= H; y += 12) { const o = Math.sin(t * 14 + y * .05 + i) * amp * (1 - Math.abs(i - 4) / 6); y === H - GH ? ctx.moveTo(bx + o, y) : ctx.lineTo(bx + o, y); } ctx.stroke(); }
            for (let j = 0; j <= 8; j++) { const by = H - GH + j * GH / 8; ctx.beginPath(); for (let x = 0; x <= GD; x += 12) { const o = Math.sin(t * 14 + x * .06 + j) * amp; x === 0 ? ctx.moveTo(x0 + x, by + o) : ctx.lineTo(x0 + x, by + o); } ctx.stroke(); }
            ctx.restore();
        }
        // marcador pequeño dentro de cada portería
        if (S.state !== 'menu') {
            ctx.save(); ctx.font = '400 26px Bungee, Impact, "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            for (const g of [[-GD / 2, 0, '#3db8ff'], [W + GD / 2, 1, '#ff8a2b']]) {
                ctx.fillStyle = 'rgba(4,8,28,.72)'; rr(ctx, g[0] - 24, H - GH + 22, 48, 36, 7); ctx.fill();
                ctx.strokeStyle = g[2]; ctx.lineWidth = 2; rr(ctx, g[0] - 24, H - GH + 22, 48, 36, 7); ctx.stroke();
                ctx.fillStyle = g[2]; ctx.shadowColor = g[2]; ctx.shadowBlur = 8; ctx.fillText(String(S.score[g[1]]), g[0], H - GH + 41); ctx.shadowBlur = 0;
            }
            ctx.restore();
        }
        // público que celebra: el lado que marca salta en ola con brazos, bufandas y banderas; el rival se apaga
        if (Q.crowd && S.state === 'goal' && crowdPts.length) {
            if (cbKey !== crowdPts.length) { cbKey = crowdPts.length; cb = [[1e9, -1e9, 1e9, -1e9], [1e9, -1e9, 1e9, -1e9]]; for (const p of crowdPts) { const q = cb[p[0] < W / 2 ? 0 : 1]; q[0] = Math.min(q[0], p[0]); q[1] = Math.max(q[1], p[0]); q[2] = Math.min(q[2], p[1]); q[3] = Math.max(q[3], p[1]); } }
            const side = S.goalCol === 'blue' ? 0 : 1, hex = side === 0 ? '#3db8ff' : '#ff8a2b', hex2 = side === 0 ? '#bfe9ff' : '#ffd0a0', gl = Math.min(1, S.goalT / .8), el = 2.6 - S.goalT, gx = side === 0 ? W : 0;
            ctx.save(); ctx.lineCap = 'round';
            const lo = cb[1 - side]; if (lo[1] > lo[0]) { ctx.fillStyle = 'rgba(4,6,20,' + (.3 * gl).toFixed(2) + ')'; ctx.fillRect(lo[0] - 14, lo[2] - 16, lo[1] - lo[0] + 28, lo[3] - lo[2] + 40); }
            for (let i = 0; i < crowdPts.length; i++) {
                const p = crowdPts[i]; if ((p[0] < W / 2 ? 0 : 1) !== side) continue;
                const ph = el * 9 - Math.abs(p[0] - gx) * .006 + (i % 7) * .5, s = Math.sin(ph), hop = Math.max(0, s) * (5 + (i % 4)) * gl, x = p[0], y = p[1] - hop, k = i % 5;
                if (cfg.stad === 'retro') {      // aficionados de píxeles: saltan a golpes de 6 unidades
                    const P = RPX, yy = Math.round((p[1] - Math.round(hop / P) * P) / P) * P, xx = Math.round(x / P) * P - P;
                    ctx.fillStyle = '#22224a'; ctx.fillRect(xx - P, p[1] - P * 2, P * 4, P * 4);
                    ctx.fillStyle = k === 2 ? '#f1f4ff' : hex; ctx.fillRect(xx, yy + P, P * 2, P * 2);
                    ctx.fillStyle = '#f0cfae'; ctx.fillRect(xx, yy, P * 2, P); if (s > 0) { ctx.fillRect(xx - P, yy - P, P, P * 2); ctx.fillRect(xx + P * 2, yy - P, P, P * 2); }
                    if (k === 3) { ctx.fillStyle = hex2; ctx.fillRect(xx + P * 3, yy - P * 3, P * 2, P); ctx.fillStyle = '#d8d8d8'; ctx.fillRect(xx + P * 2, yy - P * 3, P * .5, P * 3); }
                    continue;
                }
                ctx.fillStyle = 'rgba(14,16,40,.9)'; ctx.fillRect(x - 5.5, p[1] - 8, 11, 20);
                ctx.fillStyle = k === 2 ? '#f1f4ff' : hex; rr(ctx, x - 4.5, y + 1, 9, 10, 3); ctx.fill();
                ctx.fillStyle = '#e8c4a2'; ctx.beginPath(); ctx.arc(x, y - 3, 3.9, 0, TAU); ctx.fill();
                if (k === 0) { ctx.fillStyle = hex2; ctx.beginPath(); ctx.arc(x, y - 3.6, 4.2, Math.PI, TAU); ctx.fill(); }
                const sw = Math.sin(el * 11 + i) * 3, up = 10 + Math.max(0, s) * 4;
                ctx.strokeStyle = '#e8c4a2'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(x - 3.5, y + 4); ctx.lineTo(x - 7 + sw, y - up); ctx.moveTo(x + 3.5, y + 4); ctx.lineTo(x + 7 - sw, y - up * .95); ctx.stroke();
                if (k === 1) { ctx.strokeStyle = hex2; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(x - 7 + sw, y - up); ctx.quadraticCurveTo(x, y - up - 5 - Math.sin(el * 12 + i) * 3, x + 7 - sw, y - up * .95); ctx.stroke(); }
                else if (k === 3) { ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + 7 - sw, y - up * .95); ctx.lineTo(x + 7 - sw, y - up - 12); ctx.stroke(); ctx.fillStyle = hex; ctx.beginPath(); const fw = 12 + Math.sin(el * 10 + i) * 2.5, fx = x + 7 - sw, fy = y - up - 12; ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + fw * .5, fy + 2 + Math.sin(el * 10 + i) * 2, fx + fw, fy + 1); ctx.lineTo(fx + fw, fy + 7); ctx.quadraticCurveTo(fx + fw * .5, fy + 9 + Math.sin(el * 10 + i) * 2, fx, fy + 7); ctx.closePath(); ctx.fill(); }
            }
            // luces de la grada que marca según el estadio
            const q = cb[side];
            if (q[1] > q[0]) {
                const LC = { neon: ['pink', 'cyan'], snow: ['gold', 'orange'], ciudad: ['white', 'cyan'], desierto: ['orange', 'yellow'], volcan: ['red', 'orange'], retro: ['pink', 'green'] }[cfg.stad] || ['white', 'gold'];
                ctx.globalCompositeOperation = 'lighter';
                for (let x = q[0]; x <= q[1]; x += 34) { const f = .5 + .5 * Math.sin(t * (cfg.stad === 'ciudad' ? 18 : 7) + x * .1), r = 18 + f * 12; ctx.globalAlpha = (.35 + .4 * f) * gl; ctx.drawImage(glow(LC[Math.abs((x / 34) | 0) % 2]), x - r, q[2] - 70 - r, r * 2, r * 2); }
            }
            ctx.restore();
        }
        // público con linternas, bengalas o antorchas según el estadio: celebra el lado que marca y hace la ola al sacar
        if (Q.crowd && crowdPts.length && S.state !== 'menu') {
            const PROP = { retro: ['pink', 'cyan'], neon: ['cyan', 'pink'], snow: ['red', 'orange'], ciudad: ['white', 'cyan'], desierto: ['orange', 'yellow'], volcan: ['red', 'orange'] }[cfg.stad] || ['white', 'gold'];
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            if (S.state === 'goal') {
                const cheer = S.goalCol === 'blue' ? 0 : 1;
                for (let i = 0; i < crowdPts.length; i += 3) { const p = crowdPts[i]; if ((p[0] < W / 2 ? 0 : 1) !== cheer) continue; const ph = t * 9 + i * 1.3, up = 9 + Math.abs(Math.sin(ph)) * 6, hop = Math.abs(Math.sin(ph * .8)) * 3, r = 7 + 2 * Math.sin(ph * 1.7), x = p[0] + 5 - Math.sin(ph) * 2, y = p[1] - up * .9 - hop - 2;
                    ctx.globalAlpha = .9; ctx.drawImage(glow(PROP[i % 2]), x - r, y - r, r * 2, r * 2); }
            } else if (S.state === 'count' || (S.state === 'play' && S.goHold > 0)) {
                for (let i = 0; i < crowdPts.length; i += 2) { const p = crowdPts[i], w = Math.sin(p[0] * .011 - t * 3.2); if (w > .6) { const r = 5 + (w - .6) * 9; ctx.globalAlpha = (w - .6) * 2; ctx.drawImage(glow(PROP[i % 2]), p[0] - r, p[1] - 7 - r, r * 2, r * 2); } }
            }
            ctx.restore();
        }
        // el neón late con los golpes fuertes
        if (cfg.stad === 'neon' && S.punch > .06) {
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; arenaPath(ctx); ctx.lineJoin = 'round';
            const og = ctx.createLinearGradient(-GD, 0, W + GD, 0); og.addColorStop(0, '#3db8ff'); og.addColorStop(.5, '#ffffff'); og.addColorStop(1, '#ff8a2b');
            ctx.strokeStyle = og; ctx.globalAlpha = clamp(S.punch * 1.4, 0, .8); ctx.lineWidth = 9; ctx.stroke(); ctx.restore();
        }
    }

    // ---------- decoración de los eventos ----------
    function heartPath(c, x, y, s) {
        c.beginPath(); c.moveTo(x, y + s * .35);
        c.bezierCurveTo(x - s * 1.1, y - s * .45, x - s * .45, y - s * 1.1, x, y - s * .45);
        c.bezierCurveTo(x + s * .45, y - s * 1.1, x + s * 1.1, y - s * .45, x, y + s * .35); c.closePath();
    }
    // sombrero o adorno de cada evento sobre la cabeza de un aficionado (cabeza en px, hy)
    function evHat(c, px, hy, s) {
        if (EV === 'halloween') {
            c.fillStyle = '#1a0a24'; c.beginPath(); c.moveTo(px - 4.6 * s, hy - 2.2); c.lineTo(px + 1.6 * s, hy - 13 * s); c.lineTo(px + 4.6 * s, hy - 2.2); c.closePath(); c.fill();
            c.fillRect(px - 6.4 * s, hy - 2.8, 12.8 * s, 1.8); c.fillStyle = '#ff8a2b'; c.fillRect(px - 4 * s, hy - 4.6, 8 * s, 1.4);
        } else if (EV === 'navidad') {
            c.fillStyle = '#e0262b'; c.beginPath(); c.moveTo(px - 4.4 * s, hy - 2.6); c.quadraticCurveTo(px, hy - 13 * s, px + 6 * s, hy - 8 * s); c.lineTo(px + 4.4 * s, hy - 2.6); c.closePath(); c.fill();
            c.fillStyle = '#fff'; c.fillRect(px - 4.8 * s, hy - 3.6, 9.6 * s, 2.4); c.beginPath(); c.arc(px + 6 * s, hy - 8 * s, 1.7 * s, 0, TAU); c.fill();
        } else if (EV === 'sanvalentin') {
            c.strokeStyle = '#ff4fb0'; c.lineWidth = 1.2; c.beginPath(); c.arc(px, hy, 4.4 * s, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
            c.fillStyle = '#ff2a6a'; heartPath(c, px, hy - 7 * s, 2.6 * s); c.fill();
        } else if (EV === 'primavera') {
            const F = ['#ff9ad8', '#ffe23a', '#ffffff', '#b58cff'];
            for (let i = 0; i < 3; i++) { c.fillStyle = F[(i + ((px * 7) | 0)) % 4]; c.beginPath(); c.arc(px + (i - 1) * 3.2 * s, hy - 3.6 * s - (i === 1 ? .8 : 0), 1.6 * s, 0, TAU); c.fill(); }
        } else if (EV === 'verano') {
            c.fillStyle = '#e8c87a'; c.beginPath(); c.ellipse(px, hy - 2.6, 7.2 * s, 1.8 * s, 0, 0, TAU); c.fill();
            c.beginPath(); c.arc(px, hy - 3, 3.6 * s, Math.PI, TAU); c.fill(); c.fillStyle = '#e0262b'; c.fillRect(px - 3.6 * s, hy - 4.2, 7.2 * s, 1.2);
        }
    }
    function drawEventStatic() {
        if (!EV) return;
        const c = sctx; c.save(); c.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
        arenaPath(c); c.clip();
        const BY = cfg.stad === 'neon' ? 372 : 596, low = !Q.beams;
        // guirnalda colgada en lo alto del estadio (3 tramos)
        const garland = (y0, sag, n, step, item) => {
            const x0 = 120, x1 = W - 120, seg = (x1 - x0) / n; let k = 0;
            c.strokeStyle = 'rgba(16,18,34,.9)'; c.lineWidth = 2;
            for (let s = 0; s < n; s++) { const a = x0 + s * seg; c.beginPath(); c.moveTo(a, y0); c.quadraticCurveTo(a + seg / 2, y0 + sag * 2, a + seg, y0); c.stroke(); }
            for (let s = 0; s < n; s++) { const a = x0 + s * seg; for (let u = step / seg / 2; u < 1; u += step / seg) item(a + u * seg, y0 + sag * 4 * u * (1 - u), k++); }
        };
        const flag = (x, y, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(x - 9, y); c.lineTo(x + 9, y); c.lineTo(x, y + 18); c.closePath(); c.fill(); };
        const glowAt = (x, y, r, rgb, a) => { const gg = c.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); gg.addColorStop(1, 'rgba(' + rgb + ',0)'); c.fillStyle = gg; c.fillRect(x - r, y - r, r * 2, r * 2); };
        const SPOTS = [190, 300, 690, 810, 1200, 1310];
        if (EV === 'halloween') {
            const fog = c.createLinearGradient(0, H - 170, 0, H); fog.addColorStop(0, 'rgba(120,40,200,0)'); fog.addColorStop(1, 'rgba(120,40,200,.22)'); c.fillStyle = fog; c.fillRect(-GD, H - 170, W + 2 * GD, 170);
            garland(26, 34, 3, 26, (x, y, i) => flag(x, y, ['#ff8a2b', '#1a0a24', '#8a3fe8'][i % 3]));
            for (const [wx, sx] of [[0, 1], [W, -1]]) {      // telarañas en las esquinas
                c.strokeStyle = 'rgba(230,230,255,.42)'; c.lineWidth = 1.1;
                for (let a = 0; a <= 6; a++) { const an = a / 6 * Math.PI / 2; c.beginPath(); c.moveTo(wx, 0); c.lineTo(wx + sx * Math.cos(an) * 240, Math.sin(an) * 240); c.stroke(); }
                for (let r = 50; r <= 230; r += 45) { c.beginPath(); for (let a = 0; a <= 6; a++) { const an = a / 6 * Math.PI / 2, rr2 = r * (a % 2 ? .9 : 1); a ? c.lineTo(wx + sx * Math.cos(an) * rr2, Math.sin(an) * rr2) : c.moveTo(wx + sx * Math.cos(an) * rr2, Math.sin(an) * rr2); } c.stroke(); }
                c.fillStyle = '#120818'; c.beginPath(); c.arc(wx + sx * 150, 150, 7, 0, TAU); c.fill(); c.strokeStyle = '#120818'; c.lineWidth = 1.4;
                for (let l = 0; l < 4; l++) for (const d of [-1, 1]) { c.beginPath(); c.moveTo(wx + sx * 150, 150); c.lineTo(wx + sx * 150 + d * 11, 144 + l * 4); c.stroke(); }
            }
            SPOTS.forEach((x, i) => {      // calabazas con cara iluminada
                const r = 15 + (i % 3) * 3, y = BY - r * .8;
                if (!low) glowAt(x, y, r * 3, '255,140,40', .32);
                c.fillStyle = '#e8650e'; for (const o of [-.45, 0, .45]) { c.beginPath(); c.ellipse(x + o * r, y, r * .62, r * .82, 0, 0, TAU); c.fill(); }
                c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(x, y + r * .3, r * 1.1, r * .45, 0, 0, Math.PI); c.fill();
                c.fillStyle = '#3a6a1a'; c.fillRect(x - 2, y - r * .95, 4, 6);
                c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(x - r * .5, y - r * .1); c.lineTo(x - r * .2, y - r * .4); c.lineTo(x - r * .1, y - r * .05); c.fill();
                c.beginPath(); c.moveTo(x + r * .5, y - r * .1); c.lineTo(x + r * .2, y - r * .4); c.lineTo(x + r * .1, y - r * .05); c.fill();
                c.beginPath(); c.moveTo(x - r * .55, y + r * .2); c.lineTo(x + r * .55, y + r * .2); c.lineTo(x + r * .3, y + r * .45); c.lineTo(x, y + r * .3); c.lineTo(x - r * .3, y + r * .45); c.closePath(); c.fill();
            });
        } else if (EV === 'navidad') {
            const BC = ['#ff4a4a', '#3dd47a', '#ffd23f', '#3db8ff', '#ff9ad8'];
            garland(22, 30, 3, 30, (x, y, i) => { const col = BC[i % 5]; if (!low) glowAt(x, y + 6, 16, col === '#ff4a4a' ? '255,80,80' : col === '#3dd47a' ? '80,230,140' : col === '#ffd23f' ? '255,220,90' : col === '#3db8ff' ? '90,190,255' : '255,160,220', .55); c.fillStyle = '#333a50'; c.fillRect(x - 2, y, 4, 4); c.fillStyle = col; c.beginPath(); c.ellipse(x, y + 8, 4, 6, 0, 0, TAU); c.fill(); });
            [SPOTS[0], SPOTS[5]].forEach(x => {      // árboles con bolas y estrella
                c.fillStyle = '#5a3a22'; c.fillRect(x - 4, BY - 12, 8, 12);
                for (let k = 0; k < 3; k++) { c.fillStyle = k % 2 ? '#1f8a4a' : '#17703a'; c.beginPath(); c.moveTo(x - 26 + k * 6, BY - 10 - k * 22); c.lineTo(x, BY - 44 - k * 22); c.lineTo(x + 26 - k * 6, BY - 10 - k * 22); c.closePath(); c.fill(); }
                for (let k = 0; k < 8; k++) { c.fillStyle = BC[k % 5]; c.beginPath(); c.arc(x + ((k * 37) % 30) - 15 + (k % 3), BY - 18 - (k * 11) % 52, 2.6, 0, TAU); c.fill(); }
                if (!low) glowAt(x, BY - 92, 22, '255,220,90', .6); c.fillStyle = '#ffd23f'; c.beginPath(); for (let k = 0; k < 10; k++) { const an = -Math.PI / 2 + k * Math.PI / 5, rr2 = k % 2 ? 3 : 7.5; c.lineTo(x + Math.cos(an) * rr2, BY - 92 + Math.sin(an) * rr2); } c.closePath(); c.fill();
            });
            [SPOTS[1], SPOTS[2], SPOTS[3], SPOTS[4]].forEach((x, i) => {      // regalos
                for (let k = 0; k < 2; k++) { const w2 = 22 - k * 6, h2 = 16 - k * 3, gx = x + (k ? 14 : -6), col = BC[(i + k * 2) % 5];
                    c.fillStyle = col; c.fillRect(gx - w2 / 2, BY - h2, w2, h2); c.fillStyle = '#fff'; c.fillRect(gx - 1.5, BY - h2, 3, h2); c.fillRect(gx - w2 / 2, BY - h2 * .55, w2, 3);
                    c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.ellipse(gx - 4, BY - h2 - 3, 4, 2.5, -.4, 0, TAU); c.ellipse(gx + 4, BY - h2 - 3, 4, 2.5, .4, 0, TAU); c.stroke(); }
            });
        } else if (EV === 'sanvalentin') {
            garland(24, 32, 3, 30, (x, y, i) => { c.fillStyle = ['#ff2a6a', '#ff9ad8', '#ffffff'][i % 3]; heartPath(c, x, y + 10, 8); c.fill(); });
            if (!low) { glowAt(W / 2, 210, 150, '255,80,170', .16); c.save(); c.strokeStyle = 'rgba(255,120,200,.35)'; c.lineWidth = 5; heartPath(c, W / 2, 230, 90); c.stroke(); c.restore(); }
            SPOTS.forEach((x, i) => {      // globos de corazón
                const y = BY - 70 - (i % 3) * 16; c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y + 10); c.quadraticCurveTo(x + 6, y + 40, x, BY); c.stroke();
                c.fillStyle = i % 2 ? '#ff2a6a' : '#ff6ac0'; heartPath(c, x, y, 15); c.fill(); c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(x - 6, y - 6, 3, 2, -.6, 0, TAU); c.fill();
            });
        } else if (EV === 'primavera') {
            const F = ['#ff9ad8', '#ffe23a', '#ffffff', '#b58cff', '#ff6a5c'];
            const flower = (x, y, r, col) => { c.fillStyle = col; for (let k = 0; k < 5; k++) { const an = k * TAU / 5; c.beginPath(); c.arc(x + Math.cos(an) * r * .7, y + Math.sin(an) * r * .7, r * .55, 0, TAU); c.fill(); } c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(x, y, r * .4, 0, TAU); c.fill(); };
            garland(24, 30, 3, 24, (x, y, i) => { c.fillStyle = '#3a8a2a'; c.beginPath(); c.ellipse(x - 6, y + 2, 5, 2.4, .5, 0, TAU); c.fill(); flower(x, y + 4, 7, F[i % 5]); });
            SPOTS.forEach((x, i) => {      // arbustos con flores
                c.fillStyle = '#2f7a2a'; for (const o of [-16, 0, 16]) { c.beginPath(); c.arc(x + o, BY - 12 - (o ? 0 : 8), 16, Math.PI, TAU); c.fill(); }
                for (let k = 0; k < 5; k++) flower(x - 22 + k * 11, BY - 16 - ((k * 7) % 14), 5, F[(i + k) % 5]);
            });
        } else if (EV === 'verano') {
            garland(24, 32, 3, 26, (x, y, i) => flag(x, y, ['#ff4a4a', '#ffd23f', '#3dafff', '#3dd47a', '#ff9ad8'][i % 5]));
            SPOTS.forEach((x, i) => {
                if (i % 2 === 0) {      // sombrilla de rayas
                    c.fillStyle = '#e8e8e8'; c.fillRect(x - 1.5, BY - 62, 3, 62);
                    for (let k = 0; k < 6; k++) { c.fillStyle = k % 2 ? '#fff' : ['#ff4a4a', '#3dafff', '#ffd23f'][i / 2 | 0]; c.beginPath(); c.moveTo(x, BY - 66); c.arc(x, BY - 50, 34, Math.PI + k * Math.PI / 6, Math.PI + (k + 1) * Math.PI / 6); c.closePath(); c.fill(); }
                } else {      // pelota de playa
                    const r = 12, y = BY - r; for (let k = 0; k < 6; k++) { c.fillStyle = ['#ff4a4a', '#fff', '#3dafff', '#fff', '#ffd23f', '#fff'][k]; c.beginPath(); c.moveTo(x, y); c.arc(x, y, r, k * TAU / 6, (k + 1) * TAU / 6); c.closePath(); c.fill(); }
                    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(x - 4, y - 5, 3.5, 2, -.6, 0, TAU); c.fill();
                }
            });
        }
        c.restore();
    }
    // partículas vivas del evento: murciélagos, nieve, corazones, pétalos o pompas
    function drawEventLive(t) {
        const n = Q.bloom ? 16 : 9;
        ctx.save();
        if (EV === 'halloween') {
            ctx.fillStyle = 'rgba(14,6,20,.88)';
            for (let i = 0; i < 7; i++) {
                const sp = 60 + i * 11, x = ((i * 263 + t * sp) % (W + 240)) - 120, y = 70 + (i * 97) % 240 + Math.sin(t * 1.7 + i) * 24, fl = Math.sin(t * 15 + i * 2), s = .8 + (i % 3) * .2;
                ctx.beginPath(); ctx.ellipse(x, y, 4 * s, 3 * s, 0, 0, TAU); ctx.fill();
                for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + d * 3 * s, y); ctx.quadraticCurveTo(x + d * 10 * s, y - 9 * s * fl, x + d * 17 * s, y - 2 * s * fl); ctx.quadraticCurveTo(x + d * 11 * s, y + 2 * s, x + d * 3 * s, y + 2 * s); ctx.fill(); }
            }
        } else if (EV === 'navidad') {
            if (cfg.stad !== 'snow') drawSnowfall(t);
        } else if (EV === 'sanvalentin') {
            for (let i = 0; i < n; i++) { const f = FLAKES[i], y = H - ((f.y + t * f.s * .7) % (H + 30)), x = f.x + Math.sin(t * .8 + f.p) * 22; ctx.globalAlpha = .35 + (i % 3) * .12; ctx.fillStyle = i % 2 ? '#ff4fb0' : '#ff9ad8'; heartPath(ctx, x, y, 4 + (i % 3) * 2); ctx.fill(); }
        } else if (EV === 'primavera') {
            for (let i = 0; i < n; i++) { const f = FLAKES[i], x = ((f.x + Math.sin(t * .7 + f.p) * 30 + t * 18) % (W + 40) + W + 40) % (W + 40) - 20, y = (f.y + t * f.s * .8) % (H - 40);
                ctx.globalAlpha = .75; ctx.fillStyle = i % 3 ? '#ffb3e0' : '#ffffff'; ctx.save(); ctx.translate(x, y); ctx.rotate(t * 1.5 + f.p); ctx.beginPath(); ctx.ellipse(0, 0, 4, 2.2, 0, 0, TAU); ctx.fill(); ctx.restore(); }
        } else if (EV === 'verano') {
            ctx.lineWidth = 1.4;
            for (let i = 0; i < n; i++) { const f = FLAKES[i], y = H - ((f.y + t * f.s * .6) % (H + 30)), x = f.x + Math.sin(t * 1.1 + f.p) * 16, r = 3 + (i % 4) * 1.6;
                ctx.globalAlpha = .45; ctx.strokeStyle = '#e8fbff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(x - r * .35, y - r * .35, r * .25, 0, TAU); ctx.fill(); }
        }
        ctx.restore();
    }
    function drawStatic() {
        if (cfg.stad !== 'neon') { drawSnow(); return; }
        const c = sctx;
        c.setTransform(1, 0, 0, 1, 0, 0);
        const bg = c.createLinearGradient(0, 0, 0, staticCv.height); bg.addColorStop(0, '#090d28'); bg.addColorStop(1, '#03050f');
        c.fillStyle = bg; c.fillRect(0, 0, staticCv.width, staticCv.height);
        c.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
        let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

        c.save(); arenaPath(c); c.clip();
        // pared del fondo
        const wall = c.createLinearGradient(0, 0, 0, H);
        wall.addColorStop(0, '#0a0f33'); wall.addColorStop(.42, '#141d5e'); wall.addColorStop(.78, '#10175a'); wall.addColorStop(1, '#080c2e');
        c.fillStyle = wall; c.fillRect(-GD, 0, W + 2 * GD, H);
        // halos de focos en el techo
        for (let i = 0; i < 5; i++) {
            const lx = W * (.18 + .16 * i), g = c.createRadialGradient(lx, 30, 4, lx, 30, 240);
            g.addColorStop(0, 'rgba(170,200,255,.30)'); g.addColorStop(1, 'rgba(170,200,255,0)');
            c.fillStyle = g; c.fillRect(lx - 240, 0, 480, 280);
        }
        // grada con público
        crowdPts.length = 0;
        for (let r = 0; r < 7; r++) {
            const y = 108 + r * 31, depth = r / 6;
            const slab = c.createLinearGradient(0, y + 9, 0, y + 17); slab.addColorStop(0, 'rgba(8,12,40,.9)'); slab.addColorStop(1, 'rgba(24,34,92,.9)');
            c.fillStyle = slab; c.fillRect(-GD, y + 9, W + 2 * GD, 8);
            for (let x = -GD + 8; x < W + GD; x += 15 + rnd() * 3) {
                const t = (x + GD) / (W + 2 * GD), px = x + (rnd() - .5) * 4, s = .86 + depth * .24;
                let shirt;
                const k = rnd();
                if (k < .14) shirt = '#f1f4ff';
                else if (t < .36) shirt = ['#2a8fd1', '#3db8ff', '#1f6fb0', '#79d2ff'][(rnd() * 4) | 0];
                else if (t > .64) shirt = ['#d9701a', '#ff8a2b', '#b85a10', '#ffb066'][(rnd() * 4) | 0];
                else shirt = ['#5b6aa8', '#8a95c9', '#c9cfe8', '#3a4580'][(rnd() * 4) | 0];
                const skin = ['#e0b896', '#b98a66', '#f0cfae', '#7a5640', '#d1a07c'][(rnd() * 5) | 0];
                c.fillStyle = shirt; rr(c, px - 5 * s, y + 1.5, 10 * s, 10 * s, 3); c.fill();
                c.fillStyle = skin; c.beginPath(); c.arc(px, y - 2.6, 4.1 * s, 0, TAU); c.fill();
                if (EV && Math.abs(Math.sin(px * 12.99 + y * 7.23) * 437.5) % 1 < .4) evHat(c, px, y - 2.6, s);
                if (rnd() < .12) { c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(px + 4 * s, y - 9, 1.5, 9); }   // bandera
                if (rnd() < .5) crowdPts.push([px, y - 3]);
            }
        }
        const dim = c.createLinearGradient(0, 90, 0, BY); dim.addColorStop(0, 'rgba(4,6,28,.5)'); dim.addColorStop(1, 'rgba(4,6,28,.12)');
        c.fillStyle = dim; c.fillRect(-GD, 90, W + 2 * GD, BY - 90);
        // pantalla LED (fondo)
        c.fillStyle = '#04050d'; c.fillRect(-GD, BY, W + 2 * GD, BH);
        c.fillStyle = 'rgba(80,100,200,.18)'; for (let x = -GD; x < W + GD; x += 3) c.fillRect(x, BY, 1, BH);
        c.fillStyle = '#2a3470'; c.fillRect(-GD, BY - 2, W + 2 * GD, 2); c.fillRect(-GD, BY + BH, W + 2 * GD, 2);
        // pared inferior con luz de equipo
        const lw = c.createLinearGradient(-GD, 0, W * .5, 0); lw.addColorStop(0, 'rgba(61,184,255,.26)'); lw.addColorStop(1, 'rgba(61,184,255,0)');
        c.fillStyle = lw; c.fillRect(-GD, BY + BH + 2, W * .55, H);
        const rw = c.createLinearGradient(W + GD, 0, W * .5, 0); rw.addColorStop(0, 'rgba(255,138,43,.26)'); rw.addColorStop(1, 'rgba(255,138,43,0)');
        c.fillStyle = rw; c.fillRect(W * .45, BY + BH + 2, W * .55 + GD, H);
        c.strokeStyle = 'rgba(160,180,255,.06)'; c.lineWidth = 2;
        for (let x = 0; x <= W; x += 100) { c.beginPath(); c.moveTo(x, BY + BH + 2); c.lineTo(x, H - 46); c.stroke(); }
        c.strokeStyle = 'rgba(200,215,255,.05)'; c.lineWidth = 3; c.beginPath(); c.arc(W / 2, H - 150, 150, 0, TAU); c.stroke();
        // suelo brillante en perspectiva
        const fl = H - 46;
        const fg = c.createLinearGradient(0, fl, 0, H);
        fg.addColorStop(0, 'rgba(110,130,255,.12)'); fg.addColorStop(.4, 'rgba(60,80,210,.26)'); fg.addColorStop(1, 'rgba(8,12,48,.92)');
        c.fillStyle = fg; c.fillRect(-GD, fl, W + 2 * GD, 46);
        c.strokeStyle = 'rgba(190,205,255,.10)'; c.lineWidth = 2;
        for (let i = -2; i <= 14; i++) { const x0 = i * W / 12; c.beginPath(); c.moveTo(x0, fl); c.lineTo(x0 + (x0 - W / 2) * .22, H); c.stroke(); }
        c.strokeStyle = 'rgba(200,215,255,.22)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-GD, fl); c.lineTo(W + GD, fl); c.stroke();
        c.strokeStyle = 'rgba(200,215,255,.3)'; c.setLineDash([16, 12]); c.beginPath(); c.moveTo(W / 2, fl); c.lineTo(W / 2, H); c.stroke(); c.setLineDash([]);
        c.strokeStyle = 'rgba(200,215,255,.22)'; c.beginPath(); c.ellipse(W / 2, H - 22, 170, 19, 0, 0, TAU); c.stroke();
        for (const s of [[0, 61, 184, 255, 1], [W, 255, 138, 43, -1]]) {
            c.strokeStyle = 'rgba(' + s[1] + ',' + s[2] + ',' + s[3] + ',.55)'; c.lineWidth = 3;
            c.beginPath(); c.moveTo(s[0], fl); c.lineTo(s[0] + s[4] * 250, fl); c.lineTo(s[0] + s[4] * 290, H); c.stroke();
        }
        const gl = c.createLinearGradient(0, H - 8, 0, H); gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(210,225,255,.35)');
        c.fillStyle = gl; c.fillRect(-GD, H - 8, W + 2 * GD, 8);
        // porterías
        for (const g of [[-GD, '61,184,255'], [W, '255,138,43']]) {
            const x0 = g[0], rgb = g[1];
            const gb = c.createLinearGradient(x0, 0, x0 + GD, 0);
            gb.addColorStop(x0 < 0 ? 0 : 1, 'rgba(' + rgb + ',.45)'); gb.addColorStop(x0 < 0 ? 1 : 0, 'rgba(' + rgb + ',.10)');
            c.fillStyle = gb; c.fillRect(x0, H - GH, GD, GH);
            c.strokeStyle = 'rgba(' + rgb + ',.34)'; c.lineWidth = 1.4;
            for (let x = x0 + 14; x < x0 + GD; x += 14) { c.beginPath(); c.moveTo(x, H - GH); c.lineTo(x, H); c.stroke(); }
            for (let y = H - GH + 14; y < H; y += 14) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + GD, y); c.stroke(); }
        }
        c.restore();
        drawRamps(c, false);

        // contorno de cristal con luz de equipo
        arenaPath(c); c.lineJoin = 'round';
        const og = c.createLinearGradient(-GD, 0, W + GD, 0);
        og.addColorStop(0, '#3db8ff'); og.addColorStop(.5, '#b9c6ff'); og.addColorStop(1, '#ff8a2b');
        c.strokeStyle = og; c.globalAlpha = .13; c.lineWidth = 22; c.stroke();
        c.globalAlpha = .38; c.lineWidth = 9; c.stroke();
        c.globalAlpha = 1; c.lineWidth = 3; c.stroke();
        for (const s of [[-1, '#3db8ff'], [1, '#ff8a2b']]) {
            const x0 = s[0] < 0 ? 0 : W, x1 = s[0] < 0 ? -GD : W + GD;
            c.strokeStyle = s[1]; c.lineWidth = 6; c.lineCap = 'round';
            c.beginPath(); c.moveTo(x0, H - GH); c.lineTo(x1, H - GH); c.lineTo(x1, GF); c.lineTo(x0, GF); c.stroke();
            c.fillStyle = '#fff'; c.beginPath(); c.arc(x0, H - GH, 8, 0, TAU); c.fill();
            c.fillStyle = s[1]; c.beginPath(); c.arc(x0, H - GH, 4, 0, TAU); c.fill();
        }
        // focos del techo (estructura)
        for (let i = 0; i < 5; i++) {
            const lx = W * (.18 + .16 * i);
            c.fillStyle = '#0a0d24'; rr(c, lx - 30, 8, 60, 14, 4); c.fill();
            c.fillStyle = '#e8f1ff'; for (let k = -2; k <= 2; k++) { c.beginPath(); c.arc(lx + k * 11, 15, 3.4, 0, TAU); c.fill(); }
        }
        // estrellas fuera del estadio
        c.setTransform(1, 0, 0, 1, 0, 0);
        for (let i = 0; i < 90; i++) { c.fillStyle = 'rgba(180,200,255,' + (0.08 + rnd() * 0.25).toFixed(2) + ')'; c.fillRect(rnd() * staticCv.width, rnd() * staticCv.height, 2 * dpr, 2 * dpr); }
    }

    // rampas sólidas delante de las porterías (la física ya las tiene; aquí solo se pintan)
    function drawRamps(c, snow) {
        for (const poly of [T.solidL, T.solidR]) {
            c.beginPath(); c.moveTo(poly[0][0], poly[0][1]); for (let i = 1; i < poly.length; i++) c.lineTo(poly[i][0], poly[i][1]); c.closePath();
            const left = poly === T.solidL, x0 = left ? 0 : W, x1 = left ? T.RAMP_X + 20 : W - T.RAMP_X - 20;
            const g = c.createLinearGradient(x0, H - 130, x1, H); const rc = THEME_RAMP[snow === true ? 'snow' : snow] || ['#2b3f94', '#141e5c']; g.addColorStop(0, rc[0]); g.addColorStop(1, rc[1]);
            c.fillStyle = g; c.fill();
            c.save(); c.clip();
            c.strokeStyle = 'rgba(160,200,255,.14)'; c.lineWidth = 2;
            for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(left ? -GD : W + GD, H - k * 34); c.lineTo(left ? T.RAMP_X + 30 : W - T.RAMP_X - 30, H + 40 - k * 34 + 28); c.stroke(); }
            c.restore();
            const edge = poly.filter(p => p[1] < 759 && p[1] > 623);      // franja de aviso a lo largo del borde curvo
            if (edge.length > 2) {
                c.save(); c.lineCap = 'butt'; c.lineJoin = 'round';
                c.beginPath(); c.moveTo(edge[0][0], edge[0][1]); for (let i = 1; i < edge.length; i++) c.lineTo(edge[i][0], edge[i][1]);
                c.strokeStyle = 'rgba(10,12,24,.9)'; c.lineWidth = 6; c.stroke();
                c.setLineDash([9, 9]); c.strokeStyle = '#ffd23f'; c.lineWidth = 4; c.stroke(); c.setLineDash([]);
                c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.stroke(); c.restore();
            }
        }
    }

    // ---------- Render: capa dinámica ----------
    let ledMsg = '', ledW = 0;
    function drawLED(t) {
        let msg, col = '#ffd23f';
        if (S.state === 'goal') { msg = '¡¡GOOOOL!!   '; col = S.goalCol === 'blue' ? '#7fd4ff' : '#ffb066'; if (((t * 6) | 0) % 2) col = '#ffffff'; }
        else if (S.ot) msg = 'GOL DE ORO   //   EL SIGUIENTE GOL GANA   //   ';
        else msg = 'TURBO GOL ARENA   //   RECOGE DISCOS PARA RECARGAR EL TURBO   //   VOLTERETA = GOLPE FUERTE   //   ';
        ctx.save(); ctx.beginPath(); ctx.rect(-GD, BY + 2, W + 2 * GD, BH - 4); ctx.clip();
        ctx.font = '400 21px Bungee, Impact, "Arial Black", sans-serif'; ctx.textBaseline = 'middle';
        if (msg !== ledMsg) { ledMsg = msg; ledW = Math.max(60, ctx.measureText(msg).width); }
        const off = -((t * 120) % ledW);
        ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10;
        for (let x = off - GD; x < W + GD; x += ledW) ctx.fillText(msg, x, BY + BH / 2 + 1);
        ctx.restore();
    }

    function drawBeams(t, rgb) {
        rgb = rgb || '190,215,255';
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 5; i++) {
            const lx = W * (.18 + .16 * i), sway = Math.sin(t * .55 + i * 1.7) * 130 + (i - 2) * 40;
            const g = ctx.createLinearGradient(0, 24, 0, H);
            g.addColorStop(0, 'rgba(' + rgb + ',.17)'); g.addColorStop(.6, 'rgba(' + rgb + ',.04)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
            ctx.fillStyle = g; ctx.beginPath();
            ctx.moveTo(lx - 16, 24); ctx.lineTo(lx + 16, 24); ctx.lineTo(lx + sway + 190, H); ctx.lineTo(lx + sway - 190, H); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    }

    function drawChase(t) {
        arenaPath(ctx); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        const g = ctx.createLinearGradient(-GD, 0, W + GD, 0);
        g.addColorStop(0, '#7fd4ff'); g.addColorStop(.5, '#ffffff'); g.addColorStop(1, '#ffb066');
        ctx.strokeStyle = g; ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.setLineDash([50, 260]); ctx.lineDashOffset = -t * 300;
        ctx.globalAlpha = .22; ctx.lineWidth = 14; ctx.stroke();
        ctx.globalAlpha = .9; ctx.lineWidth = 4; ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
    }

    function drawPads(t) {
        for (const p of S.world.pads) {
            const rx = p.big ? 40 : 27, ry = p.big ? 8 : 6, ready = p.cool <= 0;
            ctx.fillStyle = '#0b1038'; ctx.beginPath(); ctx.ellipse(p.x, H - 3, rx + 6, ry + 2, 0, 0, TAU); ctx.fill();
            ctx.strokeStyle = 'rgba(150,170,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, H - 3, rx + 6, ry + 2, 0, 0, TAU); ctx.stroke();
            if (ready) {
                ctx.save(); ctx.globalCompositeOperation = 'lighter';
                const g = ctx.createLinearGradient(0, H - 96, 0, H); g.addColorStop(0, 'rgba(255,210,63,0)'); g.addColorStop(1, 'rgba(255,210,63,.34)');
                ctx.fillStyle = g; ctx.fillRect(p.x - rx * .75, H - 96, rx * 1.5, 96);
                const gr = rx * (p.big ? 2.6 : 2.2); ctx.globalAlpha = .55 + .25 * Math.sin(t * 5 + p.x); ctx.drawImage(glow('gold'), p.x - gr, H - 3 - gr * .5, gr * 2, gr);
                ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(255,230,140,.85)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                for (let k = 0; k < 3; k++) { const yy = H - 14 - ((t * 40 + k * 22) % 66), a = 1 - (H - 14 - yy) / 66; ctx.globalAlpha = Math.max(0, a); ctx.beginPath(); ctx.moveTo(p.x - 9, yy + 6); ctx.lineTo(p.x, yy); ctx.lineTo(p.x + 9, yy + 6); ctx.stroke(); }
                ctx.restore();
                ctx.fillStyle = GOLD; ctx.beginPath(); ctx.ellipse(p.x, H - 3, rx, ry - 1, 0, 0, TAU); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(p.x - rx * .25, H - 4.5, rx * .45, ry * .3, 0, 0, TAU); ctx.fill();
            } else {
                ctx.fillStyle = 'rgba(120,130,190,.35)'; ctx.beginPath(); ctx.ellipse(p.x, H - 3, rx, ry - 1, 0, 0, TAU); ctx.fill();
                ctx.strokeStyle = 'rgba(255,210,63,.8)'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.ellipse(p.x, H - 3, rx, ry, 0, Math.PI, Math.PI + Math.PI * (1 - p.cool / (p.big ? 10 : 4))); ctx.stroke();
            }
        }
    }

    function drawShadows() {
        const w = S.world;
        for (const c of w.cars) {
            const h = Math.max(0, H - c.y), a = clamp(.5 - h / 600, 0, .5);
            if (a <= .01 || c.x < 440 || c.x > W - 440) continue;
            ctx.fillStyle = 'rgba(0,0,10,' + a + ')'; ctx.beginPath(); ctx.ellipse(c.x, H - 1, 46 * c.sc * (1 - h / 1100), 5, 0, 0, TAU); ctx.fill();
        }
        const b = w.ball, hb = Math.max(0, H - b.y), ab = clamp(.5 - hb / 700, 0, .5);
        if (ab > .01 && b.x > 440 && b.x < W - 440) { ctx.fillStyle = 'rgba(0,0,10,' + ab + ')'; ctx.beginPath(); ctx.ellipse(b.x, H - 1, T.BALL_R * (1.1 - hb / 1500), 5, 0, 0, TAU); ctx.fill(); }
    }

    function hbSize(t) {
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (const h of t.hb) { x0 = Math.min(x0, h[0] - h[2]); x1 = Math.max(x1, h[0] + h[2]); y0 = Math.min(y0, h[1] - h[2]); y1 = Math.max(y1, h[1] + h[2]); }
        return Math.round((x1 - x0) * t.sc) + ' × ' + Math.round((y1 - y0) * t.sc);
    }
    function boostFx(c, t) {
        const k = Math.min(1, (c.bt || 0) * 5), fx = c.f * Math.cos(c.a), fy = c.f * Math.sin(c.a), pal = c.model === 'fenix' ? 'orange' : c.team === 0 ? 'blue' : 'orange', r = 80 * (c.sc || 1) * (1 + .06 * Math.sin(t * 30));
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .38 * k; ctx.drawImage(glow(pal), c.x - r, c.y - r, r * 2, r * 2);
        if (Q.beams && c.spdv > 300) {       // líneas de velocidad detrás del coche
            ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(' + PAL[pal].join(',') + ',.55)'; ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                const ph = (t * 3.4 + i * .37) % 1, off = (i - 2.5) * 11, sx = c.x - fx * (50 + ph * 150) - fy * off * c.f, sy = c.y - fy * (50 + ph * 150) + fx * off * c.f;
                ctx.globalAlpha = (1 - ph) * .6 * k; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - fx * 60, sy - fy * 60); ctx.stroke();
            }
        }
        ctx.restore();
    }
    function drawCar(c, t) {
        if (c.boosting && S.state !== 'count' && S.state !== 'menu') boostFx(c, t);
        ctx.save();
        ctx.translate(c.x, c.y); ctx.rotate(c.a);
        if (c.roll && Math.abs(c.roll) > .02) {          // tornillo: el coche rueda sobre su eje largo
            const k = Math.cos(c.roll), ak = Math.max(.18, Math.abs(k));
            ctx.scale(1, (k < 0 ? -1 : 1) * ak);
            ctx.transform(1, 0, 0, 1, Math.sin(c.roll) * 3.5, 0);
        }
        ctx.scale(c.f * (c.sc || 1), c.sc || 1);
        // reacciones del patinete: dos suspensiones independientes (muelles amortiguados), inclinación del piloto y estado de juego
        const dtS = Math.min(.033, Math.max(0, t - (c.susT || t))); c.susT = t;
        const co = Math.cos(c.a), si = Math.sin(c.a), vf = (c.vx * co + c.vy * si) * c.f, vu = -(-c.vx * si + c.vy * co);
        const dvy = c.vy - (c.susV == null ? c.vy : c.susV); c.susV = c.vy;
        const dvf = vf - (c.susVf == null ? vf : c.susVf); c.susVf = vf;
        const lkick = dtS > 0 ? clamp(dvf / dtS / 2600, -1, 1) : 0;                    // aceleración longitudinal (positiva: acelera)
        c.lean = (c.lean || 0) + (lkick - (c.lean || 0)) * Math.min(1, dtS * 6);
        const kick = clamp(dvy, -900, 900) * .02;
        const spr = (s, w, pitch) => {
            const air = !c.grounded ? -.35 : 0;
            w = (w || 0) + (-(s || 0) * 300 - (w || 0) * 9) * dtS - kick * 1 + pitch * dtS * 14;
            return [clamp((s || 0) + w * dtS + (air - (s || 0)) * Math.min(1, dtS * (c.grounded ? 0 : 4)), -1.2, 1.2), w];
        };
        const pF = spr(c.susF, c.susFw, -c.lean * .6 + (c.brake ? .5 : 0)), pR = spr(c.susR, c.susRw, c.lean * .6);
        c.susF = pF[0]; c.susFw = pF[1]; c.susR = pR[0]; c.susRw = pR[1];
        const me = c === S.world.cars[0];
        let mood = '';
        if (S.state === 'goal') mood = ((S.goalCol === 'blue') === (c.team === 0)) ? 'win' : 'lose';
        CARS.paint(ctx, c.model || 'chispa', c.team, { boosting: c.boosting, wheel: c.wheel * c.f, t, spin: c.spdv || 0, brake: c.brake,
            susF: c.susF, susR: c.susR, lean: c.lean, air: !c.grounded, jumpT: c.grounded ? 9 : c.airT, vf, vu, mood, look: (() => { const bb = S.world.ball, dx = (bb.x - c.x) * c.f, dy = bb.y - c.y; return Math.hypot(dx, dy) < 700 ? Math.atan2(dy, Math.max(dx, 30)) : 0; })(), wall: c.grounded && Math.abs(c.ny) < .75, hitT: c.hitAt ? (performance.now() - c.hitAt) / 1000 : 9, flip: c.flipT > 0,
            rid: c.rid || (c.rid = {}), state: S.state, ballD: Math.hypot(S.world.ball.x - c.x, S.world.ball.y - c.y),      // memoria y contexto del piloto del patín
            paint: me ? cfg.paint : null, wheelStyle: me ? cfg.wheel : null, trail: me ? cfg.trail : null, dorsal: me ? cfg.dorsal : null, decal: me ? cfg.decal : null });
        ctx.restore();
    }

    // 2 contra 2: flecha "TÚ" sobre tu coche y bocadillos de la IA ("¡Mía!", "¡Tuya!", "¡Atrás!")
    function drawTeamMarks(now) {
        const w = S.world, me = w.cars[0], bob = Math.sin(now / 180) * 3;
        ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (S.state !== 'replay') {
            const y = me.y - 66 + bob; ctx.fillStyle = '#ffd23f';
            ctx.beginPath(); ctx.moveTo(me.x - 11, y); ctx.lineTo(me.x + 11, y); ctx.lineTo(me.x, y + 13); ctx.closePath(); ctx.fill();
            ctx.font = '400 24px Bungee, Impact, sans-serif'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(4,8,28,.85)'; ctx.strokeText('TÚ', me.x, y - 14); ctx.fillText('TÚ', me.x, y - 14);
        }
        if (S.bub) {
            S.bub = S.bub.filter(b => now - b.t0 < 1500);
            const seen = {};
            for (let i = S.bub.length - 1; i >= 0; i--) {
                const b = S.bub[i]; if (seen[b.pid]) continue; seen[b.pid] = 1;
                const c = w.cars[b.pid]; if (!c) continue;
                const a = Math.min(1, (now - b.t0) / 120, (1500 - (now - b.t0)) / 250), col = c.team === 0 ? '#3db8ff' : '#ff8a2b';
                ctx.globalAlpha = Math.max(0, a); ctx.font = '400 26px Bungee, Impact, sans-serif';
                const tw = ctx.measureText(b.txt).width + 26, bx = clamp(c.x, tw / 2 + 4, W - tw / 2 - 4), by = c.y - 84;
                ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(ctx, bx - tw / 2, by - 22, tw, 44, 14); ctx.fill();
                ctx.beginPath(); ctx.moveTo(c.x - 9, by + 21); ctx.lineTo(c.x + 9, by + 21); ctx.lineTo(c.x, by + 34); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = col; ctx.lineWidth = 3.5; rr(ctx, bx - tw / 2, by - 22, tw, 44, 14); ctx.stroke();
                ctx.fillStyle = col; ctx.fillText(b.txt, bx, by + 1);
            }
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }
    function drawDancer(t) {
        let a = 0; const nowMs = performance.now();
        if (S.state === 'goal' && S.goalCol === 'blue' && cfg.boom === 'baile') a = clamp(Math.min((2.6 - S.goalT) * 5, S.goalT * 2.2), 0, 1);
        else if (S.danceUntil && nowMs < S.danceUntil) a = clamp(Math.min((nowMs - S.danceStart) / 200, (S.danceUntil - nowMs) / 450), 0, 1);   // prueba desde el taller o el garaje
        if (a <= 0) return;
        const bt = t * 9, b = Math.sin(bt), b2 = Math.sin(bt + Math.PI), hop = Math.abs(Math.sin(bt)) * 7;
        ctx.save(); ctx.globalAlpha = a * .5; ctx.globalCompositeOperation = 'lighter';           // foco de luz sobre el piloto
        const sp = ctx.createLinearGradient(W / 2, 0, W / 2, H); sp.addColorStop(0, 'rgba(255,255,255,0)'); sp.addColorStop(.55, 'rgba(120,200,255,.35)'); sp.addColorStop(1, 'rgba(255,255,255,.5)');
        ctx.fillStyle = sp; ctx.beginPath(); ctx.moveTo(W / 2 - 40, 0); ctx.lineTo(W / 2 + 40, 0); ctx.lineTo(W / 2 + 190, H); ctx.lineTo(W / 2 - 190, H); ctx.closePath(); ctx.fill(); ctx.restore();
        ctx.save(); ctx.globalAlpha = a * .55; { const hg = ctx.createRadialGradient(W / 2, H - 110, 10, W / 2, H - 110, 190); hg.addColorStop(0, 'rgba(6,10,40,.85)'); hg.addColorStop(1, 'rgba(6,10,40,0)'); ctx.fillStyle = hg; ctx.fillRect(W / 2 - 200, H - 320, 400, 330); } ctx.restore();
        ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, H - 2); ctx.scale(3.6, 3.6);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const limb = (pts, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); };
        const hipY = -21 - hop * .5, shY = -37 - hop * .5, hx = Math.sin(bt * .5) * 3;
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 0, 11 - hop * .3, 2.2, 0, 0, TAU); ctx.fill();
        for (const [w1, c1] of [[7, '#0a0f2a'], [4.6, '#3db8ff']]) {          // piernas, torso y brazos (contorno + color de equipo)
            limb([[-1, hipY], [-6 + b * 3, hipY + 10 - hop * .3], [-7 + b * 5, -hop * .1]], w1, c1);
            limb([[1, hipY], [6 + b2 * 3, hipY + 10 - hop * .3], [7 + b2 * 5, -hop * .1]], w1, c1);
            limb([[0, hipY], [hx * .5, shY]], w1 + 2, c1);
            limb([[-1, shY], [-8, shY - 4 + b * 4], [-11 + b * 3, shY - 15 + b * 9]], w1 - 1, c1);
            limb([[1, shY], [8, shY - 4 + b2 * 4], [11 + b2 * 3, shY - 15 + b2 * 9]], w1 - 1, c1);
        }
        ctx.fillStyle = '#fff'; for (const [hxp, hyp] of [[-11 + b * 3, shY - 15 + b * 9], [11 + b2 * 3, shY - 15 + b2 * 9]]) { ctx.beginPath(); ctx.arc(hxp, hyp, 2.8, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#ffd9b0'; ctx.strokeStyle = '#0a0f2a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(hx, shY - 8, 6.4, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#3db8ff'; ctx.beginPath(); ctx.arc(hx, shY - 9, 6.8, Math.PI, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#0a0f2a'; ctx.fillRect(hx + 1, shY - 9.5, 5.2, 2.4);
        ctx.restore();
    }
    function drawTarget(tg, t) {
        const x = W + 34, y = tg.y, p = .5 + .5 * Math.sin(t * 5);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const [r, a] of [[50, .5], [34, .65], [16, .9]]) { ctx.strokeStyle = 'rgba(255,210,63,' + (a + p * .1) + ')'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, r + p * 3, 0, TAU); ctx.stroke(); }
        ctx.fillStyle = 'rgba(255,210,63,' + (.25 + .15 * p) + ')'; ctx.beginPath(); ctx.arc(x, y, 14, 0, TAU); ctx.fill();
        ctx.restore();
    }
    function drawBall(b, sec) {
        const sp = Math.hypot(b.vx, b.vy), pal = ballPal(), now = performance.now(), tt = now / 1000;
        // sombra en el suelo: se estrecha y se aclara con la altura
        { const hh = Math.max(0, H - b.y - T.BALL_R), k = Math.max(0, 1 - hh / 560);
          if (k > .02) { ctx.save(); ctx.fillStyle = 'rgba(0,0,0,' + (.34 * k) + ')'; ctx.beginPath(); ctx.ellipse(b.x, H - 2, T.BALL_R * (.55 + .6 * k), 5 + 5 * k, 0, 0, TAU); ctx.fill(); ctx.restore(); } }
        // aro de peligro: el balón va hacia una portería a gran velocidad
        if (S.state === 'play' && b.y > H - GH && sp > 520 && ((b.x < 330 && b.vx < -300) || (b.x > W - 330 && b.vx > 300))) {
            const k = .5 + .5 * Math.sin(tt * 16); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,70,60,' + (.45 + .4 * k) + ')'; ctx.lineWidth = 3 + 2 * k;
            ctx.beginPath(); ctx.arc(b.x, b.y, T.BALL_R + 9 + k * 7, 0, TAU); ctx.stroke(); ctx.restore();
        }
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        // estela en cinta
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const rgb = PAL[pal].join(',');
        for (let i = 1; !sec && i < trail.length; i++) {
            const k = i / trail.length, p0 = trail[i - 1], p1 = trail[i];
            ctx.strokeStyle = 'rgba(' + rgb + ',' + (.5 * k * p1.a) + ')'; ctx.lineWidth = T.BALL_R * 1.5 * k;
            ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
        }
        const ar = T.BALL_R * (2.3 + Math.min(1.5, sp / 1400));
        ctx.globalAlpha = .4 + Math.min(.4, sp / 3500); ctx.drawImage(glow(pal), b.x - ar, b.y - ar, ar * 2, ar * 2);
        ctx.restore();
        // desenfoque de movimiento: copias tenues detrás del balón a gran velocidad
        const bn = Q.ultra ? 6 : 3, bsp = Q.ultra ? 600 : 950;
        if (sp > bsp) for (let k = bn; k >= 1; k--) { ctx.save(); ctx.globalAlpha = (Q.ultra ? .075 : .09) * (bn + 1 - k) * (3 / bn) * Math.min(1, (sp - bsp) / 900); ctx.translate(b.x - b.vx * .0085 * k, b.y - b.vy * .0085 * k); ballBody(b, tt); ctx.restore(); }
        ctx.save(); ctx.translate(b.x, b.y);
        { const sq = Math.max(0, 1 - (now - (S.ballSq || 0)) / 190);      // aplastamiento al contacto
          if (sq > 0) { const ang = Math.atan2(b.vy, b.vx); ctx.rotate(ang); ctx.scale(1 - .2 * sq, 1 + .13 * sq); ctx.rotate(-ang);
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .55 * sq; ctx.drawImage(glow('white'), -T.BALL_R * 1.5, -T.BALL_R * 1.5, T.BALL_R * 3, T.BALL_R * 3); ctx.restore(); } }
        if (sp > 700) { const ang = Math.atan2(b.vy, b.vx), k = Math.min(.16, (sp - 700) / 9000); ctx.rotate(ang); ctx.scale(1 + k, 1 - k * .6); ctx.rotate(-ang); }
        ballBody(b, performance.now() / 1000);
        ctx.restore();
    }

    const BALLS = [
        { id: 'classic', name: 'Clásico', sw: 'radial-gradient(circle at 35% 30%,#fff,#ffc628 60%,#b4740a)' },
        { id: 'neon', name: 'Neón', sw: 'radial-gradient(circle,#0a0f2a 50%,#3dffe0 55%,#0a0f2a 60%)' },
        { id: 'playa', name: 'Playa', sw: 'conic-gradient(#ff4a4a 0 25%,#fff 0 50%,#3dafff 0 75%,#ffe23a 0)' },
        { id: 'meteoro', name: 'Meteorito', sw: 'radial-gradient(circle at 35% 30%,#8a6a55,#3a2a22 60%,#ff7a1a)' },
        { id: 'disco', name: 'Disco', sw: 'conic-gradient(#fff,#9aa7d6,#fff,#6a7090,#fff,#9aa7d6,#fff)' },
        { id: 'calabaza', name: 'Calabaza', sw: 'radial-gradient(circle at 35% 30%,#ffb04a,#ee6a0a 60%,#8a3a00)' },
        { id: 'fuego', name: 'Fuego', sw: 'radial-gradient(circle at 50% 60%,#fff3a0,#ff9a1a 40%,#b3200a 75%,#3a0505)' },
        { id: 'hielo', name: 'Hielo', sw: 'radial-gradient(circle at 35% 30%,#ffffff,#bdeeff 45%,#4aa6d8 85%)' },
        { id: 'galaxia', name: 'Galaxia', sw: 'radial-gradient(circle at 35% 30%,#b58cff,#2a1260 55%,#07041c)' },
        { id: 'oro', name: 'Oro', sw: 'linear-gradient(135deg,#fff6b8,#f2b21c 45%,#8a5a00 75%,#ffe27a)' },
        { id: 'basket', name: 'Baloncesto', sw: 'radial-gradient(circle at 35% 30%,#ffb066,#e8741a 60%,#8a3a06)' },
        { id: 'ev_navidad', name: 'Bola de Navidad', ev: 'navidad', price: 300, sw: 'radial-gradient(circle at 35% 30%,#ff9a9a,#d0161e 55%,#5a0408)' },
        { id: 'ev_corazon', name: 'Corazones', ev: 'sanvalentin', price: 300, sw: 'radial-gradient(circle at 35% 30%,#ffd0ec,#ff4fb0 60%,#8f1d63)' },
        { id: 'ev_flor', name: 'Flores', ev: 'primavera', price: 300, sw: 'radial-gradient(circle at 35% 30%,#ffffff,#d8f5c0 60%,#7fbf6a)' }
    ];
    const BALL_PAL = { ev_navidad: 'red', ev_corazon: 'heart', ev_flor: 'pink', fuego: 'orange', hielo: 'cyan', galaxia: 'purple', oro: 'gold', basket: 'orange', neon: 'cyan', meteoro: 'orange', calabaza: 'orange' };
    function ballPal() { return BALL_PAL[cfg.ball] || (S.lastTouch === 0 ? 'blue' : S.lastTouch === 1 ? 'orange' : 'gold'); }
    function sphereShade() {
        const s = ctx.createRadialGradient(-T.BALL_R * .35, -T.BALL_R * .4, T.BALL_R * .1, 0, 0, T.BALL_R * 1.05);
        s.addColorStop(0, 'rgba(255,255,255,.55)'); s.addColorStop(.45, 'rgba(255,255,255,0)'); s.addColorStop(1, 'rgba(0,0,20,.5)');
        ctx.fillStyle = s; ctx.beginPath(); ctx.arc(0, 0, T.BALL_R, 0, TAU); ctx.fill();
    }
    // balón clásico: icosaedro truncado de verdad (12 pentágonos y 20 hexágonos) proyectado en 3D, con costuras y cuero
    const SB = (() => {
        const f = (1 + Math.sqrt(5)) / 2, raw = [];
        for (const a of [-1, 1]) for (const c of [-f, f]) raw.push([0, a, c], [a, c, 0], [c, 0, a]);
        const nrm = v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
        const V = raw.map(nrm), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
        const sub = (p, q, n) => { const o = []; for (let i = 0; i <= n; i++) { const k = i / n; o.push(nrm([p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k])); } return o; };
        const pents = V.map((P, i) => {
            const N = V.map((q, j) => j).filter(j => j !== i && dot(P, V[j]) > .4 && dot(P, V[j]) < .5);
            const ax = Math.abs(P[0]) < .8 ? [1, 0, 0] : [0, 1, 0];
            let u = nrm([P[1] * ax[2] - P[2] * ax[1], P[2] * ax[0] - P[0] * ax[2], P[0] * ax[1] - P[1] * ax[0]]);
            const w = [P[1] * u[2] - P[2] * u[1], P[2] * u[0] - P[0] * u[2], P[0] * u[1] - P[1] * u[0]];
            N.sort((m, n) => Math.atan2(dot(V[m], w), dot(V[m], u)) - Math.atan2(dot(V[n], w), dot(V[n], u)));
            const pv = N.map(j => nrm([2 * P[0] + V[j][0], 2 * P[1] + V[j][1], 2 * P[2] + V[j][2]]));
            const ring = []; for (let k = 0; k < 5; k++) { const s = sub(pv[k], pv[(k + 1) % 5], 4); s.pop(); ring.push(...s); }
            return { c: P, ring };
        });
        const seams = [];
        for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) if (dot(V[i], V[j]) > .4 && dot(V[i], V[j]) < .5)
            seams.push(sub(nrm([2 * V[i][0] + V[j][0], 2 * V[i][1] + V[j][1], 2 * V[i][2] + V[j][2]]), nrm([V[i][0] + 2 * V[j][0], V[i][1] + 2 * V[j][1], V[i][2] + 2 * V[j][2]]), 3));
        const hexes = [], adj = (i, j) => dot(V[i], V[j]) > .4 && dot(V[i], V[j]) < .5;
        for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) if (adj(i, j)) for (let k = j + 1; k < 12; k++) if (adj(i, k) && adj(j, k)) {
            const A = V[i], B = V[j], C = V[k], m = (p, q) => nrm([2 * p[0] + q[0], 2 * p[1] + q[1], 2 * p[2] + q[2]]);
            const vs = [m(A, B), m(B, A), m(B, C), m(C, B), m(C, A), m(A, C)], ring = [];
            for (let e = 0; e < 6; e++) { const s = sub(vs[e], vs[(e + 1) % 6], 4); s.pop(); ring.push(...s); }
            hexes.push({ c: nrm([A[0] + B[0] + C[0], A[1] + B[1] + C[1], A[2] + B[2] + C[2]]), ring });
        }
        return { pents, seams, hexes };
    })();
    function classicBall(R, rot, t) {
        const base = ctx.createRadialGradient(-R * .3, -R * .35, R * .1, 0, 0, R);
        base.addColorStop(0, '#ffffff'); base.addColorStop(.55, '#fff6df'); base.addColorStop(1, '#e2c27a');
        ctx.fillStyle = base; ctx.fillRect(-R, -R, R * 2, R * 2);
        // rotación: inclinación fija + giro de rodadura + ligero cabeceo
        const tx = .62 + .05 * Math.sin(t * 1.3), ty = .45, cx = Math.cos(tx), sx = Math.sin(tx), cy = Math.cos(ty), sy = Math.sin(ty), cz = Math.cos(rot), sz = Math.sin(rot);
        const P = p => { let x = p[0] * cy + p[2] * sy, z = -p[0] * sy + p[2] * cy, y = p[1]; const y2 = y * cx - z * sx, z2 = y * sx + z * cx; return [x * cz - y2 * sz, x * sz + y2 * cz, z2]; };
        const lim = q => { if (q[2] >= 0) return [q[0] * R, q[1] * R]; const l = Math.hypot(q[0], q[1]) || 1; return [q[0] / l * R, q[1] / l * R]; };
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        const rp = SB.pents.map(pt => ({ c: P(pt.c), ring: pt.ring.map(P) }));
        // hexágonos abombados: más claros en el centro, tostados hacia las costuras
        for (const hx of SB.hexes) {
            const c = P(hx.c); if (c[2] < -.28) continue;
            ctx.beginPath(); hx.ring.forEach((p, i) => { const s = lim(P(p)); i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]); }); ctx.closePath();
            const cc = lim(c), hg = ctx.createRadialGradient(cc[0] - R * .08, cc[1] - R * .1, 1, cc[0], cc[1], R * .42);
            hg.addColorStop(0, '#ffffff'); hg.addColorStop(.55, '#fff3d6'); hg.addColorStop(1, '#d9b66a'); ctx.fillStyle = hg; ctx.fill();
        }
        // pentágonos
        for (const pt of rp) {
            if (pt.c[2] < -.28) continue;
            ctx.beginPath(); pt.ring.forEach((q, i) => { const s = lim(q); i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]); }); ctx.closePath();
            const cc = lim(pt.c), pg = ctx.createRadialGradient(cc[0] - R * .1, cc[1] - R * .12, 1, cc[0], cc[1], R * .4); pg.addColorStop(0, '#2a241a'); pg.addColorStop(1, '#070504');
            ctx.fillStyle = pg; ctx.fill();
            ctx.strokeStyle = 'rgba(255,214,110,.8)'; ctx.lineWidth = Math.max(.7, R * .028); ctx.stroke();
            ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(cc[0] - R * .1, cc[1] - R * .12, R * .12, R * .06, -.6, 0, TAU); ctx.fill(); ctx.restore();
        }
        // costuras entre hexágonos y borde de pentágonos (solo tramos visibles)
        const line = (pts, w, col, ox, oy) => {
            ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); let pen = false;
            for (const q of pts) { if (q[2] < -.02) { pen = false; continue; } const s = lim(q); if (pen) ctx.lineTo(s[0] + ox, s[1] + oy); else { ctx.moveTo(s[0] + ox, s[1] + oy); pen = true; } }
            ctx.stroke();
        };
        for (const sm of SB.seams) { const pts = sm.map(P); line(pts, R * .075, 'rgba(70,46,12,.85)', 0, 0); line(pts, R * .03, 'rgba(255,248,215,.7)', -R * .026, -R * .026); line(pts, R * .02, 'rgba(255,205,90,.55)', R * .02, R * .02); }
        for (const pt of rp) if (pt.c[2] > -.28) line(pt.ring.concat([pt.ring[0]]), R * .05, 'rgba(60,42,14,.55)', 0, 0);
        // textura de cuero: puntitos
        { const rg = ctx.createLinearGradient(-R, -R, R, R); rg.addColorStop(0, 'rgba(255,240,180,0)'); rg.addColorStop(.6, 'rgba(255,200,80,.0)'); rg.addColorStop(1, 'rgba(255,200,80,.6)');
          ctx.strokeStyle = rg; ctx.lineWidth = R * .14; ctx.beginPath(); ctx.arc(0, 0, R * .96, 0, TAU); ctx.stroke();
          const sg = ctx.createRadialGradient(-R * .42, -R * .5, 0, -R * .42, -R * .5, R * .55); sg.addColorStop(0, 'rgba(255,255,255,.3)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sg; ctx.fillRect(-R, -R, R * 2, R * 2); }
        ctx.fillStyle = 'rgba(120,80,20,.07)'; for (let i = 0; i < 40; i++) { const a = i * 2.4, r = ((i * 31) % 100) / 100 * R * .92; ctx.fillRect(Math.cos(a) * r, Math.sin(a) * r, 1.3, 1.3); }
    }
    // ---------- balones en esfera 3D (neón, playa, meteorito, disco, calabaza) ----------
    const llp = (la, lo) => [Math.cos(la) * Math.sin(lo), -Math.sin(la), Math.cos(la) * Math.cos(lo)];
    function mkP(rot, tx, ty) {
        const cx = Math.cos(tx), sx = Math.sin(tx), cy = Math.cos(ty), sy = Math.sin(ty), cz = Math.cos(rot), sz = Math.sin(rot);
        return p => { const x = p[0] * cy + p[2] * sy, z = -p[0] * sy + p[2] * cy, y = p[1], y2 = y * cx - z * sx, z2 = y * sx + z * cx; return [x * cz - y2 * sz, x * sz + y2 * cz, z2]; };
    }
    // dibuja en el plano tangente de un punto de la esfera: u = este, v = norte, en radianes de arco (se deforma y gira con la esfera)
    function onSph(P, R, la, lo, fn) {
        const q = P(llp(la, lo)); if (q[2] < .06) return;
        const E = P([Math.cos(lo), 0, -Math.sin(lo)]), N = P([-Math.sin(la) * Math.sin(lo), -Math.cos(la), -Math.sin(la) * Math.cos(lo)]);
        ctx.save(); ctx.transform(E[0] * R, E[1] * R, N[0] * R, N[1] * R, q[0] * R, q[1] * R); fn(q[2]); ctx.restore();
    }
    const limP = (q, R) => { if (q[2] >= 0) return [q[0] * R, q[1] * R]; const l = Math.hypot(q[0], q[1]) || 1; return [q[0] / l * R, q[1] / l * R]; };
    function lunePath(P, R, lo0, lo1, n) {
        ctx.beginPath(); let first = true;
        for (let i = 0; i <= n; i++) { const s = limP(P(llp(-Math.PI / 2 + Math.PI * i / n, lo0)), R); first ? ctx.moveTo(s[0], s[1]) : ctx.lineTo(s[0], s[1]); first = false; }
        for (let i = n; i >= 0; i--) { const s = limP(P(llp(-Math.PI / 2 + Math.PI * i / n, lo1)), R); ctx.lineTo(s[0], s[1]); }
        ctx.closePath();
    }
    const rng3 = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const MET = (() => {
        const r = rng3(77), cr = [[.35, .2, .3], [-.3, 1.1, .38], [.1, -.9, .26], [-.55, -.2, .22], [.6, 2.2, .3], [-.2, 2.9, .34], [.5, -2.2, .24], [-.7, 1.9, .2]];
        const cracks = []; for (let c = 0; c < 4; c++) { let la = (r() - .5) * 2, lo = r() * 6.28, a = r() * 6.28, pts = []; for (let i = 0; i < 9; i++) { pts.push([la, lo]); a += (r() - .5) * 1.4; la = Math.max(-1.3, Math.min(1.3, la + Math.sin(a) * .16)); lo += Math.cos(a) * .2; } cracks.push(pts); }
        const dots = []; for (let i = 0; i < 90; i++) dots.push([Math.asin(r() * 2 - 1), r() * 6.28, .008 + r() * .018]);
        return { cr, cracks, dots };
    })();
    const SPH3D = {
        neon(R, rot, t) {
            const bg = ctx.createRadialGradient(-R * .3, -R * .3, 2, 0, 0, R); bg.addColorStop(0, '#16205a'); bg.addColorStop(1, '#03051a'); ctx.fillStyle = bg; ctx.fillRect(-R, -R, R * 2, R * 2);
            const P = mkP(rot, .5, .35); ctx.globalCompositeOperation = 'lighter';
            const pu = .5 + .5 * Math.sin(t * 5), cg = ctx.createRadialGradient(0, 0, 1, 0, 0, R * .75); cg.addColorStop(0, 'rgba(170,255,246,' + (.35 + .25 * pu) + ')'); cg.addColorStop(.5, 'rgba(61,200,255,' + (.12 + .1 * pu) + ')'); cg.addColorStop(1, 'rgba(61,200,255,0)'); ctx.fillStyle = cg; ctx.fillRect(-R, -R, R * 2, R * 2);
            ctx.lineCap = 'round';
            const curve = (f, n, col, w) => { let pa = P(f(0)); for (let i = 1; i <= n; i++) { const pb = P(f(i / n)), z = (pa[2] + pb[2]) / 2; if (z > 0) { ctx.strokeStyle = 'rgba(' + col + ',' + (.25 + .75 * z).toFixed(2) + ')'; ctx.lineWidth = w * (.5 + .5 * z); ctx.beginPath(); ctx.moveTo(pa[0] * R, pa[1] * R); ctx.lineTo(pb[0] * R, pb[1] * R); ctx.stroke(); } pa = pb; } };
            for (let k = 0; k < 8; k++) curve(u => llp(-Math.PI / 2 + Math.PI * u, k * Math.PI / 8 * 2), 14, k % 2 ? '255,70,220' : '61,255,224', R * .07);
            for (const la of [-.9, -.45, 0, .45, .9]) curve(u => llp(la, u * 6.2832), 22, la === 0 ? '255,255,255' : '120,200,255', la === 0 ? R * .09 : R * .05);
            ctx.globalCompositeOperation = 'source-over';
        },
        playa(R, rot, t) {
            ctx.fillStyle = '#fff'; ctx.fillRect(-R, -R, R * 2, R * 2);
            const P = mkP(rot, .55, .2), cols = ['#ff4f4f', '#ffffff', '#3da8ff', '#ffd92e', '#34d17a', '#ffffff'], st = Math.PI * 2 / 6, ord = [];
            for (let i = 0; i < 6; i++) ord.push([P(llp(0, (i + .5) * st))[2], i]);
            ord.sort((a, b) => a[0] - b[0]);
            for (const [z, i] of ord) { if (z < -.55) continue; lunePath(P, R, i * st, (i + 1) * st, 10); ctx.fillStyle = cols[i]; ctx.fill(); }
            ctx.strokeStyle = 'rgba(0,0,40,.2)'; ctx.lineWidth = R * .03;
            for (let i = 0; i < 6; i++) { ctx.beginPath(); let pen = false; for (let k = 0; k <= 16; k++) { const q = P(llp(-Math.PI / 2 + Math.PI * k / 16, i * st)); if (q[2] < 0) { pen = false; continue; } pen ? ctx.lineTo(q[0] * R, q[1] * R) : ctx.moveTo(q[0] * R, q[1] * R); pen = true; } ctx.stroke(); }
            for (const la of [Math.PI / 2, -Math.PI / 2]) onSph(P, R, la, 0, () => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, .2, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,40,.3)'; ctx.lineWidth = .03; ctx.stroke(); ctx.fillStyle = '#d33'; ctx.beginPath(); ctx.arc(0, 0, .06, 0, TAU); ctx.fill(); });
            ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createLinearGradient(-R, -R, R * .4, R * .4); gl.addColorStop(0, 'rgba(255,255,255,.28)'); gl.addColorStop(.5, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.fillRect(-R, -R, R * 2, R * 2); ctx.globalCompositeOperation = 'source-over';
        },
        meteoro(R, rot, t) {
            const bg = ctx.createRadialGradient(-R * .3, -R * .35, 2, 0, 0, R); bg.addColorStop(0, '#a8866e'); bg.addColorStop(.55, '#4d362b'); bg.addColorStop(1, '#150c08'); ctx.fillStyle = bg; ctx.fillRect(-R, -R, R * 2, R * 2);
            const P = mkP(rot, .35, .3);
            ctx.fillStyle = 'rgba(15,8,5,.55)'; for (const [la, lo, r] of MET.dots) onSph(P, R, la, lo, () => { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); });
            for (const [la, lo, r] of MET.cr) onSph(P, R, la, lo, z => {
                const cg = ctx.createRadialGradient(r * .15, -r * .2, r * .1, 0, 0, r); cg.addColorStop(0, 'rgba(8,4,2,.85)'); cg.addColorStop(.8, 'rgba(30,18,12,.75)'); cg.addColorStop(1, 'rgba(60,40,30,.3)');
                ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
                ctx.strokeStyle = 'rgba(220,170,130,.6)'; ctx.lineWidth = r * .16; ctx.beginPath(); ctx.arc(0, 0, r * 1.02, 2.5, 5.0); ctx.stroke();
            });
            const pu = .75 + .25 * Math.sin(t * 4); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            for (const cr of MET.cracks) {
                const pts = cr.map(([la, lo]) => P(llp(la, lo)));
                for (const [w, col] of [[R * .14, 'rgba(255,90,10,' + (.25 * pu).toFixed(2) + ')'], [R * .06, 'rgba(255,170,50,' + (.8 * pu).toFixed(2) + ')'], [R * .022, 'rgba(255,245,200,' + pu.toFixed(2) + ')']]) {
                    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); let pen = false;
                    for (const q of pts) { if (q[2] < .02) { pen = false; continue; } pen ? ctx.lineTo(q[0] * R, q[1] * R) : ctx.moveTo(q[0] * R, q[1] * R); pen = true; } ctx.stroke();
                }
            }
            ctx.globalCompositeOperation = 'source-over';
        },
        disco(R, rot, t) {
            ctx.fillStyle = '#2a2f48'; ctx.fillRect(-R, -R, R * 2, R * 2);
            const P = mkP(rot, .45, .3), step = Math.PI / 12;
            for (let la = -Math.PI / 2 + step / 2 + step; la < Math.PI / 2 - step; la += step) {
                const n = Math.max(6, Math.round(26 * Math.cos(la))), dl = Math.PI * 2 / n, gp = .09;
                for (let k = 0; k < n; k++) {
                    const lo = k * dl, c = P(llp(la, lo + dl / 2)); if (c[2] < .02) continue;
                    const cs = [[la - step / 2 + step * gp, lo + dl * gp], [la - step / 2 + step * gp, lo + dl * (1 - gp)], [la + step / 2 - step * gp, lo + dl * (1 - gp)], [la + step / 2 - step * gp, lo + dl * gp]].map(([a, b]) => P(llp(a, b)));
                    const h = (la * 90 + lo * 40 + t * 70) % 360, fl = Math.sin(t * 3 + la * 11 + lo * 7), br = 40 + 38 * c[2] + (fl > .9 ? (fl - .9) * 300 : 0);
                    ctx.fillStyle = 'hsl(' + Math.abs(h).toFixed(0) + ',' + (28 + 25 * (fl > .9 ? 0 : 1)) + '%,' + Math.min(96, br).toFixed(0) + '%)';
                    ctx.beginPath(); cs.forEach((q, i) => i ? ctx.lineTo(q[0] * R, q[1] * R) : ctx.moveTo(q[0] * R, q[1] * R)); ctx.closePath(); ctx.fill();
                }
            }
        },
        calabaza(R, rot, t) {
            const P = mkP(rot, .38, .0), n = 8, st = Math.PI * 2 / n, ord = [];
            ctx.fillStyle = '#6a2a00'; ctx.fillRect(-R, -R, R * 2, R * 2);
            for (let i = 0; i < n; i++) ord.push([P(llp(0, (i + .5) * st))[2], i]);
            ord.sort((a, b) => a[0] - b[0]);
            for (const [z, i] of ord) {
                if (z < -.5) continue; const k = .5 + .5 * Math.max(0, z);
                lunePath(P, R, i * st, (i + 1) * st, 10); ctx.fillStyle = 'rgb(' + (255 * k | 0) + ',' + (120 * k | 0) + ',' + (10 * k | 0) + ')'; ctx.fill();
                lunePath(P, R, (i + .22) * st, (i + .78) * st, 10); ctx.fillStyle = 'rgba(255,190,90,' + (.32 * Math.max(0, z)).toFixed(2) + ')'; ctx.fill();
            }
            ctx.strokeStyle = 'rgba(70,24,0,.75)'; ctx.lineWidth = R * .07; ctx.lineCap = 'round';
            for (let i = 0; i < n; i++) { ctx.beginPath(); let pen = false; for (let k = 0; k <= 16; k++) { const q = P(llp(-Math.PI / 2 + Math.PI * k / 16, i * st)); if (q[2] < 0) { pen = false; continue; } pen ? ctx.lineTo(q[0] * R, q[1] * R) : ctx.moveTo(q[0] * R, q[1] * R); pen = true; } ctx.stroke(); }
            onSph(P, R, Math.PI / 2, 0, () => { ctx.fillStyle = '#4a7a1c'; ctx.beginPath(); ctx.arc(0, 0, .17, 0, TAU); ctx.fill(); ctx.fillStyle = '#2d4a10'; ctx.beginPath(); ctx.arc(0, 0, .09, 0, TAU); ctx.fill(); });
            // cara tallada que brilla por dentro
            onSph(P, R, -.05, 0, z => {
                ctx.globalCompositeOperation = 'lighter'; const fl = .8 + .2 * Math.sin(t * 9);
                const gl = ctx.createRadialGradient(0, 0, .05, 0, 0, .8); gl.addColorStop(0, 'rgba(255,190,40,' + (.5 * fl) + ')'); gl.addColorStop(1, 'rgba(255,120,0,0)'); ctx.fillStyle = gl; ctx.fillRect(-.9, -.9, 1.8, 1.8);
                ctx.fillStyle = 'rgba(255,220,70,' + (.95 * fl) + ')';
                for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * .42, .02); ctx.lineTo(s * .18, .02); ctx.lineTo(s * .3, .3); ctx.closePath(); ctx.fill(); }
                ctx.beginPath(); ctx.moveTo(0, -.02); ctx.lineTo(-.08, -.14); ctx.lineTo(.08, -.14); ctx.closePath(); ctx.fill();
                ctx.beginPath(); ctx.moveTo(-.42, -.26); for (let i = 0; i < 8; i++) ctx.lineTo(-.42 + i * .12 + .06, i % 2 ? -.26 : -.42); ctx.lineTo(.42, -.26); ctx.closePath(); ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
            });
        }
    };

    const GALX = (() => { const r = rng3(321), s = []; for (let i = 0; i < 70; i++) s.push([Math.asin(r() * 2 - 1), r() * 6.28, r(), r() * 6.28]); return s; })();
    const ICE = (() => { const r = rng3(909), c = []; for (let k = 0; k < 5; k++) { let la = (r() - .5) * 1.8, lo = r() * 6.28, a = r() * 6.28, pts = []; for (let i = 0; i < 6; i++) { pts.push([la, lo]); a += (r() - .5) * 1.8; la = Math.max(-1.3, Math.min(1.3, la + Math.sin(a) * .2)); lo += Math.cos(a) * .24; } c.push(pts); } return c; })();
    Object.assign(SPH3D, {
        fuego(R, rot, t) {
            const bg = ctx.createRadialGradient(0, 0, 1, 0, 0, R); bg.addColorStop(0, '#fff9c4'); bg.addColorStop(.3, '#ffbd2a'); bg.addColorStop(.7, '#e0400c'); bg.addColorStop(1, '#3a0505'); ctx.fillStyle = bg; ctx.fillRect(-R, -R, R * 2, R * 2);
            const P = mkP(rot * .6, .5, .3); ctx.globalCompositeOperation = 'lighter';
            // lenguas de plasma que recorren la superficie
            for (let i = 0; i < 9; i++) {
                const lo = i * .7 + t * (.6 + (i % 3) * .25), la = Math.sin(i * 2.1 + t * 1.3) * .9;
                onSph(P, R, la, lo, z => { const w = .5 + .5 * Math.sin(t * 8 + i * 1.7), h = .34 + .22 * w; const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, h); fg.addColorStop(0, 'rgba(255,240,150,' + (.55 * z) + ')'); fg.addColorStop(1, 'rgba(255,120,20,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(0, .06, h * .55, h, 0, 0, TAU); ctx.fill(); });
            }
            // núcleo caliente y chispas
            const cg = ctx.createRadialGradient(0, R * .1, 1, 0, R * .1, R * .6); cg.addColorStop(0, 'rgba(255,255,230,' + (.55 + .15 * Math.sin(t * 11)) + ')'); cg.addColorStop(1, 'rgba(255,200,60,0)'); ctx.fillStyle = cg; ctx.fillRect(-R, -R, R * 2, R * 2);
            for (let i = 0; i < 8; i++) { const a = t * 2.4 + i * .8, r = R * (.3 + .65 * ((t * .8 + i * .13) % 1)); ctx.fillStyle = 'rgba(255,245,180,' + (1 - r / R).toFixed(2) + ')'; ctx.fillRect(Math.cos(a) * r - 1.3, Math.sin(a) * r - 1.3, 2.6, 2.6); }
            // corona oscura del borde
            const rg = ctx.createRadialGradient(0, 0, R * .78, 0, 0, R); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(120,10,0,.55)'); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = rg; ctx.fillRect(-R, -R, R * 2, R * 2);
        },
        hielo(R, rot, t) {
            const bg = ctx.createRadialGradient(-R * .25, -R * .3, 2, 0, 0, R); bg.addColorStop(0, '#ffffff'); bg.addColorStop(.4, '#c8f1ff'); bg.addColorStop(1, '#3a8cc4'); ctx.fillStyle = bg; ctx.fillRect(-R, -R, R * 2, R * 2);
            const P = mkP(rot, .45, .3), step = Math.PI / 5, ord = [];
            // facetas de cristal: gajos alternos con distinto brillo
            for (let la = -Math.PI / 2; la < Math.PI / 2 - .01; la += step) { const n = Math.max(5, Math.round(10 * Math.cos(la + step / 2))), dl = Math.PI * 2 / n; for (let k = 0; k < n; k++) { const c = P(llp(la + step / 2, (k + .5) * dl)); if (c[2] > .0) ord.push([c, la, k * dl, dl, k]); } }
            for (const [c, la, lo, dl, k] of ord) {
                const q = [[la, lo], [la, lo + dl], [la + step, lo + dl * .85], [la + step, lo + dl * .15]].map(([a, b]) => P(llp(a, b)));
                const v = ((k * 7 + Math.round(la * 9)) % 5) / 5, lit = Math.max(0, c[2]);
                ctx.fillStyle = 'rgba(' + (200 + v * 55 | 0) + ',' + (235 + v * 20 | 0) + ',255,' + (.1 + .22 * v * lit).toFixed(2) + ')';
                ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p[0] * R, p[1] * R) : ctx.moveTo(p[0] * R, p[1] * R)); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,' + (.35 * lit).toFixed(2) + ')'; ctx.lineWidth = R * .02; ctx.stroke();
            }
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            for (const cr of ICE) { const pts = cr.map(([a, b]) => P(llp(a, b))); for (const [w, col] of [[R * .06, 'rgba(120,190,235,.35)'], [R * .02, 'rgba(255,255,255,.9)']]) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); let pen = false; for (const q of pts) { if (q[2] < .02) { pen = false; continue; } pen ? ctx.lineTo(q[0] * R, q[1] * R) : ctx.moveTo(q[0] * R, q[1] * R); pen = true; } ctx.stroke(); } }
            const tw = .5 + .5 * Math.sin(t * 5); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .45 + .5 * tw; ctx.fillStyle = '#fff'; ctx.translate(R * .32, -R * .3); ctx.fillRect(-R * .25 * tw - 1, -.9, R * .5 * tw + 2, 1.8); ctx.fillRect(-.9, -R * .25 * tw - 1, 1.8, R * .5 * tw + 2); ctx.restore();
        },
        galaxia(R, rot, t) {
            const bg = ctx.createRadialGradient(-R * .15, -R * .15, 2, 0, 0, R); bg.addColorStop(0, '#3a1a82'); bg.addColorStop(.55, '#150a40'); bg.addColorStop(1, '#03020c'); ctx.fillStyle = bg; ctx.fillRect(-R, -R, R * 2, R * 2);
            const P = mkP(rot * .5, .45, .25); ctx.globalCompositeOperation = 'lighter';
            // brazos de nebulosa
            for (let a = 0; a < 3; a++) for (let u = 0; u < 1; u += .05) {
                const la = (u - .5) * 2.2 + Math.sin(a * 2 + t * .4) * .1, lo = a * 2.1 + u * 5 + t * .35;
                onSph(P, R, la, lo, z => { const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, .34); const col = a % 2 ? '255,90,220' : '110,190,255'; gg.addColorStop(0, 'rgba(' + col + ',' + (.22 * z) + ')'); gg.addColorStop(1, 'rgba(' + col + ',0)'); ctx.fillStyle = gg; ctx.fillRect(-.4, -.4, .8, .8); });
            }
            // estrellas con brillo propio
            for (const [la, lo, m, ph] of GALX) { const q = P(llp(la, lo)); if (q[2] < .05) continue; const tw = .45 + .55 * Math.sin(t * 3.5 + ph), s = (m > .85 ? 2.6 : 1.5) * (R / 40); ctx.fillStyle = 'rgba(255,255,255,' + (tw * q[2]).toFixed(2) + ')'; ctx.fillRect(q[0] * R - s / 2, q[1] * R - s / 2, s, s); if (m > .9) { ctx.fillRect(q[0] * R - s * 1.6, q[1] * R - .4, s * 3.2, .8); ctx.fillRect(q[0] * R - .4, q[1] * R - s * 1.6, .8, s * 3.2); } }
            // anillo de luz
            ctx.strokeStyle = 'rgba(200,170,255,.35)'; ctx.lineWidth = R * .05; ctx.beginPath(); let pen = false; for (let i = 0; i <= 40; i++) { const q = P(llp(.0, i / 40 * 6.2832)); if (q[2] < 0) { pen = false; continue; } pen ? ctx.lineTo(q[0] * R, q[1] * R) : ctx.moveTo(q[0] * R, q[1] * R); pen = true; } ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
        },
        oro(R, rot, t) {
            // metal pulido: entorno reflejado que se desplaza al girar
            const sh = (rot * .6) % 1, bg = ctx.createLinearGradient(-R, -R, R, R); const stops = [['#fff3b0', 0], ['#f3b81c', .18], ['#7a4c00', .38], ['#ffe27a', .52], ['#b87800', .7], ['#fff0a0', .86], ['#8a5800', 1]];
            for (const [c, p] of stops) bg.addColorStop(Math.min(1, Math.max(0, (p + sh) % 1.0001)), c);
            ctx.fillStyle = '#d9a114'; ctx.fillRect(-R, -R, R * 2, R * 2);
            const P = mkP(rot, .4, .3); ctx.save(); ctx.rotate(rot * .5);
            for (let i = 0; i < 5; i++) { const gx = -R + ((i * .45 + rot * .3) % 2.2) * R; const bgr = ctx.createLinearGradient(gx, 0, gx + R * .5, 0); bgr.addColorStop(0, 'rgba(255,248,200,0)'); bgr.addColorStop(.5, 'rgba(255,248,200,' + (i % 2 ? .55 : .3) + ')'); bgr.addColorStop(1, 'rgba(255,248,200,0)'); ctx.fillStyle = bgr; ctx.fillRect(gx, -R, R * .5, R * 2); }
            for (let i = 0; i < 4; i++) { const gx = -R + ((i * .55 + .2 + rot * .2) % 2.2) * R; const bgr = ctx.createLinearGradient(gx, 0, gx + R * .35, 0); bgr.addColorStop(0, 'rgba(110,60,0,0)'); bgr.addColorStop(.5, 'rgba(110,60,0,.45)'); bgr.addColorStop(1, 'rgba(110,60,0,0)'); ctx.fillStyle = bgr; ctx.fillRect(gx, -R, R * .35, R * 2); }
            ctx.restore();
            // estrella grabada en relieve
            onSph(P, R, .1, 0, z => { ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? .22 : .5, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fillStyle = 'rgba(120,70,0,.35)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,240,170,.85)'; ctx.lineWidth = .035; ctx.stroke(); ctx.translate(.02, .02); ctx.strokeStyle = 'rgba(80,45,0,.7)'; ctx.lineWidth = .03; ctx.stroke(); });
            for (const la of [-.62, .62]) { ctx.strokeStyle = 'rgba(255,240,170,.45)'; ctx.lineWidth = R * .03; ctx.beginPath(); let pen = false; for (let i = 0; i <= 30; i++) { const q = P(llp(la, i / 30 * 6.2832)); if (q[2] < 0) { pen = false; continue; } pen ? ctx.lineTo(q[0] * R, q[1] * R) : ctx.moveTo(q[0] * R, q[1] * R); pen = true; } ctx.stroke(); }
            const swp = ((t * .6) % 1.8 - .4) * R * 2.4 - R; ctx.save(); ctx.rotate(-.55); ctx.globalCompositeOperation = 'lighter'; const sg = ctx.createLinearGradient(swp, 0, swp + R * .4, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sg; ctx.fillRect(swp, -R * 1.3, R * .4, R * 2.6); ctx.restore();
        },
        basket(R, rot, t) {
            const bg = ctx.createRadialGradient(-R * .3, -R * .35, 2, 0, 0, R); bg.addColorStop(0, '#ffb877'); bg.addColorStop(.55, '#e8701a'); bg.addColorStop(1, '#7a3205'); ctx.fillStyle = bg; ctx.fillRect(-R, -R, R * 2, R * 2);
            const P = mkP(rot, .35, .3);
            // poros de la piel
            for (let i = 0; i < 160; i++) { const la = Math.asin(((i * 61) % 200) / 100 - 1), lo = (i * 2.399) % 6.2832; const q = P(llp(la, lo)); if (q[2] < .05) continue; ctx.fillStyle = 'rgba(70,25,0,' + (.2 * q[2]).toFixed(2) + ')'; ctx.fillRect(q[0] * R - .8, q[1] * R - .8, 1.6, 1.6); ctx.fillStyle = 'rgba(255,200,140,' + (.1 * q[2]).toFixed(2) + ')'; ctx.fillRect(q[0] * R - .2, q[1] * R - 1.6, 1.4, 1.2); }
            // costuras: ecuador, meridiano y dos arcos laterales
            const seam = (f, n) => { for (const [w, col, o] of [[R * .075, 'rgba(25,10,2,.95)', 0], [R * .02, 'rgba(255,170,90,.35)', -R * .025]]) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); let pen = false; for (let i = 0; i <= n; i++) { const q = P(f(i / n)); if (q[2] < 0) { pen = false; continue; } pen ? ctx.lineTo(q[0] * R + o, q[1] * R + o) : ctx.moveTo(q[0] * R + o, q[1] * R + o); pen = true; } ctx.stroke(); } };
            seam(u => llp(0, u * 6.2832), 36); seam(u => llp(-Math.PI / 2 + Math.PI * u, 0), 24); seam(u => llp(-Math.PI / 2 + Math.PI * u, 1.25), 24); seam(u => llp(-Math.PI / 2 + Math.PI * u, -1.25), 24);
        }
    });
    function ballBody(b, t) {
        const R = T.BALL_R, id = cfg.ball;
        ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip();
        if (SPH3D[id]) { SPH3D[id](R, b.rot, t); }
        else if (id === 'neon') {
            const bg = ctx.createRadialGradient(-R * .3, -R * .3, 2, 0, 0, R); bg.addColorStop(0, '#1b2760'); bg.addColorStop(1, '#04061a');
            ctx.fillStyle = bg; ctx.fillRect(-R, -R, R * 2, R * 2);
            ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 3;
            for (let k = 0; k < 4; k++) { const cx = Math.abs(Math.cos(b.rot + k * Math.PI / 4)); ctx.strokeStyle = k % 2 ? 'rgba(255,70,220,.95)' : 'rgba(61,255,224,.95)'; ctx.beginPath(); ctx.ellipse(0, 0, Math.max(.5, R * cx), R - 1.5, 0, 0, TAU); ctx.stroke(); }
            ctx.strokeStyle = 'rgba(120,200,255,.8)'; ctx.beginPath(); ctx.ellipse(0, 0, R - 1.5, R * .22, 0, 0, TAU); ctx.stroke();
            { const pu = .5 + .5 * Math.sin(t * 5), cg = ctx.createRadialGradient(0, 0, 1, 0, 0, R * .7); cg.addColorStop(0, 'rgba(160,255,245,' + (.28 + .22 * pu) + ')'); cg.addColorStop(1, 'rgba(160,255,245,0)'); ctx.fillStyle = cg; ctx.fillRect(-R, -R, R * 2, R * 2); }
            ctx.globalCompositeOperation = 'source-over';
        } else if (id === 'playa') {
            const cols = ['#ff4a4a', '#ffffff', '#3dafff', '#ffe23a', '#ff4a4a', '#ffffff', '#3dafff', '#ffe23a'];
            ctx.rotate(b.rot);
            for (let i = 0; i < 8; i++) { ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R * 1.5, i * TAU / 8, (i + 1) * TAU / 8); ctx.closePath(); ctx.fill(); }
            ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 1.2; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * TAU / 8) * R * 1.5, Math.sin(i * TAU / 8) * R * 1.5); ctx.stroke(); }
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, R * .18, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.rotate(-b.rot);
        } else if (id === 'meteoro') {
            const bg = ctx.createRadialGradient(-R * .3, -R * .35, 2, 0, 0, R); bg.addColorStop(0, '#9c7a63'); bg.addColorStop(.6, '#4a3329'); bg.addColorStop(1, '#1c120e');
            ctx.fillStyle = bg; ctx.fillRect(-R, -R, R * 2, R * 2);
            ctx.rotate(b.rot);
            ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,' + (110 + 50 * Math.sin(t * 4)).toFixed(0) + ',30,' + (.7 + .25 * Math.sin(t * 4)).toFixed(2) + ')'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.shadowColor = '#ff7a1a'; ctx.shadowBlur = 6;
            for (let i = 0; i < 4; i++) { const a = i * 1.7 + .4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); ctx.lineTo(Math.cos(a + .25) * 18, Math.sin(a + .25) * 18); ctx.lineTo(Math.cos(a - .1) * 30, Math.sin(a - .1) * 30); ctx.stroke(); }
            ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
            for (const [x, y, r] of [[-14, -10, 8], [16, 6, 10], [-6, 20, 6], [20, -20, 5], [-24, 12, 5]]) { ctx.fillStyle = 'rgba(15,8,5,.7)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(200,150,110,.5)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x - 1, y - 1, r, .6, 3.4); ctx.stroke(); }
            ctx.rotate(-b.rot);
        } else if (id === 'disco') {
            ctx.fillStyle = '#9aa3c4'; ctx.fillRect(-R, -R, R * 2, R * 2);
            ctx.rotate(b.rot); const n = 7, cs = R * 2 / n;
            for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
                const v = .5 + .5 * Math.sin(i * 1.9 + j * 2.7 + t * 6 + b.rot * 3);
                ctx.fillStyle = 'hsl(' + ((i * 40 + j * 25 + t * 60) % 360).toFixed(0) + ',' + (30 + v * 40).toFixed(0) + '%,' + (45 + v * 45).toFixed(0) + '%)';
                ctx.fillRect(-R + i * cs + .6, -R + j * cs + .6, cs - 1.2, cs - 1.2);
                const fl = Math.sin(t * 3 + i * 5.1 + j * 3.3); if (fl > .93) { ctx.fillStyle = 'rgba(255,255,255,' + ((fl - .93) * 12).toFixed(2) + ')'; ctx.fillRect(-R + i * cs + .6, -R + j * cs + .6, cs - 1.2, cs - 1.2); }
            }
            ctx.rotate(-b.rot);
        } else if (id === 'calabaza') {
            const bg = ctx.createRadialGradient(-R * .3, -R * .35, 2, 0, 0, R); bg.addColorStop(0, '#ffc060'); bg.addColorStop(.6, '#ee6a0a'); bg.addColorStop(1, '#8a3a00');
            ctx.fillStyle = bg; ctx.fillRect(-R, -R, R * 2, R * 2);
            ctx.strokeStyle = 'rgba(110,40,0,.6)'; ctx.lineWidth = 2.4;
            for (let k = 0; k < 4; k++) { const cx = Math.abs(Math.cos(b.rot + k * Math.PI / 4)); ctx.beginPath(); ctx.ellipse(0, 0, Math.max(.5, R * cx), R - 1, 0, 0, TAU); ctx.stroke(); }
            ctx.strokeStyle = 'rgba(255,200,120,.28)'; ctx.lineWidth = 1.4; for (let k = 0; k < 4; k++) { const cx = Math.abs(Math.cos(b.rot + k * Math.PI / 4)); ctx.beginPath(); ctx.ellipse(-1.5, 0, Math.max(.5, R * cx), R - 3, 0, 0, TAU); ctx.stroke(); }
            const cs = Math.cos(b.rot), sn = Math.sin(b.rot);
            if (cs > .05) {
                ctx.save(); ctx.translate(sn * R * .75, 0); ctx.scale(cs, 1);
                ctx.fillStyle = '#2a1000'; ctx.beginPath(); ctx.moveTo(-14, -8); ctx.lineTo(-5, -8); ctx.lineTo(-9.5, -17); ctx.closePath(); ctx.fill();
                ctx.beginPath(); ctx.moveTo(5, -8); ctx.lineTo(14, -8); ctx.lineTo(9.5, -17); ctx.closePath(); ctx.fill();
                ctx.beginPath(); ctx.moveTo(-17, 6); for (let i = 0; i < 7; i++) ctx.lineTo(-17 + i * 5.7 + 2.85, i % 2 ? 6 : 15); ctx.lineTo(17, 6); ctx.closePath(); ctx.fill();
                ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,190,40,.55)'; ctx.fillRect(-12, -6, 24, 3); ctx.globalCompositeOperation = 'source-over';
                ctx.restore();
            }
        } else if (id === 'fuego') {
            const bg = ctx.createRadialGradient(0, R * .15, 2, 0, 0, R); bg.addColorStop(0, '#fff6b0'); bg.addColorStop(.3, '#ffb21a'); bg.addColorStop(.7, '#d9360a'); bg.addColorStop(1, '#3a0505');
            ctx.fillStyle = bg; ctx.fillRect(-R, -R, R * 2, R * 2);
            ctx.globalCompositeOperation = 'lighter'; ctx.rotate(b.rot * .5);
            for (let i = 0; i < 7; i++) { const a = i * TAU / 7, w2 = .5 + .5 * Math.sin(t * 9 + i * 2.1); ctx.fillStyle = 'rgba(255,' + (140 + w2 * 90).toFixed(0) + ',40,.5)'; ctx.beginPath(); ctx.moveTo(Math.cos(a - .28) * R * .35, Math.sin(a - .28) * R * .35); ctx.quadraticCurveTo(Math.cos(a) * R * (.8 + w2 * .3), Math.sin(a) * R * (.8 + w2 * .3), Math.cos(a + .28) * R * .35, Math.sin(a + .28) * R * .35); ctx.fill(); }
            ctx.rotate(-b.rot * .5);
            for (let i = 0; i < 6; i++) { const a = t * 3 + i * 1.05, r = R * (.35 + .55 * ((t * .9 + i * .17) % 1)); ctx.fillStyle = 'rgba(255,240,170,' + (1 - r / R).toFixed(2) + ')'; ctx.fillRect(Math.cos(a) * r - 1.2, Math.sin(a) * r - 1.2, 2.4, 2.4); }
            ctx.globalCompositeOperation = 'source-over';
        } else if (id === 'hielo') {
            const bg = ctx.createRadialGradient(-R * .3, -R * .35, 2, 0, 0, R); bg.addColorStop(0, '#ffffff'); bg.addColorStop(.45, '#bdeeff'); bg.addColorStop(1, '#3f95c8');
            ctx.fillStyle = bg; ctx.fillRect(-R, -R, R * 2, R * 2);
            ctx.rotate(b.rot); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
            for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.stroke(); ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * .55 - Math.sin(a) * 8, Math.sin(a) * R * .55 + Math.cos(a) * 8); ctx.lineTo(Math.cos(a) * R * .72, Math.sin(a) * R * .72); ctx.lineTo(Math.cos(a) * R * .55 + Math.sin(a) * 8, Math.sin(a) * R * .55 - Math.cos(a) * 8); ctx.stroke(); }
            ctx.strokeStyle = 'rgba(70,150,210,.55)'; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + .26; ctx.lineTo(Math.cos(a) * R * .85, Math.sin(a) * R * .85); } ctx.closePath(); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,.16)'; for (let i = 0; i < 6; i += 2) { const a = i * TAU / 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.lineTo(Math.cos(a + TAU / 6) * R, Math.sin(a + TAU / 6) * R); ctx.closePath(); ctx.fill(); }
            ctx.rotate(-b.rot);
            { const tw = .5 + .5 * Math.sin(t * 5); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5 + tw * .5; ctx.fillStyle = '#fff'; ctx.translate(R * .3, -R * .35); ctx.fillRect(-R * .22 * tw - 1, -.8, R * .44 * tw + 2, 1.6); ctx.fillRect(-.8, -R * .22 * tw - 1, 1.6, R * .44 * tw + 2); ctx.restore(); }
        } else if (id === 'galaxia') {
            const bg = ctx.createRadialGradient(-R * .2, -R * .2, 2, 0, 0, R); bg.addColorStop(0, '#5a2fb8'); bg.addColorStop(.55, '#1d0d4e'); bg.addColorStop(1, '#05030f');
            ctx.fillStyle = bg; ctx.fillRect(-R, -R, R * 2, R * 2);
            ctx.rotate(b.rot); ctx.globalCompositeOperation = 'lighter';
            for (let a = 0; a < 3; a++) { ctx.strokeStyle = a % 2 ? 'rgba(255,90,220,.35)' : 'rgba(120,200,255,.35)'; ctx.lineWidth = 7; ctx.beginPath(); for (let u = 0; u < 1; u += .06) { const r = u * R * 1.05, an = a * 2.1 + u * 4.2; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } ctx.stroke(); }
            { const ng = ctx.createRadialGradient(R * .25, R * .1, 1, R * .25, R * .1, R * .6); ng.addColorStop(0, 'rgba(255,110,220,.35)'); ng.addColorStop(1, 'rgba(255,110,220,0)'); ctx.fillStyle = ng; ctx.fillRect(-R, -R, R * 2, R * 2); }
            for (let i = 0; i < 28; i++) { const an = i * 2.4, r = ((i * 37) % 100) / 100 * R * .95, tw = .5 + .5 * Math.sin(t * 4 + i); ctx.fillStyle = 'rgba(255,255,255,' + (.35 + tw * .6) + ')'; ctx.fillRect(Math.cos(an) * r - 1, Math.sin(an) * r - 1, 2 + (i % 3 === 0), 2 + (i % 3 === 0)); }
            ctx.rotate(-b.rot); ctx.globalCompositeOperation = 'source-over';
        } else if (id === 'oro') {
            const bg = ctx.createLinearGradient(-R, -R, R, R); bg.addColorStop(0, '#fff6b8'); bg.addColorStop(.3, '#f2b21c'); bg.addColorStop(.55, '#8a5a00'); bg.addColorStop(.75, '#ffe27a'); bg.addColorStop(1, '#b97b00');
            ctx.fillStyle = bg; ctx.fillRect(-R, -R, R * 2, R * 2);
            ctx.rotate(b.rot); ctx.strokeStyle = 'rgba(120,70,0,.5)'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, R * (.3 + i * .27), .3, 2.6); ctx.stroke(); }
            ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(-R, -R * .2); ctx.lineTo(-R * .6, -R); ctx.lineTo(-R * .35, -R); ctx.lineTo(-R * .75, -R * .1); ctx.closePath(); ctx.fill(); ctx.rotate(-b.rot);
            ctx.strokeStyle = 'rgba(255,240,170,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, R * .84, 3.4, 5.3); ctx.stroke(); ctx.strokeStyle = 'rgba(90,50,0,.55)'; ctx.beginPath(); ctx.arc(0, 0, R * .84, .25, 2.1); ctx.stroke();
            const sh = ((t * .7) % 1.6 - .3) * R * 2.4 - R; ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.save(); ctx.rotate(-.5); ctx.fillRect(sh, -R * 1.2, R * .25, R * 2.4); ctx.restore();
        } else if (id === 'basket') {
            const bg = ctx.createRadialGradient(-R * .3, -R * .35, 2, 0, 0, R); bg.addColorStop(0, '#ffb066'); bg.addColorStop(.6, '#e8741a'); bg.addColorStop(1, '#8a3a06');
            ctx.fillStyle = bg; ctx.fillRect(-R, -R, R * 2, R * 2);
            ctx.rotate(b.rot); ctx.strokeStyle = '#1a0c04'; ctx.lineWidth = 2.6;
            ctx.beginPath(); ctx.moveTo(-R, 0); ctx.lineTo(R, 0); ctx.moveTo(0, -R); ctx.lineTo(0, R); ctx.stroke();
            ctx.beginPath(); ctx.arc(-R * 1.05, 0, R * .75, -1.1, 1.1); ctx.stroke(); ctx.beginPath(); ctx.arc(R * 1.05, 0, R * .75, Math.PI - 1.1, Math.PI + 1.1); ctx.stroke();
            ctx.save(); ctx.translate(-1, -1); ctx.strokeStyle = 'rgba(255,170,90,.3)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-R, 0); ctx.lineTo(R, 0); ctx.moveTo(0, -R); ctx.lineTo(0, R); ctx.stroke(); ctx.restore();
            ctx.fillStyle = 'rgba(0,0,0,.16)'; for (let i = 0; i < 26; i++) { const a = i * 2.4, r = ((i * 29) % 100) / 100 * R * .9; ctx.fillRect(Math.cos(a) * r, Math.sin(a) * r, 1.6, 1.6); }
            ctx.rotate(-b.rot);
        } else if (id === 'ev_navidad') {
            const bg = ctx.createRadialGradient(-R * .3, -R * .35, 2, 0, 0, R); bg.addColorStop(0, '#ff8a8a'); bg.addColorStop(.55, '#d0161e'); bg.addColorStop(1, '#4a0206');
            ctx.fillStyle = bg; ctx.fillRect(-R, -R, R * 2, R * 2); ctx.rotate(b.rot);
            ctx.fillStyle = '#f2c23a'; ctx.fillRect(-R, -R * .17, R * 2, R * .34); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-R, -R * .17, R * 2, R * .07);
            ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.6;
            for (const [sx, sy] of [[0, -R * .55], [0, R * .55]]) for (let k = 0; k < 3; k++) { const an = k * Math.PI / 3; ctx.beginPath(); ctx.moveTo(sx - Math.cos(an) * 7, sy - Math.sin(an) * 7); ctx.lineTo(sx + Math.cos(an) * 7, sy + Math.sin(an) * 7); ctx.stroke(); }
            ctx.fillStyle = '#fff'; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.arc(-R + (k + .5) * R / 4, 0, 1.4, 0, TAU); ctx.fill(); }
            ctx.rotate(-b.rot);
        } else if (id === 'ev_corazon') {
            const bg = ctx.createRadialGradient(-R * .3, -R * .35, 2, 0, 0, R); bg.addColorStop(0, '#ffd0ec'); bg.addColorStop(.6, '#ff4fb0'); bg.addColorStop(1, '#7a1050');
            ctx.fillStyle = bg; ctx.fillRect(-R, -R, R * 2, R * 2); ctx.rotate(b.rot);
            for (let k = 0; k < 7; k++) { const an = k * 2.4, r = k ? R * (.35 + (k % 3) * .2) : 0; ctx.fillStyle = k % 2 ? '#ffffff' : '#e0105a'; heartPath(ctx, Math.cos(an) * r, Math.sin(an) * r + 2, k ? 6 : 9); ctx.fill(); }
            ctx.rotate(-b.rot);
        } else if (id === 'ev_flor') {
            const bg = ctx.createRadialGradient(-R * .3, -R * .35, 2, 0, 0, R); bg.addColorStop(0, '#ffffff'); bg.addColorStop(.6, '#d8f5c0'); bg.addColorStop(1, '#5a9a4a');
            ctx.fillStyle = bg; ctx.fillRect(-R, -R, R * 2, R * 2); ctx.rotate(b.rot);
            const F = ['#ff9ad8', '#ffe23a', '#b58cff', '#ff6a5c', '#7fd0ff'];
            for (let k = 0; k < 6; k++) { const an = k * 1.05, r = k ? R * .62 : 0, fx = Math.cos(an) * r, fy = Math.sin(an) * r, s = k ? 4.5 : 6;
                ctx.fillStyle = F[k % 5]; for (let p = 0; p < 5; p++) { const pa = p * TAU / 5; ctx.beginPath(); ctx.arc(fx + Math.cos(pa) * s * .8, fy + Math.sin(pa) * s * .8, s * .6, 0, TAU); ctx.fill(); }
                ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(fx, fy, s * .45, 0, TAU); ctx.fill(); }
            ctx.rotate(-b.rot);
        } else {
            classicBall(R, b.rot, t);
        }
        ctx.restore();
        if (id !== 'classic') sphereShade();
        else { const cs2 = ctx.createRadialGradient(-R * .3, -R * .35, R * .15, 0, 0, R * 1.02); cs2.addColorStop(0, 'rgba(255,255,255,.3)'); cs2.addColorStop(.45, 'rgba(255,255,255,0)'); cs2.addColorStop(.8, 'rgba(90,50,0,.28)'); cs2.addColorStop(1, 'rgba(40,20,0,.62)'); ctx.fillStyle = cs2; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill(); }
        { // luz de rebote desde abajo y reflejo nítido
            ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
            const tint = id === 'fuego' || id === 'basket' || id === 'calabaza' || id === 'meteoro' ? '255,150,70' : id === 'oro' ? '255,220,120' : id === 'galaxia' ? '170,120,255' : '110,170,255';
            const bl = ctx.createRadialGradient(R * .3, R * .62, 1, R * .3, R * .62, R * .8); bl.addColorStop(0, 'rgba(' + tint + ',.3)'); bl.addColorStop(1, 'rgba(' + tint + ',0)');
            ctx.fillStyle = bl; ctx.fillRect(-R, -R, R * 2, R * 2); ctx.restore();
        }
        ctx.fillStyle = 'rgba(255,255,255,.78)'; ctx.beginPath(); ctx.ellipse(-R * .38, -R * .42, R * .22, R * .12, -.6, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(-R * .16, -R * .56, R * .045, 0, TAU); ctx.fill();
        ctx.strokeStyle = id === 'neon' ? 'rgba(61,255,224,.9)' : id === 'fuego' ? 'rgba(120,20,5,.95)' : id === 'hielo' ? 'rgba(60,140,200,.9)' : id === 'galaxia' ? 'rgba(180,140,255,.9)' : id === 'oro' ? 'rgba(110,70,0,.95)' : id === 'basket' ? 'rgba(40,16,4,.95)' : id === 'meteoro' ? 'rgba(30,15,10,.9)' : id === 'calabaza' ? 'rgba(90,30,0,.9)' : 'rgba(80,52,6,.9)';
        ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
        if (id === 'disco' && Math.random() < .35 * fk) { const a = Math.random() * TAU, r = Math.random() * R * .8; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glow('white'), Math.cos(a) * r - 9, Math.sin(a) * r - 9, 18, 18); ctx.restore(); }
    }

    function drawHitboxes() {
        const w = S.world;
        ctx.save(); ctx.lineWidth = 2.2; ctx.setLineDash([7, 5]); ctx.strokeStyle = 'rgba(70,255,170,.95)'; ctx.fillStyle = 'rgba(70,255,170,.10)';
        for (const c of w.cars) {
            const co = Math.cos(c.a), si = Math.sin(c.a);
            for (const h of c.hb) { const lx = h[0] * c.f; ctx.beginPath(); ctx.arc(c.x + co * lx - si * h[1], c.y + si * lx + co * h[1], h[2], 0, TAU); ctx.fill(); ctx.stroke(); }
        }
        ctx.beginPath(); ctx.arc(w.ball.x, w.ball.y, T.BALL_R, 0, TAU); ctx.stroke();
        { const b = w.ball, ww = b.w || 0;      // marca de giro, flecha de giro y último punto de contacto
          ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + Math.cos(b.rot) * T.BALL_R, b.y + Math.sin(b.rot) * T.BALL_R); ctx.stroke();
          if (Math.abs(ww) > 1.2) { const a0 = b.rot + .6, a1 = a0 + Math.max(-1.6, Math.min(1.6, ww * .12)); ctx.strokeStyle = 'rgba(255,230,90,.95)'; ctx.beginPath(); ctx.arc(b.x, b.y, T.BALL_R + 8, a0, a1, a1 < a0); ctx.stroke(); }
          if ((b.cAge || 99) < 40) { ctx.fillStyle = 'rgba(255,90,90,' + (1 - b.cAge / 40) + ')'; ctx.beginPath(); ctx.arc(b.cx, b.cy, 4.5, 0, TAU); ctx.fill(); } }
        ctx.restore();
    }

    function drawParts() {
        for (const p of parts) {
            const k = p.l / p.m, r = Math.max(1, p.s * (.35 + .65 * k));
            ctx.globalAlpha = Math.min(1, k * 1.5) * (p.add ? .95 : .5);
            ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
            ctx.drawImage(glow(p.pal), p.x - r, p.y - r, r * 2, r * 2);
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function drawRings() {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const r of rings) {
            const k = r.l / r.m; ctx.strokeStyle = 'rgba(' + PAL[r.pal].join(',') + ',' + (k * .85) + ')'; ctx.lineWidth = r.w * k + 1;
            ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
        }
        ctx.restore();
    }

    // cámara dinámica: zoom suave (máx. 12 %) hacia la jugada en disparos fuertes, aéreos y goles
    const CAM = { z: 1, fx: .5, fy: .5, last: 0 };
    function camUpdate(now) {
        const dt = clamp((now - (CAM.last || now)) / 1000, 0, .1); CAM.last = now;
        let k = 0, fx = .5, fy = .5;
        const w = S.world, live = cfg.cam && (S.state === 'play' || S.state === 'goal' || S.state === 'replay') && S.mode !== 'drill';
        if (live && w) {
            const b = w.ball, bxs = (ox + b.x * sc) / cw, bys = (oy + b.y * sc) / ch;
            S.camKick = Math.max(0, (S.camKick || 0) - dt * .55);
            k = S.camKick;
            for (const c of w.cars) if (!c.grounded && c.y < H - 200 && Math.hypot(c.x - b.x, c.y - b.y) < 260) k = Math.max(k, .55);      // aéreo cerca del balón
            if (S.state === 'goal') { k = Math.max(k, clamp((S.goalT - .6) / 1.2, 0, 1)); fx = clamp((ox + S.goalX * sc) / cw, .08, .92); fy = clamp((oy + (H - GH / 2) * sc) / ch, .2, .8); }
            else { fx = .5 + (clamp(bxs, 0, 1) - .5) * .8; fy = .5 + (clamp(bys, 0, 1) - .5) * .8; }
        }
        const zt = 1 + .12 * k, sp = zt > CAM.z ? 5 : 1.3;
        CAM.z += (zt - CAM.z) * Math.min(1, dt * sp);
        CAM.fx += (fx - CAM.fx) * Math.min(1, dt * 4); CAM.fy += (fy - CAM.fy) * Math.min(1, dt * 4);
        if (!cfg.cam) { CAM.z = 1; CAM.fx = .5; CAM.fy = .5; }
    }
    let crtPat = null;
    function draw(now) {
        if (!cw) return;
        camUpdate(now);
        const t = now / 1000, z = (1 + S.punch * 0.03) * CAM.z;
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        const dx = cv.width * CAM.fx, dy = cv.height * CAM.fy;
        ctx.setTransform(z, 0, 0, z, dx * (1 - z), dy * (1 - z));
        ctx.drawImage(staticCv, 0, 0);
        const sx = shake ? (Math.random() - 0.5) * shake : 0, sy = shake ? (Math.random() - 0.5) * shake : 0;
        ctx.setTransform(z * dpr * sc, 0, 0, z * dpr * sc, z * dpr * (ox + sx) + dx * (1 - z), z * dpr * (oy + sy) + dy * (1 - z));
        const w = S.world;

        // fondo animado dentro del estadio
        ctx.save(); arenaPath(ctx); ctx.clip();
        if (cfg.stad === 'neon') { if (Q.beams) drawBeams(t); drawLED(t); } else drawThemeFX(t);
        if (Q.beams && S.state !== 'menu') drawStadiumLive(t);
        if (Q.ultra) drawUltraFX(t);
        if (cfg.sky && S.state !== 'menu') drawSky(t);
        drawArenaLive(t);
        drawJumbo(t);
        if (Q.crowd && flashes.length) {
            ctx.globalCompositeOperation = 'lighter';
            for (const f of flashes) { const r = 12 * (f.l / f.m) + 3; ctx.globalAlpha = Math.min(1, f.l / f.m * 1.4); ctx.drawImage(glow('white'), f.x - r, f.y - r, r * 2, r * 2); }
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
        // columna de luz en la portería tras un gol
        if (S.state === 'goal' || S.goalT > 0) {
            const a = clamp(S.goalT / 2.6, 0, 1);
            if (a > 0 && S.state === 'goal') {
                ctx.globalCompositeOperation = 'lighter';
                const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(' + PAL[S.goalCol].join(',') + ',0)'); g.addColorStop(1, 'rgba(' + PAL[S.goalCol].join(',') + ',' + (.5 * a) + ')');
                ctx.fillStyle = g; ctx.fillRect(S.goalX - 70, 0, 140, H);
                ctx.globalCompositeOperation = 'source-over';
            }
        }
        ctx.restore();
        drawChase(t);

        drawPads(t);
        drawShadows();
        for (const c of w.cars) {
            if (Q.ultra) { const cs = Math.hypot(c.vx, c.vy); if (cs > 650) { const ox0 = c.x, oy0 = c.y, a0 = ctx.globalAlpha; for (let k = 3; k >= 1; k--) { c.x = ox0 - c.vx * .0075 * k * (1 / Math.max(.6, S.slow)); c.y = oy0 - c.vy * .0075 * k; ctx.globalAlpha = a0 * .17 * (4 - k) / 3 * Math.min(1, (cs - 650) / 500); drawCar(c, t); } c.x = ox0; c.y = oy0; ctx.globalAlpha = a0; } }
            if (S.mode === 'drill' && c.ghost) continue;
            if (S.mode === 'free' && c.team === 1) { ctx.globalAlpha = 0.3; drawCar(c, t); ctx.globalAlpha = 1; } else drawCar(c, t);
        }
        if (S.v2 && w.cars.length === 4 && S.state !== 'menu') drawTeamMarks(now);
        if (S.mode === 'drill' && S.drill && S.drill.target && S.state !== 'menu') drawTarget(S.drill.target, now / 1000);
        if (!(S.state === 'goal' || (S.state === 'replay' && S.rp && S.rp.boomed))) { drawBall(w.ball); if (w.ball2) drawBall(w.ball2, true); }      // al marcar, el balón explota y desaparece
        if (cfg.hit) drawHitboxes();
        drawParts();
        drawRings();
        drawBolts();
        drawDancer(now / 1000);           // el piloto va por encima de las partículas para que se vea bien

        // destello de gol y viñeta
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (cfg.stad === 'retro' && cfg.crt && Q.beams) {      // líneas de televisor antiguo (muy suaves)
            if (!crtPat) { const pc = document.createElement('canvas'); pc.width = 1; pc.height = 3; const p2 = pc.getContext('2d'); p2.fillStyle = 'rgba(0,0,0,.2)'; p2.fillRect(0, 0, 1, 1); crtPat = ctx.createPattern(pc, 'repeat'); }
            ctx.fillStyle = crtPat; ctx.fillRect(0, 0, cv.width, cv.height);
            ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,40,180,.025)'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalCompositeOperation = 'source-over';
        }
        if (S.flash > 0.01) { ctx.fillStyle = 'rgba(255,255,255,' + (S.flash * .45) + ')'; ctx.fillRect(0, 0, cv.width, cv.height); }
        if (Q.ultra) {      // etalonaje: azul frío arriba y cálido abajo
            ctx.globalCompositeOperation = 'soft-light';
            const gr = ctx.createLinearGradient(0, 0, 0, cv.height); gr.addColorStop(0, 'rgba(70,110,255,.22)'); gr.addColorStop(.55, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,160,80,.2)');
            ctx.fillStyle = gr; ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalCompositeOperation = 'source-over';
        }
        ctx.drawImage(vigCv, 0, 0);

        // resplandor (bloom): versión pequeña, contrastada y desenfocada, sumada encima
        if (Q.bloom) {
            bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.globalCompositeOperation = 'source-over';
            bctx.filter = 'brightness(.9) contrast(1.45)';
            bctx.drawImage(cv, 0, 0, bloomCv.width, bloomCv.height);
            bctx.filter = 'none';
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .6; ctx.filter = 'blur(' + Math.round(5 * dpr) + 'px)';
            ctx.drawImage(bloomCv, 0, 0, cv.width, cv.height);
            ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
            if (Q.bloom2) {      // segundo resplandor, más ancho y suave
                b2ctx.setTransform(1, 0, 0, 1, 0, 0); b2ctx.clearRect(0, 0, bloom2Cv.width, bloom2Cv.height); b2ctx.filter = 'brightness(.85) contrast(1.6) blur(2px)'; b2ctx.drawImage(bloomCv, 0, 0, bloom2Cv.width, bloom2Cv.height); b2ctx.filter = 'none';      // desde el resplandor pequeño: barato
                ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .42;
                ctx.drawImage(bloom2Cv, 0, 0, cv.width, cv.height);
                ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
            }
        }
    }

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
    segment('segGfx', 'gfx', String, applyGfx); segment('segCup', 'cupSize', Number, () => renderCup()); segment('segReplay', 'replay', v => v === '1', null); segment('segSky', 'sky', v => v === '1', null); segment('segHapI', 'hapI', String, () => buzz(40, 'test')); $('rpSkip').addEventListener('click', skipReplay); segment('segFps', 'fps', v => v === '1', () => { if (fpsBox) fpsBox.style.display = cfg.fps ? 'block' : 'none'; }); segment('segStad', 'stadSel', String, applyStad); segment('segEvt', 'evt', String, () => { evRefresh(); resize(); evUI(); }); segment('segCam', 'cam', v => v === '1', null); segment('segCrt', 'crt', v => v === '1', null);
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
    let sel = cfg.car, gShowHit = false;
    function showInfo(id) {
        const info = CARS.LIST.find(c => c.id === id), t = T.TYPES[id], rar = CARS.RARITY[info.rarity], te = T.TYPES[cfg.car], lk = isLocked(id);
        if (!info || !t) return;
        $('carInfo').style.setProperty('--rc', rar.color); $('gStage').style.setProperty('--rc', rar.color);
        $('ciName').textContent = lk ? '???' : info.name; $('ciRar').textContent = rar.name; $('ciTag').textContent = lk ? '' : info.tag;
        $('ciDesc').textContent = lk ? 'Rareza cromática, la más difícil de conseguir. ' + chromaHint() : info.desc;
        { const gh = $('gHint'); gh.hidden = !lk; if (lk) gh.querySelector('span').textContent = chromaHint(); }
        $('ciHit').textContent = lk ? 'Bloqueado' : 'Hitbox ' + hbSize(t) + '  ·  Peso ' + t.mass.toFixed(2) + '  ·  Turbo máx. ' + t.boostMax;
        $('ciStats').innerHTML = lk ? '' : STAT_DEFS.map(d => {
            const f = ty => clamp((d[1](ty) - d[2]) / (d[3] - d[2]), .05, 1), p = f(t), v = Math.max(1, Math.round(p * 10)), ve = Math.max(1, Math.round(f(te) * 10));
            const cmp = id !== cfg.car, dl = v - ve;
            return '<div class="srow"><span>' + d[0] + '</span><div class="bar"><i style="width:' + Math.round(p * 100) + '%"></i>' + (cmp ? '<u style="left:' + Math.round(f(te) * 100) + '%"></u>' : '') + '</div><em class="' + (cmp && dl ? (dl > 0 ? 'up' : 'dn') : '') + '">' + v + (cmp && dl ? ' ' + (dl > 0 ? '+' : '') + dl : '') + '</em></div>';
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
        showInfo(id); if (!quiet) { sfx('click'); buzz(10, 'ui'); }
    }
    function equipCar(id) {
        if (isLocked(id)) return;
        cfg.car = id; store.set('car', id);
        T.applyType(S.world.cars[0], id); T.kickoff(S.world); S.world.cars[0].spd = 1;
        selCar(id, true); sfx('unlock'); buzz([15, 20, 25], 'ui');
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

    // ---------- Online: partido contra un amigo (WebRTC con PeerJS) ----------
    // Quien crea la sala es el anfitrión y su física manda: goles, reloj y estado del partido. El invitado simula por su
    // cuenta para que su coche responda al instante y, con cada foto del anfitrión, se recoloca y vuelve a aplicar los
    // mandos que el anfitrión aún no ha recibido. Los dos se ven como el azul de la izquierda: el invitado ve el campo en espejo.
    const NET_PRE = 'tga-sala-', NET_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const NCK = ['x', 'y', 'vx', 'vy', 'a', 'w', 'f', 'boost', 'grounded', 'nx', 'ny', 'jumpLock', 'airT', 'used', 'flipT', 'flipDir', 'boosting', 'wheel', 'roll', 'rw', 'resetCd', 'thrA', 'half', 'hf', 'rollDir'];
    const NBK = ['x', 'y', 'vx', 'vy', 'rot', 'w', 'cAge', 'cx', 'cy'];
    const NEG = { vx: 1, a: 1, w: 1, f: 1, nx: 1, flipDir: 1, wheel: 1, roll: 1, rw: 1, thrA: 1, rollDir: 1, rot: 1 };      // cambian de signo en el espejo
    const NMX = { x: 1, cx: 1 };                                                                                           // x pasa a W - x
    let peer = null, conn = null, netLobby = false;
    const packI = inp => [inp.dir, inp.pitch || 0, inp.aim ? 1 : 0, inp.jump ? 1 : 0, inp.boost ? 1 : 0, inp.roll ? 1 : 0];
    // mando en forma [seq, dir, pitch, aim, jump, boost, roll]; en espejo izquierda y derecha se invierten
    function unpackI(inp, e, mirror) { inp.dir = mirror ? -e[1] : e[1]; inp.pitch = e[2]; inp.aim = !!e[3]; inp.jump = !!e[4]; inp.boost = !!e[5]; inp.roll = !!e[6]; }
    // la foto va redondeada: pesa menos y no lleva números diminutos (el ángulo de un coche quieto tiende a 0 sin llegar nunca)
    const netQ = v => typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v;
    function netMirror(o, keys, v) {
        for (let j = 0; j < keys.length; j++) {
            const k = keys[j]; let x = v[j];
            if (x == null || (typeof x === 'number' && !isFinite(x))) x = 0;      // un valor roto colgaría el motor (wrap)
            if (NMX[k]) x = W - x; else if (NEG[k] && typeof x === 'number') x = -x;
            o[k] = x;
        }
    }
    function loadPeer() {
        if (window.Peer) return Promise.resolve();
        return new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'lib/peerjs.min.js'; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
    }
    function lobbyMsg(txt, err) { const el = $('onStatus'); el.textContent = txt; el.classList.toggle('err', !!err); }
    function lobbyShow(view) { for (const id of ['onPick', 'onHost', 'onJoin']) $(id).hidden = id !== view; }
    function netSendMsg(m) { if (conn && conn.open) { try { conn.send(m); } catch (e) { /* conexión cerrándose */ } } }
    function netClose() {
        const c = conn, p = peer; conn = null; peer = null;
        try { if (c) c.close(); } catch (e) { /* ya cerrada */ }
        try { if (p) p.destroy(); } catch (e) { /* ya cerrado */ }
    }
    function netLeave() {
        S.net = null; netClose();
        $('restartBtn').style.display = ''; $('againBtn').textContent = 'Revancha';
    }
    function netLost(msg) {
        if (S.net) { qToast(msg, '#ff6b6b'); toMenu(); }
        else if (netLobby) { netClose(); lobbyShow('onPick'); lobbyMsg(msg, true); }
    }
    function netConn(c) {
        conn = c;
        c.on('open', () => { if (c !== conn) return; if (!c.hostSide) { lobbyMsg('Conectado. Empezando…'); c.send({ t: 'hola', car: isLocked(cfg.car) ? 'fenix' : cfg.car }); } });
        c.on('data', d => { if (c === conn && d && d.t) netMsg(d); });
        c.on('close', () => { if (c === conn) netLost('Tu amigo se ha desconectado'); });
        c.on('error', () => { if (c === conn) netLost('Se ha perdido la conexión con tu amigo'); });
    }
    function netGo(guest, d) {
        S.net = { guest, rivalCar: d.car, time: d.time, mut: d.mut };
        netLobby = false; $('online').classList.remove('show'); $('end').classList.remove('show'); overlayFrom = null;
        startMatch('match');
    }
    function netGoHost() {
        const mut = Object.assign({}, cfg.mut);
        netSendMsg({ t: 'go', car: isLocked(cfg.car) ? 'fenix' : cfg.car, time: cfg.time, mut });
        netGo(false, { car: S.net ? S.net.rivalCar : netGoHost.car, time: cfg.time, mut });
    }
    function netMsg(d) {
        const N = S.net;
        if (N) N.lastRx = performance.now();
        switch (d.t) {
            case 'hola': if (!N && conn && conn.hostSide) { netGoHost.car = d.car; netGoHost(); } break;          // el invitado ya está: empieza el partido
            case 'go': if (conn && !conn.hostSide) netGo(true, d); break;
            case 'i': if (N && !N.guest) { for (const e of d.l) N.q.push(e); } break;
            case 's': if (N && N.guest) N.snap = d; break;
            case 'end': if (N && N.guest && S.state !== 'end') { S.score = [d.sc[1], d.sc[0]]; S.time = 0; updateHud(true); endMatch(); } break;
            case 'again': if (N) { N.againThem = true; if (!N.againMe) qToast('Tu amigo quiere la revancha', '#ffd23f'); netTryAgain(); } break;
            default: break;
        }
    }
    function netReset() {
        Object.assign(S.net, { seq: 0, hist: [], out: [], q: [], last: null, ack: 0, tick: 0, snap: null, rin: [0, 0, 0, 0, 0, 0, 0], sendT: 0, pingT: 0, lastRx: performance.now(), againMe: false, againThem: false });
        S.world.cars[1].spd = 1; unpackI(S.ai.inp, S.net.rin, false);
        $('restartBtn').style.display = 'none'; $('againBtn').textContent = 'Revancha';
    }
    // un paso de física: el anfitrión toma el siguiente mando del invitado y el invitado guarda el suyo para reenviarlo y repetirlo
    function netStep() {
        const N = S.net;
        if (N.guest) {
            const e = [++N.seq].concat(packI(pInp)); N.hist.push(e); N.out.push(e); if (N.hist.length > 240) N.hist.shift();
            unpackI(S.ai.inp, N.rin, true); S.ai.inp.jump = false;      // el coche del amigo sigue con su último mando conocido
        } else {
            const q = N.q;
            while (q.length > 8) { const old = q.shift(); if (old[4]) q[0][4] = 1; }      // si se acumulan mandos se descartan sin perder saltos
            const e = q.shift();
            if (e) { N.last = e; N.ack = e[0]; unpackI(S.ai.inp, e, true); }
            else if (N.last) { unpackI(S.ai.inp, N.last, true); S.ai.inp.jump = false; }
            N.tick++;
        }
    }
    function netSend() {
        const N = S.net, now = performance.now();
        if (N.guest) {
            if (N.out.length) { netSendMsg({ t: 'i', l: N.out }); N.out = []; N.pingT = now; }
            else if (now - N.pingT > 1000) { netSendMsg({ t: 'p' }); N.pingT = now; }
            return;
        }
        if (now - N.sendT < 33) return;      // unas 30 fotos por segundo
        N.sendT = now;
        const w = S.world;
        netSendMsg({ t: 's', ack: N.ack, st: S.state, cd: S.cd, tm: S.time, ot: S.ot, sc: S.score,
            c: w.cars.map(c => NCK.map(k => netQ(c[k]))), b: NBK.map(k => netQ(w.ball[k])), b2: w.ball2 ? NBK.map(k => netQ(w.ball2[k])) : null,
            p: w.pads.map(p => p.cool), i: [0].concat(packI(pInp)) });
    }
    function netRecv() {
        const N = S.net;
        if (performance.now() - N.lastRx > 10000) { netLost('Se ha perdido la conexión con tu amigo'); return; }
        if (!N.guest || !N.snap) return;
        const s = N.snap, w = S.world; N.snap = null;
        S.time = s.tm;
        if (s.ot && !S.ot) goldenGoal();
        const sc = [s.sc[1], s.sc[0]];
        for (let k = 0; k < 2; k++) if (sc[k] > S.score[k]) { if (S.state === 'play') { S.score[k] = sc[k] - 1; goal(k); } else S.score[k] = sc[k]; }
        // saque de centro y cuenta atrás al ritmo del anfitrión
        if (s.st === 'count' && (S.state === 'play' || S.state === 'goal')) { hideBanner(); T.kickoff(w); setState('count'); S.cd = s.cd; lastCd = 4; N.hist.length = 0; return; }
        if (S.state === 'count') { if (s.st !== 'count') S.cd = 0; else if (Math.abs(S.cd - s.cd) > 0.15) S.cd = s.cd; return; }
        if ((S.state !== 'play' && S.state !== 'goal') || (s.st !== 'play' && s.st !== 'goal')) return;
        // se coloca todo como lo ve el anfitrión (en espejo) y se repiten los mandos propios que aún no ha procesado
        netMirror(w.cars[0], NCK, s.c[1]); netMirror(w.cars[1], NCK, s.c[0]);
        netMirror(w.ball, NBK, s.b); if (w.ball2 && s.b2) netMirror(w.ball2, NBK, s.b2);
        w.pads.forEach((p, i) => { p.cool = s.p[s.p.length - 1 - i]; });
        N.rin = s.i;
        while (N.hist.length && N.hist[0][0] <= s.ack) N.hist.shift();
        const evN = T.events.length, mine = {}, his = {};
        for (const e of N.hist) { unpackI(mine, e, false); unpackI(his, s.i, true); his.jump = false; T.stepWorld(w, STEP, [mine, his]); }
        T.events.length = evN;      // lo repetido ya sonó la primera vez
    }
    function netAgain() {
        const N = S.net; if (!N || N.againMe) return;
        N.againMe = true; netSendMsg({ t: 'again' }); $('againBtn').textContent = 'Esperando a tu amigo…';
        netTryAgain();
    }
    function netTryAgain() { const N = S.net; if (N && !N.guest && N.againMe && N.againThem) netGoHost(); }
    function netEnd() { if (S.net && !S.net.guest) netSendMsg({ t: 'end', sc: S.score }); }

    function netHost() {
        audio(); netClose(); lobbyShow('onHost'); $('onCode').textContent = '····'; lobbyMsg('Creando sala…');
        loadPeer().then(() => {
            const code = Array.from({ length: 4 }, () => NET_ABC[Math.floor(Math.random() * NET_ABC.length)]).join('');
            const p = peer = new window.Peer(NET_PRE + code, { debug: 0 });
            p.on('open', () => { if (p !== peer) return; $('onCode').textContent = code; lobbyMsg('Pásale este código a tu amigo. Esperando…'); });
            p.on('connection', c => { if (p !== peer || conn) { c.close(); return; } c.hostSide = true; netConn(c); lobbyMsg('Tu amigo se está conectando…'); });
            p.on('error', e => { if (p !== peer) return; if (e.type === 'unavailable-id') netHost(); else { netClose(); lobbyShow('onPick'); lobbyMsg('No se pudo crear la sala. Revisa tu conexión a internet.', true); } });
        }).catch(() => { lobbyShow('onPick'); lobbyMsg('No se pudo cargar el modo online. Revisa tu conexión a internet.', true); });
    }
    function netJoin() {
        const code = $('onInput').value.toUpperCase().replace(/[^A-Z]/g, '');
        if (code.length !== 4) { lobbyMsg('El código tiene 4 letras.', true); return; }
        audio(); netClose(); lobbyMsg('Buscando la sala ' + code + '…');
        loadPeer().then(() => {
            const p = peer = new window.Peer({ debug: 0 });
            p.on('open', () => { if (p !== peer) return; netConn(p.connect(NET_PRE + code, { reliable: true, serialization: 'json' })); });      // json: el empaquetado binario de PeerJS estropea números muy pequeños
            p.on('error', e => { if (p !== peer) return; netClose(); lobbyMsg(e.type === 'peer-unavailable' ? 'No existe ninguna sala con el código ' + code + '.' : 'No se pudo conectar. Revisa tu conexión a internet.', true); });
        }).catch(() => lobbyMsg('No se pudo cargar el modo online. Revisa tu conexión a internet.', true));
    }
    $('onlineBtn').addEventListener('click', () => { audio(); netLobby = true; lobbyShow('onPick'); lobbyMsg(''); openOverlay('online', 'menu'); });
    $('onOk').addEventListener('click', () => { netLobby = false; netClose(); closeOverlay('online'); });
    $('onHostBtn').addEventListener('click', netHost);
    $('onJoinBtn').addEventListener('click', () => { lobbyShow('onJoin'); lobbyMsg(''); $('onInput').value = ''; $('onInput').focus(); });
    $('onGo').addEventListener('click', netJoin);
    $('onInput').addEventListener('keydown', e => { if (e.key === 'Enter') netJoin(); e.stopPropagation(); });
    $('onBack1').addEventListener('click', () => { netClose(); lobbyShow('onPick'); lobbyMsg(''); });
    $('onBack2').addEventListener('click', () => { netClose(); lobbyShow('onPick'); lobbyMsg(''); });

    // ---------- Pantalla encendida ----------
    let wake = null;
    function requestWake() { try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(l => { wake = l; }).catch(() => { }); } catch (e) { /* sin wake lock */ } }
    document.addEventListener('visibilitychange', () => { if (ac) { if (document.hidden) ac.suspend(); else ac.resume(); } if (document.hidden) pause(); else if (S.state !== 'menu') requestWake(); });

    // ---------- Bucle y calidad automática ----------
    let last = performance.now(), slowFrames = 0, winT = 0, winN = 0;
    let fk = 1, refreshMs = 16.7, fpsT = 0, fpsN = 0;
    const refSamples = [], fpsBox = $('fpsBox');
    function frame(ts) {
        requestAnimationFrame(frame);
        const raw = Math.min(100, ts - last), dt = Math.min(0.05, raw / 1000); last = ts;
        fk = clamp(raw / 16.67, 0.1, 3);
        // frecuencia de refresco de la pantalla: mediana de los primeros fotogramas
        if (refSamples.length < 90 && raw > 1 && raw < 40 && !document.hidden) { refSamples.push(raw); if (refSamples.length === 90) { const so = refSamples.slice().sort((x, y) => x - y); refreshMs = clamp(so[45], 2, 34); } }
        if (S.state !== 'pause' && S.state !== 'end') update(dt);
        else { T.events.length = 0; padPoll(dt); }
        interpApply(); draw(ts); interpRestore();
        if (cfg.fps && fpsBox) { fpsN++; fpsT += raw; if (fpsT >= 500) { fpsBox.textContent = Math.round(fpsN * 1000 / fpsT) + ' FPS'; fpsT = 0; fpsN = 0; } }
        // si el dispositivo no mantiene su frecuencia de pantalla, baja la calidad un escalón
        if (!document.hidden && S.state !== 'pause' && !garageRaf) {
            winT += raw; winN++;
            if (winT >= 2500) {
                const avg = winT / winN, lim = clamp(refreshMs * 1.6, 12, 26);
                slowFrames = avg > lim ? slowFrames + 1 : 0;
                winT = 0; winN = 0;
                if (slowFrames >= 2 && cfg.gfx !== 'low') {
                    cfg.gfx = cfg.gfx === 'ultra' ? 'high' : cfg.gfx === 'high' ? 'mid' : 'low'; store.set('gfx', cfg.gfx); if (segs.gfx) segs.gfx(); applyGfx(); slowFrames = 0;
                }
            }
        }
    }

    window.addEventListener('resize', () => { resize(); if (stick.id === null) restStick(); });
    if (window.ResizeObserver) new ResizeObserver(() => { resize(); }).observe(cv);
    // ---------- Copia de seguridad del progreso (exportar / importar con un código) ----------
    {
        const BK_SKIP = { dev: 1, ctab: 1 }, BK_UNDO = 'tgaUndo', BK_DONE = 'tgaBkDone';
        const bkRead = () => { const o = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('tga_') === 0 && !BK_SKIP[k.slice(4)]) o[k.slice(4)] = localStorage.getItem(k); } } catch (e) { /* sin almacenamiento */ } return o; };
        const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); };
        const b64e = s => btoa(unescape(encodeURIComponent(s))), b64d = s => decodeURIComponent(escape(atob(s)));
        function bkMake() {
            try { saveWallet(); cupSave(); } catch (e) { /* nada que guardar */ }
            const js = JSON.stringify({ v: 1, at: Date.now(), d: bkRead() });
            return 'TGA1-' + b64e(js) + '-' + fnv(js);
        }
        function bkParse(txt) {        // devuelve los datos o un mensaje de error claro
            const s = String(txt || '').replace(/\s+/g, '');
            if (!s) return { err: 'Pega primero un código o abre un archivo.' };
            const m = /^TGA1-([A-Za-z0-9+/=]+)-([0-9a-f]{8})$/.exec(s);
            if (!m) return { err: 'Ese texto no es un código de Turbo Gol Arena (o está cortado).' };
            let js, o; try { js = b64d(m[1]); o = JSON.parse(js); } catch (e) { return { err: 'El código está dañado. Cópialo otra vez entero.' }; }
            if (fnv(js) !== m[2]) return { err: 'Al código le falta o le sobra algo. Cópialo otra vez entero.' };
            if (!o || o.v !== 1 || typeof o.d !== 'object' || !o.d) return { err: 'El código es de una versión que no se reconoce.' };
            for (const k in o.d) { if (!/^[A-Za-z0-9_]+$/.test(k) || typeof o.d[k] !== 'string') return { err: 'El código tiene datos no válidos.' }; try { JSON.parse(o.d[k]); } catch (e) { return { err: 'El código tiene datos no válidos.' }; } }
            return { o };
        }
        function bkSummary(o) {
            const P = (k, d) => { try { return o.d[k] != null ? JSON.parse(o.d[k]) : d; } catch (e) { return d; } };
            const owned = P('owned', {}) || {}, st = P('stats', {}) || {}, ach = P('ach', {}) || {};
            let items = 0; for (const k in owned) if (Array.isArray(owned[k])) items += owned[k].length;
            const n = x => Number(x || 0).toLocaleString('es-ES');
            const when = o.at ? new Date(o.at).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '¿?';
            return '<b>Copia del ' + when + '</b><br>' + n(P('coins', 0)) + ' monedas · nivel ' + lvlOf(P('xp', 0) || 0) + ' · ' + items + ' objetos · ' +
                Object.keys(ach).filter(k => ach[k]).length + ' logros · ' + n(st.matches) + ' partidos · ' + n(st.cups) + ' copas ganadas';
        }
        function bkApply(d) {
            try {
                const kill = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('tga_') === 0 && !BK_SKIP[k.slice(4)]) kill.push(k); }
                kill.forEach(k => localStorage.removeItem(k));
                for (const k in d) if (!BK_SKIP[k]) localStorage.setItem('tga_' + k, d[k]);
            } catch (e) { return false; }
            store.lock = true; return true;
        }
        const msg = (t, ok) => { const el = $('bkMsg'); el.textContent = t; el.className = 'bkmsg' + (ok ? ' ok' : t ? ' bad' : ''); };
        const hasUndo = () => { try { return !!localStorage.getItem(BK_UNDO); } catch (e) { return false; } };
        const showUndo = () => { $('bkUndo').hidden = !hasUndo(); };
        let pending = null, undoArm = false;
        $('bkExp').addEventListener('click', () => {
            const c = bkMake(); $('bkTxt').value = c; $('bkCopy').disabled = false; $('bkSave').disabled = false; $('bkConf').hidden = true; pending = null;
            msg('Código creado. Cópialo o descárgalo y guárdalo en un sitio seguro.', true); sfx('unlock');
        });
        $('bkCopy').addEventListener('click', async () => {
            const t = $('bkTxt').value; let ok = false;
            try { await navigator.clipboard.writeText(t); ok = true; } catch (e) { /* sin portapapeles */ }
            if (!ok) { try { const ta = $('bkTxt'); ta.focus(); ta.select(); ok = document.execCommand('copy'); ta.blur(); } catch (e) { ok = false; } }
            msg(ok ? 'Copiado. Pégalo donde quieras guardarlo (notas, correo, WhatsApp…).' : 'No se pudo copiar solo: mantén pulsado el código, selecciona todo y copia.', ok); sfx('click');
        });
        $('bkSave').addEventListener('click', async () => {
            const t = $('bkTxt').value, d = new Date(), name = 'turbo-gol-copia-' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '.txt';
            sfx('click');
            let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
            if (dl) {
                try { await dl.save({ filename: name, data: t }); msg('Archivo guardado.', true); }
                catch (e) { const c = e && e.code; msg(c === 'declined' ? 'Descarga cancelada.' : c === 'rate_limited' ? 'Espera un momento y vuelve a intentarlo.' : 'Aquí no se puede descargar: usa «Copiar».', false); }
                return;
            }
            try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); msg('Archivo descargado.', true); }
            catch (e) { msg('Aquí no se puede descargar: usa «Copiar».', false); }
        });
        function ask(txt) {
            const r = bkParse(txt); $('bkConf').hidden = true; pending = null;
            if (r.err) { msg(r.err, false); sfx('click'); return; }
            pending = r.o; $('bkSum').innerHTML = bkSummary(r.o) + '<br><small>Se sustituirá tu progreso actual. Podrás deshacerlo después.</small>';
            $('bkConf').hidden = false; msg(''); sfx('tick');
            requestAnimationFrame(() => { try { $('bkConf').scrollIntoView({ block: 'nearest' }); } catch (e) { /* nada */ } if (pad.mode) padSetFocus($('bkYes')); });
        }
        $('bkImp').addEventListener('click', () => ask($('bkTxt').value));
        $('bkFileBtn').addEventListener('click', () => { $('bkFile').value = ''; $('bkFile').click(); });
        $('bkFile').addEventListener('change', () => {
            const f = $('bkFile').files && $('bkFile').files[0]; if (!f) return;
            if (f.size > 4e6) { msg('Ese archivo es demasiado grande para ser una copia.', false); return; }
            const rd = new FileReader(); rd.onload = () => { $('bkTxt').value = String(rd.result || '').trim(); ask(rd.result); }; rd.onerror = () => msg('No se pudo leer el archivo.', false); rd.readAsText(f);
        });
        $('bkNo').addEventListener('click', () => { pending = null; $('bkConf').hidden = true; msg('Importación cancelada.'); sfx('click'); });
        $('bkYes').addEventListener('click', () => {
            if (!pending) return;
            try { saveWallet(); cupSave(); } catch (e) { /* nada */ }
            const cur = JSON.stringify({ v: 1, at: Date.now(), d: bkRead() });
            try { localStorage.setItem(BK_UNDO, cur); } catch (e) { msg('No hay espacio para guardar la copia de seguridad previa. No se ha cambiado nada.', false); return; }
            if (!bkApply(pending.d)) { msg('No se pudo importar. No se ha cambiado nada.', false); return; }
            try { localStorage.setItem(BK_DONE, 'imp'); } catch (e) { /* nada */ }
            sfx('unlock'); msg('Importado. Recargando…', true); setTimeout(() => location.reload(), 350);
        });
        $('bkUndo').addEventListener('click', () => {
            if (!undoArm) { undoArm = true; $('bkUndo').textContent = '¿Seguro? Pulsa otra vez'; setTimeout(() => { undoArm = false; $('bkUndo').textContent = 'Deshacer importación'; }, 3000); sfx('click'); return; }
            let o = null; try { o = JSON.parse(localStorage.getItem(BK_UNDO)); } catch (e) { o = null; }
            if (!o || !o.d) { msg('No hay nada que deshacer.', false); showUndo(); return; }
            if (!bkApply(o.d)) { msg('No se pudo deshacer.', false); return; }
            try { localStorage.removeItem(BK_UNDO); localStorage.setItem(BK_DONE, 'undo'); } catch (e) { /* nada */ }
            msg('Deshecho. Recargando…', true); setTimeout(() => location.reload(), 350);
        });
        showUndo();
        let done = null; try { done = localStorage.getItem(BK_DONE); localStorage.removeItem(BK_DONE); } catch (e) { done = null; }
        if (done) setTimeout(() => toast(done === 'imp' ? 'Progreso importado' : 'Importación deshecha', '#3dffb0'), 600);
    }
    window.__tg = { S, touch, goalFx, goal, CAM };   // acceso de depuración
    toMenu(); resize(); updateHud(true); restStick();
    requestAnimationFrame(frame);
})();
