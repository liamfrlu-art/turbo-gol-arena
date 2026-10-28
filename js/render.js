'use strict';
/* Turbo Gol Arena · Dibujo de cada fotograma: LED, coches, piloto bailarín, balones, partículas, cámara y draw().
   Los archivos de js/ se cargan en orden y comparten el ámbito global (antes eran un solo game.js). */
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
        if (c.ghost || a <= .01 || c.x < 440 || c.x > W - 440) continue;
        ctx.fillStyle = 'rgba(0,0,10,' + a + ')'; ctx.beginPath(); ctx.ellipse(c.x, H - 1, 46 * c.sc * (1 - h / 1100), 5, 0, 0, TAU); ctx.fill();
    }
    // sombra del balón: en todo el campo (también sobre las rampas) y aunque vaya alto, para calcular los aéreos
    for (const b of w.ball2 ? [w.ball, w.ball2] : [w.ball]) {
        if (b.x < 20 || b.x > W - 20 || (S.state === 'goal')) continue;
        const fy = T.floorY(b.x), hb = Math.max(0, fy - b.y - T.BALL_R), k = clamp(1 - hb / 620, 0, 1), ab = .14 + .38 * k;
        const rx = T.BALL_R * (.55 + .55 * k), ry = 3 + 3 * k;
        ctx.save(); ctx.translate(b.x, fy - 1); ctx.rotate(fy < H - 2 ? Math.atan2(T.floorY(b.x + 4) - T.floorY(b.x - 4), 8) : 0);      // sobre la rampa, inclinada como ella
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, 'rgba(0,0,12,' + ab + ')'); g.addColorStop(1, 'rgba(0,0,12,0)');
        ctx.fillStyle = g; ctx.scale(1, ry / rx); ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
        ctx.restore();
    }
}

function hbSize(t) {      // ancho × alto de la forma real (ruedas + carrocería)
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const h of t.wh) { x0 = Math.min(x0, h[0] - h[2]); x1 = Math.max(x1, h[0] + h[2]); y0 = Math.min(y0, h[1] - h[2]); y1 = Math.max(y1, h[1] + h[2]); }
    for (const P of t.polys) for (const p of P) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
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
    // contexto para el piloto del patín: balón que viene fuerte hacia él, choques con otros coches, rival cerca y final del partido
    const bb = S.world.ball, bdx = bb.x - c.x, bdy = bb.y - c.y, bdl = Math.hypot(bdx, bdy) || 1, appr = -(bdx * bb.vx + bdy * bb.vy) / bdl;
    const dng = bdl < 260 && appr > 450 ? clamp((appr - 450) / 600, 0, 1) * clamp((260 - bdl) / 120, 0, 1) : 0;
    let opp = null, od = 1e9;
    for (const cc of S.world.cars) {
        if (cc === c || cc.ghost) continue;
        const d = Math.hypot(cc.x - c.x, cc.y - c.y);
        if (d < 80 && S.state === 'play') { const cl = -((cc.x - c.x) * (cc.vx - c.vx) + (cc.y - c.y) * (cc.vy - c.vy)) / (d || 1); if (cl > 260 && (!c.bumpAt || performance.now() - c.bumpAt > 700)) c.bumpAt = performance.now(); }
        if (cc.team !== c.team && d < od) { od = d; opp = cc; }
    }
    const fin = S.state === 'end' ? (S.score[c.team] > S.score[1 - c.team] ? 'win' : S.score[c.team] < S.score[1 - c.team] ? 'lose' : 'draw') : '';
    let mood = '';
    if (S.state === 'goal') mood = ((S.goalCol === 'blue') === (c.team === 0)) ? 'win' : 'lose';
    CARS.paint(ctx, c.model || 'chispa', c.team, { boosting: c.boosting, wheel: c.wheel * c.f, t, spin: c.spdv || 0, brake: c.brake,
        susF: c.susF, susR: c.susR, lean: c.lean, air: !c.grounded, jumpT: c.grounded ? 9 : c.airT, vf, vu, mood, look: (() => { const bb = S.world.ball, dx = (bb.x - c.x) * c.f, dy = bb.y - c.y; return Math.hypot(dx, dy) < 700 ? Math.atan2(dy, Math.max(dx, 30)) : 0; })(), wall: c.grounded && Math.abs(c.ny) < .75, hitT: c.hitAt ? (performance.now() - c.hitAt) / 1000 : 9, flip: c.flipT > 0,
        rid: c.rid || (c.rid = {}), state: S.state, bst: c.boost, dng, fin, oppD: od, oppDx: opp ? (opp.x - c.x) * c.f : 999,
        bumpT: c.bumpAt ? (performance.now() - c.bumpAt) / 1000 : 9, saveT: c.saveAt ? (performance.now() - c.saveAt) / 1000 : 9, ballD: Math.hypot(S.world.ball.x - c.x, S.world.ball.y - c.y),      // memoria y contexto del piloto del patín
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
// la red de la portería se ondula tras un gol: ondas que salen del punto donde entró el balón y se apagan en 1,6 s
function drawNetRipple(now) {
    const R = S.netRip; if (!R) return;
    const age = (now - R.t0) / 1000; if (age > 1.6) { S.netRip = null; return; }
    const top = H - GH, bot = GF, x0 = R.side > 0 ? W : -GD, x1 = R.side > 0 ? W + GD : 0, amp = 9 * Math.exp(-age * 2.6), fade = 1 - age / 1.6;
    const off = (x, y) => { const d = Math.hypot(x - (R.side > 0 ? W + GD * .55 : -GD * .55), y - R.y); return amp * Math.sin(d * .09 - age * 20) * Math.exp(-d / 160); };
    ctx.save(); ctx.beginPath(); ctx.rect(x0, top, x1 - x0, bot - top); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,' + (.45 * fade) + ')'; ctx.lineWidth = 1.6; ctx.globalCompositeOperation = 'lighter';
    for (let x = x0 + 10; x < x1; x += 16) { ctx.beginPath(); for (let y = top; y <= bot; y += 10) { const d = off(x, y); y === top ? ctx.moveTo(x + d * R.side, y) : ctx.lineTo(x + d * R.side, y); } ctx.stroke(); }
    for (let y = top + 10; y < bot; y += 16) { ctx.beginPath(); for (let x = x0; x <= x1; x += 10) { const d = off(x, y); x === x0 ? ctx.moveTo(x, y + d * .6) : ctx.lineTo(x, y + d * .6); } ctx.stroke(); }
    ctx.restore();
}
function drawBall(b, sec) {
    const sp = Math.hypot(b.vx, b.vy), pal = ballPal(), now = performance.now(), tt = now / 1000;
    // (la sombra en el suelo la dibuja drawShadows, también sobre las rampas)
    // a gran velocidad: líneas de velocidad detrás del balón y un halo caliente
    if (sp > 950 && S.state !== 'menu') {
        const k = clamp((sp - 950) / 700, 0, 1), ux = b.vx / sp, uy = b.vy / sp, px = -uy, py = ux;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (let i = -2; i <= 2; i++) {
            const o = i * T.BALL_R * .38, L = T.BALL_R * (1.6 + 1.4 * k) * (1 - Math.abs(i) * .18), x0 = b.x + px * o - ux * T.BALL_R * .7, y0 = b.y + py * o - uy * T.BALL_R * .7;
            const g = ctx.createLinearGradient(x0, y0, x0 - ux * L, y0 - uy * L); g.addColorStop(0, 'rgba(255,255,255,' + (.55 * k) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.strokeStyle = g; ctx.lineWidth = 3 - Math.abs(i) * .6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 - ux * L, y0 - uy * L); ctx.stroke();
        }
        const hg = ctx.createRadialGradient(b.x, b.y, T.BALL_R * .6, b.x, b.y, T.BALL_R * 1.7); hg.addColorStop(0, 'rgba(255,190,90,' + (.32 * k) + ')'); hg.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(b.x, b.y, T.BALL_R * 1.7, 0, TAU); ctx.fill(); ctx.restore();
    }
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
        const co = Math.cos(c.a), si = Math.sin(c.a), W2 = (x, y) => [c.x + co * x * c.f - si * y, c.y + si * x * c.f + co * y];
        for (const h of c.wh) { const p = W2(h[0], h[1]); ctx.beginPath(); ctx.arc(p[0], p[1], h[2], 0, TAU); ctx.fill(); ctx.stroke(); }
        for (const P of c.polys) { ctx.beginPath(); P.forEach((q, i) => { const p = W2(q[0], q[1]); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath(); ctx.fill(); ctx.stroke(); }
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
        ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(0, r.r), 0, TAU); ctx.stroke();
    }
    ctx.restore();
}

// ---------- Cámara ----------
// Tres modos (Controles > Pantalla): 'fija' enseña todo el estadio; 'dinamica' (por defecto) acerca un poco (máx. 12 %) en disparos,
// aéreos y goles; 'seguir' sigue la jugada: se centra entre el balón y tu coche con el zoom justo para ver a los dos,
// sin enseñar nunca nada fuera del estadio. Resultado: zoom CAM.z y desplazamiento CAM.ox/CAM.oy (px de pantalla).
const CAM = { z: 1, fx: .5, fy: .5, last: 0, ox: 0, oy: 0, wx: W / 2, wy: H / 2 };
function camLimits() {      // zoom máximo de «seguir»: que se vean al menos 900 × 560 del campo
    return clamp(Math.min(ch / (sc * 560), cw / (sc * 900)), 1, 1.7);
}
function camUpdate(now) {
    const dt = clamp((now - (CAM.last || now)) / 1000, 0, .1); CAM.last = now;
    const w = S.world, mode = cfg.camMode, st = S.state, b = w && w.ball;
    S.camKick = Math.max(0, (S.camKick || 0) - dt * .55);
    if (mode === 'seguir' && w && (st === 'play' || st === 'goal' || st === 'replay' || st === 'count' || st === 'pause')) {
        const me = w.cars[0], zMax = camLimits();
        let fx, fy, zt;
        if (st === 'goal') { fx = S.goalX; fy = H - GH / 2; zt = zMax * .92; }
        else if (st === 'count') {      // saque: los dos coches y el balón
            const xs = w.cars.map(c => c.x).concat(b.x);
            fx = (Math.min(...xs) + Math.max(...xs)) / 2; fy = H - 230;
            zt = clamp(cw / (sc * (Math.max(...xs) - Math.min(...xs) + 380)), 1, zMax);
        } else {
            // el balón manda (adelantado un poco según su velocidad); tu coche tira del encuadre para no salirse
            const bx = b.x + clamp(b.vx * .16, -160, 160), by = b.y + clamp(b.vy * .1, -90, 90);
            const solo = S.mode === 'replay' || st === 'replay' || !me;
            fx = solo ? bx : bx * .62 + me.x * .38; fy = solo ? by : by * .62 + me.y * .38;
            const spanX = (solo ? 0 : Math.abs(bx - me.x)) + 460, spanY = (solo ? 0 : Math.abs(by - me.y)) + 360;
            zt = clamp(Math.min(cw / (sc * spanX), ch / (sc * spanY)), 1, zMax) * (1 + .05 * S.camKick);
        }
        const kz = Math.min(1, dt * (zt > CAM.z ? 2.4 : 1.6)), kf = Math.min(1, dt * 4.5);
        CAM.z += (zt - CAM.z) * kz; CAM.wx += (fx - CAM.wx) * kf; CAM.wy += (fy - CAM.wy) * kf;
        const z = CAM.z;
        // el punto enfocado al centro de la pantalla, pero sin pasarse de los bordes del estadio (porterías incluidas)
        const lim = (wpos, o, s, lo, hi, size) => {
            let off = size / 2 - z * (o + wpos * s);
            const a = size - z * (o + hi * s), bb = -z * (o + lo * s);      // a ≤ off ≤ bb para cubrir la pantalla
            return a > bb ? (a + bb) / 2 : clamp(off, a, bb);
        };
        CAM.ox = lim(CAM.wx, ox, sc, -GD - 14, W + GD + 14, cw); CAM.oy = lim(CAM.wy, oy, sc, -12, H + 14, ch);
        return;
    }
    // fija o dinámica: zoom alrededor de un punto de la pantalla (fx, fy)
    let k = 0, fx = .5, fy = .5;
    const live = mode === 'dinamica' && (st === 'play' || st === 'goal' || st === 'replay') && S.mode !== 'drill';
    if (live && w) {
        const bxs = (ox + b.x * sc) / cw, bys = (oy + b.y * sc) / ch;
        k = S.camKick;
        for (const c of w.cars) if (!c.grounded && c.y < H - 200 && Math.hypot(c.x - b.x, c.y - b.y) < 260) k = Math.max(k, .55);      // aéreo cerca del balón
        if (st === 'goal') { k = Math.max(k, clamp((S.goalT - .6) / 1.2, 0, 1)); fx = clamp((ox + S.goalX * sc) / cw, .08, .92); fy = clamp((oy + (H - GH / 2) * sc) / ch, .2, .8); }
        else { fx = .5 + (clamp(bxs, 0, 1) - .5) * .8; fy = .5 + (clamp(bys, 0, 1) - .5) * .8; }
    }
    const zt = live ? 1 + .12 * k : 1, sp = zt > CAM.z ? 5 : 1.3;
    CAM.z += (zt - CAM.z) * Math.min(1, dt * sp);
    CAM.fx += (fx - CAM.fx) * Math.min(1, dt * 4); CAM.fy += (fy - CAM.fy) * Math.min(1, dt * 4);
    if (mode === 'fija') { CAM.z = 1; CAM.fx = .5; CAM.fy = .5; }
    CAM.ox = cw * CAM.fx * (1 - CAM.z); CAM.oy = ch * CAM.fy * (1 - CAM.z);
    CAM.wx = (cw / 2 - CAM.ox - CAM.z * ox) / (CAM.z * sc); CAM.wy = (ch / 2 - CAM.oy - CAM.z * oy) / (CAM.z * sc);      // para pasar a «seguir» sin salto
}
// flechas en el borde de la pantalla hacia el balón y los rivales que la cámara no está enseñando
function drawOffscreen(now) {
    if (cfg.camMode !== 'seguir' || S.mode !== 'match' || !(S.state === 'play' || S.state === 'count')) return;      // en entrenamiento no hace falta
    const w = S.world, z = CAM.z, m = 30, items = [[w.ball, '255,255,255', true]];
    for (const c of w.cars) if (c !== w.cars[0] && !c.ghost) items.push([c, c.team === 0 ? '61,184,255' : '255,138,43', false]);
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const [o, col, isBall] of items) {
        const X = z * (ox + o.x * sc) + CAM.ox, Y = z * (oy + o.y * sc) + CAM.oy, r = isBall ? T.BALL_R * sc * z : 20;
        if (X > -r && X < cw + r && Y > -r && Y < ch + r) continue;
        const ex = clamp(X, m, cw - m), ey = clamp(Y, m + 34, ch - m), a = Math.atan2(Y - ey, X - ex), d = Math.hypot(X - ex, Y - ey);
        const pulse = 1 + Math.sin(now / 160) * .08, s = clamp(1.25 - d / 900, .7, 1.2) * pulse;
        ctx.save(); ctx.translate(ex, ey); ctx.scale(s, s);
        ctx.fillStyle = 'rgba(6,10,30,.72)'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(' + col + ',.95)'; ctx.lineWidth = 2.5; ctx.stroke();
        if (isBall) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(20,24,50,.9)'; pent(ctx, 3); ctx.fill(); }
        else { ctx.fillStyle = 'rgb(' + col + ')'; rr(ctx, -8, -3, 16, 6, 2.5); ctx.fill(); ctx.beginPath(); ctx.arc(-4.5, 3.5, 2.6, 0, TAU); ctx.arc(4.5, 3.5, 2.6, 0, TAU); ctx.fill(); }
        ctx.rotate(a); ctx.fillStyle = 'rgba(' + col + ',.95)'; ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(17, -7); ctx.lineTo(17, 7); ctx.closePath(); ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}
let crtPat = null;
function draw(now) {
    if (!cw) return;
    camUpdate(now);
    // golpe de cámara (punch) alrededor del centro de la pantalla, encima del encuadre de la cámara
    const t = now / 1000, pz = 1 + S.punch * 0.03, z = pz * CAM.z;
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const offX = dpr * (pz * CAM.ox + cw / 2 * (1 - pz)), offY = dpr * (pz * CAM.oy + ch / 2 * (1 - pz));
    ctx.setTransform(z, 0, 0, z, offX, offY);
    ctx.drawImage(staticCv, 0, 0);
    const sx = shake ? (Math.random() - 0.5) * shake : 0, sy = shake ? (Math.random() - 0.5) * shake : 0;
    ctx.setTransform(z * dpr * sc, 0, 0, z * dpr * sc, z * dpr * (ox + sx) + offX, z * dpr * (oy + sy) + offY);
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
    drawFrameLive(t);
    drawChase(t);

    drawPads(t);
    drawShadows();
    for (const c of w.cars) {
        if (Q.ultra) { const cs = Math.hypot(c.vx, c.vy); if (cs > 650) { const ox0 = c.x, oy0 = c.y, a0 = ctx.globalAlpha; for (let k = 3; k >= 1; k--) { c.x = ox0 - c.vx * .0075 * k * (1 / Math.max(.6, S.slow)); c.y = oy0 - c.vy * .0075 * k; ctx.globalAlpha = a0 * .17 * (4 - k) / 3 * Math.min(1, (cs - 650) / 500); drawCar(c, t); } c.x = ox0; c.y = oy0; ctx.globalAlpha = a0; } }
        if (c.ghost) continue;      // coche quitado (retos y entrenamiento libre)
        drawCar(c, t);
    }
    if (S.v2 && w.cars.length === 4 && S.state !== 'menu') drawTeamMarks(now);
    if (S.mode === 'drill' && S.drill && S.drill.target && S.state !== 'menu') drawTarget(S.drill.target, now / 1000);
    drawNetRipple(now);
    if (!(S.state === 'goal' || (S.state === 'replay' && S.rp && S.rp.boomed))) { drawBall(w.ball); if (w.ball2) drawBall(w.ball2, true); }      // al marcar, el balón explota y desaparece
    if (cfg.hit) drawHitboxes();
    drawParts();
    drawRings();
    drawBolts();
    drawDancer(now / 1000);           // el piloto va por encima de las partículas para que se vea bien
    drawOffscreen(now);

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
        // el desenfoque se hace en la copia pequeña (a 1/4 cuesta 16 veces menos que a pantalla completa) y luego se estira
        bctx.clearRect(0, 0, bloomCv.width, bloomCv.height);
        bctx.filter = 'brightness(.9) contrast(1.45) blur(' + (1.25 * dpr).toFixed(2) + 'px)';
        bctx.drawImage(cv, 0, 0, bloomCv.width, bloomCv.height);
        bctx.filter = 'none';
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .6;
        ctx.drawImage(bloomCv, 0, 0, cv.width, cv.height);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        if (Q.bloom2) {      // segundo resplandor, más ancho y suave
            b2ctx.setTransform(1, 0, 0, 1, 0, 0); b2ctx.clearRect(0, 0, bloom2Cv.width, bloom2Cv.height); b2ctx.filter = 'brightness(.85) contrast(1.6) blur(2px)'; b2ctx.drawImage(bloomCv, 0, 0, bloom2Cv.width, bloom2Cv.height); b2ctx.filter = 'none';      // desde el resplandor pequeño: barato
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .42;
            ctx.drawImage(bloom2Cv, 0, 0, cv.width, cv.height);
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
    }
    const r8 = retroOn(); if (r8) retroPost();
    if (app.dataset.r8 !== (r8 ? '1' : '0')) app.dataset.r8 = r8 ? '1' : '0';      // letras de recreativa en el estadio retro
}


// ---------- Estadio retro en 8 bits: todo el partido a píxeles gordos y con pocos colores ----------
// Se dibuja la imagen en pequeño (con un filtro que deja pocos niveles de color por canal) y se amplía sin suavizar.
let r8Cv = null, r8Ctx = null, r8Grid = null, r8GridP = 0;
const retroOn = () => cfg.stad === 'retro' && cfg.r8 !== false;
function retroPost() {
    const P = Math.max(2, Math.round(3.2 * dpr)), w = Math.ceil(cv.width / P), h = Math.ceil(cv.height / P);
    if (!r8Cv) { r8Cv = document.createElement('canvas'); r8Ctx = r8Cv.getContext('2d'); }
    if (r8Cv.width !== w || r8Cv.height !== h) { r8Cv.width = w; r8Cv.height = h; }
    r8Ctx.imageSmoothingEnabled = false; r8Ctx.filter = Q.beams ? 'url(#r8post)' : 'none';      // paleta corta (en calidad baja, solo píxeles)
    r8Ctx.drawImage(cv, 0, 0, w, h); r8Ctx.filter = 'none';
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.imageSmoothingEnabled = false; ctx.drawImage(r8Cv, 0, 0, w, h, 0, 0, w * P, h * P); ctx.imageSmoothingEnabled = true;
    if (cfg.crt) {      // rejilla de recreativa: una línea oscura entre píxeles
        if (!r8Grid || r8GridP !== P) { const g = document.createElement('canvas'); g.width = g.height = P; const gc = g.getContext('2d'); gc.fillStyle = 'rgba(0,0,0,.14)'; gc.fillRect(P - 1, 0, 1, P); gc.fillRect(0, P - 1, P, 1); r8Grid = ctx.createPattern(g, 'repeat'); r8GridP = P; }
        ctx.fillStyle = r8Grid; ctx.fillRect(0, 0, cv.width, cv.height);
    }
}
