// =====================================================================
// Código y Mazmorra · arte del juego
// Vista lateral estilo cómic: cielo de atardecer con ciudad en parallax,
// el palacio cortado en sección, escaleras, y personajes animados.
// La simulación es una cuadrícula; aquí solo se dibuja.
// =====================================================================
function crearArte(cv) {
  const ctx = cv.getContext('2d');
  const LW = 960, LH = 540, T = 64, M = 56, INK = '#4a3428';
  let dpr = 1, sim = null, W = 0, H = 0, s = 1, ox = 0, oy = 0;
  let capaFondo = null, capaNivel = null, nubesMoviles = null;
  let fx = [], shake = 0, ultimo = 0, antorchas = [], placas = [], victoria = 0, perdida = 0;

  // ---------- utilidades ----------
  function hash(x, y, k) { let h = (x * 374761393 + y * 668265263 + (k || 0) * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function semilla(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function tinta(g, w) { g.lineWidth = w || 2.2; g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
  function elipse(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, Math.PI * 2); }
  function poly(g, pts) { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); }
  function lienzo(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
  // trazo grueso con contorno (miembros de los personajes)
  function trazo(g, pts, w, color) {
    g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b));
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = w + 2.6; g.strokeStyle = INK; g.stroke();
    g.lineWidth = w; g.strokeStyle = color; g.stroke();
  }
  const tile = (x, y) => (!sim || x < 0 || y < 0 || x >= sim.w || y >= sim.h) ? '#' : sim.tiles[y][x];
  const solido = (x, y) => { const t = tile(x, y); return t === '#' || t === ' ' || t === 'C'; };
  const abierto = (x, y) => !solido(x, y);
  // altura del suelo (pies) en una casilla abierta: tablón si debajo hay hueco
  const sueloY = (x, y) => (y + 1) * T - (abierto(x, y + 1) ? 7 : 0);

  // ---------- textura de acuarela: manchas suaves y grano de papel ----------
  function manchas(g, x, y, w, h, col, n, sem, alfa) {
    const r = semilla(sem);
    for (let i = 0; i < n; i++) {
      const cx = x + r() * w, cy = y + r() * h, rad = 8 + r() * Math.min(w, h) * .35;
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
      gr.addColorStop(0, col.replace('A', String(alfa * (.4 + r() * .6)))); gr.addColorStop(1, col.replace('A', '0'));
      g.fillStyle = gr; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
  }
  function papel(g, w, h, sem) {
    const r = semilla(sem);
    for (let i = 0; i < w * h / 260; i++) { g.fillStyle = r() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(90,60,30,.035)'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
  }

  // ---------- fondo: cielo azul intenso, nubes esponjosas y campo pintado ----------
  function pintaFondo() {
    const c = lienzo(LW * dpr, LH * dpr), g = c.getContext('2d'); g.scale(dpr, dpr);
    const sk = g.createLinearGradient(0, 0, 0, LH * .7);
    sk.addColorStop(0, '#1376d6'); sk.addColorStop(.5, '#3a97e6'); sk.addColorStop(1, '#8cc9f2');
    g.fillStyle = sk; g.fillRect(0, 0, LW, LH);
    const r = semilla(9);
    // vetas finas
    for (let i = 0; i < 5; i++) veta(g, r() * LW, 30 + r() * 140, 90 + r() * 140, r);
    // nubes esponjosas
    nubeBlanca(g, LW * .3, 120, 230, 70, 11);
    nubeBlanca(g, LW * .74, 70, 170, 55, 23);
    nubeBlanca(g, LW * .05, 180, 140, 45, 37);
    nubeBlanca(g, LW * .95, 170, 120, 40, 41);
    nubeBlanca(g, LW * .55, 205, 110, 32, 53);
    // montes lejanos y campo
    capaColinas(g, LH * .6, '#7fb7d8', 90, 3, .7);
    bosque(g, LH * .66, '#5f9f73', '#4b8a63', 7, 22);
    capaColinas(g, LH * .7, '#88c46a', 50, 17, 1.1);
    bosque(g, LH * .76, '#58a04c', '#3f8640', 27, 30);
    capaColinas(g, LH * .82, '#6db552', 35, 31, 1.5);
    hierbaLejana(g, LH * .82, 41);
    return c;
  }
  // nube blanca de borde algodonoso: bultos de borde suave, sombra gris azulada
  // en la mitad de abajo y pequeños copos por arriba
  function nubeBlanca(gDest, cx, cy, w, h, sem) {
    // se pinta en un lienzo aparte para que la sombra solo caiga sobre la nube
    const x0 = cx - w, y0 = cy - h * 2.5, ancho = w * 2, alto = h * 2.9;
    const tmp = lienzo(ancho * dpr, alto * dpr), g = tmp.getContext('2d'); g.scale(dpr, dpr); g.translate(-x0, -y0);
    const r = semilla(sem), bultos = [];
    const n = Math.round(w / 9);
    for (let i = 0; i < n; i++) {
      const t = r() * 2 - 1, alto = 1 - Math.abs(t) * .85;
      bultos.push({ x: cx + t * w * .5, y: cy - alto * h * (.25 + r() * .6), r: h * (.28 + r() * .3) * (.6 + alto * .5) });
    }
    const suave = (x, y, rad, col, dura) => { const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, col); gr.addColorStop(dura, col); gr.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); };
    g.save();
    g.beginPath(); g.rect(cx - w, cy - h * 2.5, w * 2, h * 2.5 + h * .35); g.clip();       // base casi plana
    bultos.forEach(b => suave(b.x, b.y + b.r * .25, b.r * 1.05, 'rgba(178,201,228,1)', .72));
    bultos.forEach(b => suave(b.x - b.r * .08, b.y - b.r * .12, b.r * .92, 'rgba(255,255,255,1)', .7));
    // copos en el borde de arriba
    for (let i = 0; i < n * 3; i++) {
      const b = bultos[Math.floor(r() * n)], a = Math.PI * (1.05 + r() * .9);
      suave(b.x + Math.cos(a) * b.r * .8, b.y + Math.sin(a) * b.r * .8, b.r * (.18 + r() * .14), 'rgba(255,255,255,1)', .6);
    }
    // sombra suave en la base
    const gb = g.createLinearGradient(0, cy - h * .1, 0, cy + h * .35); gb.addColorStop(0, 'rgba(160,185,220,0)'); gb.addColorStop(1, 'rgba(160,185,220,.55)');
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = gb; g.fillRect(cx - w, cy - h * .1, w * 2, h * .45);
    g.restore();
    gDest.drawImage(tmp, x0, y0, ancho, alto);
  }
  function veta(g, x, y, w, r) {
    g.save(); if ('filter' in g) g.filter = 'blur(2px)';
    g.strokeStyle = 'rgba(255,255,255,.42)'; g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      g.lineWidth = 3 + r() * 4; g.beginPath(); const yy = y + i * 5;
      g.moveTo(x, yy); g.quadraticCurveTo(x + w * .5, yy - 8 - r() * 8, x + w * (.8 + r() * .3), yy + 2); g.stroke();
    }
    g.restore();
  }
  // hilera de árboles pintados con manchas de hoja
  function bosque(g, base, col, colS, sem, n) {
    const r = semilla(sem);
    for (let i = 0; i < n; i++) {
      const x = (i / n) * LW + r() * 40 - 20, h = 22 + r() * 30, y = base + r() * 10;
      g.fillStyle = colS; elipse(g, x + 3, y - h * .4, h * .55, h * .5); g.fill();
      g.fillStyle = col; elipse(g, x, y - h * .5, h * .5, h * .48); g.fill();
      for (let k = 0; k < 7; k++) { g.fillStyle = k % 2 ? 'rgba(170,220,120,.55)' : 'rgba(60,120,60,.35)'; elipse(g, x - h * .3 + r() * h * .6, y - h * .8 + r() * h * .6, 3 + r() * 5, 2 + r() * 3); g.fill(); }
    }
  }
  function hierbaLejana(g, base, sem) {
    const r = semilla(sem);
    g.fillStyle = '#5aa845'; g.fillRect(0, base + 10, LW, LH - base);
    for (let i = 0; i < 520; i++) {
      const x = r() * LW, y = base + 4 + r() * (LH - base);
      g.fillStyle = ['rgba(150,215,95,.7)', 'rgba(70,140,60,.6)', 'rgba(190,235,130,.6)'][i % 3];
      elipse(g, x, y, 2 + r() * 4, 1 + r() * 2); g.fill();
    }
    for (let i = 0; i < 60; i++) { g.fillStyle = ['#fff', '#ffe46b', '#ffc2d6', '#cfe0ff'][i % 4]; elipse(g, r() * LW, base + 12 + r() * (LH - base), 1.4, 1.4); g.fill(); }
  }
  // nubecilla suelta (sprite que luego se mueve)
  function spriteNube(w, sem) {
    const c = lienzo(w * 1.4 * dpr, w * .7 * dpr), g = c.getContext('2d'); g.scale(dpr, dpr);
    nubeBlanca(g, w * .7, w * .45, w * .9, w * .2, sem);
    return c;
  }
  function capaColinas(g, base, col, alto, sem, frec) {
    const r = semilla(sem), f1 = .004 * frec + r() * .002, f2 = .011 * frec + r() * .004, fase = r() * 10;
    g.fillStyle = col; g.beginPath(); g.moveTo(0, LH);
    for (let x = 0; x <= LW; x += 8) g.lineTo(x, base - (Math.sin(x * f1 + fase) * .6 + Math.sin(x * f2 + fase * 2) * .4) * alto * .5 - alto * .3);
    g.lineTo(LW, LH); g.closePath(); g.fill();
    // luz suave en la cresta
    g.save(); g.clip(); manchas(g, 0, base - alto, LW, alto, 'rgba(255,255,230,A)', 10, sem + 1, .25); g.restore();
  }
  function arbolesLejanos(g, base, sem) {
    const r = semilla(sem);
    for (let i = 0; i < 14; i++) {
      const x = r() * LW, h = 18 + r() * 26, y = base + r() * 14;
      g.fillStyle = 'rgba(80,120,80,.55)'; g.fillRect(x - 1, y - 4, 2, 8);
      g.fillStyle = r() < .5 ? '#5f9a5c' : '#6fa864'; elipse(g, x, y - h * .5, h * .38, h * .5); g.fill();
      g.fillStyle = 'rgba(255,255,220,.25)'; elipse(g, x - h * .1, y - h * .65, h * .18, h * .2); g.fill();
    }
  }

  // ---------- nivel: islas de tierra con hierba ----------
  const MB = 60;
  let forma = null; // 0 = cielo, 1 = borde, 2 = relleno
  function calculaForma() {
    forma = [];
    for (let y = 0; y < sim.h; y++) {
      const fila = [];
      for (let x = 0; x < sim.w; x++) {
        if (abierto(x, y)) { fila.push(-1); continue; }
        const ab = (dx, dy) => dentroN(x + dx, y + dy) && abierto(x + dx, y + dy);
        let debajo = false;
        for (let yy = 0; yy < y && !debajo; yy++) for (let dx = -1; dx <= 1; dx++) if (dentroN(x + dx, yy) && abierto(x + dx, yy)) debajo = true;
        let t = 0;
        if (ab(0, -1) || ab(-1, 0) || ab(1, 0) || ab(-1, -1) || ab(1, -1)) t = 1;
        else if ((ab(0, 1) || ab(-1, 1) || ab(1, 1)) && debajo) t = 1;
        else if (debajo) t = 2;
        fila.push(t);
      }
      forma.push(fila);
    }
  }
  const dentroN = (x, y) => x >= 0 && y >= 0 && x < sim.w && y < sim.h;
  const lleno = (x, y) => !dentroN(x, y) ? (y >= sim.h && x >= 0 && x < sim.w && forma[sim.h - 1][x] > 0) : forma[y][x] > 0;

  function pintaNivel() {
    calculaForma();
    const c = lienzo((W + 2 * M) * s * dpr, (H + M + MB) * s * dpr), g = c.getContext('2d');
    g.scale(s * dpr, s * dpr); g.translate(M, M);
    antorchas = []; placas = [];
    for (let x = 0; x < sim.w; x++) if (forma[sim.h - 1][x] > 0) cimiento(g, x);
    for (let y = 0; y < sim.h; y++) for (let x = 0; x < sim.w; x++) if (abierto(x, y)) fondoAbierto(g, x, y);
    for (let y = 0; y < sim.h; y++) for (let x = 0; x < sim.w; x++) if (forma[y][x] === 2) relleno(g, x, y);
    for (let y = 0; y < sim.h; y++) for (let x = 0; x < sim.w; x++) if (forma[y][x] === 1) tierra(g, x, y);
    for (let y = 0; y < sim.h; y++) for (let x = 0; x < sim.w; x++) if (forma[y][x] === 1) hierba(g, x, y);
    for (let y = 0; y < sim.h; y++) for (let x = 0; x < sim.w; x++) if (abierto(x, y)) adornos(g, x, y);
    for (let y = 0; y < sim.h; y++) for (let x = 0; x < sim.w; x++) if (abierto(x, y) && abierto(x, y + 1)) escalera(g, x, y);
    return c;
  }
  const TIERRA = ['#c4935f', '#b98856', '#cc9d68', '#b2804f'];
  function cimiento(g, x) {
    const px = x * T, gr = g.createLinearGradient(0, H, 0, H + MB);
    gr.addColorStop(0, '#8a6442'); gr.addColorStop(1, '#5b4130');
    g.fillStyle = gr; g.fillRect(px, H, T, MB);
    manchas(g, px, H, T, MB, 'rgba(60,40,25,A)', 6, x * 7 + 3, .25);
    g.beginPath();
    if (!lleno(x - 1, sim.h - 1)) { g.moveTo(px + 1, H); g.lineTo(px + 1, H + MB); }
    if (!lleno(x + 1, sim.h - 1)) { g.moveTo(px + T - 1, H); g.lineTo(px + T - 1, H + MB); }
    tinta(g, 2.2);
  }
  // detrás del héroe: arbustos y flores suaves; arriba se ve el cielo
  function fondoAbierto(g, x, y) {
    const px = x * T, py = y * T, h = hash(x, y, 5);
    if (lleno(x, y - 1)) { // hueco bajo tierra: cueva cálida
      const gr = g.createLinearGradient(0, py, 0, py + T); gr.addColorStop(0, '#6d4f3a'); gr.addColorStop(1, '#8d6a4c');
      g.fillStyle = gr; g.fillRect(px, py, T, T);
      manchas(g, px, py, T, T, 'rgba(255,220,170,A)', 3, x * 13 + y, .18);
      return;
    }
    for (let i = 0; i < 3; i++) {
      const bx = px + 8 + i * 22 + hash(x, y, 20 + i) * 8, bh = 14 + hash(x, y, 30 + i) * 22;
      g.fillStyle = i % 2 ? 'rgba(120,175,100,.55)' : 'rgba(140,190,110,.5)';
      elipse(g, bx, py + T - bh * .45, 15 + h * 6, bh * .55); g.fill();
    }
    if (h > .6) for (let i = 0; i < 4; i++) { elipse(g, px + 10 + hash(x, y, 40 + i) * 44, py + T - 8 - hash(x, y, 50 + i) * 16, 2.2, 2.2); g.fillStyle = ['#ffffff', '#ffd6e3', '#fff2a8', '#d6e8ff'][i]; g.fill(); }
  }
  function relleno(g, x, y) {
    const px = x * T, py = y * T;
    g.fillStyle = '#9b7350'; g.fillRect(px, py, T, T);
    manchas(g, px, py, T, T, 'rgba(70,45,25,A)', 3, x * 17 + y * 3, .3);
    piedrecitas(g, x, y, 2, '#b49a7e');
    bordes(g, x, y);
  }
  function piedrecitas(g, x, y, n, col) {
    for (let i = 0; i < n; i++) {
      const cx = x * T + 10 + hash(x, y, 60 + i) * (T - 20), cy = y * T + 22 + hash(x, y, 70 + i) * (T - 30), r1 = 4 + hash(x, y, 80 + i) * 5;
      elipse(g, cx, cy, r1, r1 * .7); g.fillStyle = col; g.fill(); g.lineWidth = 1.4; g.strokeStyle = 'rgba(74,52,40,.6)'; g.stroke();
      elipse(g, cx - r1 * .3, cy - r1 * .25, r1 * .35, r1 * .2); g.fillStyle = 'rgba(255,255,255,.35)'; g.fill();
    }
  }
  function tierra(g, x, y) {
    const px = x * T, py = y * T;
    g.fillStyle = TIERRA[Math.floor(hash(x, y, 2) * 4)]; g.fillRect(px, py, T, T);
    // estratos suaves
    for (let i = 0; i < 3; i++) {
      const yy = py + 16 + i * 17 + hash(x, y, 90 + i) * 4;
      g.beginPath(); g.moveTo(px, yy); g.quadraticCurveTo(px + T / 2, yy + (hash(x, y, 95 + i) - .5) * 8, px + T, yy + (hash(x + 1, y, 90 + i) - .5) * 4);
      g.lineWidth = 3; g.strokeStyle = 'rgba(120,80,45,.22)'; g.stroke();
    }
    manchas(g, px, py, T, T, 'rgba(255,230,190,A)', 3, x * 31 + y * 7, .22);
    piedrecitas(g, x, y, hash(x, y, 3) > .5 ? 2 : 1, '#d7c4a6');
    if (abierto(x, y + 1)) { // raíces colgando por debajo
      const gr = g.createLinearGradient(0, py + T - 16, 0, py + T); gr.addColorStop(0, 'rgba(80,50,30,0)'); gr.addColorStop(1, 'rgba(80,50,30,.4)'); g.fillStyle = gr; g.fillRect(px, py + T - 16, T, 16);
      for (let i = 0; i < 2; i++) { const rx = px + 12 + hash(x, y, 110 + i) * 40, l = 8 + hash(x, y, 120 + i) * 14; g.beginPath(); g.moveTo(rx, py + T); g.quadraticCurveTo(rx + 4, py + T + l * .6, rx - 2, py + T + l); g.lineWidth = 2; g.strokeStyle = '#7a5434'; g.stroke(); }
    }
    if (tile(x, y) === 'C') placas.push([x, y]);
    bordes(g, x, y);
  }
  function bordes(g, x, y) {
    const px = x * T, py = y * T;
    g.beginPath();
    if (!lleno(x, y - 1)) { g.moveTo(px, py + 1); g.lineTo(px + T, py + 1); }
    if (!lleno(x, y + 1) && y < sim.h - 1) { g.moveTo(px, py + T - 1); g.lineTo(px + T, py + T - 1); }
    if (!lleno(x - 1, y)) { g.moveTo(px + 1, py); g.lineTo(px + 1, py + T); }
    if (!lleno(x + 1, y)) { g.moveTo(px + T - 1, py); g.lineTo(px + T - 1, py + T); }
    tinta(g, 2.4);
  }
  // hierba que desborda por arriba y por los lados
  function hierba(g, x, y) {
    if (lleno(x, y - 1)) return;
    const px = x * T, py = y * T, iz = !lleno(x - 1, y), de = !lleno(x + 1, y);
    g.beginPath(); g.moveTo(px - (iz ? 3 : 0), py + 12);
    for (let i = 0; i <= 8; i++) { const xx = px + i * T / 8; g.quadraticCurveTo(xx - 4, py + 15 + hash(x * 9 + i, y, 130) * 5, xx, py + 11 + hash(x * 9 + i, y, 131) * 4); }
    g.lineTo(px + T + (de ? 3 : 0), py + 12); g.lineTo(px + T + (de ? 3 : 0), py - 2); g.lineTo(px - (iz ? 3 : 0), py - 2); g.closePath();
    const gr = g.createLinearGradient(0, py - 2, 0, py + 16); gr.addColorStop(0, '#9edb72'); gr.addColorStop(1, '#5fa84c');
    g.fillStyle = gr; g.fill(); tinta(g, 2);
    // briznas
    for (let i = 0; i < 9; i++) {
      const bx = px + 3 + i * 7 + hash(x, y, 140 + i) * 4, bh = 4 + hash(x, y, 150 + i) * 7, lado = hash(x, y, 160 + i) - .5;
      g.beginPath(); g.moveTo(bx - 2, py + 1); g.quadraticCurveTo(bx + lado * 4, py - bh * .6, bx + lado * 6, py - bh); g.quadraticCurveTo(bx + 1, py - bh * .4, bx + 2, py + 1); g.closePath();
      g.fillStyle = i % 3 ? '#8fd068' : '#b5e88a'; g.fill();
    }
    g.fillStyle = 'rgba(255,255,220,.45)'; g.fillRect(px + 2, py, T - 4, 2);
  }
  function adornos(g, x, y) {
    const px = x * T, py = y * T, h = hash(x, y, 1), t = tile(x, y);
    if (t !== '.' || abierto(x, y + 1) || abierto(x, y - 1)) return;
    const lado = hash(x, y, 2) < .5 ? 14 : T - 14;
    if (h < .16) flores(g, px + lado, py + T);
    else if (h < .28) setas(g, px + lado, py + T);
    else if (h < .46) farol(g, px + lado, py + T);
    else if (h < .56) piedraMusgo(g, px + lado, py + T);
  }
  function flores(g, cx, floor) {
    for (let i = 0; i < 4; i++) {
      const fx2 = cx - 9 + i * 6, alto = 8 + (i % 2) * 6;
      g.beginPath(); g.moveTo(fx2, floor); g.quadraticCurveTo(fx2 + 2, floor - alto * .6, fx2, floor - alto); g.lineWidth = 1.6; g.strokeStyle = '#4f8f45'; g.stroke();
      const col = ['#ffffff', '#ffb7c9', '#ffe27a', '#b9d4ff'][i];
      for (let p = 0; p < 5; p++) { const a = p * Math.PI * 2 / 5; elipse(g, fx2 + Math.cos(a) * 2.6, floor - alto + Math.sin(a) * 2.6, 2, 2); g.fillStyle = col; g.fill(); }
      elipse(g, fx2, floor - alto, 1.5, 1.5); g.fillStyle = '#f0a33c'; g.fill();
    }
  }
  function setas(g, cx, floor) {
    [[0, 1], [9, .7]].forEach(([d, e]) => {
      const x = cx + d - 4;
      rr(g, x - 2.5 * e, floor - 10 * e, 5 * e, 10 * e, 2); g.fillStyle = '#fbf1dc'; g.fill(); tinta(g, 1.5);
      g.beginPath(); g.moveTo(x - 9 * e, floor - 9 * e); g.quadraticCurveTo(x, floor - 22 * e, x + 9 * e, floor - 9 * e); g.closePath();
      g.fillStyle = '#e2614f'; g.fill(); tinta(g, 1.6);
      [[-4, -12], [2, -15], [5, -11]].forEach(([a, b]) => { elipse(g, x + a * e, floor + b * e, 1.6 * e, 1.3 * e); g.fillStyle = '#fff6e6'; g.fill(); });
    });
  }
  function farol(g, cx, floor) {
    // farolillo de piedra con luz cálida (la llama se anima)
    rr(g, cx - 7, floor - 6, 14, 6, 2); g.fillStyle = '#a9a39a'; g.fill(); tinta(g, 1.6);
    g.fillStyle = '#bab4aa'; g.fillRect(cx - 3, floor - 18, 6, 12); g.strokeStyle = INK; g.lineWidth = 1.6; g.strokeRect(cx - 3, floor - 18, 6, 12);
    rr(g, cx - 7, floor - 30, 14, 12, 2); g.fillStyle = '#ffe9a8'; g.fill(); tinta(g, 1.6);
    g.fillStyle = '#bab4aa'; g.fillRect(cx - 7, floor - 30, 3, 12); g.fillRect(cx + 4, floor - 30, 3, 12);
    poly(g, [[cx - 11, floor - 30], [cx + 11, floor - 30], [cx + 5, floor - 37], [cx - 5, floor - 37]]); g.fillStyle = '#9d978d'; g.fill(); tinta(g, 1.6);
    antorchas.push([cx, floor - 24]);
  }
  function piedraMusgo(g, cx, floor) {
    elipse(g, cx, floor - 6, 11, 7); g.fillStyle = '#b4ad9f'; g.fill(); tinta(g, 1.6);
    g.beginPath(); g.ellipse(cx - 1, floor - 9, 9, 4, 0, Math.PI, 0); g.fillStyle = '#7fbf62'; g.fill();
  }
  function escalera(g, x, y) {
    const px = x * T, py = y * T, cx = px + T / 2;
    [[px, 17], [px + T - 17, 17]].forEach(([a, w]) => { rr(g, a, py + T - 7, w, 8, 2); g.fillStyle = '#b07a48'; g.fill(); tinta(g, 1.8); g.fillStyle = '#d29a62'; g.fillRect(a + 2, py + T - 6, w - 4, 2); });
    const top = py + T - 34, bot = py + 2 * T - (abierto(x, y + 2) ? 7 : 0);
    [cx - 11, cx + 11].forEach(rx => { g.beginPath(); g.moveTo(rx, top); g.lineTo(rx, bot); g.lineCap = 'round'; g.lineWidth = 6.5; g.strokeStyle = INK; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#c99263'; g.stroke(); });
    for (let ry = top + 8; ry < bot - 2; ry += 11) { g.beginPath(); g.moveTo(cx - 11, ry); g.lineTo(cx + 11, ry); g.lineWidth = 4.5; g.strokeStyle = INK; g.stroke(); g.lineWidth = 2.5; g.strokeStyle = '#e0b07c'; g.stroke(); }
    // enredadera
    g.beginPath(); g.moveTo(cx + 11, top + 4);
    for (let ry = top + 4; ry < bot; ry += 8) g.lineTo(cx + 11 + Math.sin(ry * .3) * 3, ry);
    g.lineWidth = 1.6; g.strokeStyle = '#4f8f45'; g.stroke();
    for (let ry = top + 10; ry < bot; ry += 14) { elipse(g, cx + 14 + Math.sin(ry * .3) * 3, ry, 3.2, 1.8); g.fillStyle = '#7fc35e'; g.fill(); }
  }

  // ---------- elementos animados ----------
  function llama(cx, cy, now, i) {
    const f = Math.sin(now / 120 + i * 3) * .8;
    elipse(ctx, cx, cy, 3.4 + f * .3, 4.4 + f * .4); ctx.fillStyle = '#ffb347'; ctx.fill();
    elipse(ctx, cx, cy + .5, 1.8, 2.6); ctx.fillStyle = '#fff3c0'; ctx.fill();
  }
  function luces(now) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    antorchas.forEach(([x, y], i) => {
      const r = 52 + Math.sin(now / 300 + i) * 4, g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, 'rgba(255,200,110,.38)'); g.addColorStop(1, 'rgba(255,170,80,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    });
    ctx.restore();
  }
  function salida(x, y, now) {
    // arco de piedra cubierto de hiedra con una luz dorada dentro
    const cx = x * T + T / 2, fl = sueloY(x, y), top = fl - 56, w = 42, br = .8 + Math.sin(now / 500) * .2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    let g = ctx.createRadialGradient(cx, fl - 26, 4, cx, fl - 26, 80); g.addColorStop(0, `rgba(255,245,180,${.6 * br})`); g.addColorStop(1, 'rgba(255,245,180,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - 80, fl - 106, 160, 160); ctx.restore();
    const arco = (ins) => { ctx.beginPath(); ctx.moveTo(cx - w / 2 + ins, fl); ctx.lineTo(cx - w / 2 + ins, top + 20); ctx.arc(cx, top + 20, w / 2 - ins, Math.PI, 0); ctx.lineTo(cx + w / 2 - ins, fl); ctx.closePath(); };
    arco(0); ctx.fillStyle = '#c9c2b4'; ctx.fill(); tinta(ctx, 2.2);
    arco(6); g = ctx.createRadialGradient(cx, fl - 22, 2, cx, fl - 22, 36); g.addColorStop(0, '#fffde8'); g.addColorStop(.5, '#ffe9a0'); g.addColorStop(1, '#9fd4a0');
    ctx.fillStyle = g; ctx.fill(); tinta(ctx, 1.6);
    for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8, rx = cx + Math.cos(a) * (w / 2 - 2), ry = top + 20 + Math.sin(a) * (w / 2 - 2); elipse(ctx, rx, ry, 4, 2.6); ctx.fillStyle = i % 2 ? '#6fb556' : '#8fd068'; ctx.fill(); }
    [[cx - w / 2, fl - 20], [cx + w / 2, fl - 30]].forEach(([a, b]) => { elipse(ctx, a, b, 4, 2.6); ctx.fillStyle = '#7fc35e'; ctx.fill(); elipse(ctx, a + 2, b + 6, 2.2, 2.2); ctx.fillStyle = '#ffb7c9'; ctx.fill(); });
    if (Math.random() < .1) fx.push({ t: 'luciernaga', x: cx + (Math.random() - .5) * 30, y: fl - 10, vx: (Math.random() - .5) * .3, vy: -.4 - Math.random() * .4, v: 1, d: .01, r: 2.2, c: 'rgba(255,250,190,1)' });
  }
  function reja(x, y, sube, etiqueta) {
    // portón de madera atado con cuerda que se levanta
    const px = x * T, cx = px + T / 2, fl = sueloY(x, y), top = y * T + 6, w = T - 14;
    ctx.save(); ctx.beginPath(); ctx.rect(cx - w / 2 - 4, top - 4, w + 8, fl - top + 8); ctx.clip();
    ctx.translate(0, -sube * (fl - top - 4));
    for (let i = 0; i < 5; i++) { const bx = cx - w / 2 + i * w / 5; rr(ctx, bx + 1, top + 4, w / 5 - 2, fl - top - 4, 3); ctx.fillStyle = i % 2 ? '#a8774a' : '#b8865a'; ctx.fill(); tinta(ctx, 1.6); poly(ctx, [[bx + 1, top + 6], [bx + w / 10, top - 2], [bx + w / 5 - 1, top + 6]]); ctx.fill(); tinta(ctx, 1.6); }
    for (const hy of [top + 16, fl - 14]) { rr(ctx, cx - w / 2 - 2, hy - 3, w + 4, 6, 2); ctx.fillStyle = '#8a5f3a'; ctx.fill(); tinta(ctx, 1.6); }
    ctx.restore();
    // poste y cartelito con el símbolo
    [cx - w / 2 - 4, cx + w / 2 + 4].forEach(px2 => { rr(ctx, px2 - 3, top - 8, 6, fl - top + 8, 2); ctx.fillStyle = '#7a5434'; ctx.fill(); tinta(ctx, 1.6); });
    const et = etiqueta || '?';
    ctx.font = '800 12px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
    const pw = Math.max(20, ctx.measureText(et).width + 12), pyy = y * T - 4;
    rr(ctx, cx - pw / 2, pyy - 9, pw, 17, 4); ctx.fillStyle = sube >= 1 ? '#c8ecb4' : '#fff4d8'; ctx.fill(); tinta(ctx, 1.8);
    ctx.fillStyle = INK; ctx.fillText(et, cx, pyy + 3.5);
  }
  function placa(x, y, now) {
    // cartel de madera clavado en la tierra
    const px = x * T, py = y * T, br = .5 + Math.sin(now / 500) * .2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(px + T / 2, py + T / 2, 4, px + T / 2, py + T / 2, 44); g.addColorStop(0, `rgba(255,240,170,${.35 * br})`); g.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = g; ctx.fillRect(px - 10, py - 10, T + 20, T + 20); ctx.restore();
    rr(ctx, px + 9, py + 12, T - 18, T - 24, 5); ctx.fillStyle = '#d9b07c'; ctx.fill(); tinta(ctx, 2);
    ctx.fillStyle = '#c49a66'; ctx.fillRect(px + 11, py + 26, T - 22, 2);
    rr(ctx, px + 16, py + 17, T - 32, T - 34, 3); ctx.fillStyle = '#fbf3df'; ctx.fill(); tinta(ctx, 1.4);
    ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let i = 0; i < 3; i++) { ctx.moveTo(px + 21, py + 23 + i * 6); ctx.lineTo(px + T - 21 - (i === 2 ? 8 : 0), py + 23 + i * 6); }
    ctx.stroke();
  }
  function gema(x, y, now) {
    // cristal azul que flota con luz suave
    const cx = x * T + T / 2, base = sueloY(x, y) - 22, cy = base + Math.sin(now / 420 + x * 1.3 + y) * 4;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 30); g.addColorStop(0, 'rgba(150,230,255,.55)'); g.addColorStop(1, 'rgba(150,230,255,0)'); ctx.fillStyle = g; ctx.fillRect(cx - 30, cy - 30, 60, 60); ctx.restore();
    elipse(ctx, cx, sueloY(x, y) - 2, 8 - (cy - base) * .4, 2.5); ctx.fillStyle = 'rgba(60,90,50,.25)'; ctx.fill();
    const P = [[cx, cy - 14], [cx + 9, cy - 3], [cx, cy + 12], [cx - 9, cy - 3]];
    poly(ctx, P); ctx.fillStyle = '#6fc6ee'; ctx.fill();
    poly(ctx, [[cx, cy - 14], [cx + 9, cy - 3], [cx, cy - 1], [cx - 9, cy - 3]]); ctx.fillStyle = '#c2ecff'; ctx.fill();
    poly(ctx, [[cx, cy - 1], [cx + 9, cy - 3], [cx, cy + 12]]); ctx.fillStyle = '#4ea3d6'; ctx.fill();
    poly(ctx, P); tinta(ctx, 1.8);
    const tw = (now / 800 + x * .37) % 2.4;
    if (tw < .5) { const z = Math.sin(tw / .5 * Math.PI) * 6; ctx.fillStyle = '#fff'; poly(ctx, [[cx - 4, cy - 9 - z], [cx - 3, cy - 10], [cx - 4 + z, cy - 9], [cx - 3, cy - 8], [cx - 4, cy - 9 + z], [cx - 5, cy - 8], [cx - 4 - z, cy - 9], [cx - 5, cy - 10]]); ctx.fill(); }
  }

  // ---------- personajes ----------
  function miembro(x, y, a1, l1, a2, l2) {
    const kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1;
    return [[x, y], [kx, ky], [kx + Math.sin(a2) * l2, ky + Math.cos(a2) * l2]];
  }
  // Personajes (proporciones chibi). Comparten cuerpo y animaciones; cambian el
  // pelo, los colores y algún detalle de la cara.
  const PERSONAJES = {
    viajera: { nombre: 'Viajera', piel: '#ffe1c9', pielS: '#f3bfa2', pelo: '#6a4130', peloS: '#4e2e22', peloL: '#a8714c',
      bufanda: '#f06e5c', bufandaS: '#cf5444', camisa: '#fffaf0', camisaS: '#ebdfca', chaleco: '#f1b54b', chalecoS: '#d4953a',
      short: '#5f88ba', shortS: '#4b6f9b', media: '#4c5578', mediaS: '#3d4566', bota: '#8c5a3a', botaL: '#b67a50', coleta: true, iris: '#a8714c' },
    viajero: { nombre: 'Viajero', piel: '#f9d7bb', pielS: '#e9b493', pelo: '#3b2a24', peloS: '#281c18', peloL: '#6e5246',
      bufanda: '#2bb3a0', bufandaS: '#1f8d7e', camisa: '#fffaf0', camisaS: '#ebdfca', chaleco: '#78b357', chalecoS: '#5d9442',
      short: '#8a6444', shortS: '#6e4f35', media: '#4a5a46', mediaS: '#3a4838', bota: '#7a4f34', botaL: '#a87150', coleta: false, iris: '#6b8a5a' }
  };
  let pj = PERSONAJES.viajera;
  const MEJILLA = 'rgba(255,135,135,.5)', BOLSA = '#ad7a4c';
  function heroe(fx0, fy0, dir, pose, ph, k, now) {
    const run = pose === 'run', climb = pose === 'climb', atk = pose === 'attack';
    let bob = run ? -Math.abs(Math.sin(ph)) * 2.6 : climb ? Math.sin(ph * 2) * 1 : Math.sin(now / 480) * .7;
    let tilt = run ? .06 : 0, dx = 0;
    if (pose === 'bump') { dx = -Math.sin(k * Math.PI) * 5; tilt = -.25 * Math.sin(k * Math.PI); }
    if (pose === 'win') bob = -Math.abs(Math.sin(now / 240)) * 10;
    if (pose === 'stun') tilt = -.16;
    if (atk) tilt = .1;
    elipse(ctx, fx0, fy0 + 1, 14 + bob * .4, 4); ctx.fillStyle = 'rgba(60,80,40,.28)'; ctx.fill();
    ctx.save(); ctx.translate(fx0, fy0 + bob); ctx.scale(dir * 1.18, 1.18); ctx.translate(dx, 0); ctx.rotate(tilt);

    // ángulos (desde la vertical hacia abajo, positivo = hacia delante)
    let fT, fS, bT, bS, fa1, fa2, ba1, ba2;
    if (run) {
      fT = Math.sin(ph) * .9; fS = fT - 1.1 * Math.max(0, Math.sin(ph - 1.3)); bT = Math.sin(ph + Math.PI) * .9; bS = bT - 1.1 * Math.max(0, Math.sin(ph + Math.PI - 1.3));
      fa1 = -Math.sin(ph) * 1; fa2 = fa1 + 1.1; ba1 = Math.sin(ph) * 1; ba2 = ba1 + 1.1;
    } else if (climb) {
      fT = .6 + Math.sin(ph) * .5; fS = fT - 1.3; bT = .6 - Math.sin(ph) * .5; bS = bT - 1.3;
      fa1 = Math.PI - .5 + Math.sin(ph) * .35; fa2 = fa1 + .2; ba1 = Math.PI - .3 - Math.sin(ph) * .35; ba2 = ba1 + .2;
    } else if (pose === 'win') {
      fT = .3; fS = -.2; bT = -.25; bS = .1; fa1 = Math.PI - .25; fa2 = Math.PI - .05; ba1 = Math.PI - .7; ba2 = Math.PI - .5;
    } else {
      const res = Math.sin(now / 480) * .05;
      fT = .08; fS = .02; bT = -.1; bS = -.04; fa1 = .35 + res; fa2 = 1 + res; ba1 = -.25 - res; ba2 = .15;
    }
    if (atk) {
      const e = k < .35 ? k / .35 : 1, sw = k < .35 ? lerp(-.6, -2.6, e) : lerp(-2.6, 1.9, Math.min(1, (k - .35) / .3));
      fa1 = Math.PI + sw * .9; fa2 = fa1 + .15; fT = .55; fS = .15; bT = -.5; bS = -.35; ba1 = -.7; ba2 = -.2;
    }
    const hip = [0, -14], sh = [1, -26], hx = 2.5, hy = -41;
    const vel = run ? 1 : climb ? .4 : .3, ond = Math.sin(now / 140) * 3 * vel + Math.sin(now / 320) * 1.4;

    // bufanda: dos puntas al viento (detrás de todo)
    [[0, pj.bufandaS], [1, pj.bufanda]].forEach(([i, col]) => {
      const o = ond * (1 + i * .3), lx = -20 - vel * 7 - i * 3, ly = -26 + i * 4 + o;
      ctx.beginPath(); ctx.moveTo(sh[0] - 3, sh[1] - 1);
      ctx.bezierCurveTo(-8, -28 + o * .3, lx + 8, ly - 3, lx, ly);
      ctx.lineTo(lx + 1.5, ly + 4.5); ctx.bezierCurveTo(lx + 9, ly + 1, -7, -23 + o * .2, sh[0] - 2, sh[1] + 3); ctx.closePath();
      ctx.fillStyle = col; ctx.fill(); tinta(ctx, 1.5);
    });
    if (pj.coleta) {
    // coleta (detrás de la cabeza)
    const col = ond * .8;
    ctx.beginPath(); ctx.moveTo(hx - 11, hy - 6);
    ctx.bezierCurveTo(hx - 24 - col * .4, hy - 7, hx - 24 - col, hy + 6, hx - 19 - col, hy + 13);
    ctx.quadraticCurveTo(hx - 17 - col * .6, hy + 4, hx - 10, hy + 1); ctx.closePath();
    ctx.fillStyle = pj.pelo; ctx.fill(); tinta(ctx, 1.5);
    ctx.beginPath(); ctx.moveTo(hx - 15, hy - 4); ctx.quadraticCurveTo(hx - 20 - col * .5, hy + 1, hx - 19 - col, hy + 8); ctx.lineWidth = 1.2; ctx.strokeStyle = pj.peloL; ctx.stroke();
    elipse(ctx, hx - 12, hy - 5, 3, 2.6); ctx.fillStyle = pj.bufanda; ctx.fill(); tinta(ctx, 1.3);

    }
    // brazo y pierna de atrás
    const ba = miembro(sh[0] - 2, sh[1] + 2, ba1, 6.5, ba2, 6);
    trazo(ctx, ba.slice(0, 2), 5.6, pj.camisaS); trazo(ctx, ba.slice(1), 5, pj.pielS);
    elipse(ctx, ba[2][0], ba[2][1], 2.6, 2.6); ctx.fillStyle = pj.pielS; ctx.fill(); tinta(ctx, 1.2);
    const bl = miembro(hip[0] - 2.5, hip[1] + 2, bT, 6.5, bS, 6);
    trazo(ctx, bl.slice(0, 2), 5.8, pj.mediaS); trazo(ctx, bl.slice(1), 5.4, pj.mediaS);
    bota(bl[2], bS, '#6f4630', '#8f6040');
    // bolsa
    rr(ctx, hip[0] - 11, hip[1] - 5, 8.5, 8, 2.5); ctx.fillStyle = BOLSA; ctx.fill(); tinta(ctx, 1.3);
    ctx.fillStyle = '#cf9a68'; ctx.fillRect(hip[0] - 11, hip[1] - 5, 8.5, 2.5);
    // pierna de delante
    const fl = miembro(hip[0] + 2.5, hip[1] + 2, fT, 6.5, fS, 6);
    trazo(ctx, fl.slice(0, 2), 5.8, pj.media); trazo(ctx, fl.slice(1), 5.4, pj.media);
    bota(fl[2], fS, pj.bota, pj.botaL);
    // pantalón corto
    poly(ctx, [[hip[0] - 7, hip[1] - 2], [hip[0] + 7, hip[1] - 2], [hip[0] + 8.5, hip[1] + 4.5], [hip[0] + 1, hip[1] + 5], [hip[0], hip[1] + 2.5], [hip[0] - 1, hip[1] + 5], [hip[0] - 8.5, hip[1] + 4.5]]);
    ctx.fillStyle = pj.short; ctx.fill(); tinta(ctx, 1.5);
    ctx.fillStyle = pj.shortS; ctx.fillRect(hip[0] - 7.5, hip[1] + 1, 5, 3);
    // torso redondeado: camisa y chaleco
    const torso = () => { ctx.beginPath(); ctx.moveTo(hip[0] - 7, hip[1]); ctx.lineTo(hip[0] + 7, hip[1]); ctx.quadraticCurveTo(sh[0] + 8.5, (hip[1] + sh[1]) / 2, sh[0] + 6, sh[1]); ctx.quadraticCurveTo(sh[0], sh[1] - 2.5, sh[0] - 6, sh[1]); ctx.quadraticCurveTo(hip[0] - 8.5, (hip[1] + sh[1]) / 2, hip[0] - 7, hip[1]); ctx.closePath(); };
    torso(); ctx.fillStyle = pj.camisa; ctx.fill();
    ctx.save(); torso(); ctx.clip();
    ctx.fillStyle = pj.chaleco; ctx.beginPath(); ctx.moveTo(sh[0] - 8, sh[1] - 3); ctx.lineTo(sh[0] + 2, sh[1] - 3); ctx.lineTo(hip[0] + 1, hip[1] + 1); ctx.lineTo(hip[0] - 10, hip[1] + 1); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sh[0] + 6, sh[1] - 3); ctx.lineTo(sh[0] + 10, sh[1] - 3); ctx.lineTo(hip[0] + 10, hip[1] + 1); ctx.lineTo(hip[0] + 5, hip[1] + 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = pj.chalecoS; ctx.fillRect(hip[0] - 10, hip[1] - 12, 4, 13);
    ctx.restore(); torso(); tinta(ctx, 1.6);
    ctx.fillStyle = '#e7c46a'; elipse(ctx, sh[0] + 3, sh[1] + 5, .9, .9); ctx.fill(); elipse(ctx, sh[0] + 2.6, sh[1] + 9, .9, .9); ctx.fill();
    // correa
    ctx.beginPath(); ctx.moveTo(sh[0] + 5, sh[1] + .5); ctx.lineTo(hip[0] - 6.5, hip[1] - 4); ctx.lineWidth = 3.6; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = BOLSA; ctx.stroke();
    // vuelta de la bufanda
    rr(ctx, sh[0] - 6.5, sh[1] - 4.5, 13.5, 6, 3); ctx.fillStyle = pj.bufanda; ctx.fill(); tinta(ctx, 1.4);
    ctx.fillStyle = pj.bufandaS; ctx.fillRect(sh[0] - 5.5, sh[1] - 1, 11.5, 1.4);

    // ---- cabeza ----
    // pelo de atrás
    if (pj.coleta) {
      elipse(ctx, hx - 1.5, hy - 1.5, 14.5, 14); ctx.fillStyle = pj.pelo; ctx.fill(); tinta(ctx, 1.5);
      ctx.fillStyle = pj.peloS; elipse(ctx, hx - 6, hy + 4, 8, 7); ctx.fill();
    } else {
      poly(ctx, [[hx + 6, hy - 14], [hx - 4, hy - 16], [hx - 12, hy - 12], [hx - 17, hy - 9], [hx - 14, hy - 5], [hx - 18, hy - 1], [hx - 13, hy + 2], [hx - 15, hy + 7], [hx - 9, hy + 8], [hx - 4, hy + 6], [hx + 4, hy - 2]]);
      ctx.fillStyle = pj.pelo; ctx.fill(); tinta(ctx, 1.5);
      ctx.fillStyle = pj.peloS; poly(ctx, [[hx - 13, hy + 1], [hx - 14, hy + 6], [hx - 9, hy + 7], [hx - 6, hy + 2]]); ctx.fill();
    }
    // cara
    const cara = () => { ctx.beginPath(); ctx.moveTo(hx - 9, hy - 4); ctx.quadraticCurveTo(hx - 10, hy + 8, hx - 2, hy + 11.5); ctx.quadraticCurveTo(hx + 6, hy + 14, hx + 11.5, hy + 7); ctx.quadraticCurveTo(hx + 14, hy + 1, hx + 12.5, hy - 5); ctx.closePath(); };
    cara(); ctx.fillStyle = pj.piel; ctx.fill();
    ctx.save(); cara(); ctx.clip(); ctx.fillStyle = pj.pielS; elipse(ctx, hx - 9, hy + 4, 4, 9); ctx.fill(); ctx.restore();
    cara(); tinta(ctx, 1.5);
    // oreja
    elipse(ctx, hx - 6.5, hy + 2, 2.4, 3); ctx.fillStyle = pj.piel; ctx.fill(); tinta(ctx, 1.1);
    // ojos
    const aturdido = pose === 'stun', parpadeo = (now % 4300) < 120, feliz = pose === 'win';
    const ojo = (ex, ey, sx2) => {
      if (aturdido) { ctx.beginPath(); for (let t = 0; t < 1; t += .1) { const a = t * Math.PI * 3.2, rad = 3 * (1 - t * .7); ctx.lineTo(ex + Math.cos(a) * rad * sx2, ey + Math.sin(a) * rad); } tinta(ctx, 1.2); return; }
      if (parpadeo || feliz) { ctx.beginPath(); ctx.moveTo(ex - 3 * sx2, ey + (feliz ? 1 : 0)); ctx.quadraticCurveTo(ex, ey + (feliz ? -2.5 : 1.2), ex + 3 * sx2, ey + (feliz ? 1 : 0)); tinta(ctx, 1.6); return; }
      elipse(ctx, ex, ey, 2.9 * sx2, 4); ctx.fillStyle = '#fff'; ctx.fill();
      const gi = ctx.createLinearGradient(0, ey - 4, 0, ey + 4); gi.addColorStop(0, '#3a2418'); gi.addColorStop(1, pj.iris);
      elipse(ctx, ex + .5 * sx2, ey + .4, 2.3 * sx2, 3.4); ctx.fillStyle = gi; ctx.fill();
      elipse(ctx, ex + .6 * sx2, ey + .6, 1.1 * sx2, 1.6); ctx.fillStyle = '#24140e'; ctx.fill();
      elipse(ctx, ex - .5 * sx2, ey - 1.4, 1.1 * sx2, 1.1); ctx.fillStyle = '#fff'; ctx.fill();
      elipse(ctx, ex + 1.1 * sx2, ey + 1.9, .55 * sx2, .55); ctx.fill();
      ctx.beginPath(); ctx.moveTo(ex - 3.2 * sx2, ey - 2.6); ctx.quadraticCurveTo(ex, ey - 4.8, ex + 3.4 * sx2, ey - 3); ctx.lineWidth = 1.9; ctx.strokeStyle = '#2a1810'; ctx.lineCap = 'round'; ctx.stroke();
    };
    ojo(hx + 3.5, hy + 1.5, 1); ojo(hx + 10.5, hy + 1.2, .72);
    // mejillas, nariz y boca
    elipse(ctx, hx + 1.5, hy + 6.5, 2.6, 1.4); ctx.fillStyle = MEJILLA; ctx.fill();
    elipse(ctx, hx + 11.3, hy + 6.2, 1.6, 1.2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 8, hy + 4.8); ctx.lineTo(hx + 8.6, hy + 5.4); ctx.lineWidth = 1; ctx.strokeStyle = pj.pielS; ctx.stroke();
    ctx.beginPath();
    if (feliz) { ctx.moveTo(hx + 5.2, hy + 8.2); ctx.quadraticCurveTo(hx + 7.2, hy + 11.5, hx + 9.2, hy + 8.2); ctx.closePath(); ctx.fillStyle = '#c4554a'; ctx.fill(); tinta(ctx, 1.1); }
    else if (aturdido) { ctx.moveTo(hx + 5.5, hy + 9); ctx.quadraticCurveTo(hx + 7, hy + 8, hx + 8.5, hy + 9.3); tinta(ctx, 1.1); }
    else { ctx.moveTo(hx + 5.8, hy + 8.6); ctx.quadraticCurveTo(hx + 7.2, hy + 9.6, hx + 8.6, hy + 8.5); tinta(ctx, 1.1); }
    if (pj.coleta) {
    // flequillo de mechones y casquete
    ctx.beginPath();
    ctx.moveTo(hx - 13, hy + 3); ctx.quadraticCurveTo(hx - 15, hy - 15, hx, hy - 16); ctx.quadraticCurveTo(hx + 14, hy - 15, hx + 14, hy - 2);
    ctx.lineTo(hx + 12.2, hy - 4); ctx.lineTo(hx + 11, hy + .5); ctx.lineTo(hx + 9, hy - 5.5);
    ctx.lineTo(hx + 6.5, hy - 1.5); ctx.lineTo(hx + 5, hy - 6.5); ctx.lineTo(hx + 2.5, hy - 2.5);
    ctx.lineTo(hx + 1, hy - 7.5); ctx.lineTo(hx - 2, hy - 3); ctx.lineTo(hx - 4, hy - 7);
    ctx.quadraticCurveTo(hx - 7, hy - 2, hx - 8, hy + 6); ctx.lineTo(hx - 10.5, hy + 9); ctx.closePath();
    ctx.fillStyle = pj.pelo; ctx.fill(); tinta(ctx, 1.5);
    } else {
    // flequillo de punta y casquete
    ctx.beginPath();
    ctx.moveTo(hx - 13, hy + 2); ctx.quadraticCurveTo(hx - 15, hy - 14, hx - 2, hy - 16); ctx.quadraticCurveTo(hx + 13, hy - 16, hx + 14, hy - 3);
    ctx.lineTo(hx + 12, hy - 5); ctx.lineTo(hx + 12.5, hy - .5); ctx.lineTo(hx + 9.5, hy - 5.5); ctx.lineTo(hx + 8, hy - 2);
    ctx.lineTo(hx + 6, hy - 7); ctx.lineTo(hx + 3.5, hy - 3); ctx.lineTo(hx + 1.5, hy - 8); ctx.lineTo(hx - 1.5, hy - 4); ctx.lineTo(hx - 3.5, hy - 8.5);
    ctx.quadraticCurveTo(hx - 7, hy - 3, hx - 8, hy + 3); ctx.lineTo(hx - 11, hy + 5); ctx.closePath();
    ctx.fillStyle = pj.pelo; ctx.fill(); tinta(ctx, 1.5);
    // cejas marcadas
    if (!aturdido) { ctx.beginPath(); ctx.moveTo(hx + 1.5, hy - 2.6); ctx.lineTo(hx + 5.6, hy - 3.4); ctx.moveTo(hx + 9, hy - 3.3); ctx.lineTo(hx + 12, hy - 2.7); ctx.lineWidth = 1.6; ctx.strokeStyle = pj.peloS; ctx.lineCap = 'round'; ctx.stroke(); }
    }
    // brillo del pelo
    ctx.beginPath(); ctx.arc(hx - 1, hy - 3, 11, Math.PI * 1.18, Math.PI * 1.55); ctx.lineWidth = 2.2; ctx.strokeStyle = pj.peloL; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.arc(hx - 1, hy - 3, 11, Math.PI * 1.62, Math.PI * 1.72); ctx.stroke();
    if (pj.coleta) {
    // pelo de punta
    ctx.beginPath(); ctx.moveTo(hx + 1, hy - 15.5); ctx.quadraticCurveTo(hx + 3 + ond * .15, hy - 22, hx + 7 + ond * .2, hy - 21); ctx.quadraticCurveTo(hx + 4, hy - 19, hx + 4, hy - 15.5); ctx.closePath();
    ctx.fillStyle = pj.pelo; ctx.fill(); tinta(ctx, 1.3);

    } else {
    // tres mechones de punta
    [[-6, -14, -10, -21, -3], [0, -16, 1, -24, 4], [6, -15, 10, -21, 9]].forEach(([a1, b1, a2, b2, a3]) => {
      ctx.beginPath(); ctx.moveTo(hx + a1, hy + b1); ctx.quadraticCurveTo(hx + (a1 + a2) / 2 + ond * .1, hy + b2 + 2, hx + a2 + ond * .15, hy + b2); ctx.quadraticCurveTo(hx + (a2 + a3) / 2, hy + b1 - 3, hx + a3, hy + b1 + .5); ctx.closePath();
      ctx.fillStyle = pj.pelo; ctx.fill(); tinta(ctx, 1.3);
    });
    }
    // brazo de delante con espada corta
    const fa = miembro(sh[0] + 2, sh[1] + 2, fa1, 6.5, fa2, 6);
    trazo(ctx, fa.slice(0, 2), 5.8, pj.camisa); trazo(ctx, fa.slice(1), 5.2, pj.piel);
    const ang = Math.atan2(fa[2][1] - fa[1][1], fa[2][0] - fa[1][0]) + (atk ? 0 : climb ? -2.4 : -1.25);
    ctx.save(); ctx.translate(fa[2][0], fa[2][1]); ctx.rotate(ang);
    if (atk && k > .3 && k < .75) {
      ctx.save(); ctx.rotate(-.9); ctx.globalAlpha = .75 * (1 - Math.abs(k - .52) / .25);
      ctx.beginPath(); ctx.arc(0, 0, 27, -.25, 1.3); ctx.arc(0, 0, 15, 1.3, -.25, true); ctx.closePath();
      const sg = ctx.createLinearGradient(0, 0, 27, 18); sg.addColorStop(0, 'rgba(255,255,255,.95)'); sg.addColorStop(1, 'rgba(200,240,190,.15)'); ctx.fillStyle = sg; ctx.fill(); ctx.restore();
    }
    poly(ctx, [[4.5, -2], [20, -1.5], [23, 0], [20, 1.5], [4.5, 2]]); ctx.fillStyle = '#f1f5f7'; ctx.fill(); tinta(ctx, 1.4);
    ctx.beginPath(); ctx.moveTo(6.5, -.4); ctx.lineTo(19, -.2); ctx.strokeStyle = '#b8c4cc'; ctx.lineWidth = .9; ctx.stroke();
    rr(ctx, 2.3, -4.5, 2.8, 9, 1.2); ctx.fillStyle = '#d6ac4c'; ctx.fill(); tinta(ctx, 1.1);
    rr(ctx, -3.5, -1.8, 6.3, 3.6, 1.4); ctx.fillStyle = '#7a5434'; ctx.fill(); tinta(ctx, 1);
    ctx.restore();
    elipse(ctx, fa[2][0], fa[2][1], 2.8, 2.8); ctx.fillStyle = pj.piel; ctx.fill(); tinta(ctx, 1.2);
    ctx.restore();
    if (pose === 'stun') for (let i = 0; i < 3; i++) { const a = now / 320 + i * 2.1; estrellita(fx0 + Math.cos(a) * 15, fy0 - 76 + Math.sin(a) * 4, 4.2); }
  }
  function bota(p, a, col, cuello) {
    ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(-a * .3);
    ctx.beginPath(); ctx.moveTo(-3.2, -4); ctx.lineTo(3.2, -4); ctx.quadraticCurveTo(8.5, -2, 8, 1.6); ctx.lineTo(-3.2, 1.6); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); tinta(ctx, 1.4);
    if (cuello) { rr(ctx, -3.8, -5.5, 7.6, 2.6, 1.2); ctx.fillStyle = cuello; ctx.fill(); tinta(ctx, 1); }
    ctx.restore();
  }
  function estrellita(x, y, r) {
    poly(ctx, Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? r * .45 : r; return [x + Math.cos(a) * q, y + Math.sin(a) * q]; }));
    ctx.fillStyle = '#ffe58a'; ctx.fill(); tinta(ctx, 1.2);
  }
  // Enemigo: roca gruñona cubierta de musgo, con un brote en la cabeza
  function enemigo(e, fx0, fy0, dir, now, alpha, hitK, hp, sube) {
    const br = Math.sin(now / 420 + e.x * 1.7), kb = hitK >= 0 && hitK < .6 ? Math.sin(hitK / .6 * Math.PI) * 6 : 0;
    const musgo = `hsl(${(e.hue % 60) + 85},45%,52%)`, musgoS = `hsl(${(e.hue % 60) + 85},45%,38%)`;
    ctx.save(); ctx.globalAlpha = alpha;
    elipse(ctx, fx0, fy0 + 1, 18, 4.5); ctx.fillStyle = 'rgba(60,80,40,.28)'; ctx.fill();
    ctx.translate(fx0 - dir * kb, fy0); ctx.scale(dir, 1);
    if (alpha < 1) ctx.scale(1 + (1 - alpha) * .3, Math.max(.05, alpha));
    const sy = 1 + br * .025;
    // patitas
    [[-8, '#8d877c'], [6, '#a39d91']].forEach(([lx, c]) => { rr(ctx, lx - 3.5, -7, 8, 7, 3); ctx.fillStyle = c; ctx.fill(); tinta(ctx, 1.6); });
    const cuerpo = () => { ctx.beginPath(); ctx.moveTo(-17, -5); ctx.bezierCurveTo(-22, -20 * sy, -15, -38 * sy, 0, -38 * sy); ctx.bezierCurveTo(15, -38 * sy, 22, -22 * sy, 18, -5); ctx.quadraticCurveTo(1, 1, -17, -5); ctx.closePath(); };
    cuerpo(); ctx.fillStyle = '#b3ac9f'; ctx.fill();
    ctx.save(); cuerpo(); ctx.clip();
    ctx.fillStyle = '#958f83'; elipse(ctx, -10, -6, 20, 14); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.3)'; elipse(ctx, 6, -26 * sy, 7, 4); ctx.fill();
    // manto de musgo
    ctx.beginPath(); ctx.moveTo(-24, -24 * sy);
    for (let i = 0; i <= 8; i++) ctx.quadraticCurveTo(-21 + i * 5.5, -18 * sy + (i % 2 ? 4 : -1), -18 + i * 5.5, -22 * sy + (i % 2 ? 3 : 0));
    ctx.lineTo(24, -45); ctx.lineTo(-24, -45); ctx.closePath(); ctx.fillStyle = musgo; ctx.fill();
    ctx.fillStyle = musgoS; elipse(ctx, -8, -30 * sy, 8, 4); ctx.fill();
    ctx.restore(); cuerpo(); tinta(ctx, 2);
    // brote
    ctx.beginPath(); ctx.moveTo(2, -38 * sy); ctx.quadraticCurveTo(1, -44 * sy, 3, -47 * sy); ctx.lineWidth = 1.6; ctx.strokeStyle = '#4f8f45'; ctx.stroke();
    [[-1, -1], [1, 1]].forEach(([s2]) => { ctx.beginPath(); ctx.ellipse(3 + s2 * 4, -47 * sy, 4.5, 2.4, s2 * .5, 0, Math.PI * 2); ctx.fillStyle = '#8fd068'; ctx.fill(); tinta(ctx, 1.2); });
    // ojos redondos y cejas enfadadas
    [[5, 0], [13, 1]].forEach(([ex, i]) => { elipse(ctx, ex, -20, 3.2, 3.6); ctx.fillStyle = '#fff'; ctx.fill(); tinta(ctx, 1.3); elipse(ctx, ex + 1, -19.5, 1.6, 2); ctx.fillStyle = '#2b2420'; ctx.fill(); });
    ctx.beginPath(); ctx.moveTo(1.5, -26.5); ctx.lineTo(7.5, -24); ctx.moveTo(16.5, -26.5); ctx.lineTo(10.5, -24); tinta(ctx, 1.8);
    ctx.beginPath(); ctx.moveTo(6, -11); ctx.quadraticCurveTo(10, -14, 14, -11); tinta(ctx, 1.6);
    if (hitK >= 0 && hitK < .3) { cuerpo(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill(); }
    ctx.restore();
    if (alpha > .3) {
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.font = '800 12px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center';
      const tw = ctx.measureText(e.name).width + 14, ty = fy0 - 74 - (sube ? 26 : 0);
      rr(ctx, fx0 - tw / 2, ty - 11, tw, 17, 8); ctx.fillStyle = '#fffaf0'; ctx.fill(); tinta(ctx, 1.6);
      ctx.fillStyle = INK; ctx.fillText(e.name, fx0, ty + 2);
      for (let i = 0; i < e.max; i++) { rr(ctx, fx0 - e.max * 5.5 + i * 11 + 1, ty + 9, 9, 6, 3); ctx.fillStyle = i < hp ? '#ef7d6c' : '#d9cfc0'; ctx.fill(); tinta(ctx, 1.2); }
      ctx.restore();
    }
  }
  function bocadillo(x, y, text) {
    ctx.font = '800 14px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center';
    let lineas = String(text).split('\n');
    if (lineas.length > 4) lineas = lineas.slice(0, 3).concat('…');
    lineas = lineas.map(l => l.length > 34 ? l.slice(0, 33) + '…' : l);
    const w = Math.max(...lineas.map(l => ctx.measureText(l).width)) + 22, h = 12 + lineas.length * 17;
    let bx = Math.max(-M + 6, Math.min(W + M - w - 6, x - w / 2)); const by = y - h - 10;
    ctx.beginPath(); ctx.moveTo(bx + 12, by); ctx.lineTo(bx + w - 12, by); ctx.quadraticCurveTo(bx + w, by, bx + w, by + 12); ctx.lineTo(bx + w, by + h - 12); ctx.quadraticCurveTo(bx + w, by + h, bx + w - 12, by + h);
    ctx.lineTo(x + 7, by + h); ctx.lineTo(x - 2, by + h + 10); ctx.lineTo(x - 5, by + h); ctx.lineTo(bx + 12, by + h); ctx.quadraticCurveTo(bx, by + h, bx, by + h - 12); ctx.lineTo(bx, by + 12); ctx.quadraticCurveTo(bx, by, bx + 12, by); ctx.closePath();
    ctx.fillStyle = '#fff4dc'; ctx.fill(); tinta(ctx, 2.6);
    ctx.fillStyle = INK; lineas.forEach((l, i) => ctx.fillText(l, bx + w / 2, by + 19 + i * 17));
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
      else if (p.t === 'hoja' || p.t === 'petalo') {
        p.rot = (p.rot || Math.random() * 6) + (p.t === 'hoja' ? .12 : .06) * f; if (p.t === 'petalo') p.vx += Math.sin(p.rot * 2) * .03 * f;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.abs(Math.cos(p.rot * 1.3)) * .8 + .2);
        ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * .5, 0, 0, Math.PI * 2); ctx.fillStyle = p.c; ctx.fill();
        if (p.t === 'hoja') { ctx.beginPath(); ctx.moveTo(-p.r, 0); ctx.lineTo(p.r, 0); ctx.lineWidth = .8; ctx.strokeStyle = 'rgba(40,80,30,.6)'; ctx.stroke(); }
        ctx.restore();
      }
      else if (p.t === 'luciernaga') { p.vx += (Math.random() - .5) * .05 * f; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4); gl.addColorStop(0, 'rgba(255,250,180,.9)'); gl.addColorStop(1, 'rgba(255,250,180,0)'); ctx.fillStyle = gl; ctx.fillRect(p.x - p.r * 4, p.y - p.r * 4, p.r * 8, p.r * 8); ctx.restore(); }
      else if (p.t === 'texto') { ctx.font = '900 20px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.strokeText(p.s, p.x, p.y); ctx.fillStyle = p.c; ctx.fillText(p.s, p.x, p.y); }
      else { ctx.save(); ctx.globalCompositeOperation = 'lighter'; elipse(ctx, p.x, p.y, p.r, p.r); ctx.fillStyle = p.c; ctx.fill(); ctx.restore(); }
    });
    ctx.globalAlpha = 1;
  }
  function evento(p, c) {
    if (!sim || !p || !c) return;
    const hx = c.hx * T + T / 2, hy = sueloY(c.hx, c.hy);
    if (c.hx !== p.hx && solido(c.hx, c.hy + 1)) for (let i = 0; i < 3; i++) fx.push({ t: 'polvo', x: hx - c.facing * 10 + Math.random() * 6, y: hy - 3, vx: -c.facing * (.3 + Math.random() * .4), vy: -.2 - Math.random() * .3, v: .8, d: .03, r: 3 + Math.random() * 2, c: 'rgba(230,205,160,.6)' });
    c.gems.forEach((g, i) => { if (g.taken && p.gems[i] && !p.gems[i].taken) {
      const gx = g.x * T + T / 2, gy = sueloY(g.x, g.y) - 22;
      chispas(gx, gy, 18, ['#c2ecff', '#ffffff', '#fff3b0'], 3.2, .05);
      fx.push({ t: 'anillo', x: gx, y: gy, vx: 0, vy: 0, v: 1, d: .05, r: 6, c: '#9fe0ff' });
      fx.push({ t: 'texto', s: '+1 💎', x: gx, y: gy - 16, vx: 0, vy: -.8, v: 1, d: .018, c: '#6fc6ee' });
    } });
    if (c.attack) {
      const ax = c.attack.x * T + T / 2, ay = sueloY(c.attack.x, c.attack.y) - 26;
      chispas(ax - c.facing * 6, ay, 8, ['#ffffff', '#fff3c0'], 3, .08); shake = Math.max(shake, 4);
      for (let j = 0; j < 7; j++) fx.push({ t: 'hoja', x: ax, y: ay - 6, vx: (Math.random() - .5) * 4 + c.facing * 1.5, vy: -1.5 - Math.random() * 2, v: 1, d: .016, g: .08, r: 3 + Math.random() * 2.5, c: ['#8fd068', '#6fb556', '#b5e88a'][j % 3] });
      fx.push({ t: 'texto', s: '-1', x: ax + 8, y: ay - 26, vx: 0, vy: -.9, v: 1, d: .022, c: '#ef7d6c' });
    }
    c.enemies.forEach((e, i) => { const pe = p.enemies[i]; if (pe && pe.hp > 0 && e.hp <= 0) {
      const ex = e.x * T + T / 2, ey = sueloY(e.x, e.y) - 22;
      for (let j = 0; j < 14; j++) fx.push({ t: 'humo', x: ex + (Math.random() - .5) * 26, y: ey + (Math.random() - .5) * 26, vx: (Math.random() - .5) * 1, vy: -.3 - Math.random() * .6, v: 1, d: .02 + Math.random() * .01, r: 5 + Math.random() * 6, c: 'rgba(225,215,195,.75)' });
      for (let j = 0; j < 16; j++) fx.push({ t: 'hoja', x: ex + (Math.random() - .5) * 20, y: ey - 10, vx: (Math.random() - .5) * 4, vy: -2 - Math.random() * 2.5, v: 1.2, d: .012, g: .07, r: 3 + Math.random() * 3, c: ['#8fd068', '#6fb556', '#b5e88a', '#e8d27a'][j % 4] });
      for (let j = 0; j < 6; j++) fx.push({ t: 'luciernaga', x: ex + (Math.random() - .5) * 20, y: ey, vx: (Math.random() - .5) * .8, vy: -.6 - Math.random() * .6, v: 1, d: .01, r: 2, c: '' });
      shake = Math.max(shake, 6);
    } });
    if (c.vidas < p.vidas) { perdida = performance.now(); fx.push({ t: 'texto', s: '💔', x: hx, y: hy - 70, vx: 0, vy: -.7, v: 1, d: .016, c: '#ff4f6b' }); }
    if (c.bump) { shake = Math.max(shake, 7); chispas(hx + c.bump[0] * 26, hy - 30 + c.bump[1] * 26, 8, ['#ffe58a', '#ffffff'], 3, .1); }
    sim.doors.forEach((d, i) => { if (!(c.doors && c.doors[i] && !(p.doors && p.doors[i]))) return; const dx = d.x * T + T / 2, dy = sueloY(d.x, d.y); for (let i = 0; i < 10; i++) fx.push({ t: 'polvo', x: dx + (Math.random() - .5) * 46, y: dy - 2, vx: (Math.random() - .5) * 1.5, vy: -.3 - Math.random() * .5, v: 1, d: .02, r: 4 + Math.random() * 3, c: 'rgba(230,190,160,.6)' }); shake = Math.max(shake, 4); });
    if (c.end === 'win') {
      victoria = performance.now();
      const cols = ['#ffd1dc', '#ffffff', '#ffb7c9', '#fff2a8', '#c8ecb4'];
      for (let i = 0; i < 90; i++) fx.push({ t: 'petalo', x: hx + (Math.random() - .5) * 30, y: hy - 50, vx: (Math.random() - .5) * 7, vy: -Math.random() * 7 - 2, v: 1.8, d: .007, g: .09, r: 3 + Math.random() * 2.5, c: cols[i % 5] });
      for (let i = 0; i < 14; i++) fx.push({ t: 'luciernaga', x: hx + (Math.random() - .5) * 60, y: hy - 30, vx: (Math.random() - .5) * 1, vy: -.5 - Math.random() * .8, v: 1.4, d: .007, r: 2.2, c: '' });
    }
  }

  // ---------- estado del héroe ----------
  function poseHeroe(p, c, k, playing) {
    if (!playing) {
      if (sim.over && sim.over.type === 'win') return { pose: 'win', ph: 0 };
      if (sim.over && sim.over.type === 'fail' && /vidas/.test(sim.over.msg)) return { pose: 'stun', ph: 0 };
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
    // el nivel se apoya en el borde de abajo: la última fila de tierra queda medio cortada
    const visible = H - T * .55;
    s = Math.min((LW - 70) / W, (LH - 80) / visible, 1.35);
    ox = (LW - W * s) / 2; oy = LH - visible * s;
    cv.width = LW * dpr; cv.height = LH * dpr;
    if (!capaFondo || capaFondo.width !== LW * dpr) { capaFondo = pintaFondo(); nubesMoviles = [90, 120, 70, 100].map((w, i) => ({ w, c: spriteNube(w, 300 + i * 11) })); }
    capaNivel = pintaNivel();
    fx = []; shake = 0; victoria = 0; perdida = 0;
  }
  function pinta(now, st) {
    if (!sim) return;
    const dt = Math.min(50, ultimo ? now - ultimo : 16); ultimo = now;
    const { p, c, k, playing } = st;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(capaFondo, 0, 0, LW, LH);
    // nubecillas que se mueven y pájaros
    nubesMoviles.forEach((n, i) => {
      const r = semilla(100 + i), y = 40 + r() * 110, x = ((r() * (LW + n.w * 2) + now * (.005 + r() * .006)) % (LW + n.w * 2)) - n.w * 1.4;
      ctx.globalAlpha = .9; ctx.drawImage(n.c, x, y, n.w * 1.4, n.w * .7); ctx.globalAlpha = 1;
    });
    for (let i = 0; i < 3; i++) {
      const bx = ((now * .03 + i * 170) % (LW + 200)) - 100, by = 120 + i * 26 + Math.sin(now / 900 + i) * 8, a = Math.sin(now / 160 + i * 2) * 4;
      ctx.beginPath(); ctx.moveTo(bx - 7, by - a); ctx.quadraticCurveTo(bx - 3, by - 3, bx, by); ctx.quadraticCurveTo(bx + 3, by - 3, bx + 7, by - a); ctx.lineWidth = 1.8; ctx.strokeStyle = 'rgba(70,80,100,.6)'; ctx.stroke();
    }
    const sx = shake > .3 ? (Math.random() - .5) * shake : 0, sy = shake > .3 ? (Math.random() - .5) * shake : 0;
    shake *= Math.pow(.86, dt / 16.7);
    ctx.save(); ctx.translate(ox + sx, oy + sy); ctx.scale(s, s);
    ctx.drawImage(capaNivel, -M, -M, W + 2 * M, H + M + MB);
    luces(now);
    antorchas.forEach(([x, y], i) => llama(x, y, now, i));
    placas.forEach(([x, y]) => placa(x, y, now));
    if (sim.exit) salida(sim.exit.x, sim.exit.y, now);
    sim.doors.forEach((d, i) => { const co = c.doors && c.doors[i], po = p.doors && p.doors[i]; reja(d.x, d.y, co && !po ? ease(k) : (co ? 1 : 0), d.etiqueta); });
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
      // si hay otro bicho pegado, alterna la altura del cartel para que no se pisen
      const sube = e.x % 2 === 1 && c.enemies.some(o => o !== e && o.hp > 0 && o.y === e.y && Math.abs(o.x - e.x) === 1);
      dib.push({ z: e.y + .001 * e.x, f: () => enemigo(e, e.x * T + T / 2, sueloY(e.x, e.y), dir, now, alpha, hit ? k : -1, k < .3 ? pe.hp : e.hp, sube) });
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
    if (c.say && playing) bocadillo(fxp, fyp - 86, c.say);
    ctx.restore();
    // rayos de sol y motas de luz flotando
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const a = .55 + Math.sin(now / 2600 + i * 1.7) * .04, x0 = LW * (.55 + i * .13), alfa = .04 + Math.sin(now / 1900 + i) * .02;
      const g2 = ctx.createLinearGradient(x0, 0, x0 - Math.cos(a) * 600, Math.sin(a) * 600); g2.addColorStop(0, `rgba(255,236,170,${alfa})`); g2.addColorStop(1, 'rgba(255,236,170,0)');
      ctx.fillStyle = g2; poly(ctx, [[x0 - 20, -10], [x0 + 30 + i * 8, -10], [x0 + 30 + i * 8 - Math.cos(a) * 700, Math.sin(a) * 700], [x0 - 20 - Math.cos(a) * 700 - 60, Math.sin(a) * 700]]); ctx.fill();
    }
    for (let i = 0; i < 16; i++) {
      const r = semilla(500 + i), vx = (r() - .5) * .012, vy = -.006 - r() * .01;
      const x = ((r() * LW + now * vx * 40 + Math.sin(now / 1300 + i) * 20) % LW + LW) % LW, y = ((r() * LH + now * vy * 40 + Math.cos(now / 1100 + i * 2) * 14) % LH + LH) % LH, tam = 1 + r() * 1.4, br = .15 + .5 * Math.max(0, Math.sin(now / (600 + r() * 700) + i * 3));
      const g3 = ctx.createRadialGradient(x, y, 0, x, y, tam * 3.4); g3.addColorStop(0, `rgba(250,255,190,${br})`); g3.addColorStop(1, 'rgba(250,255,190,0)');
      ctx.fillStyle = g3; ctx.fillRect(x - tam * 3, y - tam * 3, tam * 6, tam * 6);
    }
    ctx.restore();
    // pétalos y hojas que cruzan con el viento
    for (let i = 0; i < 9; i++) {
      const r = semilla(800 + i), sp = .02 + r() * .025, x = ((r() * (LW + 100) + now * sp) % (LW + 100)) - 50, y = ((r() * LH + now * sp * .35) % (LH + 40)) - 20 + Math.sin(now / 700 + i) * 10, rot = now / (500 + r() * 400) + i;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, Math.abs(Math.cos(rot * 1.3)) * .7 + .3);
      ctx.beginPath(); ctx.ellipse(0, 0, 3.5, 1.8, 0, 0, Math.PI * 2); ctx.fillStyle = i % 3 ? 'rgba(255,205,220,.85)' : 'rgba(150,205,110,.85)'; ctx.fill(); ctx.restore();
    }
    // destello rojo al perder una vida
    const tp = perdida ? (performance.now() - perdida) / 600 : 2;
    if (tp < 1) { const r = ctx.createRadialGradient(LW / 2, LH / 2, LH * .3, LW / 2, LH / 2, LW * .7); r.addColorStop(0, 'rgba(255,40,70,0)'); r.addColorStop(1, `rgba(255,40,70,${.45 * (1 - tp)})`); ctx.fillStyle = r; ctx.fillRect(0, 0, LW, LH); }
    // vidas
    const vidas = c.vidas != null ? c.vidas : 3, antes = p.vidas != null ? p.vidas : vidas;
    for (let i = 0; i < 3; i++) {
      const hx2 = 34 + i * 46, hy2 = 34, viva = i < vidas, rompiendo = !viva && i < antes && playing;
      ctx.save(); ctx.translate(hx2, hy2); ctx.scale(1.5, 1.5);
      if (rompiendo) { const e = 1 + Math.sin(Math.min(1, k) * Math.PI) * .5; ctx.scale(e, e); ctx.rotate((k - .5) * .6); }
      else if (viva) { const lat = 1 + Math.max(0, Math.sin(now / 260 + i * .4)) * .06; ctx.scale(lat, lat); }
      corazon(viva || rompiendo ? '#ff4f6b' : '#4a2a55', viva || rompiendo);
      ctx.restore();
    }
    // viñeta
    const v = ctx.createRadialGradient(LW / 2, LH / 2, LH * .45, LW / 2, LH / 2, LW * .72);
    v.addColorStop(0, 'rgba(90,70,40,0)'); v.addColorStop(1, 'rgba(90,70,40,.18)'); ctx.fillStyle = v; ctx.fillRect(0, 0, LW, LH);
  }
  function corazon(col, brillo) {
    ctx.beginPath(); ctx.moveTo(0, 9);
    ctx.bezierCurveTo(-15, -1, -12, -15, 0, -7); ctx.bezierCurveTo(12, -15, 15, -1, 0, 9); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); tinta(ctx, 2.6);
    if (brillo) { ctx.fillStyle = 'rgba(255,255,255,.6)'; elipse(ctx, -5, -6, 3, 2); ctx.fill(); }
  }
  function limpia() { fx = []; shake = 0; victoria = 0; perdida = 0; }
  function personaje(quien) { if (PERSONAJES[quien]) pj = PERSONAJES[quien]; }
  // retrato animado del personaje (para elegirlo en la página de inicio)
  function retrato(now, quien, ratio, alegre) {
    const w = 170, h = 180, d = ratio || 1;
    if (cv.width !== w * d) { cv.width = w * d; cv.height = h * d; }
    const antes = pj; if (PERSONAJES[quien]) pj = PERSONAJES[quien];
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, w, h);
    const fondo = ctx.createLinearGradient(0, 0, 0, h); fondo.addColorStop(0, '#59a9ea'); fondo.addColorStop(.7, '#bfe2f7'); fondo.addColorStop(.7, '#7ec35e'); fondo.addColorStop(1, '#5aa845');
    ctx.fillStyle = fondo; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; elipse(ctx, 40, 34, 26, 9); ctx.fill(); elipse(ctx, 55, 29, 16, 9); ctx.fill(); elipse(ctx, 132, 52, 20, 7); ctx.fill();
    for (let i = 0; i < 14; i++) { ctx.fillStyle = ['#9edb72', '#6fb556'][i % 2]; elipse(ctx, (i * 37) % w, h * .74 + (i * 13) % 30, 6, 3); ctx.fill(); }
    ctx.save(); ctx.translate(w / 2 - 6, h - 24); ctx.scale(1.75, 1.75);
    heroe(0, 0, 1, alegre ? 'win' : 'idle', 0, 0, now);
    ctx.restore();
    pj = antes;
  }
  return { prepara, pinta, evento, limpia, personaje, retrato };
}
