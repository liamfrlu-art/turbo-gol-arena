'use strict';
/* Turbo Gol Arena · Bucle principal, calidad automática, copia de seguridad del progreso y arranque.
   Los archivos de js/ se cargan en orden y comparten el ámbito global (antes eran un solo game.js). */
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
