const { loadPyodide } = require('pyodide');
const G = require('../js/logic.js');
let SIM = null;
const api = G.makeApi(() => SIM);

const SOL = {
  1: `heroe.derecha()\nheroe.derecha()\nheroe.abajo()\nheroe.abajo()\nheroe.derecha()\nheroe.derecha()`,
  2: `heroe.derecha(7)\nheroe.abajo(2)\nheroe.izquierda(7)`,
  3: `heroe.derecha()\nheroe.atacar("Grumo")\nheroe.atacar("Grumo")\nheroe.derecha(4)\nheroe.atacar("Babos")\nheroe.atacar("Babos")\nheroe.derecha(3)`,
  4: `for i in range(4):\n    heroe.derecha(2)\n    heroe.abajo()`,
  5: `clave = heroe.leer()\nheroe.derecha(2)\nheroe.decir(clave)\nheroe.derecha(4)`,
  6: `while heroe.hay_camino("derecha"):\n    heroe.derecha()\nheroe.abajo()`,
  7: `for i in range(8):\n    enemigo = heroe.enemigo_cercano()\n    if enemigo:\n        heroe.atacar(enemigo)\n    heroe.derecha()`,
  8: `for i in range(8):\n    while heroe.enemigo_cercano():\n        heroe.atacar(heroe.enemigo_cercano())\n    heroe.derecha()`,
  9: `def vuelta():\n    heroe.derecha(2)\n    heroe.abajo(2)\n    heroe.izquierda(2)\n    heroe.arriba(2)\n\nfor i in range(3):\n    vuelta()\n    heroe.derecha(4)`,
  10: `direcciones = ["arriba", "derecha", "abajo", "izquierda"]\nmirando = 1\nwhile not heroe.en_salida():\n    dcha = (mirando + 1) % 4\n    if heroe.hay_camino(direcciones[dcha]):\n        mirando = dcha\n    elif heroe.hay_camino(direcciones[mirando]):\n        pass\n    elif heroe.hay_camino(direcciones[(mirando + 3) % 4]):\n        mirando = (mirando + 3) % 4\n    else:\n        mirando = (mirando + 2) % 4\n    heroe.mover(direcciones[mirando])`,
};

(async () => {
  const py = await loadPyodide();
  py.registerJsModule('juego', api);
  py.setStdout({ batched: t => api.imprimir(t) });
  py.runPython(G.PRELUDE);
  const run = (lvl, code) => {
    SIM = G.crearPartida(lvl);
    const r = py.globals.get('_run')(code); const a = r.toJs(); r.destroy();
    G.terminar(SIM, { kind: a[0], line: a[1], name: a[2], msg: a[3] });
    return SIM;
  };
  let ok = true;
  for (const L of G.LEVELS) {
    const reps = L.random ? 30 : 1; let wins = 0;
    for (let i = 0; i < reps; i++) { const s = run(L, SOL[L.id]); if (s.over.type === 'win') wins++; else console.log('  fallo', L.id, s.over.msg); }
    const lines = G.contarLineas(SOL[L.id]);
    console.log(`Nivel ${L.id}: ${wins}/${reps} victorias, ${lines} líneas (reto ${L.maxLines}), frames ${SIM.frames.length}`);
    if (wins !== reps || (L.maxLines && lines > L.maxLines)) ok = false;
  }
  const L1 = G.LEVELS[0];
  const casos = [
    ['nombre mal', 'héroe.derecha()'], ['sin dos puntos', 'for i in range(3)\n    heroe.derecha()'],
    ['sin sangría', 'for i in range(3):\nheroe.derecha()'], ['paréntesis', 'heroe.derecha('],
    ['orden inexistente', 'heroe.saltar()'], ['pared', 'heroe.arriba()'], ['incompleto', 'heroe.derecha()'],
    ['bucle', 'while True:\n    x = 1'], ['bucle con pasos', 'while True:\n    heroe.derecha()\n    heroe.izquierda()'],
    ['print', 'print("hola", 3)\nheroe.derecha()'], ['dir mala', 'heroe.mover("norte")'], ['input', 'x = input()'],
    ['mayus', null],
  ];
  for (const [n, c] of casos) {
    if (!c) continue;
    const s = run(L1, c);
    const logs = s.frames.filter(f => f.log).map(f => f.log.kind + ':' + f.log.text);
    console.log(`[${n}]`, s.over.type, '|', logs.join(' / '));
  }
  const s3 = run(G.LEVELS[2], 'heroe.derecha()\nheroe.atacar("grumo")\nheroe.atacar(Grumo)');
  console.log('[mayus L3]', s3.frames.filter(f => f.log).map(f => f.log.text).join(' / '));
  const s5 = run(G.LEVELS[4], 'heroe.derecha(2)\nheroe.decir("hola")\nheroe.derecha()');
  console.log('[clave mala]', s5.frames.filter(f => f.log).map(f => f.log.text).join(' / '));
  console.log(ok ? 'TODO OK' : 'HAY FALLOS');
})();
