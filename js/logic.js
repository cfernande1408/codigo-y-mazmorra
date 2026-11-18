// ===== Código y Mazmorra · lógica del juego (sin DOM) =====
const NOMBRES = ["Grumo","Babos","Torvo","Mocarro","Zarpas","Lodo","Bufo","Pringue","Moco","Ceporro","Gorgojo","Tufo"];
const CLAVES = ["abracadabra","calabaza","murcielago","tostada","kraken","pimiento","bigote","pepinillo","zanahoria","catapulta","macarrones","escarabajo"];
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

// Pasillo con puertas (rejas) que se abren diciendo la respuesta correcta.
// H en x=1, rejas en x=3, 5, 7…, salida justo detrás de la última.
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
    intro: `<p>Te has despertado en una celda del palacio. Para moverte tienes que dar órdenes en <b>Python</b>. Se escriben igual que <code>print()</code>: el nombre y unos paréntesis. Escribe una en la <b>consola de debajo del mapa</b> y pulsa Enter: el héroe se mueve al momento.</p><pre>derecha()</pre><p>Llega a la salida (el portal). Tienes <b>3 vidas</b>: cada vez que te chocas pierdes una, pero sigues donde estabas. Cada orden se apunta en el editor: al final tendrás un programa que puedes lanzar entero con <b>Ejecutar</b>.</p>`,
    hint: `Te hacen falta 6 órdenes: 2 a la derecha, 2 abajo y otra vez 2 a la derecha. Van en minúsculas y siempre con paréntesis al final: <code>abajo()</code>.`,
    starter: `# Aquí se apuntan tus órdenes. Cada línea es una orden para el héroe\n`,
    make: () => ({ map: ["#######", "#H..###", "###.###", "###..S#", "#######"], enemies: [] })
  },
  {
    clave: 'gemas', title: "El pasillo de las gemas", concept: "Números", goals: ["gemas", "salida"], maxLines: 3,
    nuevos: [],
    intro: `<p>Escribir <code>derecha()</code> siete veces es un rollo. Puedes poner un <b>número entero</b> (<code>int</code>) entre los paréntesis:</p><pre>derecha(7)</pre><p>Recoge las dos gemas y llega a la salida.</p>`,
    hint: `Derecha 7, abajo 2 e izquierda 7. Las gemas se recogen solas al pasar por encima.`,
    starter: `derecha(7)\n`,
    make: () => ({ map: ["##########", "#H....g..#", "########.#", "#S..g....#", "##########"], enemies: [] })
  },
  {
    clave: 'guardias', title: "Los guardias", concept: "Textos (str)", goals: ["salida"], maxLines: 7,
    nuevos: ["atacar"],
    intro: `<p>Dos guardias te cortan el paso. Para atacar, escribe su nombre <b>entre comillas</b>:</p><pre>atacar("Grumo")</pre><p>Un texto entre comillas es un <b>string</b> (<code>str</code>). Cada golpe quita 1 vida y cada guardia tiene 2. Tienes que estar <b>pegado</b> a él para atacar.</p>`,
    hint: `Avanza 1, ataca a Grumo dos veces, avanza 4, ataca a Babos dos veces y avanza 3. Las mayúsculas cuentan: <code>"grumo"</code> no es lo mismo que <code>"Grumo"</code>.`,
    starter: `derecha()\n`,
    make: () => ({ map: ["###########", "#H.E...E.S#", "###########"], enemies: [{ name: "Grumo", hp: 2 }, { name: "Babos", hp: 2 }] })
  },
  {
    clave: 'escalones', title: "Los escalones", concept: "Variables", goals: ["salida"], maxLines: 6,
    nuevos: [],
    intro: `<p>Los tres escalones miden lo mismo: 3 casillas. En vez de escribir el 3 cada vez, guárdalo en una <b>variable</b>:</p><pre>pasos = 3\nderecha(pasos)</pre><p>El <code>=</code> no significa «igual»: significa «guarda este valor con este nombre». Crea la variable <code>pasos</code> y úsala para bajar hasta la salida.</p>`,
    hint: `Derecha <code>pasos</code>, abajo 1, derecha <code>pasos</code>, abajo 1 y derecha <code>pasos</code>. El nombre de la variable va sin comillas.`,
    starter: `pasos = 3\nderecha(pasos)\n`,
    comprobar: v => v.pasos === 3 ? [] : [v.pasos === undefined ? 'Te falta crear la variable pasos con el valor 3.' : `La variable pasos vale ${JSON.stringify(v.pasos)}, pero tenía que valer 3.`],
    make: () => {
      const g = blank(12, 5); let x = 1, y = 1; g[y][x] = 'H';
      for (let k = 0; k < 3; k++) { for (let i = 0; i < 3; i++) g[y][++x] = '.'; if (k < 2) g[++y][x] = '.'; }
      g[y][x] = 'S';
      return { map: toRows(g), enemies: [] };
    }
  },
  {
    clave: 'clave', title: "La puerta con clave", concept: "Variables con valores", goals: ["salida"], maxLines: 4, random: true,
    nuevos: ["leer", "decir"],
    intro: `<p>La reja solo se abre si dices la contraseña de la placa. Pero <b>la contraseña cambia cada vez que ejecutas</b>, así que no puedes copiarla a mano. Guárdala en una variable:</p><pre>clave = leer()</pre><p>Luego úsala con <code>decir(clave)</code>. Ahí va sin comillas: es el nombre de la variable, no un texto.</p>`,
    hint: `La placa está justo encima de ti. Lee, avanza 2 hasta la reja, di la clave y avanza 4.`,
    starter: `clave = leer()\nprint(clave)\n`,
    make: () => { const pw = CLAVES[rnd(0, CLAVES.length - 1)]; return { map: ["#########", "#C#######", "#H..D..S#", "#########"], enemies: [], signo: pw, doors: [{ respuesta: pw, etiqueta: '?' }] }; }
  },
  {
    clave: 'constantes', title: "Las constantes del palacio", concept: "Constantes", goals: ["salida"], maxLines: 5,
    nuevos: [],
    intro: `<p>Una <b>constante</b> es una variable que no va a cambiar nunca. En Python se escriben en <b>MAYÚSCULAS</b> y se ponen al principio del programa:</p><pre>ANCHO = 4\nALTO = 2</pre><p>Python no impide cambiarlas, pero es una norma que todo el mundo respeta. Define <code>ANCHO</code> y <code>ALTO</code> con las medidas de la torre y úsalas para llegar arriba.</p>`,
    hint: `Derecha <code>ANCHO</code>, arriba <code>ALTO</code> y derecha <code>ANCHO</code> otra vez. Mayúsculas y minúsculas son nombres distintos: <code>ANCHO</code> no es <code>ancho</code>.`,
    starter: `# Constantes de la torre (siempre en MAYÚSCULAS)\nANCHO = 4\n\nderecha(ANCHO)\n`,
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
    intro: `<p>En esta cámara hay <code>cofres</code> llenos de <code>oro</code> y unos <code>ladrones</code> esperando su parte. Esas tres variables <b>ya existen</b> y cambian en cada partida (míralas con <code>print(oro)</code>). Cada reja pide un cálculo:</p><pre>reja ×   oro total:     oro * cofres\nreja //  a cada ladrón: total // ladrones\nreja %   lo que sobra:  total % ladrones</pre><p>Guarda el total en una variable para no repetir el cálculo.</p>`,
    hint: `<pre>total = oro * cofres\nderecha()\ndecir(total)\nderecha(2)</pre>y lo mismo con <code>total // ladrones</code> y <code>total % ladrones</code>. Ojo: <code>/</code> da decimales; para repartir en enteros se usa <code>//</code>.`,
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
    intro: `<p>Tres rejas que solo abren con palabras. Las variables <code>guardian</code> (un nombre) y <code>veces</code> (un número) ya existen y cambian en cada partida.</p><pre>reja +    "Hola, " + guardian\nreja *    "ja" * veces\nreja """  el pergamino de 3 líneas</pre><p>El pergamino es un <b>bloque de texto</b>: un texto de varias líneas escrito entre <b>comillas triples</b>:</p><pre>hechizo = """Uno para el sol\nDos para la luna\nTres para abrir"""</pre><p>Este nivel es mejor resolverlo en el editor con <b>Ejecutar</b>, porque la consola es de una sola línea.</p>`,
    hint: `Con <code>+</code> se juntan textos y con <code>*</code> se repiten. El saludo tiene que quedar exacto, con su coma y su espacio: <code>Hola, Grumo</code>.`,
    starter: `hechizo = """Uno para el sol\nDos para la luna\nTres para abrir"""\n\nderecha()\n`,
    make: () => {
      const guardian = NOMBRES[rnd(0, NOMBRES.length - 1)], veces = rnd(2, 5), hechizo = 'Uno para el sol\nDos para la luna\nTres para abrir';
      return pasilloPuertas([
        { respuesta: 'Hola, ' + guardian, etiqueta: '+', pista: t => String(t).replace(/[ ,]/g, '').toLowerCase() === ('Hola' + guardian).toLowerCase() ? `Casi: tiene que quedar exactamente «Hola, ${guardian}», con la coma y el espacio.` : 'Esta reja quiere un saludo: "Hola, " + guardian.' },
        { respuesta: 'ja'.repeat(veces), etiqueta: '*', pista: t => /^(ja)+$/.test(String(t)) ? `Son ${String(t).length / 2} «ja», pero tienen que ser veces (usa "ja" * veces).` : 'Esta reja quiere una risa: "ja" repetido veces.' },
        { respuesta: hechizo, etiqueta: '"""', pista: t => String(t).split('\n').length < 3 ? 'El pergamino tiene 3 líneas: escríbelo entre comillas triples """...""".' : 'Revisa el pergamino letra a letra: tiene que ser idéntico.' }
      ], { vars: { guardian, veces } });
    }
  },
  {
    clave: 'roto', title: "Código roto", concept: "Errores", goals: ["salida"], maxLines: null,
    nuevos: [],
    intro: `<p>Un aprendiz ha dejado un programa que <b>tiene tres errores</b>. Ejecútalo, lee el mensaje de la consola (y la línea marcada en rojo) y arréglalo. Repite hasta que funcione.</p><ul><li><b>SyntaxError</b>: algo mal escrito (comillas, paréntesis…).</li><li><b>NameError</b>: un nombre que Python no conoce.</li><li><b>TypeError</b>: mezclar tipos que no casan, como texto + número.</li></ul>`,
    hint: `Hay unas comillas sin cerrar, una variable mal escrita y un número que hay que convertir a texto con <code>str()</code> para poder juntarlo con <code>+</code>.`,
    starter: `# Este programa tiene 3 errores. Ejecútalo y arréglalos uno a uno.\npasos = 3\nderecha(paso)\n\ngemas = 3\nmensaje = "Llevo " + gemas + " gemas"\ndecir(mensaje)\n\nderecha(pasos + 1)\nprint("¡Fuera!)\n`,
    make: () => ({ map: ["##########", "#H...D..S#", "##########"], enemies: [], doors: [{ respuesta: 'Llevo 3 gemas', etiqueta: '!', pista: t => `Has dicho «${t}», pero la reja espera «Llevo 3 gemas».` }] })
  },
  {
    clave: 'placa', title: "La placa de los pasos", concept: "Conversiones: int()", goals: ["salida"], maxLines: 4, random: true,
    nuevos: ["int", "str"],
    intro: `<p>La placa dice cuántos pasos hay hasta la reja, pero <code>leer()</code> siempre devuelve un <b>texto</b>: <code>"4"</code>, no <code>4</code>. Para usarlo como número hay que <b>convertirlo</b>:</p><pre>numero = int(leer())</pre><p>Avanza ese número de pasos y di a la reja <b>el doble</b> del número de la placa. Si te olvidas de <code>int()</code>, <code>"4" * 2</code> te da <code>"44"</code>…</p>`,
    hint: `<code>int()</code> convierte un texto en número entero, <code>float()</code> en decimal y <code>str()</code> un número en texto. Después de la reja hay 2 pasos hasta la salida.`,
    starter: `texto = leer()\nprint(texto, type(texto))\n`,
    make: () => {
      const n = rnd(2, 6), g = blank(11, 4);
      for (let x = 1; x <= 3 + n; x++) g[2][x] = '.';
      g[1][1] = 'C'; g[2][1] = 'H'; g[2][2 + n] = 'D'; g[2][3 + n] = 'S';
      return { map: toRows(g), enemies: [], signo: String(n), doors: [{ respuesta: String(2 * n), etiqueta: '×2', pista: t => String(t) === String(n).repeat(2) ? `Has dicho «${t}»: has repetido un texto. Conviértelo antes con int().` : `La reja quiere el doble del número de la placa.` }] };
    }
  },
  {
    clave: 'guardian', title: "El guardián pregunta", concept: "Entrada: input()", goals: ["salida"], maxLines: 6, random: true,
    nuevos: ["input"],
    intro: `<p><code>input()</code> le hace una pregunta a la persona que está jugando (¡tú!) y devuelve lo que escribe, <b>siempre como texto</b>:</p><pre>respuesta = input("¿Cuántos pasos? ")</pre><p>El pasillo mide algo distinto cada vez. Pregunta cuántos pasos hay hasta la reja (cuéntalos en el mapa cuando salga la pregunta), conviértelo con <code>int()</code> y avanza. Luego pregunta tu nombre y di a la reja <code>"Soy "</code> + tu nombre.</p>`,
    hint: `<pre>pasos = int(input("¿Cuántos pasos? "))\nderecha(pasos)\nnombre = input("¿Cómo te llamas? ")</pre>Después de la reja hay 2 pasos hasta la salida.`,
    starter: `pasos = input("¿Cuántos pasos hay hasta la reja? ")\nprint(pasos, type(pasos))\n`,
    comprobar: (v, s) => s.preguntas >= 2 ? [] : ['Tienes que usar input() para preguntar los pasos y tu nombre.'],
    make: () => {
      const n = rnd(3, 6), g = blank(11, 3);
      for (let x = 1; x <= 3 + n; x++) g[1][x] = '.';
      g[1][1] = 'H'; g[1][2 + n] = 'D'; g[1][3 + n] = 'S';
      return { map: toRows(g), enemies: [], doors: [{ valida: t => /^Soy \S/.test(String(t)), etiqueta: '?', pista: () => 'La reja quiere oír «Soy » seguido de tu nombre: "Soy " + nombre.' }] };
    }
  },
  {
    clave: 'verdad', title: "Las rejas de la verdad", concept: "Comparaciones y lógica", goals: ["salida"], maxLines: 8, random: true,
    nuevos: [],
    intro: `<p>La variable <code>numero</code> ya existe y cambia en cada partida. Cada reja pide <code>True</code> o <code>False</code>, y Python lo calcula por ti con una <b>comparación</b>:</p><pre>reja >    numero > 10\nreja ==   numero % 2 == 0     (¿es par?)\nreja and  numero > 10 and numero % 2 == 0</pre><p>Dile a cada reja el resultado: <code>decir(numero > 10)</code>.</p>`,
    hint: `Las comparaciones (<code>&gt; &lt; == !=</code>) devuelven <code>True</code> o <code>False</code>. <code>and</code> solo es <code>True</code> si las dos partes lo son. No escribas True a mano: deja que Python lo calcule.`,
    starter: `print("El número es", numero)\nderecha()\n`,
    make: () => {
      const numero = rnd(1, 30), b = x => x ? 'True' : 'False';
      const pista = q => t => /^(true|false|si|sí|no)$/i.test(String(t)) && !/^(True|False)$/.test(String(t)) ? 'Di el resultado de la comparación, por ejemplo decir(numero > 10). Python escribe True y False con mayúscula.' : `La pregunta de esta reja es: ${q}`;
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
    hint: `Dentro del bucle van dos órdenes: <code>derecha(2)</code> y <code>abajo()</code>. No te olvides de los dos puntos <code>:</code> al final de la línea del <code>for</code>.`,
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
    nuevos: ["hay_camino"],
    intro: `<p>Cada vez que ejecutas, el pasillo mide algo distinto. Necesitas un bucle que se repita <b>mientras</b> haya camino:</p><pre>while hay_camino("derecha"):\n    derecha()</pre><p>Cuando se acabe el pasillo, la salida está justo debajo.</p>`,
    hint: `Después del <code>while</code>, ya sin sangría, añade la orden para bajar.`,
    starter: `while hay_camino("derecha"):\n    \n`,
    make: () => {
      const L = rnd(4, 10), g = blank(13, 4);
      for (let x = 1; x <= 1 + L; x++) g[1][x] = '.';
      g[1][1] = 'H'; g[2][1 + L] = 'S';
      return { map: toRows(g), enemies: [] };
    }
  },
  {
    clave: 'emboscada', title: "Emboscada", concept: "Condicionales if", goals: ["salida"], maxLines: 5, random: true,
    nuevos: ["enemigo_cercano"],
    intro: `<p>Hay guardias en sitios que cambian en cada partida. Avanza casilla a casilla y, <b>si</b> tienes un enemigo al lado, atácalo antes de seguir.</p><pre>enemigo = enemigo_cercano()\nif enemigo:\n    atacar(enemigo)</pre><p><code>enemigo_cercano()</code> te da su nombre, o <code>None</code> si no hay nadie. Un <code>if</code> con <code>None</code> funciona como <code>False</code>. Estos guardias caen de un golpe.</p>`,
    hint: `Son 8 pasos: <code>for i in range(8):</code>. Dentro: mira si hay enemigo, atácalo si lo hay y después avanza.`,
    starter: `for i in range(8):\n    derecha()\n`,
    make: pasilloConGuardias(1, 1, 2, 4)
  },
  {
    clave: 'tozudos', title: "Guardias tozudos", concept: "while dentro de for", goals: ["salida"], maxLines: 5, random: true,
    nuevos: [],
    intro: `<p>Estos guardias aguantan entre 1 y 3 golpes, y no sabes cuántos. Tienes que atacar <b>mientras</b> siga habiendo un enemigo a tu lado.</p><p>Es un bucle <code>while</code> metido dentro de un bucle <code>for</code>. Fíjate bien en la sangría: cada nivel, 4 espacios más.</p>`,
    hint: `Parte de tu solución del nivel anterior y cambia el <code>if</code> por un <code>while</code>. Dentro del while puedes atacar a <code>enemigo_cercano()</code> directamente.`,
    starter: `for i in range(8):\n    derecha()\n`,
    make: pasilloConGuardias(1, 3, 3, 5)
  },
  {
    clave: 'columnas', title: "Las tres columnas", concept: "Funciones (def)", goals: ["gemas", "salida"], maxLines: 8,
    nuevos: [],
    intro: `<p>Rodea cada columna para recoger sus gemas. Las tres vueltas son iguales, así que crea tu propia orden con <code>def</code>:</p><pre>def vuelta():\n    derecha(2)\n    # ...\n\nvuelta()</pre><p>Definir una función no hace nada por sí solo: hay que <b>llamarla</b> escribiendo su nombre con paréntesis.</p>`,
    hint: `Una vuelta: derecha 2, abajo 2, izquierda 2, arriba 2. Entre columna y columna, avanza 4 a la derecha. Puedes combinar la función con un <code>for</code>.`,
    starter: `def vuelta():\n    derecha(2)\n\nvuelta()\n`,
    make: () => {
      const g = blank(15, 5);
      for (let k = 0; k < 3; k++) {
        const x0 = 1 + 4 * k;
        for (let x = x0; x <= x0 + 3; x++) g[1][x] = '.';
        for (let x = x0; x <= x0 + 2; x++) g[3][x] = '.';
        g[2][x0] = '.'; g[2][x0 + 2] = '.';
        g[1][x0 + 2] = 'g'; g[3][x0 + 2] = 'g'; g[3][x0] = 'g';
      }
      g[1][1] = 'H'; g[1][13] = 'S';
      return { map: toRows(g), enemies: [] };
    }
  },
  {
    clave: 'laberinto', title: "El laberinto", concept: "Algoritmos", goals: ["salida"], maxLines: null, random: true,
    nuevos: ["mover", "en_salida"],
    intro: `<p>Un laberinto distinto en cada partida. Hay un truco clásico: la <b>regla de la mano derecha</b>. Si apoyas la mano en la pared de tu derecha y nunca la sueltas, acabas encontrando la salida.</p><p>En cada paso: si puedes girar a la derecha, gira; si no, sigue recto; si tampoco, gira a la izquierda; y si no hay nada, date la vuelta. Guarda hacia dónde miras en una variable y usa una lista de direcciones.</p>`,
    hint: `<pre>if hay_camino(direcciones[dcha]):\n    mirando = dcha\nelif hay_camino(direcciones[mirando]):\n    pass\nelif hay_camino(direcciones[(mirando + 3) % 4]):\n    mirando = (mirando + 3) % 4\nelse:\n    mirando = (mirando + 2) % 4</pre>`,
    starter: `direcciones = ["arriba", "derecha", "abajo", "izquierda"]\nmirando = 1  # miras a la derecha (posición 1)\n\nwhile not en_salida():\n    dcha = (mirando + 1) % 4  # lo que queda a tu derecha\n    # 1) ¿Camino a la derecha? Gira hacia allí\n    # 2) Si no, ¿camino de frente? Sigue recto\n    # 3) Si no, gira a la izquierda o date la vuelta\n    mover(direcciones[mirando])\n`,
    make: laberinto
  },
  {
    clave: 'potencias', title: "La torre de las potencias", concept: "Potencias y prioridad", goals: ["salida"], maxLines: 7, random: true,
    nuevos: [],
    intro: `<p>Más operadores. <code>**</code> es la <b>potencia</b>: <code>2 ** 3</code> es 2 × 2 × 2 = 8. Y cuidado con el <b>orden</b>: igual que en mates, Python hace primero <code>**</code>, luego <code>* / // %</code> y al final <code>+ -</code>. Los paréntesis van siempre primero.</p><pre>reja **   base ** exponente\nreja +*   base + extra * 2\nreja ()   (base + extra) * 2</pre><p>Las variables <code>base</code>, <code>exponente</code> y <code>extra</code> ya existen y cambian en cada partida.</p>`,
    hint: `Escribe las cuentas tal cual en Python y deja que él las calcule: <code>decir(base + extra * 2)</code>. Fíjate en que las dos últimas rejas dan resultados distintos.`,
    starter: `print(base, exponente, extra)\nderecha()\n`,
    make: () => {
      const base = rnd(2, 5), exponente = rnd(2, 3), extra = rnd(2, 6);
      const r1 = base ** exponente, r2 = base + extra * 2, r3 = (base + extra) * 2;
      return pasilloPuertas([
        { respuesta: String(r1), etiqueta: '**', pista: t => String(t) === String(base * exponente) ? `Has dicho ${t}: eso es base * exponente. La potencia es **.` : 'Esta reja pide base ** exponente.' },
        { respuesta: String(r2), etiqueta: '+*', pista: t => String(t) === String(r3) ? 'Ojo con la prioridad: * se hace antes que +. Python calcula primero extra * 2.' : 'Esta reja pide base + extra * 2.' },
        { respuesta: String(r3), etiqueta: '()', pista: t => String(t) === String(r2) ? 'Aquí hay paréntesis: (base + extra) se calcula primero.' : 'Esta reja pide (base + extra) * 2.' }
      ], { vars: { base, exponente, extra } });
    }
  },
  {
    clave: 'roto2', title: "Código roto 2", concept: "Más errores", goals: ["salida"], maxLines: null,
    nuevos: [],
    intro: `<p>Otro programa estropeado, con <b>tres errores</b> distintos de los de antes. Ejecútalo, lee cada mensaje y arréglalo:</p><ul><li><b>IndentationError</b>: espacios de más al principio de una línea.</li><li><b>NameError</b>: Python distingue MAYÚSCULAS y minúsculas.</li><li><b>ValueError</b>: <code>int()</code> solo convierte textos que son números, como <code>"3"</code>.</li></ul>`,
    hint: `Quita los espacios del principio de la línea 3, usa el mismo nombre que la constante y cambia <code>"tres"</code> por <code>"3"</code>.`,
    starter: `# Otro programa con 3 errores. Ejecútalo y arréglalos uno a uno.\nALTO = 2\n  derecha(2)\narriba(alto)\n\npasos = int("tres")\nderecha(pasos)\n`,
    make: () => ({ map: ["########", "###...S#", "###.####", "#H..####", "########"], enemies: [] })
  }
];

// ---------- mundos: cada uno es un tema con sus niveles ----------
const MUNDOS = [
  { id: 1, ra: 1, titulo: 'Primeros pasos', tema: 'Instrucciones y números', color: '#2fc6b8', icono: '👣', niveles: ['celda', 'gemas'],
    desc: 'Tus primeras órdenes en Python: moverte por el palacio sin chocarte.' },
  { id: 2, ra: 1, titulo: 'Variables y constantes', tema: 'Guardar valores con nombre', color: '#f2b544', icono: '📦', niveles: ['escalones', 'clave', 'constantes'],
    desc: 'Guarda valores con un nombre, léelos de las placas y escribe constantes en MAYÚSCULAS.' },
  { id: 3, ra: 1, titulo: 'Textos', tema: 'Strings y bloques de texto', color: '#ff4f8b', icono: '📜', niveles: ['guardias', 'palabras'],
    desc: 'Comillas, unir y repetir textos y bloques de varias líneas.' },
  { id: 4, ra: 1, titulo: 'Operadores', tema: 'Aritméticos, comparaciones y lógicos', color: '#c58bff', icono: '➗', niveles: ['tesoro', 'potencias', 'verdad'],
    desc: 'Cuentas con + - * / // % **, prioridad, comparaciones y and.' },
  { id: 5, ra: 1, titulo: 'Entrada y conversiones', tema: 'input(), int() y str()', color: '#5ec8ff', icono: '⌨️', niveles: ['placa', 'guardian'],
    desc: 'Pregunta a quien juega y convierte textos en números.' },
  { id: 6, ra: 1, titulo: 'Errores', tema: 'Leer y arreglar errores', color: '#ff7a3d', icono: '🐞', niveles: ['roto', 'roto2'],
    desc: 'Programas rotos: lee el mensaje de error, encuentra la línea y arréglalo.' },
  { id: 7, ra: 2, titulo: 'Bucles', tema: 'for y while', color: '#7be07b', icono: '🔁', niveles: ['caracol', 'sinfin'],
    desc: 'Repite órdenes sin copiar y pegar.' },
  { id: 8, ra: 2, titulo: 'Condiciones', tema: 'if y bucles anidados', color: '#ffd35a', icono: '🔀', niveles: ['emboscada', 'tozudos'],
    desc: 'Decide qué hacer según lo que encuentres.' },
  { id: 9, ra: 2, titulo: 'Funciones y algoritmos', tema: 'def y el laberinto', color: '#9fa8ff', icono: '🧩', niveles: ['columnas', 'laberinto'],
    desc: 'Crea tus propias órdenes y escapa del laberinto.' }
];
(function ordenarNiveles() {
  const orden = MUNDOS.flatMap(m => m.niveles);
  LEVELS.sort((a, b) => orden.indexOf(a.clave) - orden.indexOf(b.clave));
  LEVELS.forEach((L, i) => { L.id = i + 1; L.mundo = MUNDOS.find(m => m.niveles.includes(L.clave)).id; });
  MUNDOS.forEach(m => { m.ids = m.niveles.map(c => LEVELS.find(L => L.clave === c).id); });
})();

const API_DOCS = {
  derecha: { sig: "derecha(pasos)", ins: "derecha()", desc: "Avanza a la derecha. Sin número, 1 casilla." },
  izquierda: { sig: "izquierda(pasos)", ins: "izquierda()", desc: "Avanza a la izquierda." },
  arriba: { sig: "arriba(pasos)", ins: "arriba()", desc: "Sube por una escalera." },
  abajo: { sig: "abajo(pasos)", ins: "abajo()", desc: "Baja por una escalera." },
  print: { sig: "print(valor)", ins: "print()", desc: "Muestra un valor en la consola. Muy útil para investigar." },
  atacar: { sig: 'atacar("Nombre")', ins: 'atacar("")', desc: "Golpea al enemigo con ese nombre. Tiene que estar pegado a ti." },
  leer: { sig: "leer()", ins: "leer()", desc: "Lee la placa que tienes al lado. Devuelve siempre un texto." },
  decir: { sig: "decir(texto)", ins: "decir()", desc: "El héroe dice algo en voz alta. Las rejas mágicas escuchan." },
  operadores: { sig: "+  -  *  /  //  %  **", ins: " * ", desc: "Suma, resta, multiplica, divide, división entera, resto y potencia." },
  textos: { sig: 'texto + texto · texto * n · """..."""', ins: '"""\n\n"""', desc: "Juntar textos, repetirlos y escribir bloques de varias líneas." },
  int: { sig: "int(texto)", ins: "int()", desc: "Convierte un texto en número entero: int(\"4\") → 4. También float() para decimales." },
  str: { sig: "str(numero)", ins: "str()", desc: "Convierte un número en texto para poder juntarlo con +." },
  input: { sig: 'input("pregunta")', ins: 'input("")', desc: "Pregunta a quien juega y devuelve lo que escribe, siempre como texto." },
  hay_camino: { sig: 'hay_camino("derecha")', ins: 'hay_camino("derecha")', desc: "True si puedes moverte en esa dirección; False si hay pared u obstáculo." },
  enemigo_cercano: { sig: "enemigo_cercano()", ins: "enemigo_cercano()", desc: "Nombre del enemigo que tienes al lado, o None si no hay nadie." },
  mover: { sig: "mover(direccion, pasos)", ins: 'mover("derecha")', desc: "Como derecha() o abajo(), pero la dirección va en un texto o una variable." },
  en_salida: { sig: "en_salida()", ins: "en_salida()", desc: "True si estás encima de la salida." }
};

// ---------- simulación ----------
const DIRS = { derecha: [1, 0], izquierda: [-1, 0], arriba: [0, -1], abajo: [0, 1] };
const HUES = [110, 280, 320, 190, 250];
function hueOf(name) { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0; return HUES[h % HUES.length]; }

function crearPartida(level, datos) {
  const d = datos || level.make(); const map = d.map; const h = map.length, w = map[0].length;
  const s = { w, h, tiles: [], hero: null, facing: 1, enemies: [], gems: [], doors: [], sign: null, exit: null,
    signText: d.signo != null ? String(d.signo) : (d.password || ''), vars: d.vars || {}, comprobar: level.comprobar || null,
    preguntas: 0, vidas: VIDAS, goals: level.goals, frames: [], over: null, datos: d };
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
      else if (c === 'D') { t = 'D'; const sp = specs[s.doors.length] || {}; s.doors.push(Object.assign({ x, y, open: false, etiqueta: '' }, sp)); }
      else if (c === 'C') { t = 'C'; s.sign = { x, y }; }
      row.push(t);
    }
    s.tiles.push(row);
  }
  return s;
}

function snap(s, extra) {
  return Object.assign({ hx: s.hero.x, hy: s.hero.y, facing: s.facing, enemies: s.enemies.map(e => ({ ...e })),
    gems: s.gems.map(g => ({ ...g })), doors: s.doors.map(d => d.open), vidas: s.vidas, dur: 1 }, extra || {});
}
function enemyAt(s, x, y) { return s.enemies.find(e => e.hp > 0 && e.x === x && e.y === y); }
function doorAt(s, x, y) { return s.doors.find(d => d.x === x && d.y === y); }
function dentro(s, x, y) { return x >= 0 && y >= 0 && x < s.w && y < s.h; }
function libre(s, x, y) {
  if (!dentro(s, x, y)) return false;
  const t = s.tiles[y][x];
  if (t === '#' || t === ' ' || t === 'C') return false;
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
          : t === 'D' ? 'La reja está cerrada. Tienes que decirle la respuesta.'
          : t === 'C' ? 'Te has chocado con la placa.'
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
    decir(t) {
      const s = getSim(); if (s.over) return;
      push(s, { say: t, dur: 1.4 });
      const d = s.doors.find(d => !d.open && pegado(s, d));
      if (!d) return;
      if (d.x !== s.hero.x) s.facing = Math.sign(d.x - s.hero.x);
      if (puertaAcepta(d, t)) { d.open = true; push(s, { dur: 1, log: { text: '¡La reja se abre!', kind: 'info' } }); }
      else push(s, { dur: 0.6, log: { text: d.pista ? d.pista(t) : 'La reja no se abre: esa no es la respuesta.', kind: 'warn' } });
    },
    leer() {
      const s = getSim(); if (s.over) return '';
      if (!pegado(s, s.sign)) { push(s, { say: '¿Qué leo?', log: { text: 'No hay ninguna placa pegada a ti.', kind: 'warn' } }); return ''; }
      push(s, { say: '«' + s.signText + '»', dur: 1.4 });
      return s.signText;
    },
    pedir(msg) {
      const s = getSim(); if (s.over) return null;
      s.preguntas++;
      const r = opc.pedir ? opc.pedir(String(msg)) : null;
      push(s, { dur: 0, log: { text: `${msg}${r == null ? '(cancelado)' : r}`, kind: 'print' } });
      return r == null ? null : String(r);
    },
    enemigo_cercano() {
      const s = getSim();
      const e = s.enemies.find(e => e.hp > 0 && pegado(s, e));
      return e ? e.name : '';
    },
    hay_camino(d) { const s = getSim(); const [dx, dy] = DIRS[d]; return libre(s, s.hero.x + dx, s.hero.y + dy); },
    en_salida() { return enSalida(getSim()); },
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
      if (sug) return `Python no conoce el nombre «${n}»${L}. ¿Querías decir «${sug}»?`;
      return `Python no conoce el nombre «${n}»${L}. ¿Está mal escrito o no lo has creado todavía? Si es un texto, ponlo entre comillas: "${n}".`;
    }
    case 'AttributeError': {
      const m = /has no attribute '(.+?)'/.exec(msg);
      return `«${m ? m[1] : '?'}» no existe${L}. Mira el libro de hechizos para ver qué órdenes hay.`;
    }
    case 'TypeError':
      if (/can only concatenate str/.test(msg)) return `No se puede juntar un texto con un número usando +${L}. Convierte el número con str(), por ejemplo: "Llevo " + str(gemas).`;
      if (/unsupported operand type\(s\) for [+\-*/%]+: 'int' and 'str'|unsupported operand type\(s\) for [+\-*/%]+: 'str' and 'int'|unsupported operand type\(s\) for [-/%]+: 'str'/.test(msg)) return `Estás haciendo cuentas con un texto${L}. Si el número viene de leer() o input(), conviértelo con int().`;
      if (/can't multiply sequence by non-int of type/.test(msg)) return `No se puede multiplicar un texto por eso${L}. ¿Te falta convertir algo con int()?`;
      if (/missing \d+ required positional argument/.test(msg)) return `A esta orden le falta un dato entre los paréntesis${L}.`;
      if (/takes .* positional argument/.test(msg)) return `Le has pasado demasiados datos a una orden${L}.`;
      if (/not callable/.test(msg)) return `Estás usando paréntesis con algo que no es una orden${L}. ¿Has llamado a una variable igual que una orden (derecha, leer…)?`;
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

class Heroe:
    def _chk(self):
        if juego.terminado():
            raise _Fin()
    def _mov(self, d, pasos):
        if isinstance(pasos, str):
            raise ErrorHeroe("Has pasado un texto (" + repr(pasos) + ") en vez de un número. Si viene de leer() o input(), conviértelo con int().")
        if isinstance(pasos, float):
            raise ErrorHeroe("El número de pasos tiene que ser entero, no " + repr(pasos) + ". Prueba con // en vez de / o con int().")
        if isinstance(pasos, bool) or not isinstance(pasos, int):
            raise ErrorHeroe("El número de pasos tiene que ser un número entero, por ejemplo: derecha(3)")
        if pasos < 1:
            raise ErrorHeroe("El número de pasos tiene que ser 1 o más.")
        for _ in range(pasos):
            juego.paso(d)
            self._chk()
    def derecha(self, pasos=1): self._mov("derecha", pasos)
    def izquierda(self, pasos=1): self._mov("izquierda", pasos)
    def arriba(self, pasos=1): self._mov("arriba", pasos)
    def abajo(self, pasos=1): self._mov("abajo", pasos)
    def mover(self, direccion, pasos=1): self._mov(_dir(direccion), pasos)
    def atacar(self, nombre):
        if not isinstance(nombre, str):
            raise ErrorHeroe('Para atacar, escribe el nombre del enemigo entre comillas: atacar("Grumo")')
        juego.atacar(nombre)
        self._chk()
    def decir(self, texto=""):
        juego.decir(str(texto))
        self._chk()
    def leer(self):
        r = juego.leer()
        self._chk()
        return str(r)
    def enemigo_cercano(self):
        r = juego.enemigo_cercano()
        return str(r) if r else None
    def hay_camino(self, direccion):
        return bool(juego.hay_camino(_dir(direccion)))
    def en_salida(self):
        return bool(juego.en_salida())
    def __repr__(self):
        return "<el héroe>"

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
_ORDENES = ("derecha", "izquierda", "arriba", "abajo", "mover", "atacar", "decir", "leer",
            "enemigo_cercano", "hay_camino", "en_salida")
_OCULTOS = {"heroe", "input"} | set(_ORDENES)

def _parentesis_olvidados(code):
    # «derecha» sin paréntesis no hace nada: avisamos
    try:
        arbol = ast.parse(code)
    except SyntaxError:
        return
    for nodo in ast.walk(arbol):
        if isinstance(nodo, ast.Expr) and isinstance(nodo.value, ast.Name) and nodo.value.id in _ORDENES:
            juego.avisar("Línea " + str(nodo.lineno) + ": a «" + nodo.value.id + "» le faltan los paréntesis. Se escribe " + nodo.value.id + "()")

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
    for k, v in ns.items():
        if k.startswith("_") or k in _OCULTOS:
            continue
        if isinstance(v, (bool, int, float, str)):
            out[k] = v
    return json.dumps(out)

def _ejecutar(code, ns, modo):
    cuenta = [0]
    def local(frame, event, arg):
        if event == "line":
            cuenta[0] += 1
            if cuenta[0] > 30000:
                raise _Bucle()
        return local
    def glob(frame, event, arg):
        if frame.f_code.co_filename == _FICHERO:
            return local
        return None
    try:
        comp = compile(code, _FICHERO, modo)
    except SyntaxError as e:
        return ["error", e.lineno or 0, type(e).__name__, e.msg or "", _variables(ns)]
    _parentesis_olvidados(code)
    sys.settrace(glob)
    try:
        exec(comp, ns)
        res = ["ok", 0, "", ""]
    except _Fin:
        res = ["ok", 0, "", ""]
    except _Bucle as e:
        res = ["bucle", _linea(e), "", ""]
    except NameError as e:
        msg = str(e)
        nombre = getattr(e, "name", None)
        if nombre:
            candidatos = [k for k in ns if not k.startswith("_")] + ["print", "input", "int", "str", "float"]
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
    h = Heroe()
    ns = {"__name__": "__main__", "heroe": h, "input": _input}
    for nombre in _ORDENES:
        ns[nombre] = getattr(h, nombre)
    ns.update(json.loads(extra or "{}"))
    return ns

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
