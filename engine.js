'use strict';
/* Motor de física e IA de Turbo Gol Arena.
   Coordenadas en unidades de mundo, y hacia abajo. El equipo 0 (azul) defiende la portería izquierda. */
window.TG = (() => {
    const W = 1500, H = 760, GD = 130, GH = 388, TR = 170;
    // Rampa curva delante de cada portería: arco de radio RAMP_R que sube RAMP_A radianes y sigue recto hasta el suelo de la portería.
    const RAMP_X = 167, RAMP_R = 170, RAMP_A = 80 * Math.PI / 180;
    let BALL_R = 38; const CAR_R = 16, CAR_L = 28;
    let G_BALL = 720, G_CAR = 1100, BCAP = 1700;
    // Mutadores de partido (jugabilidad): setMut({giant, lowG, inf, fast, two}) antes de empezar el partido
    const MUT = { giant: false, lowG: false, inf: false, fast: false, two: false };
    function setMut(m) {
        Object.assign(MUT, { giant: false, lowG: false, inf: false, fast: false, two: false }, m || {});
        BALL_R = MUT.giant ? 62 : 38;
        G_BALL = MUT.lowG ? 330 : 720; G_CAR = MUT.lowG ? 640 : 1100;
        BCAP = MUT.fast ? 2300 : 1700;
    }
    const OFFS = [-CAR_L, 0, CAR_L];
    const TAU_R = Math.PI * 2;
    // Tipos de coche: estadísticas (1 = valor base) y hitbox propia: círculos [x, y, radio] en unidades del dibujo (x hacia el morro,
    // y hacia abajo, origen en el centro del coche) que siguen la silueta de cada modelo; sc es la escala del dibujo.
    // top velocidad punta, acc aceleración, jump salto, air giro en el aire, power fuerza de golpe, mass peso (retroceso),
    // boostAcc potencia del turbo, drain consumo del turbo, boostMax capacidad, dodge impulso de voltereta.
    const TYPES = {
        chispa:  { sc: 1.0625, hb: [[-26,6,10],[26,6,10],[-4.1,-6.9,11.5],[-20.6,-8.4,11.5],[7.9,-2.4,11.5],[-37.1,0.6,7.5],[37.9,2.1,7.5],[-8.6,-2.4,11.5],[25.9,3.6,11],[3.4,-8.4,10.5]], top: .98,  acc: 1.10, jump: 1.06, air: 1.15, power: .92,  mass: .88,  boostAcc: 1,    drain: 1,    boostMax: 100, dodge: 1 },
        bisonte: { sc: 1.0, hb: [[-27,6,10],[28,6,10],[-6.5,-4.3,11.5],[8.5,-1.3,11.5],[-41,3.2,8.5],[40,1.7,8],[-15.5,-1.3,11.5],[28,1.7,11],[1,-5.8,11],[-29,1.7,9]],   top: 1.05, acc: .92,  jump: .94,  air: .85,  power: 1.18, mass: 1.22, boostAcc: 1,    drain: 1,    boostMax: 100, dodge: .95 },
        cuna:    { sc: 0.906, hb: [[-27,6,10],[28,6,10],[3.1,-1.5,11.5],[-11.9,0,11.5],[13.6,0,10],[-41.9,4.5,6.5],[42.1,4.5,6],[28.6,3,10.5],[-28.4,3,10.5]],   top: 1.10, acc: 1.0,  jump: .90,  air: 1.0,  power: 1.0,  mass: .95,  boostAcc: 1.05, drain: 1,    boostMax: 100, dodge: 1 },
        kaze:    { sc: 0.97, hb: [[-28,6,10.5],[29,6,10.5],[-7.5,-4,11.5],[9,-1,11.5],[42,3.5,8.5],[-21,-1,11.5],[-40.5,2,7.5],[28.5,3.5,11.5],[1.5,-5.5,10.5],[-6,-1,11]],   top: 1.08, acc: 1.12, jump: 1.04, air: 1.18, power: 1.08, mass: 1.0,  boostAcc: 1.10, drain: .92,  boostMax: 100, dodge: 1.08 },
        fenix:   { sc: 1.0, hb: [[-28,6,10.5],[29,6,10.5],[-7.7,-3.1,11.5],[10.3,-1.6,11.5],[-42.2,1.4,8],[40.3,2.9,8.5],[-15.2,-3.1,11.5],[2.8,-6.1,11],[28.3,2.9,11],[-28.7,2.9,11]],   top: 1.12, acc: 1.14, jump: 1.10, air: 1.12, power: 1.15, mass: 1.08, boostAcc: 1.15, drain: .85,  boostMax: 125, dodge: 1.12 },
        mula:    { sc: 1.0, hb: [[-30,6,10],[32,6,10],[-38,-12,13],[-14,-16,13],[10,-16,13],[33,-8,11],[46,0,7],[-48,0,8]],   top: .97, acc: .92, jump: .9, air: .82, power: 1.12, mass: 1.25, boostAcc: .95, drain: 1, boostMax: 100, dodge: .9 },
        titan:   { sc: 1.0, hb: [[-27,8,16],[27,8,16],[-20,-16,12],[4,-19,13],[26,-12,11],[-40,-10,8],[42,-8,7]],   top: 1.0, acc: .95, jump: 1.14, air: .84, power: 1.12, mass: 1.26, boostAcc: 1, drain: 1, boostMax: 100, dodge: .95 },
        formula: { sc: 1.0, hb: [[-38,6,10],[40,6,10],[-20,-4,9],[0,-4,9],[20,-2,8],[50,4,6],[-45,-13,7],[-4,-11,6]],   top: 1.18, acc: 1.15, jump: .95, air: 1.15, power: 1.0, mass: .95, boostAcc: 1.1, drain: .95, boostMax: 110, dodge: 1.05 },
        prisma:  { sc: 0.8, hb: [[-33,5,11.5],[34,5,11.5],[-12.1,3.6,11.5],[4.4,8.1,8.0],[26.9,0.6,11.0],[10.4,-41.4,11.5],[-4.6,-21.9,6.5],[14.9,9.6,5.5],[23.9,-14.4,5.0],[-13.6,-0.9,11.0],[-0.1,-32.4,5.5],[-6.1,-12.9,4.5],[19.4,-23.4,4.0],[-4.6,6.6,9.5],[23.9,-35.4,3.0]],   top: 1.14, acc: 1.18, jump: 1.12, air: 1.22, power: 1.10, mass: .98,  boostAcc: 1.2,  drain: .8,   boostMax: 135, dodge: 1.15 }
    };
    function hbScaled(t) { return t.hb.map(h => [h[0] * t.sc, h[1] * t.sc, h[2] * t.sc]); }
    function applyType(c, id) {
        const t = TYPES[id] || TYPES.chispa;
        c.model = TYPES[id] ? id : 'chispa'; c.st = t; c.sc = t.sc; c.hb = hbScaled(t);
        c.r = 0; for (const h of c.hb) c.r = Math.max(c.r, h[1] + h[2]);        // distancia del centro al suelo (el punto más bajo: las ruedas)
    }
    const events = [];

    // ---------- Geometría de la arena ----------
    const ramp = [];                               // rampa izquierda de arriba (portería) a abajo (suelo)
    for (let i = 8; i >= 0; i--) { const a = i / 8 * RAMP_A; ramp.push([RAMP_X - RAMP_R * Math.sin(a), H - RAMP_R * (1 - Math.cos(a))]); }
    const GF = ramp[0][1] - ramp[0][0] * Math.tan(RAMP_A);      // altura del suelo de la portería
    const pts = [[-GD, GF], [0, GF]];
    for (const p of ramp) pts.push([p[0], p[1]]);
    for (let i = ramp.length - 1; i >= 0; i--) pts.push([W - ramp[i][0], ramp[i][1]]);
    pts.push([W, GF], [W + GD, GF], [W + GD, H - GH], [W, H - GH], [W, TR]);
    for (let i = 1; i <= 14; i++) { const th = i / 14 * Math.PI / 2; pts.push([W - TR + Math.cos(th) * TR, TR - Math.sin(th) * TR]); }
    pts.push([TR, 0]);
    for (let i = 1; i <= 14; i++) { const th = i / 14 * Math.PI / 2; pts.push([TR - Math.sin(th) * TR, TR - Math.cos(th) * TR]); }
    pts.push([0, H - GH], [-GD, H - GH]);
    // región sólida de cada rampa (para dibujarla)
    const solidL = [[-GD, H], [RAMP_X, H]]; for (let i = ramp.length - 1; i >= 0; i--) solidL.push(ramp[i]); solidL.push([0, GF], [-GD, GF]);
    const solidR = solidL.map(p => [W - p[0], p[1]]);
    const segs = pts.map((p, i) => {
        const q = pts[(i + 1) % pts.length];
        const dx = q[0] - p[0], dy = q[1] - p[1];
        return { x1: p[0], y1: p[1], dx, dy, l2: dx * dx + dy * dy || 1 };
    });

    const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
    const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

    // ---------- Colisión círculo contra paredes ----------
    let hitN = 0, hitX = 0, hitY = 0, impact = 0;
    function collide(o, r, eMax, fric) {
        hitN = 0; hitX = 0; hitY = 0; impact = 0;
        for (let i = 0; i < segs.length; i++) {
            const s = segs[i];
            const t = clamp(((o.x - s.x1) * s.dx + (o.y - s.y1) * s.dy) / s.l2, 0, 1);
            const px = s.x1 + s.dx * t, py = s.y1 + s.dy * t;
            let ex = o.x - px, ey = o.y - py;
            const d2 = ex * ex + ey * ey;
            if (d2 >= r * r) continue;
            let d = Math.sqrt(d2);
            if (d < 1e-6) { ex = 0; ey = -1; d = 0; } else { ex /= d; ey /= d; }
            let pen = r - d;
            // si el centro ya cruzó la pared (por una rotación o un golpe rápido), se devuelve por la cara interior en vez de seguir hacia fuera
            if (t > 0 && t < 1) {
                const il = Math.sqrt(s.l2), inx = s.dy / il, iny = -s.dx / il, sd = (o.x - s.x1) * inx + (o.y - s.y1) * iny;
                if (sd < 0 && sd > -(r + 24)) { ex = inx; ey = iny; pen = r - sd; }
            }
            o.x += ex * pen; o.y += ey * pen;
            const vn = o.vx * ex + o.vy * ey;
            if (vn < 0) {
                const e = eMax * clamp((-vn - 90) / 260, 0, 1);       // rebote suave: rodar por rampas casi no pierde energía
                o.vx -= (1 + e) * vn * ex; o.vy -= (1 + e) * vn * ey;
                const tx = -ey, ty = ex, vt = o.vx * tx + o.vy * ty;
                o.vx -= tx * vt * fric; o.vy -= ty * vt * fric;
                if (-vn > impact) impact = -vn;
            }
            hitN++; hitX += ex; hitY += ey;
        }
        return hitN;
    }

    // ---------- Entidades ----------
    function makeCar(team, pid) {
        return { team, pid: pid == null ? team : pid, x: 0, y: 0, vx: 0, vy: 0, a: 0, w: 0, f: team === 0 ? 1 : -1, boost: 50, grounded: true,
            nx: 0, ny: -1, jumpLock: 0, airT: 0, used: 0, flipT: 0, flipDir: 0, boosting: false, wheel: 0, spd: 1, roll: 0, rw: 0,
            r: 17, sc: 1, st: TYPES.chispa, model: 'chispa', hb: hbScaled(TYPES.chispa) };
    }
    function resetCar(c, x) {
        Object.assign(c, { x, y: H - c.r, vx: 0, vy: 0, a: 0, w: 0, f: c.team === 0 ? 1 : -1, boost: 50, grounded: true,
            nx: 0, ny: -1, jumpLock: 0, airT: 0, used: 0, flipT: 0, flipDir: 0, boosting: false, roll: 0, rw: 0 });
    }
    const PAD_DEFS = [[480, true], [615, false], [750, false], [885, false], [W - 480, true]];
    // n = 2 (1 contra 1) o 4 (2 contra 2: 0 tú, 1 rival, 2 tu compañero, 3 segundo rival)
    function makeWorld(n) {
        return {
            v2: n === 4,
            cars: n === 4 ? [makeCar(0, 0), makeCar(1, 1), makeCar(0, 2), makeCar(1, 3)] : [makeCar(0), makeCar(1)],
            ball: { x: W / 2, y: H - 380, vx: 0, vy: 0, rot: 0, w: 0, cAge: 99, cx: 0, cy: 0 },
            ball2: MUT.two ? { x: W / 2, y: H - 380, vx: 0, vy: 0, rot: 0, w: 0, cAge: 99, cx: 0, cy: 0 } : null,
            pads: PAD_DEFS.map(d => ({ x: d[0], big: d[1], cool: 0 }))
        };
    }
    function kickoff(w) {
        resetCar(w.cars[0], W * 0.31);
        resetCar(w.cars[1], W * 0.69);
        if (w.cars.length === 4) { resetCar(w.cars[2], W * 0.15); resetCar(w.cars[3], W * 0.85); }
        if (w.ball2) {
            Object.assign(w.ball, { x: W / 2 - 130, y: H - 380, vx: 0, vy: 0, w: 0 });
            Object.assign(w.ball2, { x: W / 2 + 130, y: H - 460, vx: 0, vy: 0, w: 0 });
        } else Object.assign(w.ball, { x: W / 2, y: H - 380, vx: 0, vy: 0, w: 0 });
        w.pads.forEach(p => p.cool = 0);
    }

    // ---------- Coche ----------
    function stepCar(c, inp, dt) {
        const st = c.st;
        const wantBoost = inp.boost && c.boost > 0;
        if (c.resetCd > 0) c.resetCd -= dt;
        c.boosting = wantBoost;
        if (MUT.inf) c.boost = st.boostMax;
        else if (wantBoost) c.boost = Math.max(0, c.boost - 28 * st.drain * dt);
        if (c.jumpLock > 0) c.jumpLock -= dt;
        const k = c.spd;
        if (c.grounded) {
            const nx = c.nx, ny = c.ny, tx = -ny, ty = nx, d = inp.dir;
            if (Math.abs(d) > 0.05) c.f = d > 0 ? 1 : -1;
            let vt = c.vx * tx + c.vy * ty, vn = c.vx * nx + c.vy * ny;
            if (d !== 0) { vt += d * 1200 * k * st.acc * dt; if (d * vt < 0) vt += d * 2400 * dt; }
            else vt *= Math.exp(-1.8 * dt);
            vt += G_CAR * nx * 0.5 * dt;                                  // en rampas y paredes se resbala hacia abajo
            if (wantBoost) vt += c.f * 1550 * k * st.boostAcc * dt;
            const cap = (wantBoost ? 780 : 520) * k * st.top * (wantBoost || d === 0 ? 1 : Math.max(0.5, Math.abs(d)));
            if (Math.abs(vt) > cap) vt -= Math.sign(vt) * Math.min(Math.abs(vt) - cap, 1600 * dt);
            if ((inp.pitch || 0) < -0.6) vt *= Math.exp(-4.5 * dt);      // joystick hacia abajo en el suelo: freno
            vn = Math.min(vn, 0) - 1300 * dt;
            let wallJ = false;
            if (inp.jump) {
                wallJ = ny > -0.55 && ny < 0.5;               // pared (o rampa muy empinada): salto de pared
                vn = (wallJ ? 560 : 470) * st.jump; c.grounded = false; c.jumpLock = 0.14; c.used = 1; c.airT = 0;
                events.push([wallJ ? 'walljump' : 'jump', 0, c.x, c.y, nx, ny, c.team, c.pid]);
            }
            c.vx = tx * vt + nx * vn; c.vy = ty * vt + ny * vn;
            if (wallJ && !c.grounded) c.vy -= 150;                           // el salto de pared te lanza hacia arriba y fuera
            c.wheel += vt * dt / c.r;
            if (c.grounded) {
                const da = wrap(Math.atan2(nx, -ny) - c.a);
                c.a = wrap(c.a + da * Math.min(1, 16 * dt)); c.w = 0;
            }
        } else {
            c.airT += dt;
            if (inp.jump && c.used < 2 && c.airT < 1.6) {
                c.used = 2;
                if (Math.abs(inp.dir) > 0.35) {
                    const sd = inp.dir > 0 ? 1 : -1;
                    c.vx += sd * 460 * st.dodge; c.vy = Math.min(c.vy, 0) - 100;
                    c.thrA = c.a; c.flipDir = sd;
                    if (sd !== c.f && c.airT < 0.55) {
                        // media vuelta: voltereta hacia atrás de 180° y el coche queda mirando hacia donde sale disparado
                        c.flipT = 0.3; c.w = sd * 10.5; c.half = 1; events.push(['dodge', 0, 'half', c.team, c.pid]);
                    } else { c.flipT = 0.45; c.w = sd * 14; events.push(['dodge', 0, '', c.team, c.pid]); }
                } else {
                    // aéreo rápido: segundo salto casi inmediato = impulso más grande hacia arriba
                    const fast = c.airT < 0.24;
                    c.vy = Math.min(c.vy, 0) - (fast ? 560 : 390) * st.jump; events.push(['jump', 0, fast ? 'fast' : '', c.team, c.pid]);
                }
            }
            c.vy += G_CAR * dt;
            if (wantBoost) {
                const ta = c.flipT > 0 ? c.thrA : c.a;      // durante la voltereta el turbo no gira con el coche
                c.vx += c.f * Math.cos(ta) * 1450 * st.boostAcc * dt; c.vy += c.f * Math.sin(ta) * 1450 * st.boostAcc * dt;
            }
            // Giro "tornillo" (doble toque): el coche rueda sobre su eje largo mientras mantengas el dedo.
            // El sentido se fija con la primera empujada a izquierda o derecha; el morro se sigue apuntando con el joystick.
            if (inp.aim && inp.roll && c.flipT <= 0) {
                if (!c.rollDir && Math.abs(inp.dir) > 0.35) c.rollDir = inp.dir > 0 ? 1 : -1;
                c.rw += ((c.rollDir || c.f) * 11 * st.air - c.rw) * Math.min(1, 18 * dt);
            } else c.rollDir = 0;
            if (c.flipT > 0) {
                c.flipT -= dt;
                if (c.half && c.flipT <= 0) {            // fin de la media vuelta: se endereza mirando al otro lado
                    c.half = 0; c.f = -c.f; c.a = wrap(c.a + Math.PI); c.roll = Math.PI; c.hf = 0.5; c.w *= 0.2;
                }
            }
            else if (inp.aim) {
                // Joystick táctil: el morro apunta hacia donde empujas. El ángulo es el objetivo, no la velocidad de giro,
                // así que el coche gira hasta ahí y se queda quieto en vez de dar vueltas.
                const jx = inp.dir, jy = inp.pitch || 0;
                if (Math.hypot(jx, jy) < 0.22) {
                    c.w *= Math.exp(-7 * dt);                              // sin joystick: se estabiliza
                } else {
                    if (Math.abs(jx) > 0.3 && (jx > 0 ? 1 : -1) !== c.f) { c.f = -c.f; c.a = -c.a; c.w = -c.w; }   // cambio de sentido
                    const target = -c.f * Math.atan2(jy, Math.max(Math.abs(jx), 1e-3));
                    const wt = clamp(wrap(target - c.a) * 8, -7.6, 7.6) * st.air;
                    c.w += (wt - c.w) * Math.min(1, 16 * dt);
                }
            } else {
                // Teclado e IA: izquierda/derecha giran a velocidad constante (como antes)
                const tgt = clamp((inp.dir * 5.6 - c.f * (inp.pitch || 0) * 6) * st.air, -8, 8);
                c.w += (tgt - c.w) * Math.min(1, 13 * dt);
            }
            c.a = wrap(c.a + c.w * dt);
            c.vx *= 1 - 0.05 * dt; c.vy *= 1 - 0.05 * dt;
        }
        // ángulo de tornillo: libre en el aire, se endereza al tocar suelo
        if (c.grounded) { c.rw = 0; c.roll -= TAU_R * Math.round(c.roll / TAU_R); c.roll *= Math.exp(-20 * dt); }
        else {
            c.roll += c.rw * dt;
            if (!(inp.aim && inp.roll)) {
                c.rw *= Math.exp(-16 * dt);                                   // al soltar se frena casi en seco
                if (c.hf > 0) c.hf -= dt;
                const n = c.hf > 0 ? 0 : Math.round((c.roll + c.rw * .06) / Math.PI) * Math.PI; c.roll += (n - c.roll) * Math.min(1, 14 * dt);
            }
            c.roll -= TAU_R * Math.trunc(c.roll / TAU_R);
        }
        inp.jump = false;
        const sp = Math.hypot(c.vx, c.vy);
        if (sp > 1150) { c.vx *= 1150 / sp; c.vy *= 1150 / sp; }
        c.x += c.vx * dt; c.y += c.vy * dt;

        // paredes
        let cnt = 0, sx = 0, sy = 0, imp = 0;
        const co = Math.cos(c.a), si = Math.sin(c.a);
        const o = stepCar.tmp || (stepCar.tmp = { x: 0, y: 0, vx: 0, vy: 0 });
        for (let i = 0; i < c.hb.length; i++) {
            const h = c.hb[i], lx = h[0] * c.f, ly = h[1], px = c.x + co * lx - si * ly, py = c.y + si * lx + co * ly;
            o.x = px; o.y = py; o.vx = c.vx; o.vy = c.vy;
            if (collide(o, h[2], 0.1, 0)) {
                c.x += o.x - px; c.y += o.y - py; c.vx = o.vx; c.vy = o.vy;
                cnt += hitN; sx += hitX; sy += hitY; if (impact > imp) imp = impact;
            }
        }
        if (cnt > 0 && c.jumpLock <= 0) {
            const l = Math.hypot(sx, sy) || 1;
            if (!c.grounded && imp > 380) events.push(['land', imp, c.x, c.y + c.r, c.team, c.pid]);
            c.grounded = true; c.nx = sx / l; c.ny = sy / l; c.used = 0; c.flipT = 0;
        } else if (cnt === 0 && c.grounded) { c.grounded = false; c.airT = 0; }
    }

    // ---------- Balón ----------
    function stepBall(b, dt) {
        b.vy += G_BALL * dt;
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > BCAP) { b.vx *= BCAP / sp; b.vy *= BCAP / sp; }
        b.vx *= 1 - (MUT.fast ? 0.01 : 0.04) * dt; b.vy *= 1 - (MUT.fast ? 0.01 : 0.04) * dt;
        b.x += b.vx * dt; b.y += b.vy * dt;
        wallBall(b);
        b.w = (b.w || 0) * (1 - 0.25 * dt); b.rot += b.w * dt; b.cAge = (b.cAge || 0) + 1;
    }
    // rozamiento en el contacto: el balón gira (w) según el deslizamiento de su superficie frente a lo que toca (pared fija o coche en movimiento)
    function spinContact(b, nx, ny, svx, svy, jn, lin) {
        const tx = -ny, ty = nx, slip = (b.vx - svx) * tx + (b.vy - svy) * ty - (b.w || 0) * BALL_R;
        const mj = 0.4 * (Math.abs(jn) + 60), jt = clamp(-slip * 0.3, -mj, mj);
        b.w = (b.w || 0) - 2 * jt / BALL_R;
        if (lin) { b.vx += tx * jt * 0.3; b.vy += ty * jt * 0.3; }
        if (b.w > 40) b.w = 40; else if (b.w < -40) b.w = -40;
    }
    function wallBall(b) {
        if (collide(b, BALL_R, 0.6, 0.0004)) {
            if (hitY / hitN < -0.8) b.vx *= 1 - 0.0004;
            const hl = Math.hypot(hitX, hitY) || 1, wnx = hitX / hl, wny = hitY / hl;
            spinContact(b, wnx, wny, 0, 0, impact, impact > 120);
            b.cx = b.x - wnx * BALL_R; b.cy = b.y - wny * BALL_R; b.cAge = 0;
            if (impact > 260) events.push(['wall', impact]);
        }
    }
    function carBall(c, b) {
        const co = Math.cos(c.a), si = Math.sin(c.a);
        for (let i = 0; i < c.hb.length; i++) {
            const h = c.hb[i], lx = h[0] * c.f, ly = h[1], cx = c.x + co * lx - si * ly, cy = c.y + si * lx + co * ly, minD = BALL_R + h[2];
            let dx = b.x - cx, dy = b.y - cy;
            const d2 = dx * dx + dy * dy;
            if (d2 >= minD * minD) continue;
            let d = Math.sqrt(d2);
            if (d < 1e-6) { dx = 0; dy = -1; d = 1; }
            const nx = dx / d, ny = dy / d;
            b.x = cx + nx * minD; b.y = cy + ny * minD;
            const rx = cx - c.x, ry = cy - c.y;
            const pvx = c.vx - c.w * ry, pvy = c.vy + c.w * rx;
            const vn = (b.vx - pvx) * nx + (b.vy - pvy) * ny;
            if (vn < 0) {
                // contactos lentos: el balón se "pega" un poco (control para llevarlo y hacer air dribble); los golpes fuertes rebotan igual
                const rest = 0.2 + 0.45 * clamp((-vn - 150) / 400, 0, 1);
                const j = -(1 + rest) * vn * 0.86 * c.st.power * (MUT.fast ? 1.3 : 1);
                // reinicio de voltereta: tocar el balón con las ruedas en el aire devuelve el salto
                if (!c.grounded && c.used >= 2 && c.flipT <= 0 && -vn > 80 && (c.resetCd || 0) <= 0) {
                    const sg = Math.cos(c.roll || 0) >= 0 ? 1 : -1, wx = -si * sg, wy = co * sg;
                    if (nx * wx + ny * wy > 0.72) { c.used = 1; c.airT = 0; c.resetCd = 0.7; events.push(['reset', c.team, b.x, b.y, c.pid]); }
                }
                b.vx += nx * j; b.vy += ny * j;
                spinContact(b, nx, ny, pvx, pvy, j, true); b.cx = cx + nx * h[2]; b.cy = cy + ny * h[2]; b.cAge = 0;
                if (c.flipT > 0) { b.vx += c.flipDir * 320 * c.st.power; b.vy -= 60; }
                c.vx -= nx * j * 0.08 / c.st.mass; c.vy -= ny * j * 0.08 / c.st.mass;
                if (-vn > 140) events.push(['hit', -vn, b.x, b.y, c.team, c.pid]);
            }
        }
    }

    // balón apretado entre un coche y una pared: el coche cede un poco en vez de dejar el balón incrustado
    function pinFix(c, b) {
        const co = Math.cos(c.a), si = Math.sin(c.a);
        for (let i = 0; i < c.hb.length; i++) {
            const h = c.hb[i], lx = h[0] * c.f, ly = h[1], cx = c.x + co * lx - si * ly, cy = c.y + si * lx + co * ly, minD = BALL_R + h[2];
            const dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy;
            if (d2 >= (minD - 3) * (minD - 3) || d2 < 1e-6) continue;
            const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, m = Math.min(minD - d, 5);
            c.x -= nx * m; c.y -= ny * m;
            const vn = c.vx * nx + c.vy * ny; if (vn > 0) { c.vx -= nx * vn * .5; c.vy -= ny * vn * .5; }
            break;
        }
    }

    // ---------- Discos de turbo ----------
    function stepPads(w, dt) {
        for (const p of w.pads) {
            if (p.cool > 0) { p.cool -= dt; continue; }
            for (const c of w.cars) {
                if (Math.abs(c.x - p.x) < (p.big ? 52 : 40) && c.y > H - 64 && c.boost < c.st.boostMax) {
                    c.boost = Math.min(c.st.boostMax, c.boost + (p.big ? 100 : 16));
                    p.cool = p.big ? 10 : 4;
                    events.push(['pad', c.team, p.big, c.pid]);
                    break;
                }
            }
        }
    }

    // ---------- Paso de simulación ----------
    function stepWorld(w, dt, inps) {
        const NC = w.cars.length;
        for (let i = 0; i < NC; i++) stepCar(w.cars[i], inps[i], dt);
        stepPads(w, dt);
        const balls = w.ball2 ? [w.ball, w.ball2] : [w.ball];
        let res = -1;
        for (let bi = 0; bi < balls.length; bi++) {
            const b = balls[bi];
            // balón rápido: varios subpasos con los coches interpolados para que no atraviese nada
            let cmax = 0; for (let i = 0; i < NC; i++) cmax = Math.max(cmax, Math.hypot(w.cars[i].vx, w.cars[i].vy));
            const rel = Math.hypot(b.vx, b.vy) + cmax, ns = clamp(Math.ceil(rel * dt / 20), 1, 4);
            for (let s = 1; s <= ns; s++) {
                stepBall(b, dt / ns);
                const back = (1 - s / ns) * dt;
                for (let i = 0; i < NC; i++) {
                    const c = w.cars[i]; if (c.ghost) continue;
                    if (back > 0) { c.x -= c.vx * back; c.y -= c.vy * back; c.a -= c.w * back; }
                    carBall(c, b);
                    if (back > 0) { c.x += c.vx * back; c.y += c.vy * back; c.a += c.w * back; }
                }
                wallBall(b);
            }
            for (let i = 0; i < NC; i++) if (!w.cars[i].ghost) pinFix(w.cars[i], b);
            // red de seguridad: si el balón se sale del mundo, vuelve al centro
            if (b.y > H + 60 || b.y < -300 || b.x < -GD - 80 || b.x > W + GD + 80) Object.assign(b, { x: W / 2, y: H - 380, vx: 0, vy: 0, w: 0 });
            if (res < 0 && b.y > H - GH + 6) {
                let r = -1;
                if (b.x < -BALL_R * 0.7) r = 1; else if (b.x > W + BALL_R * 0.7) r = 0;
                if (r >= 0) {
                    res = r;
                    if (bi === 1) for (const k of ['x', 'y', 'vx', 'vy', 'rot', 'w', 'cAge', 'cx', 'cy']) { const t = w.ball[k]; w.ball[k] = b[k]; b[k] = t; }   // el balón que marca queda como w.ball
                }
            }
        }
        if (w.ball2) ballBall(w.ball, w.ball2);
        for (const c of w.cars) if (c.y > H + 60 || c.y < -300 || c.x < -GD - 80 || c.x > W + GD + 80) resetCar(c, c.team === 0 ? W * (c.pid >= 2 ? 0.15 : 0.31) : W * (c.pid >= 2 ? 0.85 : 0.69));
        return res;
    }
    // choque elástico entre los dos balones (mutador "dos balones")
    function ballBall(a, b) {
        const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, m = BALL_R * 2;
        if (d2 >= m * m || d2 < 1e-6) return;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (m - d) / 2;
        a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn < 0) { const j = -(1 + 0.85) * vn / 2; a.vx -= nx * j; a.vy -= ny * j; b.vx += nx * j; b.vy += ny * j; }
    }

    // ---------- IA ----------
    // aerial/aimErr/wallJ/dribble/reset: mecánicas por nivel. aimErr = error de puntería en radianes.
    // agg: margen (s) para ir al balón aunque el rival llegue un poco antes · flipP: voltereta al disparar desde el suelo
    // mist: error de colocación (px) · tErr: error al calcular el tiempo de llegada · fake: amago en el saque · carry: conducir el balón sobre el techo
    const DIFFS = [
        { react: 0.42, spd: 0.8, look: 0.10, boostUse: false, jumpP: 0.3, agg: 0.3, flipP: 0, mist: 80, tErr: 0.28, fake: 0, shadow: false, lazy: 0.22, learn: 0.15 },
        { react: 0.24, spd: 0.93, look: 0.25, boostUse: true, bAtk: 500, bRet: 9999, jumpP: 0.8, aerial: true, aimErr: 0.22, wallJ: true, dodgeShot: true, agg: 0.16, flipP: 0.3, mist: 36, tErr: 0.15, fake: 0.15, shadow: true, lazy: 0.05, learn: 0.5 },
        { react: 0.12, spd: 1.0, look: 0.35, boostUse: true, bAtk: 420, bRet: 9999, jumpP: 1.0, aerial: true, aimErr: 0.06, wallJ: true, dodgeShot: true, dribble: true, reset: true, agg: 0.09, flipP: 0.7, mist: 10, tErr: 0.05, fake: 0.25, shadow: true, learn: 0.8 },
        { react: 0.06, spd: 1.04, look: 0.6, boostUse: true, bAtk: 260, bRet: 9999, jumpP: 1.0, aerial: true, aimErr: 0.02, wallJ: true, dodgeShot: true, dribble: true, reset: true, agg: 0.05, flipP: 0.9, mist: 3, tErr: 0.025, fake: 0.3, shadow: true, carry: true, learn: 1 }
    ];
    function makeAI(level) {
        return { cfg: DIFFS[level], timer: 0, jcd: 0, mode: 'attack', tx: W * 0.5, pred: null, age: 0, plan: null, planAge: 0, chase: 0, err: 0,
            rstShot: 0, tgo: 0, inp: { dir: 0, pitch: 0, aim: false, jump: false, boost: false } };
    }
    // Predicción de la trayectoria del balón con la misma física del juego (sin coches). Una muestra cada 0.05 s.
    const PRED_O = { x: 0, y: 0, vx: 0, vy: 0 };
    function predictBall(ball, maxT) {
        const o = PRED_O, dt = 1 / 60, out = [];
        o.x = ball.x; o.y = ball.y; o.vx = ball.vx; o.vy = ball.vy;
        out.push([0, o.x, o.y, o.vx, o.vy]);
        const n = Math.round(maxT / dt);
        for (let i = 1; i <= n; i++) {
            o.vy += G_BALL * dt;
            const sp = Math.hypot(o.vx, o.vy); if (sp > BCAP) { o.vx *= BCAP / sp; o.vy *= BCAP / sp; }
            o.vx *= 1 - (MUT.fast ? 0.01 : 0.04) * dt; o.vy *= 1 - (MUT.fast ? 0.01 : 0.04) * dt;
            o.x += o.vx * dt; o.y += o.vy * dt;
            if (collide(o, BALL_R, 0.6, 0.0004) && hitY / hitN < -0.8) o.vx *= 1 - 0.0004;
            if (i % 3 === 0) out.push([i * dt, o.x, o.y, o.vx, o.vy]);
            if (o.x < -BALL_R || o.x > W + BALL_R) break;       // ya es gol
        }
        return out;
    }
    const tFlight = h => (-470 + Math.sqrt(470 * 470 + 700 * h)) / 350;      // tiempo para subir h con salto + turbo
    // ¿Merece la pena un aéreo? Busca el primer momento en que el balón estará a una altura alcanzable.
    function planAerial(ai, car, dirA) {
        if (ai.mode === 'retreat') return null;                       // por delante del balón: no se golpea hacia la propia portería
        const P = ai.pred; if (!P) return null;
        for (let k = 0; k < P.length; k++) {
            const t = P[k][0] - ai.age; if (t < 0.25) continue; if (t > 2.0) break;
            const px = P[k][1], py = P[k][2], h = (H - CAR_R) - py;
            if (h < 150 || h > 540 || px < 60 || px > W - 60) continue;
            const tf = tFlight(h) + 0.08, lead = t - tf;
            if (lead < -0.04) continue;
            const vm = (ai.cfg.boostUse && car.boost > 20 ? 640 : 480) * ai.cfg.spd;
            if (Math.abs(px - car.x) > vm * Math.max(lead, 0) + 170) continue;
            return { t, x: px, y: py, lead, tf };
        }
        return null;
    }
    // Control en el aire: persigue el punto de contacto con el balón (apunta el morro con el control de actitud).
    function airChase(ai, car, ball, dirA, inp, dt) {
        const cfg = ai.cfg, P = ai.pred;
        const d0 = Math.hypot(ball.x - car.x, ball.y - car.y);
        const closing = Math.max(350, Math.hypot(car.vx, car.vy) + 250);
        ai.tgo -= dt;
        const tg = clamp(Math.min(ai.tgo > 0 ? ai.tgo : 9, d0 / closing), 0.04, 0.9);
        const k = P ? Math.min(P.length - 1, Math.max(0, Math.round((tg + ai.age) / 0.05))) : 0;
        const bx = P ? P[k][1] : ball.x, by = P ? P[k][2] : ball.y;
        const gx = dirA > 0 ? W + GD / 2 : -GD / 2, gy = (H - GH + GF) / 2;
        let ux = gx - bx, uy = gy - by; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
        const dribble = cfg.dribble && ball.y < H - 170 && d0 < 300 && car.used >= 1;
        let tx, ty;
        if (dribble) { const nx = dirA * 0.62, ny = -0.78; tx = bx - nx * (BALL_R + CAR_R + 14); ty = by - ny * (BALL_R + CAR_R + 14); }
        else { tx = bx - ux * BALL_R * 0.75; ty = by - uy * BALL_R * 0.75; }
        let dx = tx - car.x, dy = ty - car.y; const L = Math.hypot(dx, dy) || 1;
        const ca = Math.cos(ai.err), sa = Math.sin(ai.err);
        const ax = (dx * ca - dy * sa) / L, ay = (dx * sa + dy * ca) / L;     // dirección de apunte con error
        inp.aim = true; inp.dir = ax; inp.pitch = -ay;
        const nose = car.f * Math.cos(car.a) * ax + car.f * Math.sin(car.a) * ay;
        const aligned = nose > 0.9;
        const vrel = ((car.vx - ball.vx) * dx + (car.vy - ball.vy) * dy) / L;
        inp.boost = car.boost > 2 && aligned && L > 60 && (dribble ? vrel < 380 : true);
        // flip reset (solo Difícil): ya gastó el segundo salto y el balón está justo debajo de las ruedas
        if (cfg.reset && car.used >= 2 && car.flipT <= 0 && ball.y > car.y + 8 && ball.y < car.y + 150 && Math.abs(ball.x - car.x) < 80) {
            inp.dir = dirA * 0.9; inp.pitch = 0; inp.boost = false; ai.resetHunt = 0.5;
        }
        // tras un flip reset: voltereta inmediata hacia la portería
        if (ai.rstShot > 0) { ai.rstShot -= dt; if (car.used < 2 && car.flipT <= 0) { inp.jump = true; inp.dir = dirA; ai.rstShot = 0; } return; }
        if (cfg.reset && ai.lastUsed >= 2 && car.used === 1 && car.resetCd > 0) ai.rstShot = 0.6;
        // segundo salto recto para ganar altura (Difícil, prepara el flip reset)
        if (cfg.reset && car.used === 1 && car.airT > 0.16 && car.airT < 0.6 && d0 > 240 && ball.y < car.y - 200 && !dribble && !ai.dbl) { inp.jump = true; inp.dir = 0; ai.dbl = true; }
        // voltereta de disparo al llegar al balón
        else if (cfg.dodgeShot && !dribble && car.used < 2 && car.flipT <= 0 && car.airT > 0.2 && d0 < 150 && (ball.x - car.x) * dirA > -50) {
            inp.jump = true; inp.dir = dirA;
        }
        // tras el golpe, sin air dribble, se suelta el balón y se aterriza sobre las ruedas
        if (!cfg.dribble && d0 < BALL_R + CAR_R + 30 && ai.chase < 1.9) ai.chase = Math.min(ai.chase, 0.2);
        ai.lastUsed = car.used;
    }
    // ---------- Cerebro de la IA ----------
    // Altura del suelo en x (rampas curvas delante de cada portería)
    function floorY(x) {
        const dx = x < RAMP_X ? RAMP_X - x : x > W - RAMP_X ? x - (W - RAMP_X) : 0;
        if (dx <= 0) return H;
        return H - RAMP_R + Math.sqrt(Math.max(0, RAMP_R * RAMP_R - Math.min(dx, RAMP_R) * Math.min(dx, RAMP_R)));
    }
    // Tiempo aproximado para llegar por el suelo a la x indicada (acelerando, con o sin turbo)
    function groundTime(car, x, boost) {
        const st = car.st || TYPES.chispa, k = car.spd || 1;
        let x0 = car.x, extra = 0;
        if (!car.grounded) { extra = 0.32; x0 = car.x + car.vx * 0.25; }
        else if (car.ny > -0.8) extra = 0.45;          // en pared o techo: primero hay que bajar
        const d = Math.abs(x - x0), sg = Math.sign(x - x0) || 1;
        const v = car.vx * sg, vmax = (boost ? 780 : 520) * k * st.top, a = (boost ? 1200 * st.acc + 1550 * st.boostAcc : 1200 * st.acc) * k;
        let t = extra;
        if (v < 0) t += -v / (a + 2400);                 // frenar para dar la vuelta
        const v0 = Math.max(0, v), t1 = Math.max(0, (vmax - v0) / a), d1 = (v0 + vmax) / 2 * t1;
        t += d <= d1 ? (-v0 + Math.sqrt(v0 * v0 + 2 * a * d)) / a : t1 + (d - d1) / vmax;
        return t;
    }
    // Tiempo que tarda el centro del coche en subir h px con un salto (dbl: con segundo salto rápido). -1 si no llega
    function jumpRise(car, h, dbl) {
        const j = car.st ? car.st.jump : 1, dt = 1 / 120;
        let y = 0, v = 470 * j, t = 0, used = 1;
        while (t < 1.1) {
            if (dbl && used === 1 && t >= 0.1) { v = Math.max(v, 0) + 560 * j; used = 2; }
            v -= G_CAR * dt; y += v * dt; t += dt;
            if (y >= h) return t;
            if (v < 0 && (!dbl || used === 2)) return -1;
        }
        return -1;
    }
    // Primer punto de la trayectoria prevista donde este coche puede golpear el balón hacia su ataque (dirA)
    function intercept(P, age, car, dirA, cfg, canBoost, high) {
        if (!P) return null;
        let fb = null;
        const jumpOk = cfg ? cfg.jumpP > 0.3 : true;
        for (let k = 0; k < P.length; k++) {
            const t = P[k][0] - age; if (t < 0) continue;
            const bx = P[k][1], by = P[k][2];
            if (bx < 30 || bx > W - 30) continue;
            const hb = floorY(bx) - by;
            let type = hb < 92 ? 'g' : null;
            if (!type && jumpOk) { if (jumpRise(car, hb - 38, false) > 0) type = 'j'; else if (cfg && cfg.aerial && jumpRise(car, hb - 38, true) > 0) type = 'j2'; }
            if (!type) continue;
            const ax = bx - dirA * (BALL_R + 24);
            if ((ax - car.x) * dirA < -14 && Math.abs(ax - car.x) > 30) continue;      // el coche está del lado malo del balón
            const tg = groundTime(car, ax, canBoost) + (type !== 'g' ? 0.06 : 0);
            if (tg <= t + 0.03) {
                const hit = { t, x: bx, y: by, ax, type, hb };
                // contra un portero: cerca de su portería prefiere un golpe alto (vaselina) si llega poco después
                if (high && type === 'g' && Math.abs((dirA > 0 ? W : 0) - bx) < 800) { if (!fb) fb = hit; continue; }
                if (fb && t > fb.t + 0.5) return fb;
                return hit;
            }
            if (fb && t > fb.t + 0.5) return fb;
        }
        return fb;
    }
    // ¿El balón va a entrar en mi portería? Devuelve el tiempo o -1
    function threatTime(P, age, dirA) {
        if (!P) return -1;
        for (let k = 0; k < P.length; k++) {
            const x = P[k][1], y = P[k][2];
            if (y > H - GH && (dirA > 0 ? x < BALL_R : x > W - BALL_R)) return P[k][0] - age;
        }
        return -1;
    }
    function nearestPad(w, car, fromX, toX) {
        let best = null; const lo = Math.min(fromX, toX), hi = Math.max(fromX, toX);
        for (const p of w.pads) if (p.cool <= 0 && p.x >= lo && p.x <= hi && (!best || Math.abs(p.x - car.x) < Math.abs(best.x - car.x))) best = p;
        return best;
    }
    // ---------- La IA aprende tus costumbres ----------
    // Observa al rival humano (o al coche que vigila): aéreos, saque, quedarse de portero, choques y tiros lejanos
    function newProf() { return { t: 0, touches: 0, air: 0, far: 0, ko: 0, koRush: 0, back: 0, backT: 0, chal: 0, chalN: 0, lastTouch: -9, koT: -1, koX: 0, said: {} }; }
    function profObserve(ai, car, opp, ball, dt, dirA, kick) {
        const p = ai.prof || (ai.prof = newProf());
        if (!opp || opp.ghost) return;
        p.t += dt;
        const oppGoalX = dirA > 0 ? W : 0, myGoalX = dirA > 0 ? 0 : W;
        // toque del rival: el balón acaba de tocar algo cerca de su coche
        if (ball.cAge != null && ball.cAge <= 8 && p.t - p.lastTouch > 0.3 && Math.hypot(ball.cx - opp.x, ball.cy - opp.y) < 75) {
            p.lastTouch = p.t; p.touches++;
            if (!opp.grounded && opp.y < H - 230) p.air++;
            if (Math.abs(ball.x - myGoalX) > 750 && ball.vx * -dirA > 450) p.far++;
        }
        // saque: ¿sale a tope hacia el balón?
        if (kick && p.koT < 0) { p.koT = p.t; p.koX = opp.x; }
        if (p.koT >= 0 && p.t - p.koT >= 0.7) { p.ko++; if ((W / 2 - p.koX) * (opp.x - p.koX) > 0 && Math.abs(opp.x - p.koX) > 130) p.koRush++; p.koT = -1; }
        // portero: se queda junto a su portería mientras el balón está en mi mitad
        if ((ball.x - W / 2) * dirA < 0) { p.backT += dt; if (Math.abs(opp.x - oppGoalX) < 380) p.back += dt; }
        // choques: cuando los dos estamos cerca del balón, ¿va a por él?
        const dMe = Math.hypot(ball.x - car.x, ball.y - car.y), dOp = Math.hypot(ball.x - opp.x, ball.y - opp.y);
        if (dMe < 320 && dOp < 320) { p.chalN += dt; if ((ball.x - opp.x) * opp.vx > 0 && Math.abs(opp.vx) > 250) p.chal += dt; }
    }
    // Conclusiones (0..1) que la IA usa para adaptarse; solo cuando hay datos suficientes
    function profTraits(ai) {
        const p = ai.prof, L = ai.cfg.learn || 0;
        if (!p || !L || (p.t < 30 && !p.prior)) return null;
        const r = (a, b, min) => b >= min ? a / b : 0;
        return {
            L,
            aerial: r(p.air, p.touches, 8) > 0.4 ? 1 : 0,
            rush: p.ko >= 2 && r(p.koRush, p.ko, 2) > 0.6 ? 1 : 0,
            wait: p.ko >= 2 && r(p.koRush, p.ko, 2) < 0.25 ? 1 : 0,
            goalie: r(p.back, p.backT, 12) > 0.55 ? 1 : 0,
            chal: r(p.chal, p.chalN, 5) > 0.68 ? 1 : 0,
            far: r(p.far, p.touches, 8) > 0.3 ? 1 : 0
        };
    }
    const NOTES = { aerial: 'El rival ha notado que haces muchos aéreos', rush: 'El rival ha visto que siempre sales a tope en el saque', wait: 'El rival ha notado que esperas en el saque',
        goalie: 'El rival ha visto que te quedas de portero', chal: 'El rival ha notado que siempre vas a chocar', far: 'El rival ha notado que tiras mucho desde lejos' };
    function aiStep(ai, car, ball, w, dt) {
        const cfg = ai.cfg, inp = ai.inp;
        if (w && w.ball2) { const b2 = w.ball2; if (Math.hypot(b2.x - car.x, b2.y - car.y) < Math.hypot(ball.x - car.x, ball.y - car.y) - 60) ball = b2; }
        car.spd = cfg.spd;
        ai.jcd -= dt; ai.timer -= dt; ai.age += dt; if (ai.sayT > 0) ai.sayT -= dt;
        inp.aim = false; inp.pitch = 0;
        const dirA = car.team === 0 ? 1 : -1, cars = w && w.cars ? w.cars : [];
        // rivales y compañero (en 2 contra 2 hay dos de cada); el rival principal es el más cercano al balón
        let opp = null, opp2 = null, mate = null;
        for (const c of cars) {
            if (c === car || c.ghost) continue;
            if (c.team === car.team) { if (!cfg.noTeam) mate = c; }
            else if (!opp) opp = c; else opp2 = c;
        }
        if (opp2 && Math.hypot(opp2.x - ball.x, opp2.y - ball.y) < Math.hypot(opp.x - ball.x, opp.y - ball.y)) { const t0 = opp; opp = opp2; opp2 = t0; }
        const homeX = dirA > 0 ? RAMP_X + 70 : W - RAMP_X - 70;          // puesto de portero
        // saque inicial: el balón está quieto en el centro
        const kick = Math.abs(ball.vx) < 1 && Math.abs(ball.vy) < 1 && Math.abs(ball.x - W / 2) < 3;
        if (kick && !ai.koSet) { ai.koSet = true; const tr0 = cfg.learn ? profTraits(ai) : null; let fp = cfg.fake || 0; if (tr0 && tr0.rush) fp = 0; else if (tr0 && tr0.wait) fp = 0; ai.koWait = Math.random() < fp ? 0.35 + Math.random() * 0.5 : 0; ai.timer = 0; }
        if (!kick) ai.koSet = false;
        const watch = ai.watch || opp;
        if (cfg.learn && !ai.profRO) profObserve(ai, car, watch, ball, dt, dirA, kick);      // profRO: comparte lo aprendido por otra IA (2 contra 2)
        const TR = cfg.learn ? profTraits(ai) : null;
        if (TR && TR.L >= 0.5) for (const k in NOTES) if (TR[k] && !ai.prof.said[k]) { ai.prof.said[k] = 1; ai.note = NOTES[k]; break; }
        if (ai.koWait > 0) {
            ai.koWait -= dt;
            if (!kick || (opp && Math.abs(opp.x - W / 2) < 200)) ai.koWait = 0;       // si el rival va a por el balón, deja de amagar
            else { inp.dir = 0; inp.boost = false; return; }
        }
        // ---------- decisión (cada "tiempo de reacción") ----------
        if (ai.timer <= 0 || (ai.chase > 0 && ai.age > 0.1)) {
            if (ai.timer <= 0) ai.timer = cfg.react * (0.8 + Math.random() * 0.5);
            ai.pred = predictBall(ball, 2.1); ai.age = 0;
            ai.err = (Math.random() + Math.random() - 1) * (cfg.aimErr || 0);
            const P = ai.pred, canB = cfg.boostUse && car.boost > 10;
            const lead = ai.lead || 0, tl = ai.tleft == null ? 99 : ai.tleft;
            let agg = cfg.agg;
            if (TR) { if (TR.chal) agg -= 0.15 * TR.L; if (TR.goalie) agg += 0.08 * TR.L; if (kick && TR.rush) agg += 0.3 * TR.L; }
            if (lead < 0 && tl < 45) agg += 0.12;           // perdiendo al final: más agresiva
            else if (lead > 0 && tl < 45) agg -= 0.06;      // ganando al final: más prudente
            const me = intercept(P, 0, car, dirA, cfg, canB, !!(TR && TR.goalie && TR.L >= 0.5));
            // el rival también tiene que reaccionar; si está parado o se aleja del balón, tardará más
            const icpt = (c, d) => { const r = intercept(P, 0, c, d, null, c.boost > 10); if (r) { const toward = (r.ax - c.x) * c.vx > 0 && Math.abs(c.vx) > 120; r.t += 0.15 + (toward ? 0 : 0.3); } return r; };
            let op = opp ? icpt(opp, -dirA) : null;
            if (opp2) { const o2 = icpt(opp2, -dirA); if (o2 && (!op || o2.t < op.t)) op = o2; }
            // compañero: si llega antes (o es humano y llega casi a la vez), yo cubro
            let mt = null;
            if (mate) { const mi = ai.mateHuman ? icpt(mate, dirA) : intercept(P, 0, mate, dirA, null, mate.boost > 10); if (mi) mt = mi.t; }
            const thr = threatTime(P, 0, dirA);
            const behind = (ball.x - car.x) * dirA > -8;
            ai.tgt = null; ai.plan = null;
            let mode, tx;
            const noise = (Math.random() - 0.5) * 2 * (cfg.mist || 0);
            const wasAtk = ai.mode === 'attack', prevMode = ai.mode;
            const hy = prevMode === 'support' ? 0.15 : 0, support = mate && mt != null && (!me || (ai.mateHuman ? mt < me.t + 0.25 + hy : (mt < me.t - 0.04 + hy || (Math.abs(mt - me.t) <= 0.04 && mate.pid < car.pid))));
            if (support && behind) {
                // apoyo: detrás de mi compañero, entre el balón y mi portería
                mode = 'support'; ai.lastTgt = null;
                tx = ball.x - dirA * (thr >= 0 ? 260 : 560);
                if ((tx - homeX) * dirA < 0) tx = homeX;
                if (car.boost < 35 && thr < 0) { const p = nearestPad(w, car, homeX, ball.x - dirA * 300); if (p) tx = p.x; }
            } else if (me && !(support && !behind) && (!op || me.t <= op.t + agg + (thr >= 0 ? 0.25 : 0) + (wasAtk ? 0.18 : 0) || (wasAtk && me.t < 0.45))) {
                // mantiene el plan anterior si el punto apenas cambia: evita dudas y cambios de idea constantes
                const keep = wasAtk && ai.lastTgt && Math.abs(ai.lastTgt.x - me.x) < 40 && Math.abs(ai.lastTgt.t - me.t) < 0.15;
                mode = 'attack'; ai.tgt = me;
                if (keep) { me.t = ai.lastTgt.t; ai.noise = ai.noise || 0; } else { me.t += (Math.random() - 0.5) * 2 * (cfg.tErr || 0); ai.noise = noise; }
                ai.lastTgt = me; tx = me.ax + ai.noise;
            } else if (!behind) {
                mode = 'recover'; tx = ball.x - dirA * 320; ai.lastTgt = null;
            } else if (cfg.shadow || thr >= 0) {
                // esperar en defensa entre el balón y mi portería
                mode = 'shadow'; ai.lastTgt = null;
                let dist = thr >= 0 ? 160 : (op && op.t < 0.6 ? 380 : 300);
                if (TR && thr < 0) dist += (TR.aerial ? 110 : 0) * TR.L + (TR.far ? 170 : 0) * TR.L;      // se coloca más atrás contra aéreos y tiros lejanos
                tx = ball.x - dirA * dist;
                if ((tx - homeX) * dirA < 0) tx = homeX;
                if (car.boost < 30 && thr < 0) { const p = nearestPad(w, car, homeX, ball.x - dirA * 120); if (p) tx = p.x; }
            } else { mode = 'chase'; tx = ball.x - dirA * (BALL_R + 30) + noise; }
            // aéreo: si el balón va alto y llego antes que el rival
            if (cfg.aerial && !kick && mode !== 'support' && car.grounded && car.ny < -0.93 && car.y > H - 60 && ai.chase <= 0 && !(mode === 'attack' && me.t < 1.2)) {
                const pl = planAerial(ai, car, dirA);
                if (pl && (pl.x - car.x) * dirA > -60 && (!op || pl.t < op.t + agg) && (!me || pl.t < me.t - 0.2)) { ai.plan = pl; ai.planAge = 0; mode = 'aerial'; tx = pl.x - dirA * 110; ai.tgt = null; }
            }
            ai.mode = mode;
            // bocadillos para el compañero (como mucho uno cada 2,5 s)
            if (mate && (ai.sayT || 0) <= 0) {
                let s = null;
                if (mode === 'attack' && prevMode !== 'attack' && Math.hypot(mate.x - ball.x, mate.y - ball.y) < 380 && (ball.x - mate.x) * mate.vx > 0) s = '¡Mía!';
                else if (mode === 'support' && prevMode === 'attack' && ai.mateHuman) s = '¡Tuya!';
                else if (thr >= 0 && (mode === 'shadow' || mode === 'support') && prevMode !== mode && thr < 1.2) s = '¡Atrás!';
                if (s) { ai.say = s; ai.sayT = 4; }
            }
            tx = clamp(tx, 60, W - 60);
            if (cfg.lazy && Math.random() < cfg.lazy && thr < 0) { ai.dir = 0; ai.boost = false; ai.tx = car.x; ai.tgt = null; return; }      // principiante: a veces duda y se queda quieto
            ai.tx = tx;
            const dist = Math.abs(tx - car.x);
            ai.dir = dist < 12 ? 0 : Math.sign(tx - car.x);
            // turbo: si hay que llegar a tiempo, si el balón va a mi portería o si es un disparo
            let bo = false;
            if (cfg.boostUse && car.boost > 6) {
                if (mode === 'attack') { const tNo = groundTime(car, me.ax, false); bo = tNo > me.t - 0.05 || (me.type === 'g' && dist < 260 && (me.x - car.x) * dirA > 0 && Math.abs(me.x - (dirA > 0 ? W : 0)) < 900); }
                else if (mode === 'recover') bo = dist > 200 && (ball.vx * dirA < -50 || thr >= 0);
                else if (mode === 'shadow' || mode === 'support') bo = dist > (thr >= 0 ? 120 : 420);
                else if (mode === 'aerial') bo = Math.abs(ai.plan.x - car.x) > 260;
                else bo = dist > (cfg.bAtk || 400);
            }
            ai.boost = bo;
        }
        if (ai.plan) ai.planAge += dt;
        inp.dir = ai.dir; inp.boost = ai.boost;
        if (ai.chase > 0) ai.chase -= dt;
        const tg = ai.tgt;
        if (tg) tg.t -= dt;
        if (car.grounded) {
            ai.dbl = false; ai.lastUsed = 0; ai.touched = false;
            if (car.ny > 0.5) { if (ai.jcd <= 0) { inp.jump = true; ai.jcd = 0.8; } return; }       // techo: soltarse
            if (car.ny > -0.6) {
                // pared: salto de pared hacia el balón si está cerca, si no bajar
                const dBall = Math.hypot(ball.x - car.x, ball.y - car.y);
                if (cfg.wallJ && ai.jcd <= 0 && dBall < 640 && ball.y < H - 120 && (ball.x - car.x) * dirA > -40) { inp.jump = true; ai.jcd = 0.8; ai.chase = 1.8; ai.err = 0; ai.tgo = 0.6; }
                else inp.dir = car.nx > 0 ? 1 : -1;
                return;
            }
            // conducir el balón sobre el techo (Leyenda) y soltarlo con un "flick"
            const onRoof = ball.y < car.y - 28 && ball.y > car.y - 95 && Math.abs(ball.x - car.x) < 34 && Math.abs(ball.vy) < 260;
            if (cfg.carry && onRoof && (ball.x - car.x) * dirA > -34) {
                const rel = (ball.x - car.x) * dirA;
                inp.dir = dirA; inp.boost = false; ai.boost = false;
                if (rel < -6 && Math.abs(car.vx) > 120) inp.pitch = -1;      // el balón se va hacia atrás: frena un poco
                const goalD = Math.abs((dirA > 0 ? W : 0) - car.x), oppD = opp ? Math.abs(opp.x - car.x) : 9999;
                if (ai.jcd <= 0 && (oppD < 260 || goalD < 520)) { inp.jump = true; ai.jcd = 0.7; ai.flick = 0.09; }
                return;
            }
            if (ai.plan && ai.plan.lead - ai.planAge <= 0.06 && ai.jcd <= 0) {
                inp.jump = true; ai.jcd = 0.7; ai.chase = 2.2; ai.tgo = ai.plan.t - ai.planAge; ai.plan = null; return;     // despegue para el aéreo
            }
            const dB = Math.abs(ball.x - car.x);
            // balón entre mi coche y mi portería: pasar por debajo, saltar por encima o apartarse, pero nunca empujarlo hacia mi portería
            if ((ball.x - car.x) * dirA < -4 && dB < 380 && ai.mode !== 'aerial') {
                const sgn = Math.sign(ball.x - car.x), closing = (car.vx - ball.vx) * sgn, hb = floorY(ball.x) - ball.y;
                if (closing > 30 || dB < 120) {
                    const tc = clamp((dB + 40) / Math.max(closing, 60), 0, 1.2), hbC = hb - (ball.vy * tc + 360 * tc * tc);      // altura del balón al cruzarlo
                    if (hb > 112 && hbC > 108) { /* pasa por debajo */ }
                    else if (hb < 58 && ball.vy > -120 && ball.x > RAMP_X + 40 && ball.x < W - RAMP_X - 40) {
                        if (ai.jcd <= 0 && dB < clamp(closing * 0.36, 105, 300)) { inp.dir = sgn; inp.jump = true; ai.jcd = 0.6; ai.hop = 0.6; ai.dir = sgn; return; }
                    } else if (dB < 230) {
                        if (car.vx * sgn > 60) { inp.dir = 0; inp.pitch = -1; }       // freno: espero a que el balón suba o baje
                        else inp.dir = -sgn;                                          // el balón viene hacia mí: me aparto
                        inp.boost = false; return;
                    }
                }
            }
            if (ai.mode === 'attack' && tg) {
                // llegar a tiempo: si voy muy pronto, frenar y esperar a que baje el balón
                const d = Math.abs(tg.ax - car.x), sg = Math.sign(tg.ax - car.x), vTo = car.vx * sg;
                if (tg.t > 0.25 && d > 20) {
                    const vNeed = d / Math.max(0.1, tg.t);
                    if (vTo > vNeed + 140) { inp.dir = 0; inp.pitch = -1; inp.boost = false; }
                    else if (vTo > vNeed + 60) { inp.dir = sg * 0.3; inp.boost = false; }
                }
                if (d < 12 && tg.t > 0.2) inp.dir = 0;
                const front = (ball.x - car.x) * dirA, dist = Math.hypot(ball.x - car.x, ball.y - car.y);
                // salto para un balón a media altura
                if ((tg.type === 'j' || tg.type === 'j2') && ai.jcd <= 0 && front > 0) {
                    const tUp = jumpRise(car, Math.max(10, tg.hb - 38), tg.type === 'j2');
                    if (tUp > 0 && tg.t <= tUp + 0.02 && Math.abs(tg.ax - car.x) < Math.abs(car.vx) * tUp + 70) { inp.jump = true; ai.jcd = 0.7; ai.dblJ = tg.type === 'j2' ? 0.1 : 0; return; }
                }
                // disparo con voltereta desde el suelo
                if (tg.type === 'g' && cfg.dodgeShot && ai.jcd <= 0 && front > 0 && dist < 150 + Math.abs(car.vx) * 0.08 && ball.y > H - 115 && Math.random() < (cfg.flipP || 0) * 0.5) {
                    inp.jump = true; ai.jcd = 0.8; ai.flick = 0.07; return;
                }
            } else if (!cfg.aerial && ai.jcd <= 0 && Math.abs(ball.x - car.x) < 230 && ball.y < car.y - 90 && (ball.x - car.x) * dirA > 0 && Math.random() < cfg.jumpP * 0.25) {
                inp.jump = true; ai.jcd = 0.7;
            }
        } else if (car.flipT <= 0 || ai.chase > 0) {
            // voltereta inmediata (disparo desde el suelo o flick del balón conducido)
            if (ai.flick > 0) {
                ai.flick -= dt; inp.boost = false;
                if (ai.flick <= 0 && car.used < 2) { inp.jump = true; inp.dir = dirA; }
                return;
            }
            if (ai.dblJ > 0) { ai.dblJ -= dt; inp.dir = 0; inp.boost = false; if (ai.dblJ <= 0 && car.used < 2) inp.jump = true; return; }
            if (ai.hop > 0) {
                ai.hop -= dt; inp.aim = true; inp.dir = ai.dir || car.f; inp.pitch = 0.15; inp.boost = cfg.boostUse && car.boost > 15;      // morro recto y turbo para pasar por encima
                if (car.used < 2 && car.airT > 0.1 && Math.abs(ball.x - car.x) < 220 && ball.y > H - 170) { inp.jump = true; inp.dir = 0; inp.aim = false; }   // segundo salto recto para pasar por encima
                return;
            }
            if (ai.chase > 0 && cfg.aerial && car.flipT <= 0) { airChase(ai, car, ball, dirA, inp, dt); return; }
            const near = Math.hypot(ball.x - car.x, ball.y - car.y), front = (ball.x - car.x) * dirA;
            if (car.flipT <= 0) {
                if (car.used < 2 && car.airT > 0.12 && near < 175 && front > -20 && ai.jcd <= 0 && Math.random() < cfg.jumpP) {
                    inp.jump = true; inp.dir = dirA; ai.jcd = 0.7;
                } else if (cfg.aerial) { inp.aim = true; inp.dir = car.f * 0.9; inp.pitch = 0; }      // aterrizar sobre las ruedas
                else {
                    const err = wrap(0 - car.a);
                    inp.dir = Math.abs(err) < 0.25 ? 0 : Math.sign(err);
                }
            }
            inp.boost = ai.boost && near > 260 && car.boost > 8 && ball.y < car.y;
        }
    }
    return { W, H, GD, GH, GF, RAMP_X, solidL, solidR, TR, get BALL_R() { return BALL_R; }, setMut, MUT, CAR_R, CAR_L, TYPES, applyType, pts, events, makeWorld, kickoff, stepWorld, makeAI, aiStep, predictBall, floorY, newProf, wrap, clamp };
})();
