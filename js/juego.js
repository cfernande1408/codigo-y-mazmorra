(function () {
  const $ = id => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d'), ed = $('code'), gutter = $('gutter'), out = $('out');
  const T = 48, BEAT = 300;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } }
  };
  const NUBE = Nube.activa;
  let cuenta = NUBE ? store.get('cym_cuenta', null) : null;
  const ns = () => cuenta ? `cym_${cuenta.codigo}_${cuenta.alias.toLowerCase()}_` : 'cym_';
  const codeKey = id => ns() + 'code_' + id;
  let prog = store.get(ns() + 'prog', {}), profe = !NUBE && store.get('cym_profe', false), speed = 1;
  let serverCode = {}, pendientes = cuenta ? store.get(ns() + 'pend', []) : [];
  let li = store.get('cym_lvl', 0); if (!(li >= 0 && li < LEVELS.length)) li = 0;
  let SIM = null, py = null, lastCode = '', particles = [], errLine = 0, vivo = false, desdeConsola = false;
  const view = { base: null, prev: null, frames: [], i: 0, start: 0, playing: false };
  const api = makeApi(() => SIM);

  // ---------- utilidades ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const unlocked = i => profe || (cuenta && cuenta.desbloquear) || i === 0 || (prog[LEVELS[i - 1].id] || 0) > 0;

  // ---------- consola ----------
  function log(text, kind) { const d = document.createElement('div'); d.className = kind || 'print'; d.textContent = text; out.appendChild(d); out.scrollTop = out.scrollHeight; }
  function clearLog() { out.innerHTML = ''; }

  // ---------- editor ----------
  function updateGutter() {
    const n = ed.value.split('\n').length; let h = '';
    for (let i = 1; i <= n; i++) h += `<div${i === errLine ? ' class="err"' : ''}>${i}</div>`;
    gutter.innerHTML = h; gutter.scrollTop = ed.scrollTop;
    const L = LEVELS[li], c = contarLineas(ed.value), lc = $('lineCount');
    if (L.maxLines) { lc.className = 'lines' + (c > L.maxLines ? ' over' : ''); lc.innerHTML = `Líneas de código: <b>${c}</b> · reto: ${L.maxLines} o menos`; }
    else { lc.className = 'lines'; lc.innerHTML = `Líneas de código: <b>${c}</b>`; }
  }
  let saveT = 0;
  function onEdit() { if (errLine) errLine = 0; updateGutter(); clearTimeout(saveT); saveT = setTimeout(() => store.set(codeKey(LEVELS[li].id), ed.value), 300); }
  function insertText(t) { ed.focus(); if (!document.execCommand || !document.execCommand('insertText', false, t)) { ed.setRangeText(t, ed.selectionStart, ed.selectionEnd, 'end'); } onEdit(); }
  ed.addEventListener('input', onEdit);
  ed.addEventListener('scroll', () => { gutter.scrollTop = ed.scrollTop; });
  ed.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = ed.selectionStart, v = ed.value, ls = v.lastIndexOf('\n', s - 1) + 1;
      if (e.shiftKey) {
        let n = 0; while (n < 4 && v[ls + n] === ' ') n++;
        if (n) { ed.setSelectionRange(ls, ls + n); insertText(''); ed.setSelectionRange(Math.max(ls, s - n), Math.max(ls, s - n)); }
      } else insertText('    ');
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const s = ed.selectionStart, v = ed.value, ls = v.lastIndexOf('\n', s - 1) + 1, line = v.slice(ls, s);
      let ind = line.match(/^ */)[0]; if (/:\s*(#.*)?$/.test(line)) ind += '    ';
      insertText('\n' + ind);
    }
  });

  // ---------- nivel ----------
  function renderNav() {
    const nav = $('levels'); nav.innerHTML = '';
    LEVELS.forEach((L, i) => {
      const b = document.createElement('button'); const ok = unlocked(i);
      b.className = 'chip' + (i === li ? ' on' : '') + (ok ? '' : ' locked');
      const st = prog[L.id] || 0, max = L.maxLines ? 2 : 1;
      b.innerHTML = `<span class="n">${ok ? i + 1 : '🔒'}</span><span class="st">${'★'.repeat(st)}<i>${'★'.repeat(Math.max(0, max - st))}</i></span>`;
      b.title = `${i + 1}. ${L.title} · ${L.concept}`;
      b.onclick = () => { if (!ok) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; } selectLevel(i); };
      nav.appendChild(b);
    });
  }
  function renderBook() {
    const book = $('book'); book.innerHTML = '';
    const nuevos = new Set(LEVELS[li].nuevos), keys = [];
    for (let i = 0; i <= li; i++) LEVELS[i].nuevos.forEach(k => keys.push(k));
    keys.forEach(k => {
      const d = API_DOCS[k], b = document.createElement('button');
      b.className = 'spell';
      b.innerHTML = `<span class="sig">${esc(d.sig)}${nuevos.has(k) && li > 0 ? '<span class="new">NUEVO</span>' : ''}</span><span class="d">${esc(d.desc)}</span>`;
      b.onclick = () => insertText(d.ins);
      book.appendChild(b);
    });
  }
  function renderGoals(s) {
    const L = LEVELS[li], g = [];
    if (L.goals.includes('gemas')) g.push(`<li>💎 Recoge las ${s.gems.length} gemas</li>`);
    if (L.goals.includes('salida')) g.push('<li>🌀 Llega a la salida</li>');
    g.push('<li>🧱 No te choques</li>');
    if (L.maxLines) g.push(`<li class="reto">★ Reto: ${L.maxLines} líneas de código o menos</li>`);
    $('goals').innerHTML = g.join('');
  }
  function newPreview() {
    SIM = crearPartida(LEVELS[li]); vivo = false;
    view.base = view.prev = snap(SIM); view.playing = false; view.frames = []; particles = []; motas = [];
    cv.width = SIM.w * T * dpr; cv.height = SIM.h * T * dpr;
    renderGoals(SIM);
  }
  function selectLevel(i) {
    closeModal(); li = i; store.set('cym_lvl', i);
    const L = LEVELS[i];
    $('lvlNum').textContent = `Nivel ${i + 1} de ${LEVELS.length}`;
    $('lvlTitle').textContent = L.title;
    $('tags').innerHTML = `<span class="tag">${esc(L.concept)}</span>` + (L.random ? '<span class="tag rnd">🎲 Cambia en cada partida</span>' : '');
    $('intro').innerHTML = L.intro; $('hint').innerHTML = L.hint; $('hintBox').open = false;
    ed.value = store.get(codeKey(L.id), serverCode[L.id] || L.starter); errLine = 0; updateGutter(); ed.scrollTop = 0;
    newPreview(); renderNav(); renderBook(); clearLog();
    log(`Nivel ${i + 1}: ${L.title}. Escribe tu código y pulsa Ejecutar.`, 'muted');
    setRunning(false);
  }

  // ---------- ejecución ----------
  function setRunning(r) { $('run').disabled = r || !py; $('replBtn').disabled = r || !py; $('run').textContent = r ? '… Ejecutando' : '▶ Ejecutar'; }
  function run() {
    if (!py || view.playing || (NUBE && !cuenta)) return;
    closeModal();
    const L = LEVELS[li], code = ed.value; lastCode = code; desdeConsola = false;
    store.set(codeKey(L.id), code);
    clearLog(); errLine = 0; particles = [];
    newPreview();
    let res;
    try { const fn = py.globals.get('_run'); const r = fn(code); res = r.toJs(); r.destroy(); fn.destroy(); }
    catch (e) { res = ['error', 0, 'Error', String(e && e.message || e)]; }
    const [kind, line, name, msg] = res;
    terminar(SIM, { kind, line, name, msg });
    if (kind !== 'ok' && line) { errLine = line; }
    updateGutter();
    view.frames = SIM.frames; view.i = 0; view.prev = view.base; view.start = performance.now(); view.playing = true;
    if (view.frames[0]) frameStart(view.frames[0]);
    setRunning(true);
  }
  // ---------- consola directa: cada orden se ejecuta al momento ----------
  const historial = []; let hIdx = 0;
  function consola(cmd) {
    if (!py || view.playing || (NUBE && !cuenta)) return false;
    cmd = cmd.replace(/\s+$/, ''); if (!cmd.trim()) return false;
    closeModal();
    if (!vivo || SIM.over) {
      if (SIM.over) newPreview();
      py.runPython('_vivo_nuevo()'); vivo = true; errLine = 0; particles = [];
      const hayCodigo = ed.value.split('\n').some(l => l.trim() && !l.trim().startsWith('#'));
      if (hayCodigo) {
        ed.focus(); ed.select(); insertText('# Órdenes de la consola\n');
        log('He vaciado el editor para apuntar tus órdenes (Ctrl+Z en el editor recupera lo anterior).', 'muted');
      }
      $('replIn').focus();
    }
    log('>>> ' + cmd, 'cmd'); desdeConsola = true;
    const desde = SIM.frames.length;
    let res;
    try { const fn = py.globals.get('_vivo'); const r = fn(cmd); res = r.toJs(); r.destroy(); fn.destroy(); }
    catch (e) { res = ['error', 0, 'Error', String(e && e.message || e)]; }
    const [kind, , name, msg] = res;
    const nuevos = SIM.frames.slice(desde);
    if (kind === 'ok' && !(SIM.over && SIM.over.type === 'fail')) {
      if (ed.value && !ed.value.endsWith('\n')) ed.value += '\n';
      ed.value += cmd.trim() + '\n'; ed.scrollTop = ed.scrollHeight; onEdit();
      store.set(codeKey(LEVELS[li].id), ed.value);
    }
    lastCode = ed.value;
    if (kind !== 'ok') nuevos.push(Object.assign({}, nuevos.length ? nuevos[nuevos.length - 1] : view.base,
      { dur: 0, say: null, attack: null, bump: null, end: null, log: { text: traducirError(kind, 0, name, msg), kind: 'error' } }));
    if (!nuevos.length) return true;
    view.frames = nuevos; view.i = 0; view.prev = view.base; view.start = performance.now(); view.playing = true;
    frameStart(nuevos[0]); setRunning(true);
    return true;
  }
  $('repl').addEventListener('submit', e => {
    e.preventDefault();
    const inp = $('replIn'), v = inp.value;
    if (consola(v) !== false) { historial.push(v); hIdx = historial.length; inp.value = ''; }
  });
  $('replIn').addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && hIdx > 0) { e.preventDefault(); e.target.value = historial[--hIdx]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); hIdx = Math.min(historial.length, hIdx + 1); e.target.value = historial[hIdx] || ''; }
  });

  // repite en silencio lo apuntado en el editor para volver al punto anterior al fallo
  function reponer() {
    newPreview();
    try {
      const fn = py.globals.get('_vivo_reponer'); const r = fn(ed.value); r.destroy(); fn.destroy();
    } catch (e) { newPreview(); return; }
    if (SIM.over) { newPreview(); return; }
    vivo = true; SIM.frames = []; view.base = view.prev = snap(SIM);
  }

  function frameStart(f) {
    if (f.log) log(f.log.text, f.log.kind);
    if (f.end === 'win') confetti(f.hx, f.hy);
  }
  function tick(now) {
    if (!view.playing) return;
    for (; ;) {
      const f = view.frames[view.i];
      if (!f) { view.playing = false; view.base = view.prev; finish(); return; }
      const dur = f.dur * BEAT / speed;
      if (now - view.start < dur) return;
      view.prev = f; view.i++; view.start += dur;
      if (view.frames[view.i]) frameStart(view.frames[view.i]);
    }
  }
  function finish() {
    setRunning(false);
    const L = LEVELS[li], o = SIM.over; if (!o) return;
    if (o.type === 'win') {
      const n = contarLineas(lastCode), reto = L.maxLines ? n <= L.maxLines : null;
      const stars = 1 + (reto ? 1 : 0), max = L.maxLines ? 2 : 1;
      prog[L.id] = Math.max(prog[L.id] || 0, stars); store.set(ns() + 'prog', prog); renderNav();
      enviar(L.id, true, stars, lastCode);
      const last = li === LEVELS.length - 1;
      let h = `<div class="ico">${last ? '👑' : '🏆'}</div><h2>${last ? '¡Has escapado!' : '¡Nivel superado!'}</h2>`;
      h += `<div class="bigstars">${'★'.repeat(stars)}<i>${'★'.repeat(max - stars)}</i></div><ul class="mlist"><li>★ Misión completada</li>`;
      if (L.maxLines) h += `<li class="${reto ? '' : 'no'}">${reto ? '★' : '☆'} Reto: ${L.maxLines} líneas o menos (tu código tiene ${n})</li>`;
      h += '</ul>';
      if (last) h += `<p>Has salido de la mazmorra con un algoritmo de verdad. ¡Eso ya es programar!</p>`;
      if (L.random) h += `<p class="small">Este mapa es aleatorio: ejecútalo un par de veces más para comprobar que tu código funciona siempre.</p>`;
      h += '<div class="mbtns">';
      if (!last) h += '<button class="btn gold" id="mNext">Siguiente nivel ▶</button>';
      h += '<button class="btn" id="mStay">Seguir aquí</button></div>';
      openModal(h, false);
      if (!last) $('mNext').onclick = () => selectLevel(li + 1);
      $('mStay').onclick = closeModal;
    } else {
      enviar(L.id, false, 0, lastCode);
      let h = `<div class="ico">💥</div><h2>¡Ups!</h2><p>${esc(o.msg)}</p>`;
      if (L.random) h += '<p class="small">Recuerda: este mapa cambia en cada partida. Tu código tiene que funcionar en cualquier caso.</p>';
      if (desdeConsola) {
        h += '<p class="small">La última orden no se ha apuntado en el editor.</p><div class="mbtns"><button class="btn" id="mZero">Empezar de cero</button><button class="btn gold" id="mRetry">Volver a donde estaba</button></div>';
        openModal(h, true);
        $('mRetry').onclick = () => { closeModal(); reponer(); $('replIn').focus(); };
        $('mZero').onclick = () => { closeModal(); newPreview(); $('replIn').focus(); };
      } else {
        h += '<div class="mbtns"><button class="btn gold" id="mRetry">Volver a intentarlo</button></div>';
        openModal(h, true);
        $('mRetry').onclick = () => { closeModal(); newPreview(); ed.focus(); };
      }
    }
  }
  function openModal(html, fail) { const b = $('mbox'); b.className = 'mbox' + (fail ? ' fail' : ''); b.innerHTML = html; $('modal').classList.remove('hidden'); }
  function closeModal() { $('modal').classList.add('hidden'); }
  $('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // ---------- dibujo (estilo cómic: contornos gruesos y colores vivos) ----------
  const INK = '#24102b';
  function tileAt(x, y) { return (x < 0 || y < 0 || x >= SIM.w || y >= SIM.h) ? '#' : SIM.tiles[y][x]; }
  const muro = t => t === '#' || t === ' ';
  function ink(w) { ctx.lineWidth = w || 2.5; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  function poly(pts) { ctx.beginPath(); pts.forEach(([a, b], i) => i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.closePath(); }
  function ellipse(cx, cy, rx, ry) { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); }
  let antorchas = [];

  function estrella(cx, cy, r, c1, c2) {
    for (const rot of [0, Math.PI / 4]) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      ctx.beginPath(); ctx.rect(-r, -r, 2 * r, 2 * r); ctx.fillStyle = c1; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = c2; ctx.stroke(); ctx.restore();
    }
    ctx.fillStyle = '#ffd35a'; ellipse(cx, cy, r * .38, r * .38); ctx.fill();
  }
  function drawFloor(x, y) {
    const px = x * T, py = y * T, v = hash(x, y);
    ctx.fillStyle = v < .5 ? '#e7ac6c' : '#e0a163'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = 'rgba(255,240,200,.28)'; ctx.fillRect(px + 3, py + 3, T - 6, 3);
    ctx.strokeStyle = '#b36d3f'; ctx.lineWidth = 2; ctx.strokeRect(px + 1, py + 1, T - 2, T - 2);
    if (v > .8) { estrella(px + T / 2, py + T / 2, 7, '#d59456', '#b36d3f'); ctx.fillStyle = '#d59456'; ellipse(px + T / 2, py + T / 2, 3, 3); ctx.fill(); }
    else if (v < .1) { ctx.strokeStyle = '#a5643a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px + 9, py + 30); ctx.lineTo(px + 16, py + 34); ctx.lineTo(px + 13, py + 41); ctx.stroke(); }
    if (muro(tileAt(x, y - 1)) || tileAt(x, y - 1) === 'C') {
      const g = ctx.createLinearGradient(0, py, 0, py + 20); g.addColorStop(0, 'rgba(74,18,84,.55)'); g.addColorStop(1, 'rgba(74,18,84,0)');
      ctx.fillStyle = g; ctx.fillRect(px, py, T, 20);
    }
    if (muro(tileAt(x - 1, y))) {
      const g = ctx.createLinearGradient(px, 0, px + 12, 0); g.addColorStop(0, 'rgba(74,18,84,.35)'); g.addColorStop(1, 'rgba(74,18,84,0)');
      ctx.fillStyle = g; ctx.fillRect(px, py, 12, T);
    }
  }
  function drawWall(x, y, now) {
    const px = x * T, py = y * T, front = !muro(tileAt(x, y + 1)), topH = front ? T - 20 : T, v = hash(x + 3, y + 7);
    ctx.fillStyle = '#5a2150'; ctx.fillRect(px, py, T, topH);
    ctx.fillStyle = '#6e2c63'; ctx.fillRect(px + 4, py + 4, T - 8, topH - 8);
    if (v > .55 && topH > 30) { poly([[px + T / 2, py + topH / 2 - 7], [px + T / 2 + 7, py + topH / 2], [px + T / 2, py + topH / 2 + 7], [px + T / 2 - 7, py + topH / 2]]); ctx.fillStyle = '#8d417f'; ctx.fill(); }
    ctx.beginPath();
    if (!muro(tileAt(x, y - 1))) { ctx.moveTo(px, py + 1); ctx.lineTo(px + T, py + 1); }
    if (!muro(tileAt(x - 1, y))) { ctx.moveTo(px + 1, py); ctx.lineTo(px + 1, py + topH); }
    if (!muro(tileAt(x + 1, y))) { ctx.moveTo(px + T - 1, py); ctx.lineTo(px + T - 1, py + topH); }
    ink(3);
    if (!front) return;
    const fy = py + topH;
    ctx.fillStyle = '#c8573b'; ctx.fillRect(px, fy, T, 20);
    ctx.fillStyle = '#ec8355'; ctx.fillRect(px, fy, T, 3);
    ctx.strokeStyle = '#8c3125'; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(px, fy + 11.5); ctx.lineTo(px + T, fy + 11.5);
    const o = (x % 2) ? 12 : 30;
    ctx.moveTo(px + o, fy + 3); ctx.lineTo(px + o, fy + 11); ctx.moveTo(px + (o + 18) % T, fy + 12); ctx.lineTo(px + (o + 18) % T, fy + 20);
    ctx.stroke();
    if (v > .8) {
      // antorcha
      const fx = px + T / 2, fl = Math.sin(now / 90 + x * 3) * 1.5 + Math.sin(now / 53 + y) * 1;
      ctx.fillStyle = '#5a3420'; ctx.fillRect(fx - 2, fy + 6, 4, 11); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(fx - 2, fy + 6, 4, 11);
      ctx.beginPath(); ctx.moveTo(fx - 7, fy + 2); ctx.lineTo(fx + 7, fy + 2); ctx.lineTo(fx + 4, fy + 7); ctx.lineTo(fx - 4, fy + 7); ctx.closePath(); ctx.fillStyle = '#f2b544'; ctx.fill(); ink(1.8);
      ctx.beginPath(); ctx.moveTo(fx - 6, fy + 2); ctx.bezierCurveTo(fx - 8, fy - 6, fx - 2 + fl, fy - 9, fx + fl * .6, fy - 13); ctx.bezierCurveTo(fx + 3, fy - 8, fx + 8, fy - 5, fx + 6, fy + 2); ctx.closePath();
      ctx.fillStyle = '#ff7a1a'; ctx.fill(); ink(2);
      ctx.beginPath(); ctx.moveTo(fx - 3, fy + 2); ctx.bezierCurveTo(fx - 4, fy - 3, fx + fl * .4, fy - 5, fx + fl * .4, fy - 7); ctx.bezierCurveTo(fx + 2, fy - 4, fx + 4, fy - 2, fx + 3, fy + 2); ctx.closePath();
      ctx.fillStyle = '#ffe066'; ctx.fill();
      antorchas.push([fx, fy - 4]);
    } else if (v > .62) {
      // hornacina con arco
      const ax = px + T / 2;
      ctx.beginPath(); ctx.moveTo(ax - 7, fy + 19); ctx.lineTo(ax - 7, fy + 9); ctx.quadraticCurveTo(ax - 7, fy + 2, ax, fy + 1); ctx.quadraticCurveTo(ax + 7, fy + 2, ax + 7, fy + 9); ctx.lineTo(ax + 7, fy + 19); ctx.closePath();
      ctx.fillStyle = '#3a1238'; ctx.fill(); ink(2);
    }
    ctx.beginPath(); ctx.moveTo(px, fy); ctx.lineTo(px + T, fy); ctx.moveTo(px, py + T - 1); ctx.lineTo(px + T, py + T - 1); ink(2.5);
    if (!muro(tileAt(x - 1, y))) { ctx.beginPath(); ctx.moveTo(px + 1, fy); ctx.lineTo(px + 1, py + T); ink(2.5); }
    if (!muro(tileAt(x + 1, y))) { ctx.beginPath(); ctx.moveTo(px + T - 1, fy); ctx.lineTo(px + T - 1, py + T); ink(2.5); }
  }
  function drawExit(x, y, now) {
    const px = x * T, py = y * T, cx = px + T / 2, cy = py + T / 2, pulse = .8 + Math.sin(now / 380) * .2;
    const g = ctx.createRadialGradient(cx, cy, 3, cx, cy, T * .7);
    g.addColorStop(0, `rgba(120,255,230,${.75 * pulse})`); g.addColorStop(.5, `rgba(40,190,200,${.35 * pulse})`); g.addColorStop(1, 'rgba(40,190,200,0)');
    ctx.fillStyle = g; ctx.fillRect(px - 10, py - 10, T + 20, T + 20);
    ellipse(cx, cy, 17, 17); ctx.fillStyle = '#16354a'; ctx.fill();
    ctx.save(); ellipse(cx, cy, 15, 15); ctx.clip();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(cx, cy, 5 + i * 4, now / (300 + i * 90) + i * 2, now / (300 + i * 90) + i * 2 + 3.6);
      ctx.strokeStyle = ['#e9fffb', '#7ff3e2', '#2fc6b8'][i]; ctx.lineWidth = 2.5; ctx.stroke();
    }
    ctx.restore();
    ellipse(cx, cy, 17, 17); ctx.lineWidth = 5; ctx.strokeStyle = '#f2b544'; ctx.stroke();
    ellipse(cx, cy, 19.5, 19.5); ink(2); ellipse(cx, cy, 14.5, 14.5); ink(1.5);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; ellipse(cx + Math.cos(a) * 17, cy + Math.sin(a) * 17, 2.5, 2.5); ctx.fillStyle = '#ff4f8b'; ctx.fill(); ink(1.2); }
  }
  function drawGem(x, y, now) {
    const cx = x * T + T / 2, base = y * T + T / 2, cy = base + Math.sin(now / 350 + x + y) * 2.5 - 2;
    ctx.fillStyle = 'rgba(74,18,84,.35)'; ellipse(cx, base + 14, 8, 3); ctx.fill();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20); g.addColorStop(0, 'rgba(255,90,150,.45)'); g.addColorStop(1, 'rgba(255,90,150,0)'); ctx.fillStyle = g; ctx.fillRect(cx - 20, cy - 20, 40, 40);
    poly([[cx, cy - 12], [cx + 10, cy - 3], [cx, cy + 11], [cx - 10, cy - 3]]); ctx.fillStyle = '#e8336f'; ctx.fill();
    poly([[cx, cy - 12], [cx + 10, cy - 3], [cx, cy - 1], [cx - 10, cy - 3]]); ctx.fillStyle = '#ff8fb5'; ctx.fill();
    poly([[cx, cy - 1], [cx + 10, cy - 3], [cx, cy + 11]]); ctx.fillStyle = '#b81f57'; ctx.fill();
    poly([[cx, cy - 12], [cx + 10, cy - 3], [cx, cy + 11], [cx - 10, cy - 3]]); ink(2.2);
    if ((now / 800 + x) % 3 < .35) { ctx.fillStyle = '#fff'; poly([[cx - 4, cy - 10], [cx - 3, cy - 7], [cx, cy - 6], [cx - 3, cy - 5], [cx - 4, cy - 2], [cx - 5, cy - 5], [cx - 8, cy - 6], [cx - 5, cy - 7]]); ctx.fill(); }
  }
  function drawDoor(x, y, open) {
    const px = x * T, py = y * T;
    drawFloor(x, y);
    const L = px + 7, R = px + T - 7, top = py + 4, bot = py + T - 2, mid = px + T / 2;
    const arco = () => { ctx.beginPath(); ctx.moveTo(L, bot); ctx.lineTo(L, top + 14); ctx.quadraticCurveTo(L, top, mid, top); ctx.quadraticCurveTo(R, top, R, top + 14); ctx.lineTo(R, bot); ctx.closePath(); };
    ctx.fillStyle = '#c8573b'; ctx.fillRect(px + 2, py + 1, T - 4, T - 3); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeRect(px + 2, py + 1, T - 4, T - 3);
    arco();
    if (open) { ctx.fillStyle = '#2a0f2e'; ctx.fill(); ink(2.5); return; }
    ctx.fillStyle = '#8a4a2a'; ctx.fill();
    ctx.save(); arco(); ctx.clip(); ctx.strokeStyle = '#5e2f18'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 1; i < 4; i++) { ctx.moveTo(L + i * 8.5, top); ctx.lineTo(L + i * 8.5, bot); } ctx.stroke(); ctx.restore();
    arco(); ink(2.5);
    ctx.fillStyle = '#f2b544'; [[mid - 9, py + 22], [mid + 9, py + 22], [mid - 9, py + 36], [mid + 9, py + 36]].forEach(([a, b]) => { ellipse(a, b, 2, 2); ctx.fill(); });
    estrella(mid, py + 29, 5, '#2fc6b8', INK);
  }
  function drawSign(x, y) {
    const px = x * T, py = y * T, cx = px + T / 2; drawFloor(x, y);
    ctx.fillStyle = 'rgba(74,18,84,.35)'; ellipse(cx, py + T - 7, 13, 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - 3, py + 24); ctx.lineTo(cx - 6, py + T - 7); ctx.lineTo(cx + 6, py + T - 7); ctx.lineTo(cx + 3, py + 24); ctx.closePath(); ctx.fillStyle = '#6b3a1f'; ctx.fill(); ink(2);
    rr(px + 9, py + 9, T - 18, 18, 3); ctx.fillStyle = '#f6e7bf'; ctx.fill(); ink(2.2);
    [[px + 8, py + 8], [px + T - 12, py + 8]].forEach(([a, b]) => { rr(a, b, 4, 20, 2); ctx.fillStyle = '#d9b97a'; ctx.fill(); ink(1.5); });
    ctx.strokeStyle = '#9a6a3a'; ctx.lineWidth = 1.6; ctx.beginPath();
    ctx.moveTo(px + 15, py + 15); ctx.lineTo(px + T - 16, py + 15); ctx.moveTo(px + 15, py + 20); ctx.lineTo(px + T - 22, py + 20); ctx.stroke();
  }
  function drawEnemy(e, now, alpha, hitK, hpShown) {
    let cx = e.x * T + T / 2, cy = e.y * T + T / 2 + 3;
    const wob = Math.sin(now / 280 + e.x * 1.7) * 1.6;
    if (hitK >= 0 && hitK < .5) cx += Math.sin(hitK * 45) * 3;
    ctx.save(); ctx.globalAlpha = alpha;
    if (alpha < 1) { ctx.translate(cx, cy + 14); ctx.scale(1 + (1 - alpha) * .35, Math.max(.05, alpha)); ctx.translate(-cx, -cy - 14); }
    ctx.fillStyle = 'rgba(74,18,84,.4)'; ellipse(cx, cy + 15, 16, 4.5); ctx.fill();
    // cuernos
    [[-1, -11], [1, 11]].forEach(([s, ox]) => {
      ctx.beginPath(); ctx.moveTo(cx + ox, cy - 12 + wob); ctx.quadraticCurveTo(cx + s * 21, cy - 18 + wob, cx + s * 17, cy - 28 + wob); ctx.quadraticCurveTo(cx + s * 12, cy - 19 + wob, cx + s * 4, cy - 16 + wob); ctx.closePath();
      ctx.fillStyle = '#f4e3c0'; ctx.fill(); ink(2);
    });
    const body = () => {
      ctx.beginPath(); ctx.moveTo(cx - 17, cy + 14);
      ctx.bezierCurveTo(cx - 22, cy - 6 + wob, cx - 12, cy - 20 + wob, cx, cy - 20 + wob);
      ctx.bezierCurveTo(cx + 12, cy - 20 + wob, cx + 22, cy - 6 + wob, cx + 17, cy + 14);
      ctx.quadraticCurveTo(cx + 11, cy + 18, cx + 6, cy + 14); ctx.quadraticCurveTo(cx, cy + 18, cx - 6, cy + 14); ctx.quadraticCurveTo(cx - 11, cy + 18, cx - 17, cy + 14);
      ctx.closePath();
    };
    body(); ctx.fillStyle = `hsl(${e.hue},62%,46%)`; ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = `hsl(${e.hue},58%,32%)`; ellipse(cx + 8, cy + 12, 20, 12); ctx.fill();
    ctx.fillStyle = `hsl(${e.hue},75%,66%)`; ellipse(cx - 8, cy - 12 + wob, 6, 3.5); ctx.fill();
    ctx.restore();
    body(); ink(2.6);
    // ojos brillantes
    [[-6.5, -1], [6.5, 1]].forEach(([ox, s]) => {
      poly([[cx + ox - 5, cy - 6 + wob - s * 0], [cx + ox + 5, cy - 6 + wob + (s > 0 ? -2 : 2)], [cx + ox + 4, cy - 1 + wob], [cx + ox - 4, cy - 1 + wob]]);
      ctx.fillStyle = '#ffe14d'; ctx.fill(); ink(1.8);
    });
    ctx.beginPath(); ctx.moveTo(cx - 6, cy + 7 + wob); ctx.quadraticCurveTo(cx, cy + 3 + wob, cx + 6, cy + 7 + wob); ink(2.2);
    poly([[cx - 3, cy + 5.5 + wob], [cx - 1.5, cy + 9 + wob], [cx, cy + 5 + wob]]); ctx.fillStyle = '#fff'; ctx.fill(); ink(1);
    if (hitK >= 0 && hitK < .3) { body(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill(); }
    ctx.restore();
    if (alpha > .3) {
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.font = '800 11px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center';
      const tw = ctx.measureText(e.name).width + 12, ty = e.y * T - 10;
      rr(cx - tw / 2, ty - 10, tw, 16, 8); ctx.fillStyle = '#fff4dc'; ctx.fill(); ink(2);
      ctx.fillStyle = INK; ctx.fillText(e.name, cx, ty + 2);
      for (let i = 0; i < e.max; i++) { rr(cx - e.max * 5 + i * 10 + 1, ty + 8, 8, 5, 2); ctx.fillStyle = i < hpShown ? '#ff4f6b' : '#5a3a62'; ctx.fill(); ink(1.3); }
      ctx.restore();
    }
  }
  function drawHero(x, y, facing, now, atkK) {
    const cx = x * T + T / 2, cy = y * T + T / 2 + 4, bob = Math.sin(now / 260) * 1.2, ondea = Math.sin(now / 170) * 2;
    ctx.fillStyle = 'rgba(74,18,84,.42)'; ellipse(cx, cy + 14, 13, 4.5); ctx.fill();
    ctx.save(); ctx.translate(cx, cy + bob); ctx.scale(facing, 1);
    // capa
    ctx.beginPath(); ctx.moveTo(-5, -10); ctx.quadraticCurveTo(-16, 0, -17 + ondea, 12); ctx.lineTo(-9, 9); ctx.lineTo(-4 + ondea * .5, 13); ctx.lineTo(3, -8); ctx.closePath();
    ctx.fillStyle = '#1fa89c'; ctx.fill(); ink(2.2);
    // piernas y botas
    rr(-7, 4, 5, 9, 2); ctx.fillStyle = '#3d1f4c'; ctx.fill(); ink(1.8);
    rr(2, 4, 5, 9, 2); ctx.fill(); ink(1.8);
    rr(-8, 11, 7, 4, 2); ctx.fillStyle = '#7a3f22'; ctx.fill(); ink(1.6);
    rr(1, 11, 7, 4, 2); ctx.fill(); ink(1.6);
    // túnica
    ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(8, -9); ctx.lineTo(10, 6); ctx.lineTo(-10, 6); ctx.closePath();
    ctx.fillStyle = '#f6e6c4'; ctx.fill(); ink(2.2);
    rr(-9.5, 0, 19, 4, 1.5); ctx.fillStyle = '#f2b544'; ctx.fill(); ink(1.6);
    ctx.fillStyle = '#ff4f8b'; ellipse(0, 2, 2, 2); ctx.fill();
    // brazo con cimitarra
    ctx.save(); ctx.translate(8, -2);
    const sw = atkK >= 0 ? (atkK < .45 ? -1.8 + atkK * 6.2 : 1 - (atkK - .45) * 1.3) : .5; ctx.rotate(sw);
    ctx.beginPath(); ctx.moveTo(3, -2); ctx.quadraticCurveTo(14, -6, 22, -1); ctx.quadraticCurveTo(15, 0, 3, 2); ctx.closePath();
    ctx.fillStyle = '#e9f0f7'; ctx.fill(); ink(1.8);
    rr(-1, -5, 4, 10, 1.5); ctx.fillStyle = '#f2b544'; ctx.fill(); ink(1.5);
    ellipse(0, 0, 3.2, 3.2); ctx.fillStyle = '#e7a877'; ctx.fill(); ink(1.5);
    ctx.restore();
    // cabeza con capucha
    ellipse(0, -16, 8.5, 8.5); ctx.fillStyle = '#e7a877'; ctx.fill(); ink(2.2);
    ctx.beginPath(); ctx.arc(0, -16, 10, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(6, -20, -1, -21); ctx.quadraticCurveTo(-6, -20, -9.8, -14.5); ctx.closePath();
    ctx.fillStyle = '#1fa89c'; ctx.fill(); ink(2.2);
    ctx.beginPath(); ctx.moveTo(-9.5, -15); ctx.quadraticCurveTo(-15, -12 + ondea * .6, -18, -6 + ondea); ctx.lineTo(-13, -8); ctx.closePath(); ctx.fillStyle = '#1fa89c'; ctx.fill(); ink(1.8);
    ellipse(4, -14.5, 2.2, 2.6); ctx.fillStyle = '#fff'; ctx.fill(); ink(1.2);
    ellipse(4.8, -14.2, 1.1, 1.3); ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); ctx.moveTo(1.5, -18.5); ctx.lineTo(6.5, -17.5); ink(1.6);
    ctx.beginPath(); ctx.moveTo(3, -10); ctx.lineTo(6, -10.5); ink(1.3);
    ctx.restore();
  }
  function drawBubble(x, y, text) {
    ctx.font = '800 13px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center';
    let t = String(text); if (t.length > 34) t = t.slice(0, 33) + '…';
    const w = ctx.measureText(t).width + 20, h = 25, W = SIM.w * T;
    let bx = x * T + T / 2 - w / 2; bx = Math.max(4, Math.min(W - w - 4, bx));
    const by = Math.max(3, y * T - 32), tx = x * T + T / 2;
    ctx.beginPath(); ctx.moveTo(bx + 10, by); ctx.lineTo(bx + w - 10, by); ctx.quadraticCurveTo(bx + w, by, bx + w, by + 10); ctx.lineTo(bx + w, by + h - 10); ctx.quadraticCurveTo(bx + w, by + h, bx + w - 10, by + h);
    ctx.lineTo(tx + 6, by + h); ctx.lineTo(tx, by + h + 8); ctx.lineTo(tx - 6, by + h); ctx.lineTo(bx + 10, by + h); ctx.quadraticCurveTo(bx, by + h, bx, by + h - 10); ctx.lineTo(bx, by + 10); ctx.quadraticCurveTo(bx, by, bx + 10, by); ctx.closePath();
    ctx.fillStyle = '#fff4dc'; ctx.fill(); ink(2.5);
    ctx.fillStyle = INK; ctx.fillText(t, bx + w / 2, by + 17);
  }
  function confetti(x, y) {
    const cols = ['#f2b544', '#2fc6b8', '#ff4f8b', '#fff4dc', '#b98cff'];
    for (let i = 0; i < 80; i++) particles.push({ x: x * T + T / 2, y: y * T + T / 2, vx: (Math.random() - .5) * 7, vy: -Math.random() * 7 - 2, c: cols[i % 5], life: 1, r: Math.random() * 6 });
  }
  let motas = [];
  function ambiente(now) {
    const W = SIM.w * T, H = SIM.h * T;
    while (motas.length < Math.round(W * H / 9000)) motas.push({ x: Math.random() * W, y: Math.random() * H, v: .1 + Math.random() * .25, f: Math.random() * 6 });
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    antorchas.forEach(([ax, ay]) => {
      const r = 70 + Math.sin(now / 120 + ax) * 4, g = ctx.createRadialGradient(ax, ay, 2, ax, ay, r);
      g.addColorStop(0, 'rgba(255,150,60,.32)'); g.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = g; ctx.fillRect(ax - r, ay - r, 2 * r, 2 * r);
    });
    motas.forEach(m => { m.y -= m.v; m.x += Math.sin(now / 900 + m.f) * .15; if (m.y < -4) { m.y = H + 4; m.x = Math.random() * W; }
      ctx.fillStyle = `rgba(255,214,120,${.25 + .2 * Math.sin(now / 400 + m.f)})`; ctx.fillRect(m.x, m.y, 2, 2); });
    ctx.restore();
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75);
    v.addColorStop(0, 'rgba(29,10,46,0)'); v.addColorStop(1, 'rgba(29,10,46,.45)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  function render(now) {
    requestAnimationFrame(render);
    if (!SIM) return;
    tick(now);
    let p = view.base, c = view.base, k = 1;
    if (view.playing && view.frames[view.i]) {
      c = view.frames[view.i]; p = view.prev;
      const dur = c.dur * BEAT / speed; k = dur > 0 ? Math.min(1, (now - view.start) / dur) : 1;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#1d0f2f'; ctx.fillRect(0, 0, SIM.w * T, SIM.h * T);
    const door = k > .5 ? c.doorOpen : p.doorOpen;
    antorchas = [];
    for (let y = 0; y < SIM.h; y++) for (let x = 0; x < SIM.w; x++) {
      const t = SIM.tiles[y][x];
      if (t === '#') drawWall(x, y, now);
      else if (t === ' ') continue;
      else if (t === 'D') drawDoor(x, y, door);
      else if (t === 'C') drawSign(x, y);
      else { drawFloor(x, y); if (t === 'S') drawExit(x, y, now); }
    }
    (k < .6 ? p.gems : c.gems).forEach(g => { if (!g.taken) drawGem(g.x, g.y, now); });
    const ek = ease(k);
    let hx = p.hx + (c.hx - p.hx) * ek, hy = p.hy + (c.hy - p.hy) * ek;
    if (c.bump) { const b = Math.sin(k * Math.PI) * .3; hx += c.bump[0] * b; hy += c.bump[1] * b; }
    const draws = [];
    c.enemies.forEach((e, i) => {
      const pe = p.enemies[i] || e;
      if (e.hp <= 0 && pe.hp <= 0) return;
      const hit = c.attack && c.attack.x === e.x && c.attack.y === e.y;
      const alpha = e.hp <= 0 ? Math.max(0, 1 - k * 1.4) : 1;
      draws.push({ y: e.y, f: () => drawEnemy(e, now, alpha, hit ? k : -1, k < .3 ? pe.hp : e.hp) });
    });
    draws.push({ y: hy + .01, f: () => drawHero(hx, hy, c.facing, now, c.attack ? k : -1) });
    draws.sort((a, b) => a.y - b.y).forEach(d => d.f());
    ambiente(now);
    if (c.attack) {
      const tx = c.attack.x * T + T / 2, ty = c.attack.y * T + T / 2, a = Math.max(0, 1 - k * 1.3);
      ctx.beginPath(); ctx.arc(tx - c.facing * 6, ty, 18, -1.2 + k * 1.5, .3 + k * 1.5);
      ctx.lineWidth = 7; ctx.strokeStyle = `rgba(36,16,43,${a})`; ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = `rgba(255,236,170,${a})`; ctx.stroke();
      ctx.font = '900 18px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = `rgba(36,16,43,${1 - k})`;
      ctx.strokeText('-1', tx + 11, ty - 14 - k * 16); ctx.fillStyle = `rgba(255,79,107,${1 - k})`; ctx.fillText('-1', tx + 11, ty - 14 - k * 16);
    }
    if (c.bump && k > .25 && k < .9) {
      const bx = hx * T + T / 2 + (c.bump[0] || 0) * 16, by = hy * T + T / 2 + (c.bump[1] || 0) * 16 - 4;
      poly(Array.from({ length: 16 }, (_, i) => { const r = i % 2 ? 6 : 13, a = i * Math.PI / 8; return [bx + Math.cos(a) * r, by + Math.sin(a) * r]; }));
      ctx.fillStyle = '#ffe14d'; ctx.fill(); ink(2);
    }
    if (c.say) drawBubble(hx, hy, c.say);
    particles = particles.filter(q => q.life > 0);
    particles.forEach(q => { q.x += q.vx; q.y += q.vy; q.vy += .22; q.life -= .012; ctx.globalAlpha = Math.max(0, q.life); ctx.fillStyle = q.c; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r += .15); ctx.fillRect(-3, -1.5, 6, 3); ctx.restore(); });
    ctx.globalAlpha = 1;
  }

  // ---------- controles ----------
  $('run').onclick = run;
  $('reset').onclick = () => { closeModal(); newPreview(); setRunning(false); errLine = 0; updateGutter(); clearLog(); log('Mapa reiniciado.', 'muted'); };
  $('restore').onclick = () => { ed.focus(); ed.select(); insertText(LEVELS[li].starter); ed.setSelectionRange(ed.value.length, ed.value.length); };
  document.querySelectorAll('#speed button').forEach(b => b.onclick = () => {
    speed = +b.dataset.s; document.querySelectorAll('#speed button').forEach(x => x.classList.toggle('on', x === b));
  });
  $('profe').checked = profe;
  $('profe').onchange = e => { profe = e.target.checked; store.set('cym_profe', profe); renderNav(); };
  let wipeArmed = false;
  $('wipe').onclick = e => {
    if (!wipeArmed) { wipeArmed = true; e.target.textContent = '¿Seguro? Pulsa otra vez para borrar'; setTimeout(() => { wipeArmed = false; e.target.textContent = 'Borrar mi progreso'; }, 4000); return; }
    LEVELS.forEach(L => store.del(codeKey(L.id))); prog = {}; store.set(ns() + 'prog', prog); wipeArmed = false; e.target.textContent = 'Borrar mi progreso'; selectLevel(0);
  };

  // ---------- nube (cuentas de alumno) ----------
  function setNube(estado) {
    const n = $('nubeEstado'); if (!n) return;
    n.className = 'nube ' + (estado === 'ok' ? 'ok' : 'mal');
    n.textContent = estado === 'ok' ? '☁ Guardado' : '⚠ Sin conexión: se guardará luego';
  }
  function renderCuenta() {
    const c = $('cuenta');
    if (!cuenta) { c.hidden = true; c.innerHTML = ''; return; }
    c.hidden = false;
    c.innerHTML = `<span>👤 <b>${esc(cuenta.alias)}</b> · ${esc(cuenta.clase)}</span><span class="nube ok" id="nubeEstado">☁ Guardado</span><button class="btn sm" id="salir">Salir</button>`;
    $('salir').onclick = () => salir(false);
    if (pendientes.length) setNube('mal');
  }
  function aplicarEstado(r) {
    const nuevo = !cuenta || cuenta.alias !== r.alias || cuenta.codigo !== r.codigo;
    cuenta = { token: r.token, alias: r.alias, clase: r.clase, codigo: r.codigo, desbloquear: !!r.desbloquear };
    store.set('cym_cuenta', cuenta);
    if (nuevo) pendientes = store.get(ns() + 'pend', []);
    const p = {}; serverCode = {};
    (r.progreso || []).forEach(x => { if (x.estrellas > 0) p[x.nivel] = x.estrellas; if (x.codigo) serverCode[x.nivel] = x.codigo; });
    // lo pendiente de enviar también cuenta
    pendientes.forEach(x => { if (x.superado) p[x.nivel] = Math.max(p[x.nivel] || 0, x.estrellas); });
    prog = p; store.set(ns() + 'prog', prog);
    renderCuenta();
  }
  let ultimoRefresco = 0;
  async function refrescar() {
    if (!cuenta) return;
    ultimoRefresco = Date.now();
    try {
      const r = await Nube.rpc('alumno_estado', { p_token: cuenta.token });
      const sinBorrador = store.get(codeKey(LEVELS[li].id), null) === null;
      aplicarEstado(r);
      if (!view.playing && sinBorrador && serverCode[LEVELS[li].id] && ed.value !== serverCode[LEVELS[li].id]) { ed.value = serverCode[LEVELS[li].id]; updateGutter(); }
      renderNav(); vaciar();
    } catch (e) {
      if (e.caducada) salir(true); else { renderCuenta(); setNube('mal'); }
    }
  }
  function enviar(nivel, superado, estrellas, codigo) {
    if (!cuenta) return;
    pendientes.push({ nivel, superado, estrellas, codigo });
    if (pendientes.length > 60) pendientes = pendientes.slice(-60);
    store.set(ns() + 'pend', pendientes);
    vaciar();
  }
  let enviando = false;
  async function vaciar() {
    if (enviando || !cuenta || !pendientes.length) return;
    enviando = true;
    try {
      while (pendientes.length && cuenta) {
        const p = pendientes[0];
        await Nube.rpc('alumno_ejecucion', { p_token: cuenta.token, p_nivel: p.nivel, p_superado: p.superado, p_estrellas: p.estrellas, p_codigo: p.codigo });
        pendientes.shift(); store.set(ns() + 'pend', pendientes);
      }
      setNube('ok');
    } catch (e) {
      if (e.caducada) salir(true); else setNube('mal');
    } finally { enviando = false; }
  }
  function salir(caducada) {
    if (cuenta && !caducada) Nube.rpc('alumno_salir', { p_token: cuenta.token }).catch(() => { });
    if (cuenta && !pendientes.length) {
      try { const pre = ns(); Object.keys(localStorage).filter(k => k.startsWith(pre)).forEach(k => localStorage.removeItem(k)); } catch (e) { }
    }
    store.del('cym_cuenta'); cuenta = null; prog = {}; serverCode = {}; pendientes = [];
    renderCuenta(); closeModal();
    mostrarEntrada(caducada ? 'Tu sesión ha caducado. Vuelve a entrar.' : '');
  }
  let modo = 'entrar';
  function ponerModo(m) {
    modo = m;
    document.querySelectorAll('#fEntrada .tabs button').forEach(b => b.classList.toggle('on', b.dataset.modo === m));
    $('eBtn').textContent = m === 'nuevo' ? 'Crear mi cuenta' : 'Entrar';
    $('ePinLbl').textContent = m === 'nuevo' ? 'Inventa un PIN (4 números) y apúntalo' : 'PIN (4 números)';
    $('eAviso').textContent = m === 'nuevo'
      ? 'Usa un alias (un mote o tu número de lista), no tu nombre completo. El profe verá tu progreso con ese alias.'
      : '¿Se te ha olvidado el PIN? Pídele al profe que te lo cambie.';
    $('eErr').textContent = '';
  }
  function mostrarEntrada(msg) {
    $('entrada').classList.remove('hidden'); $('eErr').textContent = msg || '';
    const q = new URLSearchParams(location.search).get('clase');
    if (q && !$('eClase').value) $('eClase').value = q.toUpperCase().slice(0, 6);
    ($('eClase').value ? $('eAlias') : $('eClase')).focus();
  }
  function configurarNube() {
    if (!NUBE) return;
    $('profeLbl').hidden = true; $('wipe').hidden = true; $('linkProfe').hidden = false;
    $('pieTexto').textContent = 'Tu progreso se guarda en tu cuenta de clase.';
    document.querySelectorAll('#fEntrada .tabs button').forEach(b => b.onclick = () => ponerModo(b.dataset.modo));
    $('eClase').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
    $('ePin').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });
    $('fEntrada').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = $('eBtn'); btn.disabled = true; $('eErr').textContent = '';
      try {
        const r = await Nube.rpc(modo === 'nuevo' ? 'alumno_registrar' : 'alumno_entrar',
          { p_codigo: $('eClase').value, p_alias: $('eAlias').value, p_pin: $('ePin').value });
        aplicarEstado(r);
        $('entrada').classList.add('hidden'); $('ePin').value = '';
        let i = 0; while (i + 1 < LEVELS.length && unlocked(i + 1) && prog[LEVELS[i].id]) i++;
        selectLevel(i);
        log(`¡Hola, ${cuenta.alias}! Tu progreso se guarda automáticamente.`, 'info');
        vaciar();
      } catch (err) { $('eErr').textContent = err.message; }
      finally { btn.disabled = false; }
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && cuenta && Date.now() - ultimoRefresco > 60000) refrescar(); });
    setInterval(vaciar, 30000);
    renderCuenta();
  }

  // ---------- arranque ----------
  configurarNube();
  if (!unlocked(li)) li = 0;
  selectLevel(li);
  if (NUBE) { if (cuenta) refrescar(); else mostrarEntrada(); }
  requestAnimationFrame(render);
  if (typeof loadPyodide === 'undefined') {
    $('loading').innerHTML = '<div>No se ha podido cargar Python.</div><div class="small">Revisa la conexión a internet y recarga la página.</div>';
  } else {
    loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/' }).then(p => {
      py = p;
      py.registerJsModule('juego', api);
      py.setStdout({ batched: t => api.imprimir(t) });
      py.setStderr({ batched: t => api.imprimir(t) });
      py.runPython(PRELUDE);
      $('loading').classList.add('hidden'); setRunning(false);
      log('Python listo. ¡A por ello!', 'info');
    }).catch(err => {
      $('loading').innerHTML = '<div>No se ha podido cargar Python.</div><div class="small">Revisa la conexión a internet y recarga la página.</div>';
      console.error(err);
    });
  }
})();
