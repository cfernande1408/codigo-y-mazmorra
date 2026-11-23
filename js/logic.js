// ===== Código y Mazmorra · lógica del juego (sin DOM) =====
const NOMBRES = ["SyntaxError","NameError","TypeError","ValueError","IndexError","KeyError","AttributeError","ImportError","OverflowError","EOFError","Bug","Typo"];
const CLAVES = ["abracadabra","calabaza","murcielago","tostada","kraken","pimiento","bigote","pepinillo","zanahoria","catapulta","macarrones","escarabajo"];
// la contraseña del nivel «clave» se elige al abrir el juego y no cambia entre
// ejecuciones: hay que leerla y escribirla a mano (cada ordenador tiene la suya)
const CLAVE_SESION = CLAVES[Math.floor(Math.random() * CLAVES.length)];
const MAX_FRAMES = 1200;
const VIDAS = 3;

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function blank(w, h) { return Array.from({ length: h }, () => Array(w).fill('#')); }
function toRows(g) { return g.map(r => r.join('')); }

function pasilloConGuardias(hpMin, hpMax, minE, maxE) {
  return () => {
    const g = blank(11, 3);
    for (let x = 1; x <= 9; x++) g[1][x] = '.';
    g[1][1] = 'H'; g[1][9] = 'S';
    let pos;
    do { pos = []; for (let x = 2; x <= 8; x++) if (Math.random() < 0.5) pos.push(x); } while (pos.length < minE || pos.length > maxE);
    const names = shuffle(NOMBRES.slice());
    const enemies = pos.map((x, i) => { g[1][x] = 'E'; return { name: names[i], hp: rnd(hpMin, hpMax) }; });
    return { map: toRows(g), enemies };
  };
}

function laberinto() {
  const cw = 6, ch = 4, w = cw * 2 + 1, h = ch * 2 + 1, g = blank(w, h);
  const seen = new Set(['0,0']); const stack = [[0, 0]]; g[1][1] = '.';
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const nb = shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]])
      .map(([dx, dy]) => [cx + dx, cy + dy, dx, dy])
      .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < cw && ny < ch && !seen.has(nx + ',' + ny));
    if (!nb.length) { stack.pop(); continue; }
    const [nx, ny, dx, dy] = nb[0];
    seen.add(nx + ',' + ny);
    g[cy * 2 + 1 + dy][cx * 2 + 1 + dx] = '.'; g[ny * 2 + 1][nx * 2 + 1] = '.';
    stack.push([nx, ny]);
  }
  g[1][1] = 'H'; g[h - 2][w - 2] = 'S';
  return { map: toRows(g), enemies: [] };
}

// Pasillo con puertas (barreras) que se abren diciendo la respuesta correcta.
// H en x=1, barreras en x=3, 5, 7…, salida justo detrás de la última.
function pasilloPuertas(puertas, extra) {
  const w = 2 * puertas.length + 4, g = blank(w, 3);
  for (let x = 1; x <= w - 2; x++) g[1][x] = '.';
  g[1][1] = 'H'; puertas.forEach((p, i) => { g[1][3 + 2 * i] = 'D'; });
  g[1][2 + 2 * puertas.length] = 'S';
  return Object.assign({ map: toRows(g), enemies: [], doors: puertas }, extra || {});
}

const LEVELS = [
  {
    clave: 'celda', title: "La celda", concept: "Instrucciones", goals: ["salida"], maxLines: null,
    nuevos: ["derecha", "izquierda", "arriba", "abajo", "print"],
    intro: `<p>Te has despertado en una celda de la base. Para moverte, guarda en una <b>variable</b> con el nombre de la dirección los pasos que quieres dar:</p><pre>derecha = 2</pre><p>En cuanto guardas el valor, tu agente se mueve. Las direcciones son <code>derecha</code>, <code>izquierda</code>, <code>arriba</code> y <code>abajo</code>. Escribe una en la <b>consola de debajo del mapa</b> y pulsa Enter: cada línea se apunta en el editor, y al final puedes lanzar el programa entero con <b>Ejecutar</b>.</p><p>Tienes <b>3 vidas</b>: cada vez que te chocas pierdes una, pero sigues donde estabas.</p>`,
    hint: `Cuenta las casillas en el mapa antes de escribir cada número.`,
    starter: `# Cada línea guarda un valor en una variable y tu agente se mueve\n`,
    make: () => ({ map: ["#######", "#H..###", "###.###", "###..S#", "#######"], enemies: [] })
  },
  {
    clave: 'gemas', title: "El pasillo de las gemas", concept: "Números", goals: ["gemas", "salida"], maxLines: 3,
    nuevos: [],
    intro: `<p>El valor que guardas es el <b>número de pasos</b>. Es un número entero, un <code>int</code>: va <b>sin comillas</b> y sin decimales.</p><pre>derecha = 7</pre><p>Recoge las dos gemas y llega a la salida. Si tienes curiosidad, prueba en la consola <code>derecha = "7"</code> o <code>derecha = 7.5</code> y lee lo que pasa.</p>`,
    hint: `Piensa el camino como tres tramos rectos.`,
    starter: `derecha = 7\n`,
    make: () => ({ map: ["##########", "#H....g..#", "########.#", "#S..g....#", "##########"], enemies: [] })
  },
  {
    clave: 'guardias', title: "Los bugs", concept: "Textos (str)", goals: ["salida"], maxLines: 7,
    nuevos: ["atacar"],
    intro: `<p>Dos bugs te cortan el paso. Se llaman como los errores de Python. Para atacar, guarda su nombre en la variable <code>atacar</code>. Un nombre es un texto, así que va <b>entre comillas</b>:</p><pre>atacar = "SyntaxError"</pre><p>Un texto entre comillas es un <b>string</b> (<code>str</code>). Cada vez que guardas un nombre en <code>atacar</code> das un golpe, y cada bug aguanta 2. Tienes que estar <b>pegado</b> a él.</p>`,
    hint: `Cada bug aguanta 2 golpes, y en su nombre cuentan las mayúsculas.`,
    starter: `derecha = 1\n`,
    make: () => ({ map: ["###########", "#H.E...E.S#", "###########"], enemies: [{ name: "SyntaxError", hp: 2 }, { name: "NameError", hp: 2 }] })
  },
  {
    clave: 'escalones', title: "Los escalones", concept: "Variables", goals: ["salida"], maxLines: 6,
    nuevos: [],
    intro: `<p>Una variable puede guardar un valor para usarlo después. Los tres escalones miden lo mismo: 3 casillas. Guárdalo en la variable <code>pasos</code> y úsala:</p><pre>pasos = 3\nderecha = pasos</pre><p>El <code>=</code> no significa «igual»: significa «guarda este valor con este nombre». A la derecha del <code>=</code> puede ir un número o el nombre de otra variable.</p>`,
    hint: `Los tres escalones miden lo mismo: el 3 solo debería aparecer una vez en tu código.`,
    starter: `pasos = 3\nderecha = pasos\n`,
    comprobar: v => v.pasos === 3 ? [] : [v.pasos === undefined ? 'Te falta crear la variable pasos con el valor 3.' : `La variable pasos vale ${JSON.stringify(v.pasos)}, pero tenía que valer 3.`],
    make: () => {
      const g = blank(12, 5); let x = 1, y = 1; g[y][x] = 'H';
      for (let k = 0; k < 3; k++) { for (let i = 0; i < 3; i++) g[y][++x] = '.'; if (k < 2) g[++y][x] = '.'; }
      g[y][x] = 'S';
      return { map: toRows(g), enemies: [] };
    }
  },
  {
    clave: 'clave', title: "La puerta con clave", concept: "Variables de texto (str)", goals: ["salida"], maxLines: 4,
    nuevos: ["respuesta"],
    intro: `<p>La barrera solo se abre con la contraseña que pone la <b>placa</b>: la pantalla de la pared, encima de tu agente. Léela y guárdala en una variable llamada <code>clave</code>. Una contraseña es un <b>texto</b>, así que va <b>entre comillas</b>:</p><pre>clave = "..."</pre><p>Para contestar a la barrera, guarda lo que quieras decirle en la variable <code>respuesta</code> cuando estés a su lado. Ahí puedes usar tu variable: los nombres de variable van <b>sin comillas</b>.</p>`,
    hint: `Entre comillas va el texto tal cual; sin comillas, el nombre de una variable.`,
    starter: `# Lee la placa y guarda la contraseña en la variable clave\n`,
    make: () => ({ map: ["#########", "#C#######", "#H..D..S#", "#########"], enemies: [], signo: CLAVE_SESION, placaAMano: true, doors: [{ respuesta: CLAVE_SESION, etiqueta: '?', pista: t => t === 'clave' ? 'Le has dicho la palabra «clave», no lo que guarda la variable: quita las comillas.' : t.toLowerCase() === CLAVE_SESION ? 'Casi: fíjate en las mayúsculas.' : 'Esa no es la contraseña: revisa lo que pone la placa, letra a letra.' }] })
  },
  {
    clave: 'constantes', title: "Las constantes de la base", concept: "Constantes", goals: ["salida"], maxLines: 5,
    nuevos: [],
    intro: `<p>Una <b>constante</b> es una variable que no va a cambiar nunca. En Python se escriben en <b>MAYÚSCULAS</b> y se ponen al principio del programa:</p><pre>ANCHO = 4\nALTO = 2</pre><p>Python no impide cambiarlas, pero es una norma que todo el mundo respeta. Define <code>ANCHO</code> y <code>ALTO</code> con las medidas de la torre y úsalas para llegar arriba.</p>`,
    hint: `Mayúsculas y minúsculas son nombres distintos.`,
    starter: `# Constantes de la torre (siempre en MAYÚSCULAS)\nANCHO = 4\n\nderecha = ANCHO\n`,
    comprobar: v => {
      const m = [];
      [['ANCHO', 4], ['ALTO', 2]].forEach(([n, val]) => {
        if (v[n] === val) return;
        if (v[n.toLowerCase()] !== undefined) m.push(`Las constantes van en MAYÚSCULAS: escribe ${n}, no ${n.toLowerCase()}.`);
        else if (v[n] === undefined) m.push(`Falta la constante ${n} = ${val}.`);
        else m.push(`${n} vale ${JSON.stringify(v[n])}, pero la torre mide ${val}.`);
      });
      return m;
    },
    make: () => ({ map: ["###########", "#####....S#", "#####.#####", "#H....#####", "###########"], enemies: [] })
  },
  {
    clave: 'tesoro', title: "La cámara del tesoro", concept: "Operadores matemáticos", goals: ["salida"], maxLines: 8, random: true,
    nuevos: ["operadores"],
    intro: `<p>En esta cámara hay <code>cofres</code> llenos de <code>oro</code> y unos <code>ladrones</code> esperando su parte. Esas tres variables <b>ya existen</b> y cambian en cada partida (míralas con <code>print(oro)</code>). Cada barrera pide un cálculo, que guardas en <code>respuesta</code>:</p><pre>barrera ×   oro total:     oro * cofres\nbarrera //  a cada ladrón: total // ladrones\nbarrera %   lo que sobra:  total % ladrones</pre><p>Guarda el total en una variable para no repetir el cálculo.</p>`,
    hint: `Mira los valores con <code>print()</code>. Repartir sin decimales no es lo mismo que dividir.`,
    starter: `print("Oro por cofre:", oro)\nprint("Cofres:", cofres)\nprint("Ladrones:", ladrones)\n`,
    make: () => {
      const oro = rnd(12, 40), cofres = rnd(2, 5), ladrones = rnd(3, 7), total = oro * cofres;
      const pista = (bien) => t => {
        if (String(t).includes('.')) return `Has dicho ${t}: con / sale un decimal. Para dividir en enteros usa //.`;
        if (String(t) === String(oro)) return 'Eso es el oro de un solo cofre. Multiplica por los cofres.';
        return `Esa no es. ${bien}`;
      };
      return pasilloPuertas([
        { respuesta: String(total), etiqueta: '×', pista: pista('Pide el oro total: oro * cofres.') },
        { respuesta: String(Math.floor(total / ladrones)), etiqueta: '//', pista: pista('Pide lo que le toca a cada ladrón: total // ladrones.') },
        { respuesta: String(total % ladrones), etiqueta: '%', pista: pista('Pide lo que sobra del reparto: total % ladrones.') }
      ], { vars: { oro, cofres, ladrones } });
    }
  },
  {
    clave: 'palabras', title: "Las palabras mágicas", concept: "Bloques de texto", goals: ["salida"], maxLines: null, random: true,
    nuevos: ["textos"],
    intro: `<p>Tres barreras que solo se abren con palabras. Las variables <code>guardian</code> (un nombre) y <code>veces</code> (un número) ya existen y cambian en cada partida. Contesta a cada barrera con <code>respuesta</code>:</p><pre>barrera +    "Hola, " + guardian\nbarrera *    "ja" * veces\nbarrera """  el pergamino de 3 líneas</pre><p>El pergamino es un <b>bloque de texto</b>: un texto de varias líneas escrito entre <b>comillas triples</b>:</p><pre>hechizo = """Uno para el sol\nDos para la luna\nTres para abrir"""</pre><p>Este nivel es mejor resolverlo en el editor con <b>Ejecutar</b>, porque la consola es de una sola línea.</p>`,
    hint: `El texto tiene que ser exacto: fíjate en cada coma y cada espacio.`,
    starter: `hechizo = """Uno para el sol\nDos para la luna\nTres para abrir"""\n\nderecha = 1\n`,
    make: () => {
      const guardian = NOMBRES[rnd(0, NOMBRES.length - 1)], veces = rnd(2, 5), hechizo = 'Uno para el sol\nDos para la luna\nTres para abrir';
      return pasilloPuertas([
        { respuesta: 'Hola, ' + guardian, etiqueta: '+', pista: t => String(t).replace(/[ ,]/g, '').toLowerCase() === ('Hola' + guardian).toLowerCase() ? `Casi: tiene que quedar exactamente «Hola, ${guardian}», con la coma y el espacio.` : 'Esta barrera quiere un saludo: "Hola, " + guardian.' },
        { respuesta: 'ja'.repeat(veces), etiqueta: '*', pista: t => /^(ja)+$/.test(String(t)) ? `Son ${String(t).length / 2} «ja», pero tienen que ser veces (usa "ja" * veces).` : 'Esta barrera quiere una risa: "ja" repetido veces.' },
        { respuesta: hechizo, etiqueta: '"""', pista: t => String(t).split('\n').length < 3 ? 'El pergamino tiene 3 líneas: escríbelo entre comillas triples """...""".' : 'Revisa el pergamino letra a letra: tiene que ser idéntico.' }
      ], { vars: { guardian, veces } });
    }
  },
  {
    clave: 'roto', title: "Código roto", concept: "Errores", goals: ["salida"], maxLines: null,
    nuevos: [],
    intro: `<p>Un aprendiz ha dejado un programa que <b>tiene tres errores</b>. Ejecútalo, lee el mensaje de la consola (y la línea marcada en rojo) y arréglalo. Repite hasta que funcione.</p><ul><li><b>SyntaxError</b>: algo mal escrito (comillas, paréntesis…).</li><li><b>NameError</b>: un nombre que Python no conoce.</li><li><b>TypeError</b>: mezclar tipos que no casan, como texto + número.</li></ul>`,
    hint: `Lee el error y mira la línea que marca. Arregla uno cada vez y vuelve a ejecutar.`,
    starter: `# Este programa tiene 3 errores. Ejecútalo y arréglalos uno a uno.\npasos = 3\nderecha = paso\n\ngemas = 3\nmensaje = "Llevo " + gemas + " gemas"\nrespuesta = mensaje\n\nderecha = pasos + 1\nprint("¡Fuera!)\n`,
    make: () => ({ map: ["##########", "#H...D..S#", "##########"], enemies: [], doors: [{ respuesta: 'Llevo 3 gemas', etiqueta: '!', pista: t => `Has dicho «${t}», pero la barrera espera «Llevo 3 gemas».` }] })
  },
  {
    clave: 'placa', title: "La placa de los pasos", concept: "Conversiones: int()", goals: ["salida"], maxLines: 4, random: true,
    nuevos: ["placa", "int", "str"],
    intro: `<p>La placa (la pantalla de la pared) dice cuántos pasos hay hasta la barrera, pero la variable <code>placa</code> siempre es un <b>texto</b>: <code>"4"</code>, no <code>4</code>. Con <code>derecha = placa</code> el juego se queja. Para usarlo como número hay que <b>convertirlo</b>: <code>int("4")</code> da <code>4</code>.</p><p>Avanza ese número de pasos y contesta a la barrera con <b>el doble</b> del número de la placa. Si te olvidas de <code>int()</code>, <code>"4" * 2</code> te da <code>"44"</code>…</p>`,
    hint: `Prueba <code>print(type(placa))</code>. ¿Cómo se convierte un texto en número?`,
    starter: `print(placa, type(placa))\n`,
    make: () => {
      const n = rnd(2, 6), g = blank(11, 4);
      for (let x = 1; x <= 3 + n; x++) g[2][x] = '.';
      g[1][1] = 'C'; g[2][1] = 'H'; g[2][2 + n] = 'D'; g[2][3 + n] = 'S';
      return { map: toRows(g), enemies: [], signo: String(n), doors: [{ respuesta: String(2 * n), etiqueta: '×2', pista: t => String(t) === String(n).repeat(2) ? `Has dicho «${t}»: has repetido un texto. Conviértelo antes con int().` : `La barrera quiere el doble del número de la placa.` }] };
    }
  },
  {
    clave: 'guardian', title: "El guardián pregunta", concept: "Entrada: input()", goals: ["salida"], maxLines: 6, random: true,
    nuevos: ["input"],
    intro: `<p><code>input()</code> le hace una pregunta a la persona que está jugando (¡tú!) y devuelve lo que escribe, <b>siempre como texto</b>:</p><pre>texto = input("¿Cuántos pasos? ")</pre><p>El pasillo mide algo distinto cada vez. Pregunta cuántos pasos hay hasta la barrera (cuéntalos en el mapa cuando salga la pregunta), conviértelo con <code>int()</code> y avanza. Luego pregunta tu nombre y contesta a la barrera con <code>"Soy "</code> + tu nombre.</p>`,
    hint: `<code>input()</code> siempre devuelve un texto.`,
    starter: `pasos = input("¿Cuántos pasos hay hasta la barrera? ")\nprint(pasos, type(pasos))\n`,
    comprobar: (v, s) => s.preguntas >= 2 ? [] : ['Tienes que usar input() para preguntar los pasos y tu nombre.'],
    make: () => {
      const n = rnd(3, 6), g = blank(11, 3);
      for (let x = 1; x <= 3 + n; x++) g[1][x] = '.';
      g[1][1] = 'H'; g[1][2 + n] = 'D'; g[1][3 + n] = 'S';
      return { map: toRows(g), enemies: [], doors: [{ valida: t => /^Soy \S/.test(String(t)), etiqueta: '?', pista: () => 'La barrera quiere oír «Soy » seguido de tu nombre: "Soy " + nombre.' }] };
    }
  },
  {
    clave: 'verdad', title: "Las barreras de la verdad", concept: "Comparaciones y lógica", goals: ["salida"], maxLines: 8, random: true,
    nuevos: [],
    intro: `<p>La variable <code>numero</code> ya existe y cambia en cada partida. Cada barrera pide <code>True</code> o <code>False</code>, y Python lo calcula por ti con una <b>comparación</b>:</p><pre>barrera >    numero > 10\nbarrera ==   numero % 2 == 0     (¿es par?)\nbarrera and  numero > 10 and numero % 2 == 0</pre><p>Guarda el resultado en <code>respuesta</code>: <code>respuesta = numero > 10</code>.</p>`,
    hint: `No escribas True ni False a mano: deja que Python compare.`,
    starter: `print("El número es", numero)\nderecha = 1\n`,
    make: () => {
      const numero = rnd(1, 30), b = x => x ? 'True' : 'False';
      const pista = q => t => /^(true|false|si|sí|no)$/i.test(String(t)) && !/^(True|False)$/.test(String(t)) ? 'Guarda el resultado de la comparación, por ejemplo respuesta = numero > 10. Python escribe True y False con mayúscula.' : `La pregunta de esta barrera es: ${q}`;
      return pasilloPuertas([
        { respuesta: b(numero > 10), etiqueta: '>', pista: pista('¿numero > 10?') },
        { respuesta: b(numero % 2 === 0), etiqueta: '==', pista: pista('¿numero % 2 == 0? (¿es par?)') },
        { respuesta: b(numero > 10 && numero % 2 === 0), etiqueta: 'and', pista: pista('¿numero > 10 and numero % 2 == 0?') }
      ], { vars: { numero } });
    }
  },
  {
    clave: 'caracol', title: "La escalera de caracol", concept: "Bucle for", goals: ["gemas", "salida"], maxLines: 3,
    nuevos: [],
    intro: `<p>La escalera repite el mismo movimiento 4 veces: dos a la derecha y uno abajo. En vez de copiar y pegar, usa un <b>bucle</b>:</p><pre>for i in range(4):\n    # lo que se repite</pre><p>Todo lo que esté <b>sangrado</b> (4 espacios a la derecha) debajo del <code>for</code> se repite.</p>`,
    hint: `¿Qué se repite exactamente en cada escalón?`,
    starter: `for i in range(4):\n    \n`,
    make: () => {
      const g = blank(11, 7); let x = 1, y = 1; g[y][x] = 'H';
      for (let k = 0; k < 4; k++) { g[y][++x] = '.'; g[y][++x] = 'g'; g[++y][x] = '.'; }
      g[y][x] = 'S';
      return { map: toRows(g), enemies: [] };
    }
  },
  {
    clave: 'sinfin', title: "El pasillo sin fin", concept: "Bucle while", goals: ["salida"], maxLines: 3, random: true,
    nuevos: ["camino"],
    intro: `<p>Cada vez que ejecutas, el pasillo mide algo distinto. El juego tiene la variable <code>camino_derecha</code>: vale <code>True</code> si puedes avanzar a la derecha. Un <code>while</code> repite lo que tiene sangrado <b>mientras</b> la condición sea <code>True</code>:</p><pre>while condición:\n    ...</pre><p>Cuando se acabe el pasillo, la salida está justo debajo.</p>`,
    hint: `Cuando el bucle termina, ¿dónde está la salida?`,
    starter: `while camino_derecha:\n    \n`,
    make: () => {
      const L = rnd(4, 10), g = blank(13, 4);
      for (let x = 1; x <= 1 + L; x++) g[1][x] = '.';
      g[1][1] = 'H'; g[2][1 + L] = 'S';
      return { map: toRows(g), enemies: [] };
    }
  },
  {
    clave: 'emboscada', title: "Emboscada", concept: "Condicionales if", goals: ["salida"], maxLines: 5, random: true,
    nuevos: ["enemigo"],
    intro: `<p>Hay bugs en sitios que cambian en cada partida. Avanza casilla a casilla y, <b>si</b> tienes un enemigo al lado, atácalo antes de seguir.</p><p><code>enemigo</code> es una variable del juego: tiene el nombre del bug que tienes al lado, o <code>None</code> si no hay nadie. Un <code>if</code> con <code>None</code> funciona como <code>False</code>. Estos bugs caen de un golpe.</p>`,
    hint: `En cada paso, mira primero si hay enemigo y luego avanza.`,
    starter: `for i in range(8):\n    derecha = 1\n`,
    make: pasilloConGuardias(1, 1, 2, 4)
  },
  {
    clave: 'tozudos', title: "Bugs tozudos", concept: "while dentro de for", goals: ["salida"], maxLines: 5, random: true,
    nuevos: [],
    intro: `<p>Estos bugs aguantan entre 1 y 3 golpes, y no sabes cuántos. Tienes que atacar <b>mientras</b> siga habiendo un enemigo a tu lado.</p><p>Es un bucle <code>while</code> metido dentro de un bucle <code>for</code>. Fíjate bien en la sangría: cada nivel, 4 espacios más.</p>`,
    hint: `Un <code>if</code> mira una sola vez; un <code>while</code> repite mientras se cumpla.`,
    starter: `for i in range(8):\n    derecha = 1\n`,
    make: pasilloConGuardias(1, 3, 3, 5)
  },
  {
    clave: 'columnas', title: "La escalera del doble", concept: "Funciones (def y return)", goals: ["gemas", "salida"], maxLines: 5,
    nuevos: ["funciones"],
    intro: `<p>Cada tramo de esta escalera mide el doble que su número: el tramo 1 mide 2, el 2 mide 4 y el 3 mide 6. Crea tu propia <b>función</b> que calcule el doble de un número y te lo <b>devuelva</b> con <code>return</code>:</p><pre>def doble(n):\n    return n * 2</pre><p>Definirla no hace nada por sí solo. Hay que <b>llamarla</b> con un dato entre paréntesis, y lo que devuelve se puede guardar en una variable: <code>derecha = doble(3)</code>.</p>`,
    hint: `Llama a tu función dentro de un bucle.`,
    starter: `def doble(n):\n    return n * 2\n\nprint(doble(3))\n`,
    make: () => {
      const g = blank(16, 6); let x = 1, y = 1; g[y][x] = 'H';
      for (let n = 1; n <= 3; n++) { for (let k = 0; k < 2 * n; k++) g[y][++x] = '.'; g[y][x] = 'g'; g[++y][x] = '.'; }
      g[y][x] = 'S';
      return { map: toRows(g), enemies: [] };
    }
  },
  {
    clave: 'laberinto', title: "El laberinto", concept: "Algoritmos", goals: ["salida"], maxLines: null, random: true,
    nuevos: ["hay_camino", "mover", "en_salida"],
    intro: `<p>Un laberinto distinto en cada partida. Hay un truco clásico: la <b>regla de la mano derecha</b>. Si apoyas la mano en la pared de tu derecha y nunca la sueltas, acabas encontrando la salida.</p><p>En cada paso: si puedes girar a la derecha, gira; si no, sigue recto; si tampoco, gira a la izquierda; y si no hay nada, date la vuelta. Guarda hacia dónde miras en una variable y usa una lista de direcciones. La función del juego <code>hay_camino(direccion)</code> te dice si puedes ir hacia allí, y <code>mover = direccion</code> da un paso.</p>`,
    hint: `Mano derecha en la pared: antes que nada, intenta girar a la derecha.`,
    starter: `direcciones = ["arriba", "derecha", "abajo", "izquierda"]\nmirando = 1  # miras a la derecha (posición 1)\n\nwhile not en_salida:\n    dcha = (mirando + 1) % 4  # lo que queda a tu derecha\n    # 1) ¿Camino a la derecha? Gira hacia allí\n    # 2) Si no, ¿camino de frente? Sigue recto\n    # 3) Si no, gira a la izquierda o date la vuelta\n    mover = direcciones[mirando]\n`,
    make: laberinto
  },
  {
    clave: 'potencias', title: "La torre de las potencias", concept: "Potencias y prioridad", goals: ["salida"], maxLines: 7, random: true,
    nuevos: [],
    intro: `<p>Más operadores. <code>**</code> es la <b>potencia</b>: <code>2 ** 3</code> es 2 × 2 × 2 = 8. Y cuidado con el <b>orden</b>: igual que en mates, Python hace primero <code>**</code>, luego <code>* / // %</code> y al final <code>+ -</code>. Los paréntesis van siempre primero.</p><pre>barrera **   base ** exponente\nbarrera +*   base + extra * 2\nbarrera ()   (base + extra) * 2</pre><p>Las variables <code>base</code>, <code>exponente</code> y <code>extra</code> ya existen y cambian en cada partida. Contesta con <code>respuesta</code>.</p>`,
    hint: `Deja que Python haga las cuentas y acuérdate del orden de las operaciones.`,
    starter: `print(base, exponente, extra)\nderecha = 1\n`,
    make: () => {
      const base = rnd(3, 5), exponente = rnd(2, 3), extra = rnd(2, 6); // con base 2 y exponente 2, 2*2 == 2**2
      const r1 = base ** exponente, r2 = base + extra * 2, r3 = (base + extra) * 2;
      return pasilloPuertas([
        { respuesta: String(r1), etiqueta: '**', pista: t => String(t) === String(base * exponente) ? `Has dicho ${t}: eso es base * exponente. La potencia es **.` : 'Esta barrera pide base ** exponente.' },
        { respuesta: String(r2), etiqueta: '+*', pista: t => String(t) === String(r3) ? 'Ojo con la prioridad: * se hace antes que +. Python calcula primero extra * 2.' : 'Esta barrera pide base + extra * 2.' },
        { respuesta: String(r3), etiqueta: '()', pista: t => String(t) === String(r2) ? 'Aquí hay paréntesis: (base + extra) se calcula primero.' : 'Esta barrera pide (base + extra) * 2.' }
      ], { vars: { base, exponente, extra } });
    }
  },
  {
    clave: 'roto2', title: "Código roto 2", concept: "Más errores", goals: ["salida"], maxLines: null,
    nuevos: [],
    intro: `<p>Otro programa estropeado, con <b>tres errores</b> distintos de los de antes. Ejecútalo, lee cada mensaje y arréglalo:</p><ul><li><b>IndentationError</b>: espacios de más al principio de una línea.</li><li><b>NameError</b>: Python distingue MAYÚSCULAS y minúsculas.</li><li><b>ValueError</b>: <code>int()</code> solo convierte textos que son números, como <code>"3"</code>.</li></ul>`,
    hint: `Cada error te dice su línea. Python distingue mayúsculas de minúsculas.`,
    starter: `# Otro programa con 3 errores. Ejecútalo y arréglalos uno a uno.\nALTO = 2\n  derecha = 2\narriba = alto\n\npasos = int("tres")\nderecha = pasos\n`,
    make: () => ({ map: ["########", "###...S#", "###.####", "#H..####", "########"], enemies: [] })
  }
];

// ---------- minibosses: al final de cada mundo, preguntas sobre tipos ----------
// Cada pregunta espera un valor guardado en una variable concreta (var).
// valida(v, tipo, s) recibe el valor como texto y su tipo de Python, y
// devuelve true o una pista.
const TIPOS = {
  str: { nombres: ['str', 'string', 'texto', 'cadena'], pista: 'Piensa: ¿lleva comillas?' },
  int: { nombres: ['int', 'entero', 'integer'], pista: 'Piensa: es un número sin decimales.' },
  float: { nombres: ['float', 'decimal'], pista: 'Piensa: es un número con decimales.' },
  bool: { nombres: ['bool', 'boolean', 'booleano'], pista: 'Piensa: solo puede valer True o False.' }
};
// «¿de qué tipo es…?»: se contesta con tipo = "str" (o "texto", o type(x))
function pideTipo(esperado, deQue) {
  return {
    var: 'tipo', pregunta: `¿Y de qué tipo es ${deQue}? Guárdalo en la variable tipo.`, corta: '¿De qué tipo es?',
    valida: (v, t) => {
      const r = v.trim().toLowerCase().replace(/^<class '(\w+)'>$/, '$1');
      if (TIPOS[esperado].nombres.includes(r)) return true;
      const otro = Object.keys(TIPOS).find(k => TIPOS[k].nombres.includes(r));
      if (otro) return `¡No! No es ${otro}. ${TIPOS[esperado].pista}`;
      return t !== 'str' ? `El nombre del tipo es un texto: va entre comillas, tipo = "int"` : `Los tipos que conoces son "str", "int", "float" y "bool".`;
    }
  };
}
const valor = (s, n) => s.valores[n];
function nivelJefe(nombre, pasos, datos) {
  return () => Object.assign({ map: ['##########', '#H.....DS#', '##########'], enemies: [], doors: [{ etiqueta: '!', jefe: { nombre, pasos } }] }, datos || {});
}
const JEFES = [
  {
    clave: 'jefe1', title: "Miniboss: el Portero", concept: "Textos (str)", goals: ["salida"], maxLines: null,
    nuevos: ["tipos"],
    intro: `<p>El <b>Portero</b> quiere saber cómo te llamas. Crea la variable <code>nombre</code> con tu nombre. Un nombre es un <b>texto</b>, así que va <b>entre comillas</b>:</p><pre>nombre = "Carlos"</pre><p>Luego te preguntará <b>de qué tipo</b> es. Contesta guardándolo, entre comillas, en la variable <code>tipo</code>:</p><pre>tipo = "..."</pre><p>Los tipos que vas a usar:</p><pre>"Carlos"   str    texto (lleva comillas)\n16         int    número entero\n1.75       float  número con decimales\nTrue       bool   verdadero o falso</pre><p>Ponte a su lado para que te oiga.</p>`,
    hint: `Primero acércate. Un nombre lleva comillas… ¿y de qué tipo es un texto?`,
    starter: `derecha = 5\n`,
    make: nivelJefe('Portero', [
      { var: 'nombre', pregunta: '¿Cómo te llamas? Guárdalo en la variable nombre.', corta: '¿nombre?', valida: (v, t) => t !== 'str' ? 'Un nombre es un texto: ponlo entre comillas, nombre = "Ana"' : !v.trim() ? 'Tu nombre está vacío.' : /^\d+$/.test(v.trim()) ? 'Eso es un número entre comillas. ¡Dime tu nombre!' : true },
      pideTipo('str', 'tu nombre')
    ])
  },
  {
    clave: 'jefe2', title: "Miniboss: la Guardiana", concept: "Números enteros (int)", goals: ["salida"], maxLines: null,
    intro: `<p>La <b>Guardiana</b> quiere saber tu edad. Crea la variable <code>edad</code>. Es un número, así que va <b>sin comillas</b>:</p><pre>edad = 16</pre><p>Después te preguntará de qué tipo es. Contesta con la variable <code>tipo</code>, como con el Portero.</p>`,
    hint: `¿Un número lleva comillas?`,
    starter: `derecha = 5\n`,
    make: nivelJefe('Guardiana', [
      { var: 'edad', pregunta: '¿Cuántos años tienes? Guárdalo en la variable edad.', corta: '¿edad?', valida: (v, t) => t === 'str' ? 'edad tiene comillas, así que es un texto. Quítaselas: edad = 16' : t === 'float' ? 'Con decimales no: la edad es un número entero, edad = 16' : t !== 'int' ? 'La edad es un número entero: edad = 16' : true },
      pideTipo('int', 'tu edad')
    ])
  },
  {
    clave: 'jefe3', title: "Miniboss: el Eco", concept: "Unir textos", goals: ["salida"], maxLines: null,
    intro: `<p>El <b>Eco</b> repite lo que oye. Crea la variable <code>nombre</code> y otra, <code>saludo</code>, que junte <code>"Hola, "</code> con tu nombre usando <code>+</code>:</p><pre>nombre = "Carlos"\nsaludo = "Hola, " + nombre</pre><p>Luego te hará una pregunta trampa sobre tipos. Fíjate bien en las comillas.</p>`,
    hint: `Fíjate bien en las comillas: lo que va entre comillas siempre es…`,
    starter: `nombre = "Carlos"\nderecha = 5\n`,
    make: nivelJefe('Eco', [
      { var: 'saludo', pregunta: 'Guarda en saludo "Hola, " + tu nombre.', corta: '¿saludo?', valida: (v, t, s) => !valor(s, 'nombre') ? 'Primero crea la variable nombre: nombre = "Carlos"' : t !== 'str' ? 'saludo tiene que ser un texto.' : v !== 'Hola, ' + valor(s, 'nombre').v ? `saludo vale «${v}», pero tenía que ser «Hola, ${valor(s, 'nombre').v}». Ojo con la coma y el espacio.` : true },
      pideTipo('str', '"7" (con comillas)')
    ])
  },
  {
    clave: 'jefe4', title: "Miniboss: la Calculadora", concept: "Decimales (float)", goals: ["salida"], maxLines: null,
    intro: `<p>La <b>Calculadora</b> quiere repartir 7 gemas entre 2. Guarda en la variable <code>media</code> el resultado de dividir 7 entre 2, <b>exacto</b>. Recuerda que en Python hay dos divisiones: <code>/</code> y <code>//</code>. Después te preguntará de qué tipo es.</p>`,
    hint: `¿Qué división conserva los decimales?`,
    starter: `derecha = 5\n`,
    make: nivelJefe('Calculadora', [
      { var: 'media', pregunta: 'Guarda 7 / 2 en la variable media.', corta: '¿media?', valida: (v, t) => t === 'int' ? `media vale ${v}: has perdido los decimales. Usa / en vez de //.` : t !== 'float' || v !== '3.5' ? 'media tiene que ser el resultado de 7 / 2.' : true },
      pideTipo('float', 'media')
    ])
  },
  {
    clave: 'jefe5', title: "Miniboss: el Interrogador", concept: "input() devuelve str", goals: ["salida"], maxLines: null,
    intro: `<p>El <b>Interrogador</b> quiere que preguntes tu edad con <code>input()</code> y la guardes en <code>edad</code>:</p><pre>edad = input("¿Cuántos años tienes? ")</pre><p>Te preguntará de qué tipo es lo que te da <code>input()</code> (contesta con <code>tipo</code>). Y al final querrá tu edad convertida en número entero, guardada en la variable <code>numero</code>.</p>`,
    hint: `<code>input()</code> siempre devuelve un texto, aunque escribas un número.`,
    starter: `edad = input("¿Cuántos años tienes? ")\nprint(edad, type(edad))\nderecha = 5\n`,
    make: nivelJefe('Interrogador', [
      { var: 'edad', pregunta: 'Pregunta tu edad con input() y guárdala en edad.', corta: '¿edad?', valida: (v, t, s) => s.preguntas < 1 ? 'Tienes que preguntar la edad con input(): edad = input("¿Cuántos años tienes? ")' : true },
      pideTipo('str', 'lo que te da input()'),
      { var: 'numero', pregunta: 'Ahora conviértela en número: numero = int(edad)', corta: '¿numero?', valida: (v, t) => t === 'str' ? 'numero sigue siendo un texto. Conviértelo: numero = int(edad)' : t !== 'int' ? 'Quiero un número entero: numero = int(edad)' : true }
    ])
  },
  {
    clave: 'jefe6', title: "Miniboss: el Gran Bug", concept: "Mezclar tipos", goals: ["salida"], maxLines: null, random: true,
    intro: `<p>El <b>Gran Bug</b> quiere que guardes en <code>frase</code> el texto <code>Tengo … años</code> con el número de la variable <code>edad</code>, que ya existe y cambia en cada partida. El programa de abajo da error: ejecútalo, lee el error y arréglalo.</p><p>No se puede juntar un texto con un número usando <code>+</code>. Convierte el número con <code>str()</code>.</p>`,
    hint: `No se puede juntar un texto con un número: uno de los dos tiene que cambiar de tipo.`,
    starter: `derecha = 5\nfrase = "Tengo " + edad + " años"\n`,
    make: () => { const edad = rnd(12, 19); return nivelJefe('Gran Bug', [
      { var: 'frase', pregunta: 'Guarda en frase "Tengo … años" usando la variable edad.', corta: '¿frase?', valida: v => v === `Tengo ${edad} años` ? true : v.includes(String(edad)) ? `Casi: tiene que ser exactamente «Tengo ${edad} años», con los espacios.` : 'Usa la variable edad: "Tengo " + str(edad) + " años"' },
      pideTipo('int', 'la variable edad')
    ], { vars: { edad } })(); }
  },
  {
    clave: 'jefe8', title: "Miniboss: el Juez", concept: "Verdadero o falso (bool)", goals: ["salida"], maxLines: null, random: true,
    intro: `<p>El <b>Juez</b> solo acepta verdades. La variable <code>numero</code> ya existe y cambia en cada partida. Guarda en la variable <code>mayor</code> si <code>numero</code> es mayor que 10 (sin escribir tú True o False). Una comparación da <code>True</code> o <code>False</code>. ¿De qué tipo es eso?</p>`,
    hint: `Una comparación ya da True o False: no lo escribas tú.`,
    starter: `print(numero)\nderecha = 5\n`,
    make: () => { const numero = rnd(3, 20); return nivelJefe('Juez', [
      { var: 'mayor', pregunta: 'Guarda en mayor si numero es mayor que 10.', corta: '¿mayor?', valida: (v, t) => t !== 'bool' ? 'mayor tiene que ser una comparación, sin comillas: mayor = numero > 10' : v !== (numero > 10 ? 'True' : 'False') ? 'Esa comparación no es la que te pido: numero > 10' : true },
      pideTipo('bool', 'mayor')
    ], { vars: { numero } })(); }
  }
];
JEFES.forEach(j => LEVELS.push(j));

// ---------- condicionales y bucles ----------
// bifurcación: un pasillo arriba y otro abajo; solo uno llega a la salida
// Los dos pasillos acaban en una compuerta igual; solo una es la salida y
// no se ve cuál hasta llegar. Lo dicen las variables pared_arriba/pared_abajo.
function bifurcacion(bueno) {
  const g = blank(10, 7);
  g[3][1] = 'H'; g[3][2] = '.'; for (let y = 1; y <= 5; y++) g[y][3] = '.';
  for (const [dir, fila] of [['arriba', 1], ['abajo', 5]]) {
    for (let x = 4; x <= 6; x++) g[fila][x] = '.';
    g[fila][7] = dir === bueno ? 'S' : 'X';
  }
  return toRows(g);
}
const cruce = bueno => ({ map: bifurcacion(bueno), enemies: [], oculta: true, vars: { pared_arriba: bueno !== 'arriba', pared_abajo: bueno !== 'abajo' } });
const NIVELES_RA2 = [
  {
    clave: 'semaforo', title: "El cruce", concept: "if / else", goals: ["salida"], maxLines: 6, random: true,
    nuevos: ["pared"],
    intro: `<p>En el cruce hay dos pasillos, uno arriba y otro abajo. Los dos acaban en una compuerta y <b>solo una está abierta</b>, pero desde aquí no se ve cuál: cambia en cada partida.</p><p>El sensor de tu agente sí lo sabe y lo guarda en la variable <code>pared_arriba</code>: vale <code>True</code> si arriba está cerrado y <code>False</code> si está abierto. Tu programa tiene que <b>decidir</b>. Así se escribe una decisión:</p><pre>if clave == "abre":\n    print("Pasa")\nelse:\n    print("Fuera")</pre><p><code>if</code> significa «si». Si la condición es <code>True</code> se hace lo que está <b>sangrado</b> debajo; si no, lo que está debajo del <code>else</code> («si no»).</p>`,
    hint: `Una variable que ya es True o False puede ir sola detrás del <code>if</code>.`,
    starter: `print("¿Pared arriba?", pared_arriba)\nderecha = 2\n`,
    make: () => cruce(Math.random() < .5 ? 'arriba' : 'abajo')
  },
  {
    clave: 'termometro', title: "El termómetro", concept: "if / elif / else", goals: ["salida"], maxLines: 10, random: true,
    intro: `<p>La variable <code>temperatura</code> ya existe y cambia en cada partida. Hay tres pasillos con una compuerta al fondo, y según lo que marque el termómetro solo se abre una:</p><pre>menos de 15      arriba\nmás de 30        abajo\nentre 15 y 30    recto</pre><p>Con más de dos casos se encadenan condiciones con <code>elif</code> («si no, si…»):</p><pre>if nota < 5:\n    print("Suspenso")\nelif nota < 7:\n    print("Aprobado")\nelse:\n    print("Notable o más")</pre><p>Python mira las condiciones en orden y hace solo la primera que se cumple.</p>`,
    hint: `¿Qué pasa justo con 15 y con 30? Piensa si va <code>&lt;</code> o <code>&lt;=</code>.`,
    starter: `print("Temperatura:", temperatura)\n`,
    make: () => {
      const caso = rnd(0, 2), temperatura = caso === 0 ? rnd(-5, 14) : caso === 1 ? rnd(31, 42) : [15, 30, rnd(16, 29)][rnd(0, 2)];
      const g = blank(10, 7);
      g[3][1] = 'H'; for (let y = 1; y <= 5; y++) g[y][3] = '.';
      [[1, 0], [3, 2], [5, 1]].forEach(([fila, c]) => { for (let x = fila === 3 ? 2 : 4; x <= 6; x++) g[fila][x] = '.'; g[fila][7] = c === caso ? 'S' : 'X'; });
      return { map: toRows(g), enemies: [], oculta: true, vars: { temperatura }, paneles: [{ x: 2, y: 3, titulo: 'TEMPERATURA', valor: `${temperatura} °C`, barra: (temperatura + 5) / 50, alerta: temperatura < 15 || temperatura > 30 }] };
    }
  },
  {
    clave: 'escudo', title: "El puente de energía", concept: "and, or, not", goals: ["salida"], maxLines: 7, random: true,
    intro: `<p>El puente de arriba solo aguanta si llevas <b>escudo</b> <b>y</b> te queda <b>más de 50</b> de energía. Si no, tienes que bajar por el túnel. Desde fuera los dos caminos parecen iguales. Las variables <code>escudo</code> (<code>True</code> o <code>False</code>) y <code>energia</code> (un número) ya existen y cambian en cada partida.</p><pre>and   las dos cosas tienen que ser True\nor    basta con que una sea True\nnot   le da la vuelta: not True es False</pre><p>Junta las dos condiciones en un solo <code>if</code>.</p>`,
    hint: `Las dos condiciones tienen que cumplirse a la vez.`,
    starter: `print("Escudo:", escudo, "Energía:", energia)\nderecha = 2\n`,
    make: () => {
      const escudo = Math.random() < .5, energia = Math.random() < .5 ? rnd(51, 100) : rnd(10, 50);
      return { map: bifurcacion(escudo && energia > 50 ? 'arriba' : 'abajo'), enemies: [], oculta: true, vars: { escudo, energia }, paneles: [{ x: 2, y: 3, titulo: 'ESCUDO · ENERGÍA', valor: `${escudo ? 'True' : 'False'} · ${energia}`, barra: energia / 100, alerta: !escudo || energia <= 50 }] };
    }
  },
  {
    clave: 'contador', title: "La escalera que crece", concept: "for con range(inicio, fin)", goals: ["gemas", "salida"], maxLines: 3,
    intro: `<p>Cada tramo de esta escalera es un paso más largo que el anterior: 1, 2, 3 y 4. La variable del <code>for</code> va cambiando en cada vuelta, y la puedes usar:</p><pre>for i in range(1, 5):\n    print(i)</pre><p><code>range(1, 5)</code> da 1, 2, 3 y 4: empieza en el primer número y para <b>antes</b> del segundo.</p>`,
    hint: `La variable del <code>for</code> cambia en cada vuelta: úsala.`,
    starter: `for i in range(1, 5):\n    print(i)\n`,
    make: () => {
      const g = blank(14, 7); let x = 1, y = 1; g[y][x] = 'H';
      for (let n = 1; n <= 4; n++) { for (let k = 0; k < n; k++) g[y][++x] = '.'; g[y][x] = 'g'; g[++y][x] = '.'; }
      g[y][x] = 'S';
      return { map: toRows(g), enemies: [] };
    }
  },
  {
    clave: 'bateria', title: "La batería", concept: "while con contador", goals: ["salida"], maxLines: 4, random: true,
    intro: `<p>Tu batería tiene <code>energia</code> para unos pocos pasos (cambia en cada partida). Cada paso gasta 1. Avanza <b>mientras</b> te quede energía y, cuando llegue a 0, baja: la salida está justo debajo. Un bucle que cuenta hacia atrás se ve así:</p><pre>vueltas = 3\nwhile vueltas > 0:\n    print(vueltas)\n    vueltas = vueltas - 1</pre><p>Si te olvidas de restar, la condición nunca deja de ser <code>True</code> y el bucle no acaba nunca.</p>`,
    hint: `Cuando el bucle termina, ¿dónde está la salida?`,
    starter: `print("Energía:", energia)\nwhile energia > 0:\n    derecha = 1\n`,
    comprobar: v => v.energia === 0 ? [] : [`La batería tenía que acabar a 0, y energia vale ${JSON.stringify(v.energia)}. Réstale 1 en cada vuelta.`],
    make: () => {
      const energia = rnd(3, 8), g = blank(14, 4);
      for (let x = 1; x <= 12; x++) g[1][x] = '.';
      g[1][1] = 'H'; g[2][1 + energia] = 'S';
      return { map: toRows(g), enemies: [], vars: { energia } };
    }
  },
  {
    clave: 'ruta', title: "La ruta secreta", concept: "for sobre un texto + if/elif", goals: ["salida"], maxLines: 7, random: true,
    intro: `<p>La variable <code>ruta</code> es un texto con el camino, letra a letra, y cambia en cada partida:</p><pre>D   derecha\nA   arriba\nB   abajo (bajar)</pre><p>Un <code>for</code> puede recorrer un texto: en cada vuelta, la variable vale una letra.</p><pre>for letra in ruta:\n    print(letra)</pre><p>Dentro del bucle, decide con <code>if</code> / <code>elif</code> qué hacer con cada letra.</p>`,
    hint: `En cada vuelta tienes una letra: compárala con cada opción.`,
    starter: `print(ruta)\nfor letra in ruta:\n    print(letra)\n`,
    make: () => {
      let x = 1, y = 3, ruta = '', ult = '';
      const celdas = [[x, y]];
      for (let i = 0; i < 14; i++) {
        let m = 'D';
        if (ult !== '' && Math.random() < .45) { const op = []; if (y > 1 && ult !== 'B') op.push('A'); if (y < 5 && ult !== 'A') op.push('B'); if (op.length) m = op[rnd(0, op.length - 1)]; }
        if (m === 'D') x++; else if (m === 'A') y--; else y++;
        ruta += m; ult = m; celdas.push([x, y]);
      }
      if (ult !== 'D') { x++; ruta += 'D'; celdas.push([x, y]); }
      const g = blank(x + 2, 7);
      celdas.forEach(([a, b]) => g[b][a] = '.');
      g[3][1] = 'H'; g[y][x] = 'S';
      return { map: toRows(g), enemies: [], vars: { ruta } };
    }
  },
  {
    clave: 'jefe7', title: "Miniboss: el Repetidor", concept: "Acumular en un bucle", goals: ["salida"], maxLines: null, random: true,
    intro: `<p>El <b>Repetidor</b> quiere la suma de todos los números del 1 hasta <code>n</code> (la variable <code>n</code> ya existe y cambia en cada partida). Con un bucle se va <b>acumulando</b>: la variable <code>suma</code> empieza en 0 y en cada vuelta le sumas el número que toque.</p><p>Haz la cuenta antes de acercarte. Luego te preguntará cuántas vueltas da un bucle: contesta con la variable <code>vueltas</code>.</p>`,
    hint: `Empieza la suma en 0 y añádele algo en cada vuelta. <code>range</code> para antes del último número.`,
    starter: `print("n vale", n)\nsuma = 0\n`,
    make: () => { const n = rnd(5, 12); return nivelJefe('Repetidor', [
      { var: 'suma', pregunta: `Suma los números del 1 al n y guárdalo en suma.`, corta: '¿suma?', valida: (v, t) => t !== 'int' ? 'suma tiene que ser un número entero.' : Number(v) === n * (n + 1) / 2 ? true : Number(v) === n * (n - 1) / 2 ? `Te has quedado corto: range(1, n) para antes de n. Usa range(1, n + 1).` : `suma vale ${v}, pero la suma del 1 al ${n} no es esa.` },
      { var: 'vueltas', pregunta: '¿Cuántas vueltas da for i in range(2, 9)? Guárdalo en vueltas.', corta: '¿vueltas?', valida: (v, t) => t !== 'int' ? 'vueltas es un número entero, sin comillas.' : v === '7' ? true : v === '8' ? 'Casi: range para antes del 9.' : v === '9' ? 'No: empieza en 2 y para antes del 9.' : 'Cuenta los números que da range(2, 9).' }
    ], { vars: { n } })(); }
  }
];
NIVELES_RA2.forEach(L => LEVELS.push(L));

const NIVELES_IF = [
  {
    clave: 'alarma', title: "La alarma del disco", concept: "if (sin else) y sangría", goals: ["salida"], maxLines: 4, random: true,
    nuevos: ["si"],
    intro: `<p>Antes de salir de la sala de servidores hay que mirar el disco. La variable <code>uso</code> (el % de disco ocupado) ya existe y cambia en cada partida. <b>Solo si</b> el uso es del 90 % o más, tienes que dar la alarma guardando <code>True</code> en la variable <code>alarma</code>. Si no, no se avisa.</p><pre>if condición:\n    esto solo pasa si es True\nesto pasa siempre</pre><p>Lo que va <b>sangrado</b> (4 espacios) depende del <code>if</code>. Lo que vuelve al margen se ejecuta siempre.</p>`,
    hint: `¿Moverte hasta la salida depende del disco? Entonces no va dentro del <code>if</code>.`,
    starter: `print("Uso del disco:", uso, "%")\nderecha = 7\n`,
    comprobar: v => v.uso >= 90 ? (v.alarma === true ? [] : [`el disco estaba al ${v.uso} %: tenías que dar la alarma (alarma = True).`]) : (v.alarma === true ? [`el disco estaba al ${v.uso} %: no había que dar la alarma.`] : []),
    make: () => { const uso = [90, 90, rnd(91, 99), rnd(91, 99), 89, rnd(20, 88), rnd(20, 88)][rnd(0, 6)]; return { map: ['##########', '#H......S#', '##########'], enemies: [], vars: { uso }, paneles: [{ x: 4, y: 1, titulo: 'DISCO', valor: `${uso} %`, barra: uso / 100, alerta: uso >= 90, servidor: true }] }; }
  },
  {
    clave: 'ifroto', title: "El if roto", concept: "Errores típicos del if", goals: ["salida"], maxLines: null, random: true,
    intro: `<p>Este programa tendría que elegir el pasillo según <code>pared_arriba</code>, como en el cruce, pero alguien lo ha escrito con prisa y tiene <b>5 errores</b>. Ejecútalo, lee el error, arregla esa línea y vuelve a ejecutar.</p><p>Python te dice un error cada vez: el primero que encuentra.</p>`,
    hint: `Repasa: mayúsculas, dos puntos, <code>=</code> o <code>==</code>, qué lleva el <code>else</code> y la sangría.`,
    starter: `# Este programa tiene 5 errores. Ejecútalo y arréglalos uno a uno.\nderecha = 2\nIf pared_arriba = True\n    abajo = 2\nelse pared_arriba == False:\narriba = 2\nderecha = 4\n`,
    make: () => cruce(Math.random() < .5 ? 'arriba' : 'abajo')
  },
  {
    clave: 'cargador', title: "El cargador", concept: "El orden de los elif", goals: ["salida"], maxLines: null, random: true,
    intro: `<p>La barrera quiere saber cómo está tu batería. La variable <code>bateria</code> (en %) ya existe y cambia en cada partida:</p><pre>80 o más        "alta"\n30 o más        "media"\n10 o más        "baja"\nmenos de 10     "critica"</pre><p>El programa de abajo parece correcto, pero muchas veces contesta mal. Pruébalo varias veces. Recuerda: Python entra <b>solo en la primera</b> condición que se cumple.</p>`,
    hint: `Con 85, ¿cuál es la primera condición que da True?`,
    starter: `print("Batería:", bateria, "%")\nif bateria >= 10:\n    estado = "baja"\nelif bateria >= 30:\n    estado = "media"\nelif bateria >= 80:\n    estado = "alta"\nelse:\n    estado = "critica"\n\nderecha = 3\nrespuesta = estado\nderecha = 4\n`,
    make: () => {
      const bateria = [80, 30, 10, 9, rnd(81, 100), rnd(31, 79), rnd(11, 29), rnd(0, 8)][rnd(0, 7)];
      const ok = bateria >= 80 ? 'alta' : bateria >= 30 ? 'media' : bateria >= 10 ? 'baja' : 'critica';
      return { map: ['##########', '#H...D..S#', '##########'], enemies: [], vars: { bateria }, paneles: [{ x: 3, y: 1, titulo: 'BATERÍA', valor: `${bateria} %`, barra: bateria / 100, alerta: bateria < 10 }],
        doors: [{ etiqueta: '%', valida: t => t.replace('í', 'i') === ok, pista: t => ['alta', 'media', 'baja', 'critica', 'crítica'].includes(t) ? `con la batería al ${bateria} % no es «${t}». Revisa el orden de las condiciones.` : `tiene que ser "alta", "media", "baja" o "critica".` }] };
    }
  },
  {
    clave: 'puerto', title: "El puerto", concept: "Rangos e if dentro de if", goals: ["salida"], maxLines: null, random: true,
    intro: `<p>La barrera te pregunta por el <code>puerto</code> (ya existe y cambia en cada partida). Los puertos válidos van del 0 al 65535, y los menores de 1024 son del sistema:</p><pre>0 a 1023          "sistema"\n1024 a 65535      "usuario"\nfuera de 0-65535  "no existe"</pre><p>Un rango se puede escribir en una sola comparación, como en mates: <code>0 &lt;= x &lt;= 100</code>. Y dentro de un <code>if</code> puede ir otro <code>if</code>: su bloque lleva 8 espacios.</p>`,
    hint: `Primero mira si el puerto existe; solo si existe, mira si es del sistema o de usuario.`,
    starter: `print("Puerto:", puerto)\nderecha = 3\n`,
    make: () => {
      const puerto = [0, 22, 80, 443, 1023, 1024, 8080, 65535, 65536, 70000, -1][rnd(0, 10)];
      const ok = puerto < 0 || puerto > 65535 ? 'no existe' : puerto < 1024 ? 'sistema' : 'usuario';
      return { map: ['##########', '#H...D..S#', '##########'], enemies: [], vars: { puerto }, paneles: [{ x: 3, y: 1, titulo: 'PUERTO', valor: String(puerto) }],
        doors: [{ etiqueta: ':', respuesta: ok, pista: t => ['sistema', 'usuario', 'no existe'].includes(t) ? `el puerto ${puerto} no es de «${t}». Ojo con los límites: 1023, 1024 y 65535.` : `tiene que ser "sistema", "usuario" o "no existe".` }] };
    }
  }
];
NIVELES_IF.forEach(L => LEVELS.push(L));

// ---------- mundos: cada uno es un tema con sus niveles ----------
const MUNDOS = [
  { id: 1, ra: 1, titulo: 'Primeros pasos', tema: 'Instrucciones y números', color: '#2fc6b8', icono: '👣', niveles: ['celda', 'gemas', 'jefe1'],
    desc: 'Tus primeras órdenes en Python: moverte por la base sin chocarte.' },
  { id: 2, ra: 1, titulo: 'Variables y constantes', tema: 'Guardar valores con nombre', color: '#f2b544', icono: '📦', niveles: ['escalones', 'clave', 'constantes', 'jefe2'],
    desc: 'Guarda valores con un nombre, léelos de las placas y escribe constantes en MAYÚSCULAS.' },
  { id: 3, ra: 1, titulo: 'Textos', tema: 'Strings y bloques de texto', color: '#ff4f8b', icono: '📜', niveles: ['guardias', 'palabras', 'jefe3'],
    desc: 'Comillas, unir y repetir textos y bloques de varias líneas.' },
  { id: 4, ra: 1, titulo: 'Operadores', tema: 'Aritméticos, comparaciones y lógicos', color: '#c58bff', icono: '➗', niveles: ['tesoro', 'potencias', 'verdad', 'jefe4'],
    desc: 'Cuentas con + - * / // % **, prioridad, comparaciones y and.' },
  { id: 5, ra: 1, titulo: 'Entrada y conversiones', tema: 'input(), int() y str()', color: '#5ec8ff', icono: '⌨️', niveles: ['placa', 'guardian', 'jefe5'],
    desc: 'Pregunta a quien juega y convierte textos en números.' },
  { id: 6, ra: 1, titulo: 'Errores', tema: 'Leer y arreglar errores', color: '#ff7a3d', icono: '🐞', niveles: ['roto', 'roto2', 'jefe6'],
    desc: 'Programas rotos: lee el mensaje de error, encuentra la línea y arréglalo.' },
  { id: 7, ra: 2, titulo: 'Condiciones', tema: 'if, else, elif, and/or, rangos y if anidados', color: '#ffd35a', icono: '🔀', niveles: ['alarma', 'semaforo', 'ifroto', 'termometro', 'cargador', 'escudo', 'puerto', 'jefe8'],
    desc: 'Tu programa decide qué camino tomar según lo que valgan las variables.' },
  { id: 8, ra: 2, titulo: 'Bucles', tema: 'for, range, while y bucles con if', color: '#7be07b', icono: '🔁', niveles: ['caracol', 'contador', 'bateria', 'sinfin', 'ruta', 'emboscada', 'tozudos', 'jefe7'],
    desc: 'Repite sin copiar y pegar: for, range, while, recorrer textos y decidir en cada vuelta.' },
  { id: 9, ra: 2, titulo: 'Funciones y algoritmos', tema: 'def y el laberinto', color: '#9fa8ff', icono: '🧩', niveles: ['columnas', 'laberinto'],
    desc: 'Crea tus propias órdenes y escapa del laberinto.' }
];
(function ordenarNiveles() {
  const orden = MUNDOS.flatMap(m => m.niveles);
  LEVELS.sort((a, b) => orden.indexOf(a.clave) - orden.indexOf(b.clave));
  // ids fijos: el progreso guardado va por id, así que un nivel nuevo
  // recibe un id nuevo aunque se juegue en medio
  const IDS = ['celda', 'gemas', 'escalones', 'clave', 'constantes', 'guardias', 'palabras', 'tesoro', 'potencias', 'verdad', 'placa', 'guardian',
    'roto', 'roto2', 'caracol', 'sinfin', 'emboscada', 'tozudos', 'columnas', 'laberinto', 'jefe1', 'jefe2', 'jefe3', 'jefe4', 'jefe5', 'jefe6', 'jefe8',
    'semaforo', 'termometro', 'escudo', 'contador', 'bateria', 'ruta', 'jefe7', 'alarma', 'ifroto', 'cargador', 'puerto'];
  LEVELS.forEach(L => { L.nuevos = L.nuevos || []; L.id = IDS.indexOf(L.clave) + 1; L.mundo = MUNDOS.find(m => m.niveles.includes(L.clave)).id; });
  MUNDOS.forEach(m => { m.ids = m.niveles.map(c => LEVELS.find(L => L.clave === c).id); });
})();

const API_DOCS = {
  derecha: { sig: "derecha = pasos", ins: "derecha = ", desc: "Avanza a la derecha. Los pasos son un número entero (int), sin comillas." },
  izquierda: { sig: "izquierda = pasos", ins: "izquierda = ", desc: "Avanza a la izquierda." },
  arriba: { sig: "arriba = pasos", ins: "arriba = ", desc: "Sube por una escalera." },
  abajo: { sig: "abajo = pasos", ins: "abajo = ", desc: "Baja por una escalera." },
  print: { sig: "print(valor)", ins: "print()", desc: "Muestra un valor en la consola. Muy útil para investigar." },
  tipos: { sig: 'tipo = "str"', ins: 'tipo = ""', desc: 'Contesta a un miniboss con el tipo de un valor: "str", "int", "float" o "bool".' },
  placa: { sig: "placa", ins: "placa", desc: "Variable del juego con lo que pone la placa del nivel. Siempre es un texto (str)." },
  respuesta: { sig: "respuesta = valor", ins: "respuesta = ", desc: "Lo que le contestas a la barrera que tienes al lado. Si es lo que espera, se abre." },
  atacar: { sig: 'atacar = "Nombre"', ins: 'atacar = ""', desc: "Golpea al bug con ese nombre (un texto, entre comillas). Tiene que estar pegado a ti." },
  operadores: { sig: "+  -  *  /  //  %  **", ins: " * ", desc: "Suma, resta, multiplica, divide, división entera, resto y potencia." },
  textos: { sig: 'texto + texto · texto * n · """..."""', ins: '"""\n\n"""', desc: "Juntar textos, repetirlos y escribir bloques de varias líneas." },
  int: { sig: "int(texto)", ins: "int()", desc: "Convierte un texto en número entero: int(\"4\") → 4. También float() para decimales." },
  str: { sig: "str(numero)", ins: "str()", desc: "Convierte un número en texto para poder juntarlo con +." },
  input: { sig: 'input("pregunta")', ins: 'input("")', desc: "Pregunta a quien juega y devuelve lo que escribe, siempre como texto." },
  si: { sig: "if condición:\n    ...\nelif …:\nelse:", ins: "if :\n    ", desc: "Hace lo sangrado solo si la condición es True. elif y else cubren los otros casos." },
  pared: { sig: "pared_arriba", ins: "pared_arriba", desc: "Variable del sensor: True si el pasillo de arriba está cerrado. También pared_abajo." },
  camino: { sig: "camino_derecha", ins: "camino_derecha", desc: "Variable del juego: True si puedes avanzar a la derecha. También camino_izquierda, camino_arriba y camino_abajo." },
  enemigo: { sig: "enemigo", ins: "enemigo", desc: "Variable del juego: el nombre del bug que tienes al lado, o None si no hay nadie." },
  funciones: { sig: "def nombre(dato):\n    return valor", ins: "def ():\n    return ", desc: "Crea tu propia función: recibe datos y devuelve un resultado con return." },
  hay_camino: { sig: 'hay_camino(direccion)', ins: 'hay_camino("derecha")', desc: "Función del juego: True si puedes moverte en esa dirección (un texto)." },
  mover: { sig: 'mover = direccion', ins: 'mover = ""', desc: 'Avanza 1 paso en la dirección que digas con un texto: mover = "abajo".' },
  en_salida: { sig: "en_salida", ins: "en_salida", desc: "Variable del juego: True si estás encima de la salida." }
};

// ---------- simulación ----------
const DIRS = { derecha: [1, 0], izquierda: [-1, 0], arriba: [0, -1], abajo: [0, 1] };
const HUES = [110, 280, 320, 190, 250];
function hueOf(name) { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0; return HUES[h % HUES.length]; }

function crearPartida(level, datos) {
  const d = datos || level.make(); const map = d.map; const h = map.length, w = map[0].length;
  const s = { w, h, tiles: [], hero: null, facing: 1, enemies: [], gems: [], doors: [], sign: null, exit: null,
    signText: d.signo != null ? String(d.signo) : (d.password || ''), vars: d.vars || {}, oculta: !!d.oculta, placaAMano: !!d.placaAMano, paneles: d.paneles || [], comprobar: level.comprobar || null,
    preguntas: 0, valores: {}, vidas: VIDAS, goals: level.goals, frames: [], over: null, datos: d };
  let ei = 0;
  const specs = d.doors || [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      const c = map[y][x]; let t = '.';
      if (c === '#' || c === ' ') t = c;
      else if (c === 'H') s.hero = { x, y };
      else if (c === 'S') { t = 'S'; s.exit = { x, y }; }
      else if (c === 'g') s.gems.push({ x, y, taken: false });
      else if (c === 'E') { const e = d.enemies[ei++]; s.enemies.push({ name: e.name, hp: e.hp, max: e.hp, x, y, hue: hueOf(e.name) }); }
      else if (c === 'D') {
        t = 'D'; const sp = specs[s.doors.length] || {}, dd = Object.assign({ x, y, open: false, etiqueta: '' }, sp);
        dd.pasosLista = dd.jefe ? dd.jefe.pasos : [{ var: 'respuesta', valida: v => puertaAcepta(dd, v) ? true : (dd.pista ? dd.pista(v) : 'esa no es la respuesta.') }];
        s.doors.push(dd);
      }
      else if (c === 'C') { t = 'C'; s.sign = { x, y }; }
      else if (c === 'X') t = 'X'; // compuerta cerrada (salida falsa)
      row.push(t);
    }
    s.tiles.push(row);
  }
  return s;
}

function snap(s, extra) {
  return Object.assign({ hx: s.hero.x, hy: s.hero.y, facing: s.facing, enemies: s.enemies.map(e => ({ ...e })),
    gems: s.gems.map(g => ({ ...g })), doors: s.doors.map(d => d.open), pasos: s.doors.map(d => d.paso || 0), vidas: s.vidas, dur: 1 }, extra || {});
}
function enemyAt(s, x, y) { return s.enemies.find(e => e.hp > 0 && e.x === x && e.y === y); }
function doorAt(s, x, y) { return s.doors.find(d => d.x === x && d.y === y); }
function dentro(s, x, y) { return x >= 0 && y >= 0 && x < s.w && y < s.h; }
function libre(s, x, y) {
  if (!dentro(s, x, y)) return false;
  const t = s.tiles[y][x];
  if (t === '#' || t === ' ' || t === 'C' || t === 'X') return false;
  if (t === 'D' && !doorAt(s, x, y).open) return false;
  return !enemyAt(s, x, y);
}
function pegado(s, p) { return p && Math.abs(p.x - s.hero.x) + Math.abs(p.y - s.hero.y) === 1; }
function enSalida(s) { return !!s.exit && s.hero.x === s.exit.x && s.hero.y === s.exit.y; }

function push(s, extra) {
  if (s.over) return;
  if (s.frames.length >= MAX_FRAMES) { fin(s, 'fail', 'Demasiadas acciones: tu programa no para nunca. ¿Tienes un bucle infinito?', true); return; }
  s.frames.push(snap(s, extra));
}
// suave: el programa acaba (error o no ha llegado), pero no es «game over»
function fin(s, type, msg, suave) {
  if (s.over) return;
  s.over = { type, msg, suave: !!suave };
  s.frames.push(snap(s, { dur: 0.8, end: type, log: { text: msg, kind: type === 'win' ? 'ok' : 'error' } }));
}
function faltan(s) {
  const f = [];
  const g = s.gems.filter(g => !g.taken).length;
  if (s.goals.includes('gemas') && g) f.push(`te falta${g > 1 ? 'n' : ''} ${g} gema${g > 1 ? 's' : ''}`);
  const e = s.enemies.filter(e => e.hp > 0).length;
  if (s.goals.includes('enemigos') && e) f.push(`queda${e > 1 ? 'n' : ''} ${e} enemigo${e > 1 ? 's' : ''}`);
  if (s.goals.includes('salida') && !enSalida(s)) f.push('no has llegado a la salida');
  return f;
}
// ¿cumple todo? Si el nivel revisa variables, solo se sabe al acabar el programa
function revisar(s, vars) {
  if (s.over) return;
  if (faltan(s).length) return;
  const m = s.comprobar ? s.comprobar(vars || {}, s) : [];
  if (m.length) fin(s, 'fail', 'Has llegado, pero ' + m.join(' ').replace(/^./, c => c.toLowerCase()), true);
  else fin(s, 'win', '¡Lo has conseguido!');
}
function puertaAcepta(d, t) { return d.valida ? d.valida(t) : t === d.respuesta; }
// Barreras y minibosses esperan valores guardados en variables. Un valor
// nuevo se comprueba en cuanto estás pegado a quien lo espera (al
// guardarlo o al llegar a su lado).
function escuchar(s) { s.doors.filter(d => !d.open && pegado(s, d)).forEach(d => atender(s, d)); }
function atender(s, d) {
  const quien = d.jefe ? d.jefe.nombre : 'Barrera';
  while (!d.open && !s.over) {
    const paso = d.pasosLista[d.paso || 0], val = s.valores[paso.var];
    if (!val || !val.nuevo) return;
    val.nuevo = false;
    if (d.x !== s.hero.x) s.facing = Math.sign(d.x - s.hero.x);
    push(s, { say: `${paso.var} = ${val.t === 'str' ? JSON.stringify(val.v) : val.v}`, dur: 1.2 });
    const r = paso.valida(val.v, val.t, s);
    if (r !== true) { push(s, { dur: .6, log: { text: `${quien}: ${r}`, kind: 'warn' } }); return; }
    d.paso = (d.paso || 0) + 1;
    if (d.paso >= d.pasosLista.length) {
      d.open = true;
      push(s, { dur: 1.2, log: { text: d.jefe ? `${quien}: ${d.jefe.fin || '¡Me rindo! Puedes pasar.'}` : '¡La barrera se abre!', kind: 'info' } });
    } else push(s, { dur: .8, log: { text: `${quien}: ¡Correcto! ${d.pasosLista[d.paso].pregunta}`, kind: 'info' } });
  }
}

function makeApi(getSim, opciones) {
  const opc = opciones || {};
  return {
    paso(d) {
      const s = getSim(); if (s.over) return;
      const [dx, dy] = DIRS[d]; if (dx) s.facing = dx;
      const nx = s.hero.x + dx, ny = s.hero.y + dy;
      if (!libre(s, nx, ny)) {
        const e = enemyAt(s, nx, ny); const t = dentro(s, nx, ny) ? s.tiles[ny][nx] : '#';
        const msg = e ? `¡${e.name} te bloquea el paso! Primero tienes que derrotarlo.`
          : t === 'D' ? (doorAt(s, nx, ny).jefe ? `${doorAt(s, nx, ny).jefe.nombre} no te deja pasar: contesta a su pregunta.` : 'La barrera está cerrada. Guarda la respuesta en la variable respuesta.')
          : t === 'C' ? 'Te has chocado con la placa.'
          : t === 'X' ? 'Esa compuerta está cerrada: por aquí no era.'
          : dy ? '¡Pum! Por ahí no hay escalera: te has dado contra la piedra.'
          : '¡Pum! Te has chocado contra la pared.';
        // choque: pierde una vida y se queda donde estaba; el programa sigue
        s.vidas--;
        const q = s.vidas;
        push(s, { bump: [dx, dy], dur: 1, say: '¡Ay!', log: { text: msg + (q > 0 ? ` Te queda${q > 1 ? 'n' : ''} ${q} vida${q > 1 ? 's' : ''}.` : ''), kind: 'warn' } });
        if (q <= 0) fin(s, 'fail', msg + ' Te has quedado sin vidas.');
        return;
      }
      s.hero = { x: nx, y: ny };
      const g = s.gems.find(g => !g.taken && g.x === nx && g.y === ny); if (g) g.taken = true;
      push(s, { dur: 1 });
      escuchar(s);
      if (enSalida(s) && !s.comprobar) revisar(s, {});
    },
    atacar(name) {
      const s = getSim(); if (s.over) return;
      const e = s.enemies.find(e => e.hp > 0 && e.name === name);
      if (!e) {
        const alt = s.enemies.find(e => e.hp > 0 && e.name.toLowerCase() === String(name).toLowerCase());
        const muerto = s.enemies.find(e => e.hp <= 0 && e.name === name);
        const msg = alt ? `No hay nadie llamado «${name}». Las mayúsculas cuentan: ¿querías decir «${alt.name}»?`
          : muerto ? `«${name}» ya está derrotado.` : `No hay ningún enemigo llamado «${name}».`;
        push(s, { say: '¿?', log: { text: msg, kind: 'warn' } }); return;
      }
      if (!pegado(s, e)) { push(s, { say: '¡Está lejos!', log: { text: `${e.name} está demasiado lejos. Acércate hasta estar justo a su lado.`, kind: 'warn' } }); return; }
      if (e.x !== s.hero.x) s.facing = Math.sign(e.x - s.hero.x);
      e.hp--;
      push(s, { attack: { x: e.x, y: e.y }, dur: 1.2, log: e.hp === 0 ? { text: `Has derrotado a ${e.name}.`, kind: 'info' } : null });
    },
    // el programa ha guardado un valor en una variable: puede que una
    // barrera o un miniboss pegado a ti la esté esperando
    asignar(nombre, v, tipo) {
      const s = getSim(); if (s.over) return;
      s.valores[nombre] = { v: String(v), t: tipo, nuevo: true };
      escuchar(s, nombre);
    },
    placa_a_mano() { return !!getSim().placaAMano; },
    hay_auto(k) { const s = getSim(); return k === 'placa' ? s.sign != null || !!s.signText : true; },
    auto(k) {
      const s = getSim();
      if (k === 'placa') return s.signText;
      if (k === 'enemigo') { const e = s.enemies.find(e => e.hp > 0 && pegado(s, e)); return e ? e.name : ''; }
      if (k === 'en_salida') return enSalida(s);
      const d = k.replace('camino_', ''); const [dx, dy] = DIRS[d]; return libre(s, s.hero.x + dx, s.hero.y + dy);
    },
    pedir(msg) {
      const s = getSim(); if (s.over) return null;
      s.preguntas++;
      const r = opc.pedir ? opc.pedir(String(msg)) : null;
      push(s, { dur: 0, log: { text: `${msg}${r == null ? '(cancelado)' : r}`, kind: 'print' } });
      return r == null ? null : String(r);
    },
    hay_camino(d) { const s = getSim(); const [dx, dy] = DIRS[d]; return libre(s, s.hero.x + dx, s.hero.y + dy); },
    terminado() { return !!getSim().over; },
    imprimir(t) { const s = getSim(); if (s) push(s, { dur: 0, log: { text: String(t), kind: 'print' } }); },
    avisar(t) { const s = getSim(); if (s) push(s, { dur: 0, log: { text: String(t), kind: 'warn' } }); }
  };
}

function traducirError(kind, line, name, msg) {
  const L = line ? ` (línea ${line})` : '';
  if (kind === 'bucle') return `Tu programa no termina nunca${L}: parece un bucle infinito. Revisa la condición del while.`;
  switch (name) {
    case 'SyntaxError':
      if (/never closed/.test(msg)) return `Falta cerrar un paréntesis o un corchete${L}.`;
      if (/unterminated (triple-quoted )?string/.test(msg)) return `Unas comillas no están cerradas${L}.`;
      if (/expected ':'/.test(msg)) return `Faltan los dos puntos «:» al final de la línea${L}.`;
      if (/unmatched/.test(msg)) return `Sobra un paréntesis de cierre${L}.`;
      if (/Maybe you meant '=='/.test(msg)) return `Para comparar se usa «==», no «=»${L}.`;
      if (/cannot assign to/.test(msg)) return `A la izquierda del = solo puede ir el nombre de una variable${L}.`;
      if (/invalid decimal literal|invalid syntax/.test(msg) && /\d[a-zA-Z_]/.test(msg)) return `Un nombre de variable no puede empezar por un número${L}.`;
      return `Python no entiende lo que hay escrito${L}. Revisa paréntesis, comillas y dos puntos.`;
    case 'IndentationError': case 'TabError':
      if (/expected an indented block/.test(msg)) return `Después de los dos puntos «:» la línea siguiente tiene que ir sangrada (4 espacios)${L}.`;
      if (/unexpected indent/.test(msg)) return `Sobran espacios al principio de la línea${L}.`;
      return `La sangría no cuadra${L}: revisa los espacios del principio de la línea.`;
    case 'NameError': {
      const [base, sug] = msg.split('||');
      const m = /name '(.+?)' is not defined/.exec(base); const n = m ? m[1] : '?';
      if (n === 'true' || n === 'false') return `En Python se escribe ${n === 'true' ? 'True' : 'False'}, con mayúscula${L}.`;
      if (n === 'none') return `En Python se escribe None, con mayúscula${L}.`;
      if (n === 'placa') return `En este nivel no hay ninguna placa${L}.`;
      if (sug) return `Python no conoce el nombre «${n}»${L}. ¿Querías decir «${sug}»?`;
      return `Python no conoce el nombre «${n}»${L}. ¿Está mal escrito o no lo has creado todavía? Si es un texto, ponlo entre comillas: "${n}".`;
    }
    case 'AttributeError': {
      const m = /has no attribute '(.+?)'/.exec(msg);
      return `«${m ? m[1] : '?'}» no existe${L}. Mira la lista de comandos para ver qué órdenes hay.`;
    }
    case 'TypeError':
      if (/can only concatenate str/.test(msg)) return `No se puede juntar un texto con un número usando +${L}. Convierte el número con str(), por ejemplo: "Llevo " + str(gemas).`;
      if (/unsupported operand type\(s\) for [+\-*/%]+: 'int' and 'str'|unsupported operand type\(s\) for [+\-*/%]+: 'str' and 'int'|unsupported operand type\(s\) for [-/%]+: 'str'/.test(msg)) return `Estás haciendo cuentas con un texto${L}. Si el número viene de la placa o de input(), conviértelo con int().`;
      if (/can't multiply sequence by non-int of type/.test(msg)) return `No se puede multiplicar un texto por eso${L}. ¿Te falta convertir algo con int()?`;
      if (/missing \d+ required positional argument/.test(msg)) return `A esta orden le falta un dato entre los paréntesis${L}.`;
      if (/takes .* positional argument/.test(msg)) return `Le has pasado demasiados datos a una orden${L}.`;
      if (/not callable/.test(msg)) return `Estás poniendo paréntesis detrás de una variable${L}. Las órdenes se dan guardando un valor: derecha = 3`;
      return `Error de tipos${L}: ${msg}`;
    case 'ValueError': {
      const m = /invalid literal for int\(\) with base 10: (.*)$/.exec(msg);
      if (m) return `int() no puede convertir ${m[1]} en un número entero${L}. Solo funciona con textos como "12".`;
      if (/could not convert string to float: (.*)$/.test(msg)) return `float() no puede convertir ${msg.split(': ').pop()} en un número${L}.`;
      return `${msg}${L}`;
    }
    case 'IndexError': return `Te has salido de la lista${L}: esa posición no existe.`;
    case 'ZeroDivisionError': return `No se puede dividir entre cero${L}.`;
    case 'ErrorHeroe': return msg + L;
    default: return `${name}${L}: ${msg}`;
  }
}

// res: { kind, line, name, msg, vars }
function terminar(s, res) {
  if (res.kind === 'error' || res.kind === 'bucle') { fin(s, 'fail', traducirError(res.kind, res.line, res.name, res.msg), true); return; }
  if (s.over) return;
  revisar(s, res.vars);
  if (!s.over) { const t = faltan(s).join(' y '); fin(s, 'fail', 'El programa ha terminado, pero ' + t + '.', true); }
}
function leerVars(json) { try { return json ? JSON.parse(json) : {}; } catch (e) { return {}; } }

function contarLineas(code) { return code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length; }

const PRELUDE = String.raw`
import sys
import json
import difflib
import ast
import re
import juego

class ErrorHeroe(Exception):
    pass

class _Fin(BaseException):
    pass

class _Bucle(BaseException):
    pass

_DIRS = ("derecha", "izquierda", "arriba", "abajo")

def _dir(d):
    if d not in _DIRS:
        raise ErrorHeroe("Dirección no válida: " + repr(d) + '. Usa "derecha", "izquierda", "arriba" o "abajo", entre comillas.')
    return d

_MOVS = ("derecha", "izquierda", "arriba", "abajo")
# variables que pone el juego: se pueden leer, no cambiar
_AUTO = ("placa", "enemigo", "en_salida", "camino_derecha", "camino_izquierda", "camino_arriba", "camino_abajo")

def _chk():
    if juego.terminado():
        raise _Fin()

def _mover(d, pasos):
    if isinstance(pasos, bool):
        raise ErrorHeroe(d + " = " + repr(pasos) + " no vale: " + repr(pasos) + " es un bool (verdadero o falso). Los pasos son un número entero (int): " + d + " = 3")
    if isinstance(pasos, str):
        raise ErrorHeroe(d + " = " + repr(pasos) + " no vale: lleva comillas, así que es un texto (str). Los pasos son un número entero (int), sin comillas: " + d + " = 3. Si el número viene de la placa o de input(), conviértelo con int().")
    if isinstance(pasos, float):
        raise ErrorHeroe(d + " = " + repr(pasos) + " no vale: no se pueden dar medios pasos. " + repr(pasos) + " es un float (número con decimales) y los pasos tienen que ser un int (entero). Si sale de una división, usa // en vez de /.")
    if not isinstance(pasos, int):
        raise ErrorHeroe("Los pasos tienen que ser un número entero, por ejemplo: " + d + " = 3")
    if pasos < 1:
        raise ErrorHeroe(d + " = " + repr(pasos) + " no vale: los pasos tienen que ser 1 o más.")
    for _ in range(pasos):
        juego.paso(d)
        _chk()

def _atacar(nombre):
    if not isinstance(nombre, str):
        raise ErrorHeroe("atacar = " + repr(nombre) + " no vale: el nombre del bug es un texto y va entre comillas, por ejemplo atacar = \"NameError\"")
    juego.atacar(nombre)
    _chk()

class _Mundo(dict):
    # Las variables del programa viven aquí. Al guardar un valor en
    # derecha, abajo… el agente se mueve; en atacar, golpea; cualquier
    # otro valor puede ser lo que espera una barrera o un miniboss.
    def __getitem__(self, k):
        if k == "placa" and juego.placa_a_mano():
            raise ErrorHeroe("Aquí la placa no se lee con código: mira lo que pone en la pantalla y escríbelo tú entre comillas, por ejemplo clave = \"hola\".")
        if k in _AUTO and juego.hay_auto(k):
            v = juego.auto(k)
            if k == "placa":
                return str(v)
            if k == "enemigo":
                return str(v) if v else None
            return bool(v)
        return dict.__getitem__(self, k)
    def __contains__(self, k):
        return (k in _AUTO and juego.hay_auto(k)) or dict.__contains__(self, k)
    def __setitem__(self, k, v):
        if k in _AUTO:
            raise ErrorHeroe("«" + k + "» es una variable del juego: puedes leerla, pero no cambiarla. Usa otro nombre.")
        dict.__setitem__(self, k, v)
        if k in _MOVS:
            _mover(k, v)
        elif k == "mover":
            _mover(_dir(v), 1)
        elif k == "atacar":
            _atacar(v)
        elif isinstance(v, (bool, int, float, str)):
            juego.asignar(k, str(v), type(v).__name__)
            _chk()
        elif isinstance(v, type):
            # tipo = type(edad) o tipo = str
            juego.asignar(k, "<class '" + v.__name__ + "'>", "type")
            _chk()

def _hay_camino(direccion):
    return bool(juego.hay_camino(_dir(direccion)))

def _input(mensaje=""):
    r = juego.pedir(str(mensaje))
    if r is None:
        if juego.terminado():
            raise _Fin()
        raise ErrorHeroe("Has cancelado la pregunta de input().")
    return str(r)

# en la consola, las expresiones muestran su valor (pero no las órdenes sin paréntesis)
def _mostrar(v):
    if v is None or callable(v):
        return
    print(repr(v))
sys.displayhook = _mostrar

_FICHERO = "<tu código>"
_ORDENES = _MOVS + ("mover", "atacar")
_OCULTOS = {"input", "hay_camino"}

def _llamada_a_orden(code):
    # derecha(3) no existe: las órdenes se dan guardando un valor
    try:
        arbol = ast.parse(code)
    except SyntaxError:
        return None
    for nodo in ast.walk(arbol):
        if isinstance(nodo, ast.Call) and isinstance(nodo.func, ast.Name) and nodo.func.id in _ORDENES + ("decir", "leer"):
            n = nodo.func.id
            ej = {"atacar": 'atacar = "NameError"', "mover": 'mover = "derecha"', "decir": "respuesta = ...", "leer": "texto = placa"}.get(n, n + " = 3")
            return [nodo.lineno, n + "() no es una orden: aquí no usamos funciones. Guarda el valor en una variable, sin paréntesis: " + ej]
    return None

def _linea(e):
    tb = e.__traceback__
    ln = 0
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == _FICHERO:
            ln = tb.tb_lineno
        tb = tb.tb_next
    return ln

def _variables(ns):
    out = {}
    for k, v in dict.items(ns):
        if k.startswith("_") or k in _OCULTOS:
            continue
        if isinstance(v, (bool, int, float, str)):
            out[k] = v
    return json.dumps(out)

def _ejecutar(code, ns, modo):
    glob, ns = ns
    cuenta = [0]
    def local(frame, event, arg):
        if event == "line":
            cuenta[0] += 1
            if cuenta[0] > 30000:
                raise _Bucle()
        return local
    def traza(frame, event, arg):
        if frame.f_code.co_filename == _FICHERO:
            return local
        return None
    try:
        comp = compile(code, _FICHERO, modo)
    except SyntaxError as e:
        texto = (e.text or "").strip()
        m = re.match(r"(If|Elif|Else|While|For|In|Not|And|Or)\b", texto)
        if m and type(e).__name__ == "SyntaxError":
            return ["error", e.lineno or 0, "ErrorHeroe", "«" + m.group(1) + "» se escribe en minúscula: " + m.group(1).lower() + ". Python distingue mayúsculas de minúsculas.", _variables(ns)]
        if re.match(r"else\s*[^\s:]", texto):
            return ["error", e.lineno or 0, "ErrorHeroe", "else no lleva condición: se escribe solo «else:». Si quieres otra condición, usa elif.", _variables(ns)]
        return ["error", e.lineno or 0, type(e).__name__, e.msg or "", _variables(ns)]
    mal = _llamada_a_orden(code)
    if mal:
        return ["error", mal[0], "ErrorHeroe", mal[1], _variables(ns)]
    sys.settrace(traza)
    try:
        exec(comp, glob, ns)
        res = ["ok", 0, "", ""]
    except _Fin:
        res = ["ok", 0, "", ""]
    except _Bucle as e:
        res = ["bucle", _linea(e), "", ""]
    except NameError as e:
        msg = str(e)
        nombre = getattr(e, "name", None)
        if nombre:
            candidatos = [k for k in dict.keys(ns) if not k.startswith("_")] + list(_AUTO) + list(_MOVS) + ["print", "input", "int", "str", "float", "atacar", "respuesta", "tipo"]
            parecidos = [k for k in candidatos if k.lower() == nombre.lower()] or difflib.get_close_matches(nombre, candidatos, n=1, cutoff=0.75)
            if parecidos:
                msg += "||" + parecidos[0]
        res = ["error", _linea(e), "NameError", msg]
    except Exception as e:
        res = ["error", _linea(e), type(e).__name__, str(e)]
    finally:
        sys.settrace(None)
    res.append(_variables(ns))
    return res

def _ns_nuevo(extra):
    glob = {"__name__": "__main__", "input": _input, "hay_camino": _hay_camino}
    ns = _Mundo()
    for k, v in json.loads(extra or "{}").items():
        dict.__setitem__(ns, k, v)
    return (glob, ns)

def _run(code, extra="{}"):
    return _ejecutar(code, _ns_nuevo(extra), "exec")

# consola directa: el espacio de nombres se conserva entre órdenes
_NS_VIVO = None

def _vivo_nuevo(extra="{}"):
    global _NS_VIVO
    _NS_VIVO = _ns_nuevo(extra)

def _vivo_reponer(code, extra="{}"):
    _vivo_nuevo(extra)
    return _ejecutar(code, _NS_VIVO, "exec")

def _vivo(code):
    if _NS_VIVO is None:
        _vivo_nuevo()
    return _ejecutar(code, _NS_VIVO, "single")
`;

if (typeof module !== 'undefined' && module.exports) module.exports = { LEVELS, MUNDOS, API_DOCS, crearPartida, makeApi, terminar, revisar, leerVars, traducirError, PRELUDE, contarLineas, snap };
