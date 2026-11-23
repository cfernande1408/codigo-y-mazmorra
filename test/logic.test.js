// Resuelve todos los niveles con Python real (Pyodide) y prueba los errores.
const { loadPyodide } = require('pyodide');
const G = require('../js/logic.js');
let SIM = null;
const respuestas = [];
const api = G.makeApi(() => SIM, { pedir: () => respuestas.length ? respuestas.shift() : null });

const SOL = {
  celda: `derecha = 2\nabajo = 2\nderecha = 2`,
  gemas: `derecha = 7\nabajo = 2\nizquierda = 7`,
  guardias: `derecha = 1\natacar = "SyntaxError"\natacar = "SyntaxError"\nderecha = 4\natacar = "NameError"\natacar = "NameError"\nderecha = 3`,
  escalones: `pasos = 3\nderecha = pasos\nabajo = 1\nderecha = pasos\nabajo = 1\nderecha = pasos`,
  clave: `clave = placa\nderecha = 2\nrespuesta = clave\nderecha = 4`,
  constantes: `ANCHO = 4\nALTO = 2\nderecha = ANCHO\narriba = ALTO\nderecha = ANCHO`,
  tesoro: `total = oro * cofres\nderecha = 1\nrespuesta = total\nderecha = 2\nrespuesta = total // ladrones\nderecha = 2\nrespuesta = total % ladrones\nderecha = 2`,
  palabras: `hechizo = """Uno para el sol\nDos para la luna\nTres para abrir"""\nderecha = 1\nrespuesta = "Hola, " + guardian\nderecha = 2\nrespuesta = "ja" * veces\nderecha = 2\nrespuesta = hechizo\nderecha = 2`,
  roto: `pasos = 3\nderecha = pasos\n\ngemas = 3\nmensaje = "Llevo " + str(gemas) + " gemas"\nrespuesta = mensaje\n\nderecha = pasos + 1\nprint("¡Fuera!")`,
  placa: `numero = int(placa)\nderecha = numero\nrespuesta = numero * 2\nderecha = 2`,
  guardian: `pasos = int(input("¿Cuántos pasos? "))\nderecha = pasos\nnombre = input("¿Cómo te llamas? ")\nrespuesta = "Soy " + nombre\nderecha = 2`,
  verdad: `derecha = 1\nrespuesta = numero > 10\nderecha = 2\nrespuesta = numero % 2 == 0\nderecha = 2\nrespuesta = numero > 10 and numero % 2 == 0\nderecha = 2`,
  caracol: `for i in range(4):\n    derecha = 2\n    abajo = 1`,
  sinfin: `while camino_derecha:\n    derecha = 1\nabajo = 1`,
  emboscada: `for i in range(8):\n    if enemigo:\n        atacar = enemigo\n    derecha = 1`,
  tozudos: `for i in range(8):\n    while enemigo:\n        atacar = enemigo\n    derecha = 1`,
  columnas: `def doble(n):\n    return n * 2\n\nfor n in range(1, 4):\n    derecha = doble(n)\n    abajo = 1`,
  potencias: `derecha = 1\nrespuesta = base ** exponente\nderecha = 2\nrespuesta = base + extra * 2\nderecha = 2\nrespuesta = (base + extra) * 2\nderecha = 2`,
  roto2: `ALTO = 2\nderecha = 2\narriba = ALTO\n\npasos = int("3")\nderecha = pasos`,
  jefe1: `derecha = 5\nnombre = "Carlos"\ntipo = "str"\nderecha = 2`,
  jefe2: `edad = 16\nderecha = 5\ntipo = "int"\nderecha = 2`,
  jefe3: `nombre = "Carlos"\nsaludo = "Hola, " + nombre\nderecha = 5\ntipo = "str"\nderecha = 2`,
  jefe4: `media = 7 / 2\nderecha = 5\ntipo = type(media)\nderecha = 2`,
  jefe5: `edad = input("¿Cuántos años tienes? ")\nderecha = 5\ntipo = "str"\nnumero = int(edad)\nderecha = 2`,
  jefe6: `derecha = 5\nfrase = "Tengo " + str(edad) + " años"\ntipo = "int"\nderecha = 2`,
  jefe8: `mayor = numero > 10\nderecha = 5\ntipo = "bool"\nderecha = 2`,
  semaforo: `derecha = 2\nif placa == "arriba":\n    arriba = 2\nelse:\n    abajo = 2\nderecha = 4`,
  termometro: `if temperatura < 15:\n    derecha = 2\n    arriba = 2\n    derecha = 4\nelif temperatura > 30:\n    derecha = 2\n    abajo = 2\n    derecha = 4\nelse:\n    derecha = 6`,
  escudo: `derecha = 2\nif escudo and energia > 50:\n    arriba = 2\nelse:\n    abajo = 2\nderecha = 4`,
  contador: `for i in range(1, 5):\n    derecha = i\n    abajo = 1`,
  bateria: `while energia > 0:\n    derecha = 1\n    energia = energia - 1\nabajo = 1`,
  ruta: `for letra in ruta:\n    if letra == "D":\n        derecha = 1\n    elif letra == "A":\n        arriba = 1\n    else:\n        abajo = 1`,
  jefe7: `suma = 0\nfor i in range(1, n + 1):\n    suma = suma + i\nderecha = 5\nvueltas = 7\nderecha = 2`,
  laberinto: `direcciones = ["arriba", "derecha", "abajo", "izquierda"]\nmirando = 1\nwhile not en_salida:\n    dcha = (mirando + 1) % 4\n    if hay_camino(direcciones[dcha]):\n        mirando = dcha\n    elif hay_camino(direcciones[mirando]):\n        pass\n    elif hay_camino(direcciones[(mirando + 3) % 4]):\n        mirando = (mirando + 3) % 4\n    else:\n        mirando = (mirando + 2) % 4\n    mover = direcciones[mirando]`
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
  // órdenes con variables y tipos
  caso('float en los pasos', 'celda', 'abajo = 7.5', /medios pasos.*float/);
  caso('texto en los pasos', 'celda', 'derecha = "2"', /comillas.*str/);
  caso('bool en los pasos', 'celda', 'derecha = True', /bool/);
  caso('pasos negativos', 'celda', 'derecha = -2', /1 o más/);
  caso('función en vez de variable', 'celda', 'derecha(2)', /no usamos funciones.*derecha = 3/);
  caso('variable del juego', 'clave', 'placa = "x"', /variable del juego/);
  caso('placa sin placa', 'celda', 'x = placa', /no hay ninguna placa/);
  caso('atacar sin comillas', 'guardias', 'derecha = 1\natacar = SyntaxError', /NameError|no conoce/);
  // minibosses
  caso('jefe: número en vez de nombre', 'jefe1', 'derecha = 5\nnombre = 16', /entre comillas/);
  caso('jefe: tipo equivocado', 'jefe1', 'derecha = 5\nnombre = "Ana"\ntipo = "int"', /No es int/);
  caso('jefe: tipo sin comillas', 'jefe1', 'derecha = 5\nnombre = "Ana"\ntipo = str', /Me rindo/);
  caso('jefe: edad con comillas', 'jefe2', 'edad = "16"\nderecha = 5', /es un texto/);
  caso('jefe: // pierde decimales', 'jefe4', 'media = 7 // 2\nderecha = 5', /decimales/);
  caso('jefe: input sin convertir', 'jefe5', 'edad = input("?")\nderecha = 5\ntipo = "str"\nnumero = edad', /sigue siendo un texto/);
  caso('jefe: str + int', 'jefe6', lv('jefe6').starter, /No se puede juntar un texto con un número/);
  caso('jefe: no pasa sin contestar', 'jefe1', 'derecha = 7', /Portero no te deja pasar/);
  caso('mayúscula en la orden', 'celda', 'Derecha = 2\nx = derecha', /«derecha»/);
  caso('un choque no acaba el juego', 'celda', 'arriba = 1\n' + SOL.celda, /^win:.*Te quedan 2 vidas/);
  caso('tres choques: sin vidas', 'celda', 'arriba = 1\narriba = 1\narriba = 1\nderecha = 1', /sin vidas/);
  caso('sin dos puntos', 'caracol', 'for i in range(3)\n    derecha = 1', /dos puntos/);
  caso('pared', 'celda', 'arriba = 1', /piedra|pared/);
  caso('bucle', 'celda', 'while True:\n    x = 1', /bucle infinito/);
  caso('variable sin crear (4)', 'escalones', 'derecha = 3\nabajo = 1\nderecha = 3\nabajo = 1\nderecha = 3', /variable pasos/);
  caso('constante en minúsculas (6)', 'constantes', 'ancho = 4\nALTO = 2\nderecha = ancho\narriba = ALTO\nderecha = ancho', /MAYÚSCULAS/);
  caso('división con / (7)', 'tesoro', 'total = oro * cofres\nderecha = 1\nrespuesta = total\nderecha = 2\nrespuesta = total / ladrones', /decimal|abre/);
  caso('saludo sin coma (8)', 'palabras', 'derecha = 1\nrespuesta = "Hola " + guardian', /exactamente/);
  caso('código roto: sintaxis (9)', 'roto', lv('roto').starter, /comillas no están cerradas \(línea 10\)/);
  caso('código roto: nombre (9)', 'roto', lv('roto').starter.replace('print("¡Fuera!)', 'print("¡Fuera!")'), /«paso».*«pasos»/);
  caso('código roto: tipos (9)', 'roto', lv('roto').starter.replace('print("¡Fuera!)', 'print("¡Fuera!")').replace('= paso\n', '= pasos\n'), /str\(\)/);
  caso('sin int() con la placa (10)', 'placa', 'derecha = placa', /texto \(str\).*int\(\)/);
  caso('texto repetido (10)', 'placa', 'n = placa\nderecha = int(n)\nrespuesta = n * 2', /repetido un texto/);
  caso('int() de letras', 'placa', 'x = int("hola")', /no puede convertir 'hola'/);
  caso('sin input (11)', 'guardian', '', /no has llegado|input/);
  caso('True a mano (12)', 'verdad', 'derecha = 1\nrespuesta = "true"', /mayúscula/);
  caso('texto + número', 'celda', 'x = "a" + 3', /str\(\)/);
  caso('potencia mal (9)', 'potencias', 'derecha = 1\nrespuesta = base * exponente', /\*\* ?|potencia/);
  caso('prioridad (9)', 'potencias', 'derecha = 1\nrespuesta = base ** exponente\nderecha = 2\nrespuesta = (base + extra) * 2', /prioridad/);
  caso('roto2: sangría', 'roto2', lv('roto2').starter, /Sobran espacios .*línea 3/);
  caso('roto2: mayúsculas', 'roto2', lv('roto2').starter.replace('  derecha', 'derecha'), /«alto».*«ALTO»/);
  caso('roto2: int', 'roto2', lv('roto2').starter.replace('  derecha', 'derecha').replace('= alto', '= ALTO'), /no puede convertir 'tres'/);
  caso('if con = en vez de ==', 'semaforo', 'if placa = "arriba":\n    arriba = 2', /«==»/);
  caso('termómetro con <= (borde)', 'termometro', '', /no has llegado/);
  caso('batería sin restar', 'bateria', 'while energia > 0:\n    derecha = 1', /bucle infinito|pared|vidas/);
  caso('repetidor: range corto', 'jefe7', 'suma = 0\nfor i in range(1, n):\n    suma = suma + i\nderecha = 5', /n \+ 1/);
  caso('cuentas con texto', 'celda', 'x = "3" - 1', /cuentas con un texto/);
  console.log(ok ? 'TODO OK' : 'HAY FALLOS');
  process.exit(ok ? 0 : 1);
})();
