"""
Prueba de punta a punta de la PWA con un navegador real (Chromium, tamaño iPhone).
Recorre comensal → restaurante → administrador → comensal y guarda capturas.

Uso:  python3 apps/web/scripts/e2e.py [carpeta-de-capturas]
Requiere: dist/ compilado (npm run build), Playwright y ffmpeg.
"""
import functools
import http.server
import pathlib
import subprocess
import sys
import threading

from playwright.sync_api import expect, sync_playwright

WEB = pathlib.Path(__file__).resolve().parent.parent
DIST = WEB / "dist"
SHOTS = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else WEB / "e2e-shots"
SHOTS.mkdir(parents=True, exist_ok=True)


def serve() -> int:
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):  # noqa: D102
            pass

    handler = functools.partial(Quiet, directory=str(DIST))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server.server_address[1]


def long_clip() -> pathlib.Path:
    """Un clip vertical de 23 s para probar el recorte a 10 s (WebM: Chromium de pruebas no trae H.264)."""
    out = SHOTS / "clip-23s.webm"
    if not out.exists():
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-stream_loop", "2", "-i", str(DIST / "videos" / "picana-al-carbon.mp4"),
             "-t", "23", "-c:v", "libvpx-vp9", "-b:v", "600k", "-an", str(out)],
            check=True,
        )
    return out


def main() -> None:
    port = serve()
    errors: list[str] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        # Ubicación simulada en Cúcuta (cerca de La Ceiba) para «Cerca de mí».
        context = browser.new_context(
            viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
            geolocation={"latitude": 7.8975, "longitude": -72.4855}, permissions=["geolocation"],
        )
        page = context.new_page()
        page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        shot = lambda name: page.screenshot(path=str(SHOTS / f"{name}.png"))  # noqa: E731

        page.goto(f"http://127.0.0.1:{port}/")
        expect(page.get_by_role("dialog", name="Bienvenida")).to_be_visible()
        page.wait_for_timeout(600)
        shot("01-bienvenida")
        page.get_by_role("button", name="Explorar la demo").click()
        page.wait_for_timeout(2500)
        shot("02-descubrir")
        assert page.locator(".promo-pill").count() > 0, "Inicio muestra la promoción de Brasa Negra"

        # Comensal: ver el menú del primer plato y reservar.
        page.get_by_role("button", name="Ver menú").first.click()
        page.wait_for_timeout(1200)
        expect(page.get_by_text("Postre gratis en mesas de 4")).to_be_visible()
        shot("03-restaurante")
        page.locator(".screen").first.evaluate("el => el.scrollTo(0, 900)")
        page.wait_for_timeout(400)
        shot("04-restaurante-menu")
        page.get_by_role("button", name="Reservar mesa").last.click()
        page.wait_for_timeout(500)
        page.locator(".day").nth(1).click()
        page.locator(".slot:not([disabled])").last.click()
        page.get_by_label("Nota para el restaurante").fill("Mesa cerca de la ventana")
        shot("05-reservar")
        page.get_by_role("button", name="Enviar solicitud").click()
        expect(page.get_by_text("ENVIADA")).to_be_visible()
        shot("06-solicitud-enviada")

        # Restaurante: acepta la solicitud de Camila y marca una llegada.
        page.get_by_role("button", name="Abrir controles de la demo").click()
        page.get_by_role("button", name="Restaurante Brasa Negra").click()
        page.wait_for_timeout(500)
        expect(page.get_by_text("Camila Rojas").first).to_be_visible()
        shot("07-restaurante-reservas")
        camila = page.locator(".card", has_text="Camila Rojas").first
        camila.get_by_role("button", name="Aceptar").click()
        expect(page.get_by_text("Confirmada. El cliente ya fue avisado.")).to_be_visible()
        page.get_by_role("button", name="Llegó", exact=True).first.click()
        page.wait_for_timeout(300)
        shot("08-restaurante-agenda")

        # Menú: sube un video de 23 s y recorta a 10 s.
        page.get_by_role("button", name="Menú").click()
        page.wait_for_timeout(300)
        shot("09-menu")
        page.get_by_text("Picaña al carbón").click()
        page.wait_for_timeout(400)
        page.locator("#video-file").set_input_files(str(long_clip()))
        expect(page.get_by_text("Elige tus 10 segundos")).to_be_visible(timeout=15000)
        page.wait_for_timeout(800)
        shot("10-recortar-video")
        page.get_by_role("button", name="Enviar 10 s a revisión").click()
        page.wait_for_timeout(2600)
        shot("11-video-en-revision")

        page.get_by_role("button", name="Cuenta").click()
        page.wait_for_timeout(400)
        shot("12-cuenta")

        # Administrador: aprueba los videos en revisión.
        page.get_by_role("button", name="Abrir controles de la demo").click()
        page.get_by_role("button", name="Administrador Platto").click()
        page.wait_for_timeout(800)
        shot("13-admin-videos")
        while page.get_by_role("button", name="Aprobar y publicar").count() > 0:
            page.get_by_role("button", name="Aprobar y publicar").first.click()
            page.wait_for_timeout(300)
        page.get_by_role("button", name="Restaurantes").click()
        shot("14-admin-restaurantes")

        # Comensal: califica la visita verificada.
        page.get_by_role("button", name="Abrir controles de la demo").click()
        page.get_by_role("button", name="Comensal Camila").click()
        page.get_by_role("button", name="Reservas").click()
        page.wait_for_timeout(400)
        shot("15-mis-reservas")
        page.get_by_role("button", name="Calificar en 10 segundos").first.click()
        page.get_by_role("radio", name="4 de 5, Muy bien").click()
        page.get_by_role("button", name="Sabor").click()
        page.get_by_label("Cuéntale a otros").fill("La costilla perfecta, volvemos.")
        shot("16-calificar")
        page.get_by_role("button", name="Publicar calificación").click()
        expect(page.get_by_text("Gracias por contarlo")).to_be_visible()

        page.get_by_role("button", name="Explorar", exact=True).click()
        page.wait_for_timeout(500)
        shot("17-buscar")

        # Cerca de mí: ordena por distancia desde la ubicación del teléfono.
        page.get_by_role("button", name="Cerca de mí").click()
        expect(page.get_by_text("Distancias desde donde estás.")).to_be_visible()
        first = page.locator(".card").first.inner_text()
        assert "Verde Raíz" in first, f"el más cercano debería ser Verde Raíz: {first}"
        shot("18-cerca-de-mi")
        page.get_by_role("button", name="Con promoción").click()
        expect(page.locator(".card")).to_have_count(1)
        page.get_by_role("button", name="Con promoción").click()

        # Mapa: sin internet en este entorno se ve el plano simple con los mismos puntos.
        page.get_by_role("button", name="Mapa", exact=True).click()
        page.wait_for_selector(".map-pin", timeout=15000)
        page.locator(".map-pin", has_text="BN").first.click()
        page.wait_for_timeout(400)
        expect(page.locator(".card", has_text="Brasa Negra")).to_be_visible()
        page.locator(".screen").first.evaluate("el => el.scrollTo(0, 260)")
        shot("19-mapa")

        # Restaurante (plan Pro): crea una promoción y la ve publicada.
        page.get_by_role("button", name="Abrir controles de la demo").click()
        page.get_by_role("button", name="Restaurante Brasa Negra").click()
        page.get_by_role("button", name="Cuenta").click()
        page.get_by_role("button", name="Promociones").click()
        page.get_by_role("button", name="Nueva promoción").click()
        page.get_by_label("Nombre").fill("Limonada de coco gratis")
        page.get_by_label("Condiciones").fill("Con cualquier plato fuerte, en el almuerzo.")
        page.wait_for_timeout(500)
        shot("20-nueva-promocion")
        page.get_by_role("button", name="Publicar promoción").click()
        expect(page.get_by_text("Promoción publicada")).to_be_visible()
        # Ya hay 3 encendidas: una cuarta no se puede publicar.
        page.get_by_role("button", name="Nueva promoción").click()
        page.get_by_label("Nombre").fill("Cuarta promo")
        page.get_by_role("button", name="Publicar promoción").click()
        expect(page.get_by_text("Puedes tener hasta 3 promociones encendidas", exact=False)).to_be_visible()
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)
        shot("21-promociones")

        browser.close()

    # Las fuentes de Google no cargan en entornos sin internet; no es un error de la app.
    # Tampoco los mapas de OpenFreeMap: el entorno de pruebas no tiene salida a internet.
    real = [e for e in errors if "favicon" not in e and "ERR_TUNNEL_CONNECTION_FAILED" not in e and "Failed to load resource: net::ERR_" not in e]
    if real:
        print("ERRORES EN EL NAVEGADOR:")
        print("\n".join(real))
        sys.exit(1)
    print(f"✓ Recorrido completo sin errores. Capturas en {SHOTS}")


if __name__ == "__main__":
    main()
