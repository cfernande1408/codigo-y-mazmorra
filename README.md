# Código y Mazmorra

Juego web para aprender Python: el alumnado escapa de una mazmorra
escribiendo código Python real, que se ejecuta en el navegador con
[Pyodide](https://pyodide.org). Incluye un panel para el profesor con
el progreso de cada alumno.

- **Vista lateral estilo cómic**: el palacio cortado en sección sobre un
  atardecer con ciudad en parallax, escaleras, rejas, antorchas y un
  héroe animado que corre, trepa y ataca.
- **Órdenes como funciones** (`derecha()`, `atacar("SyntaxError")`, `decir(x)`…),
  sin objetos, igual que `print()`.
- **Consola directa**: cada orden se ejecuta al momento y se apunta en el
  editor; con «Ejecutar» se lanza el programa entero.
- **3 vidas**: chocarse quita una vida pero el juego sigue; los errores de
  Python se avisan sin bloquear la partida.
- **18 niveles en dos capítulos**:
  - *Capítulo 1 · Variables, tipos y operadores* (RA1): instrucciones,
    números, textos, variables, constantes, operadores matemáticos,
    bloques de texto, errores, conversiones con `int()`, `input()` y
    comparaciones y operadores lógicos.
  - *Capítulo 2 · Bucles, condiciones y funciones* (RA2): `for`,
    `while`, `if`, bucles anidados, funciones y un laberinto aleatorio.
- **Valores aleatorios** en muchos niveles (mapas, claves y variables que
  cambian en cada partida): la solución no se puede escribir a mano.
- **Errores de Python traducidos** al castellano, con la línea marcada.
- **Cuentas de alumno** con código de clase + alias + PIN de 4 cifras
  (sin correo ni datos personales).
- **Panel del profesor** (`profe.html`): clases, tabla de alumnos ×
  niveles, intentos, código de cada alumno, cambio de PIN, desbloqueo de
  niveles y exportación a CSV.

Sin Supabase configurado, el juego funciona igual pero sin cuentas: el
progreso se guarda solo en el navegador.

## Puesta en marcha

### 1. Base de datos (Supabase, gratis)

1. Crea un proyecto en <https://supabase.com> (elige una región de la UE).
2. Abre `supabase/schema.sql`, baja a la **última sección** y cambia
   `cambia-esta-clave` por tu clave de profesor (8 caracteres o más).
3. En Supabase: **SQL Editor → New query**, pega el fichero entero y pulsa
   **Run**. Se puede volver a ejecutar sin perder datos; sirve también para
   cambiar la clave más adelante.
4. En **Project Settings → API Keys** copia la **Project URL** y la clave
   **publishable** (o la antigua *anon public*).

> No subas al repo el `schema.sql` con tu clave puesta: pégala solo en el
> SQL Editor.

### 2. Configuración

Rellena `js/config.js`:

```js
window.CYM_CONFIG = {
  supabaseUrl: "https://xxxxxxxx.supabase.co",
  supabaseKey: "sb_publishable_..."
};
```

La clave *publishable* está pensada para ir en el navegador: las tablas no
son accesibles directamente y todo pasa por funciones que comprueban la
sesión del alumno o del profesor.

### 3. Publicar (GitHub Pages)

**Settings → Pages → Build and deployment → Source: GitHub Actions**.
El flujo `.github/workflows/pages.yml` publica la rama `main` y además cada
rama `estilo-*` en su propia carpeta:

- `main` → `https://<usuario>.github.io/codigo-y-mazmorra/`
- `estilo-ruinas` → `https://<usuario>.github.io/codigo-y-mazmorra/ruinas/`
- `estilo-palacio` → `…/palacio/`, `estilo-acuarela` → `…/acuarela/`

Se vuelve a publicar solo con cada push a `main` (o desde **Actions → Publicar
web → Run workflow**).

### 4. En clase

1. Entra en `…/profe.html` con tu clave y crea la clase.
2. Pasa a la clase el **enlace** (botón «Copiar enlace») o el **código de 6
   letras**.
3. Cada alumno pulsa «Soy nuevo», elige un alias y un PIN.
4. Si alguien olvida el PIN, cámbialo desde el panel (🔑).

## Cosas a tener en cuenta

- **Pausa por inactividad**: Supabase pausa los proyectos gratuitos tras
  una semana sin uso (p. ej. en vacaciones). Los datos no se pierden; se
  reactiva desde el panel de Supabase. Mientras está pausado, los alumnos
  ven «Sin conexión» y sus ejecuciones se guardan en cola para enviarlas
  luego.
- **Datos personales**: pide alias (mote o número de lista), no nombres
  reales. No se guarda correo, nombre ni IP.
- **Seguridad**: 5 PIN erróneos bloquean la cuenta 10 minutos; 8 claves de
  profesor erróneas bloquean el panel 10 minutos.

## Estructura

```
index.html          juego (alumnado)
profe.html          panel del profesor
css/style.css
js/config.js        URL y clave de Supabase
js/logic.js         niveles, simulación y puente con Python
js/arte.js          dibujo del juego (vista lateral, animaciones, efectos)
js/juego.js         interfaz del juego, cuentas y sincronización
js/profe.js         panel del profesor
js/nube.js          cliente RPC mínimo
supabase/schema.sql tablas, permisos y funciones
test/               pruebas
```

### Añadir o cambiar niveles

Los niveles están en `LEVELS` (`js/logic.js`). Cada uno define el mapa
(`#` muro, `.` suelo, `H` héroe, `S` salida, `g` gema, `E` enemigo,
`D` puerta, `C` cartel), los objetivos, el texto de la misión, la pista,
el código inicial y el reto de líneas. Las órdenes nuevas del héroe se
añaden en `makeApi` (JS) y en la clase `Heroe` de `PRELUDE` (Python).

## Pruebas

```bash
cd test && npm install
npm test            # resuelve los 10 niveles con Python real (aleatorios ×30)
npm run test:db     # funciones SQL contra un Postgres local (ver db.test.js)
```

`test/mock-supabase.js` imita la API de Supabase sobre un Postgres local
para probar el juego completo sin la nube (`npm run mock`), y
`test/e2e.py` (Playwright) recorre el flujo profe → alumno → profe.
