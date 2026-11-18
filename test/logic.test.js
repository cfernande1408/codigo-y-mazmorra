// Resuelve todos los niveles con Python real (Pyodide) y prueba los errores.
const { loadPyodide } = require('pyodide');
const G = require('../js/logic.js');
let SIM = null;
const respuestas = [];
const api = G.makeApi(() => SIM, { pedir: () => respuestas.length ? respuestas.shift() : null });

const SOL = {
  1: `heroe.derecha()\nheroe.derecha()\nheroe.abajo()\nheroe.abajo()\nheroe.derecha()\nheroe.derecha()`,
  2: `heroe.derecha(7)\nheroe.abajo(2)\nheroe.izquierda(7)`,
  3: `heroe.derecha()\nheroe.atacar("Grumo")\nheroe.atacar("Grumo")\nheroe.derecha(4)\nheroe.atacar("Babos")\nheroe.atacar("Babos")\nheroe.derecha(3)`,
  4: `pasos = 3\nheroe.derecha(pasos)\nheroe.abajo()\nheroe.derecha(pasos)\nheroe.abajo()\nheroe.derecha(pasos)`,
  5: `clave = heroe.leer()\nheroe.derecha(2)\nheroe.decir(clave)\nheroe.derecha(4)`,
  6: `ANCHO = 4\nALTO = 2\nheroe.derecha(ANCHO)\nheroe.arriba(ALTO)\nheroe.derecha(ANCHO)`,
  7: `total = oro * cofres\nheroe.derecha()\nheroe.decir(total)\nheroe.derecha(2)\nheroe.decir(total // ladrones)\nheroe.derecha(2)\nheroe.decir(total % ladrones)\nheroe.derecha(2)`,
  8: `hechizo = """Uno para el sol\nDos para la luna\nTres para abrir"""\nheroe.derecha()\nheroe.decir("Hola, " + guardian)\nheroe.derecha(2)\nheroe.decir("ja" * veces)\nheroe.derecha(2)\nheroe.decir(hechizo)\nheroe.derecha(2)`,
  9: `pasos = 3\nheroe.derecha(pasos)\n\ngemas = 3\nmensaje = "Llevo " + str(gemas) + " gemas"\nheroe.decir(mensaje)\n\nheroe.derecha(pasos + 1)\nprint("¡Fuera!")`,
  10: `numero = int(heroe.leer())\nheroe.derecha(numero)\nheroe.decir(numero * 2)\nheroe.derecha(2)`,
  11: `pasos = int(input("¿Cuántos pasos? "))\nheroe.derecha(pasos)\nnombre = input("¿Cómo te llamas? ")\nheroe.decir("Soy " + nombre)\nheroe.derecha(2)`,
  12: `heroe.derecha()\nheroe.decir(numero > 10)\nheroe.derecha(2)\nheroe.decir(numero % 2 == 0)\nheroe.derecha(2)\nheroe.decir(numero > 10 and numero % 2 == 0)\nheroe.derecha(2)`,
  13: `for i in range(4):\n    heroe.derecha(2)\n    heroe.abajo()`,
  14: `while heroe.hay_camino("derecha"):\n    heroe.derecha()\nheroe.abajo()`,
  15: `for i in range(8):\n    enemigo = heroe.enemigo_cercano()\n    if enemigo:\n        heroe.atacar(enemigo)\n    heroe.derecha()`,
  16: `for i in range(8):\n    while heroe.enemigo_cercano():\n        heroe.atacar(heroe.enemigo_cercano())\n    heroe.derecha()`,
  17: `def vuelta():\n    heroe.derecha(2)\n    heroe.abajo(2)\n    heroe.izquierda(2)\n    heroe.arriba(2)\n\nfor i in range(3):\n    vuelta()\n    heroe.derecha(4)`,
  18: `direcciones = ["arriba", "derecha", "abajo", "izquierda"]\nmirando = 1\nwhile not heroe.en_salida():\n    dcha = (mirando + 1) % 4\n    if heroe.hay_camino(direcciones[dcha]):\n        mirando = dcha\n    elif heroe.hay_camino(direcciones[mirando]):\n        pass\n    elif heroe.hay_camino(direcciones[(mirando + 3) % 4]):\n        mirando = (mirando + 3) % 4\n    else:\n        mirando = (mirando + 2) % 4\n    heroe.mover(direcciones[mirando])`,
};

(async () => {
  const py = await loadPyodide();
  py.registerJsModule('juego', api);
  py.setStdout({ batched: t => api.imprimir(t) });
  py.runPython(G.PRELUDE);
  const run = (lvl, code) => {
    SIM = G.crearPartida(lvl);
    if (lvl.id === 11) { respuestas.length = 0; respuestas.push(String(SIM.doors[0].x - 2), 'Ana'); }
    const fn = py.globals.get('_run'); const r = fn(code, JSON.stringify(SIM.vars)); const a = r.toJs(); r.destroy(); fn.destroy();
    G.terminar(SIM, { kind: a[0], line: a[1], name: a[2], msg: a[3], vars: G.leerVars(a[4]) });
    return SIM;
  };
  const logs = s => s.frames.filter(f => f.log).map(f => f.log.text);
  let ok = true;
  for (const L of G.LEVELS) {
    const reps = L.random ? 30 : 1; let wins = 0;
    for (let i = 0; i < reps; i++) { const s = run(L, SOL[L.id]); if (s.over.type === 'win') wins++; else console.log('  fallo', L.id, s.over.msg, logs(s).join(' / ')); }
    const lines = G.contarLineas(SOL[L.id]);
    console.log(`Nivel ${L.id} (cap. ${L.cap}): ${wins}/${reps} victorias, ${lines} líneas (reto ${L.maxLines})`);
    if (wins !== reps || (L.maxLines && lines > L.maxLines)) ok = false;
  }
  const lv = id => G.LEVELS.find(l => l.id === id);
  const caso = (titulo, id, code, esperado) => {
    const s = run(lv(id), code), todo = s.over.msg + ' / ' + logs(s).join(' / ');
    const bien = esperado.test(todo); if (!bien) ok = false;
    console.log(`${bien ? '✓' : '✗'} [${titulo}] ${s.over.type}: ${todo.slice(0, 160)}`);
  };
  caso('nombre mal', 1, 'héroe.derecha()', /heroe: en minúsculas/);
  caso('sin dos puntos', 13, 'for i in range(3)\n    heroe.derecha()', /dos puntos/);
  caso('pared', 1, 'heroe.arriba()', /piedra|pared/);
  caso('bucle', 1, 'while True:\n    x = 1', /bucle infinito/);
  caso('variable sin crear (4)', 4, 'heroe.derecha(3)\nheroe.abajo()\nheroe.derecha(3)\nheroe.abajo()\nheroe.derecha(3)', /variable pasos/);
  caso('constante en minúsculas (6)', 6, 'ancho = 4\nALTO = 2\nheroe.derecha(ancho)\nheroe.arriba(ALTO)\nheroe.derecha(ancho)', /MAYÚSCULAS/);
  caso('división con / (7)', 7, 'total = oro * cofres\nheroe.derecha()\nheroe.decir(total)\nheroe.derecha(2)\nheroe.decir(total / ladrones)', /decimal|abre/);
  caso('saludo sin coma (8)', 8, 'heroe.derecha()\nheroe.decir("Hola " + guardian)', /exactamente/);
  caso('código roto: sintaxis (9)', 9, lv(9).starter, /comillas no están cerradas \(línea 10\)/);
  caso('código roto: nombre (9)', 9, lv(9).starter.replace('print("¡Fuera!)', 'print("¡Fuera!")'), /«paso».*«pasos»/);
  caso('código roto: tipos (9)', 9, lv(9).starter.replace('print("¡Fuera!)', 'print("¡Fuera!")').replace('(paso)', '(pasos)'), /str\(\)/);
  caso('sin int() al leer (10)', 10, 'n = heroe.leer()\nheroe.derecha(n)', /texto .* int\(\)/);
  caso('texto repetido (10)', 10, 'n = heroe.leer()\nheroe.derecha(int(n))\nheroe.decir(n * 2)', /repetido un texto/);
  caso('int() de letras', 10, 'x = int("hola")', /no puede convertir 'hola'/);
  caso('sin input (11)', 11, '', /no has llegado|input/);
  caso('True a mano (12)', 12, 'heroe.derecha()\nheroe.decir("true")', /mayúscula/);
  caso('texto + número', 1, 'x = "a" + 3', /str\(\)/);
  caso('cuentas con texto', 1, 'x = "3" - 1', /cuentas con un texto/);
  console.log(ok ? 'TODO OK' : 'HAY FALLOS');
  process.exit(ok ? 0 : 1);
})();
