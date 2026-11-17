// Servidor de pruebas: imita la API RPC de Supabase (PostgREST) sobre un
// Postgres local y sirve los ficheros del repo. Solo para desarrollo.
//   PGURL=postgres://postgres@localhost:5432/cym node test/mock-supabase.js
// La base de datos necesita los roles anon/authenticated, el esquema
// "extensions" y supabase/schema.sql cargado (ver db.test.js).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.PGURL || 'postgres://postgres@localhost:5432/cym' });
const ROOT = path.resolve(__dirname, '..');
const NAME = /^[a-z_][a-z0-9_]*$/;

async function rpc(fn, args) {
  if (!NAME.test(fn) || fn.startsWith('_')) { const e = new Error('Could not find the function'); e.status = 404; throw e; }
  const keys = Object.keys(args || {});
  if (!keys.every(k => NAME.test(k))) throw Object.assign(new Error('bad arg'), { status: 400 });
  const sql = `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`;
  const c = await pool.connect();
  try {
    await c.query('begin'); await c.query('set local role anon');
    const r = await c.query(sql, keys.map(k => args[k] === null || args[k] === undefined ? null : String(args[k])));
    await c.query('commit');
    return r.rows[0].r;
  } catch (e) { await c.query('rollback').catch(() => { }); throw e; } finally { c.release(); }
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.zip': 'application/zip', '.svg': 'image/svg+xml' };

function server() {
  return http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'apikey, authorization, content-type');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const m = /^\/rest\/v1\/rpc\/([^/?]+)/.exec(req.url);
    if (m && req.method === 'POST') {
      if (!req.headers.apikey) { res.writeHead(401); return res.end('{"message":"No API key found in request"}'); }
      let body = ''; for await (const ch of req) body += ch;
      try {
        const r = await rpc(m[1], body ? JSON.parse(body) : {});
        if (r === null || r === undefined || r === '') { res.writeHead(204); return res.end(); }
        res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(r));
      } catch (e) {
        res.writeHead(e.status || 400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ code: e.code || 'P0001', message: e.message }));
      }
    }
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    if (process.env.MOCK_CONFIG && p === '/js/config.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript' });
      return res.end("window.CYM_CONFIG = { supabaseUrl: location.origin, supabaseKey: 'sb_publishable_prueba' };");
    }
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
}

module.exports = { rpc, pool, server };
if (require.main === module) {
  const port = +process.env.PORT || 8790;
  server().listen(port, () => console.log('mock en http://localhost:' + port));
}
