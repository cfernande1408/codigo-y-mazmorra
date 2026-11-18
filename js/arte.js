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
  let capaFondo = null, capaNivel = null;
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

  // ---------- fondo: cielo de verano, nubes grandes, montañas y colinas ----------
  function pintaFondo() {
    const c = lienzo(LW * dpr, LH * dpr), g = c.getContext('2d'); g.scale(dpr, dpr);
    const sk = g.createLinearGradient(0, 0, 0, LH);
    sk.addColorStop(0, '#6fb1e6'); sk.addColorStop(.45, '#a8d4f2'); sk.addColorStop(.75, '#e3f1f4'); sk.addColorStop(1, '#fbf1d8');
    g.fillStyle = sk; g.fillRect(0, 0, LW, LH);
    manchas(g, 0, 0, LW, LH * .6, 'rgba(255,255,255,A)', 26, 4, .35);
    const r = semilla(9);
    cumulo(g, LW * .18, LH * .34, 210, r); cumulo(g, LW * .62, LH * .3, 300, r); cumulo(g, LW * .93, LH * .42, 170, r);
    for (let i = 0; i < 5; i++) nubecilla(g, r() * LW, 30 + r() * 90, 50 + r() * 70);
    // montañas lejanas azuladas
    capaColinas(g, LH * .58, '#9fbfdc', 120, 3, .7);
    capaColinas(g, LH * .66, '#8fb59c', 70, 7, 1);
    arbolesLejanos(g, LH * .7, 13);
    capaColinas(g, LH * .76, '#7fac6a', 45, 17, 1.3);
    arbolesLejanos(g, LH * .8, 27);
    capaColinas(g, LH * .88, '#679a57', 30, 31, 1.6);
    manchas(g, 0, LH * .55, LW, LH * .45, 'rgba(255,250,220,A)', 18, 21, .25);
    papel(g, LW, LH, 5);
    return c;
  }
  function cumulo(g, cx, base, w, r) {
    const bolas = [];
    for (let i = 0; i < 9; i++) { const t = i / 8; bolas.push([cx + (t - .5) * w * .9 + (r() - .5) * 20, base - Math.sin(t * Math.PI) * w * .32 - r() * w * .08, w * (.13 + r() * .12)]); }
    g.fillStyle = 'rgba(170,190,215,.55)'; bolas.forEach(([x, y, q]) => { elipse(g, x + 6, y + 10, q, q * .85); g.fill(); });
    bolas.forEach(([x, y, q]) => { const gr = g.createRadialGradient(x - q * .3, y - q * .4, q * .1, x, y, q); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.7, '#f4f8fb'); gr.addColorStop(1, '#dbe6f0'); g.fillStyle = gr; elipse(g, x, y, q, q * .85); g.fill(); });
    g.fillStyle = 'rgba(200,214,232,.7)'; elipse(g, cx, base + 2, w * .5, 10); g.fill();
    g.fillStyle = '#f2f6fa'; elipse(g, cx, base - 6, w * .46, 12); g.fill();
  }
  function nubecilla(g, x, y, w) {
    g.fillStyle = 'rgba(255,255,255,.75)'; elipse(g, x, y, w * .4, w * .12); g.fill(); elipse(g, x + w * .2, y - 5, w * .22, w * .1); g.fill();
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
  const MB = 380;
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
  // La viajera: pelo castaño a media melena, bufanda coral al viento, camisa clara,
  // chaleco mostaza, pantalón azul, bolsa en bandolera y una espada corta.
  const PIEL = '#f7d4b6', PIEL_S = '#e6b293', MEJILLA = 'rgba(240,140,140,.55)', PELO = '#5b3a29', PELO_L = '#7a523a',
    BUFANDA = '#e9765b', BUFANDA_S = '#c75a43', CAMISA = '#fcf5e6', CAMISA_S = '#e5d8bf', CHALECO = '#e2ae4a', CHALECO_S = '#c38d33',
    PANT = '#6c90b6', PANT_S = '#56789c', BOTA = '#8a5a3c', BOLSA = '#a9764a';
  function miembroG(pts, w, col, sombra) {
    trazo(ctx, pts, w, col);
    if (sombra) { ctx.beginPath(); pts.forEach(([a, b], i) => i ? ctx.lineTo(a - 1.4, b + .3) : ctx.moveTo(a - 1.4, b + .3)); ctx.lineWidth = Math.max(1.4, w - 4); ctx.strokeStyle = sombra; ctx.lineCap = 'round'; ctx.stroke(); }
  }
  function heroe(fx0, fy0, dir, pose, ph, k, now) {
    const run = pose === 'run', climb = pose === 'climb', atk = pose === 'attack';
    let bob = run ? -Math.abs(Math.sin(ph)) * 2.6 : climb ? Math.sin(ph * 2) * 1 : Math.sin(now / 480) * .8;
    let lean = run ? 3.5 : 0, tilt = 0, dx = 0;
    if (pose === 'bump') { dx = -Math.sin(k * Math.PI) * 5; tilt = -.25 * Math.sin(k * Math.PI); }
    if (pose === 'win') bob = -Math.abs(Math.sin(now / 240)) * 10;
    if (pose === 'stun') tilt = -.18;
    elipse(ctx, fx0, fy0 + 1, 15 + bob * .5, 4); ctx.fillStyle = 'rgba(60,80,40,.28)'; ctx.fill();
    ctx.save(); ctx.translate(fx0, fy0 + bob); ctx.scale(dir * 1.1, 1.1); ctx.translate(dx, 0); ctx.rotate(tilt);
    let fT, fS, bT, bS, fa1, fa2, ba1, ba2;
    if (run) {
      fT = Math.sin(ph) * .8; fS = fT - .95 * Math.max(0, Math.sin(ph - 1.3)); bT = Math.sin(ph + Math.PI) * .8; bS = bT - .95 * Math.max(0, Math.sin(ph + Math.PI - 1.3));
      fa1 = -Math.sin(ph) * .85; fa2 = fa1 + .9; ba1 = Math.sin(ph) * .85; ba2 = ba1 + .9;
    } else if (climb) {
      fT = .5 + Math.sin(ph) * .5; fS = fT - 1.2; bT = .5 - Math.sin(ph) * .5; bS = bT - 1.2;
      fa1 = Math.PI - .4 + Math.sin(ph) * .35; fa2 = fa1 + .3; ba1 = Math.PI - .2 - Math.sin(ph) * .35; ba2 = ba1 + .3;
    } else if (pose === 'win') {
      fT = .25; fS = -.2; bT = -.2; bS = .1; fa1 = Math.PI - .2; fa2 = Math.PI - .02; ba1 = Math.PI - .6; ba2 = Math.PI - .4;
    } else {
      const res = Math.sin(now / 480) * .04;
      fT = .1; fS = .02; bT = -.12; bS = -.05; fa1 = .2 + res; fa2 = .9 + res; ba1 = -.15 - res; ba2 = .2;
    }
    if (atk) {
      const e = k < .35 ? k / .35 : 1, sw = k < .35 ? lerp(-.6, -2.6, e) : lerp(-2.6, 1.9, Math.min(1, (k - .35) / .3));
      fa1 = Math.PI + sw * .9; fa2 = fa1 + .2; fT = .45; fS = .1; bT = -.45; bS = -.3; ba1 = -.6; ba2 = -.1; lean = 5;
    }
    const hip = [lean * .3, -22], sh = [1 + lean, -37], head = [3 + lean * 1.1, -50];
    const vel = run ? 1 : climb ? .4 : .3, ond = Math.sin(now / 150) * 3 * vel + Math.sin(now / 330) * 1.5;

    // cola de la bufanda (detrás)
    ctx.beginPath(); ctx.moveTo(sh[0] - 2, sh[1] - 3);
    ctx.bezierCurveTo(-8, -38 + ond * .3, -16 - vel * 6, -36 + ond, -24 - vel * 8, -30 + ond * 1.4);
    ctx.lineTo(-22 - vel * 8, -25 + ond * 1.2); ctx.bezierCurveTo(-14 - vel * 4, -30 + ond * .8, -8, -32, sh[0] - 1, sh[1] + 1); ctx.closePath();
    ctx.fillStyle = BUFANDA; ctx.fill(); tinta(ctx, 1.8);
    ctx.beginPath(); ctx.moveTo(-24 - vel * 8, -30 + ond * 1.4); ctx.lineTo(-27 - vel * 8, -31 + ond * 1.5); ctx.moveTo(-22 - vel * 8, -25 + ond * 1.2); ctx.lineTo(-25 - vel * 8, -24 + ond * 1.2); tinta(ctx, 1.4);
    // brazo y pierna de atrás
    const ba = miembro(sh[0] - 2, sh[1] + 2, ba1, 9.5, ba2, 8.5);
    miembroG(ba.slice(0, 2), 6, CAMISA_S); miembroG(ba.slice(1), 5.5, PIEL_S);
    const bl = miembro(hip[0] - 2, hip[1], bT, 11.5, bS, 11.5);
    miembroG(bl.slice(0, 2), 7.5, PANT_S); miembroG(bl.slice(1), 6.5, PANT_S);
    bota(bl[2], bS, '#6f4630');
    // bolsa en la cadera (detrás)
    rr(ctx, hip[0] - 13, hip[1] - 6, 10, 10, 3); ctx.fillStyle = BOLSA; ctx.fill(); tinta(ctx, 1.6);
    ctx.fillStyle = '#c99263'; ctx.fillRect(hip[0] - 13, hip[1] - 6, 10, 3);
    // pierna de delante
    const fL = miembro(hip[0] + 2, hip[1], fT, 11.5, fS, 11.5);
    miembroG(fL.slice(0, 2), 7.5, PANT, PANT_S); miembroG(fL.slice(1), 6.5, PANT, PANT_S);
    bota(fL[2], fS, BOTA);
    // torso: camisa con faldón y chaleco
    poly(ctx, [[hip[0] - 7.5, hip[1] - 4], [hip[0] + 7.5, hip[1] - 4], [hip[0] + 9, hip[1] + 4], [hip[0] - 9, hip[1] + 4]]); ctx.fillStyle = CAMISA; ctx.fill(); tinta(ctx, 1.8);
    const torso = () => { ctx.beginPath(); ctx.moveTo(hip[0] - 7, hip[1] - 2); ctx.lineTo(hip[0] + 7, hip[1] - 2); ctx.quadraticCurveTo(sh[0] + 9, (hip[1] + sh[1]) / 2, sh[0] + 7, sh[1]); ctx.quadraticCurveTo(sh[0], sh[1] - 2.5, sh[0] - 7, sh[1]); ctx.quadraticCurveTo(hip[0] - 9, (hip[1] + sh[1]) / 2, hip[0] - 7, hip[1] - 2); ctx.closePath(); };
    torso(); ctx.fillStyle = CHALECO; ctx.fill();
    ctx.save(); torso(); ctx.clip();
    poly(ctx, [[sh[0] - 1, sh[1] - 3], [sh[0] + 9, sh[1] - 1], [sh[0] + 9, hip[1]], [hip[0] + 4, hip[1]]]); ctx.fillStyle = CAMISA; ctx.fill();
    ctx.fillStyle = CHALECO_S; ctx.fillRect(hip[0] - 11, hip[1] - 18, 6, 20);
    ctx.restore(); torso(); tinta(ctx, 1.9);
    // correa de la bolsa
    ctx.beginPath(); ctx.moveTo(sh[0] + 6, sh[1] + 1); ctx.lineTo(hip[0] - 8, hip[1] - 4); ctx.lineWidth = 4.5; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 2.6; ctx.strokeStyle = BOLSA; ctx.stroke();
    ctx.fillStyle = '#e7c46a'; [[hip[0] + 2, hip[1] - 14], [hip[0] + 2, hip[1] - 8]].forEach(([a, b]) => { elipse(ctx, a, b, 1.2, 1.2); ctx.fill(); });

    // cabeza
    const hx = head[0], hy = head[1];
    // pelo de atrás
    ctx.beginPath(); ctx.moveTo(hx - 9, hy - 6); ctx.quadraticCurveTo(hx - 13, hy + 4, hx - 9 - ond * .2, hy + 11); ctx.lineTo(hx - 1, hy + 9); ctx.lineTo(hx - 2, hy - 4); ctx.closePath();
    ctx.fillStyle = PELO; ctx.fill(); tinta(ctx, 1.8);
    elipse(ctx, hx, hy, 10.5, 11); ctx.fillStyle = PIEL; ctx.fill();
    ctx.save(); elipse(ctx, hx, hy, 10.5, 11); ctx.clip(); ctx.fillStyle = PIEL_S; ctx.fillRect(hx - 13, hy - 12, 5, 26); ctx.restore();
    elipse(ctx, hx, hy, 10.5, 11); tinta(ctx, 1.8);
    // oreja
    elipse(ctx, hx - 3, hy + 1, 2.4, 3.2); ctx.fillStyle = PIEL_S; ctx.fill(); tinta(ctx, 1.2);
    // flequillo y casquete de pelo
    ctx.beginPath();
    ctx.moveTo(hx - 10, hy + 2); ctx.quadraticCurveTo(hx - 12, hy - 11, hx, hy - 12.5); ctx.quadraticCurveTo(hx + 10, hy - 12, hx + 11, hy - 3);
    ctx.lineTo(hx + 8.5, hy - 5); ctx.lineTo(hx + 7.5, hy - 1.5); ctx.lineTo(hx + 5, hy - 5.5); ctx.lineTo(hx + 3, hy - 2.5); ctx.lineTo(hx + 1, hy - 6); ctx.quadraticCurveTo(hx - 4, hy - 6, hx - 4, hy + 1);
    ctx.quadraticCurveTo(hx - 6, hy - 1, hx - 7, hy + 4); ctx.closePath();
    ctx.fillStyle = PELO; ctx.fill(); tinta(ctx, 1.8);
    ctx.beginPath(); ctx.moveTo(hx - 6, hy - 9); ctx.quadraticCurveTo(hx, hy - 12, hx + 6, hy - 9.5); ctx.lineWidth = 1.6; ctx.strokeStyle = PELO_L; ctx.stroke();
    // cara: ojo sencillo con brillo, ceja, nariz, boca y mejilla
    const aturdido = pose === 'stun';
    if (aturdido) { ctx.beginPath(); ctx.arc(hx + 6, hy + 1, 2.2, 0, Math.PI * 1.6); tinta(ctx, 1.4); }
    else if ((now % 4200) < 120) { ctx.beginPath(); ctx.moveTo(hx + 4.5, hy + 1); ctx.lineTo(hx + 8, hy + 1); tinta(ctx, 1.5); }
    else {
      elipse(ctx, hx + 6.3, hy + .8, 1.9, 2.8); ctx.fillStyle = '#3a2a24'; ctx.fill();
      elipse(ctx, hx + 6.8, hy - .2, .8, .9); ctx.fillStyle = '#fff'; ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(hx + 4.2, hy - 3.6); ctx.quadraticCurveTo(hx + 6.5, hy - 4.6, hx + 8.8, hy - 3.6); tinta(ctx, 1.4);
    ctx.beginPath(); ctx.moveTo(hx + 10.3, hy + 2); ctx.lineTo(hx + 11.3, hy + 4); ctx.lineTo(hx + 10, hy + 4.4); tinta(ctx, 1.2);
    ctx.beginPath(); ctx.moveTo(hx + 6.5, hy + 7); ctx.quadraticCurveTo(hx + 8, hy + (pose === 'win' ? 9.5 : 8), hx + 9.4, hy + 6.8); tinta(ctx, 1.3);
    elipse(ctx, hx + 4.2, hy + 4.6, 2.6, 1.6); ctx.fillStyle = MEJILLA; ctx.fill();
    // vuelta de la bufanda al cuello
    rr(ctx, sh[0] - 6, sh[1] - 5, 14, 6.5, 3); ctx.fillStyle = BUFANDA; ctx.fill(); tinta(ctx, 1.7);
    ctx.fillStyle = BUFANDA_S; ctx.fillRect(sh[0] - 5, sh[1] - 1, 12, 1.6);

    // brazo de delante con espada corta
    const fa = miembro(sh[0] + 2, sh[1] + 2, fa1, 9.5, fa2, 8.5);
    miembroG(fa.slice(0, 2), 6, CAMISA, CAMISA_S); miembroG(fa.slice(1), 5.5, PIEL, PIEL_S);
    const ang = Math.atan2(fa[2][1] - fa[1][1], fa[2][0] - fa[1][0]) + (atk ? 0 : climb ? -2.4 : -1.2);
    ctx.save(); ctx.translate(fa[2][0], fa[2][1]); ctx.rotate(ang);
    if (atk && k > .3 && k < .75) {
      ctx.save(); ctx.rotate(-.9); ctx.globalAlpha = .75 * (1 - Math.abs(k - .52) / .25);
      ctx.beginPath(); ctx.arc(0, 0, 30, -.25, 1.3); ctx.arc(0, 0, 18, 1.3, -.25, true); ctx.closePath();
      const sg = ctx.createLinearGradient(0, 0, 30, 20); sg.addColorStop(0, 'rgba(255,255,255,.95)'); sg.addColorStop(1, 'rgba(200,240,190,.15)'); ctx.fillStyle = sg; ctx.fill(); ctx.restore();
    }
    poly(ctx, [[5, -2.2], [24, -1.6], [27, 0], [24, 1.6], [5, 2.2]]); ctx.fillStyle = '#eef2f4'; ctx.fill(); tinta(ctx, 1.6);
    ctx.beginPath(); ctx.moveTo(7, -.4); ctx.lineTo(23, -.2); ctx.strokeStyle = '#b8c4cc'; ctx.lineWidth = 1; ctx.stroke();
    rr(ctx, 2.5, -5, 3, 10, 1.2); ctx.fillStyle = '#c9a24a'; ctx.fill(); tinta(ctx, 1.3);
    rr(ctx, -4, -2, 7, 4, 1.5); ctx.fillStyle = '#7a5434'; ctx.fill(); tinta(ctx, 1.2);
    ctx.restore();
    elipse(ctx, fa[2][0], fa[2][1], 3.2, 3.2); ctx.fillStyle = PIEL; ctx.fill(); tinta(ctx, 1.4);
    ctx.restore();
    if (pose === 'stun') for (let i = 0; i < 3; i++) { const a = now / 320 + i * 2.1; estrellita(fx0 + Math.cos(a) * 14, fy0 - 72 + Math.sin(a) * 4, 4.2); }
  }
  function bota(p, a, col) {
    ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(-a * .3);
    ctx.beginPath(); ctx.moveTo(-3.5, -4.5); ctx.lineTo(3.5, -4.5); ctx.quadraticCurveTo(9.5, -2.5, 9, 1.6); ctx.lineTo(-3.5, 1.6); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); tinta(ctx, 1.6);
    ctx.restore();
  }
  function estrellita(x, y, r) {
    poly(ctx, Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? r * .45 : r; return [x + Math.cos(a) * q, y + Math.sin(a) * q]; }));
    ctx.fillStyle = '#ffe58a'; ctx.fill(); tinta(ctx, 1.2);
  }
  // Enemigo: roca gruñona cubierta de musgo, con un brote en la cabeza
  function enemigo(e, fx0, fy0, dir, now, alpha, hitK, hp) {
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
      const tw = ctx.measureText(e.name).width + 14, ty = fy0 - 74;
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
    s = Math.min((LW - 70) / W, (LH - 110) / H, 1.2);
    ox = (LW - W * s) / 2; oy = (LH - H * s) / 2 + 22;
    cv.width = LW * dpr; cv.height = LH * dpr;
    if (!capaFondo || capaFondo.width !== LW * dpr) capaFondo = pintaFondo();
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
    for (let i = 0; i < 4; i++) {
      const r = semilla(100 + i), w = 60 + r() * 70, y = 60 + r() * 130, x = ((r() * (LW + w) + now * (.006 + r() * .008)) % (LW + w * 2)) - w;
      ctx.fillStyle = 'rgba(255,255,255,.8)'; elipse(ctx, x, y, w * .3, w * .14); ctx.fill(); elipse(ctx, x + w * .25, y + 3, w * .22, w * .11); ctx.fill(); elipse(ctx, x - w * .25, y + 4, w * .2, w * .1); ctx.fill();
    }
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
    if (c.say && playing) bocadillo(fxp, fyp - 82, c.say);
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
  return { prepara, pinta, evento, limpia };
}
