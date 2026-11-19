// =====================================================================
// Código y Mazmorra · arte del juego (estilo táctico)
// Vista lateral con estética de shooter táctico: ciudad futurista al
// atardecer, bloques de hormigón y metal, sombreado plano en dos tonos y
// agentes con ropa técnica. La simulación es una cuadrícula; aquí solo se
// dibuja.
// =====================================================================
// Opciones para montar el agente (las usa también la página de inicio)
const ASPECTO = {
  piel: [['#f6d5bc', '#d9ad92'], ['#f2c7a5', '#d39a7c'], ['#d9a882', '#b9835f'], ['#c98e6a', '#a26b4d'], ['#9a6446', '#7a4a33'], ['#6b432f', '#523223']],
  peinado: [['bob', 'Melena'], ['tupe', 'Tupé'], ['coleta', 'Coleta'], ['rapado', 'Rapado']],
  pelo: { negro: ['#202336', '#141626', '#3a3f5c'], castano: ['#4a2e22', '#2f1d16', '#6e4a38'], rubio: ['#e0b860', '#b98f3f', '#f5d88e'], pelirrojo: ['#c2552e', '#953d1f', '#e07a4f'], blanco: ['#e6e4ea', '#b9b6c2', '#ffffff'], rosa: ['#ff7fb0', '#d65a8c', '#ffb3d0'], azul: ['#3f6fe0', '#2a4fb0', '#7fa2ff'] },
  chaqueta: { navy: ['#2b3a55', '#1d2940'], crema: ['#d7d0c3', '#aea597'], negro: ['#2a2c35', '#191b22'], oliva: ['#56613f', '#3f482d'], burdeos: ['#6e2333', '#4f1824'], blanco: ['#f1efe9', '#cdc9c0'] },
  acento: { rojo: '#ff4655', cian: '#2ee6d6', amarillo: '#f2c230', violeta: '#a970ff', verde: '#4fdc7a', naranja: '#ff8a3d' },
  extra: [['nada', 'Nada'], ['gafas', 'Gafas'], ['gorro', 'Gorro'], ['cascos', 'Cascos'], ['mascara', 'Máscara']],
  presets: {
    viajera: { nombre: 'Vega', piel: 1, peinado: 'bob', pelo: 'negro', chaqueta: 'navy', acento: 'rojo', extra: 'nada' },
    viajero: { nombre: 'Orión', piel: 3, peinado: 'tupe', pelo: 'castano', chaqueta: 'crema', acento: 'cian', extra: 'gafas' }
  }
};
// admite el nombre de un preset ('viajera') o un objeto con el aspecto
function aspectoDe(q) {
  const base = ASPECTO.presets.viajera;
  if (typeof q === 'string') return Object.assign({}, ASPECTO.presets[q] || base);
  return Object.assign({}, base, q || {});
}

function crearArte(cv) {
  const ctx = cv.getContext('2d');
  const LW = 960, LH = 540, T = 64, M = 56;
  const OUT = '#151a24';          // contorno
  const ROJO = '#ff4655', CIAN = '#2ee6d6', CREMA = '#ece8e1', NAVY = '#0f1923';
  const FUENTE = '"Barlow Condensed", "Arial Narrow", system-ui, sans-serif';
  let dpr = 1, sim = null, W = 0, H = 0, s = 1, ox = 0, oy = 0;
  let capaFondo = null, capaNivel = null, nubesMoviles = null;
  let fx = [], shake = 0, ultimo = 0, focos = [], placas = [], victoria = 0, perdida = 0;

  // ---------- utilidades ----------
  function hash(x, y, k) { let h = (x * 374761393 + y * 668265263 + (k || 0) * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function semilla(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function linea(g, w, col) { g.lineWidth = w || 1.6; g.strokeStyle = col || OUT; g.lineJoin = 'miter'; g.miterLimit = 3; g.lineCap = 'round'; g.stroke(); }
  function elipse(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, Math.PI * 2); }
  function poly(g, pts) { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); }
  function lienzo(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
  // rectángulo con una esquina cortada (sello de la interfaz)
  function corte(g, x, y, w, h, c) { poly(g, [[x, y], [x + w - c, y], [x + w, y + c], [x + w, y + h], [x + c, y + h], [x, y + h - c]]); }
  // segmento de miembro: cuadrilátero que se estrecha, con contorno
  function trazo(g, pts, w, color) {
    g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b));
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = w + 2.2; g.strokeStyle = OUT; g.stroke();
    g.lineWidth = w; g.strokeStyle = color; g.stroke();
  }
  const tile = (x, y) => (!sim || x < 0 || y < 0 || x >= sim.w || y >= sim.h) ? '#' : sim.tiles[y][x];
  const solido = (x, y) => { const t = tile(x, y); return t === '#' || t === ' ' || t === 'C'; };
  const abierto = (x, y) => !solido(x, y);
  // altura del suelo (pies) en una casilla abierta: pasarela si debajo hay hueco
  const sueloY = (x, y) => (y + 1) * T - (abierto(x, y + 1) ? 7 : 0);

  // ---------- fondo: ciudad futurista al atardecer ----------
  function pintaFondo() {
    const c = lienzo(LW * dpr, LH * dpr), g = c.getContext('2d'); g.scale(dpr, dpr);
    const sk = g.createLinearGradient(0, 0, 0, LH * .78);
    sk.addColorStop(0, '#1c2b45'); sk.addColorStop(.35, '#3d4f73'); sk.addColorStop(.62, '#c9798a'); sk.addColorStop(.8, '#f6a466'); sk.addColorStop(1, '#ffd49a');
    g.fillStyle = sk; g.fillRect(0, 0, LW, LH);
    // sol grande y suave
    const sx = LW * .7, sy = LH * .6;
    let gr = g.createRadialGradient(sx, sy, 10, sx, sy, 260); gr.addColorStop(0, 'rgba(255,236,190,.95)'); gr.addColorStop(.18, 'rgba(255,214,150,.7)'); gr.addColorStop(1, 'rgba(255,190,130,0)');
    g.fillStyle = gr; g.fillRect(0, 0, LW, LH);
    elipse(g, sx, sy, 46, 46); g.fillStyle = '#fff1d2'; g.fill();
    // bandas de nubes planas, con cantos afilados
    const r = semilla(9);
    const banda = (y, w, h, col, x) => { g.fillStyle = col; poly(g, [[x, y], [x + w * .12, y - h], [x + w * .7, y - h], [x + w, y - h * .25], [x + w * .96, y], [x + w * .4, y + h * .35]]); g.fill(); };
    for (let i = 0; i < 9; i++) {
      const y = 70 + r() * 210, w = 160 + r() * 260, x = r() * LW - 80, h = 6 + r() * 12, cerca = y > 180;
      banda(y, w, h, cerca ? 'rgba(255,190,160,.55)' : 'rgba(150,140,190,.45)', x);
      banda(y - h * .6, w * .7, h * .45, cerca ? 'rgba(255,226,200,.6)' : 'rgba(205,190,230,.5)', x + w * .12);
    }
    // estructura flotante en el cielo: anillo enorme
    g.save(); g.translate(LW * .26, LH * .3); g.rotate(-.15);
    g.lineWidth = 7; g.strokeStyle = 'rgba(90,100,140,.55)'; elipse(g, 0, 0, 120, 26); g.stroke();
    g.lineWidth = 2; g.strokeStyle = 'rgba(255,220,190,.55)'; g.beginPath(); g.ellipse(0, -2, 120, 26, 0, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
    g.fillStyle = 'rgba(80,90,130,.6)'; poly(g, [[-8, -26], [8, -26], [4, -70], [-4, -70]]); g.fill();
    g.restore();
    // montañas lejanas tipo meseta
    g.fillStyle = '#8a7a9e'; g.beginPath(); g.moveTo(0, LH);
    const mr = semilla(21); let mx = 0;
    while (mx < LW + 60) { const y = LH * .56 + mr() * 30; g.lineTo(mx, y); mx += 40 + mr() * 90; g.lineTo(mx, y - mr() * 8); }
    g.lineTo(LW, LH); g.closePath(); g.fill();
    // ciudad lejana: siluetas planas iluminadas por el lado del sol
    skyline(g, LH * .66, 32, 40, 120, '#6f6a92', '#9d8fae', 31, false);
    // ciudad cercana: más detalle y ventanas
    skyline(g, LH * .76, 22, 60, 170, '#3c4363', '#5e6488', 57, true);
    // bruma cálida en la base
    gr = g.createLinearGradient(0, LH * .6, 0, LH); gr.addColorStop(0, 'rgba(255,190,140,0)'); gr.addColorStop(1, 'rgba(255,190,140,.35)');
    g.fillStyle = gr; g.fillRect(0, LH * .6, LW, LH * .4);
    return c;
  }
  function skyline(g, base, n, hMin, hMax, col, luz, sem, detalle) {
    const r = semilla(sem);
    let x = -20;
    while (x < LW + 20) {
      const w = 26 + r() * (detalle ? 70 : 50), h = hMin + r() * (hMax - hMin), top = base - h, tipo = r();
      g.fillStyle = col;
      if (tipo < .18) poly(g, [[x, base], [x, top + 18], [x + w * .5, top], [x + w, top + 18], [x + w, base]]);
      else if (tipo < .3) poly(g, [[x, base], [x + w * .1, top], [x + w * .9, top + 10], [x + w, base]]);
      else { g.beginPath(); g.rect(x, top, w, h + 2); }
      g.fill();
      // lado iluminado (el sol queda a la derecha)
      g.fillStyle = luz; g.fillRect(x + w * .78, top + (tipo < .3 ? 14 : 0), w * .22, h);
      if (detalle) {
        // ventanas
        for (let wy = top + 10; wy < base - 8; wy += 11) for (let wx = x + 5; wx < x + w * .75 - 4; wx += 9) {
          const on = r();
          if (on < .5) continue;
          g.fillStyle = on > .93 ? 'rgba(46,230,214,.85)' : on > .8 ? 'rgba(255,214,150,.8)' : 'rgba(30,36,60,.55)';
          g.fillRect(wx, wy, 5, 6);
        }
        if (r() < .4) { g.fillStyle = col; g.fillRect(x + w * .3, top - 14, 2, 14); g.fillStyle = ROJO; g.fillRect(x + w * .3 - 1, top - 16, 4, 3); }
        if (r() < .3) { g.fillStyle = 'rgba(255,70,85,.9)'; g.fillRect(x + 4, top + h * .3, 3, h * .25); }
      } else if (r() < .3) { g.fillStyle = col; g.fillRect(x + w * .5, top - 22, 2, 22); }
      x += w + r() * (detalle ? 14 : 6);
    }
  }
  // nube suelta plana (sprite que luego se mueve)
  function spriteNube(w, sem) {
    const c = lienzo(w * 1.4 * dpr, w * .4 * dpr), g = c.getContext('2d'); g.scale(dpr, dpr);
    const r = semilla(sem), h = w * .12;
    g.fillStyle = 'rgba(255,214,190,.75)'; poly(g, [[4, w * .3], [w * .2, w * .3 - h], [w * 1.05, w * .3 - h * 1.1], [w * 1.36, w * .3 - h * .2], [w * 1.2, w * .3 + h * .4], [w * .4, w * .3 + h * .3]]); g.fill();
    g.fillStyle = 'rgba(255,240,224,.8)'; poly(g, [[w * .3, w * .3 - h], [w * .45, w * .3 - h * 1.8 - r() * 4], [w * .95, w * .3 - h * 1.7], [w * 1.1, w * .3 - h]]); g.fill();
    return c;
  }

  // ---------- nivel: bloques de hormigón y metal ----------
  const MB = 60;
  let forma = null; // -1 = abierto, 1 = borde, 2 = relleno
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
    focos = []; placas = [];
    for (let x = 0; x < sim.w; x++) if (forma[sim.h - 1][x] > 0) cimiento(g, x);
    for (let y = 0; y < sim.h; y++) for (let x = 0; x < sim.w; x++) if (abierto(x, y)) fondoAbierto(g, x, y);
    for (let y = 0; y < sim.h; y++) for (let x = 0; x < sim.w; x++) if (forma[y][x] === 2) relleno(g, x, y);
    for (let y = 0; y < sim.h; y++) for (let x = 0; x < sim.w; x++) if (forma[y][x] === 1) bloque(g, x, y);
    for (let y = 0; y < sim.h; y++) for (let x = 0; x < sim.w; x++) if (forma[y][x] === 1) remate(g, x, y);
    for (let y = 0; y < sim.h; y++) for (let x = 0; x < sim.w; x++) if (abierto(x, y)) adornos(g, x, y);
    for (let y = 0; y < sim.h; y++) for (let x = 0; x < sim.w; x++) if (abierto(x, y) && abierto(x, y + 1)) escalera(g, x, y);
    return c;
  }
  function cimiento(g, x) {
    const px = x * T, gr = g.createLinearGradient(0, H, 0, H + MB);
    gr.addColorStop(0, '#4a4d5c'); gr.addColorStop(1, '#2a2c37');
    g.fillStyle = gr; g.fillRect(px, H, T, MB);
    g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(px + 4, H + 8, T - 8, 3);
    g.beginPath();
    if (!lleno(x - 1, sim.h - 1)) { g.moveTo(px + 1, H); g.lineTo(px + 1, H + MB); }
    if (!lleno(x + 1, sim.h - 1)) { g.moveTo(px + T - 1, H); g.lineTo(px + T - 1, H + MB); }
    linea(g, 2);
  }
  // detrás del héroe: interior en penumbra bajo techo; al aire libre, vallas y jardineras
  function fondoAbierto(g, x, y) {
    const px = x * T, py = y * T, h = hash(x, y, 5);
    if (lleno(x, y - 1)) {
      g.fillStyle = '#26324a'; g.fillRect(px, py, T, T);
      g.fillStyle = '#1e2840'; g.fillRect(px, py + T * .55, T, T * .45);
      g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1; g.strokeRect(px + 6.5, py + 10.5, T - 13, T * .4);
      g.fillStyle = 'rgba(46,230,214,.75)'; g.fillRect(px, py + 4, T, 2);
      return;
    }
    if (h < .22) { // valla metálica
      g.fillStyle = 'rgba(60,66,92,.55)';
      g.fillRect(px, py + T - 30, T, 3); g.fillRect(px, py + T - 16, T, 2);
      for (let i = 0; i < 4; i++) g.fillRect(px + 6 + i * 16, py + T - 32, 3, 32);
    } else if (h < .36) { // farola
      const cx = px + T * (.3 + h);
      g.fillStyle = '#3a4058'; g.fillRect(cx - 1.5, py + T - 56, 3, 56);
      poly(g, [[cx - 2, py + T - 56], [cx + 14, py + T - 58], [cx + 14, py + T - 54], [cx - 2, py + T - 52]]); g.fill();
      g.fillStyle = '#fff1c9'; g.fillRect(cx + 6, py + T - 54, 7, 2);
      focos.push([cx + 10, py + T - 50, 'calida']);
    }
  }
  function relleno(g, x, y) {
    const px = x * T, py = y * T;
    g.fillStyle = '#7d7a80'; g.fillRect(px, py, T, T);
    g.fillStyle = '#716e75'; g.fillRect(px, py + T * .5, T, T * .5);
    g.strokeStyle = 'rgba(30,30,40,.25)'; g.lineWidth = 1.5; g.strokeRect(px + 4.5, py + 4.5, T - 9, T - 9);
    if (hash(x, y, 4) < .25) { g.fillStyle = 'rgba(30,30,40,.25)'; for (let i = 0; i < 4; i++) g.fillRect(px + 14, py + 18 + i * 7, T - 28, 3); }
    bordes(g, x, y);
  }
  // bloque de hormigón: cara clara arriba, sombra plana abajo, juntas y detalles
  function bloque(g, x, y) {
    const px = x * T, py = y * T, h = hash(x, y, 2);
    g.fillStyle = '#c9c1b4'; g.fillRect(px, py, T, T);
    g.fillStyle = '#b3ab9f'; g.fillRect(px, py + T * .58, T, T * .42);
    // lado al sol más claro
    if (!lleno(x + 1, y)) { g.fillStyle = '#ddd5c7'; g.fillRect(px + T - 10, py, 10, T); }
    if (!lleno(x - 1, y)) { g.fillStyle = '#a49c90'; g.fillRect(px, py, 8, T); }
    // juntas de encofrado
    g.fillStyle = 'rgba(70,60,50,.18)'; g.fillRect(px, py + T * .58, T, 1.5);
    for (const [bx, by] of [[10, 12], [T - 12, 12], [10, T - 10], [T - 12, T - 10]]) { elipse(g, px + bx, py + by, 1.6, 1.6); g.fill(); }
    if (h < .1) { // franjas de peligro
      g.save(); g.beginPath(); g.rect(px + 8, py + T - 18, T - 16, 9); g.clip();
      g.fillStyle = '#f2c230'; g.fillRect(px + 8, py + T - 18, T - 16, 9);
      g.fillStyle = '#1e1f26'; for (let i = -1; i < 7; i++) poly(g, [[px + 8 + i * 10, py + T - 9], [px + 13 + i * 10, py + T - 18], [px + 18 + i * 10, py + T - 18], [px + 13 + i * 10, py + T - 9]]), g.fill();
      g.restore();
    } else if (h < .24) { // rejilla de ventilación
      g.fillStyle = '#6f6a70'; g.fillRect(px + 16, py + 18, T - 32, 16);
      g.fillStyle = '#3f3c45'; for (let i = 0; i < 4; i++) g.fillRect(px + 18, py + 20 + i * 4, T - 36, 2);
    } else if (h < .32) { // pintada / marca
      g.fillStyle = 'rgba(255,70,85,.75)'; poly(g, [[px + 18, py + 34], [px + 30, py + 18], [px + 34, py + 22], [px + 24, py + 36]]); g.fill();
      poly(g, [[px + 34, py + 34], [px + 46, py + 20], [px + 49, py + 24], [px + 39, py + 36]]); g.fill();
    }
    if (abierto(x, y + 1)) { g.fillStyle = 'rgba(20,24,36,.35)'; g.fillRect(px, py + T - 8, T, 8); }
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
    linea(g, 2.2);
  }
  // remate metálico por arriba: canto claro, tira de acento y borde que sobresale
  function remate(g, x, y) {
    if (lleno(x, y - 1)) return;
    const px = x * T, py = y * T, iz = !lleno(x - 1, y), de = !lleno(x + 1, y);
    const x0 = px - (iz ? 3 : 0), x1 = px + T + (de ? 3 : 0);
    g.fillStyle = '#e9e3d6'; g.fillRect(x0, py - 2, x1 - x0, 8);
    g.fillStyle = '#8c8a93'; g.fillRect(x0, py + 6, x1 - x0, 3);
    poly(g, [[x0, py - 2], [x1, py - 2], [x1, py + 9], [x0, py + 9]]); linea(g, 1.8);
    if (hash(x, y, 7) < .3) { g.fillStyle = ROJO; g.fillRect(px + 8, py + 6, T * .35, 3); }
  }
  function adornos(g, x, y) {
    const px = x * T, py = y * T, h = hash(x, y, 1), t = tile(x, y);
    if (t !== '.' || abierto(x, y + 1) || abierto(x, y - 1)) return;
    const lado = hash(x, y, 2) < .5 ? 15 : T - 15;
    if (h < .16) caja(g, px + lado, py + T, hash(x, y, 3));
    else if (h < .26) bidon(g, px + lado, py + T);
    else if (h < .4) terminal(g, px + lado, py + T);
    else if (h < .48) cono(g, px + lado, py + T);
    else if (h < .58) jardinera(g, px + lado, py + T);
  }
  function caja(g, cx, fl, v) {
    const w = 22, h = 18, col = v < .5 ? ['#5b6a86', '#4a5670', '#7d8aa6'] : ['#c88a4c', '#a9713c', '#e0a568'];
    g.fillStyle = col[0]; g.fillRect(cx - w / 2, fl - h, w, h);
    g.fillStyle = col[1]; g.fillRect(cx - w / 2, fl - h * .45, w, h * .45);
    g.fillStyle = col[2]; g.fillRect(cx - w / 2, fl - h, w, 3);
    g.fillStyle = 'rgba(20,20,30,.35)'; g.fillRect(cx - w / 2 + 3, fl - h + 6, 3, h - 8); g.fillRect(cx + w / 2 - 6, fl - h + 6, 3, h - 8);
    g.fillStyle = v < .5 ? ROJO : '#2a2f3a'; g.fillRect(cx - 3, fl - h + 6, 6, 3);
    g.beginPath(); g.rect(cx - w / 2, fl - h, w, h); linea(g, 1.6);
  }
  function bidon(g, cx, fl) {
    g.fillStyle = '#2f6f86'; g.fillRect(cx - 8, fl - 22, 16, 22);
    g.fillStyle = '#245a6e'; g.fillRect(cx - 8, fl - 22, 5, 22);
    g.fillStyle = '#4c97b0'; g.fillRect(cx + 4, fl - 22, 3, 22);
    g.fillStyle = '#f2c230'; g.fillRect(cx - 8, fl - 15, 16, 3);
    g.fillStyle = '#1f2a33'; g.fillRect(cx - 8, fl - 23, 16, 3);
    g.beginPath(); g.rect(cx - 8, fl - 23, 16, 23); linea(g, 1.6);
  }
  function terminal(g, cx, fl) {
    poly(g, [[cx - 9, fl], [cx - 7, fl - 26], [cx + 7, fl - 26], [cx + 9, fl]]); g.fillStyle = '#3a4058'; g.fill(); linea(g, 1.6);
    g.fillStyle = '#2b3047'; g.fillRect(cx - 7, fl - 8, 14, 8);
    corte(g, cx - 6, fl - 24, 12, 11, 3); g.fillStyle = '#0f2a33'; g.fill();
    g.fillStyle = CIAN; for (let i = 0; i < 3; i++) g.fillRect(cx - 4, fl - 22 + i * 3, 8 - i * 2, 1.4);
    focos.push([cx, fl - 18, 'cian']);
  }
  function cono(g, cx, fl) {
    poly(g, [[cx - 6, fl - 2], [cx - 1.5, fl - 20], [cx + 1.5, fl - 20], [cx + 6, fl - 2]]); g.fillStyle = '#ff7a3d'; g.fill();
    g.fillStyle = CREMA; poly(g, [[cx - 4, fl - 9], [cx - 2.6, fl - 14], [cx + 2.6, fl - 14], [cx + 4, fl - 9]]); g.fill();
    g.fillStyle = '#2a2f3a'; g.fillRect(cx - 9, fl - 3, 18, 3);
    poly(g, [[cx - 6, fl - 2], [cx - 1.5, fl - 20], [cx + 1.5, fl - 20], [cx + 6, fl - 2]]); linea(g, 1.4);
  }
  function jardinera(g, cx, fl) {
    // planta de hojas afiladas en una maceta de hormigón
    const hojas = [[-8, -26], [-3, -32], [3, -30], [9, -24], [0, -22]];
    hojas.forEach(([a, b], i) => { poly(g, [[cx - 2, fl - 12], [cx + a, fl + b], [cx + 2, fl - 12]]); g.fillStyle = i % 2 ? '#3f8a63' : '#57a878'; g.fill(); });
    g.fillStyle = '#d6cfc2'; g.fillRect(cx - 10, fl - 13, 20, 13);
    g.fillStyle = '#b8b0a3'; g.fillRect(cx - 10, fl - 6, 20, 6);
    g.beginPath(); g.rect(cx - 10, fl - 13, 20, 13); linea(g, 1.5);
  }
  function escalera(g, x, y) {
    const px = x * T, py = y * T, cx = px + T / 2;
    // pasarela de rejilla a los lados del hueco
    [[px, 17], [px + T - 17, 17]].forEach(([a, w]) => {
      g.fillStyle = '#7c8291'; g.fillRect(a, py + T - 7, w, 7);
      g.fillStyle = '#3d4250'; for (let i = 2; i < w - 2; i += 4) g.fillRect(a + i, py + T - 5, 2, 3);
      g.beginPath(); g.rect(a, py + T - 7, w, 7); linea(g, 1.5);
    });
    const top = py + T - 34, bot = py + 2 * T - (abierto(x, y + 2) ? 7 : 0);
    [cx - 11, cx + 11].forEach(rx => { g.fillStyle = OUT; g.fillRect(rx - 3, top, 6, bot - top); g.fillStyle = '#a7aebb'; g.fillRect(rx - 1.8, top, 3.6, bot - top); });
    for (let ry = top + 8; ry < bot - 2; ry += 10) { g.fillStyle = OUT; g.fillRect(cx - 11, ry - 2, 22, 4.4); g.fillStyle = '#d0d5de'; g.fillRect(cx - 10, ry - 1, 20, 2.2); }
    // franjas de aviso en lo alto
    g.fillStyle = '#f2c230'; g.fillRect(cx - 13, top - 4, 26, 4);
    g.fillStyle = '#1e1f26'; for (let i = 0; i < 4; i++) g.fillRect(cx - 12 + i * 7, top - 4, 3, 4);
  }

  // ---------- elementos animados ----------
  function luces(now) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    focos.forEach(([x, y, tipo], i) => {
      const r = (tipo === 'cian' ? 30 : 46) + Math.sin(now / 300 + i) * 3, g = ctx.createRadialGradient(x, y, 1, x, y, r);
      const col = tipo === 'cian' ? '46,230,214' : '255,214,150';
      g.addColorStop(0, `rgba(${col},.35)`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    });
    ctx.restore();
  }
  function parpadeos(now) {
    // la pantalla de los terminales parpadea de vez en cuando
    focos.forEach(([x, y, tipo], i) => {
      if (tipo !== 'cian') return;
      if ((now / 90 + i * 7) % 40 < 1.5) { ctx.fillStyle = 'rgba(46,230,214,.9)'; ctx.fillRect(x - 6, y - 6, 12, 11); }
      ctx.fillStyle = (now / 500 + i) % 2 < 1 ? ROJO : '#ffb3ba'; ctx.fillRect(x + 4, y + 7, 2, 2);
    });
  }
  function salida(x, y, now) {
    // punto de extracción: plataforma hexagonal con haz de luz y anillos que suben
    const cx = x * T + T / 2, fl = sueloY(x, y), br = .8 + Math.sin(now / 400) * .2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    let g = ctx.createLinearGradient(0, fl - 120, 0, fl); g.addColorStop(0, 'rgba(46,230,214,0)'); g.addColorStop(1, `rgba(46,230,214,${.5 * br})`);
    ctx.fillStyle = g; poly(ctx, [[cx - 20, fl], [cx - 14, fl - 120], [cx + 14, fl - 120], [cx + 20, fl]]); ctx.fill();
    g = ctx.createRadialGradient(cx, fl - 10, 2, cx, fl - 10, 60); g.addColorStop(0, `rgba(160,255,245,${.45 * br})`); g.addColorStop(1, 'rgba(46,230,214,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - 60, fl - 70, 120, 90);
    for (let i = 0; i < 3; i++) {
      const t = ((now / 1400) + i / 3) % 1, ry = fl - 6 - t * 70, a = (1 - t) * .8;
      ctx.lineWidth = 2; ctx.strokeStyle = `rgba(160,255,245,${a})`; elipse(ctx, cx, ry, 19 - t * 5, 4.5); ctx.stroke();
    }
    ctx.restore();
    // plataforma
    poly(ctx, [[cx - 26, fl], [cx - 20, fl - 7], [cx + 20, fl - 7], [cx + 26, fl]]); ctx.fillStyle = '#3a4058'; ctx.fill(); linea(ctx, 1.6);
    ctx.fillStyle = CIAN; ctx.fillRect(cx - 16, fl - 5, 32, 2);
    // flecha de objetivo flotando encima
    const fy = fl - 74 + Math.sin(now / 300) * 3;
    poly(ctx, [[cx - 7, fy], [cx + 7, fy], [cx, fy + 8]]); ctx.fillStyle = CIAN; ctx.fill(); linea(ctx, 1.4);
    if (Math.random() < .15) fx.push({ t: 'mota', x: cx + (Math.random() - .5) * 26, y: fl - 4, vx: 0, vy: -.6 - Math.random() * .5, v: 1, d: .015, r: 1.6, c: 'rgba(160,255,245,1)' });
  }
  function reja(x, y, sube, etiqueta) {
    // barrera de energía entre dos postes; al abrirse se desvanece hacia abajo
    const px = x * T, cx = px + T / 2, fl = sueloY(x, y), top = y * T + 6, w = T - 16, now = performance.now();
    const alto = (fl - top) * (1 - sube);
    if (alto > 1) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, fl - alto, 0, fl); g.addColorStop(0, 'rgba(255,70,85,.15)'); g.addColorStop(1, 'rgba(255,70,85,.5)');
      ctx.fillStyle = g; ctx.fillRect(cx - w / 2, fl - alto, w, alto);
      ctx.fillStyle = 'rgba(255,150,160,.5)';
      for (let i = 0; i < 6; i++) { const ly = fl - ((now / 18 + i * 13) % alto); ctx.fillRect(cx - w / 2, ly, w, 1.2); }
      ctx.fillStyle = 'rgba(255,200,205,.9)'; ctx.fillRect(cx - w / 2, fl - alto, w, 2);
      // hexágonos tenues
      ctx.strokeStyle = 'rgba(255,120,130,.35)'; ctx.lineWidth = 1;
      for (let hy = fl - 10; hy > fl - alto + 6; hy -= 14) for (let hx = cx - w / 2 + 8; hx < cx + w / 2 - 4; hx += 14) { poly(ctx, Array.from({ length: 6 }, (_, k) => [hx + Math.cos(k * Math.PI / 3) * 5, hy + Math.sin(k * Math.PI / 3) * 5])); ctx.stroke(); }
      ctx.restore();
    }
    // postes
    [cx - w / 2 - 4, cx + w / 2 + 4].forEach(p => {
      ctx.fillStyle = '#3a4058'; ctx.fillRect(p - 4, top - 6, 8, fl - top + 6);
      ctx.fillStyle = '#545b78'; ctx.fillRect(p - 4, top - 6, 3, fl - top + 6);
      ctx.fillStyle = sube >= 1 ? CIAN : ROJO; ctx.fillRect(p - 2, top + 4, 4, fl - top - 12);
      ctx.beginPath(); ctx.rect(p - 4, top - 6, 8, fl - top + 6); linea(ctx, 1.6);
    });
    // etiqueta con el símbolo
    const et = etiqueta || '?';
    ctx.font = `700 13px "JetBrains Mono", monospace`; ctx.textAlign = 'center';
    const pw = Math.max(22, ctx.measureText(et).width + 14), pyy = y * T - 6;
    corte(ctx, cx - pw / 2, pyy - 10, pw, 18, 5); ctx.fillStyle = NAVY; ctx.fill();
    ctx.lineWidth = 1.6; ctx.strokeStyle = sube >= 1 ? CIAN : ROJO; ctx.stroke();
    ctx.fillStyle = CREMA; ctx.fillText(et, cx, pyy + 3.5);
  }
  function placa(x, y, now) {
    // pantalla incrustada en el muro con texto que se desplaza
    const px = x * T, py = y * T, br = .6 + Math.sin(now / 500) * .2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(px + T / 2, py + T / 2, 4, px + T / 2, py + T / 2, 46); g.addColorStop(0, `rgba(46,230,214,${.3 * br})`); g.addColorStop(1, 'rgba(46,230,214,0)');
    ctx.fillStyle = g; ctx.fillRect(px - 12, py - 12, T + 24, T + 24); ctx.restore();
    corte(ctx, px + 9, py + 12, T - 18, T - 24, 6); ctx.fillStyle = '#2b3047'; ctx.fill(); linea(ctx, 1.8);
    corte(ctx, px + 13, py + 16, T - 26, T - 32, 4); ctx.fillStyle = '#0d2530'; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(px + 13, py + 16, T - 26, T - 32); ctx.clip();
    ctx.fillStyle = CIAN;
    for (let i = 0; i < 5; i++) { const ly = py + 18 + ((i * 6 + now / 120) % 30); ctx.fillRect(px + 17, ly, (T - 34) * (.4 + hash(i, x, 9) * .6), 2); }
    ctx.restore();
    ctx.fillStyle = ROJO; ctx.fillRect(px + 9, py + T - 15, 12, 3);
  }
  function gema(x, y, now) {
    // cristal de energía que flota y gira
    const cx = x * T + T / 2, base = sueloY(x, y) - 24, cy = base + Math.sin(now / 420 + x * 1.3 + y) * 4, gi = Math.cos(now / 600 + x);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 32); g.addColorStop(0, 'rgba(120,255,240,.55)'); g.addColorStop(1, 'rgba(46,230,214,0)'); ctx.fillStyle = g; ctx.fillRect(cx - 32, cy - 32, 64, 64); ctx.restore();
    elipse(ctx, cx, sueloY(x, y) - 2, 8 - (cy - base) * .4, 2.2); ctx.fillStyle = 'rgba(20,30,50,.3)'; ctx.fill();
    const a = 9 * gi;
    poly(ctx, [[cx, cy - 15], [cx + a, cy - 2], [cx, cy + 13], [cx - a, cy - 2]]); ctx.fillStyle = '#29c9bb'; ctx.fill();
    poly(ctx, [[cx, cy - 15], [cx + Math.abs(a), cy - 2], [cx, cy + 13]]); ctx.fillStyle = '#9ffff3'; ctx.fill();
    poly(ctx, [[cx, cy - 15], [cx + 9, cy - 2], [cx, cy + 13], [cx - 9, cy - 2]]); linea(ctx, 1.5);
    const tw = (now / 800 + x * .37) % 2.4;
    if (tw < .5) { const z = Math.sin(tw / .5 * Math.PI) * 7; ctx.fillStyle = '#fff'; poly(ctx, [[cx - 3, cy - 10 - z], [cx - 2, cy - 11], [cx - 3 + z, cy - 10], [cx - 2, cy - 9], [cx - 3, cy - 10 + z], [cx - 4, cy - 9], [cx - 3 - z, cy - 10], [cx - 4, cy - 11]]); ctx.fill(); }
  }

  // ---------- personajes: agentes ----------
  function miembro(x, y, a1, l1, a2, l2) {
    const kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1;
    return [[x, y], [kx, ky], [kx + Math.sin(a2) * l2, ky + Math.cos(a2) * l2]];
  }
  // Todos los agentes comparten cuerpo y animaciones; el aspecto cambia colores,
  // peinado y complemento.
  function construye(q) {
    const a = aspectoDe(q), A = ASPECTO;
    const piel = A.piel[a.piel] || A.piel[1], pelo = A.pelo[a.pelo] || A.pelo.negro, ch = A.chaqueta[a.chaqueta] || A.chaqueta.navy, ac = A.acento[a.acento] || ROJO;
    const clara = ['crema', 'blanco'].includes(a.chaqueta);
    return { nombre: a.nombre || 'Agente', piel: piel[0], pielS: piel[1], pelo: pelo[0], peloS: pelo[1], peloL: pelo[2], peinado: a.peinado, extra: a.extra,
      chaqueta: ch[0], chaquetaS: ch[1], acento: ac, camiseta: clara ? '#1e2430' : CREMA, pantalon: clara ? '#2c3e3a' : '#3b3f4a', pantalonS: clara ? '#1f2d2a' : '#2a2d36',
      bota: '#1b1d24', suela: ac, guante: '#22252c', iris: '#3a2620', hoja: ac };
  }
  let pj = construye('viajera'), sonrie = false;
  function heroe(fx0, fy0, dir, pose, ph, k, now) {
    const run = pose === 'run', climb = pose === 'climb', atk = pose === 'attack';
    let bob = run ? -Math.abs(Math.sin(ph)) * 2.4 : climb ? Math.sin(ph * 2) * 1 : Math.sin(now / 520) * .6;
    let tilt = run ? .1 : 0, dx = 0;
    if (pose === 'bump') { dx = -Math.sin(k * Math.PI) * 5; tilt = -.25 * Math.sin(k * Math.PI); }
    if (pose === 'win') bob = -Math.abs(Math.sin(now / 260)) * 8;
    if (pose === 'stun') tilt = -.18;
    if (atk) tilt = .14;
    elipse(ctx, fx0, fy0 + 1, 13 + bob * .4, 3.5); ctx.fillStyle = 'rgba(15,20,35,.32)'; ctx.fill();
    ctx.save(); ctx.translate(fx0, fy0 + bob); ctx.scale(dir * 1.08, 1.08); ctx.translate(dx, 0); ctx.rotate(tilt);

    // ángulos (desde la vertical hacia abajo, positivo = hacia delante)
    let fT, fS, bT, bS, fa1, fa2, ba1, ba2;
    if (run) {
      fT = Math.sin(ph) * .85; fS = fT - 1.2 * Math.max(0, Math.sin(ph - 1.3)); bT = Math.sin(ph + Math.PI) * .85; bS = bT - 1.2 * Math.max(0, Math.sin(ph + Math.PI - 1.3));
      fa1 = -Math.sin(ph) * .9; fa2 = fa1 + 1.4; ba1 = Math.sin(ph) * .9; ba2 = ba1 + 1.4;
    } else if (climb) {
      fT = .6 + Math.sin(ph) * .5; fS = fT - 1.3; bT = .6 - Math.sin(ph) * .5; bS = bT - 1.3;
      fa1 = Math.PI - .5 + Math.sin(ph) * .35; fa2 = fa1 + .2; ba1 = Math.PI - .3 - Math.sin(ph) * .35; ba2 = ba1 + .2;
    } else if (pose === 'win') {
      fT = .15; fS = .05; bT = -.15; bS = -.05; fa1 = Math.PI - .3; fa2 = Math.PI - .1; ba1 = .5; ba2 = 1.7;
    } else {
      // en guardia: piernas abiertas, cuchillo bajo
      const res = Math.sin(now / 520) * .04;
      fT = .22; fS = .05; bT = -.2; bS = -.08; fa1 = .3 + res; fa2 = 1.05 + res; ba1 = .1 - res; ba2 = .9;
    }
    if (atk) {
      const e = k < .35 ? k / .35 : 1, sw = k < .35 ? lerp(-.6, -2.4, e) : lerp(-2.4, 1.7, Math.min(1, (k - .35) / .3));
      fa1 = Math.PI + sw * .9; fa2 = fa1 + .15; fT = .7; fS = .2; bT = -.55; bS = -.3; ba1 = -.6; ba2 = .2;
    }
    const hip = [0, -27], sh = [1, -45], hx = 2.5, hy = -55;

    // brazo y pierna de atrás (tonos de sombra)
    const ba = miembro(sh[0] - 2, sh[1] + 2, ba1, 9, ba2, 8.5);
    trazo(ctx, ba.slice(0, 2), 5.6, pj.chaquetaS); trazo(ctx, ba.slice(1), 4.8, pj.chaquetaS);
    rr(ctx, ba[2][0] - 2.6, ba[2][1] - 2.4, 5.2, 5, 1.5); ctx.fillStyle = pj.guante; ctx.fill(); linea(ctx, 1.1);
    const bl = miembro(hip[0] - 2, hip[1] + 2, bT, 12.5, bS, 12);
    trazo(ctx, bl.slice(0, 2), 6.6, pj.pantalonS); trazo(ctx, bl.slice(1), 5.6, pj.pantalonS);
    bota(bl[2], bS, '#141519', pj.suela);
    // pierna de delante con rodillera
    const fl = miembro(hip[0] + 2, hip[1] + 2, fT, 12.5, fS, 12);
    trazo(ctx, fl.slice(0, 2), 6.8, pj.pantalon); trazo(ctx, fl.slice(1), 5.8, pj.pantalon);
    ctx.save(); ctx.translate(fl[1][0], fl[1][1]); ctx.rotate(-fT * .5); corte(ctx, -3, -3, 6.5, 6, 2); ctx.fillStyle = '#4b505e'; ctx.fill(); linea(ctx, 1); ctx.restore();
    bota(fl[2], fS, pj.bota, pj.suela);
    // cadera y cinturón
    poly(ctx, [[hip[0] - 6.5, hip[1] - 3], [hip[0] + 6.5, hip[1] - 3], [hip[0] + 7, hip[1] + 4], [hip[0] - 7, hip[1] + 4]]); ctx.fillStyle = pj.pantalon; ctx.fill(); linea(ctx, 1.3);
    ctx.fillStyle = '#16181f'; ctx.fillRect(hip[0] - 7, hip[1] - 3.5, 14, 2.6);
    ctx.fillStyle = pj.acento; ctx.fillRect(hip[0] + 1, hip[1] - 3.5, 3, 2.6);
    // funda en el muslo
    rr(ctx, hip[0] - 9, hip[1], 5, 8, 1); ctx.fillStyle = '#16181f'; ctx.fill();
    // torso: chaqueta técnica angulosa con cuello alto
    const torso = () => poly(ctx, [[sh[0] - 7, sh[1] + 1], [sh[0] - 4, sh[1] - 3], [sh[0] + 4, sh[1] - 3], [sh[0] + 7.5, sh[1] + 1.5], [sh[0] + 7, sh[1] + 9], [hip[0] + 6.5, hip[1] - 2], [hip[0] + 7.5, hip[1] + 2], [hip[0] - 7.5, hip[1] + 2], [hip[0] - 6.5, hip[1] - 2]]);
    torso(); ctx.fillStyle = pj.chaqueta; ctx.fill();
    ctx.save(); torso(); ctx.clip();
    ctx.fillStyle = pj.chaquetaS; poly(ctx, [[sh[0] - 9, sh[1] - 4], [sh[0] - 2, sh[1] - 4], [hip[0] - 3, hip[1] + 3], [hip[0] - 9, hip[1] + 3]]); ctx.fill();
    // abertura con camiseta
    ctx.fillStyle = pj.camiseta; poly(ctx, [[sh[0] + 3.5, sh[1] - 1], [sh[0] + 7.5, sh[1]], [hip[0] + 7, hip[1] - 2], [hip[0] + 3.5, hip[1] - 2]]); ctx.fill();
    // franja de color en diagonal
    ctx.fillStyle = pj.acento; poly(ctx, [[sh[0] - 8, sh[1] + 5], [sh[0] - 8, sh[1] + 8], [hip[0] + 4, hip[1] - 4], [hip[0] + 4, hip[1] - 7]]); ctx.fill();
    ctx.restore(); torso(); linea(ctx, 1.4);
    // cuello alto
    poly(ctx, [[sh[0] - 4, sh[1] - 2], [sh[0] - 3, sh[1] - 7], [sh[0] + 3.5, sh[1] - 6.5], [sh[0] + 5, sh[1] - 1.5]]); ctx.fillStyle = pj.chaquetaS; ctx.fill(); linea(ctx, 1.2);
    // hombrera
    corte(ctx, sh[0] - 6, sh[1] - 1, 7, 6, 2.5); ctx.fillStyle = pj.acento; ctx.fill(); linea(ctx, 1);

    // ---- cabeza (perfil) ----
    const aturdido = pose === 'stun', feliz = pose === 'win' || sonrie;
    // la cabeza un poco más grande que la real para que se lea bien en pequeño
    ctx.save(); ctx.translate(hx, hy + 8); ctx.scale(1.16, 1.16); ctx.translate(-hx, -(hy + 8));
    if (pj.peinado === 'bob') { // melena por detrás con puntas de color
      poly(ctx, [[hx - 2, hy - 9], [hx - 9.5, hy - 6], [hx - 10.5, hy + 2], [hx - 9, hy + 8.5], [hx - 3.5, hy + 9], [hx - 1, hy + 2]]);
      ctx.fillStyle = pj.pelo; ctx.fill(); linea(ctx, 1.3);
      ctx.fillStyle = pj.acento; poly(ctx, [[hx - 10.2, hy + 5], [hx - 9, hy + 8.5], [hx - 3.5, hy + 9], [hx - 4, hy + 6.5]]); ctx.fill();
    } else if (pj.peinado === 'coleta') { // coleta alta que se balancea
      const o = Math.sin(now / 260) * 1.5 + (run ? -2 : 0);
      poly(ctx, [[hx - 6, hy - 10], [hx - 12 + o * .3, hy - 9], [hx - 16 + o, hy - 1], [hx - 15 + o, hy + 9], [hx - 12 + o * .6, hy + 2], [hx - 8, hy - 5]]);
      ctx.fillStyle = pj.pelo; ctx.fill(); linea(ctx, 1.3);
      ctx.beginPath(); ctx.moveTo(hx - 12 + o * .3, hy - 6); ctx.lineTo(hx - 14.5 + o, hy + 4); linea(ctx, 1, pj.peloL);
    }
    // cuello
    ctx.fillStyle = pj.pielS; ctx.fillRect(hx - 2.5, hy + 5, 5, 6);
    // cara de perfil: mandíbula marcada
    const cara = () => poly(ctx, [[hx - 6.5, hy - 6], [hx + 5.5, hy - 7.5], [hx + 7.8, hy - 2.5], [hx + 8.2, hy - .5], [hx + 9.8, hy + 2.2], [hx + 8.2, hy + 3.3], [hx + 8.6, hy + 5], [hx + 7.6, hy + 6.4], [hx + 6.6, hy + 8.4], [hx + 2, hy + 9.2], [hx - 3.5, hy + 6], [hx - 6.5, hy + 2]]);
    cara(); ctx.fillStyle = pj.piel; ctx.fill();
    ctx.save(); cara(); ctx.clip();
    ctx.fillStyle = pj.pielS; poly(ctx, [[hx - 8, hy + 1], [hx + 1, hy + 4], [hx + 4, hy + 10], [hx - 8, hy + 10]]); ctx.fill();
    ctx.restore(); cara(); linea(ctx, 1.3);
    // oreja
    elipse(ctx, hx - 2.2, hy + 1.4, 1.5, 2.1); ctx.fillStyle = pj.pielS; ctx.fill(); ctx.lineWidth = .9; ctx.strokeStyle = OUT; ctx.stroke();
    // ojo: almendra estrecha, iris oscuro y párpado marcado
    const ex = hx + 5.4, ey = hy + .2;
    if (aturdido) { ctx.beginPath(); ctx.moveTo(ex - 1.8, ey - 1.4); ctx.lineTo(ex + 1.6, ey + 1.2); ctx.moveTo(ex - 1.8, ey + 1.2); ctx.lineTo(ex + 1.6, ey - 1.4); linea(ctx, 1.1); }
    else if (feliz) { ctx.beginPath(); ctx.moveTo(ex - 2, ey + .6); ctx.quadraticCurveTo(ex, ey - 1.6, ex + 2, ey + .4); linea(ctx, 1.2); }
    else {
      poly(ctx, [[ex - 2.1, ey - .2], [ex + .2, ey - 1.3], [ex + 2.2, ey - .6], [ex + 1.4, ey + 1], [ex - 1, ey + 1]]); ctx.fillStyle = '#fbf7f1'; ctx.fill();
      elipse(ctx, ex + .9, ey, .95, 1.15); ctx.fillStyle = pj.iris; ctx.fill();
      ctx.beginPath(); ctx.moveTo(ex - 2.4, ey - .3); ctx.lineTo(ex + .2, ey - 1.5); ctx.lineTo(ex + 2.5, ey - .7); linea(ctx, 1.1);
    }
    // ceja recta y seria
    ctx.beginPath(); ctx.moveTo(ex - 2.4, ey - 2.9); ctx.lineTo(ex + 2.6, ey - (aturdido ? 2.2 : 3.4)); linea(ctx, 1.25, pj.peloS);
    // boca
    ctx.beginPath();
    if (pj.extra === 'mascara') { /* tapada */ }
    else if (feliz) { ctx.moveTo(hx + 6.6, hy + 5); ctx.quadraticCurveTo(hx + 7.6, hy + 6.2, hx + 8.5, hy + 4.6); }
    else { ctx.moveTo(hx + 6.8, hy + 5.3); ctx.lineTo(hx + 8.4, hy + 5.1); }
    linea(ctx, 1, '#6a3b30');
    // pelo
    const P = pj.peinado;
    if (P === 'bob') {
      // corte bob con flequillo en diagonal
      poly(ctx, [[hx + 9, hy - 3.5], [hx + 8, hy - 8.5], [hx + 2, hy - 11.5], [hx - 5, hy - 10.5], [hx - 9.5, hy - 6], [hx - 6, hy - 3.5], [hx - 1.5, hy - 4.5], [hx - .5, hy + 1], [hx + 1.5, hy - 4], [hx + 4.5, hy - 3]]);
      ctx.fillStyle = pj.pelo; ctx.fill(); linea(ctx, 1.3);
      ctx.fillStyle = pj.acento; poly(ctx, [[hx + 9, hy - 3.5], [hx + 6.5, hy - 4.6], [hx + 7.4, hy - 6.4]]); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx - 4, hy - 9.4); ctx.lineTo(hx + 4, hy - 10.2); linea(ctx, 1.1, pj.peloL);
    } else if (P === 'tupe') {
      // laterales rapados y tupé hacia atrás
      ctx.fillStyle = pj.peloS; ctx.globalAlpha = .55; poly(ctx, [[hx - 6.5, hy - 5], [hx + 1, hy - 6], [hx + 1, hy - 1], [hx - 5.5, hy + 1.5]]); ctx.fill(); ctx.globalAlpha = 1;
      poly(ctx, [[hx + 8, hy - 6.5], [hx + 7, hy - 11], [hx + 1, hy - 13.5], [hx - 6, hy - 12.5], [hx - 9.5, hy - 8], [hx - 7, hy - 5.5], [hx + 2, hy - 7]]);
      ctx.fillStyle = pj.pelo; ctx.fill(); linea(ctx, 1.3);
      ctx.beginPath(); ctx.moveTo(hx - 4, hy - 11); ctx.lineTo(hx + 4, hy - 11.6); linea(ctx, 1.1, pj.peloL);
    } else if (P === 'coleta') {
      poly(ctx, [[hx + 8.6, hy - 4], [hx + 7.6, hy - 9], [hx + 1, hy - 11.8], [hx - 6, hy - 10.6], [hx - 9.4, hy - 6], [hx - 7, hy - 3.2], [hx - 2, hy - 4.6], [hx + 3, hy - 5.6], [hx + 6, hy - 4.2]]);
      ctx.fillStyle = pj.pelo; ctx.fill(); linea(ctx, 1.3);
      ctx.beginPath(); ctx.moveTo(hx - 4, hy - 9.6); ctx.lineTo(hx + 4, hy - 10.4); linea(ctx, 1.1, pj.peloL);
      rr(ctx, hx - 8.6, hy - 10.6, 3.4, 4, 1); ctx.fillStyle = pj.acento; ctx.fill(); linea(ctx, .9);
    } else {
      // rapado al uno
      poly(ctx, [[hx + 7.4, hy - 6.6], [hx + 5.8, hy - 9.6], [hx, hy - 11], [hx - 6, hy - 10], [hx - 8.6, hy - 6], [hx - 6.6, hy - 4], [hx - 1, hy - 5.6], [hx + 3, hy - 6.6]]);
      ctx.fillStyle = pj.pelo; ctx.globalAlpha = .9; ctx.fill(); ctx.globalAlpha = 1; linea(ctx, 1.1);
      ctx.fillStyle = pj.peloL; ctx.globalAlpha = .35; for (let i = 0; i < 6; i++) ctx.fillRect(hx - 5 + i * 2, hy - 9.5 + (i % 2), 1, 1); ctx.globalAlpha = 1;
    }
    // complemento
    const X = pj.extra;
    if (X === 'gafas') {
      ctx.fillStyle = '#16181f'; poly(ctx, [[hx - 7.5, hy - 7], [hx + 3, hy - 8.4], [hx + 3, hy - 6.6], [hx - 7, hy - 5.2]]); ctx.fill();
      corte(ctx, hx + 2, hy - 10.2, 6.5, 4, 1.5); ctx.fillStyle = pj.acento; ctx.fill(); linea(ctx, 1);
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(hx + 3.4, hy - 9.4, 2, 1);
    } else if (X === 'gorro') {
      poly(ctx, [[hx + 8.8, hy - 4.6], [hx + 8, hy - 10], [hx + 2, hy - 14.2], [hx - 5, hy - 13.4], [hx - 10, hy - 8], [hx - 10, hy - 4], [hx - 3, hy - 5]]);
      ctx.fillStyle = '#2a2d36'; ctx.fill(); linea(ctx, 1.3);
      poly(ctx, [[hx + 9, hy - 4.4], [hx + 8.6, hy - 7], [hx - 10.2, hy - 6.6], [hx - 10.2, hy - 3.8]]); ctx.fillStyle = pj.acento; ctx.fill(); linea(ctx, 1);
      ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 5; i++) ctx.fillRect(hx - 6 + i * 3, hy - 12 + (i % 2), 1, 4);
    } else if (X === 'cascos') {
      ctx.beginPath(); ctx.moveTo(hx - 2.6, hy - 1); ctx.quadraticCurveTo(hx - 3, hy - 15, hx + 3.5, hy - 13); linea(ctx, 3.2, OUT);
      ctx.beginPath(); ctx.moveTo(hx - 2.6, hy - 1); ctx.quadraticCurveTo(hx - 3, hy - 15, hx + 3.5, hy - 13); linea(ctx, 1.6, '#3a3f4e');
      rr(ctx, hx - 5.2, hy - 2.4, 6, 7.6, 2.4); ctx.fillStyle = '#22252c'; ctx.fill(); linea(ctx, 1.1);
      rr(ctx, hx - 3.6, hy - .8, 2.8, 4.4, 1.2); ctx.fillStyle = pj.acento; ctx.fill();
    } else if (X === 'mascara') {
      poly(ctx, [[hx - 1.6, hy + 1.4], [hx + 8.4, hy + .6], [hx + 10.3, hy + 2.6], [hx + 9.2, hy + 6.2], [hx + 6.8, hy + 9], [hx + 2, hy + 9.8], [hx - 2.6, hy + 6.2]]);
      ctx.fillStyle = '#1b1d24'; ctx.fill(); linea(ctx, 1.1);
      ctx.beginPath(); ctx.moveTo(hx + 1, hy + 3); ctx.lineTo(hx + 8.8, hy + 2.4); linea(ctx, 1, pj.acento);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 3; i++) ctx.fillRect(hx + 4 + i * 1.6, hy + 5, .8, 2.4);
    }
    ctx.restore();
    // brazo de delante con cuchillo de energía
    const fa = miembro(sh[0] + 2, sh[1] + 2, fa1, 9, fa2, 8.5);
    trazo(ctx, fa.slice(0, 2), 5.8, pj.chaqueta); trazo(ctx, fa.slice(1), 5, pj.chaqueta);
    ctx.fillStyle = pj.acento; ctx.save(); ctx.translate(fa[1][0], fa[1][1]); ctx.rotate(Math.atan2(fa[2][1] - fa[1][1], fa[2][0] - fa[1][0])); ctx.fillRect(4.5, -2.6, 2, 5.2); ctx.restore();
    const ang = Math.atan2(fa[2][1] - fa[1][1], fa[2][0] - fa[1][0]) + (atk ? 0 : climb ? -2.4 : pose === 'win' ? -1.4 : run ? -.9 : -.5);
    ctx.save(); ctx.translate(fa[2][0], fa[2][1]); ctx.rotate(ang);
    if (atk && k > .3 && k < .75) {
      ctx.save(); ctx.rotate(-.9); ctx.globalAlpha = .85 * (1 - Math.abs(k - .52) / .25); ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); ctx.arc(0, 0, 26, -.25, 1.3); ctx.arc(0, 0, 18, 1.3, -.25, true); ctx.closePath();
      const sg = ctx.createLinearGradient(0, 0, 26, 18); sg.addColorStop(0, 'rgba(255,255,255,.95)'); sg.addColorStop(1, pj.hoja); ctx.fillStyle = sg; ctx.fill(); ctx.restore();
    }
    rr(ctx, -2, -1.6, 6, 3.2, .8); ctx.fillStyle = '#16181f'; ctx.fill();
    poly(ctx, [[4, -2.2], [14, -1.6], [17, .6], [4, 1.8]]); ctx.fillStyle = '#e8edf2'; ctx.fill(); linea(ctx, 1);
    ctx.fillStyle = pj.hoja; poly(ctx, [[5, .6], [15.5, .2], [16.4, .7], [5, 1.4]]); ctx.fill();
    ctx.restore();
    rr(ctx, fa[2][0] - 2.8, fa[2][1] - 2.6, 5.6, 5.4, 1.5); ctx.fillStyle = pj.guante; ctx.fill(); linea(ctx, 1.1);
    ctx.restore();
    if (pose === 'stun') for (let i = 0; i < 3; i++) { const a = now / 320 + i * 2.1; aviso(fx0 + Math.cos(a) * 15, fy0 - 80 + Math.sin(a) * 4); }
  }
  function bota(p, a, col, suela) {
    ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(-a * .3);
    poly(ctx, [[-3.4, -4.5], [3, -4.5], [5, -2], [8.5, -.5], [8.5, 2], [-3.6, 2]]);
    ctx.fillStyle = col; ctx.fill(); linea(ctx, 1.2);
    ctx.fillStyle = suela; ctx.fillRect(-3.4, 0, 11.8, 1.8);
    ctx.restore();
  }
  function aviso(x, y) {
    poly(ctx, [[x, y - 4.5], [x + 4.5, y + 3.5], [x - 4.5, y + 3.5]]); ctx.fillStyle = '#f2c230'; ctx.fill(); linea(ctx, 1);
    ctx.fillStyle = OUT; ctx.fillRect(x - .5, y - 1.5, 1, 2.5); ctx.fillRect(x - .5, y + 1.6, 1, 1);
  }
  // Enemigo: bug robótico de cuatro patas con visor y fallos de imagen
  function enemigo(e, fx0, fy0, dir, now, alpha, hitK, hp, sube) {
    const br = Math.sin(now / 380 + e.x * 1.7), kb = hitK >= 0 && hitK < .6 ? Math.sin(hitK / .6 * Math.PI) * 6 : 0;
    const tono = ((e.hue % 60) + 340) % 360, luz = `hsl(${tono},95%,62%)`, luzS = `hsl(${tono},80%,42%)`;
    ctx.save(); ctx.globalAlpha = alpha;
    elipse(ctx, fx0, fy0 + 1, 18, 4); ctx.fillStyle = 'rgba(15,20,35,.32)'; ctx.fill();
    ctx.translate(fx0 - dir * kb, fy0); ctx.scale(dir, 1);
    if (alpha < 1) ctx.scale(1 + (1 - alpha) * .3, Math.max(.05, alpha));
    const cy = -20 + br * 1.4;
    // patas de araña
    [[-12, -1], [-5, 1], [5, -1], [12, 1]].forEach(([lx, f], i) => {
      const paso = Math.sin(now / 200 + i) * 1.2;
      ctx.beginPath(); ctx.moveTo(lx * .5, cy + 4); ctx.lineTo(lx * 1.25, cy - 3 + paso); ctx.lineTo(lx * 1.45 + f, 0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 4.4; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 2.4; ctx.strokeStyle = i < 2 ? '#3a4058' : '#545b78'; ctx.stroke();
    });
    // caparazón hexagonal
    const cuerpo = () => poly(ctx, [[-15, cy + 2], [-10, cy - 10], [6, cy - 12], [15, cy - 3], [13, cy + 7], [-9, cy + 9]]);
    cuerpo(); ctx.fillStyle = '#2b3042'; ctx.fill();
    ctx.save(); cuerpo(); ctx.clip();
    ctx.fillStyle = '#454c66'; poly(ctx, [[-12, cy - 9], [6, cy - 12], [14, cy - 4], [-4, cy - 2]]); ctx.fill();
    ctx.fillStyle = luzS; ctx.fillRect(-15, cy + 3, 30, 2);
    ctx.restore(); cuerpo(); linea(ctx, 1.6);
    // visor
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const vg = ctx.createRadialGradient(9, cy - 3, 1, 9, cy - 3, 14); vg.addColorStop(0, luz); vg.addColorStop(1, 'rgba(255,60,80,0)');
    ctx.fillStyle = vg; ctx.fillRect(-5, cy - 17, 28, 28); ctx.restore();
    poly(ctx, [[3, cy - 6], [13, cy - 6.5], [14, cy - 1.5], [4, cy - 1]]); ctx.fillStyle = luz; ctx.fill(); linea(ctx, 1.2);
    ctx.fillStyle = '#fff'; ctx.fillRect(10, cy - 5.3, 2.2, 1.6);
    // antenas
    ctx.beginPath(); ctx.moveTo(-4, cy - 11); ctx.lineTo(-8, cy - 20); ctx.moveTo(2, cy - 12); ctx.lineTo(3, cy - 21); linea(ctx, 1.4);
    ctx.fillStyle = luz; ctx.fillRect(-9.5, cy - 22, 3, 3); ctx.fillRect(1.5, cy - 23, 3, 3);
    // fallos de imagen: tiras desplazadas de vez en cuando
    if ((now / 70 + e.x * 13) % 30 < 2) { ctx.fillStyle = luz; ctx.fillRect(-18 + Math.random() * 6, cy - 6 + Math.random() * 10, 14, 2); ctx.fillStyle = CIAN; ctx.fillRect(2 + Math.random() * 6, cy - 2 + Math.random() * 8, 10, 1.6); }
    if (hitK >= 0 && hitK < .3) { cuerpo(); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill(); }
    ctx.restore();
    if (alpha > .3) {
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.font = `700 14px ${FUENTE}`; ctx.textAlign = 'center';
      const tw = ctx.measureText(e.name).width + 18, ty = fy0 - 66 - (sube ? 26 : 0);
      corte(ctx, fx0 - tw / 2, ty - 11, tw, 18, 5); ctx.fillStyle = NAVY; ctx.fill();
      ctx.fillStyle = ROJO; ctx.fillRect(fx0 - tw / 2, ty - 11, 3, 18 - 3);
      ctx.fillStyle = CREMA; ctx.fillText(e.name, fx0 + 1, ty + 3);
      for (let i = 0; i < e.max; i++) { poly(ctx, [[fx0 - e.max * 6 + i * 12 + 2, ty + 15], [fx0 - e.max * 6 + i * 12 + 11, ty + 15], [fx0 - e.max * 6 + i * 12 + 9, ty + 10], [fx0 - e.max * 6 + i * 12, ty + 10]]); ctx.fillStyle = i < hp ? ROJO : 'rgba(15,25,35,.7)'; ctx.fill(); }
      ctx.restore();
    }
  }
  function bocadillo(x, y, text) {
    ctx.font = '600 14px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
    let lineas = String(text).split('\n');
    if (lineas.length > 4) lineas = lineas.slice(0, 3).concat('…');
    lineas = lineas.map(l => l.length > 30 ? l.slice(0, 29) + '…' : l);
    const w = Math.max(...lineas.map(l => ctx.measureText(l).width)) + 28, h = 12 + lineas.length * 17;
    const bx = Math.max(-M + 6, Math.min(W + M - w - 6, x - w / 2)), by = y - h - 10;
    ctx.fillStyle = 'rgba(15,25,35,.92)'; corte(ctx, bx, by, w, h, 8); ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(236,232,225,.35)'; ctx.stroke();
    ctx.fillStyle = ROJO; ctx.fillRect(bx, by, 4, h - 8);
    poly(ctx, [[x - 6, by + h], [x + 6, by + h], [x - 2, by + h + 9]]); ctx.fillStyle = 'rgba(15,25,35,.92)'; ctx.fill();
    ctx.fillStyle = CREMA; lineas.forEach((l, i) => ctx.fillText(l, bx + 14, by + 20 + i * 17));
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
      else if (p.t === 'anillo') { p.r += 2.2 * f; ctx.save(); ctx.translate(p.x, p.y); poly(ctx, Array.from({ length: 6 }, (_, k) => [Math.cos(k * Math.PI / 3) * p.r, Math.sin(k * Math.PI / 3) * p.r])); ctx.lineWidth = 3 * p.v; ctx.strokeStyle = p.c; ctx.stroke(); ctx.restore(); }
      else if (p.t === 'esquirla') { p.rot = (p.rot || Math.random() * 6) + .2 * f; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); poly(ctx, [[-p.r, p.r * .6], [p.r, p.r * .6], [0, -p.r]]); ctx.fillStyle = p.c; ctx.fill(); ctx.restore(); }
      else if (p.t === 'pixel') { ctx.fillStyle = p.c; ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r); }
      else if (p.t === 'mota') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4); gl.addColorStop(0, p.c.replace(',1)', ',.9)')); gl.addColorStop(1, p.c.replace(',1)', ',0)')); ctx.fillStyle = gl; ctx.fillRect(p.x - p.r * 4, p.y - p.r * 4, p.r * 8, p.r * 8); ctx.restore(); }
      else if (p.t === 'texto') { ctx.font = `700 22px ${FUENTE}`; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = NAVY; ctx.strokeText(p.s, p.x, p.y); ctx.fillStyle = p.c; ctx.fillText(p.s, p.x, p.y); }
      else { ctx.save(); ctx.globalCompositeOperation = 'lighter'; elipse(ctx, p.x, p.y, p.r, p.r); ctx.fillStyle = p.c; ctx.fill(); ctx.restore(); }
    });
    ctx.globalAlpha = 1;
  }
  function evento(p, c) {
    if (!sim || !p || !c) return;
    const hx = c.hx * T + T / 2, hy = sueloY(c.hx, c.hy);
    if (c.hx !== p.hx && solido(c.hx, c.hy + 1)) for (let i = 0; i < 3; i++) fx.push({ t: 'polvo', x: hx - c.facing * 10 + Math.random() * 6, y: hy - 3, vx: -c.facing * (.3 + Math.random() * .4), vy: -.2 - Math.random() * .3, v: .8, d: .03, r: 3 + Math.random() * 2, c: 'rgba(210,205,200,.55)' });
    c.gems.forEach((g, i) => { if (g.taken && p.gems[i] && !p.gems[i].taken) {
      const gx = g.x * T + T / 2, gy = sueloY(g.x, g.y) - 24;
      chispas(gx, gy, 18, ['#9ffff3', '#ffffff', CIAN], 3.2, .05);
      fx.push({ t: 'anillo', x: gx, y: gy, vx: 0, vy: 0, v: 1, d: .05, r: 6, c: CIAN });
      fx.push({ t: 'texto', s: '+1 💎', x: gx, y: gy - 16, vx: 0, vy: -.8, v: 1, d: .018, c: '#9ffff3' });
    } });
    if (c.attack) {
      const ax = c.attack.x * T + T / 2, ay = sueloY(c.attack.x, c.attack.y) - 22;
      chispas(ax - c.facing * 6, ay, 10, ['#ffffff', '#ffd27a', pj.hoja], 3.4, .1); shake = Math.max(shake, 4);
      for (let j = 0; j < 6; j++) fx.push({ t: 'esquirla', x: ax, y: ay, vx: (Math.random() - .5) * 4 + c.facing * 1.5, vy: -1.5 - Math.random() * 2, v: 1, d: .02, g: .1, r: 2.5 + Math.random() * 2, c: ['#545b78', '#2b3042', ROJO][j % 3] });
      fx.push({ t: 'texto', s: '-1', x: ax + 8, y: ay - 30, vx: 0, vy: -.9, v: 1, d: .022, c: ROJO });
    }
    c.enemies.forEach((e, i) => { const pe = p.enemies[i]; if (pe && pe.hp > 0 && e.hp <= 0) {
      const ex = e.x * T + T / 2, ey = sueloY(e.x, e.y) - 20;
      for (let j = 0; j < 30; j++) fx.push({ t: 'pixel', x: ex + (Math.random() - .5) * 30, y: ey + (Math.random() - .5) * 20, vx: (Math.random() - .5) * 3, vy: -.5 - Math.random() * 2, v: 1.1, d: .016 + Math.random() * .01, g: .03, r: 2 + Math.random() * 3.5, c: [ROJO, '#ffffff', CIAN, '#2b3042'][j % 4] });
      for (let j = 0; j < 8; j++) fx.push({ t: 'humo', x: ex + (Math.random() - .5) * 24, y: ey + (Math.random() - .5) * 20, vx: (Math.random() - .5) * 1, vy: -.3 - Math.random() * .6, v: 1, d: .025, r: 4 + Math.random() * 5, c: 'rgba(60,66,92,.55)' });
      fx.push({ t: 'anillo', x: ex, y: ey, vx: 0, vy: 0, v: 1, d: .04, r: 8, c: ROJO });
      shake = Math.max(shake, 6);
    } });
    if (c.vidas < p.vidas) { perdida = performance.now(); fx.push({ t: 'texto', s: '-1 VIDA', x: hx, y: hy - 74, vx: 0, vy: -.7, v: 1, d: .016, c: ROJO }); }
    if (c.bump) { shake = Math.max(shake, 7); chispas(hx + c.bump[0] * 26, hy - 30 + c.bump[1] * 26, 8, ['#ffd27a', '#ffffff'], 3, .1); }
    sim.doors.forEach((d, i) => { if (!(c.doors && c.doors[i] && !(p.doors && p.doors[i]))) return; const dx = d.x * T + T / 2, dy = sueloY(d.x, d.y); for (let j = 0; j < 14; j++) fx.push({ t: 'pixel', x: dx + (Math.random() - .5) * 46, y: dy - Math.random() * 50, vx: (Math.random() - .5) * 1.2, vy: -.2 - Math.random() * .6, v: 1, d: .02, r: 2 + Math.random() * 2, c: j % 2 ? ROJO : '#ffb3ba' }); shake = Math.max(shake, 3); });
    if (c.end === 'win') {
      victoria = performance.now();
      const cols = [ROJO, CREMA, CIAN, '#ffd27a'];
      for (let i = 0; i < 80; i++) fx.push({ t: 'esquirla', x: hx + (Math.random() - .5) * 30, y: hy - 50, vx: (Math.random() - .5) * 7, vy: -Math.random() * 7 - 2, v: 1.8, d: .008, g: .1, r: 3 + Math.random() * 2.5, c: cols[i % 4] });
      fx.push({ t: 'anillo', x: hx, y: hy - 30, vx: 0, vy: 0, v: 1, d: .025, r: 10, c: CIAN });
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
    // el nivel se apoya en el borde de abajo: la última fila queda medio cortada
    const visible = H - T * .55;
    s = Math.min((LW - 70) / W, (LH - 80) / visible, 1.35);
    ox = (LW - W * s) / 2; oy = LH - visible * s;
    cv.width = LW * dpr; cv.height = LH * dpr;
    if (!capaFondo || capaFondo.width !== LW * dpr) { capaFondo = pintaFondo(); nubesMoviles = [110, 150, 90].map((w, i) => ({ w, c: spriteNube(w, 300 + i * 11) })); }
    capaNivel = pintaNivel();
    fx = []; shake = 0; victoria = 0; perdida = 0;
  }
  function pinta(now, st) {
    if (!sim) return;
    const dt = Math.min(50, ultimo ? now - ultimo : 16); ultimo = now;
    const { p, c, k, playing } = st;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(capaFondo, 0, 0, LW, LH);
    // nubes que se mueven y naves con estela
    nubesMoviles.forEach((n, i) => {
      const r = semilla(100 + i), y = 50 + r() * 120, x = ((r() * (LW + n.w * 2) + now * (.004 + r() * .005)) % (LW + n.w * 2)) - n.w * 1.4;
      ctx.drawImage(n.c, x, y, n.w * 1.4, n.w * .4);
    });
    for (let i = 0; i < 2; i++) {
      const bx = ((now * (.04 + i * .02) + i * 400) % (LW + 300)) - 150, by = 110 + i * 60 + Math.sin(now / 1200 + i) * 6;
      const g = ctx.createLinearGradient(bx - 90, 0, bx, 0); g.addColorStop(0, 'rgba(255,240,220,0)'); g.addColorStop(1, 'rgba(255,240,220,.6)');
      ctx.fillStyle = g; ctx.fillRect(bx - 90, by - .8, 90, 1.6);
      ctx.fillStyle = '#3a4058'; poly(ctx, [[bx - 6, by - 2], [bx + 6, by - 1], [bx + 8, by + 1], [bx - 6, by + 2]]); ctx.fill();
      ctx.fillStyle = (now / 300 + i) % 2 < 1 ? ROJO : '#ffd27a'; ctx.fillRect(bx - 7, by - 1, 2, 2);
    }
    const sx = shake > .3 ? (Math.random() - .5) * shake : 0, sy = shake > .3 ? (Math.random() - .5) * shake : 0;
    shake *= Math.pow(.86, dt / 16.7);
    ctx.save(); ctx.translate(ox + sx, oy + sy); ctx.scale(s, s);
    ctx.drawImage(capaNivel, -M, -M, W + 2 * M, H + M + MB);
    luces(now); parpadeos(now);
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
      // si hay otro bug pegado, alterna la altura del cartel para que no se pisen
      const sube = e.x % 2 === 1 && c.enemies.some(o => o !== e && o.hp > 0 && o.y === e.y && Math.abs(o.x - e.x) === 1);
      dib.push({ z: e.y + .001 * e.x, f: () => enemigo(e, e.x * T + T / 2, sueloY(e.x, e.y), dir, now, alpha, hit ? k : -1, k < .3 ? pe.hp : e.hp, sube) });
    });
    dib.push({ z: hyC + .5, f: () => heroe(fxp, fyp, c.facing || 1, ph.pose, ph.ph, k, now) });
    dib.sort((a, b) => a.z - b.z).forEach(d => d.f());
    if (victoria && sim.exit) {
      const t = (now - victoria) / 1000, ex = sim.exit.x * T + T / 2, ey = sueloY(sim.exit.x, sim.exit.y) - 30;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, t * 2) * .45;
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + t * .5; poly(ctx, [[ex, ey], [ex + Math.cos(a - .05) * 280, ey + Math.sin(a - .05) * 280], [ex + Math.cos(a + .05) * 280, ey + Math.sin(a + .05) * 280]]); ctx.fillStyle = 'rgba(46,230,214,.4)'; ctx.fill(); }
      ctx.restore();
    }
    pintaFx(dt);
    if (c.say && playing) bocadillo(fxp, fyp - 84, c.say);
    ctx.restore();
    // haces de luz del sol y motas de polvo
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const a = .6 + Math.sin(now / 2600 + i * 1.7) * .03, x0 = LW * (.6 + i * .14), alfa = .035 + Math.sin(now / 1900 + i) * .015;
      const g2 = ctx.createLinearGradient(x0, 0, x0 - Math.cos(a) * 600, Math.sin(a) * 600); g2.addColorStop(0, `rgba(255,214,160,${alfa})`); g2.addColorStop(1, 'rgba(255,214,160,0)');
      ctx.fillStyle = g2; poly(ctx, [[x0 - 20, -10], [x0 + 30 + i * 8, -10], [x0 + 30 + i * 8 - Math.cos(a) * 700, Math.sin(a) * 700], [x0 - 20 - Math.cos(a) * 700 - 60, Math.sin(a) * 700]]); ctx.fill();
    }
    for (let i = 0; i < 14; i++) {
      const r = semilla(500 + i), vx = (r() - .5) * .012, vy = -.004 - r() * .006;
      const x = ((r() * LW + now * vx * 40) % LW + LW) % LW, y = ((r() * LH + now * vy * 40) % LH + LH) % LH, br = .1 + .35 * Math.max(0, Math.sin(now / (700 + r() * 700) + i * 3));
      ctx.fillStyle = `rgba(255,230,200,${br})`; ctx.fillRect(x, y, 1.6, 1.6);
    }
    ctx.restore();
    // destello rojo al perder una vida
    const tp = perdida ? (performance.now() - perdida) / 600 : 2;
    if (tp < 1) { const r = ctx.createRadialGradient(LW / 2, LH / 2, LH * .3, LW / 2, LH / 2, LW * .7); r.addColorStop(0, 'rgba(255,70,85,0)'); r.addColorStop(1, `rgba(255,70,85,${.5 * (1 - tp)})`); ctx.fillStyle = r; ctx.fillRect(0, 0, LW, LH); }
    // vidas: tres celdas inclinadas con la cruz de salud
    const vidas = c.vidas != null ? c.vidas : 3, antes = p.vidas != null ? p.vidas : vidas;
    corte(ctx, 16, 16, 172, 40, 10); ctx.fillStyle = 'rgba(15,25,35,.8)'; ctx.fill();
    ctx.fillStyle = ROJO; ctx.fillRect(16, 16, 4, 30);
    ctx.fillStyle = CREMA; ctx.fillRect(31, 30, 12, 4); ctx.fillRect(35, 26, 4, 12);
    for (let i = 0; i < 3; i++) {
      const x0 = 54 + i * 42, viva = i < vidas, rompiendo = !viva && i < antes && playing;
      ctx.save(); ctx.translate(x0 + 18, 36);
      if (rompiendo) { const e = 1 + Math.sin(Math.min(1, k) * Math.PI) * .35; ctx.scale(e, e); ctx.globalAlpha = 1 - k * .6; }
      poly(ctx, [[-14, 8], [-8, -8], [18, -8], [12, 8]]);
      ctx.fillStyle = viva || rompiendo ? CREMA : 'rgba(236,232,225,.15)'; ctx.fill();
      if (viva) { const lat = Math.max(0, Math.sin(now / 300 + i * .5)); ctx.fillStyle = `rgba(255,70,85,${.25 * lat})`; ctx.fill(); }
      ctx.restore();
    }
    // viñeta
    const v = ctx.createRadialGradient(LW / 2, LH / 2, LH * .45, LW / 2, LH / 2, LW * .72);
    v.addColorStop(0, 'rgba(15,25,35,0)'); v.addColorStop(1, 'rgba(15,25,35,.3)'); ctx.fillStyle = v; ctx.fillRect(0, 0, LW, LH);
  }
  function limpia() { fx = []; shake = 0; victoria = 0; perdida = 0; }
  function personaje(quien) { pj = construye(quien); }
  // retrato animado del agente (para elegirlo en la página de inicio)
  function retrato(now, quien, ratio, alegre) {
    const w = 170, h = 180, d = ratio || 1;
    if (cv.width !== w * d) { cv.width = w * d; cv.height = h * d; }
    const antes = pj; pj = construye(quien);
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, w, h);
    const fondo = ctx.createLinearGradient(0, 0, 0, h); fondo.addColorStop(0, '#24324c'); fondo.addColorStop(1, '#0f1923');
    ctx.fillStyle = fondo; ctx.fillRect(0, 0, w, h);
    // franja diagonal del color del agente y rejilla tenue
    ctx.fillStyle = pj.acento; ctx.globalAlpha = alegre ? .9 : .55; poly(ctx, [[w * .52, 0], [w * .78, 0], [w * .38, h], [w * .12, h]]); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(236,232,225,.06)'; ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 17) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
    for (let i = 0; i < h; i += 17) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }
    ctx.fillStyle = 'rgba(236,232,225,.12)'; ctx.fillRect(0, h - 24, w, 24);
    ctx.font = `700 34px ${FUENTE}`; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(236,232,225,.1)'; ctx.fillText(pj.nombre.toUpperCase(), 8, 36);
    ctx.save(); ctx.translate(w / 2 - 4, h - 22); ctx.scale(1.95, 1.95);
    sonrie = !!alegre; heroe(0, 0, 1, 'idle', 0, 0, now); sonrie = false;
    ctx.restore();
    pj = antes;
  }
  return { prepara, pinta, evento, limpia, personaje, retrato };
}
