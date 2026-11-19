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
  // input(): pregunta con una ventana del navegador; al «volver a donde estaba» se reutilizan las respuestas
  let colaRespuestas = [], respuestasSesion = [];
  const api = makeApi(() => SIM, { pedir: msg => {
    if (colaRespuestas.length) return colaRespuestas.shift();
    let r = null; try { r = window.prompt(msg, ''); } catch (e) { r = null; }
    if (r !== null) respuestasSesion.push(r);
    return r;
  } });
  const extra = () => JSON.stringify(SIM.vars || {});

  // ---------- utilidades ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const mundoDe = L => MUNDOS.find(m => m.id === L.mundo);
  // dentro de cada mundo los niveles se desbloquean en orden; los mundos están todos abiertos
  const unlocked = i => {
    if (profe || (cuenta && cuenta.desbloquear)) return true;
    const L = LEVELS[i], ids = mundoDe(L).ids, k = ids.indexOf(L.id);
    return k === 0 || (prog[ids[k - 1]] || 0) > 0;
  };
  const indice = id => LEVELS.findIndex(L => L.id === id);
  let vista = 'home';
  // personaje elegido (se guarda por cuenta o por navegador)
  const elegido = () => store.get(ns() + 'pj', null);

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
    if (vista !== 'juego') return;
    const m = mundoDe(LEVELS[li]);
    const c = document.createElement('span'); c.className = 'cap'; c.textContent = m.icono + ' ' + m.titulo; nav.appendChild(c);
    m.ids.forEach((id, k) => {
      const i = indice(id), L = LEVELS[i];
      const b = document.createElement('button'); const ok = unlocked(i); b.dataset.n = L.id;
      b.className = 'chip' + (i === li ? ' on' : '') + (ok ? '' : ' locked');
      const st = prog[L.id] || 0, max = L.maxLines ? 2 : 1;
      b.innerHTML = `<span class="n">${ok ? k + 1 : '🔒'}</span><span class="st">${'★'.repeat(st)}<i>${'★'.repeat(Math.max(0, max - st))}</i></span>`;
      b.title = `${k + 1}. ${L.title} · ${L.concept}`;
      b.onclick = () => { if (!ok) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; } irA('#nivel-' + L.id); };
      nav.appendChild(b);
    });
  }

  // ---------- página de inicio y rutas (#mundos, #mundo-N, #nivel-N) ----------
  let miniaturas = false;
  // ---- agente: dos aspectos de partida y un taller para personalizarlo ----
  const retratos = [...document.querySelectorAll('#elige .pj')].map(b => ({ b, quien: b.dataset.pj, arte: crearArte(b.querySelector('canvas')) }));
  const vistaPj = crearArte($('pjVista'));
  const igual = (a, b) => ['piel', 'peinado', 'pelo', 'chaqueta', 'acento', 'extra'].every(k => a[k] === b[k]);
  let refrescoMinis = null;
  function guardaAspecto(nuevo) {
    const habia = !!elegido();
    store.set(ns() + 'pj', nuevo);
    if (!habia) { renderHome(); return; }
    actualizaElige();
    // las miniaturas de los mundos se repintan cuando deja de tocar opciones
    clearTimeout(refrescoMinis); refrescoMinis = setTimeout(renderHome, 700);
  }
  retratos.forEach(r => r.b.onclick = () => guardaAspecto(aspectoDe(r.quien)));
  const FILAS = [
    ['piel', 'Piel', ASPECTO.piel.map((c, i) => [i, '', c[0]])],
    ['peinado', 'Peinado', ASPECTO.peinado.map(([v, n]) => [v, n])],
    ['pelo', 'Pelo', Object.entries(ASPECTO.pelo).map(([v, c]) => [v, '', c[0]])],
    ['chaqueta', 'Chaqueta', Object.entries(ASPECTO.chaqueta).map(([v, c]) => [v, '', c[0]])],
    ['acento', 'Color', Object.entries(ASPECTO.acento).map(([v, c]) => [v, '', c])],
    ['extra', 'Extra', ASPECTO.extra.map(([v, n]) => [v, n])]
  ];
  const taller = $('taller');
  FILAS.forEach(([clave, titulo, ops]) => {
    const fila = document.createElement('div'); fila.className = 'fila';
    fila.innerHTML = `<span class="et">${titulo}</span>`;
    const caja = document.createElement('div'); caja.className = 'ops';
    ops.forEach(([v, nombre, color]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.clave = clave; b.dataset.v = v;
      b.className = color ? 'mu' : 'op'; b.title = nombre || v;
      if (color) b.style.setProperty('--m', color); else b.textContent = nombre;
      b.onclick = () => guardaAspecto(Object.assign(aspectoDe(elegido() || 'viajera'), { [clave]: v }));
      caja.appendChild(b);
    });
    fila.appendChild(caja); taller.appendChild(fila);
  });
  function pintaRetratos(now) {
    if (vista !== 'home') return;
    const sel = elegido(), act = sel && aspectoDe(sel);
    retratos.forEach(r => r.arte.retrato(now, r.quien, dpr, act && igual(act, aspectoDe(r.quien))));
    vistaPj.retrato(now, act || 'viajera', dpr, !!act);
  }
  function actualizaElige() {
    const sel = elegido(), act = aspectoDe(sel || 'viajera');
    retratos.forEach(r => r.b.classList.toggle('on', !!sel && igual(act, aspectoDe(r.quien))));
    taller.querySelectorAll('button').forEach(b => b.classList.toggle('on', !!sel && String(act[b.dataset.clave]) === b.dataset.v));
    $('elige').classList.toggle('falta', !sel);
    $('eligeAviso').textContent = sel ? 'Este es tu agente. Cambia lo que quieras: se guarda solo.' : 'Antes de empezar, elige un agente o móntate el tuyo.';
  }
  function renderHome() {
    const sel = elegido();
    actualizaElige();
    $('mundos').classList.toggle('bloqueado', !sel);
    const cont = $('mundos'); cont.innerHTML = '';
    [1, 2].forEach(ra => {
      const t = document.createElement('div'); t.className = 'ra-titulo';
      t.innerHTML = ra === 1 ? '<b>RA1</b> Variables, tipos y operadores' : '<b>RA2</b> Bucles, condiciones y funciones';
      cont.appendChild(t);
      const rej = document.createElement('div'); rej.className = 'rejilla'; cont.appendChild(rej);
      MUNDOS.filter(m => m.ra === ra).forEach(m => {
        const hechos = m.ids.filter(id => prog[id] > 0).length;
        const est = m.ids.reduce((a, id) => a + (prog[id] || 0), 0);
        const maxEst = m.ids.reduce((a, id) => a + (LEVELS[indice(id)].maxLines ? 2 : 1), 0);
        const b = document.createElement('button'); b.className = 'mundo'; b.dataset.mundo = m.id; b.style.setProperty('--c', m.color);
        b.innerHTML = `<div class="mini"><canvas width="960" height="540"></canvas><span class="chapa">Mundo ${m.id}</span>${hechos === m.ids.length ? '<span class="hecho">✓ Completado</span>' : ''}</div>
          <div class="info"><h3>${m.icono} ${esc(m.titulo)}</h3><p class="tema">${esc(m.tema)}</p><p class="desc">${esc(m.desc)}</p>
          <div class="prog"><div class="barra"><i style="width:${Math.round(100 * hechos / m.ids.length)}%"></i></div><span>${hechos}/${m.ids.length} niveles · <b>★ ${est}/${maxEst}</b></span></div></div>`;
        b.onclick = () => irA('#mundo-' + m.id);
        rej.appendChild(b);
        // miniatura: el primer nivel del mundo dibujado con el mismo motor
        try {
          const a = crearArte(b.querySelector('canvas')), s = crearPartida(LEVELS[indice(m.ids[0])]), f = snap(s);
          a.prepara(s, 1); a.personaje(elegido() || 'viajera'); a.pinta(performance.now(), { p: f, c: f, k: 1, playing: false });
        } catch (e) { }
      });
    });
  }
  function mostrarVista(v) {
    vista = v;
    $('home').hidden = v !== 'home'; $('juego').hidden = v !== 'juego'; $('btnMundos').hidden = v !== 'juego';
    if (v === 'home') { closeModal(); renderHome(); window.scrollTo(0, 0); }
    renderNav();
  }
  function irA(h) { if (location.hash === h) ruta(); else location.hash = h; }
  function primeroPendiente(m) {
    const id = m.ids.find((id, k) => unlocked(indice(id)) && !(prog[id] > 0)) || m.ids.filter(id => unlocked(indice(id))).pop();
    return indice(id);
  }
  function ruta() {
    const h = location.hash;
    if (/^#(nivel|mundo)-/.test(h) && !elegido()) { history.replaceState(null, '', '#mundos'); mostrarVista('home'); return; }
    let m = /^#nivel-(\d+)$/.exec(h);
    if (m) {
      const i = indice(+m[1]);
      if (i < 0) return irA('#mundos');
      if (!unlocked(i)) return irA('#mundo-' + LEVELS[i].mundo);
      vista = 'juego'; if (i !== li || $('juego').hidden) selectLevel(i); mostrarVista('juego'); return;
    }
    m = /^#mundo-(\d+)$/.exec(h);
    if (m) { const mu = MUNDOS.find(x => x.id === +m[1]); if (mu) { history.replaceState(null, '', '#nivel-' + LEVELS[primeroPendiente(mu)].id); return ruta(); } }
    mostrarVista('home');
  }
  window.addEventListener('hashchange', ruta);
  $('btnMundos').onclick = () => irA('#mundos');

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
    g.push('<li>❤️ 3 vidas: cada choque quita una</li>');
    if (s.doors.length > 1) g.push(`<li>🔒 Abre las ${s.doors.length} barreras</li>`);
    const vs = Object.keys(s.vars || {});
    if (vs.length) g.push(`<li>🎲 Variables ya creadas: ${vs.map(v => '<code>' + esc(v) + '</code>').join(', ')}</li>`);
    if (L.maxLines) g.push(`<li class="reto">★ Reto: ${L.maxLines} líneas de código o menos</li>`);
    $('goals').innerHTML = g.join('');
  }
  function newPreview() {
    SIM = crearPartida(LEVELS[li]); vivo = false; $('avisoMapa').hidden = true;
    view.base = view.prev = snap(SIM); view.playing = false; view.frames = [];
    arte.prepara(SIM, dpr); arte.personaje(elegido() || 'viajera');
    renderGoals(SIM);
  }
  function selectLevel(i) {
    closeModal(); li = i; store.set('cym_lvl', i);
    const L = LEVELS[i];
    const mu = mundoDe(L);
    $('lvlNum').textContent = `${mu.icono} ${mu.titulo} · Nivel ${mu.ids.indexOf(L.id) + 1} de ${mu.ids.length}`;
    $('lvlTitle').textContent = L.title;
    $('tags').innerHTML = `<span class="tag">${esc(L.concept)}</span>` + (L.random ? '<span class="tag rnd">🎲 Cambia en cada partida</span>' : '');
    $('intro').innerHTML = L.intro; $('hint').innerHTML = L.hint; $('hintBox').open = false;
    ed.value = store.get(codeKey(L.id), serverCode[L.id] || L.starter); errLine = 0; updateGutter(); ed.scrollTop = 0;
    newPreview(); renderNav(); renderBook(); clearLog();
    log(`${L.title}: escribe tu código y pulsa Ejecutar, o da órdenes una a una en la consola.`, 'muted');
    setRunning(false);
  }

  // ---------- ejecución ----------
  function setRunning(r) { $('run').disabled = r || !py; $('replBtn').disabled = r || !py; $('run').textContent = r ? '… Ejecutando' : '▶ Ejecutar'; }
  let ejecutando = false;
  async function run() {
    if (!py || view.playing || ejecutando || (NUBE && !cuenta)) return;
    ejecutando = true; setRunning(true);
    closeModal();
    const L = LEVELS[li], code = ed.value; lastCode = code; desdeConsola = false;
    store.set(codeKey(L.id), code);
    clearLog(); errLine = 0;
    newPreview(); colaRespuestas = [];
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    let res;
    try { const fn = py.globals.get('_run'); const r = fn(code, extra()); res = r.toJs(); r.destroy(); fn.destroy(); }
    catch (e) { res = ['error', 0, 'Error', String(e && e.message || e), '{}']; }
    ejecutando = false;
    const [kind, line, name, msg, vjson] = res;
    terminar(SIM, { kind, line, name, msg, vars: leerVars(vjson) });
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
      const fn0 = py.globals.get('_vivo_nuevo'); fn0(extra()); fn0.destroy();
      vivo = true; errLine = 0; respuestasSesion = []; colaRespuestas = [];
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
    catch (e) { res = ['error', 0, 'Error', String(e && e.message || e), '{}']; }
    const [kind, , name, msg, vjson] = res;
    if (kind === 'ok') revisar(SIM, leerVars(vjson));
    const nuevos = SIM.frames.slice(desde);
    const choco = nuevos.some(f => f.bump);
    if (choco && !(SIM.over && SIM.over.type === 'fail')) nuevos.push(Object.assign({}, nuevos[nuevos.length - 1], { dur: 0, say: null, bump: null, log: { text: 'Esa orden no se ha apuntado en el editor porque te has chocado.', kind: 'muted' } }));
    if (kind === 'ok' && !choco && !(SIM.over && SIM.over.type === 'fail')) {
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

  function frameStart(f) {
    if (f.log) log(f.log.text, f.log.kind);
    if (f.bump && f.vidas > 0) aviso(f.log ? f.log.text : '¡Ay!', 'error');
    arte.evento(view.prev, f);
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
      const mu = mundoDe(L), k = mu.ids.indexOf(L.id), last = k === mu.ids.length - 1;
      const todo = mu.ids.every(id => prog[id] > 0);
      let h = `<div class="ico">${last ? '👑' : '🏆'}</div><h2>${last ? (todo ? '¡Mundo completado!' : '¡Último nivel superado!') : '¡Nivel superado!'}</h2>`;
      h += `<div class="bigstars">${'★'.repeat(stars)}<i>${'★'.repeat(max - stars)}</i></div><ul class="mlist"><li>★ Misión completada</li>`;
      if (L.maxLines) h += `<li class="${reto ? '' : 'no'}">${reto ? '★' : '☆'} Reto: ${L.maxLines} líneas o menos (tu código tiene ${n})</li>`;
      h += '</ul>';
      if (last && todo) h += `<p>Has terminado el mundo «${esc(mu.titulo)}». ¡A por el siguiente!</p>`;
      if (L.random) h += `<p class="small">Este mapa es aleatorio: ejecútalo un par de veces más para comprobar que tu código funciona siempre.</p>`;
      h += '<div class="mbtns">';
      h += last ? '<button class="btn gold" id="mNext">Elegir otro mundo 🏰</button>' : '<button class="btn gold" id="mNext">Siguiente nivel ▶</button>';
      h += '<button class="btn" id="mStay">Seguir aquí</button></div>';
      openModal(h, false);
      $('mNext').onclick = () => { closeModal(); irA(last ? '#mundos' : '#nivel-' + mu.ids[k + 1]); };
      $('mStay').onclick = closeModal;
    } else if (o.suave) {
      // el programa ha terminado (error o no ha llegado): aviso sin bloquear
      enviar(L.id, false, 0, lastCode);
      aviso(o.msg, 'error');
    } else {
      // sin vidas
      enviar(L.id, false, 0, lastCode);
      let h = `<div class="ico">💔</div><h2>¡Sin vidas!</h2><p>${esc(o.msg)}</p>`;
      if (L.random) h += '<p class="small">Recuerda: este mapa cambia en cada partida. Tu código tiene que funcionar en cualquier caso.</p>';
      h += '<div class="mbtns"><button class="btn gold" id="mRetry">Volver a intentarlo</button></div>';
      openModal(h, true);
      $('mRetry').onclick = () => { closeModal(); newPreview(); (desdeConsola ? $('replIn') : ed).focus(); };
    }
  }
  let avisoT = 0;
  function aviso(texto, tipo) {
    const a = $('avisoMapa'); a.textContent = texto; a.className = 'aviso-mapa ' + (tipo || ''); a.hidden = false;
    clearTimeout(avisoT); avisoT = setTimeout(() => { a.hidden = true; }, 6000);
  }
  function openModal(html, fail) { const b = $('mbox'); b.className = 'mbox' + (fail ? ' fail' : ''); b.innerHTML = html; $('modal').classList.remove('hidden'); }
  function closeModal() { $('modal').classList.add('hidden'); }
  $('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // ---------- dibujo (ver js/arte.js) ----------
  const arte = crearArte(cv);
  function render(now) {
    requestAnimationFrame(render);
    if (vista === 'home') { pintaRetratos(now); return; }
    if (!SIM) return;
    tick(now);
    let p = view.base, c = view.base, k = 1;
    if (view.playing && view.frames[view.i]) {
      c = view.frames[view.i]; p = view.prev;
      const dur = c.dur * BEAT / speed; k = dur > 0 ? Math.min(1, (now - view.start) / dur) : 1;
    }
    arte.pinta(now, { p, c, k, playing: view.playing });
  }

  // ---------- controles ----------
  $('run').onclick = run;
  $('reset').onclick = () => { closeModal(); newPreview(); setRunning(false); errLine = 0; updateGutter(); clearLog(); log('Mapa reiniciado.', 'muted'); };
  $('restore').onclick = () => { ed.focus(); ed.select(); insertText(LEVELS[li].starter); ed.setSelectionRange(ed.value.length, ed.value.length); };
  document.querySelectorAll('#speed button').forEach(b => b.onclick = () => {
    speed = +b.dataset.s; document.querySelectorAll('#speed button').forEach(x => x.classList.toggle('on', x === b));
  });
  $('profe').checked = profe;
  $('profe').onchange = e => { profe = e.target.checked; store.set('cym_profe', profe); renderNav(); if (vista === 'home') renderHome(); };
  let wipeArmed = false;
  $('wipe').onclick = e => {
    if (!wipeArmed) { wipeArmed = true; e.target.textContent = '¿Seguro? Pulsa otra vez para borrar'; setTimeout(() => { wipeArmed = false; e.target.textContent = 'Borrar mi progreso'; }, 4000); return; }
    LEVELS.forEach(L => store.del(codeKey(L.id))); prog = {}; store.set(ns() + 'prog', prog); wipeArmed = false; e.target.textContent = 'Borrar mi progreso'; irA('#mundos');
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
      renderNav(); if (vista === 'home') renderHome(); vaciar();
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
        irA('#mundos');
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
  ruta();
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
