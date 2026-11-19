// Resuelve todos los niveles con Python real (Pyodide) y prueba los errores.
const { loadPyodide } = require('pyodide');
const G = require('../js/logic.js');
let SIM = null;
const respuestas = [];
const api = G.makeApi(() => SIM, { pedir: () => respuestas.length ? respuestas.shift() : null });

const SOL = {
  celda: `derecha()\nderecha()\nabajo()\nabajo()\nderecha()\nderecha()`,
  gemas: `derecha(7)\nabajo(2)\nizquierda(7)`,
  guardias: `derecha()\natacar("SyntaxError")\natacar("SyntaxError")\nderecha(4)\natacar("NameError")\natacar("NameError")\nderecha(3)`,
  escalones: `pasos = 3\nderecha(pasos)\nabajo()\nderecha(pasos)\nabajo()\nderecha(pasos)`,
  clave: `clave = leer()\nderecha(2)\ndecir(clave)\nderecha(4)`,
  constantes: `ANCHO = 4\nALTO = 2\nderecha(ANCHO)\narriba(ALTO)\nderecha(ANCHO)`,
  tesoro: `total = oro * cofres\nderecha()\ndecir(total)\nderecha(2)\ndecir(total // ladrones)\nderecha(2)\ndecir(total % ladrones)\nderecha(2)`,
  palabras: `hechizo = """Uno para el sol\nDos para la luna\nTres para abrir"""\nderecha()\ndecir("Hola, " + guardian)\nderecha(2)\ndecir("ja" * veces)\nderecha(2)\ndecir(hechizo)\nderecha(2)`,
  roto: `pasos = 3\nderecha(pasos)\n\ngemas = 3\nmensaje = "Llevo " + str(gemas) + " gemas"\ndecir(mensaje)\n\nderecha(pasos + 1)\nprint("¡Fuera!")`,
  placa: `numero = int(leer())\nderecha(numero)\ndecir(numero * 2)\nderecha(2)`,
  guardian: `pasos = int(input("¿Cuántos pasos? "))\nderecha(pasos)\nnombre = input("¿Cómo te llamas? ")\ndecir("Soy " + nombre)\nderecha(2)`,
  verdad: `derecha()\ndecir(numero > 10)\nderecha(2)\ndecir(numero % 2 == 0)\nderecha(2)\ndecir(numero > 10 and numero % 2 == 0)\nderecha(2)`,
  caracol: `for i in range(4):\n    derecha(2)\n    abajo()`,
  sinfin: `while hay_camino("derecha"):\n    derecha()\nabajo()`,
  emboscada: `for i in range(8):\n    enemigo = enemigo_cercano()\n    if enemigo:\n        atacar(enemigo)\n    derecha()`,
  tozudos: `for i in range(8):\n    while enemigo_cercano():\n        atacar(enemigo_cercano())\n    derecha()`,
  columnas: `def vuelta():\n    derecha(2)\n    abajo(2)\n    izquierda(2)\n    arriba(2)\n\nfor i in range(3):\n    vuelta()\n    derecha(4)`,
  potencias: `derecha()\ndecir(base ** exponente)\nderecha(2)\ndecir(base + extra * 2)\nderecha(2)\ndecir((base + extra) * 2)\nderecha(2)`,
  roto2: `ALTO = 2\nderecha(2)\narriba(ALTO)\n\npasos = int("3")\nderecha(pasos)`,
  jefe1: `derecha(5)\ndecir("Carlos")\ndecir("str")\nderecha(2)`,
  jefe2: `edad = 16\nderecha(5)\ndecir(edad)\ndecir("int")\nderecha(2)`,
  jefe3: `nombre = "Carlos"\nsaludo = "Hola, " + nombre\nderecha(5)\ndecir(saludo)\ndecir("str")\nderecha(2)`,
  jefe4: `media = 7 / 2\nderecha(5)\ndecir(media)\ndecir(type(media))\nderecha(2)`,
  jefe5: `edad = input("¿Cuántos años tienes? ")\nderecha(5)\ndecir("str")\nedad = int(edad)\ndecir(edad)\nderecha(2)`,
  jefe6: `derecha(5)\ndecir("Tengo " + str(edad) + " años")\ndecir("int")\nderecha(2)`,
  jefe8: `mayor = numero > 10\nderecha(5)\ndecir(mayor)\ndecir("bool")\nderecha(2)`,
  laberinto: `direcciones = ["arriba", "derecha", "abajo", "izquierda"]\nmirando = 1\nwhile not en_salida():\n    dcha = (mirando + 1) % 4\n    if hay_camino(direcciones[dcha]):\n        mirando = dcha\n    elif hay_camino(direcciones[mirando]):\n        pass\n    elif hay_camino(direcciones[(mirando + 3) % 4]):\n        mirando = (mirando + 3) % 4\n    else:\n        mirando = (mirando + 2) % 4\n    mover(direcciones[mirando])`,
};

(async () => {
  const py = await loadPyodide();
  py.registerJsModule('juego', api);
  py.setStdout({ batched: t => api.imprimir(t) });
  py.runPython(G.PRELUDE);
  const run = (lvl, code) => {
    SIM = G.crearPartida(lvl);
    if (lvl.clave === 'jefe5') { respuestas.length = 0; respuestas.push('16'); }
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
    const s = run(lv(id), code), todo = s.over.type + ': ' + s.over.msg + ' / ' + logs(s).join(' / ');
    const bien = esperado.test(todo); if (!bien) ok = false;
    console.log(`${bien ? '✓' : '✗'} [${titulo}] ${s.over.type}: ${todo.slice(0, 160)}`);
  };
  caso('jefe: número en vez de nombre', 'jefe1', 'derecha(5)\ndecir(16)', /entre comillas/);
  caso('jefe: tipo equivocado', 'jefe1', 'derecha(5)\ndecir("Ana")\ndecir("int")', /No es int/);
  caso('jefe: edad con comillas', 'jefe2', 'edad = "16"\nderecha(5)\ndecir(edad)', /es un texto/);
  caso('jefe: sin variable', 'jefe2', 'derecha(5)\ndecir(16)', /crea la variable edad/);
  caso('jefe: // pierde decimales', 'jefe4', 'media = 7 // 2\nderecha(5)\ndecir(media)', /decimales/);
  caso('jefe: input sin convertir', 'jefe5', 'edad = input("?")\nderecha(5)\ndecir("str")\ndecir(edad)', /sigue siendo un texto/);
  caso('jefe: str + int', 'jefe6', 'derecha(5)\ndecir("Tengo " + edad + " años")', /TypeError|texto|número/i);
  caso('mayúscula en la orden', 'celda', 'Derecha()', /«Derecha».*«derecha»/);
  caso('paréntesis olvidados', 'celda', 'derecha', /faltan los paréntesis/);
  caso('un choque no acaba el juego', 'celda', 'arriba()\n' + SOL.celda, /^win:.*Te quedan 2 vidas/);
  caso('tres choques: sin vidas', 'celda', 'arriba()\narriba()\narriba()\nderecha()', /sin vidas/);
  caso('sin dos puntos', 'caracol', 'for i in range(3)\n    derecha()', /dos puntos/);
  caso('pared', 'celda', 'arriba()', /piedra|pared/);
  caso('bucle', 'celda', 'while True:\n    x = 1', /bucle infinito/);
  caso('variable sin crear (4)', 'escalones', 'derecha(3)\nabajo()\nderecha(3)\nabajo()\nderecha(3)', /variable pasos/);
  caso('constante en minúsculas (6)', 'constantes', 'ancho = 4\nALTO = 2\nderecha(ancho)\narriba(ALTO)\nderecha(ancho)', /MAYÚSCULAS/);
  caso('división con / (7)', 'tesoro', 'total = oro * cofres\nderecha()\ndecir(total)\nderecha(2)\ndecir(total / ladrones)', /decimal|abre/);
  caso('saludo sin coma (8)', 'palabras', 'derecha()\ndecir("Hola " + guardian)', /exactamente/);
  caso('código roto: sintaxis (9)', 'roto', lv('roto').starter, /comillas no están cerradas \(línea 10\)/);
  caso('código roto: nombre (9)', 'roto', lv('roto').starter.replace('print("¡Fuera!)', 'print("¡Fuera!")'), /«paso».*«pasos»/);
  caso('código roto: tipos (9)', 'roto', lv('roto').starter.replace('print("¡Fuera!)', 'print("¡Fuera!")').replace('(paso)', '(pasos)'), /str\(\)/);
  caso('sin int() al leer (10)', 'placa', 'n = leer()\nderecha(n)', /texto .* int\(\)/);
  caso('texto repetido (10)', 'placa', 'n = leer()\nderecha(int(n))\ndecir(n * 2)', /repetido un texto/);
  caso('int() de letras', 'placa', 'x = int("hola")', /no puede convertir 'hola'/);
  caso('sin input (11)', 'guardian', '', /no has llegado|input/);
  caso('True a mano (12)', 'verdad', 'derecha()\ndecir("true")', /mayúscula/);
  caso('texto + número', 'celda', 'x = "a" + 3', /str\(\)/);
  caso('potencia mal (9)', 'potencias', 'derecha()\ndecir(base * exponente)', /\*\* ?|potencia/);
  caso('prioridad (9)', 'potencias', 'derecha()\ndecir(base ** exponente)\nderecha(2)\ndecir((base + extra) * 2)', /prioridad/);
  caso('roto2: sangría', 'roto2', lv('roto2').starter, /Sobran espacios .*línea 3/);
  caso('roto2: mayúsculas', 'roto2', lv('roto2').starter.replace('  derecha', 'derecha'), /«alto».*«ALTO»/);
  caso('roto2: int', 'roto2', lv('roto2').starter.replace('  derecha', 'derecha').replace('(alto)', '(ALTO)'), /no puede convertir 'tres'/);
  caso('cuentas con texto', 'celda', 'x = "3" - 1', /cuentas con un texto/);
  console.log(ok ? 'TODO OK' : 'HAY FALLOS');
  process.exit(ok ? 0 : 1);
})();
