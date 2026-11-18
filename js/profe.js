(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ses = {
    get() { try { return sessionStorage.getItem('cym_profe_token'); } catch (e) { return null; } },
    set(v) { try { v ? sessionStorage.setItem('cym_profe_token', v) : sessionStorage.removeItem('cym_profe_token'); } catch (e) { } }
  };
  const N = LEVELS.length;
  const mundoDe = L => MUNDOS.find(m => m.id === L.mundo);
  let token = ses.get(), clases = [], actual = null, alumnos = [], timer = 0;

  if (!Nube.activa) {
    $('entrada').innerHTML = `<div class="ebox"><h3>Falta configurar Supabase</h3><p class="aviso" style="font-size:14px">Rellena <code>js/config.js</code> con la URL y la clave de tu proyecto de Supabase. Los pasos están en el README del repositorio.</p></div>`;
    return;
  }

  // ---------- utilidades ----------
  function hace(iso) {
    if (!iso) return '—';
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 90) return 'ahora';
    if (s < 3600) return `hace ${Math.round(s / 60)} min`;
    if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
    if (s < 86400 * 7) return `hace ${Math.round(s / 86400)} d`;
    return new Date(iso).toLocaleDateString('es-ES');
  }
  const fecha = iso => iso ? new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  function modal(html, ancho) { const b = $('mbox'); b.className = 'mbox' + (ancho ? ' ancho' : ''); b.innerHTML = html; $('modal').classList.remove('hidden'); }
  function cerrar() { $('modal').classList.add('hidden'); }
  $('modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.dataset.cerrar !== undefined) cerrar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });

  async function rpc(fn, args) {
    try { return await Nube.rpc(fn, Object.assign({ p_token: token }, args)); }
    catch (e) { if (e.caducada) { salir(e.message); } throw e; }
  }
  function aviso(msg) { modal(`<div class="ico">⚠️</div><p>${esc(msg)}</p><div class="mbtns"><button class="btn" data-cerrar>Vale</button></div>`); }

  // ---------- sesión ----------
  $('fProfe').addEventListener('submit', async e => {
    e.preventDefault(); $('eBtn').disabled = true; $('eErr').textContent = '';
    try {
      const r = await Nube.rpc('profe_entrar', { p_clave: $('eClave').value });
      token = r.token; ses.set(token); $('eClave').value = ''; await arrancar();
    } catch (err) { $('eErr').textContent = err.message; }
    finally { $('eBtn').disabled = false; }
  });
  function salir(msg) {
    if (token && !msg) Nube.rpc('profe_salir', { p_token: token }).catch(() => { });
    token = null; ses.set(null); clearInterval(timer);
    $('panel').hidden = true; $('salir').hidden = true; $('entrada').classList.remove('hidden');
    $('eErr').textContent = msg || ''; cerrar();
  }
  $('salir').onclick = () => salir();

  async function arrancar() {
    await cargarClases();
    $('entrada').classList.add('hidden'); $('panel').hidden = false; $('salir').hidden = false;
    const guardada = (() => { try { return localStorage.getItem('cym_profe_clase'); } catch (e) { return null; } })();
    const c = clases.find(x => x.id === guardada) || clases[0];
    if (c) await abrir(c.id); else pintarDetalle();
    clearInterval(timer);
    timer = setInterval(() => { if (!document.hidden && actual) cargarDetalle(); }, 30000);
  }

  // ---------- clases ----------
  async function cargarClases() { clases = await rpc('profe_clases') || []; pintarClases(); }
  function pintarClases() {
    $('clases').innerHTML = clases.length ? '' : '<p class="small">Aún no hay clases. Crea la primera aquí abajo.</p>';
    clases.forEach(c => {
      const b = document.createElement('button');
      b.className = 'clase-btn' + (actual && actual.id === c.id ? ' on' : '');
      b.innerHTML = `<b>${esc(c.nombre)}</b><small>${esc(c.codigo)} · ${c.alumnos} alumno${c.alumnos === 1 ? '' : 's'}</small>`;
      b.onclick = () => abrir(c.id);
      $('clases').appendChild(b);
    });
  }
  $('fNueva').addEventListener('submit', async e => {
    e.preventDefault();
    const n = $('nNombre').value.trim(); if (!n) { $('nNombre').focus(); return; }
    try { const c = await rpc('profe_crear_clase', { p_nombre: n }); $('nNombre').value = ''; clases.push(c); await abrir(c.id); }
    catch (err) { aviso(err.message); }
  });
  async function abrir(id) {
    actual = clases.find(c => c.id === id) || null;
    try { localStorage.setItem('cym_profe_clase', id); } catch (e) { }
    pintarClases(); alumnos = [];
    pintarDetalle(); await cargarDetalle();
  }
  async function cargarDetalle() {
    if (!actual) return;
    try {
      alumnos = await rpc('profe_detalle', { p_clase: actual.id }) || [];
      const c = clases.find(x => x.id === actual.id); if (c && c.alumnos !== alumnos.length) { c.alumnos = alumnos.length; pintarClases(); }
      pintarDetalle();
    } catch (err) { if (!err.caducada) { const t = $('estadoCarga'); if (t) t.textContent = '⚠ ' + err.message; } }
  }

  // ---------- detalle de clase ----------
  function enlaceClase() { return new URL('./?clase=' + actual.codigo, location.href).href; }
  function pintarDetalle() {
    const d = $('detalle');
    if (!actual) { d.innerHTML = '<div class="vacio">Crea una clase para empezar. Cada clase tiene un código que tus alumnos usarán para entrar en el juego.</div>'; return; }
    const filas = alumnos.map(a => {
      const p = {}; a.progreso.forEach(x => p[x.nivel] = x);
      const total = a.progreso.reduce((s, x) => s + x.estrellas, 0);
      const superados = a.progreso.filter(x => x.estrellas > 0).length;
      const celdas = LEVELS.map(L => {
        const x = p[L.id];
        if (!x) return '<td><span class="celda nada">·</span></td>';
        if (x.estrellas > 0) return `<td><button class="celda si" data-al="${a.id}" data-n="${L.id}" title="${x.intentos} intento(s)">${'★'.repeat(x.estrellas)}</button></td>`;
        return `<td><button class="celda no" data-al="${a.id}" data-n="${L.id}" title="Sin superar">✗ ${x.intentos}</button></td>`;
      }).join('');
      return `<tr><td class="al">${esc(a.alias)}${a.bloqueado ? ' 🔒' : ''}<small>${hace(a.ultima)}</small></td>
        <td><b>${superados}</b>/${N}</td><td style="color:var(--gold)">${total}★</td>${celdas}
        <td><button class="btn sm" data-pin="${a.id}" title="Cambiar PIN">🔑</button> <button class="btn sm" data-borrar="${a.id}" title="Borrar alumno">🗑</button></td></tr>`;
    }).join('');

    // estadísticas
    const n = alumnos.length;
    const media = n ? (alumnos.reduce((s, a) => s + a.progreso.filter(x => x.estrellas > 0).length, 0) / n) : 0;
    let atasco = null;
    LEVELS.forEach(L => {
      const atascados = alumnos.filter(a => a.progreso.some(x => x.nivel === L.id && x.estrellas === 0)).length;
      if (atascados && (!atasco || atascados > atasco.n)) atasco = { L, n: atascados };
    });
    const activos = alumnos.filter(a => Date.now() - new Date(a.ultima).getTime() < 15 * 60000).length;

    d.innerHTML = `
      <div class="cab">
        <div><div class="lvl-num">Clase</div><h2>${esc(actual.nombre)}</h2></div>
        <div style="text-align:right"><div class="lvl-num">Código para los alumnos</div><span class="codigo-grande">${esc(actual.codigo)}</span></div>
      </div>
      <div class="acciones" style="margin-bottom:14px">
        <button class="btn sm" id="copiar">🔗 Copiar enlace para la clase</button>
        <label class="switch"><input type="checkbox" id="desb" ${actual.desbloquear ? 'checked' : ''}> Desbloquear todos los niveles</label>
        <span style="flex:1"></span>
        <button class="btn sm" id="refrescar">↻ Actualizar</button>
        <button class="btn sm" id="csv">⬇ Descargar CSV</button>
        <button class="btn sm" id="borrarClase">Borrar clase</button>
      </div>
      <div class="stats">
        <div class="stat"><b>${n}</b><span>alumnos</span></div>
        <div class="stat"><b>${activos}</b><span>activos ahora (15 min)</span></div>
        <div class="stat"><b>${media.toFixed(1)}</b><span>niveles superados de media</span></div>
        <div class="stat"><b>${atasco ? 'Nivel ' + atasco.L.id : '—'}</b><span>${atasco ? `${atasco.n} atascado${atasco.n > 1 ? 's' : ''} · ${esc(mundoDe(atasco.L).titulo)} · ${esc(atasco.L.concept)}` : 'nadie atascado'}</span></div>
      </div>
      ${n ? `<div class="tabla-wrap"><table class="notas"><thead>
        <tr><th colspan="3"></th>${MUNDOS.map(m => `<th colspan="${m.ids.length}" class="grupo" style="--c:${m.color}" title="${esc(m.tema)}">${m.icono} ${esc(m.titulo)}</th>`).join('')}<th></th></tr>
        <tr><th style="text-align:left">Alumno</th><th>Niveles</th><th>Estrellas</th>
        ${LEVELS.map(L => `<th class="n" title="Nivel ${L.id}: ${esc(L.title)} · ${esc(L.concept)}">${mundoDe(L).ids.indexOf(L.id) + 1}</th>`).join('')}<th></th></tr></thead><tbody>${filas}</tbody></table></div>`
        : `<div class="vacio">Todavía no se ha apuntado nadie.<br>Diles que entren en <b>${esc(enlaceClase())}</b><br>o que pongan el código <b>${esc(actual.codigo)}</b> y elijan «Soy nuevo».</div>`}
      <p class="small" id="estadoCarga" style="margin-top:10px">★ superado · ✗ n = intentos sin superarlo · pulsa una casilla para ver el código. Se actualiza solo cada 30 s.</p>`;

    $('copiar').onclick = async e => {
      try { await navigator.clipboard.writeText(enlaceClase()); e.target.textContent = '✓ Enlace copiado'; }
      catch (err) { modal(`<p>Enlace para la clase:</p><pre>${esc(enlaceClase())}</pre><div class="mbtns"><button class="btn" data-cerrar>Cerrar</button></div>`); }
    };
    $('desb').onchange = async e => {
      try { await rpc('profe_desbloquear', { p_clase: actual.id, p_valor: e.target.checked }); actual.desbloquear = e.target.checked; }
      catch (err) { e.target.checked = !e.target.checked; aviso(err.message); }
    };
    $('refrescar').onclick = cargarDetalle;
    $('csv').onclick = descargarCSV;
    $('borrarClase').onclick = () => {
      modal(`<div class="ico">🗑</div><h2>¿Borrar «${esc(actual.nombre)}»?</h2><p>Se borrarán también sus ${n} alumnos y todo su progreso. No se puede deshacer.</p>
        <div class="mbtns"><button class="btn" data-cerrar>Cancelar</button><button class="btn gold" id="okBorrar">Borrar clase</button></div>`);
      $('okBorrar').onclick = async () => {
        try { await rpc('profe_borrar_clase', { p_clase: actual.id }); cerrar(); actual = null; await cargarClases(); if (clases[0]) abrir(clases[0].id); else pintarDetalle(); }
        catch (err) { aviso(err.message); }
      };
    };
    d.querySelectorAll('[data-al]').forEach(b => b.onclick = () => verCodigo(b.dataset.al, +b.dataset.n));
    d.querySelectorAll('[data-pin]').forEach(b => b.onclick = () => cambiarPin(b.dataset.pin));
    d.querySelectorAll('[data-borrar]').forEach(b => b.onclick = () => borrarAlumno(b.dataset.borrar));
  }

  async function verCodigo(idAl, nivel) {
    try {
      const r = await rpc('profe_codigo', { p_alumno: idAl, p_nivel: nivel });
      if (!r) return;
      const L = LEVELS.find(x => x.id === nivel);
      let h = `<h2 style="text-align:left">${esc(r.alias)} · Nivel ${nivel}</h2>
        <p class="small">${esc(mundoDe(L).titulo)} · ${esc(L.title)} · ${esc(L.concept)} — ${r.intentos} intento(s) · última ejecución ${fecha(r.actualizado)}${r.superado ? ' · superado el ' + fecha(r.superado) : ''}</p>`;
      if (r.solucion) h += `<h4>${'★'.repeat(r.estrellas)} Mejor solución</h4><pre>${esc(r.solucion)}</pre>`;
      if (r.codigo !== r.solucion) h += `<h4>Último código ejecutado</h4><pre>${esc(r.codigo || '(vacío)')}</pre>`;
      h += '<div class="mbtns" style="margin-top:14px"><button class="btn" data-cerrar>Cerrar</button></div>';
      modal(h, true);
    } catch (err) { if (!err.caducada) aviso(err.message); }
  }
  function cambiarPin(idAl) {
    const a = alumnos.find(x => x.id === idAl);
    modal(`<div class="ico">🔑</div><h2>PIN de ${esc(a.alias)}</h2><p>Escribe un PIN nuevo de 4 números y díselo al alumno.</p>
      <label class="campo"><input id="nuevoPin" inputmode="numeric" maxlength="4" style="text-align:center;letter-spacing:8px;font-size:24px"></label>
      <p class="err-msg" id="pinErr"></p>
      <div class="mbtns"><button class="btn" data-cerrar>Cancelar</button><button class="btn gold" id="okPin">Guardar PIN</button></div>`);
    const inp = $('nuevoPin'); inp.value = String(Math.floor(Math.random() * 10000)).padStart(4, '0'); inp.select();
    $('okPin').onclick = async () => {
      try { await rpc('profe_cambiar_pin', { p_alumno: idAl, p_pin: inp.value }); cerrar(); cargarDetalle(); }
      catch (err) { $('pinErr').textContent = err.message; }
    };
  }
  function borrarAlumno(idAl) {
    const a = alumnos.find(x => x.id === idAl);
    modal(`<div class="ico">🗑</div><h2>¿Borrar a ${esc(a.alias)}?</h2><p>Se borrará su cuenta y todo su progreso.</p>
      <div class="mbtns"><button class="btn" data-cerrar>Cancelar</button><button class="btn gold" id="okBorrarAl">Borrar</button></div>`);
    $('okBorrarAl').onclick = async () => {
      try { await rpc('profe_borrar_alumno', { p_alumno: idAl }); cerrar(); cargarDetalle(); }
      catch (err) { aviso(err.message); }
    };
  }
  function descargarCSV() {
    const q = v => '"' + String(v).replace(/"/g, '""') + '"';
    const cab = ['Alumno', 'Última conexión', 'Niveles superados', 'Estrellas', ...LEVELS.flatMap(L => [`N${L.id} estrellas`, `N${L.id} intentos`])];
    const filas = alumnos.map(a => {
      const p = {}; a.progreso.forEach(x => p[x.nivel] = x);
      return [a.alias, fecha(a.ultima), a.progreso.filter(x => x.estrellas > 0).length, a.progreso.reduce((s, x) => s + x.estrellas, 0),
        ...LEVELS.flatMap(L => p[L.id] ? [p[L.id].estrellas, p[L.id].intentos] : ['', ''])];
    });
    const csv = '﻿' + [cab, ...filas].map(r => r.map(q).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `codigo-y-mazmorra_${actual.nombre.replace(/[^\wáéíóúñ-]+/gi, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  // ---------- inicio ----------
  if (token) arrancar().catch(e => { if (!e.caducada) $('eErr').textContent = e.message; }); else $('eClave').focus();
})();
