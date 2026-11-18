// =====================================================================
// Código y Mazmorra · arte del juego
// Vista lateral estilo cómic: cielo de atardecer con ciudad en parallax,
// el palacio cortado en sección, escaleras, y personajes animados.
// La simulación es una cuadrícula; aquí solo se dibuja.
// =====================================================================
function crearArte(cv) {
  const ctx = cv.getContext('2d');
  const LW = 960, LH = 540, T = 64, M = 56, INK = '#1e0b24';
  let dpr = 1, sim = null, W = 0, H = 0, s = 1, ox = 0, oy = 0;
  let capaFondo = null, capaNivel = null;
  let fx = [], shake = 0, ultimo = 0, antorchas = [], placas = [], victoria = 0;

  // ---------- utilidades ----------
  function hash(x, y, k) { let h = (x * 374761393 + y * 668265263 + (k || 0) * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function semilla(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function tinta(g, w) { g.lineWidth = w || 2.5; g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
  function elipse(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, Math.PI * 2); }
  function poly(g, pts) { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); }
  function lienzo(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
  // trazo grueso con contorno (miembros de los personajes)
  function trazo(g, pts, w, color) {
    g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b));
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = w + 3.2; g.strokeStyle = INK; g.stroke();
    g.lineWidth = w; g.strokeStyle = color; g.stroke();
  }
  const tile = (x, y) => (!sim || x < 0 || y < 0 || x >= sim.w || y >= sim.h) ? '#' : sim.tiles[y][x];
  const solido = (x, y) => { const t = tile(x, y); return t === '#' || t === ' ' || t === 'C'; };
  const abierto = (x, y) => !solido(x, y);
  // altura del suelo (pies) en una casilla abierta: tablón si debajo hay hueco
  const sueloY = (x, y) => (y + 1) * T - (abierto(x, y + 1) ? 7 : 0);

  // ---------- capa de fondo (cielo y ciudad) ----------
  function pintaFondo() {
    const c = lienzo(LW * dpr, LH * dpr), g = c.getContext('2d'); g.scale(dpr, dpr);
    const sk = g.createLinearGradient(0, 0, 0, LH);
    sk.addColorStop(0, '#1a0c3d'); sk.addColorStop(.32, '#4f1b74'); sk.addColorStop(.58, '#b23c80'); sk.addColorStop(.78, '#ff7a5a'); sk.addColorStop(1, '#ffc274');
    g.fillStyle = sk; g.fillRect(0, 0, LW, LH);
    const r = semilla(7);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,240,255,${.25 + r() * .6})`; const z = .6 + r() * 1.4; g.fillRect(r() * LW, r() * LH * .38, z, z); }
    // sol
    const sx = LW * .76, sy = LH * .67;
    let gl = g.createRadialGradient(sx, sy, 10, sx, sy, 260); gl.addColorStop(0, 'rgba(255,214,140,.75)'); gl.addColorStop(.4, 'rgba(255,140,110,.25)'); gl.addColorStop(1, 'rgba(255,140,110,0)');
    g.fillStyle = gl; g.fillRect(0, 0, LW, LH);
    elipse(g, sx, sy, 62, 62); g.fillStyle = '#ffd98c'; g.fill();
    elipse(g, sx, sy, 44, 44); g.fillStyle = '#fff1c6'; g.fill();
    // bandas de nubes delante del sol
    g.fillStyle = 'rgba(178,60,128,.55)';
    [[sx - 120, sy + 8, 240, 7], [sx - 70, sy + 24, 190, 6], [sx - 160, sy - 18, 120, 5]].forEach(([a, b, w, h]) => { rr(g, a, b, w, h, h / 2); g.fill(); });
    // dunas lejanas
    g.fillStyle = '#9b3c78'; g.beginPath(); g.moveTo(0, LH * .78);
    for (let x = 0; x <= LW; x += 40) g.lineTo(x, LH * .76 + Math.sin(x / 130) * 10 + Math.sin(x / 47) * 4);
    g.lineTo(LW, LH); g.lineTo(0, LH); g.fill();
    silueta(g, LH * .80, '#7d2c74', .62, 11, false);
    silueta(g, LH * .87, '#561f62', .85, 23, true);
    silueta(g, LH * .97, '#341243', 1.12, 37, true);
    const nb = g.createLinearGradient(0, LH * .7, 0, LH); nb.addColorStop(0, 'rgba(255,150,120,0)'); nb.addColorStop(1, 'rgba(255,150,120,.18)');
    g.fillStyle = nb; g.fillRect(0, LH * .7, LW, LH * .3);
    return c;
  }
  function silueta(g, base, col, sc, sem, ventanas) {
    const r = semilla(sem); let x = -30 - r() * 40;
    while (x < LW + 40) {
      const tipo = r(), w = (46 + r() * 70) * sc, h = (50 + r() * 110) * sc;
      g.fillStyle = col; g.fillRect(x, base - h, w, LH - base + h);
      if (tipo < .45) { // cúpula de cebolla
        const cx = x + w / 2, top = base - h, dw = w * .46;
        g.beginPath(); g.moveTo(cx - dw, top + 1);
        g.bezierCurveTo(cx - dw * 1.25, top - dw * .9, cx - dw * .2, top - dw * 1.2, cx, top - dw * 1.75);
        g.bezierCurveTo(cx + dw * .2, top - dw * 1.2, cx + dw * 1.25, top - dw * .9, cx + dw, top + 1); g.fill();
        g.fillRect(cx - 1, top - dw * 1.75 - 9 * sc, 2, 9 * sc);
      } else if (tipo < .72) { // minarete
        const mw = w * .26, mx = x + w * .5 - mw / 2, mh = h + 70 * sc;
        g.fillRect(mx, base - mh, mw, mh); g.fillRect(mx - 3 * sc, base - mh + 18 * sc, mw + 6 * sc, 4 * sc);
        g.beginPath(); g.moveTo(mx - 2, base - mh); g.quadraticCurveTo(mx + mw / 2, base - mh - mw * 2.2, mx + mw + 2, base - mh); g.fill();
      } else { // almenas
        for (let i = 0; i < w - 6; i += 12 * sc) g.fillRect(x + i, base - h - 8 * sc, 7 * sc, 8 * sc);
      }
      if (ventanas) for (let k = 0; k < 3; k++) if (r() < .55) {
        const vx = x + 6 + r() * (w - 14), vy = base - h + 12 + r() * (h - 22), vw = 4 * sc, vh = 8 * sc;
        g.fillStyle = `rgba(255,${170 + r() * 50 | 0},90,${.55 + r() * .4})`;
        g.beginPath(); g.moveTo(vx, vy + vh); g.lineTo(vx, vy + vw / 2); g.arc(vx + vw / 2, vy + vw / 2, vw / 2, Math.PI, 0); g.lineTo(vx + vw, vy + vh); g.fill();
        g.fillStyle = col;
      }
      x += w + r() * 24 * sc;
    }
  }

  // ---------- capa del nivel (piedra, interiores, escaleras) ----------
  function pintaNivel() {
    const c = lienzo((W + 2 * M) * s * dpr, (H + 2 * M) * s * dpr), g = c.getContext('2d');
    g.scale(s * dpr, s * dpr); g.translate(M, M);
    antorchas = []; placas = [];
    // sombra del edificio
    g.save(); g.shadowColor = 'rgba(25,5,35,.65)'; g.shadowBlur = 40; g.shadowOffsetY = 14;
    g.fillStyle = '#4a2046'; g.fillRect(0, 0, W, H); g.restore();
    // almenas superiores y banderas
    for (let i = 0; i < W; i += 32) {
      g.fillStyle = '#d68f55'; g.fillRect(i + 4, -16, 22, 18); g.strokeStyle = INK; g.lineWidth = 2.5; g.strokeRect(i + 4, -16, 22, 18);
      g.fillStyle = '#f0b06e'; g.fillRect(i + 6, -14, 18, 3);
    }
    [[6, -16], [W - 6, -16]].forEach(([fxp, fyp]) => {
      g.beginPath(); g.moveTo(fxp, fyp); g.lineTo(fxp, fyp - 40); tinta(g, 3);
      g.beginPath(); g.moveTo(fxp, fyp - 40); g.quadraticCurveTo(fxp + (fxp < W / 2 ? 18 : -18), fyp - 36, fxp + (fxp < W / 2 ? 26 : -26), fyp - 30); g.lineTo(fxp, fyp - 24); g.closePath();
      g.fillStyle = '#e8336f'; g.fill(); tinta(g, 2);
    });
    for (let y = 0; y < sim.h; y++) for (let x = 0; x < sim.w; x++) if (abierto(x, y)) interior(g, x, y);
    for (let y = 0; y < sim.h; y++) for (let x = 0; x < sim.w; x++) if (solido(x, y)) piedra(g, x, y);
    for (let y = 0; y < sim.h; y++) for (let x = 0; x < sim.w; x++) if (abierto(x, y) && abierto(x, y + 1)) escalera(g, x, y);
    // marco exterior
    g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(0, 0, W, H);
    return c;
  }
  function interior(g, x, y) {
    const px = x * T, py = y * T, h = hash(x, y, 1);
    const gr = g.createLinearGradient(0, py, 0, py + T); gr.addColorStop(0, '#34143c'); gr.addColorStop(1, '#55203f');
    g.fillStyle = gr; g.fillRect(px, py, T, T);
    g.strokeStyle = 'rgba(15,0,25,.22)'; g.lineWidth = 1.5; g.beginPath();
    g.moveTo(px, py + T * .5); g.lineTo(px + T, py + T * .5);
    const o = (y % 2) ? 20 : 44; g.moveTo(px + o, py); g.lineTo(px + o, py + T * .5); g.moveTo(px + (o + 32) % T, py + T * .5); g.lineTo(px + (o + 32) % T, py + T); g.stroke();
    if (solido(x, y + 1)) { // zócalo
      g.fillStyle = '#6a2843'; g.fillRect(px, py + T - 13, T, 13);
      g.fillStyle = '#c98a3e'; g.fillRect(px, py + T - 14, T, 2);
    }
    const t = tile(x, y);
    const conEscalera = abierto(x, y + 1) || abierto(x, y - 1);
    if ((t === '.' || t === 'D') && !conEscalera) {
      if (h < .2 && !abierto(x, y - 1) && x % 2 === 1) ventana(g, px + T / 2, py + 8);
      else if (h < .33 && !abierto(x, y - 1)) estandarte(g, px + T / 2, py);
      else if (h < .48) { antorchas.push([px + T / 2, py + 26]); soporte(g, px + T / 2, py + 26); }
      else if (h < .56 && solido(x, y + 1)) vasija(g, px + (h * 1000 % 1 < .5 ? 14 : T - 14), py + T);
    }
    // sombras de contacto con la piedra
    if (solido(x, y - 1)) { const s1 = g.createLinearGradient(0, py, 0, py + 22); s1.addColorStop(0, 'rgba(15,0,25,.6)'); s1.addColorStop(1, 'rgba(15,0,25,0)'); g.fillStyle = s1; g.fillRect(px, py, T, 22); }
    if (solido(x - 1, y)) { const s2 = g.createLinearGradient(px, 0, px + 16, 0); s2.addColorStop(0, 'rgba(15,0,25,.45)'); s2.addColorStop(1, 'rgba(15,0,25,0)'); g.fillStyle = s2; g.fillRect(px, py, 16, T); }
    if (solido(x + 1, y)) { const s3 = g.createLinearGradient(px + T, 0, px + T - 16, 0); s3.addColorStop(0, 'rgba(15,0,25,.45)'); s3.addColorStop(1, 'rgba(15,0,25,0)'); g.fillStyle = s3; g.fillRect(px + T - 16, py, 16, T); }
  }
  function ventana(g, cx, top) {
    const w = 18, h = 34;
    g.beginPath(); g.moveTo(cx - w / 2, top + h); g.lineTo(cx - w / 2, top + w / 2); g.quadraticCurveTo(cx - w / 2, top, cx, top - 4); g.quadraticCurveTo(cx + w / 2, top, cx + w / 2, top + w / 2); g.lineTo(cx + w / 2, top + h); g.closePath();
    const gr = g.createLinearGradient(0, top, 0, top + h); gr.addColorStop(0, '#ff8a6a'); gr.addColorStop(1, '#ffd38a');
    g.fillStyle = gr; g.fill(); tinta(g, 2.5);
    g.beginPath(); g.moveTo(cx, top - 3); g.lineTo(cx, top + h); g.moveTo(cx - w / 2, top + 18); g.lineTo(cx + w / 2, top + 18); tinta(g, 1.6);
    g.save(); g.globalCompositeOperation = 'lighter';
    const rg = g.createLinearGradient(cx, top + h, cx + 30, top + h + 60); rg.addColorStop(0, 'rgba(255,190,120,.22)'); rg.addColorStop(1, 'rgba(255,190,120,0)');
    g.fillStyle = rg; poly(g, [[cx - w / 2, top + h], [cx + w / 2, top + h], [cx + w / 2 + 30, top + h + 70], [cx - w / 2 + 14, top + h + 70]]); g.fill(); g.restore();
  }
  function estandarte(g, cx, top) {
    g.fillStyle = '#c98a3e'; g.fillRect(cx - 12, top + 3, 24, 3);
    poly(g, [[cx - 9, top + 5], [cx + 9, top + 5], [cx + 9, top + 36], [cx, top + 30], [cx - 9, top + 36]]);
    g.fillStyle = '#c21f4f'; g.fill(); tinta(g, 2);
    g.fillStyle = '#f2b544'; g.fillRect(cx - 9, top + 8, 18, 2); g.fillRect(cx - 9, top + 25, 18, 2);
    poly(g, [[cx, top + 12], [cx + 4, top + 16.5], [cx, top + 21], [cx - 4, top + 16.5]]); g.fill();
  }
  function soporte(g, cx, cy) {
    g.fillStyle = '#3b2030'; g.fillRect(cx - 2, cy + 4, 4, 12); g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(cx - 2, cy + 4, 4, 12);
    poly(g, [[cx - 7, cy], [cx + 7, cy], [cx + 4, cy + 6], [cx - 4, cy + 6]]); g.fillStyle = '#c98a3e'; g.fill(); tinta(g, 1.8);
  }
  function vasija(g, cx, floor) {
    g.beginPath(); g.moveTo(cx - 4, floor - 22); g.lineTo(cx + 4, floor - 22); g.quadraticCurveTo(cx + 11, floor - 13, cx + 6, floor - 1); g.lineTo(cx - 6, floor - 1); g.quadraticCurveTo(cx - 11, floor - 13, cx - 4, floor - 22); g.closePath();
    g.fillStyle = '#c4553a'; g.fill(); tinta(g, 2);
    g.fillStyle = '#2fc6b8'; g.fillRect(cx - 8, floor - 13, 16, 2.5);
  }
  function piedra(g, x, y) {
    const px = x * T, py = y * T;
    const up = abierto(x, y - 1) && y > 0, dn = abierto(x, y + 1), lf = abierto(x - 1, y), rt = abierto(x + 1, y);
    const expuesta = up || dn || lf || rt || abierto(x - 1, y - 1) || abierto(x + 1, y - 1) || abierto(x - 1, y + 1) || abierto(x + 1, y + 1);
    const cols = ['#da955a', '#cf8a51', '#e3a167', '#c9834c'];
    const mortero = '#9a5638';
    g.fillStyle = mortero; g.fillRect(px, py, T, T);
    for (let row = 0; row < 4; row++) {
      const off = (row + y) % 2 ? 0 : 16;
      for (let bx = -off; bx < T; bx += 32) {
        const x0 = Math.max(px, px + bx + 1), x1 = Math.min(px + T, px + bx + 31), y0 = py + row * 16 + 1;
        if (x1 <= x0) continue;
        g.fillStyle = cols[Math.floor(hash(x * 4 + bx, y * 4 + row, 3) * 4)]; g.fillRect(x0, y0, x1 - x0, 14);
        g.fillStyle = 'rgba(255,230,180,.35)'; g.fillRect(x0, y0, x1 - x0, 2);
        g.fillStyle = 'rgba(40,0,40,.18)'; g.fillRect(x0, y0 + 12, x1 - x0, 2);
      }
    }
    if (expuesta && hash(x, y, 9) > .82) { g.strokeStyle = mortero; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px + 20, py + 18); g.lineTo(px + 27, py + 26); g.lineTo(px + 24, py + 36); g.stroke(); }
    if (!expuesta) { g.fillStyle = 'rgba(90,30,80,.22)'; g.fillRect(px, py, T, T); return; }
    // oscurecer hacia el interior del muro
    if (!up) { const gr = g.createLinearGradient(0, py, 0, py + T); gr.addColorStop(0, 'rgba(60,10,60,.35)'); gr.addColorStop(1, 'rgba(60,10,60,0)'); g.fillStyle = gr; g.fillRect(px, py, T, T); }
    if (tile(x, y) === 'C') placas.push([x, y]);
    if (up) { // cornisa: borde dorado con rombos turquesa
      g.fillStyle = '#f2b544'; g.fillRect(px, py, T, 8);
      g.fillStyle = '#ffd77a'; g.fillRect(px, py, T, 2);
      for (let i = 8; i < T; i += 16) { poly(g, [[px + i, py + 1.5], [px + i + 3.5, py + 4], [px + i, py + 6.5], [px + i - 3.5, py + 4]]); g.fillStyle = '#1fb3a6'; g.fill(); }
      g.beginPath(); g.moveTo(px, py + 8); g.lineTo(px + T, py + 8); tinta(g, 1.5);
    }
    if (dn) { const gr = g.createLinearGradient(0, py + T - 14, 0, py + T); gr.addColorStop(0, 'rgba(60,10,60,0)'); gr.addColorStop(1, 'rgba(60,10,60,.55)'); g.fillStyle = gr; g.fillRect(px, py + T - 14, T, 14); }
    g.beginPath();
    if (up) { g.moveTo(px, py + 1); g.lineTo(px + T, py + 1); }
    if (dn) { g.moveTo(px, py + T - 1); g.lineTo(px + T, py + T - 1); }
    if (lf) { g.moveTo(px + 1, py); g.lineTo(px + 1, py + T); }
    if (rt) { g.moveTo(px + T - 1, py); g.lineTo(px + T - 1, py + T); }
    tinta(g, 3.2);
  }
  function escalera(g, x, y) {
    const px = x * T, py = y * T, cx = px + T / 2;
    // tablones a los lados del hueco
    [[px, 17], [px + T - 17, 17]].forEach(([a, w]) => { g.fillStyle = '#8a5228'; g.fillRect(a, py + T - 7, w, 8); g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(a, py + T - 7, w, 8); g.fillStyle = '#b07038'; g.fillRect(a + 1, py + T - 6, w - 2, 2); });
    const top = py + T - 34, bot = py + 2 * T - (abierto(x, y + 2) ? 7 : 0);
    [cx - 11, cx + 11].forEach(rx => { g.beginPath(); g.moveTo(rx, top); g.lineTo(rx, bot); g.lineCap = 'round'; g.lineWidth = 7; g.strokeStyle = INK; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#b06a34'; g.stroke(); });
    for (let ry = top + 8; ry < bot - 2; ry += 11) { g.beginPath(); g.moveTo(cx - 11, ry); g.lineTo(cx + 11, ry); g.lineWidth = 5; g.strokeStyle = INK; g.stroke(); g.lineWidth = 2.5; g.strokeStyle = '#d18a4a'; g.stroke(); }
  }

  // ---------- elementos animados ----------
  function llama(cx, cy, now, i) {
    const f = Math.sin(now / 85 + i * 3) * 1.6 + Math.sin(now / 47 + i) * 1;
    ctx.beginPath(); ctx.moveTo(cx - 6, cy + 1); ctx.bezierCurveTo(cx - 8, cy - 8, cx - 2 + f, cy - 11, cx + f * .6, cy - 16); ctx.bezierCurveTo(cx + 3, cy - 9, cx + 8, cy - 6, cx + 6, cy + 1); ctx.closePath();
    ctx.fillStyle = '#ff7a1a'; ctx.fill(); tinta(ctx, 2);
    ctx.beginPath(); ctx.moveTo(cx - 3, cy + 1); ctx.bezierCurveTo(cx - 4, cy - 4, cx + f * .4, cy - 6, cx + f * .4, cy - 9); ctx.bezierCurveTo(cx + 2, cy - 5, cx + 4, cy - 3, cx + 3, cy + 1); ctx.closePath();
    ctx.fillStyle = '#ffe066'; ctx.fill();
    if (Math.random() < .04) fx.push({ t: 'chispa', x: cx + f, y: cy - 12, vx: (Math.random() - .5) * .4, vy: -.6 - Math.random() * .6, v: 1, d: .012, r: 1.6, c: '#ffcf5a' });
  }
  function luces(now) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    antorchas.forEach(([x, y], i) => {
      const r = 84 + Math.sin(now / 110 + i) * 5, g = ctx.createRadialGradient(x, y - 6, 2, x, y - 6, r);
      g.addColorStop(0, 'rgba(255,150,60,.42)'); g.addColorStop(1, 'rgba(255,110,40,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - 6 - r, 2 * r, 2 * r);
    });
    ctx.restore();
  }
  function salida(x, y, now) {
    const cx = x * T + T / 2, fl = sueloY(x, y), top = fl - 54, w = 40;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    let g = ctx.createRadialGradient(cx, fl - 26, 4, cx, fl - 26, 70); g.addColorStop(0, 'rgba(90,255,225,.55)'); g.addColorStop(1, 'rgba(90,255,225,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - 70, fl - 96, 140, 140); ctx.restore();
    const arco = (ins) => { ctx.beginPath(); ctx.moveTo(cx - w / 2 + ins, fl); ctx.lineTo(cx - w / 2 + ins, top + 18); ctx.quadraticCurveTo(cx - w / 2 + ins, top + ins, cx, top - 6 + ins); ctx.quadraticCurveTo(cx + w / 2 - ins, top + ins, cx + w / 2 - ins, top + 18); ctx.lineTo(cx + w / 2 - ins, fl); ctx.closePath(); };
    arco(0); ctx.fillStyle = '#f2b544'; ctx.fill(); tinta(ctx, 3);
    arco(6);
    g = ctx.createRadialGradient(cx, fl - 24, 2, cx, fl - 24, 34); g.addColorStop(0, '#e9fffb'); g.addColorStop(.35, '#4ff0d8'); g.addColorStop(1, '#0d5c70');
    ctx.fillStyle = g; ctx.fill(); tinta(ctx, 2);
    ctx.save(); arco(6); ctx.clip();
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx, fl - 24, 6 + i * 6, now / (260 + i * 70) + i * 2, now / (260 + i * 70) + i * 2 + 3.4); ctx.strokeStyle = ['#ffffff', '#b8fff2', '#2fc6b8'][i]; ctx.lineWidth = 2.5; ctx.stroke(); }
    ctx.restore();
    elipse(ctx, cx, top + 6, 3.5, 3.5); ctx.fillStyle = '#ff4f8b'; ctx.fill(); tinta(ctx, 1.5);
    if (Math.random() < .12) fx.push({ t: 'chispa', x: cx + (Math.random() - .5) * 26, y: fl - 4, vx: 0, vy: -.5 - Math.random() * .7, v: 1, d: .014, r: 2, c: '#9ffff0' });
  }
  function reja(x, y, sube) {
    const px = x * T, cx = px + T / 2, fl = sueloY(x, y), top = y * T + 4, w = T - 12;
    const arco = () => { ctx.beginPath(); ctx.moveTo(cx - w / 2, fl); ctx.lineTo(cx - w / 2, top + 16); ctx.quadraticCurveTo(cx - w / 2, top, cx, top); ctx.quadraticCurveTo(cx + w / 2, top, cx + w / 2, top + 16); ctx.lineTo(cx + w / 2, fl); ctx.closePath(); };
    arco(); ctx.fillStyle = 'rgba(15,0,25,.55)'; ctx.fill();
    ctx.save(); arco(); ctx.clip();
    const dy = -sube * (fl - top - 6);
    ctx.translate(0, dy);
    for (let bx = cx - w / 2 + 6; bx < cx + w / 2; bx += 9) { ctx.beginPath(); ctx.moveTo(bx, top - 2); ctx.lineTo(bx, fl - 2); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#8c8aa6'; ctx.stroke(); }
    for (const hy of [top + 18, fl - 18]) { ctx.beginPath(); ctx.moveTo(cx - w / 2, hy); ctx.lineTo(cx + w / 2, hy); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b6984'; ctx.stroke(); }
    for (let bx = cx - w / 2 + 6; bx < cx + w / 2; bx += 9) { poly(ctx, [[bx - 3, fl - 2], [bx + 3, fl - 2], [bx, fl + 4]]); ctx.fillStyle = '#8c8aa6'; ctx.fill(); tinta(ctx, 1.2); }
    ctx.restore();
    arco(); ctx.lineWidth = 6; ctx.strokeStyle = '#c98a3e'; ctx.stroke(); tinta(ctx, 2.2);
    if (!sube) { elipse(ctx, cx, top + 10, 5, 5); ctx.fillStyle = '#2fc6b8'; ctx.fill(); tinta(ctx, 1.5); }
  }
  function placa(x, y, now) {
    const px = x * T, py = y * T, br = .55 + Math.sin(now / 400) * .25;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(px + T / 2, py + T / 2, 4, px + T / 2, py + T / 2, 46); g.addColorStop(0, `rgba(255,210,110,${.45 * br})`); g.addColorStop(1, 'rgba(255,210,110,0)');
    ctx.fillStyle = g; ctx.fillRect(px - 10, py - 10, T + 20, T + 20); ctx.restore();
    rr(ctx, px + 10, py + 12, T - 20, T - 22, 6); ctx.fillStyle = '#f4dfae'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#c98a3e'; ctx.stroke(); tinta(ctx, 2);
    ctx.strokeStyle = '#8a5228'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < 3; i++) { ctx.moveTo(px + 18, py + 24 + i * 8); ctx.lineTo(px + T - 18 - (i === 2 ? 10 : 0), py + 24 + i * 8); }
    ctx.stroke();
  }
  function gema(x, y, now) {
    const cx = x * T + T / 2, base = sueloY(x, y) - 22, cy = base + Math.sin(now / 330 + x * 1.3 + y) * 4;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 30); g.addColorStop(0, 'rgba(255,80,150,.6)'); g.addColorStop(1, 'rgba(255,80,150,0)'); ctx.fillStyle = g; ctx.fillRect(cx - 30, cy - 30, 60, 60); ctx.restore();
    elipse(ctx, cx, sueloY(x, y) - 2, 8 - (cy - base) * .4, 2.5); ctx.fillStyle = 'rgba(30,0,40,.35)'; ctx.fill();
    const P = [[cx, cy - 14], [cx + 11, cy - 4], [cx, cy + 13], [cx - 11, cy - 4]];
    poly(ctx, P); ctx.fillStyle = '#e8336f'; ctx.fill();
    poly(ctx, [[cx, cy - 14], [cx + 11, cy - 4], [cx, cy - 1], [cx - 11, cy - 4]]); ctx.fillStyle = '#ff98bd'; ctx.fill();
    poly(ctx, [[cx, cy - 1], [cx + 11, cy - 4], [cx, cy + 13]]); ctx.fillStyle = '#b01c55'; ctx.fill();
    poly(ctx, P); tinta(ctx, 2.4);
    const tw = (now / 700 + x * .37) % 2.4;
    if (tw < .5) { const z = Math.sin(tw / .5 * Math.PI) * 7; ctx.fillStyle = '#fff'; poly(ctx, [[cx - 5, cy - 9 - z], [cx - 4, cy - 10], [cx - 5 + z, cy - 9], [cx - 4, cy - 8], [cx - 5, cy - 9 + z], [cx - 6, cy - 8], [cx - 5 - z, cy - 9], [cx - 6, cy - 10]]); ctx.fill(); }
  }

  // ---------- personajes ----------
  // miembro de dos tramos: ángulos medidos desde la vertical hacia abajo, positivo = hacia delante
  function miembro(x, y, a1, l1, a2, l2) {
    const kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1;
    return [[x, y], [kx, ky], [kx + Math.sin(a2) * l2, ky + Math.cos(a2) * l2]];
  }
  function heroe(fx0, fy0, dir, pose, ph, k, now) {
    const run = pose === 'run', climb = pose === 'climb', atk = pose === 'attack';
    let bob = run ? -Math.abs(Math.sin(ph)) * 2.5 : climb ? Math.sin(ph * 2) * 1 : Math.sin(now / 420) * .8;
    let lean = run ? 3 : 0, tilt = 0, dx = 0;
    if (pose === 'bump') { dx = -Math.sin(k * Math.PI) * 4; tilt = -.25 * Math.sin(k * Math.PI); }
    if (pose === 'win') bob = -Math.abs(Math.sin(now / 220)) * 10;
    if (pose === 'stun') tilt = -.18;
    elipse(ctx, fx0, fy0 + 1, 15 + bob * .5, 4); ctx.fillStyle = 'rgba(30,0,40,.4)'; ctx.fill();
    ctx.save(); ctx.translate(fx0, fy0 + bob); ctx.scale(dir, 1); ctx.translate(dx, 0); ctx.rotate(tilt);
    const hip = [lean * .3, -24], sh = [1 + lean, -40], head = [3 + lean * 1.2, -50];
    // pose de piernas y brazos
    let fT, fS, bT, bS, fa1, fa2, ba1, ba2;
    if (run) {
      fT = Math.sin(ph) * .8; fS = fT - .9 * Math.max(0, Math.sin(ph - 1.3)); bT = Math.sin(ph + Math.PI) * .8; bS = bT - .9 * Math.max(0, Math.sin(ph + Math.PI - 1.3));
      fa1 = -Math.sin(ph) * .8; fa2 = fa1 + .9; ba1 = Math.sin(ph) * .8; ba2 = ba1 + .9;
    } else if (climb) {
      fT = .5 + Math.sin(ph) * .5; fS = fT - 1.2; bT = .5 - Math.sin(ph) * .5; bS = bT - 1.2;
      fa1 = Math.PI - .4 + Math.sin(ph) * .35; fa2 = fa1 + .3; ba1 = Math.PI - .2 - Math.sin(ph) * .35; ba2 = ba1 + .3;
    } else if (pose === 'win') {
      fT = .25; fS = -.2; bT = -.2; bS = .1; fa1 = Math.PI - .25; fa2 = Math.PI - .05; ba1 = -.4; ba2 = .3;
    } else {
      fT = .12; fS = .02; bT = -.14; bS = -.05; fa1 = .25; fa2 = 1.1; ba1 = -.15; ba2 = .25;
    }
    if (atk) {
      const e = k < .35 ? k / .35 : 1, sw = k < .35 ? lerp(-.6, -2.6, e) : lerp(-2.6, 1.9, Math.min(1, (k - .35) / .3));
      fa1 = Math.PI + sw * .9; fa2 = fa1 + .2; fT = .45; fS = .1; bT = -.45; bS = -.3; ba1 = -.6; ba2 = -.1; lean = 5;
    }
    // capa
    const vel = run ? 1 : climb ? .4 : .25, ond = Math.sin(now / 140) * 3 * vel + Math.sin(now / 300) * 1.5;
    ctx.beginPath(); ctx.moveTo(sh[0] - 4, sh[1] - 1);
    ctx.bezierCurveTo(-14 - vel * 6, -36, -20 - vel * 10 + ond, -20, -22 - vel * 9 + ond, -10 - vel * 4);
    ctx.lineTo(-14 - vel * 4 + ond * .5, -13); ctx.lineTo(-10 + ond * .3, -8 - vel * 2);
    ctx.quadraticCurveTo(-6, -22, sh[0] + 2, sh[1] + 4); ctx.closePath();
    ctx.fillStyle = '#17a297'; ctx.fill(); tinta(ctx, 2.4);
    ctx.beginPath(); ctx.moveTo(sh[0] - 3, sh[1] + 2); ctx.quadraticCurveTo(-10, -24, -10 + ond * .3, -9 - vel * 2); ctx.lineTo(-14 - vel * 4 + ond * .5, -13); ctx.quadraticCurveTo(-12, -26, sh[0] - 3, sh[1] + 2); ctx.fillStyle = '#0d6f6a'; ctx.fill();
    // brazo y pierna de atrás (más oscuros)
    trazo(ctx, miembro(sh[0] - 2, sh[1] + 2, ba1, 10, ba2, 9), 5, '#c88a5c');
    const bl = miembro(hip[0] - 2, hip[1], bT, 12, bS, 12);
    trazo(ctx, bl.slice(0, 2), 6.5, '#2a1638'); trazo(ctx, bl.slice(1), 5.5, '#2a1638');
    bota(bl[2], bS, '#5e2f19');
    // falda de la túnica y torso
    poly(ctx, [[hip[0] - 8, hip[1] - 2], [hip[0] + 8, hip[1] - 2], [hip[0] + 10 + (run ? Math.sin(ph) * 2 : 0), hip[1] + 9], [hip[0] - 10 - (run ? Math.sin(ph) * 2 : 0), hip[1] + 9]]);
    ctx.fillStyle = '#f4e3c1'; ctx.fill(); tinta(ctx, 2.2);
    poly(ctx, [[hip[0] - 7, hip[1] + 1], [hip[0] + 7, hip[1] + 1], [sh[0] + 7.5, sh[1] + 1], [sh[0] - 6.5, sh[1] - 1]]);
    ctx.fillStyle = '#6a2a8a'; ctx.fill(); tinta(ctx, 2.4);
    poly(ctx, [[sh[0] - 1, sh[1]], [sh[0] + 6, sh[1] + 1], [hip[0] + 4, hip[1] - 4]]); ctx.fillStyle = '#f4e3c1'; ctx.fill();
    rr(ctx, hip[0] - 8.5, hip[1] - 4, 17, 5, 2); ctx.fillStyle = '#f2b544'; ctx.fill(); tinta(ctx, 1.8);
    // pierna de delante
    const fl = miembro(hip[0] + 2, hip[1], fT, 12, fS, 12);
    trazo(ctx, fl.slice(0, 2), 6.5, '#3d2252'); trazo(ctx, fl.slice(1), 5.5, '#3d2252');
    bota(fl[2], fS, '#7a3f22');
    // cabeza y capucha
    elipse(ctx, head[0], head[1], 8.5, 9); ctx.fillStyle = '#e3a46f'; ctx.fill(); tinta(ctx, 2.2);
    ctx.beginPath(); ctx.moveTo(head[0] + 8.3, head[1] - 2); ctx.lineTo(head[0] + 11, head[1] + 1); ctx.lineTo(head[0] + 8, head[1] + 2.5); ctx.fillStyle = '#e3a46f'; ctx.fill(); tinta(ctx, 1.6);
    ctx.beginPath();
    ctx.moveTo(head[0] + 6, head[1] - 9); ctx.quadraticCurveTo(head[0] - 2, head[1] - 15, head[0] - 9, head[1] - 9);
    ctx.quadraticCurveTo(head[0] - 18 - ond * .4, head[1] - 4, head[0] - 20 - ond * .6, head[1] + 6);
    ctx.quadraticCurveTo(head[0] - 12, head[1] + 2, head[0] - 9, head[1] + 8);
    ctx.quadraticCurveTo(head[0] - 6, head[1] - 4, head[0] + 1, head[1] - 7);
    ctx.quadraticCurveTo(head[0] + 6, head[1] - 7, head[0] + 8, head[1] - 4); ctx.closePath();
    ctx.fillStyle = '#17a297'; ctx.fill(); tinta(ctx, 2.2);
    ctx.fillStyle = '#2a1530'; poly(ctx, [[head[0] + 1, head[1] - 7], [head[0] + 7, head[1] - 5], [head[0] + 2, head[1] - 3]]); ctx.fill();
    const ojo = pose === 'stun';
    if (ojo) { ctx.beginPath(); ctx.moveTo(head[0] + 3, head[1] - 2); ctx.lineTo(head[0] + 7, head[1] + 1); ctx.moveTo(head[0] + 7, head[1] - 2); ctx.lineTo(head[0] + 3, head[1] + 1); tinta(ctx, 1.6); }
    else { elipse(ctx, head[0] + 5, head[1] - .5, 2.2, 2.7); ctx.fillStyle = '#fff'; ctx.fill(); tinta(ctx, 1.2); elipse(ctx, head[0] + 5.8, head[1] - .2, 1.1, 1.5); ctx.fillStyle = INK; ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(head[0] + 2, head[1] - 4.5); ctx.lineTo(head[0] + 8, head[1] - 3.5); tinta(ctx, 1.8);
    ctx.beginPath(); ctx.moveTo(head[0] + 4, head[1] + 5); ctx.lineTo(head[0] + (pose === 'win' ? 8 : 7), head[1] + (pose === 'win' ? 4 : 5)); tinta(ctx, 1.4);
    // brazo de delante con cimitarra
    const fa = miembro(sh[0] + 2, sh[1] + 2, fa1, 10, fa2, 9);
    trazo(ctx, fa.slice(0, 2), 5.5, '#e3a46f'); trazo(ctx, fa.slice(1), 5, '#e3a46f');
    rr(ctx, (fa[1][0] + fa[2][0]) / 2 - 3, (fa[1][1] + fa[2][1]) / 2 - 3, 6, 6, 2); ctx.fillStyle = '#f2b544'; ctx.fill(); tinta(ctx, 1.4);
    const ang = Math.atan2(fa[2][1] - fa[1][1], fa[2][0] - fa[1][0]) + (atk ? 0 : climb ? -2.4 : -1.1);
    ctx.save(); ctx.translate(fa[2][0], fa[2][1]); ctx.rotate(ang);
    if (atk && k > .3 && k < .75) { // estela del golpe
      ctx.save(); ctx.rotate(-.9); ctx.globalAlpha = .8 * (1 - Math.abs(k - .52) / .25);
      ctx.beginPath(); ctx.arc(0, 0, 30, -.2, 1.3); ctx.arc(0, 0, 18, 1.3, -.2, true); ctx.closePath();
      const sg = ctx.createLinearGradient(0, 0, 30, 20); sg.addColorStop(0, 'rgba(255,255,255,.95)'); sg.addColorStop(1, 'rgba(120,255,235,.2)'); ctx.fillStyle = sg; ctx.fill(); ctx.restore();
    }
    ctx.beginPath(); ctx.moveTo(3, -2.5); ctx.quadraticCurveTo(15, -8, 27, -3); ctx.quadraticCurveTo(17, 0, 3, 2.5); ctx.closePath();
    ctx.fillStyle = '#eef3f9'; ctx.fill(); tinta(ctx, 1.9);
    ctx.beginPath(); ctx.moveTo(6, -1.5); ctx.quadraticCurveTo(15, -5, 23, -3); ctx.strokeStyle = '#b9c6d6'; ctx.lineWidth = 1.2; ctx.stroke();
    rr(ctx, -1.5, -5.5, 4, 11, 1.5); ctx.fillStyle = '#f2b544'; ctx.fill(); tinta(ctx, 1.5);
    ctx.restore();
    elipse(ctx, fa[2][0], fa[2][1], 3.3, 3.3); ctx.fillStyle = '#e3a46f'; ctx.fill(); tinta(ctx, 1.5);
    ctx.restore();
    if (pose === 'stun') for (let i = 0; i < 3; i++) { const a = now / 300 + i * 2.1; estrellita(fx0 + Math.cos(a) * 14, fy0 - 66 + Math.sin(a) * 4, 4.5); }
  }
  function bota(p, a, col) {
    ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(-a * .3);
    ctx.beginPath(); ctx.moveTo(-3.5, -4); ctx.lineTo(3, -4); ctx.quadraticCurveTo(9, -2, 9, 1.5); ctx.lineTo(-3.5, 1.5); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); tinta(ctx, 1.8); ctx.restore();
  }
  function estrellita(x, y, r) {
    poly(ctx, Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? r * .45 : r; return [x + Math.cos(a) * q, y + Math.sin(a) * q]; }));
    ctx.fillStyle = '#ffe14d'; ctx.fill(); tinta(ctx, 1.4);
  }
  function enemigo(e, fx0, fy0, dir, now, alpha, hitK, hp) {
    const br = Math.sin(now / 360 + e.x * 1.7), kb = hitK >= 0 && hitK < .6 ? Math.sin(hitK / .6 * Math.PI) * 7 : 0;
    ctx.save(); ctx.globalAlpha = alpha;
    elipse(ctx, fx0, fy0 + 1, 18, 4.5); ctx.fillStyle = 'rgba(30,0,40,.4)'; ctx.fill();
    ctx.translate(fx0 - dir * kb, fy0); ctx.scale(dir, 1);
    if (alpha < 1) { ctx.scale(1 + (1 - alpha) * .4, Math.max(.05, alpha)); }
    const sy = 1 + br * .03, base = `hsl(${e.hue},62%,46%)`, osc = `hsl(${e.hue},58%,30%)`, cla = `hsl(${e.hue},75%,66%)`;
    // piernas
    [[-8, osc], [6, base]].forEach(([lx, c]) => { rr(ctx, lx - 3, -9, 7, 9, 3); ctx.fillStyle = c; ctx.fill(); tinta(ctx, 1.8); });
    // brazo de atrás
    trazo(ctx, [[-10, -26], [-17, -16 + br], [-14, -8 + br]], 5.5, osc);
    // cuerpo encorvado
    const cuerpo = () => { ctx.beginPath(); ctx.moveTo(-15, -6); ctx.bezierCurveTo(-23, -22 * sy, -16, -44 * sy, 0, -44 * sy); ctx.bezierCurveTo(14, -44 * sy, 22, -30 * sy, 17, -6); ctx.quadraticCurveTo(1, 0, -15, -6); ctx.closePath(); };
    cuerpo(); ctx.fillStyle = base; ctx.fill();
    ctx.save(); cuerpo(); ctx.clip();
    ctx.fillStyle = osc; elipse(ctx, -10, -8, 22, 16); ctx.fill();
    ctx.fillStyle = cla; elipse(ctx, 4, -36 * sy, 8, 4); ctx.fill();
    ctx.fillStyle = `hsl(${e.hue},50%,62%)`; elipse(ctx, 8, -16, 8, 10); ctx.fill();
    ctx.restore(); cuerpo(); tinta(ctx, 2.6);
    // cuernos
    [[-6, -1], [7, 1]].forEach(([hx, s]) => {
      ctx.beginPath(); ctx.moveTo(hx - 4, -40 * sy); ctx.quadraticCurveTo(hx + s * 2 - 6, -56 * sy, hx + s * 6 - 4, -60 * sy); ctx.quadraticCurveTo(hx + 1, -50 * sy, hx + 4, -41 * sy); ctx.closePath();
      ctx.fillStyle = '#f4e3c0'; ctx.fill(); tinta(ctx, 1.8);
    });
    // ojos brillantes y boca
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(9, -30, 1, 9, -30, 14); g.addColorStop(0, 'rgba(255,225,80,.6)'); g.addColorStop(1, 'rgba(255,225,80,0)'); ctx.fillStyle = g; ctx.fillRect(-5, -44, 28, 28); ctx.restore();
    poly(ctx, [[4, -33 * sy], [11, -31 * sy], [10, -27 * sy], [4, -28 * sy]]); ctx.fillStyle = '#ffe14d'; ctx.fill(); tinta(ctx, 1.6);
    poly(ctx, [[12.5, -31 * sy], [17, -29.5 * sy], [16, -26.5 * sy], [12.5, -27.5 * sy]]); ctx.fill(); tinta(ctx, 1.6);
    ctx.beginPath(); ctx.moveTo(6, -21); ctx.quadraticCurveTo(12, -24, 17, -20); tinta(ctx, 2);
    poly(ctx, [[9, -22.5], [10.5, -19], [12, -23]]); ctx.fillStyle = '#fff'; ctx.fill(); tinta(ctx, 1);
    // brazo de delante con garras
    trazo(ctx, [[10, -24], [19, -15 - br], [22, -8 - br]], 6, base);
    [[-.6], [0], [.6]].forEach(([a]) => { ctx.beginPath(); ctx.moveTo(22, -8 - br); ctx.lineTo(22 + Math.sin(a) * 5 + 2, -8 - br + Math.cos(a) * 5); tinta(ctx, 2); });
    if (hitK >= 0 && hitK < .3) { cuerpo(); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill(); }
    ctx.restore();
    if (alpha > .3) {
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.font = '800 12px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center';
      const tw = ctx.measureText(e.name).width + 14, ty = fy0 - 76;
      rr(ctx, fx0 - tw / 2, ty - 11, tw, 17, 8); ctx.fillStyle = '#fff4dc'; ctx.fill(); tinta(ctx, 2);
      ctx.fillStyle = INK; ctx.fillText(e.name, fx0, ty + 2);
      for (let i = 0; i < e.max; i++) { rr(ctx, fx0 - e.max * 5.5 + i * 11 + 1, ty + 9, 9, 6, 2); ctx.fillStyle = i < hp ? '#ff4f6b' : '#5a3a62'; ctx.fill(); tinta(ctx, 1.4); }
      ctx.restore();
    }
  }
  function bocadillo(x, y, text) {
    ctx.font = '800 14px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center';
    let t = String(text); if (t.length > 34) t = t.slice(0, 33) + '…';
    const w = ctx.measureText(t).width + 22, h = 28;
    let bx = Math.max(-M + 6, Math.min(W + M - w - 6, x - w / 2)); const by = y - h - 10;
    ctx.beginPath(); ctx.moveTo(bx + 12, by); ctx.lineTo(bx + w - 12, by); ctx.quadraticCurveTo(bx + w, by, bx + w, by + 12); ctx.lineTo(bx + w, by + h - 12); ctx.quadraticCurveTo(bx + w, by + h, bx + w - 12, by + h);
    ctx.lineTo(x + 7, by + h); ctx.lineTo(x - 2, by + h + 10); ctx.lineTo(x - 5, by + h); ctx.lineTo(bx + 12, by + h); ctx.quadraticCurveTo(bx, by + h, bx, by + h - 12); ctx.lineTo(bx, by + 12); ctx.quadraticCurveTo(bx, by, bx + 12, by); ctx.closePath();
    ctx.fillStyle = '#fff4dc'; ctx.fill(); tinta(ctx, 2.6);
    ctx.fillStyle = INK; ctx.fillText(t, bx + w / 2, by + 19);
  }

  // ---------- efectos ----------
  function chispas(x, y, n, cols, vel, grav) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = vel * (.4 + Math.random()); fx.push({ t: 'chispa', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - vel * .3, v: 1, d: .025 + Math.random() * .02, r: 1.5 + Math.random() * 2, c: cols[i % cols.length], g: grav || 0 }); }
  }
  function pintaFx(dt) {
    const f = dt / 16.7;
    fx = fx.filter(p => (p.v -= p.d * f) > 0);
    fx.forEach(p => {
      p.x += p.vx * f; p.y += p.vy * f; p.vy += (p.g || 0) * f;
      ctx.globalAlpha = Math.min(1, p.v * 1.5);
      if (p.t === 'humo') { p.r += .35 * f; elipse(ctx, p.x, p.y, p.r, p.r); ctx.fillStyle = p.c; ctx.fill(); }
      else if (p.t === 'polvo') { p.r += .25 * f; elipse(ctx, p.x, p.y, p.r, p.r * .7); ctx.fillStyle = p.c; ctx.fill(); }
      else if (p.t === 'anillo') { p.r += 2.2 * f; elipse(ctx, p.x, p.y, p.r, p.r); ctx.lineWidth = 3 * p.v; ctx.strokeStyle = p.c; ctx.stroke(); }
      else if (p.t === 'confeti') { p.rot = (p.rot || 0) + .18 * f; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.fillRect(-4, -2, 8, 4); ctx.restore(); }
      else if (p.t === 'texto') { ctx.font = '900 20px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.strokeText(p.s, p.x, p.y); ctx.fillStyle = p.c; ctx.fillText(p.s, p.x, p.y); }
      else { ctx.save(); ctx.globalCompositeOperation = 'lighter'; elipse(ctx, p.x, p.y, p.r, p.r); ctx.fillStyle = p.c; ctx.fill(); ctx.restore(); }
    });
    ctx.globalAlpha = 1;
  }
  function evento(p, c) {
    if (!sim || !p || !c) return;
    const hx = c.hx * T + T / 2, hy = sueloY(c.hx, c.hy);
    if (c.hx !== p.hx && solido(c.hx, c.hy + 1)) for (let i = 0; i < 3; i++) fx.push({ t: 'polvo', x: hx - c.facing * 10 + Math.random() * 6, y: hy - 3, vx: -c.facing * (.3 + Math.random() * .4), vy: -.2 - Math.random() * .3, v: .8, d: .03, r: 3 + Math.random() * 2, c: 'rgba(255,220,180,.6)' });
    c.gems.forEach((g, i) => { if (g.taken && p.gems[i] && !p.gems[i].taken) {
      const gx = g.x * T + T / 2, gy = sueloY(g.x, g.y) - 22;
      chispas(gx, gy, 18, ['#ff6fa5', '#ffd35a', '#ffffff'], 3.2, .05);
      fx.push({ t: 'anillo', x: gx, y: gy, vx: 0, vy: 0, v: 1, d: .05, r: 6, c: '#ff8fb5' });
      fx.push({ t: 'texto', s: '+1 💎', x: gx, y: gy - 16, vx: 0, vy: -.8, v: 1, d: .018, c: '#ff98bd' });
    } });
    if (c.attack) {
      const ax = c.attack.x * T + T / 2, ay = sueloY(c.attack.x, c.attack.y) - 26;
      chispas(ax - c.facing * 6, ay, 12, ['#fff6c0', '#ffd35a', '#ffffff'], 3.5, .08); shake = Math.max(shake, 5);
      fx.push({ t: 'texto', s: '-1', x: ax + 8, y: ay - 26, vx: 0, vy: -.9, v: 1, d: .022, c: '#ff4f6b' });
    }
    c.enemies.forEach((e, i) => { const pe = p.enemies[i]; if (pe && pe.hp > 0 && e.hp <= 0) {
      const ex = e.x * T + T / 2, ey = sueloY(e.x, e.y) - 22;
      for (let j = 0; j < 22; j++) fx.push({ t: 'humo', x: ex + (Math.random() - .5) * 26, y: ey + (Math.random() - .5) * 30, vx: (Math.random() - .5) * 1.2, vy: -.4 - Math.random() * .9, v: 1, d: .018 + Math.random() * .01, r: 5 + Math.random() * 6, c: `hsla(${e.hue},45%,${30 + Math.random() * 25}%,.8)` });
      chispas(ex, ey, 10, ['#ffe14d', '#ffffff'], 4, .06); shake = Math.max(shake, 8);
    } });
    if (c.bump) { shake = Math.max(shake, 9); chispas(hx + c.bump[0] * 26, hy - 30 + c.bump[1] * 26, 10, ['#ffe14d', '#ffffff'], 3, .1); }
    if (c.doorOpen && !p.doorOpen && sim.door) { const dx = sim.door.x * T + T / 2, dy = sueloY(sim.door.x, sim.door.y); for (let i = 0; i < 10; i++) fx.push({ t: 'polvo', x: dx + (Math.random() - .5) * 46, y: dy - 2, vx: (Math.random() - .5) * 1.5, vy: -.3 - Math.random() * .5, v: 1, d: .02, r: 4 + Math.random() * 3, c: 'rgba(230,190,160,.6)' }); shake = Math.max(shake, 4); }
    if (c.end === 'win') {
      victoria = performance.now();
      const cols = ['#f2b544', '#2fc6b8', '#ff4f8b', '#fff4dc', '#c58bff'];
      for (let i = 0; i < 110; i++) fx.push({ t: 'confeti', x: hx + (Math.random() - .5) * 20, y: hy - 40, vx: (Math.random() - .5) * 9, vy: -Math.random() * 9 - 3, v: 1.6, d: .009, g: .22, c: cols[i % 5] });
    }
  }

  // ---------- estado del héroe ----------
  function poseHeroe(p, c, k, playing) {
    if (!playing) {
      if (sim.over && sim.over.type === 'win') return { pose: 'win', ph: 0 };
      if (sim.over && sim.over.type === 'fail' && /Pum|bloquea|cerrada|cartel/.test(sim.over.msg)) return { pose: 'stun', ph: 0 };
      return { pose: 'idle', ph: 0 };
    }
    if (c.bump) return { pose: 'bump', ph: 0 };
    if (c.attack) return { pose: 'attack', ph: 0 };
    if (c.hx !== p.hx) return { pose: 'run', ph: k * Math.PI * 2 + (c.hx + c.hy) * Math.PI };
    if (c.hy !== p.hy) return { pose: 'climb', ph: k * Math.PI * 2 };
    return { pose: 'idle', ph: 0 };
  }

  // ---------- API ----------
  function prepara(simulacion, ratio) {
    sim = simulacion; dpr = ratio || 1;
    W = sim.w * T; H = sim.h * T;
    s = Math.min((LW - 70) / W, (LH - 110) / H, 1.2);
    ox = (LW - W * s) / 2; oy = (LH - H * s) / 2 + 22;
    cv.width = LW * dpr; cv.height = LH * dpr;
    if (!capaFondo || capaFondo.width !== LW * dpr) capaFondo = pintaFondo();
    capaNivel = pintaNivel();
    fx = []; shake = 0; victoria = 0;
  }
  function pinta(now, st) {
    if (!sim) return;
    const dt = Math.min(50, ultimo ? now - ultimo : 16); ultimo = now;
    const { p, c, k, playing } = st;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(capaFondo, 0, 0, LW, LH);
    // nubes que se mueven
    for (let i = 0; i < 5; i++) {
      const r = semilla(100 + i), w = 90 + r() * 120, y = 40 + r() * 150, x = ((r() * (LW + w) + now * (.008 + r() * .01)) % (LW + w * 2)) - w;
      ctx.fillStyle = `rgba(255,${150 + i * 12},${170 + i * 6},.28)`; rr(ctx, x, y, w, 9 + r() * 6, 7); ctx.fill(); rr(ctx, x + w * .2, y - 7, w * .5, 8, 5); ctx.fill();
    }
    const sx = shake > .3 ? (Math.random() - .5) * shake : 0, sy = shake > .3 ? (Math.random() - .5) * shake : 0;
    shake *= Math.pow(.86, dt / 16.7);
    ctx.save(); ctx.translate(ox + sx, oy + sy); ctx.scale(s, s);
    ctx.drawImage(capaNivel, -M, -M, W + 2 * M, H + 2 * M);
    luces(now);
    antorchas.forEach(([x, y], i) => llama(x, y, now, i));
    placas.forEach(([x, y]) => placa(x, y, now));
    if (sim.exit) salida(sim.exit.x, sim.exit.y, now);
    if (sim.door) { const abre = c.doorOpen && !p.doorOpen ? ease(k) : (c.doorOpen ? 1 : 0); reja(sim.door.x, sim.door.y, abre); }
    (k < .6 ? p.gems : c.gems).forEach(g => { if (!g.taken) gema(g.x, g.y, now); });
    // héroe interpolado
    const ek = ease(k);
    const hx = lerp(p.hx, c.hx, ek), hyC = lerp(p.hy, c.hy, ek);
    let fxp = hx * T + T / 2, fyp = lerp(sueloY(p.hx, p.hy), sueloY(c.hx, c.hy), ek);
    if (c.bump && playing) { const b = Math.sin(k * Math.PI) * 12; fxp += c.bump[0] * b; fyp += c.bump[1] * b; }
    const ph = poseHeroe(p, c, k, playing);
    const dib = [];
    c.enemies.forEach((e, i) => {
      const pe = p.enemies[i] || e; if (e.hp <= 0 && pe.hp <= 0) return;
      const hit = c.attack && c.attack.x === e.x && c.attack.y === e.y;
      const alpha = e.hp <= 0 ? Math.max(0, 1 - k * 1.6) : 1;
      const dir = c.hx * T + T / 2 < e.x * T + T / 2 ? -1 : 1;
      dib.push({ z: e.y + .001 * e.x, f: () => enemigo(e, e.x * T + T / 2, sueloY(e.x, e.y), dir, now, alpha, hit ? k : -1, k < .3 ? pe.hp : e.hp) });
    });
    dib.push({ z: hyC + .5, f: () => heroe(fxp, fyp, c.facing || 1, ph.pose, ph.ph, k, now) });
    dib.sort((a, b) => a.z - b.z).forEach(d => d.f());
    if (victoria && sim.exit) {
      const t = (now - victoria) / 1000, ex = sim.exit.x * T + T / 2, ey = sueloY(sim.exit.x, sim.exit.y) - 30;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, t * 2) * .5;
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + t * .4; poly(ctx, [[ex, ey], [ex + Math.cos(a - .09) * 260, ey + Math.sin(a - .09) * 260], [ex + Math.cos(a + .09) * 260, ey + Math.sin(a + .09) * 260]]); ctx.fillStyle = 'rgba(255,230,150,.35)'; ctx.fill(); }
      ctx.restore();
    }
    pintaFx(dt);
    if (c.say && playing) bocadillo(fxp, fyp - 66, c.say);
    ctx.restore();
    // viñeta
    const v = ctx.createRadialGradient(LW / 2, LH / 2, LH * .45, LW / 2, LH / 2, LW * .72);
    v.addColorStop(0, 'rgba(26,8,40,0)'); v.addColorStop(1, 'rgba(26,8,40,.5)'); ctx.fillStyle = v; ctx.fillRect(0, 0, LW, LH);
  }
  function limpia() { fx = []; shake = 0; victoria = 0; }
  return { prepara, pinta, evento, limpia };
}
