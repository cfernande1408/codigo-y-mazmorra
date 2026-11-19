# Prueba de punta a punta: profe crea clase, alumno se registra y juega,
# profe ve el progreso. Necesita Postgres local + test/mock-supabase.js.
import asyncio, os, subprocess, time, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PYO = ROOT / 'test' / 'node_modules' / 'pyodide'
SHOTS = pathlib.Path(os.environ.get('SHOTS', '/tmp/e2e')); SHOTS.mkdir(exist_ok=True)
SOL1 = "derecha(2)\nabajo(2)\nderecha(2)\n"

async def pyodide_local(route):
    f = PYO / route.request.url.split('/full/')[1].split('?')[0]
    ct = {'.js': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json', '.zip': 'application/zip'}.get(f.suffix, 'application/octet-stream')
    await route.fulfill(path=str(f), content_type=ct)

async def main():
    env = dict(os.environ, MOCK_CONFIG='1', PORT='8790')
    srv = subprocess.Popen(['node', 'test/mock-supabase.js'], cwd=ROOT, env=env)
    time.sleep(1)
    errs = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
            prof = await b.new_page(viewport={'width': 1400, 'height': 900})
            prof.on('pageerror', lambda e: errs.append('profe: ' + str(e)))
            await prof.goto('http://localhost:8790/profe.html')
            await prof.fill('#eClave', 'mal-clave'); await prof.click('#eBtn')
            await prof.wait_for_selector('#eErr:has-text("incorrecta")')
            await prof.fill('#eClave', 'profe-secreta-123'); await prof.click('#eBtn')
            await prof.fill('#nNombre', '2º SMR B (prueba)'); await prof.click('#fNueva button')
            await prof.wait_for_selector('.codigo-grande')
            codigo = (await prof.inner_text('.codigo-grande')).strip()
            print('clase creada:', codigo)
            await prof.screenshot(path=str(SHOTS / 'p1_vacia.png'))

            ctx = await b.new_context(viewport={'width': 1400, 'height': 900})
            await ctx.route('https://cdn.jsdelivr.net/pyodide/**', pyodide_local)
            al = await ctx.new_page()
            al.on('pageerror', lambda e: errs.append('alumno: ' + str(e)))
            await al.goto(f'http://localhost:8790/?clase={codigo}')
            await al.wait_for_selector('#entrada:not(.hidden)')
            assert await al.input_value('#eClase') == codigo
            await al.click('[data-modo="nuevo"]')
            await al.fill('#eAlias', 'Dragón 7'); await al.fill('#ePin', '1234')
            await al.screenshot(path=str(SHOTS / 'a1_registro.png'))
            await al.click('#eBtn')
            await al.wait_for_selector('#cuenta:not([hidden])')
            await al.wait_for_selector('#home:not([hidden])')
            await al.screenshot(path=str(SHOTS / 'a1b_inicio.png'))
            assert await al.locator('#mundos.bloqueado').count() == 1
            await al.click('[data-pj="viajera"]')
            await al.click('[data-mundo="1"]')
            await al.wait_for_function("!document.getElementById('run').disabled", timeout=90000)
            await al.fill('#code', SOL1); await al.click('#run')
            await al.wait_for_selector('#mNext', timeout=20000)
            await al.screenshot(path=str(SHOTS / 'a2_ganado.png'))
            await al.click('#mNext')
            await al.fill('#code', 'derecha(9)\n'); await al.click('#run')
            await al.wait_for_selector('#avisoMapa:not([hidden])', timeout=20000)
            await al.wait_for_timeout(800)
            assert 'Guardado' in await al.inner_text('#nubeEstado')

            await prof.click('#refrescar'); await prof.wait_for_selector('.celda.si')
            assert '✗ 1' in await prof.inner_text('table.notas')
            await prof.screenshot(path=str(SHOTS / 'p2_tabla.png'))
            await prof.click('.celda.si'); await prof.wait_for_selector('.mbox pre')
            assert 'derecha(2)' in await prof.inner_text('.mbox')
            await prof.screenshot(path=str(SHOTS / 'p3_codigo.png'))
            await prof.click('[data-cerrar]')

            # salir y volver a entrar (otro navegador): conserva progreso
            await al.click('#salir')
            await al.wait_for_selector('#entrada:not(.hidden)')
            al2 = await (await b.new_context()).new_page()
            await al2.route('https://cdn.jsdelivr.net/pyodide/**', pyodide_local)
            await al2.goto('http://localhost:8790/')
            await al2.fill('#eClase', codigo.lower()); await al2.fill('#eAlias', 'dragón 7'); await al2.fill('#ePin', '1234')
            await al2.click('#eBtn'); await al2.wait_for_selector('#cuenta:not([hidden])')
            await al2.wait_for_selector('#home:not([hidden])')
            assert '1/3 niveles' in await al2.inner_text('[data-mundo="1"]')
            await al2.click('[data-pj="viajero"]')
            await al2.click('[data-mundo="1"]')
            await al2.wait_for_function("document.getElementById('lvlNum').textContent.toLowerCase().includes('nivel 2')", timeout=8000)
            t2 = (await al2.inner_text('#lvlNum')).lower(); assert 'nivel 2' in t2, 'debía abrir el nivel 2: ' + t2
            await al2.evaluate("location.hash = '#mundo-2'"); await al2.wait_for_timeout(300)
            locked = await al2.eval_on_selector_all('#levels .chip.locked', 'e => e.length')
            assert locked == 3, locked
            # el profe desbloquea todo
            await prof.click('#desb'); await prof.wait_for_timeout(500)
            await al2.reload(); await al2.wait_for_timeout(1500)
            locked = await al2.eval_on_selector_all('#levels .chip.locked', 'e => e.length')
            assert locked == 0, locked
            await al2.screenshot(path=str(SHOTS / 'a3_desbloqueado.png'))
            # móvil, panel
            m = await b.new_page(viewport={'width': 400, 'height': 860}, device_scale_factor=2)
            await m.goto('http://localhost:8790/profe.html')
            await m.screenshot(path=str(SHOTS / 'p4_movil.png'))
            await b.close()
    finally:
        srv.terminate()
    print('errores JS:', errs)
    assert not errs
    print('E2E OK')

asyncio.run(main())
