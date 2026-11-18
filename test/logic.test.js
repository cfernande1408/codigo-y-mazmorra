// Resuelve todos los niveles con Python real (Pyodide) y prueba los errores.
const { loadPyodide } = require('pyodide');
const G = require('../js/logic.js');
let SIM = null;
const respuestas = [];
const api = G.makeApi(() => SIM, { pedir: () => respuestas.length ? respuestas.shift() : null });

const SOL = {
  celda: `heroe.derecha()\nheroe.derecha()\nheroe.abajo()\nheroe.abajo()\nheroe.derecha()\nheroe.derecha()`,
  gemas: `heroe.derecha(7)\nheroe.abajo(2)\nheroe.izquierda(7)`,
  guardias: `heroe.derecha()\nheroe.atacar("Grumo")\nheroe.atacar("Grumo")\nheroe.derecha(4)\nheroe.atacar("Babos")\nheroe.atacar("Babos")\nheroe.derecha(3)`,
  escalones: `pasos = 3\nheroe.derecha(pasos)\nheroe.abajo()\nheroe.derecha(pasos)\nheroe.abajo()\nheroe.derecha(pasos)`,
  clave: `clave = heroe.leer()\nheroe.derecha(2)\nheroe.decir(clave)\nheroe.derecha(4)`,
  constantes: `ANCHO = 4\nALTO = 2\nheroe.derecha(ANCHO)\nheroe.arriba(ALTO)\nheroe.derecha(ANCHO)`,
  tesoro: `total = oro * cofres\nheroe.derecha()\nheroe.decir(total)\nheroe.derecha(2)\nheroe.decir(total // ladrones)\nheroe.derecha(2)\nheroe.decir(total % ladrones)\nheroe.derecha(2)`,
  palabras: `hechizo = """Uno para el sol\nDos para la luna\nTres para abrir"""\nheroe.derecha()\nheroe.decir("Hola, " + guardian)\nheroe.derecha(2)\nheroe.decir("ja" * veces)\nheroe.derecha(2)\nheroe.decir(hechizo)\nheroe.derecha(2)`,
  roto: `pasos = 3\nheroe.derecha(pasos)\n\ngemas = 3\nmensaje = "Llevo " + str(gemas) + " gemas"\nheroe.decir(mensaje)\n\nheroe.derecha(pasos + 1)\nprint("¡Fuera!")`,
  placa: `numero = int(heroe.leer())\nheroe.derecha(numero)\nheroe.decir(numero * 2)\nheroe.derecha(2)`,
  guardian: `pasos = int(input("¿Cuántos pasos? "))\nheroe.derecha(pasos)\nnombre = input("¿Cómo te llamas? ")\nheroe.decir("Soy " + nombre)\nheroe.derecha(2)`,
  verdad: `heroe.derecha()\nheroe.decir(numero > 10)\nheroe.derecha(2)\nheroe.decir(numero % 2 == 0)\nheroe.derecha(2)\nheroe.decir(numero > 10 and numero % 2 == 0)\nheroe.derecha(2)`,
  caracol: `for i in range(4):\n    heroe.derecha(2)\n    heroe.abajo()`,
  sinfin: `while heroe.hay_camino("derecha"):\n    heroe.derecha()\nheroe.abajo()`,
  emboscada: `for i in range(8):\n    enemigo = heroe.enemigo_cercano()\n    if enemigo:\n        heroe.atacar(enemigo)\n    heroe.derecha()`,
  tozudos: `for i in range(8):\n    while heroe.enemigo_cercano():\n        heroe.atacar(heroe.enemigo_cercano())\n    heroe.derecha()`,
  columnas: `def vuelta():\n    heroe.derecha(2)\n    heroe.abajo(2)\n    heroe.izquierda(2)\n    heroe.arriba(2)\n\nfor i in range(3):\n    vuelta()\n    heroe.derecha(4)`,
  potencias: `heroe.derecha()\nheroe.decir(base ** exponente)\nheroe.derecha(2)\nheroe.decir(base + extra * 2)\nheroe.derecha(2)\nheroe.decir((base + extra) * 2)\nheroe.derecha(2)`,
  roto2: `ALTO = 2\nheroe.derecha(2)\nheroe.arriba(ALTO)\n\npasos = int("3")\nheroe.derecha(pasos)`,
  laberinto: `direcciones = ["arriba", "derecha", "abajo", "izquierda"]\nmirando = 1\nwhile not heroe.en_salida():\n    dcha = (mirando + 1) % 4\n    if heroe.hay_camino(direcciones[dcha]):\n        mirando = dcha\n    elif heroe.hay_camino(direcciones[mirando]):\n        pass\n    elif heroe.hay_camino(direcciones[(mirando + 3) % 4]):\n        mirando = (mirando + 3) % 4\n    else:\n        mirando = (mirando + 2) % 4\n    heroe.mover(direcciones[mirando])`,
};

(async () => {
  const py = await loadPyodide();
  py.registerJsModule('juego', api);
  py.setStdout({ batched: t => api.imprimir(t) });
  py.runPython(G.PRELUDE);
  const run = (lvl, code) => {
    SIM = G.crearPartida(lvl);
    if (lvl.clave === 'guardian') { respuestas.length = 0; respuestas.push(String(SIM.doors[0].x - 2), 'Ana'); }
    const fn = py.globals.get('_run'); const r = fn(code, JSON.stringify(SIM.vars)); const a = r.toJs(); r.destroy(); fn.destroy();
    G.terminar(SIM, { kind: a[0], line: a[1], name: a[2], msg: a[3], vars: G.leerVars(a[4]) });
    return SIM;
  };
  const logs = s => s.frames.filter(f => f.log).map(f => f.log.text);
  let ok = true;
  for (const L of G.LEVELS) {
    const reps = L.random ? 30 : 1; let wins = 0;
    for (let i = 0; i < reps; i++) { const s = run(L, SOL[L.clave]); if (s.over.type === 'win') wins++; else console.log('  fallo', L.id, s.over.msg, logs(s).join(' / ')); }
    const lines = G.contarLineas(SOL[L.clave]);
    console.log(`Nivel ${L.id} ${L.clave} (mundo ${L.mundo}): ${wins}/${reps} victorias, ${lines} líneas (reto ${L.maxLines})`);
    if (wins !== reps || (L.maxLines && lines > L.maxLines)) ok = false;
  }
  const lv = c => G.LEVELS.find(l => l.clave === c);
  const caso = (titulo, id, code, esperado) => {
    const s = run(lv(id), code), todo = s.over.msg + ' / ' + logs(s).join(' / ');
    const bien = esperado.test(todo); if (!bien) ok = false;
    console.log(`${bien ? '✓' : '✗'} [${titulo}] ${s.over.type}: ${todo.slice(0, 160)}`);
  };
  caso('nombre mal', 'celda', 'héroe.derecha()', /heroe: en minúsculas/);
  caso('sin dos puntos', 'caracol', 'for i in range(3)\n    heroe.derecha()', /dos puntos/);
  caso('pared', 'celda', 'heroe.arriba()', /piedra|pared/);
  caso('bucle', 'celda', 'while True:\n    x = 1', /bucle infinito/);
  caso('variable sin crear (4)', 'escalones', 'heroe.derecha(3)\nheroe.abajo()\nheroe.derecha(3)\nheroe.abajo()\nheroe.derecha(3)', /variable pasos/);
  caso('constante en minúsculas (6)', 'constantes', 'ancho = 4\nALTO = 2\nheroe.derecha(ancho)\nheroe.arriba(ALTO)\nheroe.derecha(ancho)', /MAYÚSCULAS/);
  caso('división con / (7)', 'tesoro', 'total = oro * cofres\nheroe.derecha()\nheroe.decir(total)\nheroe.derecha(2)\nheroe.decir(total / ladrones)', /decimal|abre/);
  caso('saludo sin coma (8)', 'palabras', 'heroe.derecha()\nheroe.decir("Hola " + guardian)', /exactamente/);
  caso('código roto: sintaxis (9)', 'roto', lv('roto').starter, /comillas no están cerradas \(línea 10\)/);
  caso('código roto: nombre (9)', 'roto', lv('roto').starter.replace('print("¡Fuera!)', 'print("¡Fuera!")'), /«paso».*«pasos»/);
  caso('código roto: tipos (9)', 'roto', lv('roto').starter.replace('print("¡Fuera!)', 'print("¡Fuera!")').replace('(paso)', '(pasos)'), /str\(\)/);
  caso('sin int() al leer (10)', 'placa', 'n = heroe.leer()\nheroe.derecha(n)', /texto .* int\(\)/);
  caso('texto repetido (10)', 'placa', 'n = heroe.leer()\nheroe.derecha(int(n))\nheroe.decir(n * 2)', /repetido un texto/);
  caso('int() de letras', 'placa', 'x = int("hola")', /no puede convertir 'hola'/);
  caso('sin input (11)', 'guardian', '', /no has llegado|input/);
  caso('True a mano (12)', 'verdad', 'heroe.derecha()\nheroe.decir("true")', /mayúscula/);
  caso('texto + número', 'celda', 'x = "a" + 3', /str\(\)/);
  caso('potencia mal (9)', 'potencias', 'heroe.derecha()\nheroe.decir(base * exponente)', /\*\* ?|potencia/);
  caso('prioridad (9)', 'potencias', 'heroe.derecha()\nheroe.decir(base ** exponente)\nheroe.derecha(2)\nheroe.decir((base + extra) * 2)', /prioridad/);
  caso('roto2: sangría', 'roto2', lv('roto2').starter, /Sobran espacios .*línea 3/);
  caso('roto2: mayúsculas', 'roto2', lv('roto2').starter.replace('  heroe', 'heroe'), /«alto».*«ALTO»/);
  caso('roto2: int', 'roto2', lv('roto2').starter.replace('  heroe', 'heroe').replace('(alto)', '(ALTO)'), /no puede convertir 'tres'/);
  caso('cuentas con texto', 'celda', 'x = "3" - 1', /cuentas con un texto/);
  console.log(ok ? 'TODO OK' : 'HAY FALLOS');
  process.exit(ok ? 0 : 1);
})();
