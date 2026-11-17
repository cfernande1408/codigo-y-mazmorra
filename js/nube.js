// Cliente mínimo para las funciones RPC de Supabase (sin dependencias).
const Nube = (() => {
  const cfg = window.CYM_CONFIG || {};
  const url = (cfg.supabaseUrl || '').replace(/\/+$/, '');
  const key = cfg.supabaseKey || '';
  const activa = !!(url && key);

  class ErrorNube extends Error {
    constructor(msg, conexion) { super(msg); this.conexion = !!conexion; this.caducada = /caducad/i.test(msg); }
  }

  async function rpc(fn, args) {
    const headers = { 'Content-Type': 'application/json', apikey: key };
    if (key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + key; // clave "anon" antigua (JWT)
    let r;
    try {
      r = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(args || {}) });
    } catch (e) {
      throw new ErrorNube('No hay conexión con el servidor.', true);
    }
    const txt = await r.text();
    let data = null; try { data = txt ? JSON.parse(txt) : null; } catch (e) { }
    if (!r.ok) {
      const msg = (data && data.message) || `Error del servidor (${r.status}).`;
      throw new ErrorNube(msg, r.status >= 500 || r.status === 0);
    }
    if (data && data.error) throw new ErrorNube(data.error);
    return data;
  }
  return { activa, rpc, ErrorNube };
})();
