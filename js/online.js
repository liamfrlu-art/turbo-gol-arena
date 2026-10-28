'use strict';
/* Turbo Gol Arena · Online: partido contra un amigo por WebRTC (PeerJS).
   Los archivos de js/ se cargan en orden y comparten el ámbito global (antes eran un solo game.js). */
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
    netSendMsg({ t: 'bye' });      // aviso de salida: el otro vuelve al menú enseguida en vez de esperar a reconectar
    S.net = null; netClose(); $('ping').hidden = true;
    if (cfg.stadSel !== 'random' && cfg.stad !== cfg.stadSel) { cfg.stad = cfg.stadSel; resize(); }      // vuelve a tu estadio fijo
    $('restartBtn').style.display = ''; $('againBtn').textContent = 'Revancha';
}
function netLost(msg) {
    if (S.net) { qToast(msg, '#ff6b6b'); toMenu(); }
    else if (netLobby) { netClose(); lobbyShow('onPick'); lobbyMsg(msg, true); }
}
function netConn(c) {
    conn = c;
    c.on('open', () => {
        if (c !== conn) return;
        if (c.reconnect) { c.send({ t: 're' }); if (S.net) S.net.dropAt = 0; qToast('¡Reconectado!', '#3dffb0'); }
        else if (!c.hostSide) { lobbyMsg('Conectado. Empezando…'); c.send({ t: 'hola', car: isLocked(cfg.car) ? 'fenix' : cfg.car }); }
    });
    c.on('data', d => { if (c === conn && d && d.t) netMsg(d); });
    c.on('close', () => { if (c === conn) netDrop(); });
    c.on('error', () => { if (c === conn) netDrop(); });
}
// corte durante el partido: el juego sigue y el invitado intenta volver a conectar durante 10 s
// (si no lo consigue, el aviso de 10 s sin noticias de netRecv lo da por perdido)
let netCode = '';
function netDrop() {
    if (!S.net || S.state === 'end') { netLost('Tu amigo se ha desconectado'); return; }
    conn = null;
    if (!S.net.dropAt) { S.net.dropAt = performance.now(); qToast('Conexión inestable: reconectando…', '#ffd23f'); }      // un solo aviso aunque fallen varios intentos
    if (S.net.guest) netRetry();
}
function netRetry() {
    const N = S.net; if (!N || conn || !peer || peer.destroyed || performance.now() - N.dropAt > 10000) return;
    try { if (peer.disconnected) peer.reconnect(); } catch (e) { /* lo intenta en la siguiente vuelta */ }
    try { const c = peer.connect(NET_PRE + netCode, { reliable: true, serialization: 'json' }); c.reconnect = true; netConn(c);
        setTimeout(() => { if (conn === c && !c.open) { conn = null; try { c.close(); } catch (e) { /* nada */ } netRetry(); } }, 2500); }
    catch (e) { setTimeout(netRetry, 1500); }
}
function netGo(guest, d) {
    S.net = { guest, rivalCar: d.car, time: d.time, mut: d.mut, stad: d.stad };
    netLobby = false; $('online').classList.remove('show'); $('end').classList.remove('show'); overlayFrom = null;
    startMatch('match');
}
// ajustes de la sala (duración, estadio y mutadores): los elige el anfitrión y se mandan al invitado con el «go»
const netRoom = { time: cfg.time, stad: 'random', mut: Object.assign({}, cfg.mut) };
function netRoomUI() {
    $('onTime').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === netRoom.time)));
    $('onStad').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === netRoom.stad)));
    $('onMut').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(!!netRoom.mut[b.dataset.m])));
}
$('onTime').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; netRoom.time = +b.dataset.v; netRoomUI(); sfx('click'); });
$('onStad').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; netRoom.stad = b.dataset.v; netRoomUI(); sfx('click'); });
$('onMut').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; netRoom.mut[b.dataset.m] = !netRoom.mut[b.dataset.m]; netRoomUI(); sfx('click'); });
function netGoHost() {
    const mut = Object.assign({}, netRoom.mut), time = netRoom.time, stad = netRoom.stad === 'random' ? pickStad() : netRoom.stad;      // el estadio sorteado es el mismo para los dos
    netSendMsg({ t: 'go', car: isLocked(cfg.car) ? 'fenix' : cfg.car, time, mut, stad });
    netGo(false, { car: S.net ? S.net.rivalCar : netGoHost.car, time, mut, stad });
}
function netMsg(d) {
    const N = S.net;
    if (N) N.lastRx = performance.now();
    switch (d.t) {
        case 'hola': if (!N && conn && conn.hostSide) { netGoHost.car = d.car; netGoHost(); } break;          // el invitado ya está: empieza el partido
        case 'go': if (conn && !conn.hostSide) netGo(true, d); break;
        case 'i': if (N && !N.guest) { for (const e of d.l) N.q.push(e); } break;
        case 's': if (N && N.guest) N.snap = d; break;
        case 're': if (N) { N.dropAt = 0; qToast('¡Reconectado!', '#3dffb0'); } break;
        case 'bye': netLost('Tu amigo ha salido de la partida'); break;
        case 'pi': netSendMsg({ t: 'po', s: d.s }); break;
        case 'po': if (N) { const r = performance.now() - d.s; N.rtt = N.rtt == null ? r : N.rtt * .7 + r * .3; } break;
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
    if (now - (N.piT || 0) > 1000) { N.piT = now; netSendMsg({ t: 'pi', s: Math.round(now) }); pingUI(); }      // ping de ida y vuelta una vez por segundo
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
function pingUI() {
    const el = $('ping'), r = S.net.rtt, lost = !conn || S.net.dropAt;
    el.hidden = false;
    el.textContent = lost ? 'Reconectando…' : r == null ? '··· ms' : Math.round(r) + ' ms';
    el.className = lost || r > 200 ? 'bad' : r > 100 ? 'mid' : 'ok';
}
// las correcciones del rival y del balón no saltan de golpe: el desfase visual se va apagando en unas décimas
const NET_SMOOTH = 0.09;
function netRecv(dt) {
    const N = S.net;
    if (N.guest) {
        const k = Math.exp(-(dt || 0) / NET_SMOOTH), w = S.world;
        for (const o of [w.cars[1], w.ball, w.ball2]) if (o && (o.vox || o.voy)) { o.vox *= k; o.voy *= k; if (Math.abs(o.vox) + Math.abs(o.voy) < 0.3) o.vox = o.voy = 0; }
    }
    if (performance.now() - N.lastRx > 10000) { netLost('Se ha perdido la conexión con tu amigo'); return; }
    if (!N.guest || !N.snap) return;
    const s = N.snap, w = S.world; N.snap = null;
    S.time = s.tm;
    if (s.ot && !S.ot) goldenGoal();
    const sc = [s.sc[1], s.sc[0]];
    for (let k = 0; k < 2; k++) if (sc[k] > S.score[k]) { if (S.state === 'play') { S.score[k] = sc[k] - 1; goal(k); } else S.score[k] = sc[k]; }
    // saque de centro y cuenta atrás al ritmo del anfitrión
    if (s.st === 'count' && (S.state === 'play' || S.state === 'goal')) { for (const o of [w.cars[1], w.ball, w.ball2]) if (o) o.vox = o.voy = 0; hideBanner(); T.kickoff(w); setState('count'); S.cd = s.cd; lastCd = 4; N.hist.length = 0; return; }
    if (S.state === 'count') { if (s.st !== 'count') S.cd = 0; else if (Math.abs(S.cd - s.cd) > 0.15) S.cd = s.cd; return; }
    if ((S.state !== 'play' && S.state !== 'goal') || (s.st !== 'play' && s.st !== 'goal')) return;
    // se coloca todo como lo ve el anfitrión (en espejo) y se repiten los mandos propios que aún no ha procesado
    const sm = [w.cars[1], w.ball, w.ball2].filter(Boolean), old = sm.map(o => [o.x + (o.vox || 0), o.y + (o.voy || 0)]);
    netMirror(w.cars[0], NCK, s.c[1]); netMirror(w.cars[1], NCK, s.c[0]);
    netMirror(w.ball, NBK, s.b); if (w.ball2 && s.b2) netMirror(w.ball2, NBK, s.b2);
    w.pads.forEach((p, i) => { p.cool = s.p[s.p.length - 1 - i]; });
    N.rin = s.i;
    while (N.hist.length && N.hist[0][0] <= s.ack) N.hist.shift();
    const evN = T.events.length, mine = {}, his = {};
    for (const e of N.hist) { unpackI(mine, e, false); unpackI(his, s.i, true); his.jump = false; T.stepWorld(w, STEP, [mine, his]); }
    T.events.length = evN;      // lo repetido ya sonó la primera vez
    sm.forEach((o, i) => { const dx = old[i][0] - o.x, dy = old[i][1] - o.y;      // se sigue viendo donde estaba y se acerca poco a poco
        if (Math.abs(dx) < 120 && Math.abs(dy) < 120) { o.vox = dx; o.voy = dy; } else o.vox = o.voy = 0; });
}
function netAgain() {
    const N = S.net; if (!N || N.againMe) return;
    N.againMe = true; netSendMsg({ t: 'again' }); $('againBtn').textContent = 'Esperando a tu amigo…';
    netTryAgain();
}
function netTryAgain() { const N = S.net; if (N && !N.guest && N.againMe && N.againThem) netGoHost(); }
function netEnd() { if (S.net && !S.net.guest) netSendMsg({ t: 'end', sc: S.score }); }

function netHost() {
    audio(); netClose(); lobbyShow('onHost'); netRoomUI(); $('onCode').textContent = '····'; lobbyMsg('Creando sala…');
    loadPeer().then(() => {
        const code = Array.from({ length: 4 }, () => NET_ABC[Math.floor(Math.random() * NET_ABC.length)]).join('');
        const p = peer = new window.Peer(NET_PRE + code, { debug: 0 });
        p.on('open', () => { if (p !== peer) return; $('onCode').textContent = code; lobbyMsg('Pásale este código a tu amigo. Esperando…'); });
        // también acepta que el invitado vuelva a entrar a mitad de partido tras un corte
        p.on('connection', c => {
            if (p !== peer || (conn && !S.net)) { c.close(); return; }
            const old = conn; c.hostSide = true; netConn(c);      // la conexión nueva sustituye a la vieja (puede seguir medio abierta)
            if (old) try { old.close(); } catch (e) { /* nada */ }
            if (!S.net) lobbyMsg('Tu amigo se está conectando…');
        });
        p.on('disconnected', () => { if (p === peer && !p.destroyed) try { p.reconnect(); } catch (e) { /* nada */ } });
        p.on('error', e => { if (p !== peer || S.net) return; if (e.type === 'unavailable-id') netHost(); else { netClose(); lobbyShow('onPick'); lobbyMsg('No se pudo crear la sala. Revisa tu conexión a internet.', true); } });
    }).catch(() => { lobbyShow('onPick'); lobbyMsg('No se pudo cargar el modo online. Revisa tu conexión a internet.', true); });
}
function netJoin() {
    const code = $('onInput').value.toUpperCase().replace(/[^A-Z]/g, ''); netCode = code;
    if (code.length !== 4) { lobbyMsg('El código tiene 4 letras.', true); return; }
    audio(); netClose(); lobbyMsg('Buscando la sala ' + code + '…');
    loadPeer().then(() => {
        const p = peer = new window.Peer({ debug: 0 });
        p.on('open', () => { if (p !== peer) return; netConn(p.connect(NET_PRE + code, { reliable: true, serialization: 'json' })); });      // json: el empaquetado binario de PeerJS estropea números muy pequeños
        p.on('disconnected', () => { if (p === peer && !p.destroyed) try { p.reconnect(); } catch (e) { /* nada */ } });
        p.on('error', e => { if (p !== peer || S.net) return; netClose(); lobbyMsg(e.type === 'peer-unavailable' ? 'No existe ninguna sala con el código ' + code + '.' : 'No se pudo conectar. Revisa tu conexión a internet.', true); });
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

