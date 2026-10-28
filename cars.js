'use strict';
/* Coches de Turbo Gol Arena. Todos son diseños originales.
   Cada coche mira hacia +x y se dibuja centrado en su origen (largo aprox. 94, alto aprox. 30).
   El color de equipo (azul o naranja) siempre se ve: carrocería, vinilo, alerón o luz inferior según el modelo.
   Opciones de dibujo (o): t tiempo, wheel giro, spin velocidad, boosting turbo, brake luz de freno. */
window.CARS = (() => {
    const TAU = Math.PI * 2;
    const SKIN = {
        0: { main: '#3db8ff', dark: '#16608f', lite: '#c4ecff', glow: '61,184,255' },
        1: { main: '#ff8a2b', dark: '#8f420a', lite: '#ffdcb8', glow: '255,138,43' }
    };
    const RARITY = {
        common: { name: 'Común', color: '#9aa7d6' },
        rare: { name: 'Rara', color: '#3db8ff' },
        epic: { name: 'Épica', color: '#b46bff' },
        legend: { name: 'Legendaria', color: '#ffd23f' },
        chroma: { name: 'Cromática', color: '#ff4fd8' }
    };
    // Personalización (solo estética). CUR guarda lo elegido mientras se dibuja un coche.
    const CUR = { over: false, finish: 'gloss', pat: null, wheel: 'auto', flame: null, glowRGB: null, t: 0 };
    const PAINTS = [
        { id: 'team', name: 'Equipo', sw: '#3db8ff' },
        { id: 'rojo', name: 'Rojo pasión', sw: '#ff3b3b', main: '#e0262b', dark: '#6a0a12', lite: '#ffb3a8' },
        { id: 'lima', name: 'Verde lima', sw: '#8dff3d', main: '#6fe02a', dark: '#1d5f0e', lite: '#e6ffb8' },
        { id: 'violeta', name: 'Violeta', sw: '#a45cff', main: '#8a3fe8', dark: '#35106e', lite: '#e1c8ff' },
        { id: 'rosa', name: 'Rosa chicle', sw: '#ff6bc4', main: '#ff4fb0', dark: '#8f1d63', lite: '#ffd0ec' },
        { id: 'perla', name: 'Blanco perla', sw: 'linear-gradient(135deg,#ffffff,#d9e4ff 40%,#ffe0f4 70%,#e0fff4)', main: '#e6ebfa', dark: '#8d97bd', lite: '#ffffff', finish: 'pearl' },
        { id: 'negro', name: 'Negro mate', sw: '#2a2d3a', main: '#2c2f3d', dark: '#0a0b12', lite: '#5a5f78', finish: 'matte' },
        { id: 'oro', name: 'Oro metálico', sw: '#ffc93a', main: '#f2b21c', dark: '#7a4a00', lite: '#fff1b0', finish: 'metal' },
        { id: 'cobre', name: 'Cobre', sw: '#d9803f', main: '#cf6f2e', dark: '#5e2a0b', lite: '#ffcfa0', finish: 'metal' },
        { id: 'cromo', name: 'Cromo', sw: '#dfe6f7', main: '#cfd8ee', dark: '#4a5370', lite: '#ffffff', finish: 'chrome' },
        { id: 'carreras', name: 'Carreras', sw: 'linear-gradient(#e0262b 40%,#fff 40% 60%,#e0262b 60%)', main: '#e0262b', dark: '#6a0a12', lite: '#ffb3a8', pat: 'stripes' },
        { id: 'galaxia', name: 'Galaxia', sw: 'radial-gradient(circle at 30% 30%,#a45cff,#1b1050 70%)', main: '#3b1f8f', dark: '#0b0630', lite: '#9d86ff', pat: 'stars' },
        { id: 'arcoiris', name: 'Arcoíris', sw: 'conic-gradient(#f33,#ff0,#3f3,#3ff,#33f,#f3f,#f33)', rainbow: true },
        { id: 'fuego', name: 'Fuego', sw: 'linear-gradient(0deg,#ffd24a,#ff5a14 55%,#3a0800)', main: '#e8480e', dark: '#4a0c00', lite: '#ffc27a', pat: 'flame' },
        { id: 'hielo', name: 'Hielo', sw: 'linear-gradient(135deg,#f2feff,#8fdcff 45%,#2a78b8)', main: '#7fd0f5', dark: '#164a78', lite: '#eaffff', finish: 'chrome', pat: 'ice' },
        { id: 'neonp', name: 'Neón', sw: 'linear-gradient(135deg,#0a0e2a 45%,#3dfff0 47% 53%,#ff3df0 55% 61%,#0a0e2a 63%)', main: '#161c50', dark: '#04061a', lite: '#3d4aa0', pat: 'neon' },
        { id: 'camo', name: 'Camuflaje', sw: 'radial-gradient(circle at 30% 35%,#a3ad7e 0 25%,transparent 26%),radial-gradient(circle at 70% 60%,#232a18 0 28%,transparent 29%),#5f6b45', main: '#5f6b45', dark: '#232a18', lite: '#a3ad7e', finish: 'matte', pat: 'camo' },
        { id: 'holo', name: 'Holográfica', sw: 'linear-gradient(120deg,#ff8ad8,#8ad8ff,#b6ff8a,#ffe08a,#ff8ad8)', main: '#b9c8ff', dark: '#4a4f9a', lite: '#ffffff', pat: 'holo' },
        { id: 'ev_halloween', name: 'Calabaza embrujada', ev: 'halloween', price: 400, sw: 'linear-gradient(0deg,#ffb04a,#ff6a14 50%,#3a0a4a)', main: '#ff6a14', dark: '#3a0a4a', lite: '#ffd08a', pat: 'flame' },
        { id: 'ev_navidad', name: 'Bastón de caramelo', ev: 'navidad', price: 400, sw: 'repeating-linear-gradient(135deg,#e0262b 0 8px,#fff 8px 16px)', main: '#e0262b', dark: '#6a0a12', lite: '#ffffff', pat: 'stripes' },
        { id: 'ev_sanvalentin', name: 'Corazón de perla', ev: 'sanvalentin', price: 400, sw: 'linear-gradient(135deg,#ffd0ec,#ff4fb0 55%,#8f1d63)', main: '#ff5ab8', dark: '#8f1d63', lite: '#ffe0f2', finish: 'pearl' },
        { id: 'ev_primavera', name: 'Brote de primavera', ev: 'primavera', price: 400, sw: 'linear-gradient(135deg,#d8ffb0,#7fdc6a 50%,#ff9ad8)', main: '#7fdc6a', dark: '#2a6a2a', lite: '#ffd0ec', finish: 'pearl' },
        { id: 'ev_verano', name: 'Atardecer', ev: 'verano', price: 400, sw: 'linear-gradient(0deg,#8a2a5a,#ff6a3d 45%,#ffd23f)', main: '#ff7a3d', dark: '#8a2a5a', lite: '#fff0a0', finish: 'metal' }
    ];
    const WHEELS = [
        { id: 'auto', name: 'De serie', sw: 'radial-gradient(circle,#dfe4fb 0 35%,#080a18 38%)' },
        { id: 'cromo', name: 'Cromo', sw: 'radial-gradient(circle,#fff 0 40%,#aab3cf 42% 60%,#080a18 63%)' },
        { id: 'oro', name: 'Oro', sw: 'radial-gradient(circle,#fff0a8 0 30%,#f4b81e 33% 60%,#080a18 63%)' },
        { id: 'neon', name: 'Neón', sw: 'radial-gradient(circle,#0a0f2a 0 40%,#3dffe0 43% 55%,#080a18 60%)' },
        { id: 'turbina', name: 'Turbina', sw: 'conic-gradient(#8fb4ff,#1a2250,#8fb4ff,#1a2250,#8fb4ff,#1a2250,#8fb4ff)' },
        { id: 'arcoiris', name: 'Arcoíris', sw: 'radial-gradient(circle,#080a18 0 25%,transparent 27%),conic-gradient(#f33,#ff0,#3f3,#3ff,#33f,#f3f,#f33)' },
        { id: 'retro', name: 'Retro', sw: 'radial-gradient(circle,#c9cde0 0 30%,#fff 33% 62%,#080a18 65%)' },
        { id: 'rojo', name: 'Rojas', sw: 'radial-gradient(circle,#ff6a5c 0 40%,#d02020 43% 60%,#080a18 63%)' }
    ];
    const TRAILS = [
        { id: 'auto', name: 'De serie', sw: 'linear-gradient(90deg,#ff8a2b,#ffd23f)' },
        { id: 'hielo', name: 'Hielo', sw: 'linear-gradient(90deg,#8fe3ff,#fff)', flame: ['rgba(60,150,255,.8)', 'rgba(140,220,255,.85)', 'rgba(220,250,255,.9)', 'rgba(255,255,255,.95)'], glow: '140,220,255' },
        { id: 'rayo', name: 'Eléctrico', sw: 'linear-gradient(90deg,#ffe83a,#fff)', flame: ['rgba(255,225,40,.8)', 'rgba(255,245,140,.85)', 'rgba(255,255,230,.9)', 'rgba(255,255,255,.95)'], glow: '255,235,90' },
        { id: 'toxico', name: 'Tóxico', sw: 'linear-gradient(90deg,#3dff6a,#d8ff3d)', flame: ['rgba(30,200,60,.8)', 'rgba(110,255,90,.85)', 'rgba(210,255,140,.9)', 'rgba(255,255,230,.95)'], glow: '110,255,90' },
        { id: 'neon', name: 'Neón rosa', sw: 'linear-gradient(90deg,#ff3dd0,#ff9ae8)', flame: ['rgba(230,40,190,.8)', 'rgba(255,100,225,.85)', 'rgba(255,190,240,.9)', 'rgba(255,255,255,.95)'], glow: '255,90,220' },
        { id: 'galaxia', name: 'Galaxia', sw: 'linear-gradient(90deg,#6b3dff,#3df0ff)', flame: ['rgba(90,50,230,.8)', 'rgba(150,100,255,.85)', 'rgba(110,220,255,.9)', 'rgba(255,255,255,.95)'], glow: '140,110,255' },
        { id: 'arcoiris', name: 'Arcoíris', sw: 'linear-gradient(90deg,#f33,#ff0,#3f3,#3ff,#33f,#f3f)', rainbow: true },
        { id: 'humo', name: 'Humo negro', sw: 'linear-gradient(90deg,#14161f,#6a7090)', flame: ['rgba(30,32,45,.85)', 'rgba(70,74,100,.85)', 'rgba(130,136,170,.8)', 'rgba(200,205,230,.8)'], glow: '90,95,130' },
        { id: 'ev_halloween', name: 'Embrujada', ev: 'halloween', reward: true, sw: 'linear-gradient(90deg,#7a2acb,#5aff6a)', flame: ['rgba(110,30,200,.8)', 'rgba(90,230,100,.85)', 'rgba(200,255,170,.9)', 'rgba(255,255,255,.95)'], glow: '150,100,255' },
        { id: 'ev_navidad', name: 'Navideña', ev: 'navidad', reward: true, sw: 'linear-gradient(90deg,#e0262b,#fff,#2ac25a)', flame: ['rgba(220,30,40,.8)', 'rgba(40,200,90,.85)', 'rgba(255,240,200,.9)', 'rgba(255,255,255,.95)'], glow: '255,120,110' },
        { id: 'ev_sanvalentin', name: 'Flechazo', ev: 'sanvalentin', reward: true, sw: 'linear-gradient(90deg,#ff2a6a,#ff9ad8)', flame: ['rgba(230,30,90,.8)', 'rgba(255,90,180,.85)', 'rgba(255,190,230,.9)', 'rgba(255,255,255,.95)'], glow: '255,90,170' },
        { id: 'ev_primavera', name: 'Pétalos', ev: 'primavera', reward: true, sw: 'linear-gradient(90deg,#7fdc6a,#ff9ad8)', flame: ['rgba(90,200,80,.8)', 'rgba(255,150,210,.85)', 'rgba(255,220,240,.9)', 'rgba(255,255,255,.95)'], glow: '255,160,220' },
        { id: 'ev_verano', name: 'Ola de calor', ev: 'verano', reward: true, sw: 'linear-gradient(90deg,#3dafff,#ffd23f,#ff6a3d)', flame: ['rgba(255,90,40,.8)', 'rgba(255,200,50,.85)', 'rgba(120,220,255,.9)', 'rgba(255,255,255,.95)'], glow: '255,190,80' }
    ];
    const hsl = (h, l, a) => 'hsla(' + (((h % 360) + 360) % 360).toFixed(0) + ',95%,' + l + '%,' + (a == null ? 1 : a) + ')';
    const LIST = [
        { id: 'chispa', name: 'Chispa', tag: 'Compacto', rarity: 'common', desc: 'Ágil y nerviosa. Acelera y gira rápido, pero golpea poco.' },
        { id: 'bisonte', name: 'Bisonte', tag: 'Muscle', rarity: 'common', desc: 'Pesado y potente. Golpes fuertes y giro aéreo torpe.' },
        { id: 'mula', name: 'Mula', tag: 'Furgoneta', rarity: 'common', desc: 'Grande, alta y muy pesada. Golpea como nadie, pero es lenta y torpe en el aire.' },
        { id: 'cuna', name: 'Cuña', tag: 'Deportivo', rarity: 'rare', desc: 'Baja y fina, muy rápida en recta. Salta menos que el resto.' },
        { id: 'kaze', name: 'Kaze GT', tag: 'Tuner', rarity: 'epic', desc: 'Explosiva y equilibrada. Gira bien en el aire y gasta poco turbo.' },
        { id: 'titan', name: 'Titán', tag: 'Monster truck', rarity: 'epic', desc: 'Ruedas gigantes: salta muchísimo y aguanta los choques, pero gira despacio en el aire.' },
        { id: 'fenix', name: 'Fénix Solar', tag: 'Hiperdeportivo', rarity: 'legend', legend: true, desc: 'Lo mejor en casi todo. Turbo de 125 y golpes muy fuertes.' },
        { id: 'formula', name: 'Rayo F1', tag: 'Monoplaza', rarity: 'legend', legend: true, desc: 'El más rápido en recta y muy fino en el aire. Salta poco y golpea flojo.' },
        { id: 'prisma', name: 'Prisma Volt', tag: 'Patín eléctrico', rarity: 'chroma', secret: true, desc: 'Patín eléctrico de suspensión doble y ruedas grandes. Pequeño, rapidísimo y con el mejor turbo del juego.' }
    ];

    // ---------- Utilidades ----------
    function poly(g, pts, fill) {
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
        g.closePath();
        if (fill) { g.fillStyle = fill; g.fill(); }
    }
    function rrect(g, x, y, w, h, r) {
        g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    }
    function glowDot(g, x, y, r, rgb, a) {
        g.save(); g.globalCompositeOperation = 'lighter';
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore();
    }

    // con pintura personalizada, los coches de paleta fija usan los colores elegidos
    function ov(s, orig) {
        if (!CUR.over) return orig;
        const f = CUR.finish;
        if (f === 'metal') return [[0, s.lite], [.18, s.main], [.42, s.dark], [.58, s.lite], [.8, s.main], [1, s.dark]];
        if (f === 'chrome') return [[0, '#ffffff'], [.22, s.lite], [.4, s.dark], [.55, '#ffffff'], [.78, s.main], [1, s.dark]];
        return [[0, s.lite], [.28, s.main], [1, s.dark]];
    }
    // Carrocería con pintura brillante: degradado, reflejo de barniz, sombra inferior y destello que recorre la chapa
    function paintBody(g, build, stops, o, top) {
        const y0 = top || -20;       // altura del techo: los coches altos (furgoneta) reparten el degradado en toda la carrocería
        build();
        const gr = g.createLinearGradient(0, y0, 0, 11);
        for (const st of stops) gr.addColorStop(st[0], st[1]);
        g.fillStyle = gr; g.fill();
        g.save(); build(); g.clip();
        const fin = CUR.over ? CUR.finish : 'gloss', k = fin === 'matte' ? .22 : fin === 'chrome' ? 1.15 : 1;
        const sh = g.createLinearGradient(0, y0, 0, y0 + 23);
        sh.addColorStop(0, 'rgba(255,255,255,' + (.62 * k * (top ? .55 : 1)) + ')'); sh.addColorStop(.4, 'rgba(255,255,255,' + (.1 * k) + ')'); sh.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = sh; g.fillRect(-62, y0 - 4, 128, 28);
        if (CUR.over && CUR.pat === 'stripes') {
            g.fillStyle = 'rgba(255,255,255,.92)'; g.fillRect(-62, -8.5, 128, 2.6); g.fillRect(-62, -4.4, 128, 1.2);
            g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-62, -5.2, 128, .5);
        } else if (CUR.over && CUR.pat === 'stars') {
            for (let i = 0; i < 26; i++) {
                const x = ((i * 53.7) % 100) - 50, y = -18 + ((i * 29.3) % 27), tw = .35 + .65 * Math.abs(Math.sin(o.t * 2.2 + i * 1.7));
                g.fillStyle = 'rgba(255,255,255,' + (tw * .9) + ')'; g.fillRect(x, y, i % 4 === 0 ? 1.6 : .9, i % 4 === 0 ? 1.6 : .9);
            }
            const nb = g.createLinearGradient(-50, 0, 50, 0); nb.addColorStop(0, 'rgba(255,90,220,.0)'); nb.addColorStop(.5, 'rgba(120,200,255,.28)'); nb.addColorStop(1, 'rgba(255,90,220,0)');
            g.fillStyle = nb; g.fillRect(-62, -14, 128, 16);
        } else if (fin === 'metal') {
            g.fillStyle = 'rgba(255,255,255,.14)'; for (let i = -60; i < 60; i += 5) g.fillRect(i, -22, 1, 36);
        } else if (fin === 'chrome') {
            const cb = g.createLinearGradient(0, -20, 0, 11); cb.addColorStop(.28, 'rgba(255,255,255,.0)'); cb.addColorStop(.34, 'rgba(255,255,255,.75)'); cb.addColorStop(.45, 'rgba(20,30,70,.35)'); cb.addColorStop(.6, 'rgba(255,255,255,.4)'); cb.addColorStop(1, 'rgba(20,30,70,.25)');
            g.fillStyle = cb; g.fillRect(-62, -24, 128, 40);
        }
        if (CUR.over) paintFx(g, fin, o);
        const lo = g.createLinearGradient(0, -1, 0, 11);
        lo.addColorStop(0, 'rgba(0,0,0,0)'); lo.addColorStop(1, 'rgba(0,0,0,.5)');
        g.fillStyle = lo; g.fillRect(-62, -1, 128, 13);
        const sx = ((o.t * 38) % 200) - 75;
        const sg = g.createLinearGradient(sx - 9, 0, sx + 9, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.3)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = sg; g.fillRect(sx - 9, -24, 18, 38);
        // filos de la chapa: luz del cielo en los bordes de arriba y reflejo del suelo (color del equipo) en los de abajo
        g.lineJoin = 'round';
        g.save(); g.translate(0, 1); build(); g.restore(); g.strokeStyle = 'rgba(255,255,255,' + (fin === 'matte' ? .14 : .32) + ')'; g.lineWidth = 1.1; g.stroke();
        if (CUR.glowRGB || CUR.rgb) { g.save(); g.translate(0, -1.1); build(); g.restore(); g.strokeStyle = 'rgba(' + (CUR.glowRGB || CUR.rgb) + ',.38)'; g.lineWidth = 1.2; g.stroke(); }
        g.restore();
        build(); g.lineWidth = 1.1; g.lineJoin = 'round'; g.strokeStyle = 'rgba(5,8,22,.72)'; g.stroke();
    }


    // acabados especiales de pintura (se dibujan dentro de la carrocería, ya recortada)
    function paintFx(g, fin, o) {
        const t = CUR.t || 0, pat = CUR.pat;
        const tw = (i, sp) => .25 + .75 * Math.max(0, Math.sin(t * (sp || 3) + i * 2.1));
        const spark = (x, y, r, a) => { g.fillStyle = 'rgba(255,255,255,' + a + ')'; g.fillRect(x - r, y - .25, r * 2, .5); g.fillRect(x - .25, y - r, .5, r * 2); g.fillRect(x - .5, y - .5, 1, 1); };
        if (fin === 'metal' || fin === 'chrome') {
            for (let i = 0; i < 18; i++) { const x = -44 + ((i * 37.3) % 92), y = -14 + ((i * 17.9) % 22); spark(x, y, .9 + (i % 3) * .5, .75 * tw(i, 2.4)); }
        }
        if (fin === 'pearl') {
            const gx = -50 + ((t * 14) % 110), pg = g.createLinearGradient(gx - 40, -10, gx + 40, 8);
            pg.addColorStop(0, 'rgba(255,170,230,0)'); pg.addColorStop(.3, 'rgba(255,170,230,.32)'); pg.addColorStop(.5, 'rgba(150,230,255,.36)'); pg.addColorStop(.7, 'rgba(190,255,200,.3)'); pg.addColorStop(1, 'rgba(255,240,160,0)');
            g.fillStyle = pg; g.fillRect(-62, -24, 128, 36);
            for (let i = 0; i < 7; i++) spark(-40 + ((i * 29) % 84), -12 + ((i * 11) % 16), 1, .6 * tw(i, 2));
        }
        if (pat === 'stars') {
            const nb = [[-20, -6, 22, '255,80,200', .26], [20, -2, 26, '80,160,255', .3], [0, -12, 18, '170,110,255', .24]];
            for (const n of nb) { const gr = g.createRadialGradient(n[0], n[1], 0, n[0], n[1], n[2]); gr.addColorStop(0, 'rgba(' + n[3] + ',' + n[4] + ')'); gr.addColorStop(1, 'rgba(' + n[3] + ',0)'); g.fillStyle = gr; g.fillRect(-62, -24, 128, 36); }
            for (let i = 0; i < 12; i++) spark(-46 + ((i * 41.7) % 96), -18 + ((i * 23.3) % 26), 1.1 + (i % 3) * .5, .9 * tw(i, 2.6));
            const sp = (t * .35) % 1; if (sp < .35) { const k = sp / .35, x = 40 - k * 80, y = -16 + k * 14; g.strokeStyle = 'rgba(255,255,255,' + (.9 * (1 - k)) + ')'; g.lineWidth = .8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 9, y - 3.4); g.stroke(); }
        } else if (pat === 'stripes') {
            g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(-62, -8.9, 128, .5); g.fillRect(-62, -5.9, 128, .5); g.fillRect(-62, -4.8, 128, .4); g.fillRect(-62, -3.3, 128, .4);
            g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(-62, -8.5, 128, .5);
        } else if (pat === 'flame') {
            for (let pass = 0; pass < 3; pass++) {
                const col = ['rgba(255,70,10,.92)', 'rgba(255,160,30,.92)', 'rgba(255,238,140,.95)'][pass], sc = [1, .72, .44][pass];
                g.fillStyle = col; g.beginPath(); g.moveTo(-62, 12);
                for (let k = 0; k < 9; k++) {
                    const x = -62 + k * 15, w = Math.sin(t * 6 + k * 1.7 + pass) * 1.4;
                    g.quadraticCurveTo(x + 4, 4 - 8 * sc + w, x + 10 + w, -8 * sc - k % 3 * 2 + w);
                    g.quadraticCurveTo(x + 9, 3 - 2 * sc, x + 15, 12);
                }
                g.closePath(); g.fill();
            }
            glowDot(g, 0, 6, 40, '255,150,40', .25);
        } else if (pat === 'ice') {
            const fg = g.createLinearGradient(0, -20, 0, 11); fg.addColorStop(0, 'rgba(255,255,255,.55)'); fg.addColorStop(.35, 'rgba(255,255,255,0)'); fg.addColorStop(.75, 'rgba(255,255,255,0)'); fg.addColorStop(1, 'rgba(235,252,255,.75)');
            g.fillStyle = fg; g.fillRect(-62, -24, 128, 36);
            g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = .5;
            for (let i = 0; i < 7; i++) { const x = -44 + i * 14, y = 2 + (i % 2) * 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 5, y - 5); g.lineTo(x + 8, y - 3); g.moveTo(x + 5, y - 5); g.lineTo(x + 6, y - 9); g.stroke(); }
            g.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 6; i++) { const x = -40 + i * 17, y = 8 + (i % 2) * 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y + 4 + i % 3); g.lineTo(x + 4, y); g.closePath(); g.fill(); }
            for (let i = 0; i < 10; i++) spark(-44 + ((i * 43.1) % 92), -16 + ((i * 19.7) % 24), 1 + (i % 2) * .6, .85 * tw(i, 2.2));
        } else if (pat === 'neon') {
            const lines = [[-8, '61,255,240'], [-1.5, '255,61,240'], [5, '61,255,240']];
            lines.forEach((ln, i) => {
                const a = .6 + .4 * Math.sin(t * 3 + i);
                g.strokeStyle = 'rgba(' + ln[1] + ',' + (.22 * a) + ')'; g.lineWidth = 3.6; g.beginPath(); g.moveTo(-62, ln[0] + 1.2); g.lineTo(-20, ln[0] + 1.2); g.lineTo(-8, ln[0] - 2.4); g.lineTo(66, ln[0] - 2.4); g.stroke();
                g.strokeStyle = 'rgba(' + ln[1] + ',' + a + ')'; g.lineWidth = .8; g.stroke();
            });
            const px = -50 + ((t * 40) % 120); glowDot(g, px, -9.6, 7, '255,255,255', .7);
        } else if (pat === 'camo') {
            const cols = ['rgba(25,32,16,.8)', 'rgba(163,173,126,.75)', 'rgba(70,58,36,.75)'];
            for (let i = 0; i < 26; i++) { g.fillStyle = cols[i % 3]; g.beginPath(); g.ellipse(-52 + ((i * 53.3) % 108), -16 + ((i * 29.7) % 28), 5 + (i % 4) * 2, 2.6 + (i % 3) * 1.6, (i % 5) * .5, 0, TAU); g.fill(); }
        } else if (pat === 'holo') {
            const hh = t * 90, ho = g.createLinearGradient(-50 + ((t * 10) % 40), -20, 30 + ((t * 10) % 40), 12);
            for (let i = 0; i <= 5; i++) ho.addColorStop(i / 5, 'hsla(' + ((hh + i * 60) % 360) + ',95%,72%,' + (i % 2 ? .5 : .38) + ')');
            g.fillStyle = ho; g.fillRect(-62, -24, 128, 36);
            g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = .5; for (let i = -60; i < 60; i += 7) { g.beginPath(); g.moveTo(i, 12); g.lineTo(i + 10, -22); g.stroke(); }
            for (let i = 0; i < 8; i++) spark(-44 + ((i * 47.9) % 90), -14 + ((i * 21.3) % 22), 1.2, .8 * tw(i, 2.8));
        }
    }

    function glass(g, pts, o) {
        CUR.gl = pts;      // el piloto se recorta a esta ventanilla
        const gl = g.createLinearGradient(0, -17, 0, -4);
        gl.addColorStop(0, '#d9f3ff'); gl.addColorStop(.55, '#5f8fc4'); gl.addColorStop(1, '#1b2f58');
        poly(g, pts, gl);
        g.save(); poly(g, pts); g.clip();
        g.fillStyle = 'rgba(255,255,255,.4)';
        g.beginPath(); g.moveTo(pts[0][0] + 3, pts[0][1]); g.lineTo(pts[0][0] + 11, pts[0][1] - 14); g.lineTo(pts[0][0] + 15, pts[0][1] - 14); g.lineTo(pts[0][0] + 7, pts[0][1]); g.closePath(); g.fill();
        g.restore();
    }
    // visera con efecto espejo iridiscente (cambia de tono con el tiempo y el movimiento)
    function iriVisor(g, x0, y0, x1, y1, t) {
        const h = (t * 35) % 360, v = g.createLinearGradient(x0, y0, x1, y1);
        v.addColorStop(0, 'hsla(' + ((h + 200) % 360) + ',75%,32%,1)'); v.addColorStop(.45, 'hsla(' + ((h + 270) % 360) + ',70%,24%,1)'); v.addColorStop(.8, 'hsla(' + ((h + 30) % 360) + ',85%,42%,1)'); v.addColorStop(1, 'hsla(' + ((h + 60) % 360) + ',90%,55%,1)');
        return v;
    }
    // piloto de los coches cerrados: asiento, mono con franja, brazo al volante con luces de cambio y casco con visera espejo; reacciona al juego
    function driver(g, x, y, s, o) {
        o = o || {};
        const t = o.t || 0, lose = o.mood === 'lose', win = o.mood === 'win', boost = o.boosting ? 1 : 0, look = Math.max(-.6, Math.min(.6, o.look || 0));
        // la cabeza reacciona con algo de inercia: atrás con el turbo, adelante al frenar, se hunde al aterrizar y da un respingo con los golpes
        const hit = o.hitT != null && o.hitT < .3 ? Math.pow(1 - o.hitT / .3, 2) : 0, vu = Math.max(-1, Math.min(1, (o.vu || 0) / 900)), ready = o.state === 'count';
        let tx = -boost * 1.2 + (o.brake ? .9 : 0) - hit * .9 - (o.lean || 0) * .7, ty = (lose ? 1 : 0) + Math.max(0, ((o.susF || 0) + (o.susR || 0)) / 2) * 1.4 + hit * .6 + (o.air ? -vu * .5 : 0);
        const M = o.rid;
        if (M) { const dt = Math.max(0, Math.min(.05, t - (M.drT == null ? t : M.drT))), k = Math.min(1, dt * 12); M.drT = t;
            M.drX = M.drX == null ? tx : M.drX + (tx - M.drX) * k; M.drY = M.drY == null ? ty : M.drY + (ty - M.drY) * k; tx = M.drX; ty = M.drY; }
        const bob = win ? -Math.abs(Math.sin(t * 9)) * .8 : ready ? -Math.abs(Math.sin(t * 6)) * .35 : 0, hx = x + tx, hy = y + ty + bob;
        g.save(); if (CUR.gl) { poly(g, CUR.gl); g.clip(); }
        g.fillStyle = '#0b0e1c'; rrect(g, x - 6.4, y - 3, 2.6, 8, 1.1); g.fill();                         // reposacabezas
        g.fillStyle = s.dark; rrect(g, hx - 4.6, hy + 2.2, 8.6, 7, 2.4); g.fill();                        // mono
        g.fillStyle = 'rgba(' + s.glow + ',.9)'; g.fillRect(hx - 4.2, hy + 3, 7.8, .6);
        g.fillStyle = '#e8ecf6'; rrect(g, hx - 1.4, hy + 2, 2.4, 1.2, .5); g.fill();                     // cuello
        const swx = hx + 6.8, swy = hy + 2.8;
        if (!win) { g.strokeStyle = s.dark; g.lineWidth = 1.8; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(hx + 1.2, hy + 3.8); g.lineTo(hx + 4, hy + 5.6); g.lineTo(swx - .6, swy + .6); g.stroke(); }
        g.save(); g.translate(swx, swy); g.rotate(.25 + (o.lean || 0) * .3 + (o.air ? Math.sin(t * 6) * .1 : 0) + (ready ? Math.sin(t * 9) * .12 : 0) + hit * .3);      // el volante gira con los cambios de velocidad
        g.fillStyle = '#10142a'; g.beginPath(); g.ellipse(0, 0, 1, 3, 0, 0, TAU); g.fill();
        const rv = Math.min(1, (o.spin || 0) / 900), LC = ['#3dff6a', '#ffd23f', '#ff3b30'];
        for (let i = 0; i < 3; i++) { g.fillStyle = rv > i / 3 + .05 ? LC[i] : 'rgba(80,90,120,.6)'; g.fillRect(-.35, -2.3 + i * 1.25, .7, .7); }
        g.restore();
        if (!win) { g.fillStyle = '#1a1d30'; g.beginPath(); g.arc(swx - .5, swy + .6, 1, 0, TAU); g.fill(); }
        else {      // puño en alto al marcar
            const up = Math.abs(Math.sin(t * 9));
            g.strokeStyle = s.dark; g.lineWidth = 1.7; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx + .6, hy + 3); g.lineTo(hx + 4.4, hy + 1.2); g.lineTo(hx + 6.2, hy - 1.2 - up * .7); g.stroke();
            g.fillStyle = '#ffffff'; g.beginPath(); g.arc(hx + 6.4, hy - 2 - up * .7, 1.2, 0, TAU); g.fill(); g.strokeStyle = 'rgba(10,12,24,.6)'; g.lineWidth = .3; g.stroke();
        }
        // casco
        // mira al balón; al subir mira arriba y al caer, abajo; al encajar niega con la cabeza; en la cuenta atrás se mueve al ritmo
        g.save(); g.translate(hx, hy); g.rotate(look * .35 + (lose ? .38 + Math.sin(t * 6) * .16 : 0) - boost * .1 - hit * .3 - (o.air ? vu * .18 : 0) + (ready ? Math.sin(t * 6) * .06 : 0));
        const R = 3.5, hg = g.createRadialGradient(-1.2, -1.8, .3, 0, 0, R * 1.15);
        hg.addColorStop(0, '#ffffff'); hg.addColorStop(.3, s.lite); hg.addColorStop(1, s.main);
        const shell = () => { g.beginPath(); g.moveTo(-R + .2, R * .66); g.quadraticCurveTo(-R - .5, 0, -R * .5, -R * .88); g.quadraticCurveTo(.4, -R - .8, R * .72, -R * .55); g.quadraticCurveTo(R + .7, .2, R + .2, R * .52); g.lineTo(R - .9, R * .74); g.closePath(); };
        shell(); g.fillStyle = hg; g.fill(); g.strokeStyle = 'rgba(5,8,22,.75)'; g.lineWidth = .4; g.stroke();
        g.save(); shell(); g.clip();
        g.fillStyle = 'rgb(' + s.glow + ')'; g.beginPath(); g.moveTo(-R - 1, .6); g.quadraticCurveTo(0, -1.4, R + 1, -2.6); g.lineTo(R + 1, -1.7); g.quadraticCurveTo(0, -.4, -R - 1, 1.6); g.closePath(); g.fill();
        g.fillStyle = s.dark; g.fillRect(-R - 1, R * .5, R * 2 + 2, 1.2);
        g.restore();
        g.fillStyle = iriVisor(g, .2, -1.8, R + 1, .4, t + look);
        g.beginPath(); g.moveTo(.1, -1.9); g.quadraticCurveTo(2.4, -2.6, R + .8, -1.1); g.lineTo(R + .9, .4); g.quadraticCurveTo(2.2, .2, .1, .3); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(10,12,24,.85)'; g.lineWidth = .35; g.stroke();
        const rf = (t * .7) % 1; g.strokeStyle = 'rgba(220,240,255,.55)'; g.lineWidth = .35; g.beginPath(); g.moveTo(.6 + rf * 3, -1.9); g.lineTo(1.2 + rf * 3, .2); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = .45; g.beginPath(); g.arc(-.4, -.4, R * .78, Math.PI * 1.12, Math.PI * 1.45); g.stroke();      // brillo de laca
        g.fillStyle = '#0d1126'; g.fillRect(-.6, -R - .2, 1.4, .4);                                       // ventilación
        g.restore();
        g.restore();
        if (CUR.gl) { g.save(); poly(g, CUR.gl); g.clip(); g.fillStyle = 'rgba(160,210,255,.1)'; g.fillRect(x - 12, y - 12, 26, 24);
            g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.moveTo(x - 3, y + 6); g.lineTo(x + 1, y - 8); g.lineTo(x + 2.6, y - 8); g.lineTo(x - 1.4, y + 6); g.closePath(); g.fill(); g.restore(); }
    }
    function headlight(g, x, y, big) {
        g.save(); g.globalCompositeOperation = 'lighter';
        const b = g.createLinearGradient(x, 0, x + (big || 72), 0);
        b.addColorStop(0, 'rgba(255,244,200,.34)'); b.addColorStop(1, 'rgba(255,244,200,0)');
        poly(g, [[x, y - 2], [x + (big || 72), y - 13], [x + (big || 72), y + 14], [x, y + 3]]); g.fillStyle = b; g.fill();
        g.restore();
        glowDot(g, x, y + .5, 9, '255,248,210', .55);
    }
    function taillight(g, x, y, w, h, o) {
        g.fillStyle = '#12060a'; rrect(g, x - .6, y - .6, w + 1.2, h + 1.2, .9); g.fill();
        const tg = g.createLinearGradient(0, y, 0, y + h); tg.addColorStop(0, o.brake ? '#ff8a78' : '#e0352c'); tg.addColorStop(1, o.brake ? '#ff3a28' : '#8e1511');
        g.fillStyle = tg; g.fillRect(x, y, w, h);
        g.fillStyle = o.brake ? 'rgba(255,235,215,.9)' : 'rgba(255,150,130,.7)'; g.fillRect(x, y + h * .16, w, Math.max(.6, h * .12));
        g.fillStyle = 'rgba(0,0,0,.3)'; for (let i = 1; i < 3; i++) g.fillRect(x, y + h * i / 3 - .2, w, .4);
        glowDot(g, x, y + h / 2, o.brake ? 17 : 9, '255,50,40', o.brake ? .9 : .4);
    }
    // ---------- Detalles compartidos ----------
    function chromeStroke(g, pts, w, col) {
        g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
        g.strokeStyle = 'rgba(10,14,34,.8)'; g.lineWidth = w + 1; g.stroke();
        g.strokeStyle = col || 'rgba(214,226,255,.9)'; g.lineWidth = w; g.stroke();
        g.restore();
    }
    function mirror(g, x, y) {
        g.fillStyle = '#0d1126'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3.4, y - .7); g.quadraticCurveTo(x + 5.6, y + 1, x + 3.4, y + 2.8); g.lineTo(x - .4, y + 2.2); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x + .6, y - .1, 2.6, .7);
        g.fillStyle = '#8089b4'; g.fillRect(x + 3.7, y + .4, .8, 1.6);
    }
    function handle(g, x, y, w) {
        g.fillStyle = 'rgba(8,12,35,.8)'; rrect(g, x, y, w, 1.6, .8); g.fill();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x + .5, y, w - 1, .45);
    }
    function flare(g, x, y, r) {
        g.save(); g.lineCap = 'round';
        g.lineWidth = 1.1; g.strokeStyle = 'rgba(255,255,255,.34)'; g.beginPath(); g.arc(x, y, r + 4.3, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
        g.lineWidth = 1; g.strokeStyle = 'rgba(0,0,0,.38)'; g.beginPath(); g.arc(x, y, r + 5.5, Math.PI * 1.07, Math.PI * 1.93); g.stroke(); g.restore();
    }
    function skirt(g, x0, x1, y) { g.fillStyle = 'rgba(6,9,24,.66)'; g.fillRect(x0, y, x1 - x0, 1.7); g.fillStyle = 'rgba(255,255,255,.24)'; g.fillRect(x0, y, x1 - x0, .45); }
    function vents(g, x, y, w, h, n) {
        g.fillStyle = '#05070f'; rrect(g, x, y, w, h, 1); g.fill();
        g.strokeStyle = 'rgba(170,185,240,.55)'; g.lineWidth = .6;
        for (let i = 1; i < n; i++) { const yy = y + h * i / n; g.beginPath(); g.moveTo(x + .8, yy); g.lineTo(x + w - .8, yy); g.stroke(); }
    }
    function lamp(g, x, y, w, h) {
        g.fillStyle = '#0b0e1c'; rrect(g, x - .8, y - .8, w + 1.6, h + 1.6, h * .5); g.fill();
        const lg = g.createLinearGradient(x, y, x, y + h); lg.addColorStop(0, '#ffffff'); lg.addColorStop(.6, '#fff3bf'); lg.addColorStop(1, '#e0b860');
        g.fillStyle = lg; rrect(g, x, y, w, h, h * .45); g.fill();
        g.fillStyle = 'rgba(70,90,150,.55)'; g.beginPath(); g.arc(x + w * .6, y + h * .5, Math.min(w, h) * .32, 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(x + w * .6 + .5, y + h * .5 - .4, Math.min(w, h) * .12, 0, TAU); g.fill();
    }
    function carbon(g, pts) {
        g.save(); poly(g, pts, '#0b0e1c'); g.clip();
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
        g.strokeStyle = 'rgba(120,135,190,.35)'; g.lineWidth = .5;
        for (let x = x0 - (y1 - y0); x < x1; x += 1.8) { g.beginPath(); g.moveTo(x, y1); g.lineTo(x + (y1 - y0), y0); g.stroke(); }
        g.restore();
    }
    function underglow(g, s, a, w) {
        const gr = g.createRadialGradient(0, 14, 2, 0, 14, w);
        gr.addColorStop(0, 'rgba(' + s.glow + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + s.glow + ',0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(0, 14, w, 9, 0, 0, TAU); g.fill();
    }
    function flame(g, x, y, len, wid, boost, t, hot) {
        if (!boost) {      // sin turbo: bocanadas de humo del escape (más al acelerar); el patín eléctrico no echa humo
            const k = CUR.puff || 0; if (k <= .02 || CUR.model === 'prisma') return;
            for (let i = 0; i < 4; i++) {
                const p = (t * 1.7 + i / 4) % 1, r = 1.2 + p * 4.5;
                g.fillStyle = 'rgba(175,185,215,' + (k * .3 * (1 - p) * Math.min(1, p * 6)).toFixed(3) + ')';
                g.beginPath(); g.arc(x - 2 - p * 18, y - p * 5 + Math.sin(t * 5 + i) * .8, r, 0, TAU); g.fill();
            }
            return;
        }
        g.save(); g.globalCompositeOperation = 'lighter';
        const f = len * (0.8 + 0.3 * Math.sin(t * 40 + x));
        const layers = CUR.flame ? CUR.flame.map((c, i) => [c, [1, .72, .44, .2][i]]) : hot ? [['rgba(255,70,18,.85)', 1], ['rgba(255,160,40,.85)', .72], ['rgba(255,230,130,.9)', .44], ['rgba(255,255,255,.9)', .2]]
                           : [['rgba(80,170,255,.8)', 1], ['rgba(150,215,255,.85)', .62], ['rgba(255,255,255,.9)', .3]];
        for (const l of layers) {
            const k = l[1];
            g.fillStyle = l[0]; g.beginPath();
            g.moveTo(x, y - wid * k); g.quadraticCurveTo(x - f * k * .6, y - wid * k * .5, x - f * k, y);
            g.quadraticCurveTo(x - f * k * .6, y + wid * k * .5, x, y + wid * k); g.closePath(); g.fill();
        }
        // diamantes de choque: nudos brillantes que laten dentro del chorro
        for (let i = 1; i <= 3; i++) {
            const dx = x - f * (.16 + i * .17) + Math.sin(t * 50 + i) * .6, a = (.55 - i * .12) * (.7 + .3 * Math.sin(t * 60 + i * 2));
            g.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; g.beginPath(); g.ellipse(dx, y, wid * .34 / i + .6, wid * .3 / i + .4, 0, 0, TAU); g.fill();
        }
        // chispas que salen del escape
        for (let i = 0; i < 4; i++) {
            const p = (t * 3.1 + i * .27) % 1, sx = x - p * f * 1.25, sy = y + Math.sin(i * 7.3 + Math.floor(t * 3.1 + i * .27) * 3) * wid * 1.1 * p;
            g.fillStyle = CUR.flame ? CUR.flame[2] : hot ? 'rgba(255,220,120,.9)' : 'rgba(190,230,255,.9)'; g.globalAlpha = 1 - p; g.fillRect(sx, sy, 1.1, 1.1);
        }
        g.globalAlpha = 1;
        g.restore();
        glowDot(g, x - len * .35, y, len * .8, CUR.glowRGB || (hot ? '255,140,40' : '110,190,255'), .55);
    }

    // Rueda con neumático, disco de freno, pinza y llanta de radios; se desenfoca a mucha velocidad

    // suspensión: el arco va con la carrocería, la rueda sigue al suelo y se ve el muelle con su amortiguador
    function susPart(g, x, r) {
        const sd = CUR.sd; if (!sd) return 0;
        const off = -(sd.k * x + sd.d);
        return off;   // el muelle y el amortiguador no se dibujan: solo se mueve la carrocería
        const top = -r - 3.2, bot = -r * .3 + off;
        g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
        g.strokeStyle = '#3a4066'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(r * .34, top); g.lineTo(r * .34, bot); g.stroke();
        g.strokeStyle = '#cfd6f2'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(r * .34, top); g.lineTo(r * .34, (top + bot) / 2); g.stroke();
        const n = 6, h = (bot - top - 1) / n; g.strokeStyle = sd.col; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-r * .3, top);
        for (let i = 0; i < n; i++) { g.lineTo(-r * .3 + (i % 2 ? -1.7 : 1.7), top + h * (i + .5)); g.lineTo(-r * .3, top + h * (i + 1)); }
        g.stroke(); g.restore();
        return off;
    }
    const WSPEC = { chispa: { n: 6, w: .19, rim: '#dfe4fb', cal: '#e24b3a' }, bisonte: { n: 5, w: .3, rim: '#f1f3ff', cal: '#e8b020' }, cuna: { n: 10, w: .1, rim: '#e4ecff', cal: '#2f9bff' }, kaze: { n: 5, w: .15, rim: '#cfd6f2', cal: '#ff3b30', mesh: true }, fenix: { n: 5, w: .26, rim: '#f4c95a', cal: '#e8430f' }, mula: { n: 6, w: .22, rim: '#e8ecf6', cal: '#3a4060' }, titan: { n: 6, w: .28, rim: '#dfe4fb', cal: '#ff3b30' }, formula: { n: 5, w: .24, rim: '#2a2e44', cal: '#ffd23f' } };
    function wheel(g, x, y, r, o, gold) {
        if (CUR.wheel !== 'auto') return wheelStyled(g, x, y, r, o);
        g.save(); g.translate(x, y);
        if (!CUR.noArch) { g.fillStyle = 'rgba(2,4,14,.96)'; g.beginPath(); g.arc(0, 0, r + 3.4, Math.PI, 0); g.fill(); }
        g.translate(0, susPart(g, x, r));
        const W = WSPEC[CUR.model] || WSPEC.chispa;
        {   // neumático con volumen: goma más clara en el flanco y luz arriba
            const tg = g.createRadialGradient(-r * .25, -r * .3, r * .5, 0, 0, r); tg.addColorStop(0, '#22263a'); tg.addColorStop(.75, '#11131f'); tg.addColorStop(1, '#05060c');
            g.fillStyle = tg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
        }
        g.save(); g.rotate(o.wheel);                                        // dibujo del neumático: tacos en el borde (los slicks del F1 no tienen)
        g.strokeStyle = 'rgba(70,78,120,.8)'; g.lineWidth = .9;
        if (!CUR.noArch) for (let i = 0; i < 24; i++) { const a = i * TAU / 24; g.beginPath(); g.moveTo(Math.cos(a) * (r - 1.8), Math.sin(a) * (r - 1.8)); g.lineTo(Math.cos(a) * (r - .3), Math.sin(a) * (r - .3)); g.stroke(); }
        g.restore();
        g.strokeStyle = 'rgba(160,170,220,.4)'; g.lineWidth = .7; g.beginPath(); g.arc(0, 0, r - 2.3, 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, r - .9, Math.PI * 1.15, Math.PI * 1.7); g.stroke();
        const dg = g.createRadialGradient(0, 0, r * .2, 0, 0, r * .66); dg.addColorStop(0, '#2c3150'); dg.addColorStop(.8, '#6a7196'); dg.addColorStop(1, '#3a4066');
        g.fillStyle = dg; g.beginPath(); g.arc(0, 0, r * .64, 0, TAU); g.fill();       // disco de freno
        g.strokeStyle = 'rgba(10,12,28,.5)'; g.lineWidth = .5; g.beginPath(); g.arc(0, 0, r * .5, 0, TAU); g.stroke();
        if (o.brake && (o.spin || 0) > 120) {      // al frenar fuerte el disco se pone al rojo
            const hk = Math.min(1, ((o.spin || 0) - 120) / 600), hg = g.createRadialGradient(0, 0, r * .3, 0, 0, r * .66);
            hg.addColorStop(0, 'rgba(255,90,20,0)'); hg.addColorStop(.7, 'rgba(255,110,30,' + (.75 * hk) + ')'); hg.addColorStop(1, 'rgba(255,200,90,' + (.55 * hk) + ')');
            g.fillStyle = hg; g.beginPath(); g.arc(0, 0, r * .66, 0, TAU); g.fill();
        }
        g.save(); g.rotate(o.wheel); g.fillStyle = 'rgba(10,12,28,.55)';      // disco perforado
        for (let i = 0; i < 10; i++) { const a = i * TAU / 10; g.beginPath(); g.arc(Math.cos(a) * r * .55, Math.sin(a) * r * .55, r * .035, 0, TAU); g.fill(); }
        g.restore();
        g.fillStyle = gold ? '#ffb020' : W.cal; rrect(g, r * .12, -r * .62, r * .42, r * .34, 1); g.fill();   // pinza de freno
        g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(r * .16, -r * .6, r * .34, .45);
        g.rotate(o.wheel);
        g.strokeStyle = gold ? '#f4c95a' : W.rim; g.lineCap = 'round'; g.lineWidth = r * W.w;
        if (W.mesh) { g.lineWidth = r * .07; for (let i = 0; i < 12; i++) { const a = i * TAU / 12; g.beginPath(); g.moveTo(Math.cos(a) * r * .16, Math.sin(a) * r * .16); g.lineTo(Math.cos(a + .35) * r * .6, Math.sin(a + .35) * r * .6); g.stroke(); } g.lineWidth = r * .12; }
        const rimC = g.strokeStyle, sw = g.lineWidth;
        // radios con relieve: sombra detrás, color y filo de luz
        g.strokeStyle = 'rgba(8,10,26,.55)'; g.lineWidth = sw * 1.15;
        for (let i = 0; i < W.n; i++) { const a = i * TAU / W.n + .09; g.beginPath(); g.moveTo(Math.cos(a) * r * .14, Math.sin(a) * r * .14); g.lineTo(Math.cos(a) * r * .56, Math.sin(a) * r * .56); g.stroke(); }
        g.strokeStyle = rimC; g.lineWidth = sw;
        for (let i = 0; i < W.n; i++) { const a = i * TAU / W.n; g.beginPath(); g.moveTo(Math.cos(a) * r * .14, Math.sin(a) * r * .14); g.lineTo(Math.cos(a) * r * .56, Math.sin(a) * r * .56); g.stroke(); }
        g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = Math.max(.35, sw * .22);
        for (let i = 0; i < W.n; i++) { const a = i * TAU / W.n - sw / r * .32; g.beginPath(); g.moveTo(Math.cos(a) * r * .2, Math.sin(a) * r * .2); g.lineTo(Math.cos(a) * r * .54, Math.sin(a) * r * .54); g.stroke(); }
        {   // aro de la llanta metálico (la luz no gira con la rueda)
            g.rotate(-o.wheel);
            const lg = g.createLinearGradient(-r * .6, -r * .6, r * .6, r * .6);
            lg.addColorStop(0, gold ? '#fff6c8' : '#ffffff'); lg.addColorStop(.5, gold ? '#e0a020' : '#b9c1dc'); lg.addColorStop(1, gold ? '#8a5a00' : '#5c6486');
            g.strokeStyle = lg; g.lineWidth = r * .11; g.beginPath(); g.arc(0, 0, r * .62, 0, TAU); g.stroke();
            g.strokeStyle = 'rgba(5,7,20,.6)'; g.lineWidth = .35; g.beginPath(); g.arc(0, 0, r * .565, 0, TAU); g.stroke();
            g.rotate(o.wheel);
        }
        g.fillStyle = gold ? '#7a4d00' : '#2a3160'; g.beginPath(); g.arc(0, 0, r * .19, 0, TAU); g.fill();
        g.fillStyle = gold ? '#ffe9a0' : '#cfd6f0';      // tuercas
        for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + .3; g.beginPath(); g.arc(Math.cos(a) * r * .12, Math.sin(a) * r * .12, r * .028, 0, TAU); g.fill(); }
        g.fillStyle = gold ? '#fff2b0' : '#ffffff'; g.beginPath(); g.arc(0, 0, r * .06, 0, TAU); g.fill();
        if (o.spin > 380) { g.rotate(-o.wheel); g.strokeStyle = 'rgba(210,220,255,' + Math.min(.38, (o.spin - 380) / 1500) + ')'; g.lineWidth = r * .5; g.beginPath(); g.arc(0, 0, r * .5, 0, TAU); g.stroke(); }
        g.restore();
    }

    function wheelStyled(g, x, y, r, o) {
        const st = CUR.wheel, t = CUR.t, TAU2 = Math.PI * 2;
        g.save(); g.translate(x, y);
        if (!CUR.noArch) { g.fillStyle = 'rgba(2,4,14,.96)'; g.beginPath(); g.arc(0, 0, r + 3.4, Math.PI, 0); g.fill(); }
        g.translate(0, susPart(g, x, r));
        g.fillStyle = '#080a18'; g.beginPath(); g.arc(0, 0, r, 0, TAU2); g.fill();
        if (st === 'retro') { g.fillStyle = '#f4f4f0'; g.beginPath(); g.arc(0, 0, r - 1, 0, TAU2); g.arc(0, 0, r * .72, 0, TAU2, true); g.fill(); }
        g.strokeStyle = 'rgba(160,170,220,.3)'; g.lineWidth = .8; g.beginPath(); g.arc(0, 0, r - 1.2, 0, TAU2); g.stroke();
        const rim = { cromo: '#dfe6f7', oro: '#f4b81e', rojo: '#d02424', retro: '#b9bdd0', turbina: '#5a6aa0', neon: '#0b1030', arcoiris: '#101428' }[st] || '#4b5178';
        g.fillStyle = rim; g.beginPath(); g.arc(0, 0, r * .66, 0, TAU2); g.fill();
        g.rotate(o.wheel);
        if (st === 'turbina') {
            g.fillStyle = '#c9d6ff';
            for (let i = 0; i < 8; i++) { g.save(); g.rotate(i * TAU2 / 8); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(r * .42, -r * .08, r * .62, r * .22); g.quadraticCurveTo(r * .34, r * .14, 0, r * .1); g.fill(); g.restore(); }
            g.fillStyle = '#e8f0ff'; g.beginPath(); g.arc(0, 0, r * .14, 0, TAU2); g.fill();
        } else if (st === 'neon') {
            g.strokeStyle = 'rgb(' + (CUR.glow || '61,255,224') + ')'; g.lineWidth = r * .16; g.beginPath(); g.arc(0, 0, r * .56, 0, TAU2); g.stroke();
            g.lineWidth = r * .1; for (let i = 0; i < 5; i++) { const a = i * TAU2 / 5; g.beginPath(); g.moveTo(Math.cos(a) * r * .1, Math.sin(a) * r * .1); g.lineTo(Math.cos(a) * r * .5, Math.sin(a) * r * .5); g.stroke(); }
            g.rotate(-o.wheel); glowDot(g, 0, 0, r * 1.25, CUR.glow || '61,255,224', .5);
        } else if (st === 'arcoiris') {
            g.lineCap = 'round'; g.lineWidth = r * .17;
            for (let i = 0; i < 6; i++) { const a = i * TAU2 / 6; g.strokeStyle = hsl(t * 90 + i * 60, 60); g.beginPath(); g.moveTo(Math.cos(a) * r * .12, Math.sin(a) * r * .12); g.lineTo(Math.cos(a) * r * .58, Math.sin(a) * r * .58); g.stroke(); }
            g.strokeStyle = hsl(t * 90, 65); g.lineWidth = r * .1; g.beginPath(); g.arc(0, 0, r * .62, 0, TAU2); g.stroke();
        } else if (st === 'retro') {
            g.fillStyle = '#8f94ac'; g.beginPath(); g.arc(0, 0, r * .4, 0, TAU2); g.fill();
            g.fillStyle = '#4a4f68'; for (let i = 0; i < 4; i++) { const a = i * TAU2 / 4 + .4; g.beginPath(); g.arc(Math.cos(a) * r * .24, Math.sin(a) * r * .24, r * .06, 0, TAU2); g.fill(); }
            g.fillStyle = '#eef0fa'; g.beginPath(); g.arc(0, 0, r * .12, 0, TAU2); g.fill();
        } else {
            const sp = st === 'cromo' ? '#8c97b8' : st === 'oro' ? '#fff0a8' : '#ffd0c8';
            g.strokeStyle = sp; g.lineCap = 'round'; g.lineWidth = r * (st === 'cromo' ? .1 : .17);
            const n = st === 'cromo' ? 10 : 5;
            for (let i = 0; i < n; i++) { const a = i * TAU2 / n; g.beginPath(); g.moveTo(Math.cos(a) * r * .14, Math.sin(a) * r * .14); g.lineTo(Math.cos(a) * r * .6, Math.sin(a) * r * .6); g.stroke(); }
            g.fillStyle = '#1a1d33'; g.beginPath(); g.arc(0, 0, r * .16, 0, TAU2); g.fill();
            g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r * .06, 0, TAU2); g.fill();
        }
        if (o.spin > 380) { g.rotate(-o.wheel); g.strokeStyle = 'rgba(210,220,255,' + Math.min(.38, (o.spin - 380) / 1500) + ')'; g.lineWidth = r * .5; g.beginPath(); g.arc(0, 0, r * .5, 0, TAU2); g.stroke(); }
        g.restore();
    }


    // acabado común: brillo de cintura, faldón oscuro con filo de luz, luz de borde en el techo, juntas de paneles y marco de arcos
    function polish(g, build, s, o, c) {
        g.save(); build(); g.clip();
        const bl = g.createLinearGradient(c.x0, 0, c.x1, 0); bl.addColorStop(0, 'rgba(255,255,255,0)'); bl.addColorStop(.2, 'rgba(255,255,255,.65)'); bl.addColorStop(.75, 'rgba(255,255,255,.3)'); bl.addColorStop(1, 'rgba(255,255,255,0)');
        g.strokeStyle = bl; g.lineWidth = .7; g.beginPath(); g.moveTo(c.belt[0][0], c.belt[0][1]);
        for (let i = 1; i < c.belt.length; i++) g.lineTo(c.belt[i][0], c.belt[i][1]); g.stroke();
        g.fillStyle = 'rgba(6,8,22,.5)'; g.fillRect(c.x0, c.ry, c.x1 - c.x0, 3.4);
        g.fillStyle = 'rgba(' + s.glow + ',.45)'; g.fillRect(c.x0, c.ry, c.x1 - c.x0, .5);
        const rf = g.createLinearGradient(0, c.roofY, 0, c.roofY + 3.2); rf.addColorStop(0, 'rgba(255,255,255,.55)'); rf.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rf; g.fillRect(c.rx0, c.roofY, c.rx1 - c.rx0, 3.2);
        g.strokeStyle = 'rgba(5,8,25,.5)'; g.lineWidth = .5;
        for (const q of c.seams || []) { g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[2], q[3]); g.stroke(); }
        for (const w of c.arches) {      // sombra de contacto alrededor de los pasos de rueda: la chapa gana profundidad
            const ag = g.createRadialGradient(w[0], 6, w[1] + 3, w[0], 6, w[1] + 10);
            ag.addColorStop(0, 'rgba(0,0,10,.42)'); ag.addColorStop(1, 'rgba(0,0,10,0)');
            g.fillStyle = ag; g.fillRect(w[0] - w[1] - 11, -10, (w[1] + 11) * 2, 22);
        }
        g.restore();
        g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = .6;
        for (const w of c.arches) { g.beginPath(); g.arc(w[0], 6, w[1] + 3.7, Math.PI * 1.02, Math.PI * 1.98); g.stroke(); }
    }
    function fuelCap(g, x, y) { g.fillStyle = 'rgba(215,222,245,.95)'; g.beginPath(); g.arc(x, y, 1.15, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = .35; g.stroke(); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x - .5, y - .15, 1, .3); }
    function marker(g, x, y) { g.fillStyle = 'rgba(255,170,40,.95)'; rrect(g, x, y, 2.6, 1, .5); g.fill(); glowDot(g, x + 1.3, y + .5, 3, '255,170,40', .4); }
    function plate(g, x, y) { g.fillStyle = 'rgba(240,244,255,.95)'; rrect(g, x, y, 3, 6, .6); g.fill(); g.strokeStyle = 'rgba(20,26,60,.7)'; g.lineWidth = .35; g.beginPath(); g.moveTo(x + .6, y + 1.8); g.lineTo(x + 2.4, y + 1.8); g.moveTo(x + .6, y + 3.2); g.lineTo(x + 2.4, y + 3.2); g.moveTo(x + .6, y + 4.6); g.lineTo(x + 2.4, y + 4.6); g.stroke(); }

    // ---------- Chispa: hatchback compacto ----------
    function chispa(g, s, o) {
        const t = o.t;
        underglow(g, s, .3, 52);
        flame(g, -43, 5, 28, 5.5, o.boosting, t, false);
        const build = () => {
            g.beginPath(); g.moveTo(-43, 9); g.lineTo(-43, -2); g.quadraticCurveTo(-43, -6, -39, -6); g.lineTo(-33, -6);
            g.lineTo(-31, -16); g.quadraticCurveTo(-30, -18.5, -27, -18.5); g.lineTo(5, -18.5); g.quadraticCurveTo(10, -18.5, 13, -12);
            g.lineTo(21, -6); g.lineTo(38, -4); g.quadraticCurveTo(44.5, -3, 44.5, 3); g.lineTo(44.5, 9); g.closePath();
        };
        paintBody(g, build, ov(s, [[0, s.lite], [.26, s.main], [1, s.dark]]), o);
        g.save(); build(); g.clip();                               // molduras de plástico y techo bitono
        g.fillStyle = 'rgba(14,18,40,.8)'; g.fillRect(-46, 5.4, 94, 5); g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(-46, 5.4, 94, .6);
        g.fillStyle = s.dark; g.fillRect(-34, -19, 48, 3.3); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(-34, -19, 48, .8);
        g.restore();
        polish(g, build, s, o, { x0: -43, x1: 44.5, belt: [[-42, -4.6], [-33, -6.4], [20, -6.3], [43, -3.6]], ry: 5.9, roofY: -18.5, rx0: -30, rx1: 11, arches: [[-26, 10], [26, 10]],
            seams: [[-31, -6], [-31.4, 5.4], [21, -6], [22, 5.4], [3, -6], [3.2, -3], [38, -4], [37.4, 5.4]] });
        g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(-42, 0, 86, 2.2);
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-42, 2.2, 86, 1);
        glass(g, [[-29, -7], [-27, -15.5], [4, -15.5], [11.5, -10], [17, -7]], o);
        chromeStroke(g, [[-29, -7], [-27, -15.5], [4, -15.5], [11.5, -10], [17, -7]], .6);
        g.fillStyle = s.dark; g.fillRect(-9, -15.5, 2.5, 9);
        mirror(g, 16, -8.2);
        poly(g, [[-35, -17.4], [-28.6, -19.6], [-28.6, -17.6]], '#0d1126');
        driver(g, -15, -11.4, s, o); driver(g, 4, -11.4, s, o);
        // baca
        g.strokeStyle = '#0d1126'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-25, -21.5); g.lineTo(2, -21.5); g.stroke();
        g.fillStyle = '#0d1126'; g.fillRect(-23, -21, 1.6, 2.6); g.fillRect(0, -21, 1.6, 2.6);
        // puertas y tiradores
        g.strokeStyle = 'rgba(8,12,35,.55)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-8, -6); g.lineTo(-8, 4.5); g.moveTo(14, -6); g.lineTo(14, 4.5); g.stroke();
        g.fillStyle = '#0d1126'; g.fillRect(-4, -3.2, 6, 1.4); g.fillRect(17, -3.2, 5, 1.4);
        // parachoques y faldones
        g.fillStyle = '#0d1126'; rrect(g, 39, 5.5, 7, 4, 1.5); g.fill(); rrect(g, -46, 5.5, 6, 4, 1.5); g.fill();
        g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(-24, 8, 48, 1.6);
        taillight(g, -44, -3.5, 2.8, 6.5, o);
        lamp(g, 37.5, -2.8, 7, 5.4);
        g.fillStyle = 'rgba(' + s.glow + ',.95)'; g.fillRect(38, 2.9, 6, .6);
        g.fillStyle = '#05070f'; rrect(g, 40.6, 5.9, 4.4, 2.2, .7); g.fill(); g.strokeStyle = 'rgba(170,185,240,.5)'; g.lineWidth = .5; g.beginPath(); g.moveTo(41.9, 6); g.lineTo(41.9, 8); g.moveTo(43.4, 6); g.lineTo(43.4, 8); g.stroke();
        g.fillStyle = 'rgba(255,190,70,.95)'; g.beginPath(); g.arc(37.6, 7, .9, 0, TAU); g.fill();
        fuelCap(g, -35, -3.2); marker(g, 30, 3.2); marker(g, -42, 3.4);
        g.fillStyle = '#c9d2f2'; rrect(g, 5, -3.4, 4.6, 1, .5); g.fill();
        // antena flexible: se dobla hacia atrás con la velocidad y vibra
        { const sp = Math.min(1, (o.spin || 0) / 700), bx = -15, by = -18.5, tx = bx - 2.5 - sp * 5.5 + Math.sin(t * 13) * (.35 + sp * .9), ty = by - 5.4 + sp * 1.6;
          g.strokeStyle = '#0d1126'; g.lineWidth = .7; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx - .4, by - 3, tx, ty); g.stroke(); glowDot(g, tx, ty, 2.2, '255,255,255', .5); }
        // alerón de techo sobre el portón
        poly(g, [[-30.6, -18.6], [-38.8, -19.8], [-39.6, -17.6], [-32, -16.2]], s.dark);
        g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(-38.4, -19.6, 7.6, .5);
        g.fillStyle = 'rgba(' + s.glow + ',.9)'; g.fillRect(-39.4, -17.9, 1.2, .8);
        // faros de rally en la baca: se encienden a tope con el turbo
        for (const lx of [-19.5, -9.5]) {
            g.fillStyle = '#0d1126'; g.fillRect(lx - .5, -23, 1, 1.6); g.beginPath(); g.arc(lx, -24.6, 2.7, 0, TAU); g.fill();
            g.fillStyle = o.boosting ? '#fffbe0' : '#e6dca8'; g.beginPath(); g.arc(lx + .5, -24.6, 1.9, 0, TAU); g.fill();
            g.strokeStyle = 'rgba(13,17,38,.7)'; g.lineWidth = .35; g.beginPath(); g.moveTo(lx - 1.2, -24.6); g.lineTo(lx + 2.2, -24.6); g.moveTo(lx + .5, -26.3); g.lineTo(lx + .5, -22.9); g.stroke();
            glowDot(g, lx + 1, -24.6, o.boosting ? 6 : 3.5, '255,240,180', o.boosting ? .55 : .25);
        }
        // cuadros de rally en la aleta trasera
        g.save(); poly(g, [[-41, -4.4], [-33.5, -5.6], [-33.5, -1.2], [-41, -.2]]); g.clip();
        for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { g.fillStyle = (i + j) % 2 ? 'rgba(255,255,255,.9)' : 'rgba(10,14,34,.9)'; g.fillRect(-41 + i * 1.6, -5.8 + j * 1.8, 1.6, 1.8); }
        g.restore();
        // faldilla detrás de la rueda trasera: se balancea con la suspensión
        { const sw = (o.susR || 0) * .5 + (o.air ? .25 : 0);
          g.save(); g.translate(-37.6, 7.4); g.rotate(sw); g.fillStyle = '#0d1126'; rrect(g, -1.2, 0, 2.4, 6.4, .8); g.fill(); g.fillStyle = 'rgba(' + s.glow + ',.85)'; g.fillRect(-1.2, 4.8, 2.4, .7); g.restore(); }
        g.strokeStyle = 'rgba(5,8,25,.55)'; g.lineWidth = .5; g.beginPath(); g.moveTo(22, -5.4); g.lineTo(36, -3.6); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(22, -6.2); g.lineTo(37, -4.5); g.stroke();
        g.strokeStyle = 'rgba(225,232,255,.9)'; g.lineWidth = .8; g.beginPath(); g.arc(40.4, -.6, 3.5, 0, TAU); g.stroke();
        g.fillStyle = '#0d1126'; poly(g, [[-44, 9], [-38, 9], [-39.4, 11], [-44.6, 11]]); g.fill();
        skirt(g, -14, 15, 7.2); flare(g, -26, 6, 10); flare(g, 26, 6, 10);
        headlight(g, 44, 0);
        wheel(g, -26, 6, 10, o); wheel(g, 26, 6, 10, o);
    }

    // ---------- Bisonte: muscle car ----------
    function bisonte(g, s, o) {
        const t = o.t;
        underglow(g, s, .3, 56);
        flame(g, -47, 7.5, 32, 5.5, o.boosting, t, false);
        g.fillStyle = '#c7cdee'; rrect(g, -48, 7.4, 10, 3.2, 1.6); g.fill();
        const build = () => {
            g.beginPath(); g.moveTo(-46, 9); g.lineTo(-46, -2); g.quadraticCurveTo(-46, -5, -42, -5); g.lineTo(-27, -5);
            g.lineTo(-15, -16.5); g.lineTo(5, -16.5); g.lineTo(21, -6); g.lineTo(40, -5); g.quadraticCurveTo(47.5, -4, 47.5, 2); g.lineTo(47.5, 9); g.closePath();
        };
        paintBody(g, build, ov(s, [[0, s.lite], [.3, s.main], [1, s.dark]]), o);
        polish(g, build, s, o, { x0: -46, x1: 47.5, belt: [[-45, -4.4], [-27, -5.6], [21, -6.4], [46, -4.2]], ry: 5.9, roofY: -16.5, rx0: -15, rx1: 6, arches: [[-27, 10], [28, 10]],
            seams: [[-27, -5], [-27.6, 5.6], [3, -6], [2.8, 5.6], [21, -6], [22, 5.6]] });
        g.fillStyle = 'rgba(255,255,255,.92)'; g.fillRect(-44, -4, 38, 2.4); g.fillRect(20, -5, 22, 2.2);
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-44, -1.6, 38, .8);
        // toma de aire con rejilla
        g.fillStyle = '#0d1126'; rrect(g, 24, -9.2, 12, 3.8, 1.5); g.fill();
        g.strokeStyle = 'rgba(160,175,230,.5)'; g.lineWidth = .7;
        for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(26 + i * 3, -9); g.lineTo(26 + i * 3, -5.6); g.stroke(); }
        glass(g, [[-24, -6], [-14, -15], [4, -15], [16, -6]], o);
        chromeStroke(g, [[-24, -6], [-14, -15], [4, -15], [16, -6]], .6);
        g.fillStyle = s.dark; g.fillRect(-5, -15, 2.2, 9);
        mirror(g, 15.6, -6.4);
        g.strokeStyle = 'rgba(8,12,35,.6)'; g.lineWidth = .8; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-12 + i * 2.6, -3.4); g.lineTo(-12 + i * 2.6, 1.4); g.stroke(); }
        handle(g, 3, -3, 5);
        driver(g, -10, -10.6, s, o);
        // alerón de pato y ensanches
        g.fillStyle = s.dark; rrect(g, -50, -9.6, 13, 3.2, 1.2); g.fill(); g.fillRect(-45.5, -6.6, 2.4, 3);
        g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(-50, -9.6, 13, .8);
        g.fillStyle = 'rgba(0,0,0,.3)'; rrect(g, -39, 3, 25, 4.5, 2.2); g.fill(); rrect(g, 14, 3, 27, 4.5, 2.2); g.fill();
        // escape lateral cromado
        const ex = g.createLinearGradient(0, 7, 0, 10); ex.addColorStop(0, '#f2f4ff'); ex.addColorStop(1, '#6a729c');
        g.fillStyle = ex; rrect(g, -30, 7.6, 22, 2.2, 1.1); g.fill();
        g.strokeStyle = 'rgba(8,12,35,.5)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-3, -5); g.lineTo(-3, 5.5); g.stroke();
        taillight(g, -47.5, -2.5, 3, 6.5, o);
        g.fillStyle = '#dfe3f6'; g.beginPath(); g.arc(44.2, .2, 3.7, 0, TAU); g.fill();
        g.fillStyle = '#0b0e1c'; g.beginPath(); g.arc(44.2, .2, 2.9, 0, TAU); g.fill();
        g.fillStyle = '#fff7cf'; g.beginPath(); g.arc(44.2, .2, 2.3, 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(43.5, -.5, .8, 0, TAU); g.fill();
        g.fillStyle = '#0d1126'; g.fillRect(42, 6, 6, 3);
        const bm = g.createLinearGradient(0, 2, 0, 9.4); bm.addColorStop(0, '#fafbff'); bm.addColorStop(.5, '#9aa3cc'); bm.addColorStop(1, '#4a5278');
        g.fillStyle = bm; rrect(g, 45, 3.6, 4.4, 6, 1.6); g.fill(); rrect(g, -50, 3.4, 4.6, 5, 1.6); g.fill();
        g.strokeStyle = 'rgba(8,12,35,.7)'; g.lineWidth = .6; g.beginPath(); g.moveTo(42.6, 6.8); g.lineTo(47.8, 6.8); g.moveTo(42.6, 8.2); g.lineTo(47.8, 8.2); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(31, -2.2, 1.7, 0, TAU); g.fill(); g.strokeStyle = '#0d1126'; g.lineWidth = .8;
        g.beginPath(); g.arc(31, -2.2, 1.7, Math.PI * 1.1, Math.PI * 1.9); g.moveTo(29.3, -3.3); g.lineTo(28.4, -4.4); g.moveTo(32.7, -3.3); g.lineTo(33.6, -4.4); g.stroke();
        fuelCap(g, -34, -2.2);
        g.fillStyle = '#0d1126'; rrect(g, 25.5, -9.6, 9, 1, .4); g.fill();
        g.fillStyle = '#e8ecff'; g.beginPath(); g.arc(36.6, -3.4, .6, 0, TAU); g.arc(41, -3.8, .6, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(235,240,255,.9)'; g.lineWidth = .9; g.beginPath(); g.moveTo(14, -7); g.lineTo(17.5, -5.2); g.stroke();
        marker(g, 43, 4.2); marker(g, -46, 5);
        g.fillStyle = 'rgba(235,240,255,.9)'; for (const p of [[-37, 4.4], [-37, 6.4], [-15, 4.4], [-15, 6.4], [15.6, 4.4], [15.6, 6.4], [39.4, 4.4], [39.4, 6.4]]) { g.beginPath(); g.arc(p[0], p[1], .5, 0, TAU); g.fill(); }
        g.strokeStyle = '#ff3b30'; g.lineWidth = 1.1; g.beginPath(); g.arc(47.2, 7.6, 1.5, -Math.PI * .5, Math.PI * .5); g.stroke();
        // compresor sobre el capó: vibra con el motor (mucho más con el turbo) y la correa gira
        { const vib = Math.sin(t * 47) * (o.boosting ? .55 : .2) + Math.sin(t * 31) * (o.boosting ? .3 : .08);
          g.save(); g.translate(0, vib);
          const cb = g.createLinearGradient(0, -15, 0, -9.6); cb.addColorStop(0, '#ffffff'); cb.addColorStop(.45, '#a9b1d6'); cb.addColorStop(1, '#4a5278');
          g.fillStyle = cb; rrect(g, 24.6, -14.8, 10.8, 5.4, 1.4); g.fill();
          g.strokeStyle = 'rgba(30,36,70,.6)'; g.lineWidth = .4; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(26 + i * 2.6, -14.4); g.lineTo(26 + i * 2.6, -9.8); g.stroke(); }
          g.fillStyle = '#0d1126'; rrect(g, 25.6, -18.2, 8.8, 3.6, 1.2); g.fill();                                         // toma
          g.fillStyle = 'rgba(' + s.glow + ',.9)'; g.fillRect(25.6, -18.2, 8.8, .6);
          g.strokeStyle = 'rgba(150,165,220,.55)'; g.lineWidth = .35; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(26.8 + i * 2, -17.4); g.lineTo(26.8 + i * 2, -15); g.stroke(); }
          g.save(); g.translate(36.2, -12); g.rotate(t * (o.boosting ? 30 : 12)); g.fillStyle = '#1a1f38'; g.beginPath(); g.arc(0, 0, 1.6, 0, TAU); g.fill();       // polea
          g.strokeStyle = '#c9d0ee'; g.lineWidth = .4; g.beginPath(); g.moveTo(-1.4, 0); g.lineTo(1.4, 0); g.stroke(); g.restore();
          g.restore(); }
        // llamas por los escapes laterales con el turbo
        if (o.boosting) for (let i = 0; i < 2; i++) {
            const fl = 5 + Math.sin(t * 38 + i * 2) * 1.6 + i * 2, yy = 8.7;
            g.fillStyle = i ? 'rgba(255,230,140,.95)' : 'rgba(255,120,40,.85)'; g.beginPath(); g.moveTo(-30, yy - 1.1 + i * .4); g.lineTo(-30 - fl, yy); g.lineTo(-30, yy + 1.1 - i * .4); g.closePath(); g.fill();
            glowDot(g, -31, yy, 6, '255,150,60', .6);
        }
        skirt(g, -14, 14, 7.4); flare(g, -27, 6, 10); flare(g, 28, 6, 10);
        headlight(g, 47.5, 0);
        wheel(g, -27, 6, 10, o); wheel(g, 28, 6, 10, o);
    }

    // ---------- Cuña: deportivo bajo con alerón ----------
    function cuna(g, s, o) {
        const t = o.t;
        underglow(g, s, .45 + .1 * Math.sin(t * 5), 58);
        flame(g, -47, 0, 30, 5, o.boosting, t, false);
        g.fillStyle = '#0d1126'; g.fillRect(-41, -13.5, 2.4, 12.5); g.fillRect(-33, -13.5, 2.4, 10.5);
        // alerón activo: se levanta como freno de aire al frenar y se aplana con el turbo
        g.save(); g.translate(-37, -13.5); g.rotate(o.brake && !o.air ? -.42 : o.boosting ? .07 : 0); g.translate(37, 13.5);
        const wg = g.createLinearGradient(0, -18, 0, -12); wg.addColorStop(0, s.lite); wg.addColorStop(1, s.main);
        g.fillStyle = wg; rrect(g, -51, -18, 25, 4.2, 1.6); g.fill();
        carbon(g, [[-50, -14.2], [-26.4, -14.2], [-26.4, -12.6], [-50, -12.6]]);
        g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-49, -17.6, 22, .7);
        g.fillStyle = s.dark; g.fillRect(-51, -19, 2.2, 8); g.fillRect(-28.2, -19, 2.2, 8);
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = .5; g.beginPath(); g.moveTo(-26, -13.6); g.lineTo(-50, -13.6); g.stroke();
        glowDot(g, -50.4, -17, 4, s.glow, .5); glowDot(g, -26.8, -17, 4, s.glow, .5);
        g.restore();
        const build = () => {
            g.beginPath(); g.moveTo(-46, 9); g.lineTo(-46, -1); g.lineTo(-31, -3); g.lineTo(-14, -11.5); g.lineTo(6, -12.5);
            g.lineTo(28, -3.5); g.lineTo(47, 1); g.lineTo(47, 9); g.closePath();
        };
        paintBody(g, build, ov(s, [[0, s.lite], [.3, s.main], [1, s.dark]]), o);
        polish(g, build, s, o, { x0: -46, x1: 47, belt: [[-44, -.4], [-30, -2.4], [27, -2.8], [46, 1.4]], ry: 5.9, roofY: -12.5, rx0: -14, rx1: 8, arches: [[-27, 10], [28, 10]],
            seams: [[-26, -3], [-27, 5.6], [20, -3], [21, 5.6], [-3, -11], [-2.6, -4]] });
        glass(g, [[-26, -3.6], [-13, -10.5], [4, -11], [20, -3.6]], o);
        chromeStroke(g, [[-26, -3.6], [-13, -10.5], [4, -11], [20, -3.6]], .55);
        mirror(g, 19.2, -4.2);
        g.strokeStyle = '#0d1126'; g.lineWidth = .8; g.beginPath(); g.moveTo(-9, -11); g.lineTo(-13.5, -14.6); g.stroke();
        driver(g, -3, -6.4, s, o);
        g.strokeStyle = 'rgba(8,12,35,.75)'; g.lineWidth = 1.4;
        for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-9 + i * 4, 1); g.lineTo(-4 + i * 4, 5.2); g.stroke(); }
        g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(-44, -.6, 88, 1.6);
        g.fillStyle = 'rgba(' + s.glow + ',.95)'; g.fillRect(-44, 8, 91, 2);
        poly(g, [[44, 8], [53, 9], [53, 11.4], [40, 11.4]], '#0d1126');
        poly(g, [[36, -1], [46, 1], [46, 3.2], [36, 3.2]], '#fff7cf');
        g.fillStyle = 'rgba(60,80,140,.65)'; g.beginPath(); g.arc(42.2, 1.8, 1.25, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(41.9, 1.5, .5, 0, TAU); g.fill();
        g.fillStyle = 'rgba(' + s.glow + ',.95)'; g.fillRect(36, 3.5, 10, .6);
        vents(g, 8.6, 1.6, 5.2, 3.8, 3);
        poly(g, [[-46, 5.5], [-52, 9], [-52, 11.4], [-44, 11.4]], '#0d1126');
        g.strokeStyle = 'rgba(170,185,240,.5)'; g.lineWidth = .6; g.beginPath(); g.moveTo(-49, 7); g.lineTo(-49, 11.4); g.moveTo(-46.4, 6.4); g.lineTo(-46.4, 11.4); g.stroke();
        g.fillStyle = '#9aa1c4'; g.fillRect(-50.4, 4.4, 4.4, 1.9);
        carbon(g, [[43, 8.2], [53, 9], [53, 10.6], [40, 10.6]]);
        taillight(g, -47, -.5, 3, 5.6, o);
        fuelCap(g, -37, -1.2); marker(g, 32, 3.9);
        g.fillStyle = '#c9d2f2'; rrect(g, 12, -1, 4.6, 1, .5); g.fill();
        poly(g, [[41, 3.4], [47, 3.4], [47.6, 6.4], [43, 7]], '#0d1126');
        g.strokeStyle = 'rgba(' + s.glow + ',.85)'; g.lineWidth = .5; g.beginPath(); g.moveTo(41.6, 4.6); g.lineTo(47, 4.6); g.moveTo(42, 5.8); g.lineTo(47, 5.8); g.stroke();
        g.fillStyle = s.main; poly(g, [[-47.8, -.6], [-44.4, -.6], [-44.4, 2], [-47.8, 2]]); g.fill();
        // toma de aire lateral detrás de la puerta, con filo del color del equipo
        poly(g, [[-25, 4.6], [-14.6, 4.6], [-17.6, -1.8], [-22.6, -1.4]], '#05070f');
        g.strokeStyle = 'rgba(' + s.glow + ',.95)'; g.lineWidth = .7; g.beginPath(); g.moveTo(-22.6, -1.4); g.lineTo(-17.6, -1.8); g.lineTo(-14.6, 4.6); g.stroke();
        g.strokeStyle = 'rgba(120,130,175,.5)'; g.lineWidth = .35; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-23.4 + i * 2.4, 4.2); g.lineTo(-21.4 + i * 2.2, -.8); g.stroke(); }
        // filo de color que recorre el costado de morro a cola
        g.strokeStyle = 'rgba(' + s.glow + ',.9)'; g.lineWidth = .6; g.beginPath(); g.moveTo(45, 1.8); g.lineTo(28, -1.8); g.lineTo(-12, -2.6); g.lineTo(-30, -1.6); g.lineTo(-45, 1); g.stroke();
        skirt(g, -12, 12, 7.5); flare(g, -27, 6, 10); flare(g, 28, 6, 10);
        headlight(g, 46, 1.6);
        wheel(g, -27, 6, 10, o); wheel(g, 28, 6, 10, o);
    }

    // ---------- Kaze GT: cupé tuner de los 90, diseño propio ----------
    function kaze(g, s, o) {
        const t = o.t;
        underglow(g, s, .62 + .18 * Math.sin(t * 4.5), 66);
        flame(g, -49, 4, 34, 6, o.boosting, t, false);
        // alerón GT de dos planos con cuellos de cisne y placas del color del equipo
        g.strokeStyle = '#0d1126'; g.lineWidth = 2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-39, -4.6); g.bezierCurveTo(-42, -10, -40, -15, -44, -19.6); g.stroke();
        g.beginPath(); g.moveTo(-31, -5.6); g.bezierCurveTo(-34, -10, -32, -15, -35, -19.6); g.stroke();
        const cf = g.createLinearGradient(0, -23, 0, -18.4); cf.addColorStop(0, '#6a7194'); cf.addColorStop(.5, '#1d2238'); cf.addColorStop(1, '#0d1126');
        g.fillStyle = cf; rrect(g, -58, -22.6, 31, 3.8, 1.6); g.fill();
        g.fillStyle = '#10142c'; rrect(g, -55, -25.2, 25, 2.2, 1); g.fill();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(-56, -22.6, 28, .8); g.fillRect(-54, -25.2, 23, .6);
        g.fillStyle = s.main; g.fillRect(-58.6, -26, 2.6, 11); g.fillRect(-29, -26, 2.6, 11);
        g.fillStyle = 'rgba(' + s.glow + ',.95)'; g.fillRect(-58.6, -26, .8, 11); g.fillRect(-26.8, -26, .8, 11);
        // carrocería de cupé: capó largo, cabina retrasada, luneta inclinada y cola corta
        const build = () => {
            g.beginPath(); g.moveTo(-47, 9); g.lineTo(-47, -1.5); g.quadraticCurveTo(-47, -4.6, -43, -4.7); g.lineTo(-36, -5.2);
            g.lineTo(-27, -10.6); g.quadraticCurveTo(-24, -14.6, -19, -14.9); g.lineTo(-3, -14.9); g.quadraticCurveTo(1, -14.9, 4, -12.4); g.lineTo(14, -7.2);
            g.lineTo(31, -5.4); g.lineTo(44, -3.6); g.quadraticCurveTo(49.5, -2.8, 49.5, 2); g.lineTo(49.5, 9); g.closePath();
        };
        paintBody(g, build, ov(s, [[0, '#7d88aa'], [.3, '#2c3350'], [1, '#080b19']]), o);
        // librea propia: cuchillas diagonales que suben por la puerta y el guardabarros, con un filo blanco
        g.save(); build(); g.clip();
        for (let i = 0; i < 4; i++) {
            const x0 = -30 + i * 9.5, w = i === 3 ? 2.2 : 4.2 - i * .5;
            poly(g, [[x0, 9], [x0 + w, 9], [x0 + w + 8, -7.4], [x0 + 8, -7.4]], s.main);
            g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = .55; g.beginPath(); g.moveTo(x0 + w, 9); g.lineTo(x0 + w + 8, -7.4); g.stroke();
        }
        poly(g, [[27, -.4], [48.6, -2.6], [48.6, -1.1], [27, 1.2]], s.main);
        poly(g, [[27, 1.8], [48.6, -.2], [48.6, .5], [27, 2.6]], 'rgba(255,255,255,.85)');
        g.fillStyle = s.main; g.fillRect(-20, -15, 19, 1.6); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(-20, -13.4, 19, .7);
        g.restore();
        // acabado: línea de cintura brillante, faldón bicolor y reflejo del techo
        g.save(); build(); g.clip();
        const bl = g.createLinearGradient(-47, 0, 49, 0); bl.addColorStop(0, 'rgba(255,255,255,0)'); bl.addColorStop(.25, 'rgba(255,255,255,.7)'); bl.addColorStop(.7, 'rgba(255,255,255,.35)'); bl.addColorStop(1, 'rgba(255,255,255,0)');
        g.strokeStyle = bl; g.lineWidth = .7; g.beginPath(); g.moveTo(-45, -3.2); g.lineTo(-28, -6.4); g.lineTo(13, -5.9); g.lineTo(46, -2.2); g.stroke();
        g.fillStyle = 'rgba(8,10,26,.62)'; g.fillRect(-47, 6.2, 97, 3.2);
        g.fillStyle = 'rgba(' + s.glow + ',.5)'; g.fillRect(-47, 6.2, 97, .5);
        const rf = g.createLinearGradient(-20, -15, 4, -12); rf.addColorStop(0, 'rgba(255,255,255,.55)'); rf.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rf; g.fillRect(-22, -15, 26, 1.4);
        g.restore();
        carbon(g, [[16, -6.6], [31, -5.2], [44, -3.5], [44, -1.9], [31, -3.4], [16, -5]]);
        // tomas del capó y branquias del guardabarros
        g.fillStyle = '#05070f';
        poly(g, [[21, -6.2], [26.5, -5.8], [27.5, -4.7], [22, -5.1]]); g.fill();
        poly(g, [[29, -5.5], [34.5, -5.1], [35.5, -4.1], [30, -4.4]]); g.fill();
        vents(g, 33, -.4, 7, 3.6, 4);
        // cristales y pilar B
        glass(g, [[-25.6, -10.8], [-20.5, -14.2], [-3, -14.2], [3.4, -12], [12.4, -7.6], [-18, -7.2]], o);
        chromeStroke(g, [[-25.6, -10.8], [-20.5, -14.2], [-3, -14.2], [3.4, -12], [12.4, -7.6]], .55);
        g.fillStyle = '#10142c'; g.fillRect(-1.2, -14.2, 2, 6.8);
        mirror(g, 11.2, -8.3);
        driver(g, -12, -11, s, o);
        g.strokeStyle = '#0d1126'; g.lineWidth = .8; g.beginPath(); g.moveTo(-6, -14.9); g.lineTo(-8.5, -17.6); g.stroke();
        // ensanches, falda y labio
        g.fillStyle = 'rgba(0,0,0,.4)'; rrect(g, -41, 2.4, 26, 5.6, 2.8); g.fill(); rrect(g, 14, 2.4, 29, 5.6, 2.8); g.fill();
        g.strokeStyle = 'rgba(' + s.glow + ',.9)'; g.lineWidth = 1; rrect(g, -41, 2.4, 26, 5.6, 2.8); g.stroke(); rrect(g, 14, 2.4, 29, 5.6, 2.8); g.stroke();
        g.fillStyle = 'rgba(' + s.glow + ',.95)'; g.fillRect(-14, 8.2, 28, 1.6);
        poly(g, [[45, 8], [55, 9.2], [55, 11.6], [39, 11.6]], '#0d1126');
        g.fillStyle = s.main; g.fillRect(41, 11, 14, .8);
        // puerta larga de cupé
        g.strokeStyle = 'rgba(4,6,18,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-8.4, -7.2); g.lineTo(-8.4, 5); g.moveTo(13, -6.4); g.lineTo(13, 3.2); g.stroke();
        g.fillStyle = '#05070f'; g.fillRect(-4.6, -4.6, 5.4, 1.3);
        g.fillStyle = '#c9d2f2'; rrect(g, -5.2, -3.4, 5, 1, .5); g.fill(); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-5.2, -2.4, 5, .4);
        g.fillStyle = 'rgba(210,216,240,.9)'; g.beginPath(); g.arc(-37, -3.3, 1.1, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = .35; g.stroke();
        g.fillStyle = '#04060e'; rrect(g, 41, 3.8, 7.6, 3.6, 1); g.fill();
        g.strokeStyle = 'rgba(120,130,175,.55)'; g.lineWidth = .35;
        for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(41.4 + i * 1.5, 3.9); g.lineTo(41.4 + i * 1.5, 7.3); g.stroke(); }
        g.beginPath(); g.moveTo(41.2, 5.6); g.lineTo(48.4, 5.6); g.stroke();
        glowDot(g, 46.4, 2.4, 3.2, '255,235,170', .75); g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(46.4, 2.4, .8, 0, TAU); g.fill();
        g.fillStyle = '#05070f'; poly(g, [[-47, 8.6], [-39, 8.6], [-40.5, 11.2], [-48.5, 11.2]]); g.fill();
        g.strokeStyle = 'rgba(' + s.glow + ',.8)'; g.lineWidth = .4; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-45 + i * 2.6, 8.8); g.lineTo(-46.4 + i * 2.6, 11); g.stroke(); }
        // escapes dobles
        g.fillStyle = '#9aa1c4'; g.fillRect(-52, 5.2, 5, 2.4); g.fillRect(-52, 8.2, 5, 2.4);
        glowDot(g, -52, 6.4, 5, '255,150,60', o.boosting ? .9 : .25); glowDot(g, -52, 9.4, 5, '255,150,60', o.boosting ? .9 : .25);
        // piloto trasero en barra LED y faros angulosos
        g.fillStyle = o.brake ? '#ff6a58' : '#d12a24'; g.fillRect(-48, -3.2, 2.6, 6.8);
        glowDot(g, -47.5, .4, o.brake ? 19 : 10, '255,50,40', o.brake ? .95 : .45);
        g.fillStyle = 'rgba(255,230,220,' + (.35 + .3 * Math.sin(t * 6)) + ')'; g.fillRect(-47.6, -3 + ((t * 5) % 1) * 6.2, 2.2, .7);
        poly(g, [[39, -3.4], [48.6, -2], [48.6, .2], [39, -.8]], '#eaffff');
        g.fillStyle = 'rgba(' + s.glow + ',.95)'; g.fillRect(40.4, .5, 8.4, .7);
        g.fillStyle = 'rgba(70,90,150,.6)'; g.beginPath(); g.arc(44.6, -1.1, 1, 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(44.3, -1.4, .38, 0, TAU); g.fill();
        // remaches de los ensanches, ganchos de remolque y aletas
        g.fillStyle = 'rgba(235,240,255,.95)';
        for (const p of [[-40, 3.4], [-40, 7.2], [-15.6, 3.4], [-15.6, 7.2], [15, 3.4], [15, 7.2], [42, 3.4], [42, 7.2]]) { g.beginPath(); g.arc(p[0], p[1], .55, 0, TAU); g.fill(); }
        g.strokeStyle = '#ff3b30'; g.lineWidth = 1.2; g.beginPath(); g.arc(49, 5.6, 1.9, -Math.PI * .5, Math.PI * .5); g.stroke();
        poly(g, [[43, 3.4], [49, 3], [47, 5.2], [43, 5.4]], '#10142c'); g.fillStyle = 'rgba(' + s.glow + ',.9)'; g.fillRect(43.4, 3.6, 4.6, .5);
        headlight(g, 49, -.6, 80);
        wheel(g, -28, 6, 10.5, o); wheel(g, 29, 6, 10.5, o);
    }

    // ---------- Fénix Solar: coche legendario ----------
    function fenix(g, s, o) {
        const t = o.t;
        underglow(g, s, .6 + .2 * Math.sin(t * 4), 66);
        flame(g, -48, 2, 42, 7.5, o.boosting, t, true);
        // alerón doble
        g.fillStyle = '#1a1208'; g.fillRect(-43, -14.5, 2.6, 13.5); g.fillRect(-33, -14.5, 2.6, 11.5);
        const wg = g.createLinearGradient(0, -20, 0, -14); wg.addColorStop(0, '#fff3b0'); wg.addColorStop(1, '#e89a10');
        g.fillStyle = wg; rrect(g, -53, -20, 27, 4.4, 1.6); g.fill();
        g.fillStyle = '#1a1208'; rrect(g, -51, -15.2, 23, 2.2, 1); g.fill();
        g.fillStyle = 'rgb(' + s.glow + ')'; g.fillRect(-54, -22, 2.6, 10.5); g.fillRect(-28.6, -22, 2.6, 10.5);
        const build = () => {
            g.beginPath(); g.moveTo(-48, 9); g.lineTo(-48, -2); g.quadraticCurveTo(-48, -6, -43, -6); g.lineTo(-28, -6);
            g.lineTo(-15, -16.5); g.lineTo(7, -16.5); g.lineTo(22, -7); g.lineTo(39, -5.5); g.quadraticCurveTo(48.5, -3.5, 48.5, 3); g.lineTo(48.5, 9); g.closePath();
        };
        paintBody(g, build, ov(s, [[0, '#fff6c2'], [.26, '#ffcf2e'], [.7, '#f59a14'], [1, '#9c4e08']]), o);
        // llamas pintadas en el lateral, animadas
        g.save(); build(); g.clip(); g.beginPath(); g.rect(-48, -4, 98, 14); g.clip();
        for (let pass = 0; pass < 2; pass++) {
            g.fillStyle = pass ? '#ffe36b' : '#e8430f'; g.beginPath(); g.moveTo(47, 10);
            for (let k = 0; k < 7; k++) {
                const x = 47 - k * 13.5, w = Math.sin(t * 6 + k * 1.3) * (pass ? .8 : 1.4), sc = pass ? .55 : 1;
                g.quadraticCurveTo(x - 3, 2 - k * .5 + w, x - 12 * sc - (pass ? 2 : 0), -1.5 - k * .4 + w * 1.5);
                g.quadraticCurveTo(x - 9, 5, x - 13.5, 10);
            }
            g.closePath(); g.fill();
        }
        g.restore();
        polish(g, build, s, o, { x0: -48, x1: 48.5, belt: [[-47, -5.2], [-28, -6.4], [22, -7.2], [47, -4.4]], ry: 5.8, roofY: -16.5, rx0: -15, rx1: 7, arches: [[-28, 10.5], [29, 10.5]],
            seams: [[-28, -6], [-28.8, 5.6], [22, -7], [23, 5.6], [-6, -6], [-6.4, 5.6]] });
        g.fillStyle = 'rgba(255,255,255,.95)'; g.fillRect(-47, -3.4, 38, 1.4); g.fillRect(14, -4.4, 31, 1.4);
        g.strokeStyle = 'rgba(26,18,8,.55)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-6, -6); g.lineTo(-6, 5); g.moveTo(15, -6); g.lineTo(15, 4); g.stroke();
        // emblema solar giratorio
        g.save(); g.translate(5, -.5);
        g.fillStyle = '#1a1208'; g.beginPath(); g.arc(0, 0, 4.4, 0, TAU); g.fill();
        g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, 2.5, 0, TAU); g.fill();
        g.strokeStyle = '#ffd23f'; g.lineWidth = .9;
        for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + t * .6; g.beginPath(); g.moveTo(Math.cos(a) * 5, Math.sin(a) * 5); g.lineTo(Math.cos(a) * 7, Math.sin(a) * 7); g.stroke(); }
        g.restore();
        // cabina tintada
        const gl = g.createLinearGradient(0, -17, 0, -6); gl.addColorStop(0, '#a6e4ff'); gl.addColorStop(.5, '#2a5f8f'); gl.addColorStop(1, '#0a1c34');
        poly(g, [[-25, -6.8], [-14, -15.4], [6, -15.4], [18.5, -7.4]], gl);
        g.save(); poly(g, [[-25, -6.8], [-14, -15.4], [6, -15.4], [18.5, -7.4]]); g.clip();
        g.fillStyle = 'rgba(255,255,255,.5)'; poly(g, [[-20, -8], [-13, -14.5], [-9, -14.5], [-15, -8]]); g.fill();
        g.fillStyle = 'rgba(255,255,255,.25)'; poly(g, [[-5, -8], [0, -14.5], [2.5, -14.5], [-2, -8]]); g.fill();
        g.restore();
        chromeStroke(g, [[-25, -6.8], [-14, -15.4], [6, -15.4], [18.5, -7.4]], .6, '#ffe28a');
        g.fillStyle = '#1a1208'; g.fillRect(-1.6, -15.4, 2, 8.6);
        mirror(g, 17.2, -7.8);
        carbon(g, [[-14, -16.5], [7, -16.5], [9, -14.8], [-16, -14.8]]);
        g.fillStyle = 'rgba(255,214,90,.9)'; g.fillRect(-14, -16.5, 21, .6);
        vents(g, -15, -2.8, 6, 4.6, 3);
        g.strokeStyle = 'rgba(255,214,90,.8)'; g.lineWidth = .6; rrect(g, -15, -2.8, 6, 4.6, 1); g.stroke();
        CUR.gl = [[-25, -6.8], [-14, -15.4], [6, -15.4], [18.5, -7.4]]; driver(g, -9, -11, s, o);
        g.fillStyle = '#1a1208'; poly(g, [[15, -9], [20, -8.5], [19, -6.5], [15, -7]]); g.fill();
        g.fillStyle = 'rgba(0,0,0,.32)'; rrect(g, -40, 4, 25, 4.6, 2.3); g.fill(); rrect(g, 15, 4, 27, 4.6, 2.3); g.fill();
        poly(g, [[44, 8], [55, 9], [55, 11.4], [40, 11.4]], '#1a1208');
        // faros con haz, piloto y escapes
        poly(g, [[38, -2.6], [48.5, -.6], [48.5, 3.2], [38, 3.2]], '#fffbe0');
        g.fillStyle = 'rgba(70,90,150,.6)'; g.beginPath(); g.arc(44.6, .6, 1.4, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(44.3, .3, .5, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,170,40,.95)'; g.fillRect(39, 3.4, 10, .7);
        g.fillStyle = '#ffd23f'; g.fillRect(40, 9.6, 14, .8);
        skirt(g, -12, 14, 7.6);
        poly(g, [[-47, 6], [-53, 9.4], [-53, 11.4], [-45, 11.4]], '#1a1208');
        g.strokeStyle = 'rgba(255,214,90,.7)'; g.lineWidth = .6; g.beginPath(); g.moveTo(-50, 7.6); g.lineTo(-50, 11.4); g.moveTo(-47.6, 6.8); g.lineTo(-47.6, 11.4); g.stroke();
        fuelCap(g, -37, -3.6); marker(g, 42, 4.6);
        g.fillStyle = '#ffe28a'; rrect(g, 9, -3, 4.8, 1, .5); g.fill();
        g.strokeStyle = 'rgba(255,226,138,.9)'; g.lineWidth = .6; g.beginPath(); g.moveTo(-14, -16.9); g.lineTo(8, -16.9); g.stroke();
        poly(g, [[41, 4], [48.2, 4], [48.2, 6.6], [43, 7.2]], '#1a1208'); g.strokeStyle = 'rgba(255,214,90,.85)'; g.lineWidth = .5; g.beginPath(); g.moveTo(42, 5.2); g.lineTo(48, 5.2); g.moveTo(42.6, 6.3); g.lineTo(48, 6.3); g.stroke();
        g.fillStyle = '#ffd23f'; poly(g, [[-55, -22], [-52.4, -22], [-52.4, -12], [-55, -12]]); g.fill();
        glowDot(g, -53.2, -17, 6, '255,200,60', .6); glowDot(g, -27.4, -17, 6, '255,200,60', .6);
        flare(g, -28, 6, 10.5); flare(g, 29, 6, 10.5);
        headlight(g, 48.5, .8, 84);
        taillight(g, -49, -3, 3.6, 7.4, o);
        const p = .6 + .4 * Math.sin(t * 9);
        g.fillStyle = '#44444f'; g.fillRect(-52, 4, 5, 2.4); g.fillRect(-52, 7.4, 5, 2.4);
        glowDot(g, -52, 5.2, 5, '255,150,40', o.boosting ? 1 : p * .7); glowDot(g, -52, 8.6, 5, '255,150,40', o.boosting ? 1 : p * .7);
        wheel(g, -28, 6, 10.5, o, true); wheel(g, 29, 6, 10.5, o, true);
    }


    // ---------- Prisma Volt: patinete eléctrico todoterreno (diseño original, el vehículo más detallado) ----------
    const SC = { OR: '#ff6d1f', ORL: '#ffb070', ORD: '#a83a00', BK: '#0a0b13', K2: '#161a2b', G1: '#c2c8de', G2: '#7a8098', G3: '#454a64', G4: '#2a2e44' };
    function bolt(g, x, y, r) {
        g.fillStyle = '#12141f'; g.beginPath(); g.arc(x, y, r + .45, 0, TAU); g.fill();
        const b = g.createRadialGradient(x - r * .3, y - r * .3, 0, x, y, r); b.addColorStop(0, '#ffffff'); b.addColorStop(.6, '#aab1cc'); b.addColorStop(1, '#5a607c');
        g.fillStyle = b; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(10,12,24,.75)'; g.lineWidth = Math.max(.35, r * .25); g.beginPath(); g.moveTo(x - r * .6, y + r * .1); g.lineTo(x + r * .6, y - r * .1); g.stroke();
    }
    // pieza alargada con extremos redondos (brazos, tubos, bieletas)
    function limb(g, ax, ay, bx, by, w0, w1, fill) {
        const a = Math.atan2(by - ay, bx - ax), nx = -Math.sin(a), ny = Math.cos(a);
        g.fillStyle = fill; g.beginPath();
        g.moveTo(ax + nx * w0 / 2, ay + ny * w0 / 2); g.lineTo(bx + nx * w1 / 2, by + ny * w1 / 2);
        g.arc(bx, by, w1 / 2, a + Math.PI / 2, a - Math.PI / 2, true);
        g.lineTo(ax - nx * w0 / 2, ay - ny * w0 / 2); g.arc(ax, ay, w0 / 2, a - Math.PI / 2, a + Math.PI / 2, true);
        g.closePath(); g.fill();
    }
    // brazo o pierna con forma de verdad: de A a B pasando cerca de C, más ancho por el músculo (wm) que en las puntas
    function flesh(g, ax, ay, cx, cy, bx, by, w0, wm, w1, fill) {
        const N = 9, L = [], R = [];
        for (let i = 0; i <= N; i++) {
            const u = i / N, iu = 1 - u;
            const px = iu * iu * ax + 2 * iu * u * cx + u * u * bx, py = iu * iu * ay + 2 * iu * u * cy + u * u * by;
            const tx = 2 * iu * (cx - ax) + 2 * u * (bx - cx), ty = 2 * iu * (cy - ay) + 2 * u * (by - cy), tl = Math.hypot(tx, ty) || 1;
            const w = (w0 * iu + w1 * u + (wm - (w0 + w1) / 2) * Math.sin(Math.PI * Math.min(1, u * 1.15))) / 2;
            L.push([px - ty / tl * w, py + tx / tl * w]); R.push([px + ty / tl * w, py - tx / tl * w]);
        }
        const a0 = Math.atan2(cy - ay, cx - ax), a1 = Math.atan2(by - cy, bx - cx);
        g.fillStyle = fill; g.beginPath(); g.moveTo(L[0][0], L[0][1]);
        for (let i = 1; i <= N; i++) g.lineTo(L[i][0], L[i][1]);
        g.arc(bx, by, w1 / 2, a1 + Math.PI / 2, a1 - Math.PI / 2, true);
        for (let i = N; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
        g.arc(ax, ay, w0 / 2, a0 - Math.PI / 2, a0 + Math.PI / 2, true);
        g.closePath(); g.fill();
    }
    // muelle helicoidal: vueltas inclinadas delante y tramo oscuro por detrás
    function spring(g, x0, y0, x1, y1, n, r, col, hi, th) {
        th = th || 1;
        const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, px = -dy / L, py = dx / L;
        const P = (u, s) => [x0 + dx * u + px * r * s, y0 + dy * u + py * r * s];
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.strokeStyle = 'rgba(4,5,12,.85)'; g.lineWidth = 1.5 * th;
        for (let i = 0; i < n; i++) { const a = P((i + .5) / n, -1), b = P((i + 1) / n, 1); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
        for (let i = 0; i < n; i++) {
            const a = P(i / n, 1), b = P((i + .5) / n, -1);
            g.strokeStyle = 'rgba(4,5,12,.9)'; g.lineWidth = 2.5 * th; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
            g.strokeStyle = col; g.lineWidth = 1.7 * th; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
            g.strokeStyle = hi; g.lineWidth = .5 * th; g.beginPath(); g.moveTo(a[0] - px * .3, a[1] - py * .3); g.lineTo((a[0] + b[0]) / 2 - px * .3, (a[1] + b[1]) / 2 - py * .3); g.stroke();
        }
    }
    // cinemática de dos huesos: devuelve la articulación (rodilla/codo) entre A y B
    function ik2(ax, ay, bx, by, l1, l2, dir) {
        let dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1; const m = l1 + l2 - .05;
        if (d > m) { const k = m / d; bx = ax + dx * k; by = ay + dy * k; dx *= k; dy *= k; d = m; }
        const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
        return [ax + dx * a / d - dy / d * h * dir, ay + dy * a / d + dx / d * h * dir, bx, by];
    }
    function prisma(g, s, o) {
        const t = o.t, hue = (t * 70) % 360, K = (v, a, b) => v < a ? a : v > b ? b : v;
        const C = (off, l, a) => 'hsla(' + ((hue + off) % 360) + ',95%,' + l + '%,' + (a == null ? 1 : a) + ')';
        const pal = o.pal, rbw = !!(pal && pal.rainbow), hexA = (h, a) => 'rgba(' + parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16) + ',' + a + ')';
        const OR = pal ? (rbw ? hsl(t * 80, 55) : pal.main) : SC.OR, ORL = pal ? (rbw ? hsl(t * 80 - 40, 80) : pal.lite) : SC.ORL, ORD = pal ? (rbw ? hsl(t * 80 + 40, 30) : pal.dark) : SC.ORD;
        const ORA = a => rbw ? hsl(t * 80, 55, a) : hexA(pal ? pal.main : '#ff6d1f', a);
        const tm = 'rgb(' + s.glow + ')', BK = SC.BK, look = K(o.look || 0, -.8, .8), wall = !!o.wall;
        const sF = K(o.susF == null ? (o.sus || 0) : o.susF, -1.2, 1.2), sR = K(o.susR == null ? (o.sus || 0) : o.susR, -1.2, 1.2);
        const air = !!o.air, boost = o.boosting ? 1 : 0, brake = o.brake && !air ? 1 : 0, mood = o.mood || '';
        const lean = K(o.lean || 0, -1, 1), spd = K((o.spin || 0) / 800, 0, 1), jt = o.jumpT == null ? 9 : o.jumpT;
        const vf = K((o.vf || 0) / 900, -1.2, 1.2), vu = K((o.vu || 0) / 900, -1.2, 1.2);
        const R = 11.5, rx = -33, fx = 34, wy = 5;
        // ---- chasis suspendido: el cuadro baja más o menos en cada extremo; las ruedas se quedan en el suelo ----
        const dyF = sF * 2.4, dyR = sR * 2.4, kS = (dyF - dyR) / (fx - rx), d0 = dyR - kS * rx;
        const PT = (x, y) => [x, y + kS * x + d0];
        const metal = (x0, y0, x1, y1) => { const m = g.createLinearGradient(x0, y0, x1, y1); m.addColorStop(0, '#f6f8ff'); m.addColorStop(.45, '#a3abcf'); m.addColorStop(1, '#3a4066'); return m; };
        const frame = (x0, y0, x1, y1) => { const m = g.createLinearGradient(x0, y0, x1, y1); m.addColorStop(0, '#c6ccdf'); m.addColorStop(.35, '#8a90aa'); m.addColorStop(1, '#4a4f6a'); return m; };
        const orange = (x0, y0, x1, y1) => { const m = g.createLinearGradient(x0, y0, x1, y1); m.addColorStop(0, ORL); m.addColorStop(.5, OR); m.addColorStop(1, ORD); return m; };
        g.lineCap = 'round'; g.lineJoin = 'round';
        // luz inferior cromática y propulsor
        const ug = g.createRadialGradient(0, 15, 2, 0, 15, 64);
        ug.addColorStop(0, boost ? 'rgba(255,150,60,.85)' : C(0, 60, .55)); ug.addColorStop(1, boost ? 'rgba(255,150,60,0)' : C(0, 60, 0));
        g.fillStyle = ug; g.beginPath(); g.ellipse(0, 15.5, 64, 9, 0, 0, TAU); g.fill();
        if (spd > .35) for (let k = 0; k < 2; k++) {      // estela de luz de los neones a gran velocidad
            const L = 20 + spd * 36, sx0 = -6 - k * 8, lg = g.createLinearGradient(sx0, 0, sx0 - L, 0);
            lg.addColorStop(0, 'rgba(' + s.glow + ',' + (.55 * spd) + ')'); lg.addColorStop(1, 'rgba(' + s.glow + ',0)');
            g.strokeStyle = lg; g.lineWidth = 1.3 - k * .4; g.beginPath(); g.moveTo(sx0, 15.6 + k * 1.4); g.lineTo(sx0 - L, 15.6 + k * 1.4); g.stroke();
        }
        flame(g, -44, 4, 38, 5.5, o.boosting, t, false);
        if (boost) for (let i = 0; i < 4; i++) {          // humo caliente tras el turbo
            const ph = (t * 1.7 + i * .25) % 1; g.fillStyle = 'rgba(70,74,100,' + (.26 * (1 - ph)) + ')'; g.beginPath(); g.arc(-50 - ph * 26, 1 - ph * 12 + Math.sin(i * 2.7 + t * 3) * 2, 3 + ph * 6, 0, TAU); g.fill();
        }
        if (boost) glowDot(g, -43, 4, 15 + Math.sin(t * 40) * 3, '255,255,255', .45);       // destello del turbo
        if (boost) {
            flame(g, -44, 6.8, 26, 3.4, true, t + .3, false); glowDot(g, -41, 5, 18, '255,160,60', .55);
            for (let i = 0; i < 6; i++) { const ph = (t * 5 + i * .17) % 1; glowDot(g, -46 - ph * 30, 5 + Math.sin(i * 5.1 + t * 8) * 5 * ph, 1.8 * (1 - ph) + .6, '255,210,120', .9 * (1 - ph)); }
        }
        if (boost) for (let i = 0; i < 4; i++) {                       // líneas de velocidad
            const ph = (t * 3 + i * .27) % 1;
            g.strokeStyle = 'rgba(255,255,255,' + (.5 * (1 - ph)) + ')'; g.lineWidth = .9;
            g.beginPath(); g.moveTo(-46 - ph * 26, -18 + i * 10 - ph * 1.5); g.lineTo(-58 - ph * 30, -18 + i * 10 - ph * 1.5); g.stroke();
        }
        if (brake && (o.spin || 0) > 160) for (let i = 0; i < 5; i++) {        // chispas del freno
            const ph = (t * 6 + i * .21) % 1;
            glowDot(g, rx - 3 - ph * 14 * (.6 + i * .15), 16 - ph * 7 - Math.sin(i * 2.3) * 3, 2.4 * (1 - ph) + .7, '255,170,60', .95 * (1 - ph));
        }

        // polvo (o nieve) que levantan las ruedas y chispas de los aterrizajes duros
        if (!air && (o.spin || 0) > 300) for (let i = 0; i < 5; i++) {
            const ph = (t * 2.6 + i * .2) % 1, a = .3 * (1 - ph) * K(((o.spin || 0) - 300) / 500, 0, 1);
            g.fillStyle = 'rgba(214,226,255,' + a + ')'; g.beginPath(); g.arc(rx - 5 - ph * 20, 15.6 - ph * 7 - Math.sin(i * 3.1) * 1.5, 1.6 + ph * 3.6, 0, TAU); g.fill();
        }
        if (wall && (o.spin || 0) > 220) for (const x of [rx, fx]) for (let i = 0; i < 4; i++) {      // chispas al rozar pared o rampa
            const ph = (t * 7 + i * .26 + (x > 0 ? .13 : 0)) % 1;
            glowDot(g, x + (x > 0 ? -1 : 1) * ph * 12, 15.6 - ph * 9 * (.5 + (i % 3) * .3), 1.8 * (1 - ph) + .5, '255,200,110', .9 * (1 - ph));
        }
        if (brake && !air && (o.spin || 0) > 160) { g.strokeStyle = 'rgba(8,8,14,.55)'; g.lineWidth = 1.7; g.beginPath(); g.moveTo(rx + 2, 16.6); g.lineTo(rx - 34, 16.6); g.stroke(); g.lineWidth = 1.2; g.beginPath(); g.moveTo(fx + 2, 16.6); g.lineTo(fx - 26, 16.6); g.stroke(); }      // huella de frenada
        const hardHit = Math.max(sF, sR);
        if (hardHit > .75) {
            const f = K((hardHit - .75) * 4, 0, 1); g.lineCap = 'round';
            g.strokeStyle = 'rgba(255,255,255,' + f * .5 + ')'; g.lineWidth = .9; for (const x of [rx, fx]) { g.beginPath(); g.ellipse(x, 16.4, 9 + f * 16, 2 + f * 3, 0, 0, TAU); g.stroke(); }      // onda de choque
            for (const x of [rx, fx]) for (let i = 0; i < 6; i++) {
                const a = Math.PI * (.1 + i * .16), r0 = 3, r1 = 7 + f * 7 + (i % 2) * 3;
                g.strokeStyle = 'rgba(255,214,130,' + f * .95 + ')'; g.lineWidth = .8;
                g.beginPath(); g.moveTo(x + Math.cos(a) * r0 * (i < 3 ? 1 : -1), 16.4 - Math.sin(a) * r0); g.lineTo(x + Math.cos(a) * r1 * (i < 3 ? 1 : -1), 16.4 - Math.sin(a) * r1 * .8); g.stroke();
            }
        }
        // ---------- rueda todoterreno ----------
        const wheelS = (x, rear) => {
            g.save(); g.translate(x, wy);
            g.fillStyle = '#07080f'; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
            g.save(); g.rotate(o.wheel);
            for (let i = 0; i < 22; i++) {                              // tacos de campo
                g.save(); g.rotate(i * TAU / 22);
                g.fillStyle = '#1b2033'; g.fillRect(R - 2.7, -1.15, 2.7, 2.3); g.fillStyle = '#343b5a'; g.fillRect(R - 2.7, -1.15, 2.7, .55);
                g.fillStyle = '#12162a'; g.fillRect(R - 4.3, i % 2 ? -.7 : -1.6, 1.7, 1.3);
                g.restore();
            }
            if (!air && o.spin > 260) { g.fillStyle = 'rgba(112,84,52,' + K((o.spin - 260) / 1200, 0, .6) + ')'; for (let i = 0; i < 9; i++) { g.save(); g.rotate(i * 2.4); g.beginPath(); g.arc(R - 1.6, (i % 3 - 1) * .8, .9 + (i % 2) * .5, 0, TAU); g.fill(); g.restore(); } }       // barro
            g.fillStyle = 'rgba(230,235,255,.55)'; g.font = '700 1.9px sans-serif'; g.textAlign = 'center'; for (let i = 0; i < 4; i++) { g.save(); g.rotate(.9 + i * .19); g.translate(R - 4.1, 0); g.rotate(Math.PI / 2); g.fillText('VOLT'[i], 0, 0); g.restore(); } g.textAlign = 'start';       // rótulo del flanco
            g.strokeStyle = 'rgba(140,150,200,.28)'; g.lineWidth = .6; g.setLineDash([1.6, 1.1]); g.beginPath(); g.arc(0, 0, R - 5.1, 0, TAU); g.stroke(); g.setLineDash([]);
            g.restore();
            g.strokeStyle = 'rgba(190,200,245,.3)'; g.lineWidth = .6; g.beginPath(); g.arc(0, 0, R - 2.9, 0, TAU); g.stroke();
            g.fillStyle = '#0b0d17'; g.beginPath(); g.arc(0, 0, R * .6, 0, TAU); g.fill();
            g.strokeStyle = orange(-R, -R, R, R); g.lineWidth = R * .08; g.beginPath(); g.arc(0, 0, R * .585, 0, TAU); g.stroke();      // aro naranja
            g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = .5; g.beginPath(); g.arc(0, 0, R * .585, Math.PI * 1.1, Math.PI * 1.45); g.stroke();
            g.save(); g.rotate(o.wheel);
            g.fillStyle = '#151a2e'; g.beginPath(); g.arc(0, 0, R * .5, 0, TAU); g.fill();
            if (!rear) {                                                // disco flotante ranurado
                g.fillStyle = '#b9c0dc'; g.beginPath(); g.arc(0, 0, R * .46, 0, TAU); g.arc(0, 0, R * .26, 0, TAU, true); g.fill('evenodd');
                g.strokeStyle = '#2b3150'; g.lineWidth = R * .035;
                for (let i = 0; i < 14; i++) { const a = i * TAU / 14; g.beginPath(); g.moveTo(Math.cos(a) * R * .3, Math.sin(a) * R * .3); g.lineTo(Math.cos(a + .25) * R * .43, Math.sin(a + .25) * R * .43); g.stroke(); }
                g.fillStyle = '#8f96b4'; for (let i = 0; i < 6; i++) { const a = i * TAU / 6; g.beginPath(); g.arc(Math.cos(a) * R * .22, Math.sin(a) * R * .22, R * .035, 0, TAU); g.fill(); }
            } else {                                                    // tapa del motor de buje con grafismo naranja
                const sq = [[.3, .0, .16], [.34, 1.2, .11], [.26, 2.4, .13], [.36, 3.6, .09], [.3, 4.7, .12], [.22, 5.6, .08]];
                for (const q of sq) { g.save(); g.rotate(q[1]); g.strokeStyle = OR; g.lineWidth = .55; g.strokeRect(R * q[0], -R * q[2] / 2, R * q[2], R * q[2]); g.fillStyle = ORA('.55'); g.fillRect(R * q[0] + R * q[2] * .25, -R * q[2] * .25, R * q[2] * .5, R * q[2] * .5); g.restore(); }
                g.strokeStyle = ORA('.7'); g.lineWidth = .5; g.beginPath(); g.arc(0, 0, R * .42, .3, 2.2); g.stroke();
            }
            g.restore();
            g.save(); g.rotate(o.wheel);
            g.fillStyle = rear ? '#1c2036' : '#101322'; g.beginPath(); g.arc(0, 0, R * .17, 0, TAU); g.fill(); g.restore();
            bolt(g, 0, 0, R * .11);
            if (!rear) {                                                // pinza de freno fija
                g.fillStyle = '#10121d'; g.beginPath(); g.arc(0, 0, R * .5, -1.5, -.55); g.arc(0, 0, R * .3, -.55, -1.5, true); g.closePath(); g.fill();
                g.fillStyle = OR; g.beginPath(); g.arc(0, 0, R * .49, -1.4, -.8); g.arc(0, 0, R * .38, -.8, -1.4, true); g.closePath(); g.fill();
                if (brake && o.spin > 120) { glowDot(g, 0, 0, R * .75, '255,90,40', .55); g.strokeStyle = 'rgba(255,120,50,.85)'; g.lineWidth = R * .07; g.beginPath(); g.arc(0, 0, R * .36, 0, TAU); g.stroke(); }       // disco al rojo
            }
            if (o.spin > 380) { g.strokeStyle = 'rgba(210,220,255,' + Math.min(.3, (o.spin - 380) / 1700) + ')'; g.lineWidth = R * .5; g.beginPath(); g.arc(0, 0, R * .55, 0, TAU); g.stroke(); }
            g.restore();
        };
        wheelS(rx, true);
        if (boost) glowDot(g, rx, wy, 11, '255,150,60', .45 + .2 * Math.sin(t * 30));       // motor de buje al rojo con el turbo

        // ---------- guardabarros trasero grande ----------
        g.fillStyle = '#0d0f1a'; g.beginPath(); g.arc(rx, wy, R + 3.6, Math.PI * .96, Math.PI * 1.88); g.arc(rx, wy, R + .9, Math.PI * 1.88, Math.PI * .96, true); g.closePath(); g.fill();
        g.fillStyle = '#0d0f1a'; g.beginPath(); g.moveTo(rx - R - 3.4, wy - 1); g.lineTo(rx - R - 7.5, wy + 3.8); g.lineTo(rx - R - 4.4, wy + 5.2); g.lineTo(rx - R - .2, wy + 1.4); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(160,170,220,.5)'; g.lineWidth = .7; g.beginPath(); g.arc(rx, wy, R + 3.1, Math.PI * 1.08, Math.PI * 1.7); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = .5; for (let i = 0; i < 6; i++) { const a = Math.PI * (1.2 + i * .1); g.beginPath(); g.moveTo(rx + Math.cos(a) * (R + 1.4), wy + Math.sin(a) * (R + 1.4)); g.lineTo(rx + Math.cos(a) * (R + 3.3), wy + Math.sin(a) * (R + 3.3)); g.stroke(); }
        { const da = Math.PI * 1.34; g.save(); g.translate(rx + Math.cos(da) * (R + 2.4), wy + Math.sin(da) * (R + 2.4)); g.rotate(da + Math.PI / 2); g.fillStyle = OR; g.font = '700 3px sans-serif'; g.textAlign = 'center'; g.fillText(o.dorsal || '07', 0, 1); g.textAlign = 'start'; g.restore(); }       // dorsal
        g.fillStyle = '#ff3b2a'; rrect(g, rx - R - 7.1 - brake * 2.6, wy + 1.8, 2.2 + brake * 2.6, 3.2, .8); g.fill();
        if (air && Math.sin(t * 14) > 0) { glowDot(g, rx - R - 6, wy + 3.4, 11, '255,60,40', .9); glowDot(g, fx + R + 1, wy - 5, 8, '255,190,60', .9); }      // luces de posición parpadeando en el aire
        glowDot(g, rx - R - 6, wy + 3.4, brake ? 12 : 6, '255,50,40', brake ? .9 : .35);

        // ---------- basculante trasero: brazo de aluminio con corte naranja ----------
        const pvR = PT(-16, 9.2), axR = [rx, wy];
        limb(g, pvR[0], pvR[1], axR[0], axR[1], 7, 5.2, '#10121d');
        limb(g, pvR[0], pvR[1], axR[0], axR[1], 5.6, 3.9, frame(rx, wy - 4, -16, 12));
        limb(g, pvR[0] - 2.4, pvR[1] - .5, axR[0] + 2.2, axR[1] - .3, 1.2, 1.2, 'rgba(255,255,255,.35)');
        const asr = Math.atan2(axR[1] - pvR[1], axR[0] - pvR[0]);
        for (let i = 0; i < 3; i++) { const u = .3 + i * .2, cx = pvR[0] + (axR[0] - pvR[0]) * u, cy = pvR[1] + (axR[1] - pvR[1]) * u; g.save(); g.translate(cx, cy); g.rotate(asr); g.fillStyle = OR; g.fillRect(-1.5 + i * .3, -1.2, 2.6 - i * .5, 2.4); g.restore(); }
        bolt(g, axR[0], axR[1], 1.9); bolt(g, pvR[0], pvR[1], 2.1);
        // bieleta (balancín) que abre y cierra con la compresión
        const rkc = [pvR[0] + (axR[0] - pvR[0]) * .42, pvR[1] + (axR[1] - pvR[1]) * .42];
        const rkA = Math.atan2(PT(-17, -2)[1] - rkc[1], PT(-17, -2)[0] - rkc[0]) + sR * .22;
        const rk2 = [rkc[0] + Math.cos(rkA) * 6.5, rkc[1] + Math.sin(rkA) * 6.5];
        limb(g, rkc[0], rkc[1], rk2[0], rk2[1], 3.2, 2.6, '#12141f'); limb(g, rkc[0], rkc[1], rk2[0], rk2[1], 2, 1.4, orange(rkc[0], rkc[1], rk2[0], rk2[1]));
        bolt(g, rkc[0], rkc[1], 1.15); bolt(g, rk2[0], rk2[1], 1.1);
        // amortiguador trasero con depósito, muelle, tope y anillo de precarga
        const shU = PT(-18.2, -9.4), shL = [pvR[0] + (axR[0] - pvR[0]) * .6, pvR[1] + (axR[1] - pvR[1]) * .6 - 2.6];
        const drawRearShock = () => {
            const dx = shL[0] - shU[0], dy = shL[1] - shU[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, px = -uy, py = ux;
            const at = (u, off) => [shU[0] + dx * u + px * (off || 0), shU[1] + dy * u + py * (off || 0)];
            const a0 = at(.08), a1 = at(.3);                              // cuerpo superior (varilla cromada)
            limb(g, a0[0], a0[1], a1[0], a1[1], 1.5, 1.5, metal(a0[0], a0[1], a1[0] + 2, a1[1]));
            const b0 = at(.56), b1 = at(.97);                              // cilindro del amortiguador
            limb(g, b0[0], b0[1], b1[0], b1[1], 3.7, 3.7, '#0b0d17'); limb(g, b0[0], b0[1], b1[0], b1[1], 2.8, 2.8, 'rgba(120,130,175,.5)');
            for (let i = 0; i < 7; i++) { const q = at(.58 + i * .052); g.strokeStyle = i % 2 ? 'rgba(200,210,245,.55)' : 'rgba(10,12,24,.8)'; g.lineWidth = .55; g.beginPath(); g.moveTo(q[0] + px * 2.1, q[1] + py * 2.1); g.lineTo(q[0] - px * 2.1, q[1] - py * 2.1); g.stroke(); }       // aletas
            const dep0 = at(.62, 4.4), dep1 = at(.92, 4.4);                // depósito piggyback
            limb(g, dep0[0], dep0[1], dep1[0], dep1[1], 3, 3, '#12141f'); limb(g, dep0[0], dep0[1], dep1[0], dep1[1], 2.1, 2.1, orange(dep0[0], dep0[1], dep1[0], dep1[1]));
            const cp = at(.62, 2.2); limb(g, cp[0], cp[1], dep0[0], dep0[1], 1.1, 1.1, '#9aa1c2');
            const sp0 = at(.3), sp1 = at(.56);
            spring(g, sp0[0], sp0[1], sp1[0], sp1[1], 4, 4.8, OR, 'rgba(255,230,200,.9)', 1.3);
            const ring = at(.3); g.save(); g.translate(ring[0], ring[1]); g.rotate(Math.atan2(dy, dx)); g.fillStyle = '#c9cfe6'; g.fillRect(-.7, -4.7, 1.4, 9.4); g.restore();
            const rg = at(.56); g.save(); g.translate(rg[0], rg[1]); g.rotate(Math.atan2(dy, dx)); g.fillStyle = '#5a607c'; g.fillRect(-.6, -4.7, 1.2, 9.4); g.restore();
            // fuelle de goma sobre la varilla, tope de compresión, marcas de recorrido y visor de aceite
            for (let i = 0; i < 5; i++) { const q = at(.1 + i * .04), w = 1.5 + (i % 2 ? .5 : 1.1); g.save(); g.translate(q[0], q[1]); g.rotate(Math.atan2(dy, dx)); g.fillStyle = i % 2 ? '#1b2036' : '#0b0d17'; g.fillRect(-.9, -w, 1.8, w * 2); g.restore(); }
            const bs = at(.275); g.save(); g.translate(bs[0], bs[1]); g.rotate(Math.atan2(dy, dx)); g.fillStyle = '#ffb347'; g.fillRect(-1.3, -2.6, 2.6, 5.2); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-1.3, -2.6, .7, 5.2); g.restore();
            for (let i = 0; i < 6; i++) { const q = at(.64 + i * .05, 1.4); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = .4; g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[0] + px * (i % 2 ? .8 : 1.4), q[1] + py * (i % 2 ? .8 : 1.4)); g.stroke(); }
            const sg = at(.77, 4.4); g.fillStyle = '#05060d'; g.beginPath(); g.arc(sg[0], sg[1], 1.5, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,190,80,.95)'; g.beginPath(); g.arc(sg[0], sg[1], 1, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(sg[0] - .3, sg[1] - .3, .35, 0, TAU); g.fill();
            if (sR > .85) { const f = K((sR - .85) * 5, 0, 1); glowDot(g, shL[0], shL[1], 12, '255,170,60', f * .8); glowDot(g, shU[0], shU[1], 9, '255,230,170', f * .6); }
            bolt(g, shU[0], shU[1], 1.5); bolt(g, shL[0], shL[1], 1.3);
        };

        // ---------- chasis, columna y manillar (suspendidos) ----------
        g.save(); g.transform(1, kS, 0, 1, 0, d0);
        // soporte y pisadera trasera elevada
        g.fillStyle = frame(-30, -2, -18, 10); g.beginPath(); g.moveTo(-29, 9); g.lineTo(-27, 1); g.lineTo(-20, 1); g.lineTo(-17, 9); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(5,7,16,.8)'; g.lineWidth = .8; g.stroke();
        g.fillStyle = '#0c0e19'; g.beginPath(); g.moveTo(-38, -1.8); g.lineTo(-37, -3.6); g.lineTo(-24, -3.6); g.lineTo(-18.5, 0.6); g.lineTo(-18.5, 2.2); g.lineTo(-37.4, 1.6); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(150,160,215,.55)'; g.lineWidth = .5; for (let x = -35; x < -21; x += 2.3) { g.beginPath(); g.moveTo(x, -3.3); g.lineTo(x + 1.3, 1); g.stroke(); }
        g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(-37, -3.6, 13, .5);
        g.fillStyle = '#ff3b2a'; g.fillRect(-38.6, -1.6, 1.8, 2.8); glowDot(g, -38, -.2, brake ? 14 : 6, '255,50,40', brake ? .95 : .4);
        g.fillStyle = OR; g.fillRect(-26, 3.2, 2.2, 2.2); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(-26, 3.2, 2.2, .5);
        g.fillStyle = frame(-24, -10, -14, 8); g.beginPath(); g.moveTo(-23.5, 7.4); g.lineTo(-20.6, -9.6); g.lineTo(-16.4, -9.2); g.lineTo(-16.8, 7.4); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(5,7,16,.85)'; g.lineWidth = .8; g.stroke(); g.fillStyle = '#0b0d17'; g.beginPath(); g.moveTo(-21, 4); g.lineTo(-19.6, -4.6); g.lineTo(-18.2, -4.4); g.lineTo(-19, 4); g.closePath(); g.fill();
        // cuerpo de la batería / plataforma
        const body = () => { g.beginPath(); g.moveTo(-19, 7.2); g.lineTo(18, 7.2); g.lineTo(18, 13); g.quadraticCurveTo(18, 14.6, 16.4, 14.6); g.lineTo(-17.4, 14.6); g.quadraticCurveTo(-19, 14.6, -19, 13); g.closePath(); };
        body(); g.fillStyle = frame(0, 7, 0, 15); g.fill();
        g.save(); body(); g.clip();
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-20, 12.8, 40, 2);
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-19, 8.4, 38, .6);
        g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = .25; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(-19, 8.8 + i * .62); g.lineTo(18, 8.8 + i * .62 + (i % 2) * .2); g.stroke(); }      // aluminio cepillado
        { const bx = ((t * 18) % 70) - 25, bg = g.createLinearGradient(bx - 5, 0, bx + 5, 0); bg.addColorStop(0, 'rgba(255,255,255,0)'); bg.addColorStop(.5, 'rgba(255,255,255,.22)'); bg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = bg; g.fillRect(bx - 5, 7.4, 10, 7); }
        // grafismo naranja de cuadrados (pixel) en la zona trasera y delantera
        const px = [[-16, 9.4, 3], [-12.6, 10.4, 2.2], [-9.6, 9, 1.6], [-8, 11.2, 2.6], [-4.6, 12, 1.4], [-18, 12.4, 1.6], [13, 9.6, 2], [15.4, 11.4, 1.6], [10.6, 11.6, 1.4]];
        for (const q of px) { g.fillStyle = ORA('.9'); g.fillRect(q[0], q[1], q[2], q[2] * .8); }
        g.strokeStyle = ORA('.8'); g.lineWidth = .5; g.strokeRect(-14.6, 8.7, 5, 3.8); g.strokeRect(-7, 9.8, 4, 3);
        g.fillStyle = '#d3d8ec'; g.fillRect(-1.6, 9.2, 9.6, 3.4); g.fillStyle = 'rgba(10,12,28,.7)'; for (let i = 0; i < 4; i++) g.fillRect(-.8, 9.9 + i * .75, 6 + (i % 2) * 1.6, .35);   // placa de datos
        { const lv = boost ? 2 + (Math.sin(t * 6) > 0 ? 1 : 0) : 4; g.fillStyle = '#05070f'; g.fillRect(8.6, 8.35, 6.2, 1.5); for (let i = 0; i < 4; i++) { g.fillStyle = i < lv ? (lv < 3 ? '#ff5a5a' : '#56ffb0') : 'rgba(255,255,255,.16)'; g.fillRect(8.9 + i * 1.5, 8.6, 1.1, 1); } }      // indicador de batería
        g.restore();
        body(); g.lineWidth = .9; g.strokeStyle = 'rgba(5,8,22,.85)'; g.stroke();
        // alfombrilla de goma con perfil en V y logotipo naranja
        const mat = () => rrect(g, -19, 4.6, 37, 3.4, 1.2);
        mat(); g.fillStyle = '#0a0c16'; g.fill();
        g.save(); mat(); g.clip();
        g.strokeStyle = 'rgba(150,160,215,.32)'; g.lineWidth = .55;
        for (let x = -18; x < 18; x += 2.2) { g.beginPath(); g.moveTo(x, 4.6); g.lineTo(x + 1.1, 6.3); g.lineTo(x, 8); g.stroke(); }
        g.fillStyle = ORA('.95'); g.fillRect(-16.5, 5.2, 4.6, 2.2); g.fillStyle = '#0a0c16'; g.font = '700 2px sans-serif'; g.fillText('PV', -15.8, 6.9);
        const sx = ((t * 46) % 120) - 40, sg = g.createLinearGradient(sx - 8, 0, sx + 8, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.35)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = sg; g.fillRect(sx - 8, 4, 16, 5);
        g.restore();
        mat(); g.lineWidth = .8; g.strokeStyle = 'rgba(5,8,22,.9)'; g.stroke();
        g.fillStyle = OR; g.fillRect(-18.5, 7.9, 36, .55);
        // tira LED cromática bajo el chasis
        const led = g.createLinearGradient(-18, 0, 18, 0); led.addColorStop(0, C(0, 62)); led.addColorStop(.33, C(100, 62)); led.addColorStop(.66, C(200, 62)); led.addColorStop(1, C(300, 62));
        g.fillStyle = led; rrect(g, -16, 14.9, 32, 1.2, .6); g.fill(); glowDot(g, 0, 15.6, 26, boost ? '255,170,80' : '255,255,255', .12 + boost * .3);
        // cable de la batería y pestillo del soporte plegado
        g.strokeStyle = '#0b0d17'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-19, 11); g.quadraticCurveTo(-22, 11.5, -25, 8.5); g.stroke();
        limb(g, -1, 15.5, -10.6, 16.2, 2, 1.6, '#10121d'); limb(g, -1.4, 15.2, -10.2, 15.8, .9, .7, '#aab2cf'); g.fillStyle = OR; rrect(g, -12.8, 15.4, 2.9, 1.8, .7); g.fill(); spring(g, -3, 14.7, -6.6, 15.3, 3, .8, '#c2c8de', '#fff', .45); bolt(g, -1, 15.5, 1);      // soporte lateral plegado con muelle

        // cuello delantero con ranura para el amortiguador y reflector
        const neck = () => { g.beginPath(); g.moveTo(15, 8); g.lineTo(18.6, -10.4); g.lineTo(27.6, -10.4); g.lineTo(26.6, -1); g.lineTo(23.6, 8); g.closePath(); };
        neck(); g.fillStyle = frame(14, -10, 28, 8); g.fill(); g.lineWidth = .9; g.strokeStyle = 'rgba(5,8,22,.85)'; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(18.6, -10.4, 9, .6);
        g.fillStyle = '#0b0d17'; g.beginPath(); g.moveTo(19.6, 4.8); g.lineTo(21.4, -5.8); g.lineTo(24.2, -5.8); g.lineTo(22.8, 4.8); g.closePath(); g.fill();
        g.fillStyle = OR; g.fillRect(16.6, 1.2, 2.2, 3.4); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(16.6, 1.2, 2.2, .6);
        bolt(g, 20.8, 6.2, 1.2); bolt(g, 24.4, -8, 1.1);
        // faro delantero
        g.fillStyle = '#0b0d17'; rrect(g, 24, -8.6, 5.4, 4.2, 1.4); g.fill();
        const hl = g.createLinearGradient(26, -8, 29, -5); hl.addColorStop(0, '#ffffff'); hl.addColorStop(1, '#ffe7a0'); g.fillStyle = hl; g.beginPath(); g.arc(27.2, -6.5, 1.5, 0, TAU); g.fill();
        g.fillStyle = 'rgba(' + s.glow + ',.95)'; g.fillRect(24.6, -5.2, 4, .6); g.strokeStyle = C(60, 72, .85); g.lineWidth = .5; g.beginPath(); g.arc(27.2, -6.5, 2.3, 0, TAU); g.stroke(); glowDot(g, 27.2, -6.5, 9, '255,240,200', .45); headlight(g, 29.6, -6.5, 92);
        // articulación plegable de la columna: bisagra, pestillo y tornillos
        g.fillStyle = '#0b0d17'; rrect(g, 19, -17.6, 9.6, 7.6, 1.6); g.fill();
        g.fillStyle = frame(19, -17, 28, -10); rrect(g, 19.8, -17, 7.8, 5.6, 1.2); g.fill();
        g.fillStyle = '#10121d'; g.beginPath(); g.moveTo(18.8, -15.4); g.quadraticCurveTo(15.2, -15.4, 15.4, -19.6); g.lineTo(17.2, -19.2); g.quadraticCurveTo(17.2, -16.8, 19.8, -16.6); g.closePath(); g.fill();   // pestillo
        g.strokeStyle = '#9aa1c2'; g.lineWidth = .5; g.beginPath(); g.moveTo(15.8, -19); g.lineTo(17, -18.8); g.stroke();
        bolt(g, 21.4, -14.6, 1); bolt(g, 25.8, -14.6, 1); bolt(g, 23.6, -11.4, .9);
        // columna negra con grafismos naranjas (rake hacia atrás)
        const sb = [24, -17.2], st = [13.4, -35.4];
        limb(g, sb[0], sb[1], st[0], st[1], 5.6, 4.8, '#07080f');
        limb(g, sb[0] - .5, sb[1] - .4, st[0] - .4, st[1] + .4, 3.6, 3, '#171b2c');
        const sa = Math.atan2(st[1] - sb[1], st[0] - sb[0]);
        g.save(); g.translate(sb[0], sb[1]); g.rotate(sa);
        g.fillStyle = OR; g.fillRect(3.4, -1.6, 4.4, 3.2); g.fillStyle = '#0a0b13'; g.font = '700 2.6px sans-serif'; g.fillText('PV', 4.1, .9); g.fillStyle = OR; g.fillRect(9.4, -.8, 1.6, 1.6); g.fillRect(12.4, -1.8, 2.8, 2.2);
        g.strokeStyle = OR; g.lineWidth = .5; g.strokeRect(4.2, -2.1, 6.4, 3.6); g.beginPath(); g.moveTo(16.4, -1.8); g.lineTo(19.8, 1.4); g.lineTo(19.8, -.6); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(2, -2.3, 18, .45);
        g.restore();
        // cables del manillar al cuello (con holgura que se mueve con la suspensión)
        const sw = Math.sin(t * 3) * .25 + (sF + sR) * 1.2;
        for (let i = 0; i < 3; i++) {
            g.strokeStyle = i === 1 ? '#2a2f48' : '#0b0d17'; g.lineWidth = .85;
            g.beginPath(); g.moveTo(23.6 - i * .5, -33.6); g.bezierCurveTo(31 + i * 1.6 + sw, -29 + i, 31.4 + sw * 1.4, -20 - i, 27.4 - i * .5, -16.6); g.stroke();
        }
        // manillar: puño, maneta de freno, pantalla, mandos y correa naranja colgando
        const grip = [[15, -36.6], [24.4, -35]];
        limb(g, st[0] + 1, st[1] - 1.2, grip[1][0] + 2, grip[1][1], 2.8, 2.8, '#07080f');
        limb(g, grip[0][0] + 5, grip[0][1] + .4, grip[1][0] + 4.6, grip[1][1] - .2, 3.2, 3.2, '#0c0e19');
        g.strokeStyle = 'rgba(150,160,215,.35)'; g.lineWidth = .45; for (let i = 0; i < 6; i++) { const x = grip[0][0] + 6.6 + i * 1.7; g.beginPath(); g.moveTo(x, -38); g.lineTo(x - .3, -35.2); g.stroke(); }
        g.fillStyle = '#0c0e19'; rrect(g, 23.4, -37.6, 2.2, 3.6, 1); g.fill();
        g.strokeStyle = '#aab2cf'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(22, -34); g.quadraticCurveTo(28.4, -33.6, 30.4, -28.6); g.stroke();
        g.strokeStyle = OR; g.lineWidth = 1.3; g.beginPath(); g.moveTo(29.5, -30.4); g.lineTo(30.4, -28.6); g.stroke();
        g.fillStyle = '#12141f'; rrect(g, 20.4, -35, 4, 2.6, 1); g.fill(); g.fillStyle = '#ff3b2a'; g.fillRect(21.2, -34.4, 1.4, 1.2); g.fillStyle = OR; g.fillRect(23, -34.4, 1, 1.2);
        limb(g, 22.8, -37.6, 27.6, -36.6, 1.9, 1.7, '#161a2b'); g.fillStyle = OR; g.beginPath(); g.arc(27.7, -36.6, 1, 0, TAU); g.fill();      // acelerador de pulgar
        bolt(g, 21.2, -32.6, .8); bolt(g, 18.4, -33.4, .7);      // botón de claxon y abrazadera
        g.save(); g.translate(7.4, -45.4); g.rotate(-.12); g.scale(1.22, 1.22);
        g.fillStyle = '#0a0c16'; rrect(g, 0, 0, 12.6, 6.8, 1.5); g.fill(); g.strokeStyle = 'rgba(150,160,215,.5)'; g.lineWidth = .5; rrect(g, 0, 0, 12.6, 6.8, 1.5); g.stroke();
        g.fillStyle = '#05070f'; g.fillRect(.9, .9, 10.8, 5);
        const dsp = Math.round(spd * 38);
        for (let i = 0; i < 6; i++) { g.fillStyle = (i < 1 + spd * 5 || boost) ? (i > 4 ? '#ff5a5a' : 'rgba(' + s.glow + ',.95)') : 'rgba(255,255,255,.14)'; g.fillRect(1.6 + i * 1.5, 5.4 - i * .6, 1.05, 1 + i * .6); }
        g.fillStyle = '#e8ecff'; g.font = '700 2.6px monospace'; g.textBaseline = 'alphabetic'; g.fillText(String(dsp), 10.2 - String(dsp).length * 0.45, 2.7);
        g.fillStyle = boost ? OR : '#56ffb0'; g.fillRect(8.8, 3.5, 2.4, 1.1); g.fillRect(11.4, 3.8, .4, .5);
        g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(1.2, 1.1, 5, .45);
        g.save(); g.beginPath(); g.rect(.9, .9, 10.8, 5); g.clip(); { const gx = -4 + ((t * .35 + spd * t * .4) % 1) * 20; g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(gx, 6.2); g.lineTo(gx + 4, .6); g.stroke(); } g.restore();     // reflejo en el cristal
        g.restore();
        // correa naranja con grafismo, se balancea con la aceleración
        g.save(); g.translate(17.5, -30); g.rotate(-lean * .5 + Math.sin(t * 5 + 1) * .08 * (.3 + spd) + (air ? vu * .3 : 0));
        g.fillStyle = '#10121d'; rrect(g, -1.7, -.4, 3.4, 1.2, .5); g.fill();
        g.fillStyle = orange(0, 0, 0, 12); g.beginPath(); g.moveTo(-1.6, .4); g.lineTo(1.6, .4); g.lineTo(1.6, 11); g.lineTo(0, 12.6); g.lineTo(-1.6, 11); g.closePath(); g.fill();
        g.fillStyle = 'rgba(10,12,24,.8)'; g.fillRect(-.9, 3, 1.4, 1.2); g.fillRect(-.9, 6.2, 1.8, 1.1); g.fillRect(-.4, 9, 1.2, 1.1);
        g.restore();
        g.restore();   // fin del chasis
        drawRearShock();

        // ---------- horquilla delantera de brazo: pivote en el cuello, brazo largo y amortiguador ----------
        wheelS(fx, false);
        const pvF = PT(18, 9.4), axF = [fx, wy];
        limb(g, pvF[0], pvF[1], axF[0], axF[1], 8, 6, '#10121d');
        limb(g, pvF[0], pvF[1], axF[0], axF[1], 6.4, 4.6, frame(18, 4, 34, 12));
        limb(g, pvF[0] + .6, pvF[1] - 2.4, axF[0] - 1, axF[1] - 2, 1.1, 1.1, 'rgba(255,255,255,.4)');
        const asf = Math.atan2(axF[1] - pvF[1], axF[0] - pvF[0]);
        for (let i = 0; i < 3; i++) { const u = .25 + i * .22, cx = pvF[0] + (axF[0] - pvF[0]) * u, cy = pvF[1] + (axF[1] - pvF[1]) * u; g.save(); g.translate(cx, cy); g.rotate(asf); g.fillStyle = OR; g.fillRect(-1.3, -1.4, 2.4 - i * .4, 2.8); g.restore(); }
        bolt(g, axF[0], axF[1], 2.1); bolt(g, pvF[0], pvF[1], 2.3);
        {   // amortiguador delantero entre el cuello y el brazo
            const U = PT(24.4, -9), A = [pvF[0] + (axF[0] - pvF[0]) * .78, pvF[1] + (axF[1] - pvF[1]) * .78 - 1];
            const dx = A[0] - U[0], dy = A[1] - U[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, px = -uy, py = ux;
            const at = (u, off) => [U[0] + dx * u + px * (off || 0), U[1] + dy * u + py * (off || 0)];
            const a0 = at(.05), a1 = at(.32); limb(g, a0[0], a0[1], a1[0], a1[1], 1.7, 1.7, metal(a0[0], a0[1], a1[0] + 2, a1[1]));
            const b0 = at(.58), b1 = at(.95); limb(g, b0[0], b0[1], b1[0], b1[1], 4, 4, '#0b0d17'); limb(g, b0[0], b0[1], b1[0], b1[1], 3, 3, 'rgba(120,130,175,.5)');
            const d0p = at(.62, 4.7), d1p = at(.92, 4.7); limb(g, d0p[0], d0p[1], d1p[0], d1p[1], 3, 3, '#12141f'); limb(g, d0p[0], d0p[1], d1p[0], d1p[1], 2.1, 2.1, orange(d0p[0], d0p[1], d1p[0], d1p[1]));
            const s0 = at(.32), s1 = at(.58); spring(g, s0[0], s0[1], s1[0], s1[1], 4, 4.9, OR, 'rgba(255,230,200,.9)', 1.3);
            const rr = at(.32); g.save(); g.translate(rr[0], rr[1]); g.rotate(Math.atan2(dy, dx)); g.fillStyle = '#c9cfe6'; g.fillRect(-.7, -4.2, 1.4, 8.4); g.restore();
            for (let i = 0; i < 4; i++) { const q = at(.08 + i * .05), w = 1.6 + (i % 2 ? .5 : 1.2); g.save(); g.translate(q[0], q[1]); g.rotate(Math.atan2(dy, dx)); g.fillStyle = i % 2 ? '#1b2036' : '#0b0d17'; g.fillRect(-.9, -w, 1.8, w * 2); g.restore(); }
            const bs = at(.3); g.save(); g.translate(bs[0], bs[1]); g.rotate(Math.atan2(dy, dx)); g.fillStyle = '#ffb347'; g.fillRect(-1.3, -2.8, 2.6, 5.6); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-1.3, -2.8, .7, 5.6); g.restore();
            for (let i = 0; i < 6; i++) { const q = at(.64 + i * .05, 1.6); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = .4; g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[0] + px * (i % 2 ? .8 : 1.4), q[1] + py * (i % 2 ? .8 : 1.4)); g.stroke(); }
            const sg = at(.78, 4.7); g.fillStyle = '#05060d'; g.beginPath(); g.arc(sg[0], sg[1], 1.5, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,190,80,.95)'; g.beginPath(); g.arc(sg[0], sg[1], 1, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(sg[0] - .3, sg[1] - .3, .35, 0, TAU); g.fill();
            if (sF > .85) { const f = K((sF - .85) * 5, 0, 1); glowDot(g, A[0], A[1], 12, '255,170,60', f * .8); glowDot(g, U[0], U[1], 9, '255,230,170', f * .6); }
            bolt(g, U[0], U[1], 1.5); bolt(g, A[0], A[1], 1.3);
        }
        // guardabarros delantero y reflector naranja
        g.strokeStyle = '#0d0f1a'; g.lineWidth = 2.6; g.beginPath(); g.arc(fx, wy, R + 2.3, Math.PI * 1.2, Math.PI * 1.74); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = .5; g.beginPath(); g.arc(fx, wy, R + 3.4, Math.PI * 1.26, Math.PI * 1.66); g.stroke();

        // ---------- piloto reactivo ----------
        g.save(); g.transform(1, kS, 0, 1, 0, d0);
        const hitA = o.hitT == null ? 9 : o.hitT, hitK = hitA < .3 ? Math.pow(1 - hitA / .3, 2) : 0, flip = !!o.flip, lose = mood === 'lose', win = mood === 'win';
        // ----- memoria del piloto: cada parte del cuerpo es un muelle amortiguado, así los cambios tienen inercia y rebote -----
        // (sin memoria, como en el garaje, se usan las posturas objetivo directamente)
        const M = o.rid || null, dtR = M ? K(t - (M.t == null ? t : M.t), 0, .05) : 0; if (M) M.t = t;
        const spr = (k, target, stiff, damp) => {
            if (!M || !dtR) return M && M[k] != null ? M[k] : target;
            let x = M[k] == null ? target : M[k], v = M[k + 'v'] || 0;
            v += ((target - x) * stiff - v * damp) * dtR; x += v * dtR; M[k] = x; M[k + 'v'] = v; return x;
        };
        const kick = (k, imp) => { if (M) M[k + 'v'] = (M[k + 'v'] || 0) + imp; };
        const ready = o.state === 'count', ballD = o.ballD == null ? 999 : o.ballD;
        // sucesos: despegue, aterrizaje (más fuerte cuanto más rápido caía), turbo, golpe al balón
        if (M) {
            if (M.air && !air) { kick('cr', 1.6 + (M.fall || 0) * 3.2); kick('an', .6 + (M.fall || 0) * 1.2); kick('hd', 1.5 + (M.fall || 0) * 2.5); }
            if (!M.air && air) { kick('an', -1); kick('hd', -1.2); }
            if (boost && !M.bst) { kick('an', 1.4); kick('hd', -1.5); }
            if (hitK > .7 && !M.hit) { kick('an', -2); kick('hd', -3); kick('cr', .8); M.hit = 1; } else if (hitK < .1) M.hit = 0;
            M.air = air; M.fall = air ? Math.max(0, -vu) : 0; M.bst = boost;
            M.idle = !air && spd < .06 && !ready && !win && !lose && !boost ? (M.idle || 0) + dtR : 0;
        }
        const idleT = M ? M.idle : 0;
        // en el aire el cuerpo compensa: hacia atrás al subir, hacia delante al caer
        const airK = air && !flip && jt > .18 ? K(vu, -1, 1) : 0;
        // el balón cerca y alto: se prepara para golpearlo (se agacha y adelanta el pecho)
        const strike = !air && ballD < 230 && look < -.15 ? K((230 - ballD) / 150, 0, 1) : 0;
        // celebración: puño en alto, los dos brazos arriba y señalar; al encajar: negar y mano al casco
        const cel = win ? Math.floor(t / 1.25) % 3 : -1, sad = lose ? (Math.floor(t / 1.4) % 2) : -1;
        // ----- objetivos de la postura -----
        // Proporciones de persona de pie sobre el patín: piernas casi rectas (cadera a ~20 del suelo), tronco de 18
        // y hombros a la altura del manillar. «crouch» 0 = de pie relajado, 1 = muy agachado.
        let cT = .14 + spd * .12 + boost * .34 + brake * .16 + hitK * .2 + strike * .22 + (wall ? .1 : 0);
        if (ready) cT = .3 + Math.max(0, Math.sin(t * 6)) * .08;                                       // flexiona un poco las rodillas antes del saque
        if (air) cT = jt < .14 ? .05 : flip ? .85 : vu > .25 ? .28 : vu < -.25 ? .5 : .38;            // al caer se prepara para el aterrizaje
        if (!air && win) cT = .06;
        if (!air && lose) cT = .34;
        // muelles casi críticamente amortiguados: llegan rápido y apenas rebotan
        const crouch = K(spr('cr', cT, 220, 27) + Math.max(0, (sF + sR) / 2) * .5, -.05, 1);
        let aT = .22 + spd * .1 + boost * .22 + lean * .26 - brake * .26 - hitK * .18 + strike * .16 + (ready ? .1 : 0) - airK * .12 + (flip ? .26 : 0);
        if (win) aT = cel === 1 ? .04 : .12; if (lose) aT = .42;
        const ang = spr('an', aT, 160, 23) + crouch * .3;
        const bob = air ? 0 : Math.sin(t * 2.4) * .25 * (1 - spd) + (idleT > 0 ? Math.sin(t * 1.3) * .25 : 0);         // respiración al estar parado
        const hop = !air && win && cel === 1 ? Math.abs(Math.sin(t * 7)) * 1.8 : 0;
        // la cadera se echa atrás al agacharse (como al sentarse) para no pasar de las puntas de los pies
        const hx = spr('hx', -5.6 - crouch * 2.6 + lean * 2.4 + boost * 1.2 - brake * 2.2 + strike * 1 - (lose ? 1 : 0) + (idleT > 0 ? Math.sin(t * .9) * .6 : 0), 150, 22);
        const hy = -16.6 + crouch * 7.6 + bob - hop + (lose ? 1.2 : 0);
        const curl = .6 + crouch * 1.8 + (lose ? 1.2 : 0) - (win ? .4 : 0);                         // espalda algo más curvada cuanto más agachado
        const TL = 18, sh = [hx + Math.sin(ang) * TL, hy - Math.cos(ang) * TL + (lose ? 1.6 : 0)];
        // cabeza: va con un poco de retraso respecto al cuerpo, mira al balón y, parado, mira a su alrededor
        const lookIdle = idleT > 1.5 ? Math.sin(idleT * 1.1) * .3 : 0;
        const hdT = (lose ? .45 : boost * .22 - .08 - brake * .1 + strike * .1) - hitK * .25 + (flip ? .3 : 0);
        const hTilt = spr('hd', hdT, 200, 25);
        const head = [sh[0] + Math.sin(ang * .6 + hTilt) * 8 + hitK * .8, sh[1] - Math.cos(ang * .6 + hTilt) * 8 + (lose ? 1.2 : 0) + hitK * 1];
        const headRot = boost * .16 + (lose ? .35 + (sad === 0 ? Math.sin(t * 6) * .2 : .1) : 0) - brake * .1 - hitK * .2 + look * .45 + lookIdle
            + (cel === 2 ? Math.sin(t * 8) * .08 : 0) + (cel === 1 ? -.2 : 0) + (flip ? .25 : 0) + (hTilt - hdT) * .4;
        const tmD = 'rgba(0,0,0,.34)', PANT = '#161b32', PANTD = '#0b0d1a';
        // piernas: los dos pies siempre sobre la plataforma; el de atrás sube un poco el talón con velocidad y turbo
        const heel = K(spd * .14 + boost * .14 + strike * .08, 0, .25);
        const footB = [-12.6 - lean * .8 - brake * .8, 3.4 - hop - heel * 1.2], footF = [4 + lean * .6 + brake * 1.2, 3.4 - hop], footBa = heel, footFa = brake ? -.1 : 0;
        const leg = (foot, dark, fa) => {
            // rodilla siempre hacia delante (dir -1), como una pierna de verdad
            const ax = foot[0] - Math.sin(fa || 0) * 1.6, ay = foot[1] - Math.cos(fa || 0) * 1.6, j = ik2(hx, hy, ax, ay, 11.4, 11.4, -1), col = dark ? PANTD : PANT;
            // muslo con músculo y gemelo marcado por detrás (la curva sale hacia atrás de la pierna)
            const tdx = j[0] - hx, tdy = j[1] - hy, sdx2 = ax - j[0], sdy2 = ay - j[1], sl = Math.hypot(sdx2, sdy2) || 1;
            flesh(g, hx, hy, hx + tdx * .5 + tdy * .06, hy + tdy * .5 - tdx * .06, j[0], j[1], 6.6, 7.3, 5.1, col);
            flesh(g, j[0], j[1], j[0] + sdx2 * .4 - sdy2 / sl * 1.1, j[1] + sdy2 * .4 + sdx2 / sl * 1.1, ax, ay, 5.1, 5.9, 3.5, col);
            if (!dark) { flesh(g, hx + .5, hy - 1, hx + tdx * .5 + .5, hy + tdy * .5 - 1.2, j[0] + .4, j[1] - 1, 2.2, 2.6, 1.6, 'rgba(255,255,255,.07)'); }      // volumen: luz encima del muslo
            // borde de luz del color del equipo para que las piernas se lean sobre fondos oscuros
            g.strokeStyle = 'rgba(' + s.glow + ',' + (dark ? .22 : .35) + ')'; g.lineWidth = .7; g.beginPath(); g.moveTo(hx + 2.4, hy + .4); g.lineTo(j[0] + 2.2, j[1]); g.lineTo(ax + 2, ay); g.stroke();
            if (!dark) {
                g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1; g.beginPath(); g.moveTo(hx + .6, hy - 1.7); g.lineTo(j[0] + .5, j[1] - 1.7); g.lineTo(ax + .4, ay - 1.4); g.stroke();
                g.strokeStyle = ORA('.75'); g.lineWidth = .5; g.beginPath(); g.moveTo(hx - .8, hy + 1.4); g.lineTo(j[0] - .8, j[1] + 1.2); g.stroke();       // costura naranja
                g.fillStyle = '#0b0d17'; g.beginPath(); g.arc(j[0] + .9, j[1] - .2, 2.7, 0, TAU); g.fill();                                          // rodillera
                g.fillStyle = tm; g.beginPath(); g.arc(j[0] + .9, j[1] - .2, 2.2, 0, TAU); g.fill();
                g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = .5; g.beginPath(); g.arc(j[0] + .9, j[1] - .2, 1.5, Math.PI * 1.1, Math.PI * 1.6); g.stroke();
                const sa = Math.atan2(ay - j[1], ax - j[0]);
                g.save(); g.translate(j[0] + (ax - j[0]) * .55, j[1] + (ay - j[1]) * .55); g.rotate(sa); g.fillStyle = ORA('.9'); g.fillRect(-2.6, -1.9, 5.2, .8); g.restore();   // espinillera
            }
            g.save(); g.translate(ax, ay); g.rotate(fa || 0); g.translate(-foot[0], -foot[1] + 1.6);      // la bota gira sobre el tobillo (puntillas)
            g.fillStyle = dark ? '#05060d' : '#0a0c18'; rrect(g, foot[0] - 5.2, foot[1] - 2.5, 10.4, 4.3, 1.7); g.fill();
            g.fillStyle = dark ? '#1a1d2c' : '#1d2238'; rrect(g, foot[0] + 1.6, foot[1] - 2.3, 3.8, 3.7, 1.5); g.fill();                              // puntera
            g.fillStyle = dark ? '#8a90aa' : '#dfe4fb'; g.fillRect(foot[0] - 5.2, foot[1] + 1.2, 10.4, .9);                                              // suela
            g.fillStyle = OR; g.fillRect(foot[0] - 4.8, foot[1] - 1.2, 1.8, 1.6);
            g.fillStyle = dark ? '#1a1d2c' : '#2b3150'; g.fillRect(foot[0] - 1.4, foot[1] - 2.5, 1.3, 3.4); g.fillRect(foot[0] + .2, foot[1] - 2.5, 1.1, 3.4); g.fillStyle = dark ? '#6a708c' : '#cfd5ee'; g.fillRect(foot[0] - 1.2, foot[1] - 1.3, .9, .7);      // correas y hebilla
            g.strokeStyle = dark ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.4)'; g.lineWidth = .4;
            for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(foot[0] - 2 + i * 1.3, foot[1] - 2.2); g.lineTo(foot[0] - 1.2 + i * 1.3, foot[1] - .8); g.stroke(); }
            g.restore();
        };
        leg(footB, true, footBa); leg(footF, false, footFa);
        // mochila con correa reflectante
        g.save(); g.translate(hx - 1.2, hy - 1.4); g.rotate(ang);
        g.fillStyle = '#05060d'; rrect(g, -6.4, -14.6, 5.4, 12.2, 2.2); g.fill(); g.fillStyle = '#12162a'; rrect(g, -6, -14.2, 4.6, 11.4, 1.8); g.fill();
        g.fillStyle = OR; g.fillRect(-5.6, -9.4, 3.8, 1); g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(-5.8, -13.6, 4, .5); g.fillStyle = '#05060d'; g.fillRect(-5.2, -12, 3, 1.2);
        g.restore();
        // torso: chaqueta con volumen, hombrera, capucha, cremallera, bolsillo y banda reflectante
        // espalda curva: se encorva al agacharse y se endereza al celebrar
        const sdx = sh[0] - hx, sdy = sh[1] - hy, sL = Math.hypot(sdx, sdy) || 1, nbx = sdy / sL, nby = -sdx / sL;
        const spine = (ox, oy, ox2, oy2, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(hx + ox, hy + oy); g.quadraticCurveTo((hx + sh[0]) / 2 + nbx * curl + (ox + ox2) / 2, (hy + sh[1]) / 2 + nby * curl + (oy + oy2) / 2, sh[0] + ox2, sh[1] + oy2); g.stroke(); };
        {   // tronco con forma: más estrecho en la cintura y ancho de pecho y hombros
            const mx = (hx + sh[0]) / 2 + nbx * curl, my = (hy + sh[1]) / 2 + nby * curl;
            flesh(g, hx, hy, mx, my, sh[0], sh[1], 8.2, 10.2, 9.6, '#0d1226');
            flesh(g, hx + .2, hy - .6, mx + .1, my - .3, sh[0], sh[1], 7.4, 9.4, 8.8, tm);
            flesh(g, hx + 1.6, hy - 1.4, mx + nbx * -.2 + 1.2, my - 1, sh[0] + 1.2, sh[1] + .8, 2.4, 3.4, 2.8, 'rgba(255,255,255,.12)');      // luz en el pecho
        } spine(-2.2, -.6, -2.2, 0, 2.2, tmD); spine(1.8, -1.6, 1.4, 1.2, 1.1, 'rgba(255,255,255,.5)');
        const ta = Math.atan2(sh[1] - hy, sh[0] - hx);
        g.save(); g.translate(hx, hy); g.rotate(ta);
        g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = .8; g.beginPath(); g.moveTo(5.4, -3.4); g.lineTo(5.4, 3.4); g.stroke();                        // banda reflectante
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(5.2, -3.4, .5, 6.8);
        g.strokeStyle = 'rgba(8,10,28,.7)'; g.lineWidth = .5; g.beginPath(); g.moveTo(1, 3.2); g.lineTo(12, 3.2); g.stroke();                                   // cremallera
        g.setLineDash([.5, .5]); g.strokeStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(1, 3.2); g.lineTo(12, 3.2); g.stroke(); g.setLineDash([]);
        g.strokeStyle = 'rgba(8,10,28,.55)'; g.lineWidth = .5; g.beginPath(); g.moveTo(2.6, -2.4); g.lineTo(5, -2.4); g.lineTo(5, -.4); g.stroke();       // bolsillo
        g.restore();
        g.fillStyle = '#0d1226'; g.fillRect(hx - 3.6, hy - 2.2, 7.2, 1.8); g.fillStyle = OR; g.fillRect(hx - 3.6, hy - 2.2, 7.2, .5); g.fillStyle = '#d8dcf0'; g.fillRect(hx - .6, hy - 2, 1.4, 1.3); g.fillStyle = '#0d1226'; g.fillRect(hx - .2, hy - 1.7, .6, .7);
        g.strokeStyle = 'rgba(5,8,22,.45)'; g.lineWidth = .5; for (let i = 0; i < 3; i++) { const u = .22 + i * .2, wx = hx + (sh[0] - hx) * u, wy2 = hy + (sh[1] - hy) * u, wd = 1.6 + crouch * 1.2; g.beginPath(); g.moveTo(wx - 3.2, wy2 + i * .2); g.quadraticCurveTo(wx - 1, wy2 + wd, wx + 2.2, wy2 + .4); g.stroke(); }       // arrugas de la chaqueta
        g.fillStyle = tm; g.beginPath(); g.arc(sh[0], sh[1], 3.9, 0, TAU); g.fill(); g.strokeStyle = 'rgba(8,10,28,.55)'; g.lineWidth = .6; g.stroke();   // hombro
        g.fillStyle = tmD; g.beginPath(); g.arc(sh[0] - 3, sh[1] - 1.4, 3.1, 0, TAU); g.fill();                                                                  // capucha
        g.fillStyle = tm; g.beginPath(); g.arc(sh[0] - 3.2, sh[1] - 1.8, 2.6, 0, TAU); g.fill();
        // bufanda: sigue al viento relativo, ondea más con el turbo
        {
            const wl = Math.hypot(vf, vu) || 1, dxw = air || spd > .05 ? -vf / Math.max(.6, wl) * .95 : -.9, dyw = air || spd > .05 ? -vu / Math.max(.6, wl) * .7 + .12 : .15;
            const L = 8 + spd * 10 + boost * 7 + (win ? 3 : 0), amp = 1.1 + spd * 1.4 + boost * 1.6, nl = Math.hypot(dxw, dyw) || 1, ex = dxw / nl, ey = dyw / nl;
            const bx = sh[0] + 1.4, by = sh[1] - 1.8;
            g.fillStyle = 'rgba(' + s.glow + ',.95)';
            for (let k = 0; k < 2; k++) {
                const off = k ? 1.7 : 0; g.beginPath(); g.moveTo(bx - ex * .5, by + off);
                for (let i = 1; i <= 8; i++) { const u = i / 8, w = Math.sin(t * (9 + boost * 8) - u * 6 + k) * amp * u; g.lineTo(bx + ex * L * u - ey * w, by + off + ey * L * u + ex * w); }
                for (let i = 8; i >= 1; i--) { const u = i / 8, w = Math.sin(t * (9 + boost * 8) - u * 6 + k) * amp * u; g.lineTo(bx + ex * L * u - ey * w, by + 2.4 + off * .6 + ey * L * u + ex * w - .5 * (1 - u)); }
                g.closePath(); g.fill();
            }
            g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = .5; for (let i = 1; i < 4; i++) { const u = i / 4.5; g.beginPath(); g.moveTo(bx + ex * L * u, by + 1 + ey * L * u); g.lineTo(bx + ex * L * u, by + 2.2 + ey * L * u); g.stroke(); }
            g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(sh[0] - .6, sh[1] - 2.6, 4, .8);
        }
        // brazos con guantes; con gol, un puño en alto bien separado de la cabeza
        const grp = [20.2 - boost * .4, -35.6 + Math.max(0, sF) * .6 + hitK * .8];
        const arm = (hand, dark, up) => {
            const s0 = [sh[0] + (dark ? -.8 : .4), sh[1] + (dark ? -.2 : 0)], ph = dark ? 1.4 : 0;
            // codo hacia abajo (dir 1): el brazo cuelga del hombro y sube hacia el manillar
            const j = up ? [s0[0] + 8 - (dark ? 3 : 0), s0[1] - 1 - (dark ? 3 : 0)] : ik2(s0[0], s0[1], hand[0], hand[1], 10.6, 11, 1), hnd = up ? [s0[0] + 14 - (dark ? 6 : 0) + Math.sin(t * 6 + ph) * 1.6, s0[1] - 12 - (dark ? 4 : 0) - Math.abs(Math.cos(t * 6 + ph)) * 1.2] : [j[2], j[3]];
            {   // brazo con bíceps y antebrazo más ancho junto al codo
                const ac = dark ? '#0b0d1a' : tm, ux = j[0] - s0[0], uy = j[1] - s0[1], fx = hnd[0] - j[0], fy = hnd[1] - j[1];
                flesh(g, s0[0], s0[1], s0[0] + ux * .5 + uy * .08, s0[1] + uy * .5 - ux * .08, j[0], j[1], 4.8, 5.2, 3.8, ac);
                flesh(g, j[0], j[1], j[0] + fx * .35, j[1] + fy * .35, hnd[0], hnd[1], 3.8, 4.3, 2.9, ac);
            }
            if (!dark) {
                g.strokeStyle = tmD; g.lineWidth = 1.2; g.beginPath(); g.moveTo(s0[0] - .6, s0[1] + 1.4); g.lineTo(j[0] - .6, j[1] + 1.2); g.stroke();
                g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = .7; g.beginPath(); g.moveTo(s0[0] + .6, s0[1] - 1.2); g.lineTo(j[0] + .5, j[1] - 1.2); g.stroke();
                g.fillStyle = '#0b0d17'; g.beginPath(); g.arc(j[0], j[1], 2.3, 0, TAU); g.fill(); g.fillStyle = tm; g.beginPath(); g.arc(j[0], j[1], 1.8, 0, TAU); g.fill();         // codo
            }
            g.fillStyle = dark ? '#05060d' : '#0a0c18'; g.beginPath(); g.arc(hnd[0], hnd[1], 2.5, 0, TAU); g.fill();
            if (!dark) {
                g.fillStyle = OR; g.fillRect(hnd[0] - 2.4, hnd[1] - 2.3, 2, .9);
                g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = .4; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(hnd[0] + .2 + i * .6, hnd[1] - 1.8); g.lineTo(hnd[0] + .2 + i * .6, hnd[1] + .2); g.stroke(); }
            }
        };
        // brazo de atrás: agarrado al manillar (también en el aire); al encajar cuelga o se lleva la mano al casco,
        // y parado de vez en cuando se ajusta el visor
        const visor = idleT > 3 && (idleT % 6) < 1.3;
        let bT = [grp[0] - .6, grp[1] + .6];
        if (lose) bT = sad === 1 ? [head[0] + 3.5, head[1] + 1.5] : [sh[0] + 1.5, sh[1] + 16];
        else if (visor) bT = [head[0] + 6.5, head[1] - .8 + Math.sin(idleT * 7) * .3];
        const back = [spr('bhx', bT[0], 180, 25), spr('bhy', bT[1], 180, 25)];
        const fT = cel === 2 ? [sh[0] + 20, sh[1] - 3] : grp;       // señalar: brazo estirado hacia delante
        const front = [spr('fhx', fT[0], 220, 28), spr('fhy', fT[1], 220, 28)];
        arm(back, true, cel === 1); arm(front, false, cel === 0 || cel === 1);
        // casco integral cromático: ventilaciones, oreja, barbilla y visor que reacciona a todo
        const R6 = 6.5;
        g.strokeStyle = '#0d1226'; g.lineWidth = 4; g.beginPath(); g.moveTo(sh[0], sh[1]); g.lineTo(head[0], head[1] + 2); g.stroke();                       // cuello
        {   // cola de pelo que ondea con el viento
            const wl = Math.hypot(vf, vu) || 1, dxw = air || spd > .05 ? -vf / Math.max(.6, wl) : -1, dyw = air || spd > .05 ? -vu / Math.max(.6, wl) * .6 + .15 : .25;
            const Lh = 5 + spd * 8 + boost * 5, nn = Math.hypot(dxw, dyw) || 1, ex = dxw / nn, ey = dyw / nn, bx = head[0] - 5, by = head[1] - 1.5;
            for (let k = 0; k < 2; k++) {
                g.strokeStyle = k ? ORA(.95) : '#0b0d17'; g.lineWidth = k ? 1 : 2.4; g.beginPath(); g.moveTo(bx, by);
                for (let q = 1; q <= 6; q++) { const u = q / 6, w = Math.sin(t * (10 + boost * 8) - u * 5) * (.7 + spd + boost) * u; g.lineTo(bx + ex * Lh * u - ey * w, by + ey * Lh * u + ex * w + u * u * 1.5); }
                g.stroke();
            }
        }
        const hg = g.createLinearGradient(head[0] - R6, head[1] - R6, head[0] + R6, head[1] + R6);
        hg.addColorStop(0, C(0, 68)); hg.addColorStop(.5, C(110, 58)); hg.addColorStop(1, C(220, 50));
        // la cabeza sigue al balón; al encajar niega con la cabeza; al señalar asiente; con los brazos arriba mira al cielo
        g.save(); g.translate(head[0], head[1]); g.rotate(spr('hr', headRot, 220, 28));
        // carcasa con forma de casco integral de verdad: cúpula, nuca y mentonera adelantada
        const shellP = () => { g.beginPath(); g.moveTo(-5.6, 4.4); g.quadraticCurveTo(-7.6, -.6, -4.8, -5.4); g.quadraticCurveTo(-.4, -8.6, 4.6, -5.8); g.quadraticCurveTo(7.8, -3.2, 7.9, 1.4); g.lineTo(7.6, 4.6); g.quadraticCurveTo(4.4, 7, .4, 5.8); g.quadraticCurveTo(-2.6, 5.6, -5.6, 4.4); g.closePath(); };
        { const hg2 = g.createLinearGradient(-R6, -R6, R6, R6); hg2.addColorStop(0, C(0, 72)); hg2.addColorStop(.5, C(110, 58)); hg2.addColorStop(1, C(220, 46));
          shellP(); g.fillStyle = hg2; g.fill(); g.lineWidth = 1; g.strokeStyle = 'rgba(5,8,22,.9)'; g.stroke();
          g.save(); shellP(); g.clip(); const sh2 = g.createRadialGradient(-2.6, -4, .4, -1, -2, 7); sh2.addColorStop(0, 'rgba(255,255,255,.55)'); sh2.addColorStop(.4, 'rgba(255,255,255,.08)'); sh2.addColorStop(1, 'rgba(0,0,20,.28)');
          g.fillStyle = sh2; g.fillRect(-9, -10, 18, 18);
          g.fillStyle = 'rgba(5,8,22,.55)'; g.fillRect(-9, 4.2, 18, 3); g.restore(); }
        g.fillStyle = 'rgba(5,7,15,.75)'; for (let i = 0; i < 3; i++) g.fillRect(-4.2 + i * 1.6, -6.2 + i * .25, .8, 2);                                        // ventilaciones
        g.fillStyle = iriVisor(g, -.8, -3.8, 7.4, 2.4, t + look); g.beginPath(); g.moveTo(-.8, -3.8); g.quadraticCurveTo(7.8, -4.2, 7.4, 1.8); g.lineTo(.2, 2.9); g.closePath(); g.fill();         // visor espejo iridiscente
        g.strokeStyle = 'rgba(5,7,15,.95)'; g.lineWidth = .6; g.stroke();
        const vg = hitK > 0 ? 1 : 0;
        g.fillStyle = vg ? 'rgba(255,255,255,.95)' : 'rgba(' + s.glow + ',' + (.55 + boost * .4) + ')'; g.beginPath(); g.ellipse(4.2, -.7, 3 + boost * .8, 1.2 + boost * .35, -.15, 0, TAU); g.fill();
        if (boost || win || vg) glowDot(g, 4.4, -.7, 9, vg ? '255,255,255' : s.glow, .8);
        g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(.8, -3, 4.8, .6);
        g.save(); g.beginPath(); g.moveTo(-.8, -3.8); g.quadraticCurveTo(7.8, -4.2, 7.4, 1.8); g.lineTo(.2, 2.9); g.closePath(); g.clip();       // brillo que recorre el visor
        { const vx = -2 + ((t * .6) % 1.6) * 7; g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(vx, 3); g.lineTo(vx + 2.4, -4); g.stroke(); }
        g.restore();
        g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, 5.6, Math.PI * 1.06, Math.PI * 1.46); g.stroke();                  // franja
        g.fillStyle = '#0d1020'; rrect(g, 2.8, 2.6, 4.4, 2.1, .9); g.fill(); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = .4; g.beginPath(); g.moveTo(4, 3.1); g.lineTo(6.4, 3.1); g.moveTo(4, 4); g.lineTo(6.4, 4); g.stroke();   // barbilla
        g.fillStyle = '#0b0d17'; g.beginPath(); g.arc(-1.8, 1, 1.9, 0, TAU); g.fill(); g.strokeStyle = 'rgba(' + s.glow + ',.9)'; g.lineWidth = .6; g.beginPath(); g.arc(-1.8, 1, 1.4, 0, TAU); g.stroke();   // oreja
        g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(-3, -4, 1.5, 0, TAU); g.fill();
        g.restore();
        if (hitK > 0.05) for (let i = 0; i < 5; i++) { const a = -1 + i * .5; glowDot(g, head[0] + 8 + Math.cos(a) * 5 * (1 - hitK + .3), head[1] + Math.sin(a) * 5 * (1 - hitK + .3), 2.2, '255,240,200', hitK); }   // chispas del golpe
        g.restore();
        // chispas cromáticas flotando
        for (let i = 0; i < 4; i++) {
            const ph = (t * .9 + i * .27) % 1, x = -34 + i * 24 + Math.sin(t * 2 + i) * 4, y = 12 - ph * 38;
            glowDot(g, x, y, 4 * (1 - ph) + 1.2, ((hue + i * 90) % 360 < 180 ? '255,120,230' : '120,230,255'), .8 * (1 - ph));
        }
    }

    // ---------- Mula: furgoneta de reparto, grande y pesada ----------
    function mula(g, s, o) {
        const t = o.t;
        underglow(g, s, .28, 60);
        flame(g, -52, 7, 30, 5, o.boosting, t, false);
        // escape bajo el paragolpes trasero
        const ex = g.createLinearGradient(0, 6.5, 0, 9.5); ex.addColorStop(0, '#f2f4ff'); ex.addColorStop(1, '#5a6290');
        g.fillStyle = ex; rrect(g, -53, 6.4, 7, 2.6, 1.2); g.fill();
        const build = () => {
            g.beginPath(); g.moveTo(-50, 9); g.lineTo(-50, -27); g.quadraticCurveTo(-50, -31, -45.5, -31); g.lineTo(19, -31);
            g.quadraticCurveTo(23.5, -31, 25.5, -27.5); g.lineTo(36.5, -13); g.lineTo(46, -10.2); g.quadraticCurveTo(51, -9, 51, -4); g.lineTo(51, 9); g.closePath();
        };
        paintBody(g, build, ov(s, [[0, s.lite], [.2, s.main], [1, s.dark]]), o, -31);
        // franja de la empresa a lo largo de la caja y techo elevado
        g.save(); build(); g.clip();
        g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(-50, -11.5, 88, 3.2); g.fillStyle = 'rgb(' + s.glow + ')'; g.fillRect(-50, -8.3, 88, 1.6);
        g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(-50, -31, 70, 4);
        // logotipo: herradura estilizada en la caja
        g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2.2; g.lineCap = 'round';
        g.beginPath(); g.arc(-27, -20, 5.2, Math.PI * .15, Math.PI * .85, true); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.85)'; for (const a of [.35, .65, 1, 1.35, 1.65]) { g.beginPath(); g.arc(-27 + Math.cos(Math.PI + a) * 5.2 * -1, -20 - Math.sin(a) * 5.2, .7, 0, TAU); g.fill(); }
        g.restore();
        polish(g, build, s, o, { x0: -50, x1: 51, belt: [[-49, -12.4], [36, -12.4], [50, -8.4]], ry: 5.9, roofY: -31, rx0: -45, rx1: 19, arches: [[-30, 10], [32, 10]],
            seams: [[-38, -30], [-38, 5.4], [-6, -30], [-6, 5.4], [15, -30], [15, 5.4]] });
        // carril de la puerta corredera y tiradores
        g.fillStyle = 'rgba(8,12,35,.55)'; g.fillRect(-36, -14.8, 50, .9);
        handle(g, -9.5, -6.2, 4.4); handle(g, 9.6, -6.2, 4.4); handle(g, -46, -6.2, 3.4);
        // ventanilla de la puerta corredera y cabina
        glass(g, [[-4, -27.5], [12, -27.5], [12, -17.5], [-4, -17.5]], o);
        chromeStroke(g, [[-4, -27.5], [12, -27.5], [12, -17.5], [-4, -17.5], [-4, -27.5]], .5);
        glass(g, [[17, -27.8], [22.6, -27.8], [34.6, -14], [17, -14]], o);
        chromeStroke(g, [[17, -27.8], [22.6, -27.8], [34.6, -14]], .6);
        g.fillStyle = s.dark; g.fillRect(15.2, -28, 1.8, 14);
        driver(g, 24, -19, s, o);
        mirror(g, 34.5, -15.6);
        // baca con escalera y rotativo naranja
        g.fillStyle = '#20253f'; g.fillRect(-44, -35.2, 60, 1.6); g.fillRect(-44, -33.6, 1.6, 2.6); g.fillRect(-20, -33.6, 1.6, 2.6); g.fillRect(4, -33.6, 1.6, 2.6); g.fillRect(14.4, -33.6, 1.6, 2.6);
        g.fillStyle = 'rgba(190,200,235,.7)'; for (let x = -42; x < 14; x += 5) g.fillRect(x, -35.6, 2.4, .5);
        g.strokeStyle = '#8a92b8'; g.lineWidth = .9; g.beginPath(); g.moveTo(-51.2, -29); g.lineTo(-51.2, -4); g.moveTo(-53.4, -29); g.lineTo(-53.4, -4); g.stroke();
        for (let y = -27; y < -4; y += 4) { g.beginPath(); g.moveTo(-53.4, y); g.lineTo(-51.2, y); g.stroke(); }
        const bl = .5 + .5 * Math.sin(t * (o.boosting ? 16 : 5));
        g.fillStyle = '#3a2408'; rrect(g, 6, -38.4, 6, 3.4, 1.4); g.fill();
        g.fillStyle = 'rgba(255,' + (150 + 60 * bl).toFixed(0) + ',40,.95)'; rrect(g, 6.6, -38, 4.8, 2.4, 1.2); g.fill();
        glowDot(g, 9, -37, 8 + bl * 6, '255,170,40', .35 + bl * .4);
        // parachoques, rejilla, faro y piloto
        const bm = g.createLinearGradient(0, 2, 0, 9.4); bm.addColorStop(0, '#d8dcef'); bm.addColorStop(1, '#4a5278');
        g.fillStyle = bm; rrect(g, 47, 2.4, 6.4, 7, 1.8); g.fill(); rrect(g, -53.6, 2, 5.4, 6.4, 1.6); g.fill();
        vents(g, 46.6, -6.6, 4.4, 6.4, 4);
        g.fillStyle = '#e8ecff'; rrect(g, 44, -9.6, 2.2, 1.2, .5); g.fill();
        lamp(g, 46.2, -9.4, 4.4, 2.8);
        marker(g, 44, 3.6); marker(g, -49.6, -2);
        taillight(g, -51.4, -27, 2.6, 12, o);
        plate(g, -52.2, -2.2);
        fuelCap(g, -40, -4);
        g.fillStyle = 'rgba(0,0,0,.3)'; rrect(g, -42, 3.4, 25, 4.4, 2.2); g.fill(); rrect(g, 20, 3.4, 25, 4.4, 2.2); g.fill();
        // franjas de reparto que cruzan la caja en diagonal
        g.save(); build(); g.clip();
        for (let i = 0; i < 3; i++) { const x0 = -51 + i * 4.6, w = 3.4 - i * .7; poly(g, [[x0, 3], [x0 + w, 3], [x0 + w + 8, -31], [x0 + 8, -31]], i === 1 ? 'rgba(255,255,255,.92)' : 'rgb(' + s.glow + ')'); }
        g.restore();
        // deflector de aire sobre la cabina
        poly(g, [[13.6, -31], [24.4, -31], [21, -35.4], [15, -35.8]], s.dark);
        g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(15, -35.6, 6, .5);
        // faldillas tras las ruedas: se balancean con la suspensión
        for (const [fx, sv] of [[-41.6, o.susR], [20.4, o.susF]]) {
            const sw = (sv || 0) * .5 + (o.air ? .3 : 0) + Math.sin(o.t * 9 + fx) * .04;
            g.save(); g.translate(fx, 7.2); g.rotate(sw); g.fillStyle = '#0d1126'; rrect(g, -1.4, 0, 2.8, 6.8, .8); g.fill();
            g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(-1, 2.4, 2, .5); g.restore();
        }
        skirt(g, -18, 20, 7.4);
        flare(g, -30, 6, 10); flare(g, 32, 6, 10);
        headlight(g, 51, -7.8, 76);
        wheel(g, -30, 6, 10, o); wheel(g, 32, 6, 10, o);
    }

    // ---------- Titán: monster truck de ruedas gigantes ----------
    function knobby(g, x, y, r, o) {
        // neumático gigante de tacos; dentro va la llanta normal (más pequeña)
        const off = susPart(g, x, r);
        wheel(g, x, y, r * .62, o);
        g.save(); g.translate(x, y + off);
        g.fillStyle = '#0a0c18'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.arc(0, 0, r * .66, 0, TAU, true); g.fill('evenodd');
        g.save(); g.rotate(o.wheel * .62);
        g.fillStyle = '#1c2034';
        for (let i = 0; i < 16; i++) { g.save(); g.rotate(i * TAU / 16); rrect(g, r - 2.6, -2.1, 3.6, 4.2, .9); g.fill(); g.restore(); }
        g.strokeStyle = 'rgba(90,100,150,.55)'; g.lineWidth = .8;
        for (let i = 0; i < 16; i++) { const a = i * TAU / 16 + TAU / 32; g.beginPath(); g.moveTo(Math.cos(a) * r * .72, Math.sin(a) * r * .72); g.lineTo(Math.cos(a) * r * .9, Math.sin(a) * r * .9); g.stroke(); }
        g.restore();
        g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, r - 1.2, Math.PI * 1.1, Math.PI * 1.7); g.stroke();
        g.strokeStyle = 'rgba(160,170,220,.35)'; g.lineWidth = .7; g.beginPath(); g.arc(0, 0, r * .68, 0, TAU); g.stroke();
        if (o.spin > 380) { g.strokeStyle = 'rgba(200,210,255,' + Math.min(.3, (o.spin - 380) / 1600) + ')'; g.lineWidth = r * .3; g.beginPath(); g.arc(0, 0, r * .83, 0, TAU); g.stroke(); }
        g.restore();
    }
    function titan(g, s, o) {
        const t = o.t;
        underglow(g, s, .35, 64);
        // chasis tubular a la vista entre las ruedas
        g.fillStyle = '#151a2e'; rrect(g, -42, -8, 84, 6, 2); g.fill();
        g.fillStyle = '#2a3150'; g.fillRect(-42, -8, 84, 1.2);
        g.strokeStyle = '#3a4268'; g.lineWidth = 2.2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-27, 2); g.lineTo(-12, -6); g.moveTo(27, 2); g.lineTo(12, -6); g.moveTo(-12, -4); g.lineTo(12, -4); g.stroke();
        g.fillStyle = '#5a6290'; g.beginPath(); g.arc(0, -4, 3, 0, TAU); g.fill();             // diferencial
        g.fillStyle = '#2a2e44'; rrect(g, -6, 0, 12, 4, 1.5); g.fill();                         // protector de bajos
        flame(g, -47, -6, 34, 6, o.boosting, t, false);
        // carrocería pickup, más alta que el resto (se dibuja subida)
        g.save(); g.translate(0, -14);
        const build = () => {
            g.beginPath(); g.moveTo(-47, 8); g.lineTo(-47, -3); g.quadraticCurveTo(-47, -6, -43.5, -6); g.lineTo(-15, -6);
            g.lineTo(-11, -19); g.quadraticCurveTo(-10, -20.5, -8, -20.5); g.lineTo(8, -20.5); g.lineTo(19, -8); g.lineTo(39, -6.5); g.quadraticCurveTo(48, -5.5, 48, 1); g.lineTo(48, 8); g.closePath();
        };
        paintBody(g, build, ov(s, [[0, s.lite], [.3, s.main], [1, s.dark]]), o);
        // dientes de tiburón en el lateral
        g.save(); build(); g.clip();
        g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.moveTo(-47, 1);
        for (let k = 0; k < 10; k++) { const x = -47 + k * 9.5; g.lineTo(x + 4.75, k % 2 ? -3.2 : -2); g.lineTo(x + 9.5, 1); }
        g.lineTo(48, 4); g.lineTo(-47, 4); g.closePath(); g.fill();
        g.fillStyle = 'rgb(' + s.glow + ')'; g.fillRect(-47, 4, 95, 1.4);
        g.restore();
        polish(g, build, s, o, { x0: -47, x1: 48, belt: [[-46, -5.4], [-15, -6.4], [19, -8.2], [47, -5]], ry: 6, roofY: -20.5, rx0: -9, rx1: 8, arches: [],
            seams: [[-15, -6], [-15, 6], [3, -8], [3, 6], [19, -8], [20, 6]] });
        // caja trasera con barra antivuelco
        g.fillStyle = '#0d1126'; g.fillRect(-45, -7.2, 29, 1.6);
        g.strokeStyle = '#c9d0ee'; g.lineWidth = 1.8; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(-40, -6); g.lineTo(-37, -15); g.lineTo(-20, -15); g.lineTo(-17, -6); g.stroke();
        g.strokeStyle = 'rgba(10,14,34,.7)'; g.lineWidth = .6; g.beginPath(); g.moveTo(-37, -15); g.lineTo(-20, -15); g.stroke();
        // escapes verticales detrás de la cabina
        for (const ex of [-14, -11.2]) {
            const cg = g.createLinearGradient(ex, 0, ex + 2.2, 0); cg.addColorStop(0, '#7a82a8'); cg.addColorStop(.5, '#ffffff'); cg.addColorStop(1, '#6a729c');
            g.fillStyle = cg; g.fillRect(ex, -27, 2.2, 21); g.fillStyle = '#1a1d30'; g.fillRect(ex - .3, -27.6, 2.8, 1.2);
            if (o.boosting) glowDot(g, ex + 1.1, -28.5, 7, '255,150,60', .7 + .3 * Math.sin(t * 30 + ex));
        }
        glass(g, [[-8.6, -7], [-6.6, -18.4], [6.4, -18.4], [16.4, -7.6]], o);
        chromeStroke(g, [[-8.6, -7], [-6.6, -18.4], [6.4, -18.4], [16.4, -7.6]], .6);
        g.fillStyle = s.dark; g.fillRect(1.6, -18.4, 1.8, 11);
        driver(g, 6, -12.6, s, o);
        mirror(g, 16, -8.6);
        handle(g, 4.6, -3.4, 4.6);
        // barra de luces en el techo
        g.fillStyle = '#10142a'; rrect(g, -9, -24.6, 18, 3.6, 1.2); g.fill();
        for (let i = 0; i < 4; i++) { lamp(g, -7.6 + i * 4.2, -24, 3, 2.4); }
        if (Q_LIGHTS(o)) for (let i = 0; i < 4; i++) glowDot(g, -6 + i * 4.2, -22.8, 6, '255,248,210', .3);
        // capó con toma de aire y parrilla
        g.fillStyle = '#0d1126'; rrect(g, 24, -10.4, 12, 3.4, 1.2); g.fill();
        g.fillStyle = 'rgba(160,175,230,.6)'; for (let i = 0; i < 4; i++) g.fillRect(25.4 + i * 2.8, -9.8, 1.2, 2.2);
        vents(g, 43.6, -3.6, 4.4, 6.6, 4);
        lamp(g, 43.8, -5.8, 4, 2.2);
        const bm = g.createLinearGradient(0, 2, 0, 9.4); bm.addColorStop(0, '#f2f4ff'); bm.addColorStop(1, '#5a6290');
        g.fillStyle = bm; rrect(g, 45, 3.4, 5.2, 5.6, 1.6); g.fill(); rrect(g, -50, 3, 5, 5.6, 1.6); g.fill();
        g.fillStyle = '#ff3b30'; g.beginPath(); g.arc(50.4, 6.2, 1.4, 0, TAU); g.fill();       // gancho de remolque
        taillight(g, -48.4, -4.6, 2.6, 6.6, o);
        fuelCap(g, -22, -3); marker(g, 42, 4); marker(g, -46, 4.4);
        headlight(g, 48, -4.6, 80);
        g.restore();
        // aletines por encima de las ruedas gigantes
        for (const x of [-27, 27]) {
            g.fillStyle = '#0d1126'; g.beginPath(); g.arc(x, 8, 19.5, Math.PI * 1.08, Math.PI * 1.92); g.arc(x, 8, 17.2, Math.PI * 1.92, Math.PI * 1.08, true); g.closePath(); g.fill();
            g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = .7; g.beginPath(); g.arc(x, 8, 19.5, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
            g.fillStyle = '#c9d0ee'; for (const a of [1.2, 1.5, 1.8]) { g.beginPath(); g.arc(x + Math.cos(Math.PI * a) * 18.4, 8 + Math.sin(Math.PI * a) * 18.4, .55, 0, TAU); g.fill(); }
        }
        knobby(g, -27, 8, 16, o); knobby(g, 27, 8, 16, o);
    }
    const Q_LIGHTS = o => !!o.boosting;

    // patrocinador genérico (texto inventado) que nunca sale del revés aunque el coche vaya hacia la izquierda
    function sponsor(g, x, y, txt, h, fg, bg, ang) {
        g.save(); g.translate(x, y);
        const m = g.getTransform && g.getTransform(), mir = m && m.a * m.d - m.b * m.c < 0;
        if (mir) g.scale(-1, 1);
        if (ang) g.rotate(mir && Math.abs(ang) < 1.5 ? -ang : ang);
        g.font = '900 ' + (h * .8).toFixed(2) + 'px "Arial Black", "Arial Bold", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        const w = g.measureText(txt).width + h * .7;
        if (bg) { g.fillStyle = bg; rrect(g, -w / 2, -h / 2, w, h, h * .22); g.fill(); }
        g.fillStyle = fg; g.fillText(txt, 0, h * .07);
        g.restore();
    }
    // ---------- Rayo F1: monoplaza de Fórmula 1 moderno (diseño propio, sin marcas reales) ----------
    function formula(g, s, o) {
        const t = o.t, CB = '#0a0c16', CB2 = '#151a2b';
        underglow(g, s, .5, 64);
        // escape central bajo el alerón: la llama sale de ahí
        flame(g, -47.5, -5.2, 40, 4.6, o.boosting, t, false);
        // ----- alerón trasero: placas laterales, plano principal grueso y flap del DRS sobre un cuello de cisne -----
        g.save(); g.translate(5, 0);
        g.fillStyle = CB; g.fillRect(-50.4, -6, 9.4, 1.8);                                        // viga inferior (beam wing)
        g.strokeStyle = CB; g.lineWidth = 1.6; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-43.6, -2.4); g.quadraticCurveTo(-44.6, -11, -48.6, -16.2); g.stroke();      // cuello de cisne
        const ep = g.createLinearGradient(-58, 0, -51, 0); ep.addColorStop(0, CB2); ep.addColorStop(1, CB);
        g.fillStyle = ep; g.beginPath(); g.moveTo(-58, -25.4); g.lineTo(-52.4, -25.4); g.quadraticCurveTo(-51.4, -14, -51, -6.4); g.quadraticCurveTo(-51.6, -2.6, -55, -2); g.lineTo(-57.2, -2.6); g.quadraticCurveTo(-58.4, -12, -58, -25.4); g.closePath(); g.fill();
        g.fillStyle = 'rgba(' + s.glow + ',.95)'; g.fillRect(-58, -25.4, 5.6, 1);                // filo de color arriba
        sponsor(g, -55.2, -8.6, 'VOLT', 2.6, '#ffffff', null, -Math.PI / 2);      // patrocinador vertical en la placa
        g.strokeStyle = 'rgba(160,175,230,.45)'; g.lineWidth = .45;                                 // ranuras de la placa
        for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-57.4, -8.6 + i * 2); g.lineTo(-52.6, -7.6 + i * 2); g.stroke(); }
        const mp = g.createLinearGradient(0, -19.4, 0, -14.6); mp.addColorStop(0, s.lite); mp.addColorStop(.55, s.main); mp.addColorStop(1, s.dark);
        g.fillStyle = mp; g.beginPath(); g.moveTo(-57.6, -18.4); g.quadraticCurveTo(-50, -20.6, -42.6, -17.4); g.quadraticCurveTo(-42.4, -15.6, -43.6, -15); g.quadraticCurveTo(-50, -16.6, -57.6, -14.8); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(5,8,22,.7)'; g.lineWidth = .5; g.stroke();
        const drs = o.boosting ? -.45 : 0;
        g.save(); g.translate(-44.2, -21.2); g.rotate(drs);                                          // flap del DRS (se abre con el turbo)
        const fg = g.createLinearGradient(0, -2, 0, 1.6); fg.addColorStop(0, '#2a3050'); fg.addColorStop(1, CB);
        g.fillStyle = fg; g.beginPath(); g.moveTo(-13.2, -.6); g.quadraticCurveTo(-6.6, -3.2, .6, -1.6); g.quadraticCurveTo(1.2, .4, 0, .8); g.quadraticCurveTo(-6.6, -.6, -13.2, 1.4); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(-12.4, -.9, 11.6, .35);
        g.restore();
        g.fillStyle = '#ff3b30'; g.fillRect(-49.4, -23.8, 1.4, 1.6);                                // actuador del DRS
        g.restore();
        // ----- fondo plano y difusor -----
        g.fillStyle = CB; g.beginPath(); g.moveTo(-46, 7.4); g.lineTo(-46, 3); g.quadraticCurveTo(-49.5, 1.6, -51, -2.4); g.lineTo(-49, -2.6); g.lineTo(-41, 6); g.lineTo(46, 7); g.lineTo(46, 8.6); g.lineTo(-40, 8.6); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(160,175,230,.4)'; g.lineWidth = .45; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-49.6 + i * 1.6, -1.6 + i * 1.6); g.lineTo(-46.4 + i * 1.4, 4.6); g.stroke(); }
        // ----- alerón delantero de varios planos (por dentro de la rueda) -----
        const fw = (y, x0, x1, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x0, y + 1.1); g.quadraticCurveTo((x0 + x1) / 2, y - .4, x1, y - 1.2); g.lineTo(x1, y + .2); g.quadraticCurveTo((x0 + x1) / 2, y + 1, x0, y + 2.2); g.closePath(); g.fill(); };
        fw(6.6, 46, 63, s.dark); fw(4.6, 49, 63, s.main); fw(2.8, 52, 63, s.lite); fw(1.2, 55, 63, CB);
        g.fillStyle = CB; g.beginPath(); g.moveTo(61.6, -1.4); g.quadraticCurveTo(64.4, 3, 63.6, 9.2); g.lineTo(60, 9.2); g.quadraticCurveTo(61, 4, 60.4, -.8); g.closePath(); g.fill();   // placa curvada
        g.fillStyle = 'rgba(' + s.glow + ',.9)'; g.fillRect(60.6, 8.4, 3, .8);
        // ----- carrocería: monocasco, cubierta de motor con toma de aire y morro largo -----
        const build = () => {
            g.beginPath(); g.moveTo(-44, 6.6); g.lineTo(-44, -1.4); g.lineTo(-36, -3.4); g.quadraticCurveTo(-24, -6.6, -15.5, -12.2);
            g.quadraticCurveTo(-12.4, -16.6, -8.6, -16.8); g.lineTo(-5.4, -16.8); g.lineTo(-5, -13.4); g.quadraticCurveTo(-4.2, -9.6, -2.2, -8.4);
            g.lineTo(13, -7.6); g.quadraticCurveTo(24, -7, 34, -4.4); g.quadraticCurveTo(48, -.6, 57, 1.8); g.quadraticCurveTo(61, 2.8, 60.6, 4.2);
            g.quadraticCurveTo(56, 5, 47, 4.4); g.quadraticCurveTo(38, 3.6, 33, 3.8); g.lineTo(20, 5.6); g.lineTo(-30, 6.6); g.closePath();
        };
        paintBody(g, build, ov(s, [[0, s.lite], [.34, s.main], [1, s.dark]]), o);
        g.save(); build(); g.clip();
        // franja de color a lo largo del coche y parte baja en fibra de carbono
        g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.moveTo(-44, -.6); g.quadraticCurveTo(10, -3.4, 61, 2.6); g.lineTo(61, 3.6); g.quadraticCurveTo(10, -1.8, -44, .9); g.closePath(); g.fill();
        g.fillStyle = 'rgb(' + s.glow + ')'; g.beginPath(); g.moveTo(-44, .9); g.quadraticCurveTo(10, -1.8, 61, 3.6); g.lineTo(61, 4.4); g.quadraticCurveTo(10, -.6, -44, 2.2); g.closePath(); g.fill();
        carbon(g, [[-46, 7], [62, 7], [62, 4.2], [20, 3.4], [-46, 3.6]]);
        g.restore();
        polish(g, build, s, o, { x0: -44, x1: 61, belt: [[-43, -1.6], [-24, -6.4], [13, -7.4], [56, 1.6]], ry: 5.4, roofY: -16.8, rx0: -12, rx1: -5.4, arches: [],
            seams: [[-36, -3.4], [-36.4, 5.6], [13, -7.6], [14, 5], [33, -4.4], [33, 3.8]] });
        // patrocinadores genéricos (nombres inventados)
        sponsor(g, -26.5, -5.2, 'TURBO', 2.5, '#0d1126', 'rgba(255,255,255,.94)', -.2);
        sponsor(g, 1.5, -4.6, 'NITRO', 2.9, '#ffffff', 'rgba(10,12,30,.88)', .03);
        sponsor(g, 39, -1.6, 'GOL', 2, '#0d1126', 'rgba(255,255,255,.92)', .2);
        sponsor(g, -12, 4.8, 'MAX OIL', 1.6, 'rgba(255,255,255,.92)', null);
        sponsor(g, 23.6, -4.8, 'ARENA', 1.7, '#ffffff', null, .1);
        // aleta de tiburón sobre la cubierta del motor
        g.fillStyle = s.dark; g.beginPath(); g.moveTo(-15.6, -12.6); g.quadraticCurveTo(-24, -10.4, -33, -6.6); g.lineTo(-33.4, -4.6); g.quadraticCurveTo(-24, -8, -15.6, -11.2); g.closePath(); g.fill();
        g.fillStyle = 'rgba(' + s.glow + ',.95)'; g.beginPath(); g.moveTo(-17, -12.5); g.quadraticCurveTo(-24, -10.3, -30, -7.8); g.lineTo(-30, -7.2); g.quadraticCurveTo(-24, -9.7, -17, -11.9); g.closePath(); g.fill();
        // toma de aire sobre el piloto y cámara
        g.fillStyle = '#05070f'; rrect(g, -7.4, -16.2, 2.6, 3.4, .8); g.fill();
        g.fillStyle = CB; rrect(g, -9.6, -18.6, 4.2, 1.6, .6); g.fill(); g.fillStyle = 'rgba(' + s.glow + ',.95)'; g.fillRect(-9.2, -18.4, 3.4, .5);
        // pontón: entrada de aire, rampa esculpida y corte inferior
        g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.moveTo(17, -2.6); g.quadraticCurveTo(-4, -1.4, -28, 2.4); g.lineTo(-28, 5); g.quadraticCurveTo(-4, 1.8, 17, 3.2); g.closePath(); g.fill();
        g.fillStyle = '#05070f'; g.beginPath(); g.moveTo(14.4, -6.6); g.lineTo(18.6, -6.2); g.quadraticCurveTo(19.4, -4, 18, -2.2); g.lineTo(14.6, -2.6); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(' + s.glow + ',.95)'; g.lineWidth = .55; g.beginPath(); g.moveTo(14.4, -6.6); g.lineTo(18.6, -6.2); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.moveTo(13, -6.8); g.quadraticCurveTo(-6, -6.4, -26, -2.6); g.lineTo(-26, -1.8); g.quadraticCurveTo(-6, -5.4, 13, -5.8); g.closePath(); g.fill();
        // abombado del pontón (volumen lateral)
        const sp = g.createLinearGradient(0, -8.6, 0, -1); sp.addColorStop(0, 'rgba(255,255,255,.28)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = sp; g.beginPath(); g.moveTo(19, -6.4); g.quadraticCurveTo(6, -9.4, -10, -7.6); g.quadraticCurveTo(-22, -5.6, -30, -1.6); g.lineTo(-30, 0); g.quadraticCurveTo(-12, -4.4, 19, -4); g.closePath(); g.fill();
        // bargeboard y deflectores tras la rueda delantera
        g.fillStyle = 'rgba(10,12,22,.55)'; g.beginPath(); g.moveTo(29, 4.4); g.quadraticCurveTo(26.6, 1.4, 27.4, -1.2); g.lineTo(28.4, -1.2); g.quadraticCurveTo(28, 1.6, 30.4, 4.4); g.closePath(); g.fill();
        // ----- piloto: mono, HANS y casco moderno con visera tintada; se inclina con el coche y celebra los goles -----
        const lookF = Math.max(-.6, Math.min(.6, o.look || 0)), tilt = Math.max(-.3, Math.min(.45, (o.lean || 0) * .14 + (o.air ? -.06 : 0) + (o.brake ? .06 : 0) - (o.boosting ? .08 : 0) + lookF * .3 + (o.mood === 'lose' ? .4 : 0)));
        g.save(); g.translate(-.4, -8.2); g.rotate(tilt); g.translate(.4, 8.2);
        g.fillStyle = s.dark; rrect(g, -5.6, -9.4, 9, 2.6, 1.2); g.fill();                         // hombros con el mono
        g.fillStyle = 'rgba(' + s.glow + ',.9)'; g.fillRect(-5.2, -9.2, 7.4, .5);
        g.fillStyle = '#2a2e44'; g.beginPath(); g.moveTo(-5.2, -9.4); g.quadraticCurveTo(-5.6, -12.4, -3.6, -12.6); g.lineTo(-3, -9.4); g.closePath(); g.fill();   // HANS
        const hx = -.3, hy = -11.2, R = 4.7;
        const hg = g.createRadialGradient(hx - 1.4, hy - 2, .4, hx, hy, R * 1.1); hg.addColorStop(0, '#ffffff'); hg.addColorStop(.3, s.lite); hg.addColorStop(1, s.main);
        g.fillStyle = hg; g.beginPath(); g.moveTo(hx - R + .2, -8.6); g.quadraticCurveTo(hx - R - .6, hy - 1, hx - R * .5, hy - R * .86);
        g.quadraticCurveTo(hx + .6, hy - R - 1.1, hx + R * .72, hy - R * .55); g.quadraticCurveTo(hx + R + .9, hy + .4, hx + R + .3, -8.9); g.lineTo(hx + R - 1, -8.3); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(5,8,22,.75)'; g.lineWidth = .45; g.stroke();
        g.save(); g.clip();                                                                         // diseño del casco: franjas
        g.fillStyle = 'rgb(' + s.glow + ')'; g.beginPath(); g.moveTo(hx - R - 1, hy + .6); g.quadraticCurveTo(hx, hy - 1.6, hx + R + 1, hy - 3.4); g.lineTo(hx + R + 1, hy - 2.2); g.quadraticCurveTo(hx, hy - .2, hx - R - 1, hy + 2); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.moveTo(hx - R - 1, hy + 2); g.quadraticCurveTo(hx, hy - .2, hx + R + 1, hy - 2.2); g.lineTo(hx + R + 1, hy - 1.6); g.quadraticCurveTo(hx, hy + .5, hx - R - 1, hy + 2.7); g.closePath(); g.fill();
        g.fillStyle = s.dark; g.fillRect(hx - R - 1, -9.6, R * 2 + 2, 1.4);
        g.restore();
        g.fillStyle = '#0d1126'; g.beginPath(); g.moveTo(hx - 3.2, hy - 4.6); g.lineTo(hx - 1.4, hy - 5.3); g.lineTo(hx - 1.2, hy - 4.4); g.closePath(); g.fill();   // alerón del casco
        g.fillStyle = '#05070f'; g.fillRect(hx + .2, hy - 5, 1.6, .5);                               // toma de aire superior
        g.fillStyle = iriVisor(g, hx + 1, hy - 2.6, hx + 4.6, hy + .4, t + lookF); g.beginPath(); g.moveTo(hx + .4, hy - 2.4); g.quadraticCurveTo(hx + 3.2, hy - 3.2, hx + 4.9, hy - 1.4); g.lineTo(hx + 5, hy + .6); g.quadraticCurveTo(hx + 2.6, hy + .2, hx + .3, hy + .3); g.closePath(); g.fill();   // visera tintada
        const rf = ((o.t || 0) * .7) % 1;
        g.save(); g.clip(); g.strokeStyle = 'rgba(190,230,255,.6)'; g.lineWidth = .5; g.beginPath(); g.moveTo(hx + rf * 6 - 1, hy - 3); g.lineTo(hx + rf * 6 + .4, hy + .8); g.stroke(); g.restore();
        g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(hx + .2, hy - 2.7, .8, .5);              // tira de las lágrimas (tear-off)
        sponsor(g, hx - 1.8, hy - 1.2, 'GOL', 1.5, '#0d1126', null);
        g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = .45; g.beginPath(); g.arc(hx - .6, hy - .6, R * .8, Math.PI * 1.12, Math.PI * 1.42); g.stroke();      // brillo de laca
        g.strokeStyle = 'rgba(10,12,24,.8)'; g.lineWidth = .35; g.beginPath(); g.moveTo(hx + .4, hy - 2.4); g.quadraticCurveTo(hx + 3.2, hy - 3.2, hx + 4.9, hy - 1.4); g.stroke();   // junta de la visera
        g.fillStyle = '#c9cfe6'; g.beginPath(); g.arc(hx + .5, hy - 1, .45, 0, TAU); g.fill();      // bisagra
        g.restore();
        // volante con luces de cambio asomando delante del casco
        { const rv = Math.min(1, (o.spin || 0) / 900); g.fillStyle = '#10142a'; rrect(g, 5, -10.2, 2.4, 2, .8); g.fill();
          for (let i = 0; i < 4; i++) { g.fillStyle = rv > i / 4 + .05 ? ['#3dff6a', '#3dff6a', '#ffd23f', '#ff3b30'][i] : 'rgba(80,90,120,.6)'; g.fillRect(5.2 + i * .5, -10, .35, .4); } }
        if (o.mood === 'win') {      // puño en alto al marcar
            const up = Math.sin((o.t || 0) * 9) * .8;
            g.strokeStyle = s.dark; g.lineWidth = 2; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(2.2, -9); g.lineTo(5, -13.6 + up); g.lineTo(5.2, -18 + up); g.stroke();
            g.strokeStyle = 'rgba(' + s.glow + ',.9)'; g.lineWidth = .5; g.beginPath(); g.moveTo(4.4, -13.4 + up); g.lineTo(4.6, -17.6 + up); g.stroke();
            g.fillStyle = '#e8ecf6'; rrect(g, 4, -20.6 + up, 2.6, 2.8, 1); g.fill(); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(4.2, -19.2 + up, 2.2, .35);
        }
        g.fillStyle = CB; rrect(g, -4.2, -8.4, 18, 1.6, .7); g.fill();                              // borde del habitáculo
        g.strokeStyle = '#1b1f30'; g.lineWidth = 1.5; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(13.2, -7.6); g.quadraticCurveTo(11.4, -13.6, 6, -14.4); g.lineTo(-3.4, -14.2); g.quadraticCurveTo(-5, -13.6, -5, -11.6); g.stroke();
        g.strokeStyle = 'rgba(200,210,240,.55)'; g.lineWidth = .45; g.beginPath(); g.moveTo(12.4, -8.4); g.quadraticCurveTo(10.8, -13.2, 6, -13.9); g.lineTo(-3, -13.7); g.stroke();
        // retrovisor con brazo
        g.strokeStyle = CB; g.lineWidth = .7; g.beginPath(); g.moveTo(15.6, -6.8); g.lineTo(16.4, -10.2); g.stroke();
        g.fillStyle = CB; rrect(g, 14.6, -11.6, 4.2, 1.8, .7); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(15, -11.4, 3.4, .45);
        // ----- suspensiones de brazos con tirante (por fuera del monocasco) -----
        g.strokeStyle = CB; g.lineWidth = 1; g.lineCap = 'round';
        g.beginPath(); g.moveTo(30, -3.6); g.lineTo(40, 2); g.moveTo(31, 2.4); g.lineTo(40, 6.4); g.moveTo(33, 3.4); g.lineTo(40, -1.6); g.stroke();
        g.beginPath(); g.moveTo(-28, -2.2); g.lineTo(-38, 1.6); g.moveTo(-29, 3.2); g.lineTo(-38, 6.4); g.moveTo(-31, 4.2); g.lineTo(-38, -1.8); g.stroke();
        // número en el morro, cámara del morro y luz de lluvia
        g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.ellipse(49.4, .6, 3.2, 1.7, .22, 0, TAU); g.fill();
        g.fillStyle = CB; g.fillRect(55.4, .6, 2.2, .9);
        const rl = o.brake ? (Math.sin(t * 30) > 0 ? 1 : .35) : .55;
        g.fillStyle = '#12060a'; rrect(g, -51.6, -4.2, 2.6, 3.2, .5); g.fill();
        g.fillStyle = 'rgba(255,60,50,' + rl + ')'; g.fillRect(-51.2, -3.8, 1.8, 2.4);
        glowDot(g, -50.3, -2.6, o.brake ? 13 : 6, '255,50,40', rl * .75);
        // escape: tubo central
        const ex = g.createLinearGradient(0, -6.6, 0, -3.8); ex.addColorStop(0, '#d0d6ee'); ex.addColorStop(1, '#5a6290');
        g.fillStyle = ex; rrect(g, -48.4, -6.4, 4.4, 2.4, 1); g.fill(); g.fillStyle = '#05070f'; g.beginPath(); g.arc(-48.2, -5.2, .9, 0, TAU); g.fill();
        // ----- ruedas con tapacubos y banda de compuesto -----
        CUR.noArch = true; wheel(g, -38, 6, 10, o); wheel(g, 40, 6, 10, o); CUR.noArch = false;
        for (const x of [-38, 40]) {
            const off = susPart(g, x, 10), y = 6 + off;
            if (CUR.wheel === 'auto') {      // tapacubos liso (como los de 18 pulgadas) con aro de color y tuerca central
                const wc = g.createRadialGradient(x - 1.6, y - 1.6, .4, x, y, 6.4); wc.addColorStop(0, '#3a3f58'); wc.addColorStop(1, '#10131f');
                g.fillStyle = wc; g.beginPath(); g.arc(x, y, 6.2, 0, TAU); g.fill();
                g.strokeStyle = 'rgba(200,210,240,.5)'; g.lineWidth = .4; g.beginPath(); g.arc(x, y, 6.1, 0, TAU); g.stroke();
                g.strokeStyle = 'rgba(' + s.glow + ',.8)'; g.lineWidth = .5; g.beginPath(); g.arc(x, y, 4.6, 0, TAU); g.stroke();
                g.save(); g.translate(x, y); g.rotate(o.wheel);
                g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = .6; for (let i = 0; i < 5; i++) { const a = i * TAU / 5; g.beginPath(); g.moveTo(Math.cos(a) * 2, Math.sin(a) * 2); g.lineTo(Math.cos(a) * 4.6, Math.sin(a) * 4.6); g.stroke(); }
                g.restore();
                g.fillStyle = '#c9cfe6'; g.beginPath(); g.arc(x, y, 1.1, 0, TAU); g.fill(); g.fillStyle = 'rgb(' + s.glow + ')'; g.beginPath(); g.arc(x, y, .5, 0, TAU); g.fill();
            }
            g.strokeStyle = 'rgba(255,210,63,.95)'; g.lineWidth = .55; g.beginPath(); g.arc(x, y, 7, Math.PI * .08, Math.PI * .92); g.arc(x, y, 7, Math.PI * 1.08, Math.PI * 1.92); g.stroke();      // banda del compuesto
            g.save(); g.translate(x, y); g.rotate(o.wheel); g.fillStyle = 'rgba(255,255,255,.8)';
            for (let i = 0; i < 2; i++) { g.save(); g.rotate(i * Math.PI); for (let k = 0; k < 6; k++) { g.save(); g.rotate(-.4 + k * .16); g.fillRect(-.3, -8.9, .6, 1); g.restore(); } g.restore(); }   // letras del neumático
            g.restore();
        }
    }

    // Dorsal personalizado: placa redonda en la puerta (posición por modelo: x, y, radio)
    const DORSAL = { chispa: [-4, -.5, 4.2], bisonte: [-2, -1, 4.4], cuna: [-2, -.5, 3.4], kaze: [-3, -1, 4], fenix: [-5, -.5, 3.8], mula: [-20, -21, 5.6], titan: [-4, -17.5, 4.2], formula: [49.4, .6, 2.7] };
    function dorsalBadge(g, model, txt) {
        const p = DORSAL[model]; if (!p) return;
        g.save(); g.translate(p[0], p[1]);
        const m = g.getTransform && g.getTransform(); if (m && m.a * m.d - m.b * m.c < 0) g.scale(-1, 1);       // si el coche está en espejo, el texto se endereza
        g.fillStyle = 'rgba(255,255,255,.94)'; g.strokeStyle = 'rgba(10,14,40,.85)'; g.lineWidth = .7;
        g.beginPath(); g.arc(0, 0, p[2], 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#0d1230'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '800 ' + (txt.length > 2 ? 4.2 : txt.length > 1 ? 5.4 : 6.6) + 'px sans-serif';
        g.fillText(txt, 0, .4, p[2] * 1.7);
        g.restore();
    }
    // Pegatinas: se dibujan en la puerta delantera de cada coche
    const DECALS = [
        { id: 'none', name: 'Ninguna', sw: 'repeating-linear-gradient(45deg,#2a3270 0 6px,#1b2250 6px 12px)' },
        { id: 'rayo', name: 'Rayo', sw: 'linear-gradient(135deg,#fff3a0,#ffb200)' },
        { id: 'llama', name: 'Llama', sw: 'linear-gradient(0deg,#ff3b1a,#ffd23f)' },
        { id: 'estrella', name: 'Estrella', sw: 'radial-gradient(circle,#fff6b0,#ffc61a 70%)' },
        { id: 'calavera', name: 'Calavera', sw: 'radial-gradient(circle at 50% 40%,#fff,#bbb 70%)' },
        { id: 'corazon', name: 'Corazón', sw: 'radial-gradient(circle,#ff89a8,#e0214f)' },
        { id: 'damero', name: 'Damero', sw: 'conic-gradient(#111 0 25%,#fff 0 50%,#111 0 75%,#fff 0)' }
    ];
    const DECAL_POS = { chispa: [11, -1, 1], bisonte: [12, -1.5, 1], cuna: [13, -1, .85], kaze: [11, -1, .95], fenix: [12, -.5, .9], mula: [25, -6, 1.1], titan: [30, -17.5, .95], formula: [-24, -1.2, .75] };
    function decalDraw(g, model, id) {
        const p = DECAL_POS[model]; if (!p || !id || id === 'none') return;
        g.save(); g.translate(p[0], p[1]); g.scale(p[2], p[2]);
        const m = g.getTransform && g.getTransform(); if (m && m.a * m.d - m.b * m.c < 0) g.scale(-1, 1);
        g.lineJoin = 'round'; g.strokeStyle = 'rgba(8,10,30,.85)'; g.lineWidth = .8;
        if (id === 'rayo') { g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(1.8, -4.6); g.lineTo(-2.6, .6); g.lineTo(-.2, .6); g.lineTo(-1.6, 4.6); g.lineTo(2.9, -1.1); g.lineTo(.5, -1.1); g.closePath(); g.fill(); g.stroke(); }
        else if (id === 'llama') {
            g.fillStyle = '#ff5a1a'; g.beginPath(); g.moveTo(0, -5); g.bezierCurveTo(2.5, -2.4, 4, -.4, 3.2, 2); g.bezierCurveTo(2.4, 4.4, -2.4, 4.4, -3.2, 2); g.bezierCurveTo(-4, -.4, -1.4, -1.6, 0, -5); g.fill(); g.stroke();
            g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(0, -1); g.bezierCurveTo(1.6, 0, 2, 1.6, 1.4, 2.6); g.bezierCurveTo(.6, 3.4, -1.6, 3.2, -1.4, 1.6); g.bezierCurveTo(-1.2, .4, -.4, .2, 0, -1); g.fill();
        } else if (id === 'estrella') {
            g.fillStyle = '#ffe14a'; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 1.9 : 4.4, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke();
        } else if (id === 'calavera') {
            g.fillStyle = '#f4f4f4'; g.beginPath(); g.arc(0, -.8, 3.4, 0, TAU); g.fill(); g.stroke(); g.fillRect(-1.9, 1.6, 3.8, 2.4); g.strokeRect(-1.9, 1.6, 3.8, 2.4);
            g.fillStyle = '#12142a'; g.beginPath(); g.arc(-1.4, -.9, .9, 0, TAU); g.arc(1.4, -.9, .9, 0, TAU); g.fill(); g.fillRect(-.3, .6, .6, .8);
        } else if (id === 'corazon') {
            g.fillStyle = '#ff3d6e'; g.beginPath(); g.moveTo(0, 3.8); g.bezierCurveTo(-6, -.4, -3.4, -4.8, 0, -1.8); g.bezierCurveTo(3.4, -4.8, 6, -.4, 0, 3.8); g.fill(); g.stroke();
        } else if (id === 'damero') {
            for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#fff' : '#111'; g.fillRect(-4 + i * 2, -2 + j * 2, 2, 2); }
            g.strokeRect(-4, -2, 8, 4);
        }
        g.restore();
    }
    const DRAW = { chispa, bisonte, cuna, kaze, fenix, prisma, mula, titan, formula };
    function paint(g, model, team, o) {
        let sk = SKIN[team] || SKIN[0];
        CUR.over = false; CUR.finish = 'gloss'; CUR.pat = null; CUR.wheel = 'auto'; CUR.flame = null; CUR.glowRGB = null; CUR.t = o.t || 0; CUR.glow = null; CUR.gl = null;
        const pt = o.paint && o.paint !== 'team' && model !== 'prisma' ? PAINT_BY[o.paint] : null;
        if (pt) {
            CUR.over = true; CUR.finish = pt.finish || 'gloss'; CUR.pat = pt.pat || null;
            if (pt.rainbow) { const h = (o.t || 0) * 80; sk = { main: hsl(h, 55), dark: hsl(h + 40, 28), lite: hsl(h - 40, 82), glow: sk.glow }; }
            else sk = { main: pt.main, dark: pt.dark, lite: pt.lite, glow: sk.glow };
        }
        if (o.wheelStyle && o.wheelStyle !== 'auto' && model !== 'prisma') { CUR.wheel = o.wheelStyle; CUR.glow = sk.glow; }
        const tr = o.trail && TRAIL_BY[o.trail];
        if (tr && tr.id !== 'auto') {
            if (tr.rainbow) { const h = (o.t || 0) * 200; CUR.flame = [hsl(h, 50, .8), hsl(h + 50, 65, .85), hsl(h + 100, 80, .9), 'rgba(255,255,255,.95)']; CUR.glowRGB = '255,255,255'; }
            else { CUR.flame = tr.flame; CUR.glowRGB = tr.glow; }
        }
        if (model === 'prisma') o = Object.assign({}, o, { pal: o.paint && o.paint !== 'team' ? PAINT_BY[o.paint] : null });
        CUR.model = model; CUR.rgb = sk.glow; CUR.puff = o.air ? 0 : .35 + Math.max(0, Math.min(1, (o.lean || 0) * 1.6)) * .65;      // humo del escape: al ralentí poco, acelerando mucho
        const SUSK = { chispa: 2.6, bisonte: 3.4, cuna: 2.4, kaze: 1.7, fenix: 2.4, mula: 3, titan: 4.6, formula: 1.1 }[model];
        if (SUSK && model !== 'prisma') {
            const cl = v => Math.max(-1.2, Math.min(1.2, v || 0));
            // motor en marcha: la carrocería vibra un poco parada y más al acelerar fuerte
            const tt = o.t || 0, acc = Math.max(0, Math.min(1, o.lean || 0)), idle = o.air ? 0 : (Math.abs(o.spin || 0) < 60 ? .16 : .05) + acc * .2;
            const vib = Math.sin(tt * 63) * idle + Math.sin(tt * 41 + 1) * idle * .5;
            const dF = cl(o.susF) * SUSK + vib * .6, dR = cl(o.susR) * SUSK + vib, kS = (dF - dR) / 57;
            CUR.sd = { k: kS, d: dR + kS * 28, col: model === 'kaze' ? 'rgb(' + sk.glow + ')' : model === 'fenix' ? '#ffb020' : '#e24b3a' };
            g.save(); g.transform(1, kS, 0, 1, 0, CUR.sd.d);
        } else CUR.sd = null;
        (DRAW[model] || chispa)(g, sk, o);
        if (o.decal && model !== 'prisma') decalDraw(g, model, o.decal);
        if (o.dorsal && model !== 'prisma') dorsalBadge(g, model, o.dorsal);
        if (CUR.sd) { g.restore(); CUR.sd = null; }
        CUR.over = false; CUR.wheel = 'auto'; CUR.flame = null; CUR.glowRGB = null;
    }
    const PAINT_BY = {}, TRAIL_BY = {};
    PAINTS.forEach(p => { PAINT_BY[p.id] = p; }); TRAILS.forEach(p => { TRAIL_BY[p.id] = p; });

    // Vista previa del garaje: foco de luz, coche con bote suave, ruedas girando y reflejo en el suelo.
    // Con showHit dibuja encima la hitbox real del coche: ruedas y contorno de la carrocería.
    function preview(canvas, model, t, boosting, showHit, locked, extra) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h) return;
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
        const g = canvas.getContext('2d');
        const ty0 = (window.TG && window.TG.TYPES && window.TG.TYPES[model]) || { sc: 1, hb: [[0, 0, 16]] };
        const s = ty0.sc, hbw = ty0.hb.map(h => [h[0] * s, h[1] * s, h[2] * s]);
        const ty = { r: Math.max(...hbw.map(h => h[1] + h[2])), off: Math.max(...hbw.map(h => Math.abs(h[0]) + h[2])) };
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, h);
        const tall = model === 'prisma' || model === 'titan' || model === 'mula', zm = (extra && extra.zoom) || 1, sc = (tall ? Math.min(w / 135, h / 68) : model === 'formula' ? Math.min(w / 136, h / 54) : Math.min(w / 120, h / 52)) * zm, gy = h * (tall ? .86 : .78), bob = Math.sin(t * 2) * .7;
        g.save(); g.globalCompositeOperation = 'lighter';
        const sp = g.createRadialGradient(w / 2, gy, 2, w / 2, gy, w * .55);
        sp.addColorStop(0, 'rgba(150,180,255,.3)'); sp.addColorStop(1, 'rgba(150,180,255,0)');
        g.fillStyle = sp; g.fillRect(0, 0, w, h); g.restore();
        g.fillStyle = 'rgba(160,180,255,.16)'; g.fillRect(0, gy + 1, w, 1.5);
        g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(w / 2, gy + 2, ty.off * sc, 4 * sc, 0, 0, TAU); g.fill();
        const o = Object.assign({ boosting: !!boosting, wheel: t * 3, t, spin: 0, brake: false }, extra || {});
        const cxo = model === 'formula' ? -3 * sc : 0;
        if (!locked) { g.save(); g.globalAlpha = .17; g.translate(w / 2 + cxo, gy + ty.r * sc - bob); g.scale(sc * s, -sc * s); paint(g, model, 0, o); g.restore(); }
        g.save(); g.translate(w / 2 + cxo, gy - ty.r * sc + bob); g.scale(sc, sc);
        g.save(); g.scale(s, s);
        if (locked) { g.filter = 'brightness(0) opacity(.75)'; paint(g, model, 0, { boosting: false, wheel: 0, t: 0, spin: 0, brake: false }); g.filter = 'none'; }
        else paint(g, model, 0, o);
        g.restore();
        if (locked) {
            g.fillStyle = 'hsl(' + ((t * 70) % 360) + ',95%,70%)'; g.font = '700 ' + (22 / sc * 1.1) + 'px Bungee, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText('?', 0, -6);
        }
        if (showHit) {
            g.strokeStyle = 'rgba(70,255,170,.98)'; g.fillStyle = 'rgba(70,255,170,.16)'; g.lineWidth = 2.4 / sc; g.setLineDash([3, 2.5]);
            g.save(); g.scale(s, s); g.lineWidth = 2.4 / sc / s;
            for (const h of ty0.wh || []) { g.beginPath(); g.arc(h[0], h[1], h[2], 0, TAU); g.fill(); g.stroke(); }
            for (const P of ty0.polys || []) { g.beginPath(); P.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); g.stroke(); }
            g.restore(); g.setLineDash([]);
        }
        g.restore();
    }

    return { LIST, RARITY, PAINTS, WHEELS, TRAILS, DECALS, paint, preview };
})();
