// ===== Código y Mazmorra · lógica del juego (sin DOM) =====
const NOMBRES = ["Grumo","Babos","Torvo","Mocarro","Zarpas","Lodo","Bufo","Pringue","Moco","Ceporro","Gorgojo","Tufo"];
const CLAVES = ["abracadabra","calabaza","murcielago","tostada","kraken","pimiento","bigote","pepinillo","zanahoria","catapulta","macarrones","escarabajo"];
const MAX_FRAMES = 1200;

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

const LEVELS = [
  {
    id: 1, title: "La celda", concept: "Secuencia", goals: ["salida"], maxLines: null,
    nuevos: ["derecha", "izquierda", "arriba", "abajo", "print"],
    intro: `<p>Te has despertado en una celda de la mazmorra. Para moverte tienes que dar órdenes en <b>Python</b>. Escribe una en la <b>consola de debajo del mapa</b> y pulsa Enter: el héroe se mueve al momento.</p><pre>heroe.derecha()</pre><p>Llega a la salida (el portal) <b>sin chocarte con las paredes</b>. Cada orden se apunta en el editor: al final tendrás un programa que puedes lanzar entero con <b>Ejecutar</b>.</p>`,
    hint: `Te hacen falta 6 órdenes: 2 a la derecha, 2 abajo y otra vez 2 a la derecha. Se escribe <code>heroe</code>, en minúsculas y sin tilde, y siempre con paréntesis al final.`,
    starter: `# Aquí se apuntan tus órdenes. Cada línea es una orden para el héroe\n`,
    make: () => ({ map: ["#######", "#H..###", "###.###", "###..S#", "#######"], enemies: [] })
  },
  {
    id: 2, title: "El pasillo de las gemas", concept: "Parámetros", goals: ["gemas", "salida"], maxLines: 3,
    nuevos: [],
    intro: `<p>Escribir <code>heroe.derecha()</code> siete veces es un rollo. Puedes poner un número entre los paréntesis:</p><pre>heroe.derecha(7)</pre><p>Ese número es un <b>parámetro</b>: un dato que le pasas a la orden. Recoge las dos gemas y llega a la salida.</p>`,
    hint: `Derecha 7, abajo 2 e izquierda 7. Las gemas se recogen solas al pasar por encima.`,
    starter: `heroe.derecha(7)\n`,
    make: () => ({ map: ["##########", "#H....g..#", "########.#", "#S..g....#", "##########"], enemies: [] })
  },
  {
    id: 3, title: "Los guardias", concept: "Textos (strings)", goals: ["salida"], maxLines: 7,
    nuevos: ["atacar"],
    intro: `<p>Dos guardias te cortan el paso. Para atacar, escribe su nombre <b>entre comillas</b>:</p><pre>heroe.atacar("Grumo")</pre><p>Un texto entre comillas es un <b>string</b>. Cada golpe quita 1 vida y cada guardia tiene 2. Tienes que estar <b>pegado</b> a él para atacar.</p>`,
    hint: `Avanza 1, ataca a Grumo dos veces, avanza 4, ataca a Babos dos veces y avanza 3. Las mayúsculas cuentan: <code>"grumo"</code> no es lo mismo que <code>"Grumo"</code>.`,
    starter: `heroe.derecha()\n`,
    make: () => ({ map: ["###########", "#H.E...E.S#", "###########"], enemies: [{ name: "Grumo", hp: 2 }, { name: "Babos", hp: 2 }] })
  },
  {
    id: 4, title: "La escalera de caracol", concept: "Bucle for", goals: ["gemas", "salida"], maxLines: 3,
    nuevos: [],
    intro: `<p>La escalera repite el mismo movimiento 4 veces: dos a la derecha y uno abajo. En vez de copiar y pegar, usa un <b>bucle</b>:</p><pre>for i in range(4):\n    # lo que se repite</pre><p>Todo lo que esté <b>sangrado</b> (4 espacios a la derecha) debajo del <code>for</code> se repite.</p>`,
    hint: `Dentro del bucle van dos órdenes: <code>heroe.derecha(2)</code> y <code>heroe.abajo()</code>. No te olvides de los dos puntos <code>:</code> al final de la línea del <code>for</code>.`,
    starter: `for i in range(4):\n    \n`,
    make: () => {
      const g = blank(11, 7); let x = 1, y = 1; g[y][x] = 'H';
      for (let k = 0; k < 4; k++) { g[y][++x] = '.'; g[y][++x] = 'g'; g[++y][x] = '.'; }
      g[y][x] = 'S';
      return { map: toRows(g), enemies: [] };
    }
  },
  {
    id: 5, title: "La puerta con clave", concept: "Variables", goals: ["salida"], maxLines: 4, random: true,
    nuevos: ["leer", "decir"],
    intro: `<p>La puerta solo se abre si dices la contraseña del cartel. Pero <b>la contraseña cambia cada vez que ejecutas</b>, así que no puedes copiarla a mano. Guárdala en una <b>variable</b>:</p><pre>clave = heroe.leer()</pre><p>Luego úsala con <code>heroe.decir(clave)</code>. Ahí va sin comillas: es el nombre de la variable, no un texto.</p>`,
    hint: `El cartel está justo encima de ti. Lee, avanza 2 hasta la puerta, di la clave y avanza 4.`,
    starter: `clave = heroe.leer()\nprint(clave)\n`,
    make: () => ({ map: ["#########", "#C#######", "#H..D..S#", "#########"], enemies: [], password: CLAVES[rnd(0, CLAVES.length - 1)] })
  },
  {
    id: 6, title: "El pasillo sin fin", concept: "Bucle while", goals: ["salida"], maxLines: 3, random: true,
    nuevos: ["hay_camino"],
    intro: `<p>Cada vez que ejecutas, el pasillo mide algo distinto. Necesitas un bucle que se repita <b>mientras</b> haya camino:</p><pre>while heroe.hay_camino("derecha"):\n    heroe.derecha()</pre><p>Cuando se acabe el pasillo, la salida está justo debajo.</p>`,
    hint: `Después del <code>while</code>, ya sin sangría, añade la orden para bajar.`,
    starter: `while heroe.hay_camino("derecha"):\n    \n`,
    make: () => {
      const L = rnd(4, 10), g = blank(13, 4);
      for (let x = 1; x <= 1 + L; x++) g[1][x] = '.';
      g[1][1] = 'H'; g[2][1 + L] = 'S';
      return { map: toRows(g), enemies: [] };
    }
  },
  {
    id: 7, title: "Emboscada", concept: "Condicionales if", goals: ["salida"], maxLines: 5, random: true,
    nuevos: ["enemigo_cercano"],
    intro: `<p>Hay guardias en sitios que cambian en cada partida. Avanza casilla a casilla y, <b>si</b> tienes un enemigo al lado, atácalo antes de seguir.</p><pre>enemigo = heroe.enemigo_cercano()\nif enemigo:\n    heroe.atacar(enemigo)</pre><p><code>enemigo_cercano()</code> te da su nombre, o <code>None</code> si no hay nadie. Un <code>if</code> con <code>None</code> funciona como <code>False</code>. Estos guardias caen de un golpe.</p>`,
    hint: `Son 8 pasos: <code>for i in range(8):</code>. Dentro: mira si hay enemigo, atácalo si lo hay y después avanza.`,
    starter: `for i in range(8):\n    heroe.derecha()\n`,
    make: pasilloConGuardias(1, 1, 2, 4)
  },
  {
    id: 8, title: "Guardias tozudos", concept: "while dentro de for", goals: ["salida"], maxLines: 5, random: true,
    nuevos: [],
    intro: `<p>Estos guardias aguantan entre 1 y 3 golpes, y no sabes cuántos. Tienes que atacar <b>mientras</b> siga habiendo un enemigo a tu lado.</p><p>Es un bucle <code>while</code> metido dentro de un bucle <code>for</code>. Fíjate bien en la sangría: cada nivel, 4 espacios más.</p>`,
    hint: `Parte de tu solución del nivel anterior y cambia el <code>if</code> por un <code>while</code>. Dentro del while puedes atacar a <code>heroe.enemigo_cercano()</code> directamente.`,
    starter: `for i in range(8):\n    heroe.derecha()\n`,
    make: pasilloConGuardias(1, 3, 3, 5)
  },
  {
    id: 9, title: "Las tres columnas", concept: "Funciones (def)", goals: ["gemas", "salida"], maxLines: 8,
    nuevos: [],
    intro: `<p>Rodea cada columna para recoger sus gemas. Las tres vueltas son iguales, así que crea tu propia orden con <code>def</code>:</p><pre>def vuelta():\n    heroe.derecha(2)\n    # ...\n\nvuelta()</pre><p>Definir una función no hace nada por sí solo: hay que <b>llamarla</b> escribiendo su nombre con paréntesis.</p>`,
    hint: `Una vuelta: derecha 2, abajo 2, izquierda 2, arriba 2. Entre columna y columna, avanza 4 a la derecha. Puedes combinar la función con un <code>for</code>.`,
    starter: `def vuelta():\n    heroe.derecha(2)\n\nvuelta()\n`,
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
    id: 10, title: "El laberinto", concept: "Algoritmos", goals: ["salida"], maxLines: null, random: true,
    nuevos: ["mover", "en_salida"],
    intro: `<p>Un laberinto distinto en cada partida. Hay un truco clásico: la <b>regla de la mano derecha</b>. Si apoyas la mano en la pared de tu derecha y nunca la sueltas, acabas encontrando la salida.</p><p>En cada paso: si puedes girar a la derecha, gira; si no, sigue recto; si tampoco, gira a la izquierda; y si no hay nada, date la vuelta. Guarda hacia dónde miras en una variable y usa una lista de direcciones.</p>`,
    hint: `<pre>if heroe.hay_camino(direcciones[dcha]):\n    mirando = dcha\nelif heroe.hay_camino(direcciones[mirando]):\n    pass\nelif heroe.hay_camino(direcciones[(mirando + 3) % 4]):\n    mirando = (mirando + 3) % 4\nelse:\n    mirando = (mirando + 2) % 4</pre>`,
    starter: `direcciones = ["arriba", "derecha", "abajo", "izquierda"]\nmirando = 1  # miras a la derecha (posición 1)\n\nwhile not heroe.en_salida():\n    dcha = (mirando + 1) % 4  # lo que queda a tu derecha\n    # 1) ¿Camino a la derecha? Gira hacia allí\n    # 2) Si no, ¿camino de frente? Sigue recto\n    # 3) Si no, gira a la izquierda o date la vuelta\n    heroe.mover(direcciones[mirando])\n`,
    make: laberinto
  }
];

const API_DOCS = {
  derecha: { sig: "heroe.derecha(pasos)", ins: "heroe.derecha()", desc: "Avanza a la derecha. Sin número, 1 casilla." },
  izquierda: { sig: "heroe.izquierda(pasos)", ins: "heroe.izquierda()", desc: "Avanza a la izquierda." },
  arriba: { sig: "heroe.arriba(pasos)", ins: "heroe.arriba()", desc: "Avanza hacia arriba." },
  abajo: { sig: "heroe.abajo(pasos)", ins: "heroe.abajo()", desc: "Avanza hacia abajo." },
  print: { sig: "print(valor)", ins: "print()", desc: "Muestra un valor en la consola. Muy útil para investigar." },
  atacar: { sig: 'heroe.atacar("Nombre")', ins: 'heroe.atacar("")', desc: "Golpea al enemigo con ese nombre. Tiene que estar pegado a ti." },
  leer: { sig: "heroe.leer()", ins: "heroe.leer()", desc: "Lee el cartel que tienes al lado y devuelve su texto." },
  decir: { sig: "heroe.decir(texto)", ins: "heroe.decir()", desc: "El héroe dice algo en voz alta. Las puertas mágicas escuchan." },
  hay_camino: { sig: 'heroe.hay_camino("derecha")', ins: 'heroe.hay_camino("derecha")', desc: "True si puedes moverte en esa dirección; False si hay pared u obstáculo." },
  enemigo_cercano: { sig: "heroe.enemigo_cercano()", ins: "heroe.enemigo_cercano()", desc: "Nombre del enemigo que tienes al lado, o None si no hay nadie." },
  mover: { sig: "heroe.mover(direccion, pasos)", ins: 'heroe.mover("derecha")', desc: "Como derecha() o abajo(), pero la dirección va en un texto o una variable." },
  en_salida: { sig: "heroe.en_salida()", ins: "heroe.en_salida()", desc: "True si estás encima de la salida." }
};

// ---------- simulación ----------
const DIRS = { derecha: [1, 0], izquierda: [-1, 0], arriba: [0, -1], abajo: [0, 1] };
const HUES = [110, 280, 320, 190, 250];
function hueOf(name) { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0; return HUES[h % HUES.length]; }

function crearPartida(level) {
  const d = level.make(); const map = d.map; const h = map.length, w = map[0].length;
  const s = { w, h, tiles: [], hero: null, facing: 1, enemies: [], gems: [], doorOpen: false, door: null, sign: null, exit: null,
    password: d.password || "", goals: level.goals, frames: [], over: null };
  let ei = 0;
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      const c = map[y][x]; let t = '.';
      if (c === '#' || c === ' ') t = c;
      else if (c === 'H') s.hero = { x, y };
      else if (c === 'S') { t = 'S'; s.exit = { x, y }; }
      else if (c === 'g') s.gems.push({ x, y, taken: false });
      else if (c === 'E') { const e = d.enemies[ei++]; s.enemies.push({ name: e.name, hp: e.hp, max: e.hp, x, y, hue: hueOf(e.name) }); }
      else if (c === 'D') { t = 'D'; s.door = { x, y }; }
      else if (c === 'C') { t = 'C'; s.sign = { x, y }; }
      row.push(t);
    }
    s.tiles.push(row);
  }
  return s;
}

function snap(s, extra) {
  return Object.assign({ hx: s.hero.x, hy: s.hero.y, facing: s.facing, enemies: s.enemies.map(e => ({ ...e })),
    gems: s.gems.map(g => ({ ...g })), doorOpen: s.doorOpen, dur: 1 }, extra || {});
}
function enemyAt(s, x, y) { return s.enemies.find(e => e.hp > 0 && e.x === x && e.y === y); }
function dentro(s, x, y) { return x >= 0 && y >= 0 && x < s.w && y < s.h; }
function libre(s, x, y) {
  if (!dentro(s, x, y)) return false;
  const t = s.tiles[y][x];
  if (t === '#' || t === ' ' || t === 'C') return false;
  if (t === 'D' && !s.doorOpen) return false;
  return !enemyAt(s, x, y);
}
function pegado(s, p) { return p && Math.abs(p.x - s.hero.x) + Math.abs(p.y - s.hero.y) === 1; }
function enSalida(s) { return !!s.exit && s.hero.x === s.exit.x && s.hero.y === s.exit.y; }

function push(s, extra) {
  if (s.over) return;
  if (s.frames.length >= MAX_FRAMES) { fin(s, 'fail', 'Demasiadas acciones: tu programa no para nunca. ¿Tienes un bucle infinito?'); return; }
  s.frames.push(snap(s, extra));
}
function fin(s, type, msg) {
  if (s.over) return;
  s.over = { type, msg };
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

function makeApi(getSim) {
  return {
    paso(d) {
      const s = getSim(); if (s.over) return;
      const [dx, dy] = DIRS[d]; if (dx) s.facing = dx;
      const nx = s.hero.x + dx, ny = s.hero.y + dy;
      if (!libre(s, nx, ny)) {
        const e = enemyAt(s, nx, ny); const t = dentro(s, nx, ny) ? s.tiles[ny][nx] : '#';
        const msg = e ? `¡${e.name} te bloquea el paso! Primero tienes que derrotarlo.`
          : t === 'D' ? 'La puerta está cerrada. Necesitas decir la contraseña.'
          : t === 'C' ? 'Te has chocado con el cartel.'
          : '¡Pum! Te has chocado contra la pared.';
        push(s, { bump: [dx, dy], dur: 1 });
        fin(s, 'fail', msg); return;
      }
      s.hero = { x: nx, y: ny };
      const g = s.gems.find(g => !g.taken && g.x === nx && g.y === ny); if (g) g.taken = true;
      push(s, { dur: 1 });
      if (enSalida(s) && faltan(s).length === 0) fin(s, 'win', '¡Lo has conseguido!');
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
      if (pegado(s, s.door) && !s.doorOpen) {
        if (t === s.password) { s.doorOpen = true; push(s, { dur: 1, log: { text: '¡La puerta se abre!', kind: 'info' } }); }
        else push(s, { dur: 0.6, log: { text: 'La puerta no se abre: esa no es la contraseña.', kind: 'warn' } });
      }
    },
    leer() {
      const s = getSim(); if (s.over) return '';
      if (!pegado(s, s.sign)) { push(s, { say: '¿Qué leo?', log: { text: 'No hay ningún cartel pegado a ti.', kind: 'warn' } }); return ''; }
      push(s, { say: '«' + s.password + '»', dur: 1.4 });
      return s.password;
    },
    enemigo_cercano() {
      const s = getSim();
      const e = s.enemies.find(e => e.hp > 0 && pegado(s, e));
      return e ? e.name : '';
    },
    hay_camino(d) { const s = getSim(); const [dx, dy] = DIRS[d]; return libre(s, s.hero.x + dx, s.hero.y + dy); },
    en_salida() { return enSalida(getSim()); },
    terminado() { return !!getSim().over; },
    imprimir(t) { const s = getSim(); if (s) push(s, { dur: 0, log: { text: String(t), kind: 'print' } }); }
  };
}

function traducirError(kind, line, name, msg) {
  const L = line ? ` (línea ${line})` : '';
  if (kind === 'bucle') return `Tu programa no termina nunca${L}: parece un bucle infinito. Revisa la condición del while.`;
  switch (name) {
    case 'SyntaxError':
      if (/never closed/.test(msg)) return `Falta cerrar un paréntesis o un corchete${L}.`;
      if (/unterminated string/.test(msg)) return `Unas comillas no están cerradas${L}.`;
      if (/expected ':'/.test(msg)) return `Faltan los dos puntos «:» al final de la línea${L}.`;
      if (/unmatched/.test(msg)) return `Sobra un paréntesis de cierre${L}.`;
      if (/Maybe you meant '==' /.test(msg) || /Maybe you meant '=='/.test(msg)) return `Para comparar se usa «==», no «=»${L}.`;
      return `Python no entiende lo que hay escrito${L}. Revisa paréntesis, comillas y dos puntos.`;
    case 'IndentationError': case 'TabError':
      if (/expected an indented block/.test(msg)) return `Después de los dos puntos «:» la línea siguiente tiene que ir sangrada (4 espacios)${L}.`;
      if (/unexpected indent/.test(msg)) return `Sobran espacios al principio de la línea${L}.`;
      return `La sangría no cuadra${L}: revisa los espacios del principio de la línea.`;
    case 'NameError': {
      const m = /name '(.+?)' is not defined/.exec(msg); const n = m ? m[1] : '?';
      if (/^(h[eé]roe|Heroe|H[eé]roe|hero|HEROE)$/.test(n)) return `Python no conoce «${n}»${L}. Se escribe heroe: en minúsculas y sin tilde.`;
      if (n === 'true' || n === 'false') return `En Python se escribe ${n === 'true' ? 'True' : 'False'}, con mayúscula${L}.`;
      if (n === 'none') return `En Python se escribe None, con mayúscula${L}.`;
      return `Python no conoce el nombre «${n}»${L}. ¿Está mal escrito? Si es un texto, ponlo entre comillas: "${n}".`;
    }
    case 'AttributeError': {
      const m = /has no attribute '(.+?)'/.exec(msg);
      return `El héroe no sabe hacer «${m ? m[1] : '?'}»${L}. Mira el libro de hechizos para ver qué órdenes existen.`;
    }
    case 'TypeError':
      if (/missing \d+ required positional argument/.test(msg)) return `A esta orden le falta un dato entre los paréntesis${L}.`;
      if (/takes .* positional argument/.test(msg)) return `Le has pasado demasiados datos a una orden${L}.`;
      if (/not callable/.test(msg)) return `Estás usando paréntesis con algo que no es una orden${L}.`;
      if (/can only concatenate str/.test(msg)) return `No se puede juntar un texto con un número usando +${L}. Prueba con str(numero).`;
      return `Error de tipos${L}: ${msg}`;
    case 'IndexError': return `Te has salido de la lista${L}: esa posición no existe.`;
    case 'ZeroDivisionError': return `No se puede dividir entre cero${L}.`;
    case 'ErrorHeroe': return msg + L;
    default: return `${name}${L}: ${msg}`;
  }
}

function terminar(s, res) {
  if (res.kind === 'error' || res.kind === 'bucle') { fin(s, 'fail', traducirError(res.kind, res.line, res.name, res.msg)); return; }
  if (!s.over) {
    const f = faltan(s);
    if (!f.length) fin(s, 'win', '¡Lo has conseguido!');
    else { const t = f.join(' y '); fin(s, 'fail', 'El programa ha terminado, pero ' + t + '.'); }
  }
}

function contarLineas(code) { return code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length; }

const PRELUDE = String.raw`
import sys
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
        if isinstance(pasos, bool) or not isinstance(pasos, int):
            raise ErrorHeroe("El número de pasos tiene que ser un número entero, por ejemplo: heroe.derecha(3)")
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
            raise ErrorHeroe('Para atacar, escribe el nombre del enemigo entre comillas: heroe.atacar("Grumo")')
        juego.atacar(nombre)
        self._chk()
    def decir(self, texto):
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

def _no_input(*a):
    raise ErrorHeroe("input() no funciona en la mazmorra: aquí nadie te va a escribir nada.")

_FICHERO = "<tu código>"

def _linea(e):
    tb = e.__traceback__
    ln = 0
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == _FICHERO:
            ln = tb.tb_lineno
        tb = tb.tb_next
    return ln

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
        return ["error", e.lineno or 0, type(e).__name__, e.msg or ""]
    sys.settrace(glob)
    try:
        exec(comp, ns)
        res = ["ok", 0, "", ""]
    except _Fin:
        res = ["ok", 0, "", ""]
    except _Bucle as e:
        res = ["bucle", _linea(e), "", ""]
    except Exception as e:
        res = ["error", _linea(e), type(e).__name__, str(e)]
    finally:
        sys.settrace(None)
    return res

def _ns_nuevo():
    return {"__name__": "__main__", "heroe": Heroe(), "input": _no_input}

def _run(code):
    return _ejecutar(code, _ns_nuevo(), "exec")

# consola directa: el espacio de nombres se conserva entre órdenes
_NS_VIVO = None

def _vivo_nuevo():
    global _NS_VIVO
    _NS_VIVO = _ns_nuevo()

def _vivo_reponer(code):
    _vivo_nuevo()
    return _ejecutar(code, _NS_VIVO, "exec")

def _vivo(code):
    if _NS_VIVO is None:
        _vivo_nuevo()
    return _ejecutar(code, _NS_VIVO, "single")
`;

if (typeof module !== 'undefined' && module.exports) module.exports = { LEVELS, API_DOCS, crearPartida, makeApi, terminar, PRELUDE, contarLineas, snap };
