// Pruebas de la base de datos (supabase/schema.sql) contra un Postgres local.
// Preparación (una vez), imitando a Supabase:
//   createdb cym
//   psql -d cym -c "create role anon nologin; create role authenticated nologin;
//     create schema extensions; grant usage on schema extensions, public to anon, authenticated;"
//   sed "s/'cambia-esta-clave'/'profe-secreta-123'/" ../supabase/schema.sql | psql -d cym
//   PGURL=postgres://postgres@localhost:5432/cym npm run test:db
const assert = require('assert');
const { rpc, pool } = require('./mock-supabase');

const ok = (name) => console.log('  ✓ ' + name);
async function falla(p, re) { try { await p; } catch (e) { assert.match(e.message, re); return; } assert.fail('debía fallar'); }

(async () => {
  console.log('Base de datos');
  // seguridad: anon no ve tablas ni funciones internas
  const c = await pool.connect();
  try {
    await c.query('begin'); await c.query('set local role anon');
    await falla(c.query('select * from public.alumnos'), /permission denied/);
    await c.query('rollback'); await c.query('begin'); await c.query('set local role anon');
    await falla(c.query("select public._alumno(gen_random_uuid())"), /permission denied/);
    await c.query('rollback');
  } finally { c.release(); }
  ok('anon no puede leer tablas ni llamar funciones internas');
  await falla(rpc('_profe', { p_token: 'x' }), /Could not find/);

  assert.ok((await rpc('profe_entrar', { p_clave: 'mal' })).error);
  const { token: pt } = await rpc('profe_entrar', { p_clave: 'profe-secreta-123' });
  assert.ok(pt); ok('login de profesor');

  const clase = await rpc('profe_crear_clase', { p_token: pt, p_nombre: '2º SMR B' });
  assert.match(clase.codigo, /^[A-HJ-NP-Z2-9]{6}$/); ok('crear clase → código ' + clase.codigo);
  await falla(rpc('profe_clases', { p_token: '00000000-0000-0000-0000-000000000000' }), /caducado/);
  ok('token de profesor falso rechazado');

  assert.ok((await rpc('alumno_registrar', { p_codigo: 'NOPE00', p_alias: 'Ana', p_pin: '1234' })).error);
  assert.ok((await rpc('alumno_registrar', { p_codigo: clase.codigo, p_alias: 'A', p_pin: '1234' })).error);
  assert.ok((await rpc('alumno_registrar', { p_codigo: clase.codigo, p_alias: 'Ana', p_pin: '12a4' })).error);
  const ana = await rpc('alumno_registrar', { p_codigo: clase.codigo.toLowerCase(), p_alias: '  Ana  ', p_pin: '1234' });
  assert.equal(ana.alias, 'Ana'); assert.ok(ana.token); assert.deepEqual(ana.progreso, []);
  assert.match((await rpc('alumno_registrar', { p_codigo: clase.codigo, p_alias: 'ana', p_pin: '9999' })).error, /ya existe/);
  ok('registro de alumno con validaciones y alias único sin mayúsculas');

  assert.match((await rpc('alumno_entrar', { p_codigo: clase.codigo, p_alias: 'ANA', p_pin: '0000' })).error, /PIN incorrecto/);
  const ana2 = await rpc('alumno_entrar', { p_codigo: clase.codigo, p_alias: 'ANA', p_pin: '1234' });
  assert.ok(ana2.token && ana2.token !== ana.token); ok('entrar con alias en otras mayúsculas');

  await rpc('alumno_ejecucion', { p_token: ana.token, p_nivel: 1, p_superado: false, p_estrellas: 0, p_codigo: 'arriba()' });
  await rpc('alumno_ejecucion', { p_token: ana.token, p_nivel: 1, p_superado: true, p_estrellas: 1, p_codigo: 'SOL1' });
  await rpc('alumno_ejecucion', { p_token: ana.token, p_nivel: 1, p_superado: false, p_estrellas: 0, p_codigo: 'roto' });
  await rpc('alumno_ejecucion', { p_token: ana.token, p_nivel: 2, p_superado: true, p_estrellas: 2, p_codigo: 'SOL2' });
  await rpc('alumno_ejecucion', { p_token: ana.token, p_nivel: 2, p_superado: true, p_estrellas: 1, p_codigo: 'peor' });
  const est = await rpc('alumno_estado', { p_token: ana2.token });
  assert.deepEqual(est.progreso.map(p => [p.nivel, p.estrellas, p.codigo]), [[1, 1, 'SOL1'], [2, 2, 'SOL2']]);
  ok('progreso: guarda la mejor nota y la mejor solución');

  const det = await rpc('profe_detalle', { p_token: pt, p_clase: clase.id });
  assert.equal(det.length, 1); assert.equal(det[0].progreso[0].intentos, 3);
  const cod = await rpc('profe_codigo', { p_token: pt, p_alumno: det[0].id, p_nivel: 1 });
  assert.equal(cod.codigo, 'roto'); assert.equal(cod.solucion, 'SOL1'); ok('panel: intentos, último código y solución');

  await rpc('profe_desbloquear', { p_token: pt, p_clase: clase.id, p_valor: true });
  assert.equal((await rpc('alumno_estado', { p_token: ana.token })).desbloquear, true); ok('desbloquear niveles por clase');

  for (let i = 0; i < 5; i++) await rpc('alumno_entrar', { p_codigo: clase.codigo, p_alias: 'Ana', p_pin: '0000' });
  assert.match((await rpc('alumno_entrar', { p_codigo: clase.codigo, p_alias: 'Ana', p_pin: '1234' })).error, /Demasiados/);
  ok('bloqueo tras 5 PIN incorrectos');
  await rpc('profe_cambiar_pin', { p_token: pt, p_alumno: det[0].id, p_pin: '4321' });
  await falla(rpc('alumno_estado', { p_token: ana.token }), /caducado/);
  assert.ok((await rpc('alumno_entrar', { p_codigo: clase.codigo, p_alias: 'Ana', p_pin: '4321' })).token);
  ok('cambiar PIN desbloquea y cierra sesiones antiguas');

  await falla(rpc('alumno_ejecucion', { p_token: ana.token, p_nivel: 1, p_superado: true, p_estrellas: 2, p_codigo: '' }), /caducado/);
  await rpc('profe_borrar_clase', { p_token: pt, p_clase: clase.id });
  assert.equal((await rpc('profe_clases', { p_token: pt })).filter(c => c.id === clase.id).length, 0);
  ok('borrar clase (en cascada)');
  await pool.end();
  console.log('TODO OK');
})().catch(async e => { console.error('FALLO:', e); await pool.end(); process.exit(1); });
