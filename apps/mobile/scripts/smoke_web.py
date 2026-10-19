"""
Recorrido de la app Expo en su versión web (react-native-web), en un navegador tamaño iPhone.
Sirve para revisar pantallas y flujos sin un teléfono. Uso:
  npx expo export --platform web --output-dir dist
  python3 scripts/smoke_web.py [carpeta-de-capturas]
"""
import functools
import http.server
import pathlib
import sys
import threading

from playwright.sync_api import expect, sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
SHOTS = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "smoke-shots"
SHOTS.mkdir(parents=True, exist_ok=True)


class SPA(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send_head(self):
        path = pathlib.Path(self.translate_path(self.path))
        if not path.exists():
            self.path = "/index.html"
        return super().send_head()


def serve() -> int:
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(SPA, directory=str(DIST)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv.server_address[1]


def main() -> None:
    port = serve()
    errors: list[str] = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        ctx = b.new_context(
            viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
            geolocation={"latitude": 7.8975, "longitude": -72.4855}, permissions=["geolocation"],
        )
        page = ctx.new_page()
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))
        shot = lambda n: page.screenshot(path=str(SHOTS / f"{n}.png"))  # noqa: E731
        base = f"http://127.0.0.1:{port}"

        page.goto(base + "/")
        expect(page.get_by_text("Explorar la demo")).to_be_visible(timeout=20000)
        page.wait_for_timeout(800)
        shot("01-bienvenida")
        page.get_by_text("Explorar la demo").click()
        page.wait_for_timeout(2500)
        shot("02-inicio")

        STEPS(page, shot, base)
        b.close()

    # El Chromium de pruebas no trae H.264: los MP4 no se reproducen aquí (en teléfonos sí).
    real = [e for e in errors if "favicon" not in e and "ERR_" not in e and "no supported source" not in e]
    if real:
        print("ERRORES EN EL NAVEGADOR:\n" + "\n".join(real[:20]))
        sys.exit(1)
    print(f"✓ App web sin errores. Capturas en {SHOTS}")


def STEPS(page, shot, base):  # noqa: N802
    btn = lambda name: page.get_by_role("button", name=name, exact=True)  # noqa: E731

    # Comensal: Explorar, Cerca de mí y mapa.
    page.get_by_role("tab", name="Explorar").click()
    page.wait_for_timeout(800)
    shot("03-explorar")
    btn("Cerca de mí").click()
    expect(page.get_by_text("Distancias desde donde estás.")).to_be_visible(timeout=10000)
    shot("04-cerca-de-mi")
    page.get_by_text("Mapa", exact=True).click()
    page.wait_for_timeout(600)
    shot("05-mapa")
    page.get_by_text("Lista", exact=True).click()
    page.wait_for_timeout(400)

    # Restaurante y reserva.
    btn("Brasa Negra").first.click()
    page.wait_for_timeout(1200)
    expect(page.get_by_text("Postre gratis en mesas de 4")).to_be_visible()
    shot("06-restaurante")
    page.get_by_role("button", name="Reservar mesa").first.click()
    page.wait_for_timeout(800)
    page.locator("[role=button][aria-label]").filter(has_text="DOM").or_(page.locator("[role=button][aria-label]").filter(has_text="LUN")).first.click()
    page.get_by_text("8:00 pm", exact=True).click()
    page.get_by_label("Nota para el restaurante").fill("Mesa cerca de la ventana")
    shot("07-reservar")
    btn("Enviar solicitud").click()
    expect(page.get_by_text("ENVIADA · PENDIENTE DE CONFIRMACIÓN")).to_be_visible()
    shot("08-enviada")

    # Mis reservas y calificar una visita verificada.
    btn("Seguir descubriendo").click()
    page.wait_for_timeout(800)
    page.get_by_role("tab", name="Reservas").click()
    page.wait_for_timeout(600)
    shot("09-mis-reservas")
    btn("Calificar en 10 segundos").first.click()
    page.wait_for_timeout(600)
    page.get_by_role("radio", name="4 de 5, Muy bien").click()
    btn("Sabor").click()
    page.get_by_label("Cuéntale a otros").fill("La costilla perfecta, volvemos.")
    shot("10-calificar")
    btn("Publicar calificación").click()
    expect(page.get_by_text("Gracias por contarlo")).to_be_visible()
    btn("Volver al inicio").click()
    page.wait_for_timeout(800)

    # Al lado del restaurante desde el Perfil.
    page.get_by_role("tab", name="Perfil").click()
    page.wait_for_timeout(500)
    shot("11-perfil")
    btn("Ver como Brasa Negra").click()
    page.wait_for_timeout(1200)
    expect(page.get_by_text("Camila Rojas").first).to_be_visible()
    shot("12-negocio-reservas")
    btn("Aceptar").first.click()
    expect(page.get_by_text("Confirmada. El cliente ya fue avisado.")).to_be_visible()

    page.get_by_role("tab", name="Menú").click()
    page.wait_for_timeout(600)
    shot("13-menu")
    btn("Editar Picaña al carbón").click()
    page.wait_for_timeout(800)
    shot("14-plato")
    page.go_back()
    page.wait_for_timeout(500)

    page.get_by_role("tab", name="Cuenta").click()
    page.wait_for_timeout(600)
    shot("15-cuenta")
    btn("Promociones").click()
    page.wait_for_timeout(500)
    btn("Nueva promoción").click()
    page.wait_for_timeout(500)
    page.get_by_label("Nombre").fill("Limonada de coco gratis")
    page.get_by_label("Condiciones").fill("Con cualquier plato fuerte, en el almuerzo.")
    shot("16-nueva-promocion")
    btn("Publicar promoción").click()
    expect(page.get_by_text("Promoción publicada")).to_be_visible()
    page.wait_for_timeout(500)
    shot("17-promociones")


if __name__ == "__main__":
    main()
