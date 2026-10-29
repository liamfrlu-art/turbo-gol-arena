'use strict';
/* Turbo Gol Arena · Dibujo de la capa estática y de los estadios (nevado, neón, desierto, ciudad, volcán, retro), videomarcador y decoración de eventos.
   Los archivos de js/ se cargan en orden y comparten el ámbito global (antes eran un solo game.js). */
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
// ---------- Marco del estadio ----------
// recorrido del borde (para colocar detalles y la luz que lo recorre): puntos, distancias acumuladas y longitud total
let FRP = null;
function framePerim() {
    if (FRP) return FRP;
    const p = T.pts, cum = [0]; let L = 0;
    for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); cum.push(L); }
    return (FRP = { p, cum, L });
}
function frameAt(s) {      // punto del borde a la distancia s y normal del tramo (sin saber hacia qué lado da)
    const F = framePerim(), p = F.p; s = ((s % F.L) + F.L) % F.L;
    let i = 0; while (i < p.length - 1 && F.cum[i + 1] < s) i++;
    const a = p[i], b = p[(i + 1) % p.length], l = F.cum[i + 1] - F.cum[i] || 1, u = (s - F.cum[i]) / l, dx = (b[0] - a[0]) / l, dy = (b[1] - a[1]) / l;
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, -dy, dx];
}
// material de cada estadio: canto, cuerpo (arriba y abajo) y brillo
const FRAME_MAT = {
    neon: { edge: '#070b26', b0: '#4656b0', b1: '#1a2462', hi: 'rgba(200,235,255,.7)' },
    snow: { edge: '#22130a', b0: '#9a6640', b1: '#4e2e18', hi: 'rgba(255,225,190,.4)' },
    desierto: { edge: '#4a2c12', b0: '#e0b074', b1: '#9a6634', hi: 'rgba(255,240,210,.5)' },
    ciudad: { edge: '#12151f', b0: '#9aa3bd', b1: '#3c445c', hi: 'rgba(255,255,255,.55)' },
    volcan: { edge: '#050202', b0: '#54392f', b1: '#1e100c', hi: 'rgba(255,170,120,.45)' },
    retro: { edge: '#06020e', b0: '#4a2088', b1: '#180838', hi: 'rgba(255,120,240,.5)' }
};
// marco con volumen: solo por fuera del campo (no tapa la zona de juego), con tira de luz por dentro, anclajes,
// esquinas reforzadas, textura según el estadio y porterías con postes de tubo, base y red que cuelga
function drawFrame(c, th, rnd) {
    const M = FRAME_MAT[th] || FRAME_MAT.neon, F = framePerim(), TW = 38;
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    const team = c.createLinearGradient(-GD, 0, W + GD, 0);
    team.addColorStop(0, '#3db8ff'); team.addColorStop(.46, '#7fd4ff'); team.addColorStop(.54, '#ffb066'); team.addColorStop(1, '#ff8a2b');
    arenaPath(c); c.strokeStyle = team; c.globalAlpha = .14; c.lineWidth = 40; c.stroke(); c.globalAlpha = 1;      // resplandor suave
    // solo por fuera: recorte del exterior del campo
    c.save(); c.beginPath(); c.rect(-GD - 200, -200, W + 2 * GD + 400, H + 400);
    { const p = T.pts; c.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]); c.closePath(); }
    c.clip('evenodd');
    arenaPath(c); c.strokeStyle = M.edge; c.lineWidth = TW + 4; c.stroke();
    const bg = c.createLinearGradient(0, -20, 0, H + 20); bg.addColorStop(0, M.b0); bg.addColorStop(1, M.b1);
    arenaPath(c); c.strokeStyle = bg; c.lineWidth = TW - 2; c.stroke();
    c.save(); c.translate(0, -3); arenaPath(c); c.restore(); c.strokeStyle = M.hi; c.lineWidth = 3.4; c.stroke();      // brillo de arriba
    c.save(); c.translate(0, 4); arenaPath(c); c.restore(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 4; c.stroke();      // sombra de abajo
    // textura del material a lo largo del borde
    for (let s = 0; s < F.L; s += 6) {
        const [x, y, nx, ny] = frameAt(s), k = Math.floor(s / 6);
        if (th === 'snow' && k % 4 === 0) { c.strokeStyle = 'rgba(30,15,6,.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - nx * 19, y - ny * 19); c.lineTo(x + nx * 19, y + ny * 19); c.stroke(); }      // tablas de madera
        else if (th === 'ciudad' && k % 5 === 0) { for (const d of [-10, 10]) { c.fillStyle = '#20263a'; c.beginPath(); c.arc(x + nx * d, y + ny * d, 2.2, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(x + nx * d - .6, y + ny * d - .6, .9, 0, TAU); c.fill(); } }      // remaches
        else if (th === 'desierto' && rnd() < .35) { c.fillStyle = rnd() < .5 ? 'rgba(120,70,30,.35)' : 'rgba(255,235,200,.35)'; const d = (rnd() - .5) * 36; c.fillRect(x + nx * d, y + ny * d, 1.6, 1.6); }      // grano de la piedra
        else if (th === 'retro' && k % 2 === 0) { for (const d of [-11, 11]) { c.fillStyle = k % 4 === 0 ? 'rgba(255,60,200,.85)' : 'rgba(60,240,255,.75)'; c.fillRect(Math.round((x + nx * d) / 4) * 4 - 2, Math.round((y + ny * d) / 4) * 4 - 2, 4, 4); } }      // píxeles
        else if (th === 'neon' && k % 3 === 0) { for (const d of [-10, 10]) { c.fillStyle = 'rgba(160,220,255,.3)'; c.fillRect(x + nx * d - .8, y + ny * d - .8, 1.6, 1.6); } }      // reflejos del cristal
    }
    if (th === 'volcan') {      // grietas de lava que brillan
        c.save(); c.shadowColor = '#ff6a1a'; c.shadowBlur = 12; c.strokeStyle = 'rgba(255,150,50,.95)'; c.lineWidth = 2.2;
        for (let i = 0; i < 60; i++) { const s = rnd() * F.L, [x, y, nx, ny] = frameAt(s); c.beginPath(); let px = x - nx * 18, py = y - ny * 18; c.moveTo(px, py); for (let j = 1; j <= 4; j++) { px += nx * 6 + (rnd() - .5) * 5; py += ny * 6 + (rnd() - .5) * 5; c.lineTo(px, py); } c.stroke(); }
        c.restore();
    }
    if (th === 'snow') {      // nieve acumulada encima del techo y de los largueros
        c.fillStyle = '#f4f8ff';
        for (let s = 0; s < F.L; s += 9) { const [x, y] = frameAt(s); if (!(y < T.TR * .95 || (Math.abs(y - (H - GH)) < 2 && (x < 0 || x > W)))) continue; c.beginPath(); c.arc(x, y - 16, 6.5 + Math.sin(s * .37) * 2.4, 0, TAU); c.fill(); }
    }
    // anclajes: placa atravesada con dos tornillos cada cierto tramo
    for (let s = 60; s < F.L; s += 150) {
        const [x, y, nx, ny] = frameAt(s), a = Math.atan2(ny, nx);
        c.save(); c.translate(x, y); c.rotate(a);
        c.fillStyle = M.edge; rr(c, -21, -6, 42, 12, 3); c.fill(); c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(-20, -5.6, 40, 1.2);
        for (const d of [-13, 13]) { c.fillStyle = '#c9cfe6'; c.beginPath(); c.arc(d, 0, 2.6, 0, TAU); c.fill(); c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(d - 1.4, -.3, 2.8, .6); }
        c.restore();
    }
    // esquinas de arriba reforzadas
    for (const cx of [T.TR - T.TR * Math.SQRT1_2, W - T.TR + T.TR * Math.SQRT1_2]) {
        const cy = T.TR - T.TR * Math.SQRT1_2, dx = cx < W / 2 ? -1 : 1;
        c.fillStyle = M.edge; c.beginPath(); c.moveTo(cx - dx * 18, cy - 6); c.lineTo(cx + dx * 12, cy - 18); c.lineTo(cx + dx * 18, cy + 10); c.lineTo(cx + dx * 4, cy + 14); c.closePath(); c.fill();
        c.fillStyle = bg; c.beginPath(); c.moveTo(cx - dx * 12, cy - 5); c.lineTo(cx + dx * 10, cy - 13); c.lineTo(cx + dx * 13, cy + 7); c.lineTo(cx + dx * 4, cy + 9); c.closePath(); c.fill();
        for (const q of [[dx * 6, -9], [dx * 9, 3]]) { c.fillStyle = '#c9cfe6'; c.beginPath(); c.arc(cx + q[0], cy + q[1], 2.2, 0, TAU); c.fill(); }
    }
    c.restore();
    // tira de luz del color del equipo justo en el borde del campo
    arenaPath(c); c.strokeStyle = team; c.lineWidth = 4.5; c.stroke();
    arenaPath(c); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.2; c.stroke();
    // porterías: red que cuelga, postes de tubo y base
    for (const s of [[-1, '#3db8ff', '61,184,255'], [1, '#ff8a2b', '255,138,43']]) {
        const mouth = s[0] < 0 ? 0 : W, back = s[0] < 0 ? -GD : W + GD, top = H - GH;
        c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1.2;
        for (let j = 1; j <= 6; j++) { const y = top + j * (GF - top) / 7; c.beginPath(); c.moveTo(mouth, y); c.quadraticCurveTo((mouth + back) / 2, y + 10, back, y + 2); c.stroke(); }
        for (let j = 1; j <= 4; j++) { const x = mouth + (back - mouth) * j / 5; c.beginPath(); c.moveTo(x, top); c.quadraticCurveTo(x + (back - mouth) * .06, (top + GF) / 2, x, GF); c.stroke(); }
        const tube = () => { c.beginPath(); c.moveTo(mouth, top); c.lineTo(back, top); c.lineTo(back, GF); c.lineTo(mouth, GF); };
        tube(); c.strokeStyle = 'rgba(4,6,18,.9)'; c.lineWidth = 13; c.stroke();
        tube(); c.strokeStyle = s[1]; c.lineWidth = 8.5; c.stroke();
        c.save(); c.translate(0, -2.2); tube(); c.restore(); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2.2; c.stroke();
        for (const q of [[mouth, top], [back, top], [back, GF]]) { c.fillStyle = '#fff'; c.beginPath(); c.arc(q[0], q[1], 7.5, 0, TAU); c.fill(); c.fillStyle = s[1]; c.beginPath(); c.arc(q[0], q[1], 4.2, 0, TAU); c.fill(); }
        c.fillStyle = 'rgba(4,6,18,.9)'; rr(c, Math.min(mouth, back) - 6, GF + 3, GD + 12, 7, 2.5); c.fill(); c.fillStyle = s[1]; c.fillRect(Math.min(mouth, back) - 2, GF + 5.5, GD + 4, 1.6);      // base
    }
    c.restore();
}
// ---------- Marco vivo: luz que recorre el borde, ondas donde pega el balón, luces del larguero y destello de gol ----------
const frameHits = [];
function frameHit(x, y, imp) { if (frameHits.length < 8) frameHits.push({ x, y, k: Math.min(1, imp / 900), t0: performance.now() }); }
function drawFrameLive(t) {
    const F = framePerim(), now = performance.now();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (Q.beams) for (let k = 0; k < 2; k++) {      // dos destellos que viajan por el borde
        const [x, y] = frameAt(t * 240 + k * F.L / 2), rgb = x < W / 2 ? '120,210,255' : '255,180,110';
        const gr = ctx.createRadialGradient(x, y, 0, x, y, 34); gr.addColorStop(0, 'rgba(255,255,255,.75)'); gr.addColorStop(.25, 'rgba(' + rgb + ',.45)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 34, 0, TAU); ctx.fill();
    }
    for (let i = frameHits.length - 1; i >= 0; i--) {      // onda de luz donde el balón pegó fuerte
        const h = frameHits[i], a = (now - h.t0) / 1000; if (a > .55) { frameHits.splice(i, 1); continue; }
        const u = a / .55, r = 10 + u * (60 + h.k * 70), rgb = h.x < W / 2 ? '140,215,255' : '255,190,120';
        ctx.strokeStyle = 'rgba(' + rgb + ',' + ((1 - u) * (.5 + h.k * .5)).toFixed(3) + ')'; ctx.lineWidth = 3 + h.k * 4; ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, TAU); ctx.stroke();
        const gr = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 40); gr.addColorStop(0, 'rgba(255,255,255,' + ((1 - u) * .7).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(h.x, h.y, 40, 0, TAU); ctx.fill();
    }
    // luces del larguero: apagadas normalmente, parpadean en la portería donde se acaba de marcar
    const gl = S.state === 'goal' && S.goalT > 0 ? clamp(S.goalT / 2.6, 0, 1) : 0;
    for (const s of [[-1, '61,184,255'], [1, '255,138,43']]) {
        const mouth = s[0] < 0 ? 0 : W, back = s[0] < 0 ? -GD : W + GD, on = gl > 0 && (S.goalX < W / 2) === (s[0] < 0);
        for (let i = 0; i < 5; i++) {
            const x = mouth + (back - mouth) * (i + .5) / 5, y = H - GH, lit = on ? (Math.sin(t * 22 + i * 1.3) > 0 ? 1 : .25) : .12;
            ctx.fillStyle = 'rgba(255,255,255,' + (.5 * lit + .1) + ')'; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill();
            if (lit > .2) { const gr = ctx.createRadialGradient(x, y, 0, x, y, 22); gr.addColorStop(0, 'rgba(' + s[1] + ',' + (.8 * lit) + ')'); gr.addColorStop(1, 'rgba(' + s[1] + ',0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 22, 0, TAU); ctx.fill(); }
        }
    }
    if (gl > 0) {      // al marcar, todo el marco se ilumina del color del equipo que marca
        const rgb = S.goalCol === 'blue' ? '61,184,255' : '255,138,43', p = gl * (.55 + .45 * Math.sin(t * 16));
        arenaPath(ctx); ctx.strokeStyle = 'rgba(' + rgb + ',' + (p * .55).toFixed(3) + ')'; ctx.lineWidth = 18; ctx.lineJoin = 'round'; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,' + (p * .5).toFixed(3) + ')'; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
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

    drawFrame(c, TH, rnd);
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
        const n = Math.min(3, Math.max(1, Math.ceil(S.cd))), f = S.cd > 3 ? 0 : S.cd % 1;
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

    drawFrame(c, 'neon', rnd);
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

