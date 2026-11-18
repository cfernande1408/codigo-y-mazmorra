# Prueba de la consola directa (modo sin conexión).
import asyncio, os, subprocess, time, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PYO = ROOT / 'test' / 'node_modules' / 'pyodide'
SHOTS = pathlib.Path(os.environ.get('SHOTS', '/tmp/e2e')); SHOTS.mkdir(exist_ok=True)

async def pyodide_local(route):
    f = PYO / route.request.url.split('/full/')[1].split('?')[0]
    ct = {'.js': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json', '.zip': 'application/zip'}.get(f.suffix, 'application/octet-stream')
    await route.fulfill(path=str(f), content_type=ct)

async def orden(pg, cmd):
    await pg.fill('#replIn', cmd); await pg.press('#replIn', 'Enter')
    await pg.wait_for_function("!document.getElementById('replBtn').disabled", timeout=15000)

async def pos(pg):
    return await pg.evaluate("window.__cymPos && window.__cymPos()")

async def main():
    env = dict(os.environ, PORT='8791'); env.pop('MOCK_CONFIG', None)
    srv = subprocess.Popen(['node', 'test/mock-supabase.js'], cwd=ROOT, env=env); time.sleep(1)
    errs = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
            ctx = await b.new_context(viewport={'width': 1400, 'height': 950})
            await ctx.route('https://cdn.jsdelivr.net/pyodide/**', pyodide_local)
            pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto('http://localhost:8791/')
            await pg.wait_for_function("!document.getElementById('run').disabled", timeout=90000)
            await orden(pg, 'heroe.derecha()')
            await orden(pg, 'heroe.derecha()')
            await pg.screenshot(path=str(SHOTS / 'c1_dos_pasos.png'))
            await orden(pg, 'heroe.saltar()')
            out = await pg.inner_text('#out'); assert 'no sabe hacer' in out, out
            await orden(pg, 'heroe.derecha()')           # choca
            await pg.wait_for_selector('#mZero')
            await pg.screenshot(path=str(SHOTS / 'c2_choque.png'))
            await pg.click('#mRetry')                     # vuelve a donde estaba
            await orden(pg, 'heroe.abajo(2)')
            await orden(pg, 'heroe.derecha(2)')
            await pg.wait_for_selector('#mStay', timeout=15000)
            code = await pg.input_value('#code')
            assert code.splitlines()[1:] == ['heroe.derecha()', 'heroe.derecha()', 'heroe.abajo(2)', 'heroe.derecha(2)'], code
            await pg.screenshot(path=str(SHOTS / 'c3_ganado.png'))
            # el programa apuntado funciona con Ejecutar
            await pg.click('#mStay'); await pg.click('#run')
            await pg.wait_for_selector('#mStay', timeout=20000)
            # variables entre órdenes (nivel 5)
            await pg.click('#mStay'); await pg.check('#profe'); await pg.click('#levels button:nth-child(5)')
            for c in ['clave = heroe.leer()', 'clave', 'heroe.derecha(2)', 'heroe.decir(clave)', 'heroe.derecha(4)']:
                await orden(pg, c)
            await pg.wait_for_selector('#mStay', timeout=15000)
            out = await pg.inner_text('#out'); assert "'" in out and 'se abre' in out, out
            await b.close()
    finally:
        srv.terminate()
    print('errores JS:', errs); assert not errs; print('CONSOLA OK')
asyncio.run(main())
