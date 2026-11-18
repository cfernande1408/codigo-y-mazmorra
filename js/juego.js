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
    view.base = view.prev = snap(SIM); view.playing = false; view.frames = []; particles = [];
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

  // ---------- dibujo ----------
  function tileAt(x, y) { return (x < 0 || y < 0 || x >= SIM.w || y >= SIM.h) ? '#' : SIM.tiles[y][x]; }
  function drawFloor(x, y) {
    const px = x * T, py = y * T, v = hash(x, y);
    ctx.fillStyle = v < .33 ? '#4a4049' : v < .66 ? '#463c45' : '#4d434d'; ctx.fillRect(px, py, T, T);
    ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1; ctx.beginPath();
    const o = (y % 2) ? 16 : 32;
    ctx.moveTo(px, py + 24.5); ctx.lineTo(px + T, py + 24.5);
    ctx.moveTo(px + o + .5, py); ctx.lineTo(px + o + .5, py + 24);
    ctx.moveTo(px + (o + 24) % T + .5, py + 24); ctx.lineTo(px + (o + 24) % T + .5, py + T);
    ctx.moveTo(px, py + .5); ctx.lineTo(px + T, py + .5);
    ctx.stroke();
    if (v > .86) { ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.moveTo(px + 10, py + 32); ctx.lineTo(px + 16, py + 36); ctx.lineTo(px + 14, py + 42); ctx.stroke(); }
    const up = tileAt(x, y - 1);
    if (up === '#' || up === 'C') { const g = ctx.createLinearGradient(0, py, 0, py + 14); g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(px, py, T, 14); }
  }
  function drawWall(x, y) {
    const px = x * T, py = y * T, below = tileAt(x, y + 1), front = below !== '#' && below !== ' ';
    const topH = front ? T - 18 : T;
    ctx.fillStyle = '#1c1723'; ctx.fillRect(px, py, T, topH);
    ctx.fillStyle = 'rgba(255,255,255,.025)'; ctx.fillRect(px + 3, py + 3, T - 6, topH - 6);
    if (hash(x + 7, y) > .7) { ctx.fillStyle = 'rgba(255,255,255,.03)'; ctx.fillRect(px + 8 + hash(x, y + 3) * 20, py + 8 + hash(x + 2, y) * 10, 8, 6); }
    if (front) {
      ctx.fillStyle = '#3b3247'; ctx.fillRect(px, py + topH, T, 18);
      ctx.fillStyle = '#6a5d7a'; ctx.fillRect(px, py + topH, T, 2);
      ctx.strokeStyle = '#272030'; ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(px, py + topH + 9.5); ctx.lineTo(px + T, py + topH + 9.5);
      const o = (x % 2) ? 12 : 28; ctx.moveTo(px + o + .5, py + topH + 2); ctx.lineTo(px + o + .5, py + topH + 9);
      ctx.moveTo(px + (o + 20) % T + .5, py + topH + 10); ctx.lineTo(px + (o + 20) % T + .5, py + T);
      ctx.stroke();
    }
  }
  function drawExit(x, y, now) {
    const px = x * T, py = y * T, cx = px + T / 2, cy = py + T / 2, pulse = .75 + Math.sin(now / 400) * .25;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, T * .62);
    g.addColorStop(0, `rgba(200,140,255,${.85 * pulse})`); g.addColorStop(.55, `rgba(120,60,220,${.35 * pulse})`); g.addColorStop(1, 'rgba(80,30,160,0)');
    ctx.fillStyle = g; ctx.fillRect(px - 8, py - 8, T + 16, T + 16);
    ctx.fillStyle = '#120c1c'; rr(px + 10, py + 10, T - 20, T - 20, 7); ctx.fill();
    for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgba(185,140,255,${.12 + i * .14})`; ctx.fillRect(px + 13, py + 13 + i * 6, T - 26, 3); }
    for (let i = 0; i < 8; i++) { const a = now / 650 + i * Math.PI / 4; ctx.fillStyle = '#dcc0ff'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 19, cy + Math.sin(a) * 19, 1.8, 0, 7); ctx.fill(); }
  }
  function drawGem(x, y, now) {
    const cx = x * T + T / 2, cy = y * T + T / 2 + Math.sin(now / 350 + x + y) * 2;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(cx, y * T + T / 2 + 14, 8, 3, 0, 0, 7); ctx.fill();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20); g.addColorStop(0, 'rgba(94,231,240,.35)'); g.addColorStop(1, 'rgba(94,231,240,0)'); ctx.fillStyle = g; ctx.fillRect(cx - 20, cy - 20, 40, 40);
    const P = [[0, -12], [10, -3], [0, 11], [-10, -3]];
    ctx.beginPath(); P.forEach(([a, b], i) => i ? ctx.lineTo(cx + a, cy + b) : ctx.moveTo(cx + a, cy + b)); ctx.closePath();
    ctx.fillStyle = '#2bb6d6'; ctx.fill(); ctx.strokeStyle = '#0e5f73'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#7ff0f7'; ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx + 10, cy - 3); ctx.lineTo(cx, cy - 1); ctx.lineTo(cx - 10, cy - 3); ctx.closePath(); ctx.fill();
    if ((now / 900 + x) % 3 < .4) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx - 4, cy - 6, 1.8, 0, 7); ctx.fill(); }
  }
  function drawDoor(x, y, open) {
    const px = x * T, py = y * T;
    ctx.fillStyle = '#1c1723'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = '#3b3247'; ctx.fillRect(px, py, 6, T); ctx.fillRect(px + T - 6, py, 6, T);
    if (open) { ctx.fillStyle = '#120f16'; ctx.fillRect(px + 6, py, T - 12, T); ctx.fillStyle = '#7a4b2a'; ctx.fillRect(px + 6, py, 6, T); return; }
    ctx.fillStyle = '#7a4b2a'; ctx.fillRect(px + 6, py, T - 12, T);
    ctx.strokeStyle = '#4f2f19'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 1; i < 4; i++) { ctx.moveTo(px + 6 + i * 9, py); ctx.lineTo(px + 6 + i * 9, py + T); } ctx.stroke();
    ctx.fillStyle = '#6b6b78'; ctx.fillRect(px + 6, py + 10, T - 12, 4); ctx.fillRect(px + 6, py + T - 14, T - 12, 4);
    ctx.strokeStyle = '#f2b544'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px + T / 2 + 9, py + T / 2, 4, 0, 7); ctx.stroke();
    ctx.fillStyle = '#b98cff'; ctx.font = 'bold 14px Nunito'; ctx.textAlign = 'center'; ctx.fillText('✦', px + T / 2 - 4, py + T / 2 + 5);
  }
  function drawSign(x, y) {
    const px = x * T, py = y * T; drawFloor(x, y);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(px + T / 2, py + T - 8, 12, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(px + T / 2 - 3, py + 22, 6, 20);
    ctx.fillStyle = '#b07a43'; rr(px + 7, py + 8, T - 14, 20, 4); ctx.fill(); ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(60,35,15,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 13, py + 15); ctx.lineTo(px + T - 13, py + 15); ctx.moveTo(px + 13, py + 21); ctx.lineTo(px + T - 20, py + 21); ctx.stroke();
  }
  function drawEnemy(e, now, alpha, hitK, hpShown) {
    let cx = e.x * T + T / 2, cy = e.y * T + T / 2 + 2;
    const wob = Math.sin(now / 300 + e.x * 1.7) * 1.4;
    if (hitK >= 0 && hitK < .5) cx += Math.sin(hitK * 45) * 3;
    ctx.save(); ctx.globalAlpha = alpha;
    if (alpha < 1) { ctx.translate(cx, cy + 14); ctx.scale(1 + (1 - alpha) * .3, alpha); ctx.translate(-cx, -cy - 14); }
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(cx, cy + 15, 15, 4.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8dcc0';
    ctx.beginPath(); ctx.moveTo(cx - 12, cy - 12 + wob); ctx.lineTo(cx - 16, cy - 24 + wob); ctx.lineTo(cx - 6, cy - 16 + wob); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 12, cy - 12 + wob); ctx.lineTo(cx + 16, cy - 24 + wob); ctx.lineTo(cx + 6, cy - 16 + wob); ctx.fill();
    const body = () => {
      ctx.beginPath(); ctx.moveTo(cx - 17, cy + 14);
      ctx.bezierCurveTo(cx - 21, cy - 6 + wob, cx - 12, cy - 19 + wob, cx, cy - 19 + wob);
      ctx.bezierCurveTo(cx + 12, cy - 19 + wob, cx + 21, cy - 6 + wob, cx + 17, cy + 14);
      ctx.quadraticCurveTo(cx + 11, cy + 18, cx + 6, cy + 14); ctx.quadraticCurveTo(cx, cy + 18, cx - 6, cy + 14); ctx.quadraticCurveTo(cx - 11, cy + 18, cx - 17, cy + 14);
      ctx.closePath();
    };
    body();
    const g = ctx.createLinearGradient(0, cy - 19, 0, cy + 16); g.addColorStop(0, `hsl(${e.hue},60%,58%)`); g.addColorStop(1, `hsl(${e.hue},55%,36%)`);
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = `hsl(${e.hue},50%,22%)`; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(cx - 6, cy - 4 + wob, 4.5, 5, 0, 0, 7); ctx.ellipse(cx + 6, cy - 4 + wob, 4.5, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(cx - 6 + Math.sin(now / 900) * 1.2, cy - 3 + wob, 2.2, 0, 7); ctx.arc(cx + 6 + Math.sin(now / 900) * 1.2, cy - 3 + wob, 2.2, 0, 7); ctx.fill();
    ctx.strokeStyle = `hsl(${e.hue},50%,18%)`; ctx.lineWidth = 2.2; ctx.beginPath();
    ctx.moveTo(cx - 11, cy - 11 + wob); ctx.lineTo(cx - 3, cy - 8 + wob); ctx.moveTo(cx + 11, cy - 11 + wob); ctx.lineTo(cx + 3, cy - 8 + wob); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 5, cy + 7 + wob); ctx.quadraticCurveTo(cx, cy + 4 + wob, cx + 5, cy + 7 + wob); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(cx + 1, cy + 5 + wob, 2.5, 3);
    if (hitK >= 0 && hitK < .3) { body(); ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.fill(); }
    ctx.restore();
    if (alpha > .3) {
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.font = '800 11px Nunito'; ctx.textAlign = 'center';
      const tw = ctx.measureText(e.name).width + 10, ty = e.y * T - 9;
      ctx.fillStyle = 'rgba(10,8,14,.78)'; rr(cx - tw / 2, ty - 10, tw, 15, 7); ctx.fill();
      ctx.fillStyle = '#ffd7d7'; ctx.fillText(e.name, cx, ty + 1);
      for (let i = 0; i < e.max; i++) { ctx.fillStyle = i < hpShown ? '#ff5d6c' : '#4a3f58'; rr(cx - e.max * 4.5 + i * 9 + 1, ty + 7, 7, 4, 2); ctx.fill(); }
      ctx.restore();
    }
  }
  function drawHero(x, y, facing, now, atkK) {
    const cx = x * T + T / 2, cy = y * T + T / 2 + 4, bob = Math.sin(now / 260) * 1.2;
    ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.beginPath(); ctx.ellipse(cx, cy + 14, 13, 4.5, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(cx, cy + bob); ctx.scale(facing, 1);
    ctx.fillStyle = '#b8323f'; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-14, 11); ctx.lineTo(2, 11); ctx.lineTo(4, -8); ctx.fill();
    ctx.fillStyle = '#3a2d22'; ctx.fillRect(-7, 6, 5, 8); ctx.fillRect(2, 6, 5, 8);
    ctx.fillStyle = '#2f9e8f'; rr(-9, -8, 18, 16, 5); ctx.fill();
    ctx.fillStyle = '#6b4423'; ctx.fillRect(-9, 2, 18, 3); ctx.fillStyle = '#f2b544'; ctx.fillRect(-2, 1.5, 4, 4);
    ctx.fillStyle = '#8a5a2b'; ctx.beginPath(); ctx.arc(-10, 1, 6, 0, 7); ctx.fill(); ctx.strokeStyle = '#d6aa55'; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); ctx.translate(8, 0);
    const sw = atkK >= 0 ? (atkK < .45 ? -1.7 + atkK * 6 : 1 - (atkK - .45) * 1.2) : .45; ctx.rotate(sw);
    ctx.fillStyle = '#e3e9f0'; ctx.fillRect(2, -1.5, 17, 3); ctx.beginPath(); ctx.moveTo(19, -1.5); ctx.lineTo(23, 0); ctx.lineTo(19, 1.5); ctx.fill();
    ctx.fillStyle = '#f2b544'; ctx.fillRect(0, -5, 3, 10); ctx.fillStyle = '#f1c27d'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#f1c27d'; ctx.beginPath(); ctx.arc(0, -16, 8.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#b9c3cd'; ctx.beginPath(); ctx.arc(0, -17, 9.5, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#8f9aa6'; ctx.fillRect(-10, -18, 20, 3);
    ctx.fillStyle = '#e8505b'; ctx.beginPath(); ctx.moveTo(-1, -26); ctx.quadraticCurveTo(-12, -32, -16, -20); ctx.quadraticCurveTo(-10, -26, -3, -22); ctx.fill();
    ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(4, -13.5, 1.6, 0, 7); ctx.fill();
    ctx.strokeStyle = '#9a6b45'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(2, -9.5); ctx.lineTo(6, -9.5); ctx.stroke();
    ctx.restore();
  }
  function drawBubble(x, y, text) {
    ctx.font = '800 13px Nunito'; ctx.textAlign = 'center';
    let t = String(text); if (t.length > 34) t = t.slice(0, 33) + '…';
    const w = ctx.measureText(t).width + 18, h = 24, W = SIM.w * T;
    let bx = x * T + T / 2 - w / 2; bx = Math.max(4, Math.min(W - w - 4, bx));
    const by = Math.max(2, y * T - 30);
    ctx.fillStyle = '#fffaf0'; rr(bx, by, w, h, 9); ctx.fill(); ctx.strokeStyle = '#2a2038'; ctx.lineWidth = 2; ctx.stroke();
    const tx = x * T + T / 2; ctx.beginPath(); ctx.moveTo(tx - 5, by + h - 1); ctx.lineTo(tx, by + h + 6); ctx.lineTo(tx + 5, by + h - 1); ctx.fillStyle = '#fffaf0'; ctx.fill();
    ctx.fillStyle = '#2a2038'; ctx.fillText(t, bx + w / 2, by + 16.5);
  }
  function confetti(x, y) {
    const cols = ['#f2b544', '#3fd1b5', '#b98cff', '#ff6b6b', '#5ee7f0'];
    for (let i = 0; i < 70; i++) particles.push({ x: x * T + T / 2, y: y * T + T / 2, vx: (Math.random() - .5) * 7, vy: -Math.random() * 7 - 2, c: cols[i % 5], life: 1, r: Math.random() * 6 });
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
    ctx.fillStyle = '#0d0b11'; ctx.fillRect(0, 0, SIM.w * T, SIM.h * T);
    const door = k > .5 ? c.doorOpen : p.doorOpen;
    for (let y = 0; y < SIM.h; y++) for (let x = 0; x < SIM.w; x++) {
      const t = SIM.tiles[y][x];
      if (t === '#') drawWall(x, y);
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
    if (c.attack) {
      const tx = c.attack.x * T + T / 2, ty = c.attack.y * T + T / 2;
      ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, 1 - k * 1.3)})`; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(tx - c.facing * 6, ty, 17, -1.2 + k * 1.5, .3 + k * 1.5); ctx.stroke();
      ctx.fillStyle = `rgba(255,93,108,${1 - k})`; ctx.font = '800 16px Nunito'; ctx.textAlign = 'center'; ctx.fillText('-1', tx + 10, ty - 14 - k * 16);
    }
    if (c.bump && k > .3 && k < .9) { ctx.font = '18px Nunito'; ctx.textAlign = 'center'; ctx.fillText('💫', hx * T + T / 2, hy * T + 4); }
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
